import { useMemo, useState } from 'react'
import { buildRelativeWeeklyConsistency, weekTone } from '../../lib/weeklyConsistency'
import type { SetLog } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'

type WeeklyConsistencyTrackerProps = {
  setLogs: SetLog[]
  phaseStartDate: string
  targetPerWeek?: number
}

const toneClass = {
  blue: 'border-[#7eb6ff]/50 bg-[#5b8cff]/20',
  green: 'border-accent/40 bg-accent/15',
  amber: 'border-warn/35 bg-warn/10',
}

const badgeClass = {
  blue: 'bg-[#5b8cff]/30 text-[#b7d3ff]',
  green: 'bg-accent/25 text-accent',
  amber: 'bg-warn/20 text-warn',
}

function WeekRow({
  week,
}: {
  week: ReturnType<typeof buildRelativeWeeklyConsistency>[number]
}) {
  const tone = weekTone(week.completed, week.target)
  const startLabel = week.start.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
  })
  const endLabel = week.end.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <li className={`rounded-xl border px-3 py-3 ${toneClass[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-text">שבוע {week.weekNumber}</p>
          <p className="mt-1 text-xs text-muted">
            {startLabel} – {endLabel}
          </p>
        </div>
        <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${badgeClass[tone]}`}>
          {week.completed}/{week.target}
        </span>
      </div>
      {week.dates.length > 0 ? (
        <p className="mt-2 text-[11px] text-muted">
          ימים: {week.dates.map((d) => d.slice(5)).join(' · ')}
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-muted">אין אימונים רשומים</p>
      )}
    </li>
  )
}

export function WeeklyConsistencyTracker({
  setLogs,
  phaseStartDate,
  targetPerWeek = 5,
}: WeeklyConsistencyTrackerProps) {
  const [historyOpen, setHistoryOpen] = useState(false)

  const preview = useMemo(
    () =>
      buildRelativeWeeklyConsistency(setLogs, phaseStartDate, {
        weeksBack: 3,
        target: targetPerWeek,
      }),
    [setLogs, phaseStartDate, targetPerWeek],
  )

  const allWeeks = useMemo(
    () =>
      buildRelativeWeeklyConsistency(setLogs, phaseStartDate, {
        weeksBack: 'all',
        target: targetPerWeek,
      }),
    [setLogs, phaseStartDate, targetPerWeek],
  )

  return (
    <>
      <Card
        title="עקביות שבועית"
        action={<span className="text-xs text-muted">יעד {targetPerWeek}/שבוע</span>}
      >
        <ul className="space-y-2">
          {preview.map((week) => (
            <WeekRow key={week.weekKey} week={week} />
          ))}
        </ul>
        <Button
          className="mt-3 w-full"
          variant="surface"
          onClick={() => setHistoryOpen(true)}
        >
          הצג היסטוריה מלאה
        </Button>
      </Card>

      <Modal
        open={historyOpen}
        title="היסטוריית עקביות מלאה"
        onClose={() => setHistoryOpen(false)}
        wide
      >
        <ul className="max-h-[70vh] space-y-2 overflow-y-auto">
          {allWeeks.map((week) => (
            <WeekRow key={week.weekKey} week={week} />
          ))}
        </ul>
      </Modal>
    </>
  )
}
