import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import type { FoodLogEntry } from '../../lib/types'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Modal } from '../ui/Modal'

type FoodLogListProps = {
  entries: FoodLogEntry[]
  compact?: boolean
}

type EditForm = {
  name: string
  quantity: string
  calories: string
  protein: string
  carbs: string
  fats: string
}

const MACRO_FIELDS = [
  ['calories', 'קלוריות'],
  ['protein', 'חלבון'],
  ['carbs', 'פחמימות'],
  ['fats', 'שומנים'],
] as const

const inputClass =
  'mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary'

const SOURCE_LABELS: Record<FoodLogEntry['source'], string> = {
  recipe: 'מתכון',
  openfoodfacts: 'Open Food Facts',
  'saved-meal': 'ארוחה קבועה',
  manual: 'ידני',
}

/** Entries logged per-gram get a grams field; the rest scale by servings. */
function isGramBased(entry: FoodLogEntry) {
  return entry.grams > 1
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

function toNum(raw: string) {
  const n = Number(raw.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function initialForm(entry: FoodLogEntry): EditForm {
  return {
    name: entry.name,
    quantity: String(isGramBased(entry) ? entry.grams : 1),
    calories: String(entry.calories),
    protein: String(entry.protein),
    carbs: String(entry.carbs),
    fats: String(entry.fats),
  }
}

function EditFoodModal({
  entry,
  onClose,
}: {
  entry: FoodLogEntry
  onClose: () => void
}) {
  const { updateFood } = useAppData()
  const [form, setForm] = useState<EditForm>(() => initialForm(entry))
  const gramBased = isGramBased(entry)
  const baseQty = gramBased ? entry.grams : 1

  function changeQuantity(raw: string) {
    const qty = toNum(raw)
    const factor = qty / baseQty
    setForm((p) => ({
      ...p,
      quantity: raw,
      ...(qty > 0
        ? {
            calories: String(Math.round(entry.calories * factor)),
            protein: String(round1(entry.protein * factor)),
            carbs: String(round1(entry.carbs * factor)),
            fats: String(round1(entry.fats * factor)),
          }
        : {}),
    }))
  }

  return (
    <Modal open title="עריכת רשומה ביומן" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          const name = form.name.trim()
          if (!name) return
          const qty = toNum(form.quantity)
          updateFood(entry.id, {
            name,
            grams: gramBased && qty > 0 ? qty : entry.grams,
            calories: Math.round(toNum(form.calories)),
            protein: round1(toNum(form.protein)),
            carbs: round1(toNum(form.carbs)),
            fats: round1(toNum(form.fats)),
          })
          onClose()
        }}
      >
        <label className="block text-xs text-muted">
          שם
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className={inputClass}
            required
          />
        </label>
        <label className="block text-xs text-muted">
          {gramBased ? 'כמות (גרם)' : 'מספר מנות'}
          <input
            inputMode="decimal"
            value={form.quantity}
            onChange={(e) => changeQuantity(e.target.value)}
            className={inputClass}
          />
          <span className="mt-1 block text-[10px]">
            שינוי הכמות מחשב מחדש את המאקרו באופן יחסי
          </span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {MACRO_FIELDS.map(([key, label]) => (
            <label key={key} className="block text-xs text-muted">
              {label}
              <input
                inputMode="decimal"
                value={form[key]}
                onChange={(e) =>
                  setForm((p) => ({ ...p, [key]: e.target.value }))
                }
                className={inputClass}
              />
            </label>
          ))}
        </div>
        <Button type="submit" className="w-full" variant="accent">
          שמור שינויים
        </Button>
      </form>
    </Modal>
  )
}

export function FoodLogList({ entries, compact }: FoodLogListProps) {
  const { deleteFood } = useAppData()
  const [editing, setEditing] = useState<FoodLogEntry | null>(null)

  if (entries.length === 0) {
    return <p className="text-sm text-muted">עדיין לא נרשמו מאכלים היום.</p>
  }

  return (
    <>
      <ul className={compact ? 'space-y-1.5' : 'space-y-2'}>
        {entries.map((f) => (
          <li
            key={f.id}
            className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-text">{f.name}</p>
              <p className="truncate text-xs text-muted">
                {compact
                  ? `ח ${f.protein} · פ ${f.carbs} · ש ${f.fats}`
                  : `${SOURCE_LABELS[f.source]}${isGramBased(f) ? ` · ${f.grams}ג׳` : ''}`}
              </p>
            </div>
            <div className="shrink-0 text-left text-xs text-muted">
              <p className="font-semibold text-text">{f.calories} קק״ל</p>
              {compact ? null : (
                <p>
                  ח {f.protein} · פ {f.carbs} · ש {f.fats}
                </p>
              )}
            </div>
            <IconButton
              label={`ערוך ${f.name}`}
              tone="accent"
              onClick={() => setEditing(f)}
            >
              <Pencil className="size-3.5" strokeWidth={1.75} />
            </IconButton>
            <IconButton
              label={`מחק ${f.name}`}
              tone="danger"
              onClick={() => {
                if (window.confirm(`למחוק את "${f.name}" מהיומן?`)) {
                  deleteFood(f.id)
                }
              }}
            >
              <Trash2 className="size-3.5" strokeWidth={1.75} />
            </IconButton>
          </li>
        ))}
      </ul>
      {editing ? (
        <EditFoodModal
          key={editing.id}
          entry={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  )
}
