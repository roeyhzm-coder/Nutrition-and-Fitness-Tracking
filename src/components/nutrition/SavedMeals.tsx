import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { ChevronDown, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { savedPresetKind } from '../../data/defaults'
import {
  buildFoodCatalog,
  catalogDisplayName,
  catalogMacroPreview,
  emptyIngredientLine,
  formatIngredientNotes,
  macrosFromPer100g,
  sumIngredientLines,
  type CatalogFood,
  type MealIngredientLine,
} from '../../lib/foodCatalog'
import { formatNiceNumber, parseDecimal, parsePositiveDecimal, roundTo } from '../../lib/numericInput'
import { uid, type SavedMeal, type SavedPresetKind } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { NumericInput } from '../ui/NumericInput'
import { CatalogPicker } from './CatalogPicker'
import { MealIngredientBuilder } from './MealIngredientBuilder'
import { PortionPills } from './PortionPills'
import { QuickPortionModal } from './QuickPortionModal'

const EMPTY_FORM = {
  name: '',
  calories: '',
  protein: '',
  carbs: '',
  fats: '',
  notes: '',
  servingGrams: '',
  kind: 'item' as SavedPresetKind,
}

type PresetForm = typeof EMPTY_FORM
type EntryMode = 'catalog' | 'manual' | 'compose'

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

function ModeTabs({
  value,
  options,
  onChange,
}: {
  value: string
  options: { id: string; label: string }[]
  onChange: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-50 p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={[
            'min-h-9 rounded-lg px-2 text-xs font-semibold transition',
            value === option.id
              ? 'bg-white text-text shadow-sm'
              : 'text-muted hover:text-text',
          ].join(' ')}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function MacroFields({
  form,
  setForm,
}: {
  form: PresetForm
  setForm: Dispatch<SetStateAction<PresetForm>>
}) {
  return (
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
            decimals={2}
            value={form[key]}
            onChange={(next) => setForm((p) => ({ ...p, [key]: next }))}
          />
        </label>
      ))}
    </div>
  )
}

function CompactPresetRow({
  item,
  onLog,
  onEdit,
  onDelete,
}: {
  item: SavedMeal
  onLog: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const subtitle = [
    item.notes?.trim(),
    `${formatNiceNumber(item.calories, 0)} קק״ל · ח ${formatNiceNumber(item.protein)}`,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <li className="flex min-h-11 items-center gap-0.5 rounded-xl border border-slate-200 bg-white px-2 py-1">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-text">{item.name}</p>
        <p className="truncate text-[10px] text-muted">{subtitle}</p>
      </div>
      <MiniIcon label={`הוסף ${item.name} להיום`} tone="accent" onClick={onLog}>
        <Plus className="size-3.5" strokeWidth={2.25} />
      </MiniIcon>
      <MiniIcon label={`ערוך ${item.name}`} onClick={onEdit}>
        <Pencil className="size-3.5" strokeWidth={1.75} />
      </MiniIcon>
      <MiniIcon label={`מחק ${item.name}`} tone="danger" onClick={onDelete}>
        <Trash2 className="size-3.5" strokeWidth={1.75} />
      </MiniIcon>
    </li>
  )
}

export function SavedMeals() {
  const {
    savedMeals,
    addSavedMeal,
    updateSavedMeal,
    deleteSavedMeal,
    addFood,
    recipes,
  } = useAppData()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SavedMeal | null>(null)
  const [portionItem, setPortionItem] = useState<SavedMeal | null>(null)
  const [form, setForm] = useState<PresetForm>(EMPTY_FORM)
  const [entryMode, setEntryMode] = useState<EntryMode>('catalog')
  const [picked, setPicked] = useState<CatalogFood | null>(null)
  const [lines, setLines] = useState<MealIngredientLine[]>([])
  const [itemsOpen, setItemsOpen] = useState(false)
  const [mealsOpen, setMealsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  const q = query.trim()
  const items = useMemo(
    () =>
      savedMeals.filter((m) => {
        if (savedPresetKind(m) !== 'item') return false
        if (!q) return true
        return (
          m.name.includes(q) || (m.notes != null && m.notes.includes(q))
        )
      }),
    [savedMeals, q],
  )
  const meals = useMemo(
    () =>
      savedMeals.filter((m) => {
        if (savedPresetKind(m) !== 'meal') return false
        if (!q) return true
        return (
          m.name.includes(q) || (m.notes != null && m.notes.includes(q))
        )
      }),
    [savedMeals, q],
  )

  const catalog = useMemo(
    () => buildFoodCatalog(recipes, savedMeals, editing?.id),
    [recipes, savedMeals, editing?.id],
  )
  const ingredientCatalog = useMemo(
    () => catalog.filter((item) => item.kind === 'item'),
    [catalog],
  )
  const recipeCatalog = useMemo(
    () => catalog.filter((item) => item.kind === 'meal'),
    [catalog],
  )

  const namedLines = useMemo(
    () => lines.filter((line) => line.name.trim()),
    [lines],
  )
  const lineTotals = useMemo(
    () => sumIngredientLines(namedLines),
    [namedLines],
  )

  useEffect(() => {
    if (!q) return
    setItemsOpen(true)
    setMealsOpen(true)
  }, [q])

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

  function applyCatalogItem(item: CatalogFood, servings = 1) {
    const grams = roundTo(item.servingGrams * servings, 2)
    const macros = macrosFromPer100g(item.per100g, grams)
    setPicked(item)
    setForm((prev) => ({
      ...prev,
      name: catalogDisplayName(item),
      calories: String(macros.calories),
      protein: String(macros.protein),
      carbs: String(macros.carbs),
      fats: String(macros.fats),
      servingGrams: formatNiceNumber(grams),
      notes: prev.notes,
      kind: 'item',
    }))
  }

  function applyRecipe(item: CatalogFood) {
    const recipe = recipes.find((r) => `recipe:${r.id}` === item.id)
    setPicked(item)
    setLines([])
    setForm((prev) => ({
      ...prev,
      name: item.name,
      calories: String(item.calories),
      protein: String(item.protein),
      carbs: String(item.carbs),
      fats: String(item.fats),
      servingGrams: String(item.servingGrams),
      notes: recipe?.ingredients.join(' · ') || prev.notes,
      kind: 'meal',
    }))
    setEntryMode('manual')
  }

  function openCreate(kind: SavedPresetKind) {
    setEditing(null)
    setPicked(null)
    setForm({ ...EMPTY_FORM, kind })
    setLines(kind === 'meal' ? [emptyIngredientLine(uid())] : [])
    setEntryMode(kind === 'item' ? 'catalog' : 'compose')
    setOpen(true)
  }

  function openEdit(meal: SavedMeal) {
    setEditing(meal)
    setPicked(null)
    setLines([])
    setForm({
      name: meal.name,
      calories: String(meal.calories),
      protein: String(meal.protein),
      carbs: String(meal.carbs),
      fats: String(meal.fats),
      notes: meal.notes ?? '',
      servingGrams: meal.servingGrams != null ? String(meal.servingGrams) : '',
      kind: savedPresetKind(meal),
    })
    setEntryMode('manual')
    setOpen(true)
  }

  function handleLog(meal: SavedMeal) {
    setPortionItem(meal)
  }

  function handleDelete(meal: SavedMeal) {
    const label = savedPresetKind(meal) === 'meal' ? 'את הארוחה' : 'את הפריט'
    if (!window.confirm(`למחוק ${label} "${meal.name}"?`)) return
    deleteSavedMeal(meal.id)
    if (editing?.id === meal.id) setOpen(false)
  }

  function submitForm() {
    const fromLines = form.kind === 'meal' && namedLines.length > 0
    const totals = fromLines ? lineTotals : null
    const payload: Omit<SavedMeal, 'id'> = {
      name: form.name.trim(),
      calories: totals?.calories ?? parseDecimal(form.calories) ?? 0,
      protein: totals?.protein ?? parseDecimal(form.protein) ?? 0,
      carbs: totals?.carbs ?? parseDecimal(form.carbs) ?? 0,
      fats: totals?.fats ?? parseDecimal(form.fats) ?? 0,
      notes: fromLines
        ? formatIngredientNotes(namedLines) || undefined
        : form.notes.trim() || undefined,
      kind: form.kind,
      servingGrams:
        totals?.grams ||
        parsePositiveDecimal(form.servingGrams) ||
        undefined,
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

        <label className="relative mb-2 block">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            strokeWidth={1.75}
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש מהיר בקבועים…"
            className="field ps-10"
            aria-label="חיפוש בקבועים שלי"
          />
        </label>
        <div className="space-y-2">
          <CompactFold
            title="פריטים בודדים"
            count={items.length}
            open={itemsOpen}
            onToggle={() => setItemsOpen((v) => !v)}
          >
            {items.length === 0 ? (
              <p className="px-1 text-xs text-muted">
                {q
                  ? 'אין פריטים שתואמים לחיפוש.'
                  : 'אין פריטים בודדים עדיין. שמור מלחם, גבינה או חיפוש המזון.'}
              </p>
            ) : (
              <ul className="space-y-1">
                {items.map((item) => (
                  <CompactPresetRow
                    key={item.id}
                    item={item}
                    onLog={() => handleLog(item)}
                    onEdit={() => openEdit(item)}
                    onDelete={() => handleDelete(item)}
                  />
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
                {q
                  ? 'אין ארוחות שתואמות לחיפוש.'
                  : 'אין ארוחות קבועות עדיין. הוסף ארוחה מלאה לשימוש חוזר.'}
              </p>
            ) : (
              <ul className="space-y-1">
                {meals.map((meal) => (
                  <CompactPresetRow
                    key={meal.id}
                    item={meal}
                    onLog={() => handleLog(meal)}
                    onEdit={() => openEdit(meal)}
                    onDelete={() => handleDelete(meal)}
                  />
                ))}
              </ul>
            )}
            <button
              type="button"
              aria-label="ארוחה חדשה"
              className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-50"
              onClick={() => openCreate('meal')}
            >
              <Plus className="size-3.5" strokeWidth={2} />
              ארוחה חדשה
            </button>
          </CompactFold>
        </div>
      </Card>

      <Modal
        open={open}
        wide={isMealForm}
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
                onClick={() => {
                  setForm((p) => ({ ...p, kind }))
                  if (kind === 'item') {
                    setEntryMode(editing ? 'manual' : 'catalog')
                    setLines([])
                  } else {
                    setEntryMode(editing ? 'manual' : 'compose')
                    setLines((prev) =>
                      prev.length ? prev : [emptyIngredientLine(uid())],
                    )
                  }
                }}
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

          {isMealForm ? (
            <ModeTabs
              value={entryMode === 'manual' ? 'manual' : 'compose'}
              options={[
                { id: 'compose', label: 'הרכב ארוחה' },
                { id: 'manual', label: 'הזנה ידנית' },
              ]}
              onChange={(id) => {
                setEntryMode(id === 'manual' ? 'manual' : 'compose')
                if (id === 'compose' && lines.length === 0) {
                  setLines([emptyIngredientLine(uid())])
                }
              }}
            />
          ) : (
            <ModeTabs
              value={entryMode === 'manual' ? 'manual' : 'catalog'}
              options={[
                { id: 'catalog', label: 'בחירה מהמאגר' },
                { id: 'manual', label: 'הזנה ידנית' },
              ]}
              onChange={(id) =>
                setEntryMode(id === 'manual' ? 'manual' : 'catalog')
              }
            />
          )}

          {!isMealForm && entryMode !== 'manual' ? (
            <CatalogPicker
              items={ingredientCatalog}
              placeholder="חיפוש במאגר, למשל קוטג, לחם, אבקת…"
              onSelect={applyCatalogItem}
              autoFocus={!editing}
            />
          ) : null}

          {isMealForm && entryMode !== 'manual' ? (
            <div className="space-y-2">
              <label className="block text-xs text-muted">
                שמירת מתכון קיים
                <div className="mt-1">
                  <CatalogPicker
                    items={recipeCatalog}
                    placeholder="חיפוש מתכון או ארוחה מוכנה…"
                    onSelect={applyRecipe}
                  />
                </div>
              </label>
              <MealIngredientBuilder
                catalog={ingredientCatalog}
                lines={lines}
                onChange={setLines}
              />
            </div>
          ) : null}

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

          {entryMode === 'manual' || (!isMealForm && picked) ? (
            <label className="block text-xs text-muted">
              {isMealForm ? 'פירוט מרכיבים' : 'הערות (אופציונלי)'}
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder={
                  isMealForm
                    ? 'למשל: 3 ביצים, 2 פרוסות לחם מלא, ירקות'
                    : 'למשל: 35 גרם לפרוסה'
                }
                className="mt-1 field min-h-16 resize-y"
                rows={isMealForm ? 3 : 2}
              />
            </label>
          ) : null}

          {!isMealForm || entryMode === 'manual' ? (
            <label className="block text-xs text-muted">
              גודל מנה (גרם)
              <NumericInput
                decimals={2}
                value={form.servingGrams}
                onChange={(next) => {
                  const grams = parsePositiveDecimal(next)
                  if (picked && grams != null && !isMealForm) {
                    const macros = macrosFromPer100g(picked.per100g, grams)
                    setForm((p) => ({
                      ...p,
                      servingGrams: next,
                      calories: String(macros.calories),
                      protein: String(macros.protein),
                      carbs: String(macros.carbs),
                      fats: String(macros.fats),
                    }))
                    return
                  }
                  setForm((p) => ({ ...p, servingGrams: next }))
                }}
              />
            </label>
          ) : null}

          {!isMealForm && picked ? (
            <PortionPills
              value={
                parsePositiveDecimal(form.servingGrams) != null &&
                picked.servingGrams > 0
                  ? roundTo(
                      (parsePositiveDecimal(form.servingGrams) ?? 0) /
                        picked.servingGrams,
                      2,
                    )
                  : 1
              }
              onChange={(servings) => applyCatalogItem(picked, servings)}
            />
          ) : null}

          {!isMealForm || entryMode === 'manual' ? (
            <MacroFields form={form} setForm={setForm} />
          ) : namedLines.length > 0 ? (
            <p className="rounded-xl bg-cyan-50 px-3 py-2 text-xs font-medium text-cyan-900">
              סה״כ: {catalogMacroPreview(lineTotals)}
              {lineTotals.grams > 0
                ? ` · ${formatNiceNumber(lineTotals.grams, 0)}ג׳`
                : ''}
            </p>
          ) : null}

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

      <QuickPortionModal
        item={portionItem}
        onClose={() => setPortionItem(null)}
        onAdd={(entry) => {
          addFood(entry)
          showToast('נוסף בהצלחה ליומן המזון')
        }}
      />
    </>
  )
}
