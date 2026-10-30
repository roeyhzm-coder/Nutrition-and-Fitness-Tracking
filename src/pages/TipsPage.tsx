import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  Check,
  ChevronDown,
  CloudOff,
  Lightbulb,
  Loader2,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/button'
import { IconButton } from '../components/ui/IconButton'
import { TipBody } from '../components/tips/TipBody'
import {
  CategoryModal,
  TipItemModal,
  type TipDraftTarget,
} from '../components/tips/TipFormModals'
import { useFitnessTips, type TipsSyncStatus } from '../hooks/useFitnessTips'
import type { TipCategory } from '../lib/fitnessTips'

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
        נשמר במכשיר · סנכרון ענן נכשל — נסה שוב
      </button>
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
  return null
}

export function TipsPage() {
  const tips = useFitnessTips()
  const { categories } = tips
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(categories[0] ? [categories[0].id] : []),
  )
  const userToggled = useRef(false)
  const [arranging, setArranging] = useState(false)
  const [itemTarget, setItemTarget] = useState<TipDraftTarget | null>(null)
  const [categoryTarget, setCategoryTarget] = useState<TipCategory | '' | null>(null)

  // A cloud pull can swap in categories with new ids: keep the first one open
  // until the user has opened or closed something themselves.
  const firstId = categories[0]?.id
  useEffect(() => {
    if (!userToggled.current && firstId) setOpenIds(new Set([firstId]))
  }, [firstId])

  function toggle(id: string) {
    userToggled.current = true
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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
      const id = tips.addCategory(title)
      setOpenIds((prev) => new Set(prev).add(id))
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
            onRetry={() => void tips.retrySync()}
          />
          <div className="ms-auto flex items-center gap-1.5">
            <Button
              variant={arranging ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setArranging((v) => !v)}
              aria-pressed={arranging}
            >
              <Settings2 className="size-3.5" strokeWidth={2} />
              {arranging ? 'סיום עריכה' : 'סידור ועריכה'}
            </Button>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
            <Lightbulb className="mx-auto size-8 text-amber-500" strokeWidth={1.75} />
            <p className="mt-2 font-semibold text-text">אין עדיין קטגוריות</p>
            <p className="mt-1 text-sm text-muted">
              צור קטגוריה, למשל "דגשים לרגליים", והוסף לה דגשים.
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
              return (
                <li
                  key={category.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/80"
                >
                  <div className="flex items-center gap-1 pe-1">
                    <button
                      type="button"
                      onClick={() => toggle(category.id)}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-4 py-3 text-right transition hover:bg-slate-50/80"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Lightbulb className="size-4" strokeWidth={2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-[15px] font-bold text-slate-900">
                          {category.title}
                        </span>
                        <span className="text-[11px] text-muted">
                          {category.items.length === 0
                            ? 'ללא דגשים'
                            : `${category.items.length} דגשים`}
                        </span>
                      </span>
                      <ChevronDown
                        className={`size-4 shrink-0 text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                        strokeWidth={2}
                      />
                    </button>
                    {arranging ? (
                      <div className="flex shrink-0 items-center">
                        <IconButton
                          label="הזז קטגוריה למעלה"
                          className="size-9"
                          disabled={ci === 0}
                          onClick={() => tips.moveCategory(category.id, -1)}
                        >
                          <ArrowUp className="size-4" strokeWidth={2} />
                        </IconButton>
                        <IconButton
                          label="הזז קטגוריה למטה"
                          className="size-9"
                          disabled={ci === categories.length - 1}
                          onClick={() => tips.moveCategory(category.id, 1)}
                        >
                          <ArrowDown className="size-4" strokeWidth={2} />
                        </IconButton>
                        <IconButton
                          label="שנה שם קטגוריה"
                          tone="accent"
                          className="size-9"
                          onClick={() => setCategoryTarget(category)}
                        >
                          <Pencil className="size-4" strokeWidth={2} />
                        </IconButton>
                        <IconButton
                          label="מחק קטגוריה"
                          tone="danger"
                          className="size-9"
                          onClick={() => {
                            const msg =
                              category.items.length > 0
                                ? `למחוק את "${category.title}" יחד עם ${category.items.length} הדגשים שבה?`
                                : `למחוק את "${category.title}"?`
                            if (window.confirm(msg)) tips.deleteCategory(category.id)
                          }}
                        >
                          <Trash2 className="size-4" strokeWidth={2} />
                        </IconButton>
                      </div>
                    ) : null}
                  </div>

                  <div
                    id={panelId}
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                    inert={!isOpen}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="space-y-2 border-t border-slate-100 bg-slate-50/50 p-3">
                        {category.items.map((item, ii) => (
                          <article
                            key={item.id}
                            className="rounded-xl border border-slate-200/80 bg-white p-3"
                          >
                            <div className="flex items-start gap-2">
                              <h3 className="min-w-0 flex-1 pt-0.5 text-sm font-bold text-slate-900">
                                {item.title}
                              </h3>
                              <div className="-me-1.5 -mt-1.5 flex shrink-0 items-center">
                                {arranging ? (
                                  <>
                                    <IconButton
                                      label="הזז למעלה"
                                      className="size-9"
                                      disabled={ii === 0}
                                      onClick={() => tips.moveItem(category.id, item.id, -1)}
                                    >
                                      <ArrowUp className="size-4" strokeWidth={2} />
                                    </IconButton>
                                    <IconButton
                                      label="הזז למטה"
                                      className="size-9"
                                      disabled={ii === category.items.length - 1}
                                      onClick={() => tips.moveItem(category.id, item.id, 1)}
                                    >
                                      <ArrowDown className="size-4" strokeWidth={2} />
                                    </IconButton>
                                    <IconButton
                                      label="מחק דגש"
                                      tone="danger"
                                      className="size-9"
                                      onClick={() => {
                                        if (window.confirm(`למחוק את "${item.title}"?`)) {
                                          tips.deleteItem(category.id, item.id)
                                        }
                                      }}
                                    >
                                      <Trash2 className="size-4" strokeWidth={2} />
                                    </IconButton>
                                  </>
                                ) : null}
                                <IconButton
                                  label="ערוך דגש"
                                  tone="accent"
                                  className="size-9"
                                  onClick={() => setItemTarget({ categoryId: category.id, item })}
                                >
                                  <Pencil className="size-3.5" strokeWidth={2} />
                                </IconButton>
                              </div>
                            </div>
                            {item.body.trim() ? (
                              <div className="mt-1.5">
                                <TipBody body={item.body} />
                              </div>
                            ) : null}
                          </article>
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

        {categories.length > 0 ? (
          <Button variant="outline" className="w-full" onClick={() => setCategoryTarget('')}>
            <Plus className="size-4" strokeWidth={2.25} />
            קטגוריה חדשה
          </Button>
        ) : null}

        <Link
          to="/routines"
          className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted transition hover:text-text"
        >
          <CalendarCheck className="size-3.5" strokeWidth={2} />
          מעקב שגרות והרגלים
        </Link>
      </div>

      <TipItemModal
        target={itemTarget}
        categories={categories}
        onClose={() => setItemTarget(null)}
        onSave={(categoryId, input) => {
          tips.saveItem(categoryId, input)
          setOpenIds((prev) => new Set(prev).add(categoryId))
          setItemTarget(null)
        }}
      />
      <CategoryModal
        category={categoryTarget}
        onClose={() => setCategoryTarget(null)}
        onSave={handleSaveCategory}
      />
    </>
  )
}
