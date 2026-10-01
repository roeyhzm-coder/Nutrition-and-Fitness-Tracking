import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { savedPresetKind } from '../../data/defaults'
import { parseDecimal, parseInteger } from '../../lib/numericInput'
import type { SavedMeal, SavedPresetKind } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { NumericInput } from '../ui/NumericInput'

const EMPTY_FORM = {
  name: '',
  calories: '',
  protein: '',
  carbs: '',
  fats: '',
  notes: '',
  kind: 'item' as SavedPresetKind,
}

type PresetForm = typeof EMPTY_FORM

function MiniIcon({
  label,
  onClick,
  tone = 'muted',
  children,
}: {
  label: string
  onClick: () => void
  tone?: 'muted' | 'accent' | 'danger'
  children: ReactNode
}) {
  const tones = {
    muted: 'text-muted hover:bg-slate-100 hover:text-text',
    accent: 'text-cyan-700 hover:bg-cyan-600 hover:text-white',
    danger: 'text-muted hover:bg-rose-50 hover:text-danger',
  }
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-xl transition ${tones[tone]}`}
    >
      {children}
    </button>
  )
}

function CompactFold({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string
  count: number
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex min-h-10 w-full items-center justify-between gap-2 px-3 py-1.5 text-right"
      >
        <span className="text-sm font-semibold text-text">
          {title}
          <span className="ms-1.5 text-xs font-medium text-muted">{count}</span>
        </span>
        <ChevronDown
          className={[
            'size-4 shrink-0 text-muted transition',
            open ? 'rotate-180' : '',
          ].join(' ')}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="space-y-2 border-t border-slate-200 p-2">{children}</div>
      ) : null}
    </div>
  )
}

export function SavedMeals() {
  const {
    savedMeals,
    addSavedMeal,
    updateSavedMeal,
    deleteSavedMeal,
    logSavedMeal,
  } = useAppData()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SavedMeal | null>(null)
  const [form, setForm] = useState<PresetForm>(EMPTY_FORM)
  const [itemsOpen, setItemsOpen] = useState(true)
  const [mealsOpen, setMealsOpen] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  const items = useMemo(
    () => savedMeals.filter((m) => savedPresetKind(m) === 'item'),
    [savedMeals],
  )
  const meals = useMemo(
    () => savedMeals.filter((m) => savedPresetKind(m) === 'meal'),
    [savedMeals],
  )

  useEffect(() => {
    return () => {
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    }
  }, [])

  function showToast(message: string) {
    setToast(message)
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  function openCreate(kind: SavedPresetKind) {
    setEditing(null)
    setForm({ ...EMPTY_FORM, kind })
    setOpen(true)
  }

  function openEdit(meal: SavedMeal) {
    setEditing(meal)
    setForm({
      name: meal.name,
      calories: String(meal.calories),
      protein: String(meal.protein),
      carbs: String(meal.carbs),
      fats: String(meal.fats),
      notes: meal.notes ?? '',
      kind: savedPresetKind(meal),
    })
    setOpen(true)
  }

  function handleLog(mealId: string) {
    if (logSavedMeal(mealId)) {
      showToast('נוסף בהצלחה ליומן המזון')
    }
  }

  function handleDelete(meal: SavedMeal) {
    const label = savedPresetKind(meal) === 'meal' ? 'את הארוחה' : 'את הפריט'
    if (!window.confirm(`למחוק ${label} "${meal.name}"?`)) return
    deleteSavedMeal(meal.id)
    if (editing?.id === meal.id) setOpen(false)
  }

  function submitForm() {
    const payload = {
      name: form.name.trim(),
      calories: parseInteger(form.calories) ?? 0,
      protein: parseDecimal(form.protein) ?? 0,
      carbs: parseDecimal(form.carbs) ?? 0,
      fats: parseDecimal(form.fats) ?? 0,
      notes: form.notes.trim() || undefined,
      kind: form.kind,
    }
    if (!payload.name) return
    if (editing) updateSavedMeal(editing.id, payload)
    else addSavedMeal(payload)
    setOpen(false)
  }

  const isMealForm = form.kind === 'meal'

  return (
    <>
      <Card title="הקבועים שלי">
        {toast ? (
          <p
            role="status"
            className="mb-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800"
          >
            {toast}
          </p>
        ) : null}

        <div className="space-y-2">
          <CompactFold
            title="פריטים בודדים"
            count={items.length}
            open={itemsOpen}
            onToggle={() => setItemsOpen((v) => !v)}
          >
            {items.length === 0 ? (
              <p className="px-1 text-xs text-muted">
                אין פריטים בודדים עדיין. שמור מלחם, גבינה או חיפוש המזון.
              </p>
            ) : (
              <ul className="space-y-1">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white px-2 py-1"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-text">
                        {item.name}
                      </p>
                      <p className="truncate text-[10px] text-muted">
                        {item.calories} קק״ל · ח {item.protein}
                      </p>
                    </div>
                    <MiniIcon
                      label={`הוסף ${item.name} להיום`}
                      tone="accent"
                      onClick={() => handleLog(item.id)}
                    >
                      <Plus className="size-3.5" strokeWidth={2.25} />
                    </MiniIcon>
                    <MiniIcon
                      label={`ערוך ${item.name}`}
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="size-3.5" strokeWidth={1.75} />
                    </MiniIcon>
                    <MiniIcon
                      label={`מחק ${item.name}`}
                      tone="danger"
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 className="size-3.5" strokeWidth={1.75} />
                    </MiniIcon>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              aria-label="פריט קבוע חדש"
              className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-50"
              onClick={() => openCreate('item')}
            >
              <Plus className="size-3.5" strokeWidth={2} />
              פריט קבוע חדש
            </button>
          </CompactFold>

          <CompactFold
            title="ארוחות ומתכונים"
            count={meals.length}
            open={mealsOpen}
            onToggle={() => setMealsOpen((v) => !v)}
          >
            {meals.length === 0 ? (
              <p className="px-1 text-xs text-muted">
                אין ארוחות קבועות עדיין. הוסף ארוחה מלאה לשימוש חוזר.
              </p>
            ) : (
              <ul className="space-y-1">
                {meals.map((meal) => (
                  <li
                    key={meal.id}
                    className="rounded-xl border border-slate-200 bg-white px-2 py-1.5"
                  >
                    <div className="flex items-start gap-0.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-text">
                          {meal.name}
                        </p>
                        {meal.notes?.trim() ? (
                          <p className="truncate text-[10px] text-muted">
                            {meal.notes}
                          </p>
                        ) : null}
                        <p className="text-[10px] font-medium text-text">
                          {meal.calories} קק״ל · ח {meal.protein}
                        </p>
                      </div>
                      <MiniIcon
                        label={`ערוך ${meal.name}`}
                        onClick={() => openEdit(meal)}
                      >
                        <Pencil className="size-3.5" strokeWidth={1.75} />
                      </MiniIcon>
                      <MiniIcon
                        label={`מחק ${meal.name}`}
                        tone="danger"
                        onClick={() => handleDelete(meal)}
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.75} />
                      </MiniIcon>
                    </div>
                    <button
                      type="button"
                      aria-label={`הוסף ${meal.name} ליומן`}
                      className="mt-1 inline-flex min-h-8 items-center gap-1 rounded-lg bg-cyan-600 px-2 text-[11px] font-semibold text-white hover:bg-cyan-500"
                      onClick={() => handleLog(meal.id)}
                    >
                      <Plus className="size-3" strokeWidth={2.25} />
                      הוסף ליומן
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              aria-label="ארוחה או מתכון חדש"
              className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-50"
              onClick={() => openCreate('meal')}
            >
              <Plus className="size-3.5" strokeWidth={2} />
              ארוחה / מתכון חדש
            </button>
          </CompactFold>
        </div>
      </Card>

      <Modal
        open={open}
        title={
          editing
            ? isMealForm
              ? 'עריכת ארוחה / מתכון'
              : 'עריכת פריט קבוע'
            : isMealForm
              ? 'ארוחה / מתכון חדש'
              : 'פריט קבוע חדש'
        }
        onClose={() => setOpen(false)}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            submitForm()
          }}
        >
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-50 p-1">
            {(
              [
                ['item', 'פריט בודד'],
                ['meal', 'ארוחה / מתכון'],
              ] as const
            ).map(([kind, label]) => (
              <button
                key={kind}
                type="button"
                onClick={() => setForm((p) => ({ ...p, kind }))}
                className={[
                  'min-h-9 rounded-lg px-2 text-xs font-semibold transition',
                  form.kind === kind
                    ? 'bg-white text-text shadow-sm'
                    : 'text-muted hover:text-text',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="block text-xs text-muted">
            {isMealForm ? 'שם הארוחה' : 'שם'}
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder={
                isMealForm
                  ? 'למשל שייק חלבון ושיבולת שועל'
                  : 'למשל 2 פרוסות לחם מלא'
              }
              className="mt-1 field"
              required
            />
          </label>
          <label className="block text-xs text-muted">
            {isMealForm ? 'פירוט מרכיבים' : 'הערות (אופציונלי)'}
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder={
                isMealForm
                  ? 'למשל: 3 ביצים, 2 פרוסות לחם מלא, ירקות'
                  : 'למשל: 35 גרם לפרוסה'
              }
              className="mt-1 field min-h-16 resize-y"
              rows={isMealForm ? 3 : 2}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['calories', 'קלוריות'],
                ['protein', 'חלבון'],
                ['carbs', 'פחמימות'],
                ['fats', 'שומנים'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-xs text-muted">
                {label}
                <NumericInput
                  decimals={key === 'calories' ? 0 : 2}
                  value={form[key]}
                  onChange={(next) => setForm((p) => ({ ...p, [key]: next }))}
                />
              </label>
            ))}
          </div>
          <Button type="submit" className="w-full" variant="accent">
            שמור
          </Button>
          {editing ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-danger"
              onClick={() => handleDelete(editing)}
            >
              <Trash2 className="size-3.5" strokeWidth={1.75} />
              מחק
            </Button>
          ) : null}
        </form>
      </Modal>
    </>
  )
}
