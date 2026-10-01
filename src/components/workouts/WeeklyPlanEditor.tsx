import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { WEEKDAYS } from '../../lib/types'
import { DayPlanSelect } from './WeeklyPlanParts'

export function WeeklyPlanEditor() {
  const { workoutDays } = useAppData()
  const [open, setOpen] = useState(false)
  if (!workoutDays.length) return null

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/80">
      <button
        type="button"
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-right"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-semibold tracking-tight text-slate-900">
            תוכנית ברירת מחדל לשבוע
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            קובע איזה אימון משויך לכל יום כברירת מחדל.
          </p>
        </div>
        <ChevronDown
          className={`size-5 shrink-0 text-muted transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          strokeWidth={1.75}
        />
      </button>
      <div
        className={[
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        ].join(' ')}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 px-4 pb-4">
            <p className="text-xs text-muted">
              אפשר לבצע כל אימון בכל יום בלי להמתין ליום המתוכנן.
            </p>
            <ul className="space-y-3">
              {workoutDays.map((day) => (
                <li
                  key={day.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <p className="mb-1 text-xs font-semibold text-text">
                    {WEEKDAYS[day.dayNumber - 1]}
                  </p>
                  <DayPlanSelect day={day} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
