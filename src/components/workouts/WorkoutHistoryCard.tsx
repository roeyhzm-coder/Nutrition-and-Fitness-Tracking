import { useState } from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'
import { useWorkoutSession } from '../../context/WorkoutSessionContext'
import { isDurationTrackedExercise } from '../../lib/exerciseDefaults'
import type { LoggedExercise, WorkoutLog } from '../../lib/types'
import { parseLocalDateKey } from '../../lib/types'
import { workoutPerformedOn } from '../../lib/caloriesBurned'
import { Accordion, AccordionContent, AccordionItem } from '../ui/accordion'
import { Card } from '../ui/Card'
import { IconButton } from '../ui/IconButton'

const dateFormat = new Intl.DateTimeFormat('he-IL', {
  weekday: 'long',
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
})
const timeFormat = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' })

function durationMin(log: WorkoutLog) {
  return Math.max(
    1,
    Math.round((new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 60000),
  )
}

function isSecondsExercise(ex: LoggedExercise) {
  return isDurationTrackedExercise({
    name: ex.name,
    targetReps: ex.targetReps,
    metric: ex.metric,
  })
}

/** kg × reps; timed sets (seconds) are not volume. */
function volumeKg(log: WorkoutLog) {
  return log.exercises
    .filter((e) => !isSecondsExercise(e))
    .flatMap((e) => e.sets)
    .reduce((sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0), 0)
}

function LogItem({ log }: { log: WorkoutLog }) {
  const { deleteWorkoutLog } = useWorkoutSession()
  const [open, setOpen] = useState(false)
  const performed = parseLocalDateKey(workoutPerformedOn(log))
  const completed = new Date(log.completedAt)
  const setCount = log.exercises.reduce((n, e) => n + e.sets.length, 0)
  const volume = volumeKg(log)

  return (
    <li className="rounded-2xl border border-slate-200 bg-slate-50">
      <div className="flex items-start gap-1 px-4 py-3">
        <button
          type="button"
          className="min-h-11 min-w-0 flex-1 text-right"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <p className="font-semibold text-text">{log.workoutName}</p>
          <p className="mt-0.5 text-xs text-muted">
            {dateFormat.format(performed)} · {timeFormat.format(completed)} ·{' '}
            {durationMin(log)} דק׳
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {log.exercises.length} תרגילים · {setCount} סטים
            {volume > 0 ? ` · נפח ${Math.round(volume)} ק״ג` : ''}
            {log.estimatedCalories ? ` · ${log.estimatedCalories} קק״ל` : ''}
            {' · '}
            {log.programName}
            {log.blockNumber != null ? ` · בלוק ${log.blockNumber}` : ''}
          </p>
        </button>
        <ChevronDown
          className={`mt-1 size-4 shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.75}
        />
        <IconButton
          label="מחק רשומה"
          tone="danger"
          onClick={() => {
            if (window.confirm('למחוק את רשומת האימון?')) deleteWorkoutLog(log.id)
          }}
        >
          <Trash2 className="size-3.5" strokeWidth={1.75} />
        </IconButton>
      </div>
      {open ? (
        <ul className="space-y-2 border-t border-slate-200 px-4 py-3">
          {log.exercises.map((ex, i) => (
            <li key={`${ex.exerciseId}-${i}`} className="text-xs">
              <p className="font-medium text-text">{ex.name}</p>
              <p className="text-muted">
                {ex.sets
                  .map((s) => {
                    const qty = s.reps ?? '?'
                    return isSecondsExercise(ex)
                      ? `${s.weightKg ?? 0} ק״ג × ${qty} שנ׳`
                      : `${s.weightKg ?? 0} ק״ג × ${qty}`
                  })
                  .join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}

type WorkoutHistoryCardProps = {
  /** Show only the newest N workouts (no way to reach older ones). */
  limit?: number
  /** Show the newest N openly; every older workout sits in a closed accordion. */
  collapseAfter?: number
}

export function WorkoutHistoryCard({ limit, collapseAfter }: WorkoutHistoryCardProps) {
  const { workoutLogs } = useWorkoutSession()
  const [olderOpen, setOlderOpen] = useState(false)
  const sorted = [...workoutLogs].sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  const shown = limit ? sorted.slice(0, limit) : sorted
  const recent = collapseAfter ? shown.slice(0, collapseAfter) : shown
  const older = collapseAfter ? shown.slice(collapseAfter) : []

  return (
    <Card title={`היסטוריית אימונים · ${workoutLogs.length}`}>
      {shown.length === 0 ? (
        <p className="text-sm text-muted">
          עדיין אין אימונים שמורים. התחל אימון מהלוח השבועי כדי לתעד ביצוע.
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {recent.map((log) => (
              <LogItem key={log.id} log={log} />
            ))}
          </ul>
          {older.length > 0 ? (
            <Accordion
              type="single"
              collapsible
              value={olderOpen ? 'older' : ''}
              onValueChange={(v) => setOlderOpen(v === 'older')}
            >
              <AccordionItem value="older" className="border-0">
                <AccordionContent className="px-0 pt-2 pb-0">
                  <ul className="space-y-2">
                    {older.map((log) => (
                      <LogItem key={log.id} log={log} />
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : null}
          {older.length > 0 ? (
            <button
              type="button"
              aria-expanded={olderOpen}
              onClick={() => setOlderOpen((v) => !v)}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              {olderOpen
                ? 'הסתר היסטוריה קודמת'
                : `הצג את כל היסטוריית האימונים (עוד ${older.length} אימונים)`}
              <ChevronDown
                className={`size-4 shrink-0 transition-transform duration-200 ${olderOpen ? 'rotate-180' : ''}`}
                strokeWidth={2}
              />
            </button>
          ) : null}
        </>
      )}
    </Card>
  )
}
