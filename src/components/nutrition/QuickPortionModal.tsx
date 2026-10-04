import { useEffect, useMemo, useState } from 'react'
import {
  formatNiceNumber,
  parsePositiveDecimal,
} from '../../lib/numericInput'
import { savedItemServingGrams } from '../../lib/foodUnits'
import {
  defaultServingUnit,
  effectiveGrams,
  GRAMS_UNIT_ID,
  resolveServingUnits,
} from '../../lib/servingUnits'
import type { FoodLogEntry, SavedMeal } from '../../lib/types'
import { macrosFromPer100g } from '../../lib/foodCatalog'
import { Button } from '../ui/button'
import { Modal } from '../ui/Modal'
import { UniversalQuantitySelector } from './UniversalQuantitySelector'

type QuickPortionModalProps = {
  item: SavedMeal | null
  onClose: () => void
  onAdd: (entry: Omit<FoodLogEntry, 'id' | 'loggedAt'>) => void
}

export function QuickPortionModal({
  item,
  onClose,
  onAdd,
}: QuickPortionModalProps) {
  const units = useMemo(() => {
    if (!item) return []
    return resolveServingUnits({
      name: item.name,
      servingGrams: savedItemServingGrams(item),
      servingLabel: 'מנה',
      family: item.kind === 'meal' ? 'unit' : undefined,
      serving_units: item.serving_units,
    })
  }, [item])

  const [quantity, setQuantity] = useState('1')
  const [unitId, setUnitId] = useState(GRAMS_UNIT_ID)

  useEffect(() => {
    if (!item) return
    const def = defaultServingUnit(units)
    setQuantity('1')
    setUnitId(def?.id ?? GRAMS_UNIT_ID)
  }, [item, units])

  const baseGrams = item ? savedItemServingGrams(item) : 100
  const parsed = parsePositiveDecimal(quantity)
  const grams = parsed != null ? effectiveGrams(parsed, unitId, units) : 0
  const factor = baseGrams > 0 ? grams / baseGrams : 0
  const scaled =
    item && grams > 0
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

  const preview = useMemo(() => {
    if (!scaled) return null
    return [
      `${formatNiceNumber(scaled.calories, 0)} קק״ל`,
      `ח ${formatNiceNumber(scaled.protein)}`,
      `פ ${formatNiceNumber(scaled.carbs)}`,
      `ש ${formatNiceNumber(scaled.fats)}`,
    ].join(' · ')
  }, [scaled])

  if (!item) return null

  return (
    <Modal open title={`כמות · ${item.name}`} onClose={onClose}>
      <div className="space-y-3">
        <UniversalQuantitySelector
          units={units}
          quantity={quantity}
          unitId={unitId}
          onChange={(next) => {
            setQuantity(next.quantity)
            setUnitId(next.unitId)
          }}
        />

        <p className="text-[11px] text-muted">
          מנה שמורה ≈ {formatNiceNumber(baseGrams)} גרם
          {factor > 0 ? ` · ×${formatNiceNumber(factor, 3)}` : ''}
        </p>
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium tabular-nums text-text">
          {preview ?? 'הזן כמות תקינה'}
        </p>

        <Button
          className="w-full"
          variant="accent"
          disabled={scaled == null}
          onClick={() => {
            if (!scaled) return
            onAdd(scaled)
            onClose()
          }}
        >
          + הוסף ליומן
        </Button>
      </div>
    </Modal>
  )
}