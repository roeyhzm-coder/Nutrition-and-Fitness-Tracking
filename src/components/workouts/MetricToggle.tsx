import { METRIC_LABEL } from '../../lib/exerciseDefaults'
import type { ExerciseMetric } from '../../lib/types'

const OPTIONS: ExerciseMetric[] = ['reps', 'seconds']

type MetricToggleProps = {
  value: ExerciseMetric
  onChange: (metric: ExerciseMetric) => void
  className?: string
}

/** Micro pill switch between counting reps and seconds. */
export function MetricToggle({ value, onChange, className = '' }: MetricToggleProps) {
  return (
    <span
      role="radiogroup"
      aria-label="יחידת מדידה"
      className={`inline-flex items-center rounded-full bg-slate-100 p-0.5 ring-1 ring-slate-200/70 ${className}`}
    >
      {OPTIONS.map((option) => {
        const active = option === value
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              if (!active) onChange(option)
            }}
            className={[
              'whitespace-nowrap rounded-full px-1 py-0.5 text-[10px] leading-4 transition-colors sm:px-1.5',
              active
                ? 'bg-white font-semibold text-text shadow-sm'
                : 'font-medium text-muted hover:text-text',
            ].join(' ')}
          >
            {METRIC_LABEL[option]}
          </button>
        )
      })}
    </span>
  )
}
