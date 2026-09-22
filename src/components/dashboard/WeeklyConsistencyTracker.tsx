import { useState, type MouseEvent } from 'react'
import {
  buildRelativeWeeklyConsistency,
  weekTone,
  type ConsistencyDayMarks,
  type WeekConsistency,
} from '../../lib/weeklyConsistency'
import type { SetLog } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'

type WeeklyConsistencyTrackerProps = {
  setLogs: SetLog[]
  phaseStartDate: string
  dayMarks: ConsistencyDayMarks
  onToggleDay: (date: string) => void
  onSetWeekCount: (weekStart: Date, count: number) => void
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
  onToggleDay,
  onEditCount,
}: {
  week: WeekConsistency
  onToggleDay: (date: string) => void
  onEditCount: (week: WeekConsistency) => void
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

  function openCount(e: MouseEvent) {
    e.stopPropagation()
    onEditCount(week)
  }

  return (
    <li className={`rounded-xl border px-3 py-3 ${toneClass[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="min-w-0 flex-1 text-right"
          onClick={() => onEditCount(week)}
        >
          <p className="font-semibold text-text">שבוע {week.weekNumber}</p>
          <p className="mt-1 text-xs text-muted">
            {startLabel} – {endLabel}
          </p>
        </button>
        <button
          type="button"
          onClick={openCount}
          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition hover:brightness-110 ${badgeClass[tone]}`}
          aria-label={`עריכת ספירה ${week.completed} מתוך ${week.target}`}
        >
          {week.completed}/{week.target}
        </button>
      </div>

      <div className="mt-3 flex justify-between gap-1">
        {week.daySlots.map((slot) => (
          <button
            key={slot.date}
            type="button"
            title={slot.date}
            onClick={() => onToggleDay(slot.date)}
            className={[
              'flex size-9 flex-col items-center justify-center rounded-full text-[10px] font-bold transition',
              slot.done
                ? 'bg-primary text-white'
                : 'bg-bg/50 text-muted ring-1 ring-line',
            ].join(' ')}
            aria-pressed={slot.done}
            aria-label={`${slot.weekday} ${slot.date}`}
          >
            <span>{slot.weekday}</span>
          </button>
        ))}
      </div>
    </li>
  )
}

export function WeeklyConsistencyTracker({
  setLogs,
  phaseStartDate,
  dayMarks,
  onToggleDay,
  onSetWeekCount,
  targetPerWeek = 5,
}: WeeklyConsistencyTrackerProps) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const [editWeek, setEditWeek] = useState<WeekConsistency | null>(null)
  const [countInput, setCountInput] = useState('0')

  const preview = buildRelativeWeeklyConsistency(setLogs, phaseStartDate, {
    weeksBack: 3,
    target: targetPerWeek,
    dayMarks,
  })

  const allWeeks = buildRelativeWeeklyConsistency(setLogs, phaseStartDate, {
    weeksBack: 'all',
    target: targetPerWeek,
    dayMarks,
  })

  function openEdit(week: WeekConsistency) {
    setEditWeek(week)
    setCountInput(String(Math.min(week.completed, 7)))
  }

  function saveCount() {
    if (!editWeek) return
    const n = Math.max(0, Math.min(7, Number(countInput) || 0))
    onSetWeekCount(editWeek.start, n)
    setEditWeek(null)
  }

  return (
    <>
      <Card
        title="עקביות שבועית"
        action={
          <span className="text-xs text-muted">יעד {targetPerWeek}/שבוע</span>
        }
      >
        <p className="mb-3 text-xs text-muted">
          לחץ על תג הספירה או על יום לסימון מהיר. הצבע מתעדכן מיד.
        </p>
        <ul className="space-y-2">
          {preview.map((week) => (
            <WeekRow
              key={week.weekKey}
              week={week}
              onToggleDay={onToggleDay}
              onEditCount={openEdit}
            />
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
            <WeekRow
              key={week.weekKey}
              week={week}
              onToggleDay={onToggleDay}
              onEditCount={openEdit}
            />
          ))}
        </ul>
      </Modal>

      <Modal
        open={!!editWeek}
        title={
          editWeek ? `עריכת שבוע ${editWeek.weekNumber}` : 'עריכת ספירה'
        }
        onClose={() => setEditWeek(null)}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            saveCount()
          }}
        >
          <p className="text-sm text-muted">
            הגדר ישירות כמה ימי אימון הושלמו בשבוע זה (0–7).
          </p>
          <label className="block text-xs text-muted">
            מספר אימונים
            <input
              inputMode="numeric"
              value={countInput}
              onChange={(e) => setCountInput(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
              min={0}
              max={7}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCountInput(String(n))}
                className={[
                  'rounded-lg px-3 py-1.5 text-xs font-bold',
                  Number(countInput) === n
                    ? 'bg-primary text-white'
                    : 'bg-surface text-muted',
                ].join(' ')}
              >
                {n}/{targetPerWeek}
              </button>
            ))}
          </div>
          <Button type="submit" className="w-full" variant="accent">
            שמור ספירה
          </Button>
        </form>
      </Modal>
    </>
  )
}

// re-export helper used by context
export type { ConsistencyDayMarks }
