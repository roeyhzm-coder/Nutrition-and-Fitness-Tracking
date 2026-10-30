import { useCallback, useEffect, useRef, useState } from 'react'
import { onWindowResume } from '../lib/appStateSync'
import {
  SEED_UPDATED_AT,
  loadLocalTips,
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

export type TipsSyncStatus = 'idle' | 'saving' | 'saved' | 'error'

const PUSH_DEBOUNCE_MS = 700

/** Postgres returns `+00:00` offsets, the client writes `Z` — compare instants, not strings. */
function stamp(iso: string) {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 0 : t
}

/**
 * Tips are one document: localStorage is the source of truth on this device,
 * the `fitness_tips` row is shared across devices (newest updatedAt wins).
 */
export function useFitnessTips() {
  const [doc, setDoc] = useState<FitnessTipsDoc>(loadLocalTips)
  const [status, setStatus] = useState<TipsSyncStatus>('idle')
  const [syncError, setSyncError] = useState<string | null>(null)
  const docRef = useRef(doc)
  const pendingPush = useRef<number | null>(null)

  const flush = useCallback(async () => {
    if (pendingPush.current != null) {
      window.clearTimeout(pendingPush.current)
      pendingPush.current = null
    }
    setStatus('saving')
    const error = await pushFitnessTips(docRef.current)
    setSyncError(error)
    setStatus(error ? 'error' : 'saved')
  }, [])

  const pull = useCallback(async () => {
    if (pendingPush.current != null) return
    const result = await pullFitnessTips()
    if (!result.ok) {
      setSyncError(result.error)
      setStatus('error')
      return
    }
    setSyncError(null)
    const local = docRef.current
    const remote = result.doc
    if (remote && stamp(remote.updatedAt) > stamp(local.updatedAt)) {
      docRef.current = remote
      setDoc(remote)
      saveLocalTips(remote)
      setStatus('saved')
    } else if (
      local.updatedAt !== SEED_UPDATED_AT &&
      (!remote || stamp(local.updatedAt) > stamp(remote.updatedAt))
    ) {
      await flush()
    }
  }, [flush])

  useEffect(() => {
    void pull()
    const unsubscribe = subscribeFitnessTips(() => void pull())
    const offResume = onWindowResume(() => void pull())
    return () => {
      unsubscribe()
      offResume()
      if (pendingPush.current != null) {
        window.clearTimeout(pendingPush.current)
        pendingPush.current = null
        void pushFitnessTips(docRef.current)
      }
    }
  }, [pull])

  const commit = useCallback((update: (categories: TipCategory[]) => TipCategory[]) => {
    const next: FitnessTipsDoc = {
      categories: update(docRef.current.categories),
      updatedAt: new Date().toISOString(),
    }
    docRef.current = next
    setDoc(next)
    saveLocalTips(next)
    setStatus('saving')
    if (pendingPush.current != null) window.clearTimeout(pendingPush.current)
    pendingPush.current = window.setTimeout(() => void flush(), PUSH_DEBOUNCE_MS)
  }, [flush])

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
    (id: string) => commit((cats) => cats.filter((c) => c.id !== id)),
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
    (categoryId: string, itemId: string) =>
      commit((cats) =>
        cats.map((c) =>
          c.id === categoryId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c,
        ),
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
    status,
    syncError,
    retrySync: flush,
    addCategory,
    renameCategory,
    deleteCategory,
    moveCategory,
    saveItem,
    deleteItem,
    moveItem,
  }
}
