import {
  convertQuantityKeepingGrams,
  effectiveGrams,
  GRAMS_UNIT_ID,
} from '../../lib/servingUnits'
import {
  formatNiceNumber,
  parsePositiveDecimal,
} from '../../lib/numericInput'
import type { ServingUnit } from '../../lib/types'
import { NumericInput } from '../ui/NumericInput'

export const QUANTITY_DECIMALS = 4

type UniversalQuantitySelectorProps = {
  units: ServingUnit[]
  quantity: string
  unitId: string
  onChange: (next: { quantity: string; unitId: string; grams: number }) => void
  ariaLabel?: string
  compact?: boolean
}

export function UniversalQuantitySelector({
  units,
  quantity,
  unitId,
  onChange,
  ariaLabel = 'כמות',
  compact,
}: UniversalQuantitySelectorProps) {
  const parsed = parsePositiveDecimal(quantity)
  const grams = parsed != null ? effectiveGrams(parsed, unitId, units) : 0

  function emit(nextQuantity: string, nextUnitId: string) {
    const n = parsePositiveDecimal(nextQuantity)
    onChange({
      quantity: nextQuantity,
      unitId: nextUnitId,
      grams: n != null ? effectiveGrams(n, nextUnitId, units) : 0,
    })
  }

  function changeUnit(nextUnitId: string) {
    if (nextUnitId === unitId) return
    const n = parsePositiveDecimal(quantity)
    if (n == null) {
      emit(nextUnitId === GRAMS_UNIT_ID ? '' : '1', nextUnitId)
      return
    }
    const converted = convertQuantityKeepingGrams(n, unitId, nextUnitId, units)
    emit(formatNiceNumber(converted, QUANTITY_DECIMALS), nextUnitId)
  }

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      <div className="flex items-center gap-1.5">
        <NumericInput
          decimals={QUANTITY_DECIMALS}
          value={quantity}
          onChange={(next) => emit(next, unitId)}
          placeholder={unitId === GRAMS_UNIT_ID ? '100' : '1'}
          className={[
            'field min-h-8 px-2 py-1 text-center text-xs tabular-nums',
            compact ? 'w-16' : 'w-20',
          ].join(' ')}
          aria-label={ariaLabel}
        />
        <select
          value={unitId}
          onChange={(e) => changeUnit(e.target.value)}
          aria-label="יחידת מידה"
          className="field min-h-8 min-w-0 flex-1 px-2 py-1 text-[11px] font-semibold"
        >
          <option value={GRAMS_UNIT_ID}>גרמים (g)</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
      </div>
      {grams > 0 && unitId !== GRAMS_UNIT_ID ? (
        <p className="text-[10px] tabular-nums text-muted">
          = {formatNiceNumber(grams, 2)} גרם
        </p>
      ) : null}
    </div>
  )
}
