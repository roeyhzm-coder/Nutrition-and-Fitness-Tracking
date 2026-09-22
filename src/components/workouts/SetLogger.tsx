import type { Exercise } from '../../lib/types'
import type { SetLog } from '../../lib/types'
import { useState } from 'react'
import { Button } from '../ui/Button'

type SetLoggerProps = {
  exercise: Exercise
  dayId: string
  onLog: (entry: Omit<SetLog, 'id' | 'loggedAt'>) => void
}

export function SetLogger({ exercise, dayId, onLog }: SetLoggerProps) {
  const [weightKg, setWeightKg] = useState('')
  const [reps, setReps] = useState('')
  const [rpe, setRpe] = useState('7')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const w = Number(weightKg)
        const r = Number(reps)
        const pe = Number(rpe)
        if (!Number.isFinite(w) || !Number.isFinite(r) || r <= 0) return
        onLog({
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          dayId,
          weightKg: w,
          reps: r,
          rpe: pe,
        })
        setReps('')
      }}
      className="space-y-3 rounded-xl border border-line bg-card p-3"
    >
      <p className="text-sm font-semibold text-text">
        רישום סט — {exercise.name}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <label className="block text-xs text-muted">
          משקל (ק״ג)
          <input
            inputMode="decimal"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
            required
          />
        </label>
        <label className="block text-xs text-muted">
          חזרות
          <input
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
            required
          />
        </label>
        <label className="block text-xs text-muted">
          RPE
          <input
            inputMode="decimal"
            min={1}
            max={10}
            step={0.5}
            value={rpe}
            onChange={(e) => setRpe(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
            required
          />
        </label>
      </div>
      <Button type="submit" className="w-full" variant="accent">
        שמור סט
      </Button>
    </form>
  )
}
