import type { Exercise } from '../../lib/types'
import type { SetLog } from '../../lib/types'
import { useState } from 'react'
import { isDurationTrackedExercise } from '../../lib/exerciseDefaults'
import { parseDecimal } from '../../lib/numericInput'
import { Button } from '../ui/button'
import { NumericInput } from '../ui/NumericInput'

type SetLoggerProps = {
  exercise: Exercise
  dayId: string
  onLog: (entry: Omit<SetLog, 'id' | 'loggedAt'>) => void
}

export function SetLogger({ exercise, dayId, onLog }: SetLoggerProps) {
  const [weightKg, setWeightKg] = useState('')
  const [reps, setReps] = useState('')
  const durationSeconds = isDurationTrackedExercise(exercise)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const w = parseDecimal(weightKg)
        const r = parseDecimal(reps)
        if (w == null || r == null || r <= 0) return
        onLog({
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          dayId,
          weightKg: w,
          reps: r,
          rpe: 0,
        })
        setReps('')
      }}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/80"
    >
      <p className="font-display text-base font-bold text-text">
        רישום סט — {exercise.name}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-muted">
          משקל (ק״ג)
          <NumericInput
            value={weightKg}
            onChange={setWeightKg}
            required
          />
        </label>
        <label className="block text-xs text-muted">
          {durationSeconds ? 'שניות' : 'חזרות'}
          <NumericInput
            value={reps}
            onChange={setReps}
            decimals={0}
            required
            placeholder={durationSeconds ? '30' : undefined}
          />
        </label>
      </div>
      <Button type="submit" className="w-full" variant="accent">
        שמור סט
      </Button>
    </form>
  )
}
