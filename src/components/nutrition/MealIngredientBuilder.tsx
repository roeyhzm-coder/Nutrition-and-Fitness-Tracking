import { X } from 'lucide-react'
import {
  applyLineQuantity,
  catalogMacroPreview,
  catalogToLine,
  scaleIngredientLine,
  type CatalogFood,
  type MealIngredientLine,
} from '../../lib/foodCatalog'
import { formatNiceNumber } from '../../lib/numericInput'
import { uid } from '../../lib/types'
import { CatalogPicker } from './CatalogPicker'
import { UniversalQuantitySelector } from './UniversalQuantitySelector'

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

  function removeLine(id: string) {
    onChange(lines.filter((line) => line.id !== id))
  }

  function addItem(item: CatalogFood) {
    onChange([...lines, catalogToLine(item, uid())])
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <label className="block text-xs text-muted">
          הוסף רכיב מהמאגר
          <div className="mt-1">
            <CatalogPicker
              items={items}
              placeholder="קוטג, לחם, במבה, טונה, ביצים…"
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
            return (
              <li
                key={line.id}
                className="rounded-xl border border-slate-200 bg-white px-2 py-1.5"
              >
                <div className="flex min-h-11 items-start gap-1">
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
                        ? ` · ${formatNiceNumber(scaled.grams, 2)}ג׳`
                        : ''}
                    </p>
                    <div className="mt-1">
                      <UniversalQuantitySelector
                        compact
                        units={line.serving_units}
                        quantity={line.amount}
                        unitId={line.unitId}
                        onChange={({ quantity, unitId }) =>
                          updateLine(
                            line.id,
                            applyLineQuantity(line, quantity, unitId),
                          )
                        }
                      />
                    </div>
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
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}