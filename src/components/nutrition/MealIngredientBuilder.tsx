import { Minus, Plus, X } from 'lucide-react'
import {
  applyManualGrams,
  applyServingPreset,
  catalogMacroPreview,
  catalogToLine,
  scaleIngredientLine,
  type CatalogFood,
  type MealIngredientLine,
} from '../../lib/foodCatalog'
import { formatNiceNumber, parsePositiveDecimal, roundTo } from '../../lib/numericInput'
import { GRAMS_PRESET_ID, matchPreset } from '../../lib/servingPresets'
import { uid } from '../../lib/types'
import { NumericInput } from '../ui/NumericInput'
import { CatalogPicker } from './CatalogPicker'
import { ServingPresetPicker } from './ServingPresetPicker'

type MealIngredientBuilderProps = {
  catalog: CatalogFood[]
  lines: MealIngredientLine[]
  onChange: (lines: MealIngredientLine[]) => void
}

export function MealIngredientBuilder({
  catalog,
  lines,
  onChange,
}: MealIngredientBuilderProps) {
  const items = catalog.filter((item) => item.kind === 'item')
  const recipes = catalog.filter((item) => item.kind === 'meal')

  function updateLine(id: string, next: MealIngredientLine) {
    onChange(lines.map((line) => (line.id === id ? next : line)))
  }

  function patchAmount(line: MealIngredientLine, amount: string) {
    if (line.unit === 'grams') {
      updateLine(line.id, applyManualGrams(line, amount))
      return
    }
    updateLine(line.id, { ...line, amount })
  }

  function removeLine(id: string) {
    onChange(lines.filter((line) => line.id !== id))
  }

  function addItem(item: CatalogFood) {
    onChange([...lines, catalogToLine(item, uid())])
  }

  function bump(line: MealIngredientLine, delta: number) {
    const current = parsePositiveDecimal(line.amount) ?? 0
    const next = roundTo(Math.max(0, current + delta), 2)
    patchAmount(line, next > 0 ? formatNiceNumber(next) : '')
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <label className="block text-xs text-muted">
          הוסף רכיב מהמאגר
          <div className="mt-1">
            <CatalogPicker
              items={items}
              placeholder="קוטג, לחם, ביצים, שיבולת, שמן זית…"
              onSelect={addItem}
            />
          </div>
        </label>
        <label className="block text-xs text-muted">
          הוסף מתכון / ארוחה שמורה
          <div className="mt-1">
            <CatalogPicker
              items={recipes}
              placeholder="חיפוש חביתה, שייק או ארוחה קבועה…"
              onSelect={addItem}
            />
          </div>
        </label>
      </div>

      {lines.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-muted">
          הוסף כמה רכיבים או מתכונים — המאקרו יתעדכן מיד.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {lines.map((line) => {
            const scaled = scaleIngredientLine(line)
            const activeId =
              line.presetId ??
              matchPreset(line.servingPresets, line.servingGrams, line.unit)
            const step = line.unit === 'grams' ? 10 : 0.5
            return (
              <li
                key={line.id}
                className="rounded-xl border border-slate-200 bg-white px-2 py-1.5"
              >
                <div className="flex min-h-11 items-center gap-1">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-text">
                      {line.kind === 'meal' ? (
                        <span className="me-1 rounded-md bg-cyan-50 px-1 py-0.5 text-[10px] font-bold text-cyan-800">
                          מתכון
                        </span>
                      ) : null}
                      {line.name}
                    </p>
                    <p className="truncate text-[10px] text-muted">
                      {catalogMacroPreview(scaled)}
                      {scaled.grams > 0
                        ? ` · ${formatNiceNumber(scaled.grams, 1)}ג׳`
                        : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="הפחת כמות"
                    onClick={() => bump(line, -step)}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-slate-100"
                  >
                    <Minus className="size-3.5" strokeWidth={2} />
                  </button>
                  <NumericInput
                    decimals={2}
                    value={line.amount}
                    onChange={(next) => patchAmount(line, next)}
                    className="field h-8 w-16 shrink-0 px-1.5 py-0 text-center text-xs"
                    aria-label="כמות"
                  />
                  <button
                    type="button"
                    aria-label="הוסף כמות"
                    onClick={() => bump(line, step)}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-slate-100"
                  >
                    <Plus className="size-3.5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    aria-label="הסר רכיב"
                    onClick={() => removeLine(line.id)}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-rose-50 hover:text-danger"
                  >
                    <X className="size-3.5" strokeWidth={1.75} />
                  </button>
                </div>
                <div className="mt-1.5">
                  <ServingPresetPicker
                    presets={line.servingPresets}
                    activeId={
                      line.unit === 'grams' ? GRAMS_PRESET_ID : activeId
                    }
                    onSelectPreset={(preset) =>
                      updateLine(line.id, applyServingPreset(line, preset))
                    }
                    onSelectGrams={() => {
                      const grams =
                        parsePositiveDecimal(line.amount) != null &&
                        line.unit === 'grams'
                          ? line.amount
                          : formatNiceNumber(
                              (parsePositiveDecimal(line.amount) ?? 1) *
                                line.servingGrams,
                            )
                      updateLine(line.id, applyManualGrams(line, grams))
                    }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}