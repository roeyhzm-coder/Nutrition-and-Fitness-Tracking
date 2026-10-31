import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  CloudOff,
  FolderPlus,
  Lightbulb,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  WifiOff,
} from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/button'
import { TipActionsMenu } from '../components/tips/TipActionsMenu'
import { TipItemAccordion } from '../components/tips/TipItemAccordion'
import {
  CategoryModal,
  TipItemModal,
  type TipDraftTarget,
} from '../components/tips/TipFormModals'
import { useFitnessTips, type TipsSyncStatus } from '../hooks/useFitnessTips'
import type { TipCategory, TipItem } from '../lib/fitnessTips'

const OPEN_STATE_KEY = 'tn.fitnessTips.open.v1'
const UNDO_MS = 6000

function readOpenState(): string[] | null {
  try {
    const raw = localStorage.getItem(OPEN_STATE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : null
  } catch {
    return null
  }
}

function writeOpenState(ids: Set<string>) {
  try {
    localStorage.setItem(OPEN_STATE_KEY, JSON.stringify([...ids]))
  } catch {
    // Remembering open sections is a convenience only.
  }
}

type Undo =
  | { kind: 'category'; category: TipCategory; index: number }
  | { kind: 'item'; categoryId: string; item: TipItem; index: number }

function SyncPill({
  status,
  error,
  onRetry,
}: {
  status: TipsSyncStatus
  error: string | null
  onRetry: () => void
}) {
  if (status === 'error') {
    return (
      <button
        type="button"
        onClick={onRetry}
        title={error ?? undefined}
        className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 transition hover:bg-amber-100"
      >
        <CloudOff className="size-3.5" strokeWidth={2} />
        נשמר במכשיר · סנכרון נכשל — נסה שוב
      </button>
    )
  }
  if (status === 'offline') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
        <WifiOff className="size-3.5" strokeWidth={2} />
        אופליין · יסונכרן כשהרשת תחזור
      </span>
    )
  }
  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted">
        <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
        שומר…
      </span>
    )
  }
  if (status === 'saved') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
        <Check className="size-3.5" strokeWidth={2.25} />
        מסונכרן
      </span>
    )
  }
  return <span />
}

export function TipsPage() {
  const tips = useFitnessTips()
  const { categories } = tips
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    const stored = readOpenState()
    if (stored) return new Set(stored)
    return new Set(categories[0] ? [categories[0].id] : [])
  })
  const userToggled = useRef(readOpenState() != null)
  // Tips start collapsed each visit; this is view state only and never synced.
  const [openItemIds, setOpenItemIds] = useState<Set<string>>(() => new Set())
  const [itemTarget, setItemTarget] = useState<TipDraftTarget | null>(null)
  const [categoryTarget, setCategoryTarget] = useState<TipCategory | '' | null>(null)
  const [undo, setUndo] = useState<Undo | null>(null)
  const undoTimer = useRef<number | null>(null)

  // A cloud pull can swap in categories with new ids: until the user has chosen
  // what to open, keep the first category open.
  const firstId = categories[0]?.id
  useEffect(() => {
    if (!userToggled.current && firstId) setOpenIds(new Set([firstId]))
  }, [firstId])

  useEffect(() => {
    return () => {
      if (undoTimer.current != null) window.clearTimeout(undoTimer.current)
    }
  }, [])

  const allOpen = categories.length > 0 && categories.every((c) => openIds.has(c.id))

  function updateOpen(next: Set<string>) {
    userToggled.current = true
    setOpenIds(next)
    writeOpenState(next)
  }

  function toggle(id: string) {
    const next = new Set(openIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    updateOpen(next)
  }

  function open(id: string) {
    if (!openIds.has(id)) updateOpen(new Set(openIds).add(id))
  }

  function toggleItem(id: string) {
    setOpenItemIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function offerUndo(next: Undo) {
    if (undoTimer.current != null) window.clearTimeout(undoTimer.current)
    setUndo(next)
    undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS)
  }

  function handleUndo() {
    if (!undo) return
    if (undo.kind === 'category') {
      tips.restoreCategory(undo.category, undo.index)
      open(undo.category.id)
    } else {
      tips.restoreItem(undo.categoryId, undo.item, undo.index)
      open(undo.categoryId)
    }
    if (undoTimer.current != null) window.clearTimeout(undoTimer.current)
    setUndo(null)
  }

  function openNewItem(categoryId?: string) {
    const target = categoryId ?? categories[0]?.id
    if (!target) {
      setCategoryTarget('')
      return
    }
    setItemTarget({ categoryId: target, item: null })
  }

  function handleSaveCategory(title: string) {
    if (categoryTarget) {
      tips.renameCategory(categoryTarget.id, title)
    } else {
      open(tips.addCategory(title))
    }
    setCategoryTarget(null)
  }

  return (
    <>
      <PageHeader
        title="כושר דגשים"
        subtitle="דגשי ביצוע, טכניקה וחימום — תמיד בהישג יד"
        action={
          <Button
            variant="accent"
            className="shrink-0 px-3 text-xs sm:text-sm"
            onClick={() => openNewItem()}
          >
            <Plus className="size-4" strokeWidth={2.25} />
            דגש חדש
          </Button>
        }
      />

      <div className="space-y-4 px-4 py-5" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SyncPill
            status={tips.status}
            error={tips.syncError}
            onRetry={() => void tips.syncNow()}
          />
          <div className="ms-auto flex items-center gap-1">
            {categories.length > 1 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateOpen(allOpen ? new Set() : new Set(categories.map((c) => c.id)))
                }
              >
                {allOpen ? (
                  <ChevronsDownUp className="size-3.5" strokeWidth={2} />
                ) : (
                  <ChevronsUpDown className="size-3.5" strokeWidth={2} />
                )}
                {allOpen ? 'כווץ הכל' : 'פתח הכל'}
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => setCategoryTarget('')}>
              <FolderPlus className="size-3.5" strokeWidth={2} />
              קטגוריה
            </Button>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
            <Lightbulb className="mx-auto size-8 text-amber-500" strokeWidth={1.75} />
            <p className="mt-2 font-semibold text-text">אין עדיין קטגוריות</p>
            <p className="mt-1 text-sm text-muted">
              צור קטגוריה, למשל "פוזינג אקטיבי", והוסף לה דגשים.
            </p>
            <Button className="mt-4" variant="accent" onClick={() => setCategoryTarget('')}>
              <Plus className="size-4" strokeWidth={2.25} />
              קטגוריה חדשה
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {categories.map((category, ci) => {
              const isOpen = openIds.has(category.id)
              const panelId = `tips-panel-${category.id}`
              const headerId = `tips-header-${category.id}`
              return (
                <li
                  key={category.id}
                  className={[
                    'rounded-2xl border bg-white shadow-sm transition-colors',
                    isOpen
                      ? 'border-blue-200/80 shadow-blue-100/60'
                      : 'border-slate-200 shadow-slate-200/80',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-1 pe-2">
                    <button
                      type="button"
                      id={headerId}
                      onClick={() => toggle(category.id)}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl px-4 py-3 text-right transition hover:bg-slate-50/80"
                    >
                      <span
                        className={[
                          'flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors',
                          isOpen ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600',
                        ].join(' ')}
                      >
                        <Lightbulb className="size-4" strokeWidth={2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-[15px] font-bold text-slate-900">
                          {category.title}
                        </span>
                        <span className="text-[11px] text-muted">
                          {category.items.length === 0
                            ? 'ללא דגשים'
                            : category.items.length === 1
                              ? 'דגש אחד'
                              : `${category.items.length} דגשים`}
                        </span>
                      </span>
                      <ChevronDown
                        className={`size-4 shrink-0 text-muted transition-transform duration-300 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
                        strokeWidth={2}
                      />
                    </button>
                    <TipActionsMenu
                      label={`פעולות לקטגוריה ${category.title}`}
                      actions={[
                        {
                          label: 'הוסף דגש',
                          icon: Plus,
                          onSelect: () => openNewItem(category.id),
                        },
                        {
                          label: 'שנה שם',
                          icon: Pencil,
                          onSelect: () => setCategoryTarget(category),
                        },
                        {
                          label: 'הזז למעלה',
                          icon: ArrowUp,
                          disabled: ci === 0,
                          onSelect: () => tips.moveCategory(category.id, -1),
                        },
                        {
                          label: 'הזז למטה',
                          icon: ArrowDown,
                          disabled: ci === categories.length - 1,
                          onSelect: () => tips.moveCategory(category.id, 1),
                        },
                        {
                          label: 'מחק קטגוריה',
                          icon: Trash2,
                          destructive: true,
                          onSelect: () => {
                            tips.deleteCategory(category.id)
                            offerUndo({ kind: 'category', category, index: ci })
                          },
                        },
                      ]}
                    />
                  </div>

                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={headerId}
                    className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                    inert={!isOpen}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="space-y-2 rounded-b-2xl border-t border-slate-100 bg-slate-50/50 p-3">
                        {category.items.length === 0 ? (
                          <p className="px-1 py-1 text-xs text-muted">
                            עדיין אין דגשים בקטגוריה הזו.
                          </p>
                        ) : null}
                        {category.items.map((item, ii) => (
                          <TipItemAccordion
                            key={item.id}
                            item={item}
                            isOpen={openItemIds.has(item.id)}
                            onToggle={() => toggleItem(item.id)}
                            actions={[
                                  {
                                    label: 'ערוך',
                                    icon: Pencil,
                                    onSelect: () =>
                                      setItemTarget({ categoryId: category.id, item }),
                                  },
                                  {
                                    label: 'הזז למעלה',
                                    icon: ArrowUp,
                                    disabled: ii === 0,
                                    onSelect: () => tips.moveItem(category.id, item.id, -1),
                                  },
                                  {
                                    label: 'הזז למטה',
                                    icon: ArrowDown,
                                    disabled: ii === category.items.length - 1,
                                    onSelect: () => tips.moveItem(category.id, item.id, 1),
                                  },
                                  {
                                    label: 'מחק דגש',
                                    icon: Trash2,
                                    destructive: true,
                                    onSelect: () => {
                                      tips.deleteItem(category.id, item.id)
                                      offerUndo({
                                        kind: 'item',
                                        categoryId: category.id,
                                        item,
                                        index: ii,
                                      })
                                    },
                                  },
                                ]}
                          />
                        ))}
                        <button
                          type="button"
                          onClick={() => openNewItem(category.id)}
                          className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-muted transition hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-600"
                        >
                          <Plus className="size-3.5" strokeWidth={2.25} />
                          הוסף דגש לקטגוריה
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <Link
          to="/routines"
          className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted transition hover:text-text"
        >
          <CalendarCheck className="size-3.5" strokeWidth={2} />
          מעקב שגרות והרגלים
        </Link>
      </div>

      {undo ? (
        <div
          role="status"
          className="fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl shadow-slate-900/20"
          dir="rtl"
        >
          <span className="min-w-0 truncate">
            {undo.kind === 'category'
              ? `הקטגוריה "${undo.category.title}" נמחקה`
              : `הדגש "${undo.item.title}" נמחק`}
          </span>
          <button
            type="button"
            onClick={handleUndo}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-bold text-blue-300 transition hover:bg-white/10"
          >
            בטל
          </button>
        </div>
      ) : null}

      <TipItemModal
        target={itemTarget}
        categories={categories}
        onClose={() => setItemTarget(null)}
        onSave={(categoryId, input) => {
          tips.saveItem(categoryId, input)
          open(categoryId)
          if (input.id) setOpenItemIds((prev) => new Set(prev).add(input.id as string))
          setItemTarget(null)
        }}
      />
      <CategoryModal
        category={categoryTarget}
        categories={categories}
        onClose={() => setCategoryTarget(null)}
        onSave={handleSaveCategory}
      />
    </>
  )
}
