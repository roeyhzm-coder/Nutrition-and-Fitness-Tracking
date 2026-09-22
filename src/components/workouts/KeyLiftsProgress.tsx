import { KEY_LIFTS } from '../../data/workouts'
import type { SetLog } from '../../lib/types'
import { Card } from '../ui/Card'

type KeyLiftsProgressProps = {
  logs: SetLog[]
}

export function KeyLiftsProgress({ logs }: KeyLiftsProgressProps) {
  return (
    <Card title="עומס מתקדם — Key Lifts">
      <ul className="space-y-3">
        {KEY_LIFTS.map((lift) => {
          const sets = logs.filter((l) => l.exerciseId === lift.id)
          const best = sets.reduce<(typeof sets)[number] | null>((acc, s) => {
            if (!acc) return s
            return s.weightKg > acc.weightKg ||
              (s.weightKg === acc.weightKg && s.reps > acc.reps)
              ? s
              : acc
          }, null)
          const last = sets.at(-1)

          return (
            <li
              key={lift.id}
              className="rounded-xl border border-line bg-surface px-3 py-3"
            >
              <p className="font-semibold text-text">{lift.name}</p>
              <p className="mt-1 text-xs text-muted">{lift.nameEn}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                <span className="text-accent">
                  שיא:{' '}
                  {best
                    ? `${best.weightKg} ק״ג × ${best.reps}`
                    : '—'}
                </span>
                <span className="text-muted">
                  אחרון:{' '}
                  {last
                    ? `${last.weightKg} ק״ג × ${last.reps} (RPE ${last.rpe})`
                    : '—'}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
