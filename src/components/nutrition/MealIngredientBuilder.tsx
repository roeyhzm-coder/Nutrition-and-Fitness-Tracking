import { Plus, X } from 'lucide-react'
import {
  catalogMacroPreview,
  catalogToLine,
  emptyIngredientLine,
  scaleIngredientLine,
  type CatalogFood,
  type MealIngredientLine,
} from '../../lib/foodCatalog'
import { formatNiceNumber, parsePositiveDecimal } from '../../lib/numericInput'
import { uid } from '../../lib/types'
import { NumericInput } from '../ui/NumericInput'
import { CatalogPicker } from './CatalogPicker'
import { PortionPills } from './PortionPills'

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
  function updateLine(id: string, patch: Partial<MealIngredientLine>) {
    onChange(lines.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  function removeLine(id: string) {
    const next = lines.filter((line) => line.id !== id)
    onChange(next.length ? next : [emptyIngredientLine(uid())])
  }

  function addLine() {
    if (lines.some((line) => !line.name.trim())) return
    onChange([...lines, emptyIngredientLine(uid())])
  }

  function pickForLine(line: MealIngredientLine, item: CatalogFood) {
    onChange(lines.map((row) => (row.id === line.id ? catalogToLine(item, line.id) : row)))
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted">מרכיבים</p>
      {lines.map((line) => {
        const scaled = scaleIngredientLine(line)
        return (
          <div
            key={line.id}
            className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2"
          >
            {line.name.trim() ? (
              <>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text">{line.name}</p>
                    <p className="text-[11px] text-muted">
                      {catalogMacroPreview(scaled)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="הסר רכיב"
                    onClick={() => removeLine(line.id)}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-rose-50 hover:text-danger"
                  >
                    <X className="size-3.5" strokeWidth={1.75} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <NumericInput
                    decimals={2}
                    value={line.amount}
                    onChange={(next) => updateLine(line.id, { amount: next })}
                    className="field min-h-9 flex-1 py-1.5"
                    aria-label="כמות"
                  />
                  <div className="grid w-28 shrink-0 grid-cols-2 gap-0.5 rounded-xl bg-white p-0.5 ring-1 ring-slate-200">
                    {(
                      [
                        ['serving', line.servingLabel],
                        ['grams', 'גרם'],
                      ] as const
                    ).map(([unit, label]) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => {
                          if (line.unit === unit) return
                          const amount = parsePositiveDecimal(line.amount)
                          if (amount != null) {
                            const nextAmount =
                              unit === 'grams'
                                ? formatNiceNumber(amount * line.servingGrams)
                                : formatNiceNumber(amount / line.servingGrams)
                            updateLine(line.id, { unit, amount: nextAmount })
                          } else {
                            updateLine(line.id, { unit })
                          }
                        }}
                        className={[
                          'min-h-8 rounded-lg px-1 text-[11px] font-semibold',
                          line.unit === unit
                            ? 'bg-cyan-600 text-white'
                            : 'text-muted',
                        ].join(' ')}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <PortionPills
                  value={parsePositiveDecimal(line.amount)}
                  unit={line.unit}
                  servingGrams={line.servingGrams}
                  onChange={(amount) =>
                    updateLine(line.id, { amount: formatNiceNumber(amount) })
                  }
                />
              </>
            ) : (
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <CatalogPicker
                    items={catalog}
                    placeholder="חיפוש רכיב במאגר…"
                    onSelect={(item) => pickForLine(line, item)}
                  />
                </div>
                {lines.length > 1 ? (
                  <button
                    type="button"
                    aria-label="הסר רכיב"
                    onClick={() => removeLine(line.id)}
                    className="mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-rose-50 hover:text-danger"
                  >
                    <X className="size-3.5" strokeWidth={1.75} />
                  </button>
                ) : null}
              </div>
            )}
          </div>
        )
      })}
      <button
        type="button"
        onClick={addLine}
        className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-muted hover:border-cyan-400 hover:text-cyan-700"
      >
        <Plus className="size-3.5" strokeWidth={1.75} />
        הוסף רכיב
      </button>
    </div>
  )
}
