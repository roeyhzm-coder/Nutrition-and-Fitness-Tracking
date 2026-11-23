import { Link } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { useTodayKey } from '../../hooks/useTodayKey'
import { blockTimeline } from '../../lib/blockCycle'

/** Compact block status on the dashboard; opens the block card in Workouts. */
export function BlockStatusPill() {
  const { skillTree } = useAppData()
  const today = useTodayKey()
  const t = blockTimeline(skillTree, today)
  return (
    <Link
      to="/workouts"
      aria-label={`${t.name} — ניהול בלוק`}
      className={[
        'flex min-h-10 w-full items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition',
        t.due
          ? 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
          : 'border-blue-100 bg-white text-slate-700 hover:bg-blue-50',
      ].join(' ')}
    >
      <CalendarClock className={`size-4 shrink-0 ${t.due ? 'text-amber-600' : 'text-blue-600'}`} strokeWidth={2} />
      <span className="min-w-0 flex-1 truncate">
        <span className="font-extrabold text-slate-900">{t.label}</span> · שבוע {t.week}/{t.weeks}
      </span>
      <span className="shrink-0 font-extrabold tabular-nums">
        {t.due ? '🏁 זמן מבדקים' : `עוד ${t.daysLeft} ימים`}
      </span>
    </Link>
  )
}
