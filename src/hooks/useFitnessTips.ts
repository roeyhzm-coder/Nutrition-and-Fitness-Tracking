import { useCallback, useEffect, useRef, useState } from 'react'
import { onWindowResume } from '../lib/appStateSync'
import {
  SEED_UPDATED_AT,
  deletionKeys,
  hasUnsyncedChanges,
  loadLocalTips,
  mergeTipCategories,
  moveInArray,
  pullFitnessTips,
  pushFitnessTips,
  saveLocalTips,
  subscribeFitnessTips,
  type FitnessTipsDoc,
  type TipCategory,
  type TipItem,
} from '../lib/fitnessTips'
import { uid } from '../lib/types'

export type TipsSyncStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error'

const PUSH_DEBOUNCE_MS = 700

/** Postgres returns `+00:00` offsets, the client writes `Z` — compare instants, not strings. */
function stamp(iso: string | undefined) {
  if (!iso) return 0
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 0 : t
}

function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

/**
 * Tips are one document: localStorage is the source of truth on this device,
 * the `fitness_tips` row is shared across devices. Unsynced local edits are
 * never dropped — a newer cloud version is merged in before every push.
 */
export function useFitnessTips() {
  const [doc, setDoc] = useState<FitnessTipsDoc>(loadLocalTips)
  const [status, setStatus] = useState<TipsSyncStatus>(() =>
    hasUnsyncedChanges(doc) ? (isOffline() ? 'offline' : 'saving') : 'idle',
  )
  const [syncError, setSyncError] = useState<string | null>(null)
  const docRef = useRef(doc)
  const pendingPush = useRef<number | null>(null)
  /** Serializes cloud round-trips; a request made while busy runs once afterwards. */
  const busy = useRef(false)
  const rerun = useRef(false)

  const apply = useCallback((next: FitnessTipsDoc) => {
    docRef.current = next
    setDoc(next)
    saveLocalTips(next)
  }, [])

  const sync = useCallback(async () => {
    if (busy.current) {
      rerun.current = true
      return
    }
    busy.current = true
    try {
      do {
        rerun.current = false
        if (isOffline()) {
          if (hasUnsyncedChanges(docRef.current)) setStatus('offline')
          return
        }
        const result = await pullFitnessTips()
        if (!result.ok) {
          setSyncError(result.error)
          setStatus('error')
          return
        }
        setSyncError(null)
        const local = docRef.current
        const remote = result.doc
        const remoteChanged =
          remote != null && stamp(remote.updatedAt) > stamp(local.syncedAt)

        if (!hasUnsyncedChanges(local)) {
          if (remoteChanged && stamp(remote.updatedAt) !== stamp(local.updatedAt)) {
            apply({
              categories: remote.categories,
              updatedAt: remote.updatedAt,
              syncedAt: remote.updatedAt,
              pendingDeletes: [],
            })
          }
          setStatus(remote ? 'saved' : 'idle')
          continue
        }

        // Local edits are pending: fold in anything another device saved meanwhile.
        let outgoing = local
        if (remoteChanged) {
          outgoing = {
            ...local,
            categories: mergeTipCategories(
              local.categories,
              remote.categories,
              local.pendingDeletes,
            ),
            updatedAt: new Date(
              Math.max(Date.now(), stamp(remote.updatedAt) + 1),
            ).toISOString(),
          }
          apply(outgoing)
        }
        setStatus('saving')
        const error = await pushFitnessTips(outgoing)
        if (error) {
          setSyncError(error)
          setStatus(isOffline() ? 'offline' : 'error')
          return
        }
        // Only mark synced if nothing was edited while the push was in flight.
        if (docRef.current.updatedAt === outgoing.updatedAt) {
          apply({ ...docRef.current, syncedAt: outgoing.updatedAt, pendingDeletes: [] })
          setStatus('saved')
        } else {
          rerun.current = true
        }
      } while (rerun.current)
    } finally {
      busy.current = false
    }
  }, [apply])

  const syncNow = useCallback(() => {
    if (pendingPush.current != null) {
      window.clearTimeout(pendingPush.current)
      pendingPush.current = null
    }
    return sync()
  }, [sync])

  useEffect(() => {
    void sync()
    const unsubscribe = subscribeFitnessTips(() => {
      if (pendingPush.current == null) void sync()
    })
    const offResume = onWindowResume(() => {
      if (pendingPush.current == null) void sync()
    })
    const handleOffline = () => {
      if (hasUnsyncedChanges(docRef.current)) setStatus('offline')
    }
    window.addEventListener('offline', handleOffline)
    return () => {
      unsubscribe()
      offResume()
      window.removeEventListener('offline', handleOffline)
      if (pendingPush.current != null) {
        window.clearTimeout(pendingPush.current)
        pendingPush.current = null
        void sync()
      }
    }
  }, [sync])

  const commit = useCallback(
    (
      update: (categories: TipCategory[]) => TipCategory[],
      deletedKeys: string[] = [],
      restoredKeys: string[] = [],
    ) => {
      const current = docRef.current
      const lifted = new Set(restoredKeys)
      apply({
        ...current,
        categories: update(current.categories),
        updatedAt: new Date().toISOString(),
        pendingDeletes: [
          ...new Set([...(current.pendingDeletes ?? []), ...deletedKeys]),
        ].filter((k) => !lifted.has(k)),
      })
      setStatus(isOffline() ? 'offline' : 'saving')
      if (pendingPush.current != null) window.clearTimeout(pendingPush.current)
      pendingPush.current = window.setTimeout(() => {
        pendingPush.current = null
        void sync()
      }, PUSH_DEBOUNCE_MS)
    },
    [apply, sync],
  )

  const addCategory = useCallback(
    (title: string) => {
      const id = uid()
      commit((cats) => [...cats, { id, title, items: [] }])
      return id
    },
    [commit],
  )

  const renameCategory = useCallback(
    (id: string, title: string) =>
      commit((cats) => cats.map((c) => (c.id === id ? { ...c, title } : c))),
    [commit],
  )

  const deleteCategory = useCallback(
    (id: string) => {
      const cat = docRef.current.categories.find((c) => c.id === id)
      commit(
        (cats) => cats.filter((c) => c.id !== id),
        cat ? [...deletionKeys(cat), ...cat.items.flatMap(deletionKeys)] : [id],
      )
    },
    [commit],
  )

  /** Undo for a category delete: puts it back at its old position. */
  const restoreCategory = useCallback(
    (category: TipCategory, index: number) =>
      commit((cats) => {
        if (cats.some((c) => c.id === category.id)) return cats
        const next = [...cats]
        next.splice(Math.min(index, next.length), 0, category)
        return next
      }, [], [...deletionKeys(category), ...category.items.flatMap(deletionKeys)]),
    [commit],
  )

  const moveCategory = useCallback(
    (id: string, delta: -1 | 1) =>
      commit((cats) => moveInArray(cats, cats.findIndex((c) => c.id === id), delta)),
    [commit],
  )

  /** Creates the item, or updates it in place — moving it if the category changed. */
  const saveItem = useCallback(
    (categoryId: string, input: Omit<TipItem, 'id'> & { id?: string }) =>
      commit((cats) => {
        const id = input.id ?? uid()
        const nextItem: TipItem = { id, title: input.title, body: input.body }
        const existsIn = cats.find((c) => c.items.some((i) => i.id === id))?.id
        return cats.map((c) => {
          if (existsIn === categoryId && c.id === categoryId) {
            return { ...c, items: c.items.map((i) => (i.id === id ? nextItem : i)) }
          }
          if (c.id === existsIn) return { ...c, items: c.items.filter((i) => i.id !== id) }
          if (c.id === categoryId) return { ...c, items: [...c.items, nextItem] }
          return c
        })
      }),
    [commit],
  )

  const deleteItem = useCallback(
    (categoryId: string, itemId: string) => {
      const item = docRef.current.categories
        .find((c) => c.id === categoryId)
        ?.items.find((i) => i.id === itemId)
      commit(
        (cats) =>
          cats.map((c) =>
            c.id === categoryId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c,
          ),
        item ? deletionKeys(item) : [itemId],
      )
    },
    [commit],
  )

  /** Undo for a tip delete: puts it back at its old position (if the category still exists). */
  const restoreItem = useCallback(
    (categoryId: string, item: TipItem, index: number) =>
      commit((cats) =>
        cats.map((c) => {
          if (c.id !== categoryId || c.items.some((i) => i.id === item.id)) return c
          const items = [...c.items]
          items.splice(Math.min(index, items.length), 0, item)
          return { ...c, items }
        }),
        [],
        deletionKeys(item),
      ),
    [commit],
  )

  const moveItem = useCallback(
    (categoryId: string, itemId: string, delta: -1 | 1) =>
      commit((cats) =>
        cats.map((c) =>
          c.id === categoryId
            ? { ...c, items: moveInArray(c.items, c.items.findIndex((i) => i.id === itemId), delta) }
            : c,
        ),
      ),
    [commit],
  )

  return {
    categories: doc.categories,
    isSeed: doc.updatedAt === SEED_UPDATED_AT,
    status,
    syncError,
    syncNow,
    addCategory,
    renameCategory,
    deleteCategory,
    restoreCategory,
    moveCategory,
    saveItem,
    deleteItem,
    restoreItem,
    moveItem,
  }
}
