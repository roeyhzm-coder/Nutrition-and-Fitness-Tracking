import { useAppData } from '../../context/AppDataContext'
import { currentWeekDates } from '../../lib/routines'

export function FocusTracksStatusRow() {
  const { focusTracks } = useAppData()
  const weekDates = currentWeekDates()
  const active = focusTracks.filter((track) => !track.archivedAt)
  if (!active.length) return null

  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5">
      {active.map((track) => {
        const done = weekDates.filter((day) =>
          track.completedDates.includes(day),
        ).length
        return (
          <span
            key={track.id}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-text"
          >
            <span className="size-1.5 rounded-full bg-cyan-500" />
            {track.name}
            <span className="text-muted">
              {done}/{track.weeklyTargetDays}
            </span>
          </span>
        )
      })}
    </div>
  )
}
