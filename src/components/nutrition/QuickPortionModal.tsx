import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import {
  formatNiceNumber,
  parsePositiveDecimal,
} from '../../lib/numericInput'
import { savedItemServingGrams } from '../../lib/foodUnits'
import {
  applyLineQuantity,
  catalogMacroPreview,
  formatIngredientNotes,
  macrosFromPer100g,
  mealComponentsToLines,
  scaleIngredientLine,
  scaleLineQuantity,
  sumIngredientLines,
  type MealIngredientLine,
} from '../../lib/foodCatalog'
import {
  defaultServingUnit,
  effectiveGrams,
  GRAMS_UNIT_ID,
  resolveServingUnits,
} from '../../lib/servingUnits'
import type { FoodLogEntry, SavedMeal, ServingUnit } from '../../lib/types'
import { uid } from '../../lib/types'
import { Button } from '../ui/button'
import { Modal } from '../ui/Modal'
import { UniversalQuantitySelector } from './UniversalQuantitySelector'

type LogMode = 'combined' | 'split'

type QuickPortionModalProps = {
  item: SavedMeal | null
  onClose: () => void
  onAdd: (entries: Array<Omit<FoodLogEntry, 'id' | 'loggedAt'>>) => void
}

function withFreshIds(lines: MealIngredientLine[]): MealIngredientLine[] {
  return lines.map((line) => ({ ...line, id: uid() }))
}

function preferredMealUnit(
  units: ServingUnit[],
  servingGrams: number,
): ServingUnit | undefined {
  const match = units.find(
    (unit) =>
      unit.grams === servingGrams &&
      unit.id !== GRAMS_UNIT_ID &&
      unit.id !== 'fallback-gram',
  )
  return match ?? defaultServingUnit(units)
}

function lineToLogEntry(
  line: MealIngredientLine,
): Omit<FoodLogEntry, 'id' | 'loggedAt'> | null {
  const scaled = scaleIngredientLine(line)
  if (!line.name.trim() || scaled.grams <= 0) return null
  const amount = line.amount.trim() || '1'
  const qty =
    line.unit === 'grams'
      ? `${amount} גרם`
      : `${amount} ${line.servingLabel}`
  return {
    name: line.name,
    grams: scaled.grams,
    calories: scaled.calories,
    protein: scaled.protein,
    carbs: scaled.carbs,
    fats: scaled.fats,
    source: 'saved-meal',
    notes: qty,
  }
}

export function QuickPortionModal({
  item,
  onClose,
  onAdd,
}: QuickPortionModalProps) {
  if (!item) return null
  return (
    <QuickPortionForm
      key={item.id}
      item={item}
      onClose={onClose}
      onAdd={onAdd}
    />
  )
}

function QuickPortionForm({
  item,
  onClose,
  onAdd,
}: {
  item: SavedMeal
  onClose: () => void
  onAdd: (entries: Array<Omit<FoodLogEntry, 'id' | 'loggedAt'>>) => void
}) {
  const baseGrams = savedItemServingGrams(item)
  const units = useMemo(
    () =>
      resolveServingUnits({
        name: item.name,
        servingGrams: baseGrams,
        servingLabel: 'מנה',
        family: item.kind === 'meal' ? 'unit' : undefined,
        serving_units: item.serving_units,
      }),
    [item.name, item.kind, item.serving_units, baseGrams],
  )
  const defaultUnit = preferredMealUnit(units, baseGrams)
  const [quantity, setQuantity] = useState('1')
  const [unitId, setUnitId] = useState(defaultUnit?.id ?? GRAMS_UNIT_ID)
  const [lines, setLines] = useState(() =>
    withFreshIds(mealComponentsToLines(item.components)),
  )
  const [mealFactor, setMealFactor] = useState(1)
  const [logMode, setLogMode] = useState<LogMode>('combined')

  const parsed = parsePositiveDecimal(quantity)
  const grams = parsed != null ? effectiveGrams(parsed, unitId, units) : 0
  const factor = baseGrams > 0 ? grams / baseGrams : 0
  const templateHasComponents = (item.components?.length ?? 0) > 0
  const lineTotals = useMemo(() => sumIngredientLines(lines), [lines])
  const scaledWhole =
    grams > 0
      ? {
          name: item.name,
          grams,
          ...macrosFromPer100g(
            {
              calories: (item.calories * 100) / baseGrams,
              protein: (item.protein * 100) / baseGrams,
              carbs: (item.carbs * 100) / baseGrams,
              fats: (item.fats * 100) / baseGrams,
            },
            grams,
          ),
          source: 'saved-meal' as const,
        }
      : null

  const previewMacros = templateHasComponents
    ? lineTotals
    : scaledWhole
      ? {
          calories: scaledWhole.calories,
          protein: scaledWhole.protein,
          carbs: scaledWhole.carbs,
          fats: scaledWhole.fats,
          grams: scaledWhole.grams,
        }
      : null

  const canSubmit = templateHasComponents
    ? lineTotals.grams > 0 || lineTotals.calories > 0
    : previewMacros != null &&
      (previewMacros.grams > 0 || previewMacros.calories > 0)

  const preview = previewMacros
    ? [
        `${formatNiceNumber(previewMacros.calories, 0)} קק״ל`,
        `ח ${formatNiceNumber(previewMacros.protein)}`,
        `פ ${formatNiceNumber(previewMacros.carbs)}`,
        `ש ${formatNiceNumber(previewMacros.fats)}`,
      ].join(' · ')
    : 'הזן כמות תקינה'

  function applyMealQuantity(
    nextQuantity: string,
    nextUnitId: string,
    nextGrams: number,
  ) {
    const nextFactor = baseGrams > 0 ? nextGrams / baseGrams : 0
    if (lines.length && mealFactor > 0 && nextFactor > 0) {
      const ratio = nextFactor / mealFactor
      if (ratio !== 1) {
        setLines((prev) => prev.map((line) => scaleLineQuantity(line, ratio)))
      }
    }
    if (nextFactor > 0) setMealFactor(nextFactor)
    setQuantity(nextQuantity)
    setUnitId(nextUnitId)
  }

  function submit() {
    if (!canSubmit) return
    if (templateHasComponents) {
      const active = lines.filter((line) => line.name.trim())
      if (logMode === 'split') {
        const entries = active
          .map(lineToLogEntry)
          .filter((entry): entry is NonNullable<typeof entry> => entry != null)
        if (!entries.length) return
        onAdd(entries)
        onClose()
        return
      }
      onAdd([
        {
          name: item.name,
          grams: lineTotals.grams,
          calories: lineTotals.calories,
          protein: lineTotals.protein,
          carbs: lineTotals.carbs,
          fats: lineTotals.fats,
          source: 'saved-meal',
          notes: formatIngredientNotes(active) || undefined,
        },
      ])
      onClose()
      return
    }
    if (!scaledWhole) return
    onAdd([scaledWhole])
    onClose()
  }

  return (
    <Modal
      open
      wide={templateHasComponents}
      title={`כמות · ${item.name}`}
      onClose={onClose}
    >
      <div className="space-y-3">
        <UniversalQuantitySelector
          units={units}
          quantity={quantity}
          unitId={unitId}
          onChange={(next) =>
            applyMealQuantity(next.quantity, next.unitId, next.grams)
          }
        />

        <p className="text-[11px] text-muted">
          מנה שמורה ≈ {formatNiceNumber(baseGrams)} גרם
          {factor > 0 ? ` · ×${formatNiceNumber(factor, 3)}` : ''}
        </p>
        {!templateHasComponents && item.notes?.trim() ? (
          <p className="text-[11px] text-muted">פירוט שמור: {item.notes}</p>
        ) : null}

        {templateHasComponents ? (
          <details open className="space-y-2 rounded-xl border border-slate-200 bg-white p-2">
            <summary className="cursor-pointer text-xs font-semibold text-text">
              פירוט והתאמת מצרכים
            </summary>
            <p className="-mt-1 text-[11px] text-muted">
              השינויים חלים רק על הרישום להיום. התבנית ב״הקבועים שלי״ לא
              משתנה.
            </p>
            {lines.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-muted">
                כל המצרכים הוסרו מהרישום הנוכחי. התבנית השמורה לא השתנתה.
              </p>
            ) : null}
            <ul className="space-y-1">
              {lines.map((line) => {
                const scaled = scaleIngredientLine(line)
                return (
                  <li
                    key={line.id}
                    className="flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-text">
                        {line.name}
                      </p>
                      <p className="truncate text-[10px] text-muted">
                        {catalogMacroPreview(scaled)}
                        {scaled.grams > 0
                          ? ` · ${formatNiceNumber(scaled.grams, 2)}ג׳`
                          : ''}
                      </p>
                    </div>
                    <div className="w-[10.5rem] shrink-0">
                      <UniversalQuantitySelector
                        compact
                        units={line.serving_units}
                        quantity={line.amount}
                        unitId={line.unitId}
                        onChange={({ quantity: qty, unitId: nextUnit }) =>
                          setLines((prev) =>
                            prev.map((row) =>
                              row.id === line.id
                                ? applyLineQuantity(row, qty, nextUnit)
                                : row,
                            ),
                          )
                        }
                        ariaLabel={`כמות ${line.name}`}
                      />
                    </div>
                    <button
                      type="button"
                      aria-label={`הסר ${line.name}`}
                      title="הסר מהרישום הנוכחי"
                      onClick={() =>
                        setLines((prev) =>
                          prev.filter((row) => row.id !== line.id),
                        )
                      }
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-rose-50 hover:text-danger"
                    >
                      <X className="size-3.5" strokeWidth={1.75} />
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-50 p-1">
              {(
                [
                  { id: 'combined' as const, label: 'רשום כארוחה אחת מותאמת' },
                  { id: 'split' as const, label: 'רשום כפריטים נפרדים ביומן' },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setLogMode(option.id)}
                  className={[
                    'min-h-9 rounded-lg px-2 text-[11px] font-semibold transition',
                    logMode === option.id
                      ? 'bg-white text-text shadow-sm'
                      : 'text-muted hover:text-text',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </details>
        ) : null}

        <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium tabular-nums text-text">
          {preview}
          {templateHasComponents && logMode === 'split'
            ? ` · ${lines.filter((l) => scaleIngredientLine(l).grams > 0).length} פריטים`
            : ''}
        </p>

        <Button
          className="w-full"
          variant="accent"
          disabled={!canSubmit}
          onClick={submit}
        >
          + הוסף ליומן
        </Button>
      </div>
    </Modal>
  )
}
