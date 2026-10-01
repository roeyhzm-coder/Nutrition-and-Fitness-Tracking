import { Check, Pencil, Trash2 } from 'lucide-react'
import {
  completedInWeek,
  weekDayCells,
} from '../../lib/routines'
import type { Routine } from '../../lib/types'
import { ROUTINE_TIME_LABELS, todayKey } from '../../lib/types'
import { IconButton } from '../ui/IconButton'
import { ProgressBar } from '../ui/ProgressBar'

type RoutineCardProps = {
  routine: Routine
  onToggleDate: (date: string) => void
  onEdit: () => void
  onDelete: () => void
}

export function RoutineCard({
  routine,
  onToggleDate,
  onEdit,
  onDelete,
}: RoutineCardProps) {
  const today = todayKey()
  const days = weekDayCells()
  const doneThisWeek = completedInWeek(routine, days.map((d) => d.date))
  const target = routine.weeklyTargetDays
  const pct = target <= 0 ? 0 : Math.min(100, Math.round((doneThisWeek / target) * 100))
  const todayDone = routine.completedDates.includes(today)

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/80">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold text-text">
            {routine.title}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-text">
              {routine.targetMinutes} דק׳
            </span>
            <span className="rounded-lg bg-cyan-50 px-2 py-0.5 text-[11px] font-medium text-cyan-700">
              {ROUTINE_TIME_LABELS[routine.timeOfDay]}
            </span>
            <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
              {routine.weeklyTargetDays} ימים בשבוע
            </span>
          </div>
        </div>
        <IconButton label="ערוך שגרה" tone="accent" onClick={onEdit}>
          <Pencil className="size-3.5" strokeWidth={1.75} />
        </IconButton>
        <IconButton label="מחק שגרה" tone="danger" onClick={onDelete}>
          <Trash2 className="size-3.5" strokeWidth={1.75} />
        </IconButton>
      </div>

      <button
        type="button"
        onClick={() => onToggleDate(today)}
        className={[
          'mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold transition',
          todayDone
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
            : 'border border-slate-200 bg-slate-50 text-text hover:border-emerald-400 hover:bg-emerald-50',
        ].join(' ')}
      >
        {todayDone ? (
          <>
            <Check className="size-5" strokeWidth={2.5} />
            בוצע היום
          </>
        ) : (
          'סמן להיום'
        )}
      </button>

      <ul className="mt-4 grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const done = routine.completedDates.includes(day.date)
          const isFuture = day.date > today
          const isToday = day.date === today
          return (
            <li key={day.date}>
              <button
                type="button"
                disabled={isFuture}
                onClick={() => onToggleDate(day.date)}
                className={[
                  'flex w-full flex-col items-center gap-1 rounded-2xl px-0.5 py-2 text-[10px] font-semibold transition',
                  isFuture
                    ? 'cursor-not-allowed text-muted/50'
                    : done
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                      : isToday
                        ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                        : 'bg-slate-50 text-muted hover:bg-slate-100',
                ].join(' ')}
                aria-label={`${day.label} ${day.date}${done ? ' — בוצע' : ''}`}
                aria-pressed={done}
              >
                <span>{day.label}</span>
                <span
                  className={[
                    'flex size-6 items-center justify-center rounded-lg text-[11px]',
                    done
                      ? 'bg-white/20'
                      : 'bg-white text-muted ring-1 ring-slate-200',
                  ].join(' ')}
                >
                  {done ? <Check className="size-3.5" strokeWidth={2.75} /> : ''}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-text">
            {doneThisWeek}/{target} ימים השבוע
          </span>
          <span className={pct >= 100 ? 'font-semibold text-emerald-600' : 'text-muted'}>
            {pct}%
          </span>
        </div>
        <ProgressBar
          value={doneThisWeek}
          max={target}
          color={pct >= 100 ? 'green' : 'primary'}
        />
      </div>
    </article>
  )
}
