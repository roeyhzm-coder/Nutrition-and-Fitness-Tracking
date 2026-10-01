import { PORTION_PRESETS } from '../../lib/foodUnits'
import { formatNiceNumber, roundTo } from '../../lib/numericInput'

type PortionPillsProps = {
  value: number | null
  onChange: (amount: number) => void
  unit?: 'serving' | 'grams'
  servingGrams?: number
}

export function PortionPills({
  value,
  onChange,
  unit = 'serving',
  servingGrams = 100,
}: PortionPillsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PORTION_PRESETS.map((preset) => {
        const amount =
          unit === 'grams' ? roundTo(preset * servingGrams, 2) : preset
        const active =
          value != null && Math.abs(value - amount) < 0.001
        return (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(amount)}
            className={[
              'min-h-8 rounded-full px-3 text-xs font-semibold tabular-nums transition',
              active
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-100 text-muted hover:text-text',
            ].join(' ')}
          >
            {unit === 'serving'
              ? `${formatNiceNumber(preset)}×`
              : `${formatNiceNumber(amount)}ג׳`}
          </button>
        )
      })}
    </div>
  )
}
