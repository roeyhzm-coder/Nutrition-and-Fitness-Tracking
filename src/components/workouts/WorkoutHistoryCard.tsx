import { useState } from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'
import { useWorkoutSession } from '../../context/WorkoutSessionContext'
import type { WorkoutLog } from '../../lib/types'
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

function volumeKg(log: WorkoutLog) {
  return log.exercises
    .flatMap((e) => e.sets)
    .reduce((sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0), 0)
}

function LogItem({ log }: { log: WorkoutLog }) {
  const { deleteWorkoutLog } = useWorkoutSession()
  const [open, setOpen] = useState(false)
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
            {dateFormat.format(completed)} · {timeFormat.format(completed)} ·{' '}
            {durationMin(log)} דק׳
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {log.exercises.length} תרגילים · {setCount} סטים
            {volume > 0 ? ` · נפח ${Math.round(volume)} ק״ג` : ''} · {log.programName}
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
                  .map((s) => `${s.weightKg ?? 0} ק״ג × ${s.reps ?? '?'}`)
                  .join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function WorkoutHistoryCard({ limit }: { limit?: number }) {
  const { workoutLogs } = useWorkoutSession()
  const sorted = [...workoutLogs].sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  const shown = limit ? sorted.slice(0, limit) : sorted

  return (
    <Card title={`היסטוריית אימונים · ${workoutLogs.length}`}>
      {shown.length === 0 ? (
        <p className="text-sm text-muted">
          עדיין אין אימונים שמורים. התחל אימון מהלוח השבועי כדי לתעד ביצוע.
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((log) => (
            <LogItem key={log.id} log={log} />
          ))}
        </ul>
      )}
    </Card>
  )
}
