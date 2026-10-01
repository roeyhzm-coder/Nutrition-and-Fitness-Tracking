import { useEffect, useMemo, useState } from 'react'
import {
  formatNiceNumber,
  parsePositiveDecimal,
  roundTo,
} from '../../lib/numericInput'
import {
  PORTION_PRESETS,
  savedItemServingGrams,
  type FoodAmountUnit,
} from '../../lib/foodUnits'
import type { FoodLogEntry, SavedMeal } from '../../lib/types'
import { Button } from '../ui/button'
import { Modal } from '../ui/Modal'
import { NumericInput } from '../ui/NumericInput'

type QuickPortionModalProps = {
  item: SavedMeal | null
  onClose: () => void
  onAdd: (entry: Omit<FoodLogEntry, 'id' | 'loggedAt'>) => void
}

function scaleSavedMeal(
  item: SavedMeal,
  amount: number,
  unit: FoodAmountUnit,
): Omit<FoodLogEntry, 'id' | 'loggedAt'> {
  const baseGrams = savedItemServingGrams(item)
  const factor = unit === 'grams' ? amount / baseGrams : amount
  const grams = unit === 'grams' ? amount : roundTo(amount * baseGrams, 2)
  return {
    name: item.name,
    grams,
    calories: Math.round(item.calories * factor),
    protein: roundTo(item.protein * factor, 2),
    carbs: roundTo(item.carbs * factor, 2),
    fats: roundTo(item.fats * factor, 2),
    source: 'saved-meal',
  }
}

export function QuickPortionModal({
  item,
  onClose,
  onAdd,
}: QuickPortionModalProps) {
  const [unit, setUnit] = useState<FoodAmountUnit>('serving')
  const [amount, setAmount] = useState('1')

  useEffect(() => {
    if (!item) return
    setUnit('serving')
    setAmount('1')
  }, [item])

  const baseGrams = item ? savedItemServingGrams(item) : 100
  const parsed = parsePositiveDecimal(amount)
  const scaled =
    item && parsed != null ? scaleSavedMeal(item, parsed, unit) : null

  const preview = useMemo(() => {
    if (!scaled) return null
    return [
      `${formatNiceNumber(scaled.calories, 0)} קק״ל`,
      `ח ${formatNiceNumber(scaled.protein)}`,
      `פ ${formatNiceNumber(scaled.carbs)}`,
      `ש ${formatNiceNumber(scaled.fats)}`,
    ].join(' · ')
  }, [scaled])

  function switchUnit(next: FoodAmountUnit) {
    if (next === unit) return
    const current = parsePositiveDecimal(amount)
    if (current != null) {
      if (next === 'grams') {
        setAmount(formatNiceNumber(current * baseGrams))
      } else {
        setAmount(formatNiceNumber(current / baseGrams))
      }
    } else {
      setAmount(next === 'grams' ? formatNiceNumber(baseGrams) : '1')
    }
    setUnit(next)
  }

  if (!item) return null

  return (
    <Modal open title={`כמות · ${item.name}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => switchUnit('serving')}
            className={[
              'min-h-10 rounded-lg px-2 text-xs font-semibold transition',
              unit === 'serving'
                ? 'bg-white text-text shadow-sm'
                : 'text-muted hover:text-text',
            ].join(' ')}
          >
            יחידה / מנה
          </button>
          <button
            type="button"
            onClick={() => switchUnit('grams')}
            className={[
              'min-h-10 rounded-lg px-2 text-xs font-semibold transition',
              unit === 'grams'
                ? 'bg-white text-text shadow-sm'
                : 'text-muted hover:text-text',
            ].join(' ')}
          >
            גרם
          </button>
        </div>

        <label className="block text-xs text-muted">
          {unit === 'grams' ? 'גרם' : 'כמות (יחידות / מנות)'}
          <NumericInput
            value={amount}
            onChange={setAmount}
            placeholder={unit === 'grams' ? '100' : '1'}
          />
        </label>

        <div className="flex flex-wrap gap-1.5">
          {PORTION_PRESETS.map((preset) => {
            const label =
              unit === 'grams'
                ? formatNiceNumber(roundTo(preset * baseGrams, 2))
                : formatNiceNumber(preset)
            const active =
              parsed != null &&
              Math.abs(
                parsed -
                  (unit === 'grams' ? preset * baseGrams : preset),
              ) < 0.001
            return (
              <button
                key={preset}
                type="button"
                onClick={() =>
                  setAmount(
                    unit === 'grams'
                      ? formatNiceNumber(roundTo(preset * baseGrams, 2))
                      : formatNiceNumber(preset),
                  )
                }
                className={[
                  'min-h-9 rounded-full px-3 text-xs font-semibold tabular-nums transition',
                  active
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-100 text-muted hover:text-text',
                ].join(' ')}
              >
                {label}
                {unit === 'serving' ? '×' : 'ג׳'}
              </button>
            )
          })}
        </div>

        <p className="text-[11px] text-muted">
          מנה שמורה ≈ {formatNiceNumber(baseGrams)} גרם
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
