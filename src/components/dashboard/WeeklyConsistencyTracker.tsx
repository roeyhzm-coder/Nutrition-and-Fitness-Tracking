import { useState, type MouseEvent } from 'react'
import { Pencil } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import {
  consistencyWorkoutOptions,
  scheduledWorkoutForDate,
  type ConsistencyWorkoutOption,
} from '../../lib/weekPlan'
import {
  buildRelativeWeeklyConsistency,
  parseDayMark,
  weekTone,
  type ConsistencyDayMarks,
  type DaySlot,
  type WeekConsistency,
} from '../../lib/weeklyConsistency'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { NumericInput } from '../ui/NumericInput'

function slotLabel(slot: DaySlot, fallbackName?: string) {
  const name = slot.workoutName || fallbackName
  if (slot.done && name) return `${slot.weekday} · ${name}`
  if (slot.done) return `${slot.weekday} · אימון הושלם`
  return `${slot.weekday} · ${slot.date}`
}

function WeekRow({
  week,
  scheduledName,
  onToggleDay,
  onEditDay,
  onEditCount,
}: {
  week: WeekConsistency
  scheduledName: (date: string) => string | undefined
  onToggleDay: (slot: DaySlot) => void
  onEditDay: (slot: DaySlot) => void
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
    <li
      className={`rounded-2xl border px-4 py-4 ${
        tone === 'blue'
          ? 'border-cyan-200 bg-cyan-50'
          : tone === 'green'
            ? 'border-blue-200 bg-blue-50'
            : 'border-orange-200 bg-orange-50'
      }`}
    >
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
          className={[
            'min-h-11 min-w-11 rounded-2xl px-3 text-sm font-extrabold tabular-nums transition hover:brightness-110',
            tone === 'blue'
              ? 'bg-cyan-50 text-cyan-700'
              : tone === 'green'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-orange-50 text-orange-700',
          ].join(' ')}
          aria-label={`עריכת ספירה ${week.completed} מתוך ${week.target}`}
        >
          {week.completed}/{week.target}
        </button>
      </div>

      <div className="mt-3 flex justify-between gap-1">
        {week.daySlots.map((slot) => {
          const name = slot.workoutName || scheduledName(slot.date)
          return (
            <div key={slot.date} className="flex flex-col items-center gap-1">
              <button
                type="button"
                title={slotLabel(slot, name)}
                onClick={() => onToggleDay(slot)}
                className={[
                  'flex size-11 flex-col items-center justify-center rounded-full text-[10px] font-bold transition',
                  slot.done
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-50 text-muted ring-1 ring-slate-200',
                ].join(' ')}
                aria-pressed={slot.done}
                aria-label={slotLabel(slot, name)}
              >
                <span>{slot.weekday}</span>
              </button>
              <button
                type="button"
                onClick={() => onEditDay(slot)}
                className="flex size-6 items-center justify-center rounded-full text-muted transition hover:bg-white hover:text-blue-600"
                aria-label={`עריכת אימון ליום ${slot.weekday}`}
                title={name ? `עריכת אימון · ${name}` : 'עריכת אימון'}
              >
                <Pencil className="size-3" strokeWidth={2} />
              </button>
            </div>
          )
        })}
      </div>
    </li>
  )
}

export function WeeklyConsistencyTracker() {
  const {
    setLogs,
    goal,
    consistencyDayMarks,
    setConsistencyDayMark,
    setWeekConsistencyCount,
    activeProgram,
    workoutTemplates,
  } = useAppData()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [editWeek, setEditWeek] = useState<WeekConsistency | null>(null)
  const [countInput, setCountInput] = useState('0')
  const [pickerDate, setPickerDate] = useState<string | null>(null)

  const targetPerWeek = goal.weeklyWorkoutTarget || 5
  const options = consistencyWorkoutOptions(workoutTemplates)

  const preview = buildRelativeWeeklyConsistency(setLogs, goal.startDate, {
    weeksBack: 3,
    target: targetPerWeek,
    dayMarks: consistencyDayMarks,
  })

  const allWeeks = buildRelativeWeeklyConsistency(setLogs, goal.startDate, {
    weeksBack: 'all',
    target: targetPerWeek,
    dayMarks: consistencyDayMarks,
  })

  function scheduledFor(date: string): ConsistencyWorkoutOption {
    return scheduledWorkoutForDate(activeProgram, date)
  }

  function assignedFor(date: string): ConsistencyWorkoutOption {
    const mark = parseDayMark(consistencyDayMarks[date])
    if (mark?.done && mark.workoutName) {
      return {
        id: mark.workoutId || mark.workoutName,
        name: mark.workoutName,
      }
    }
    return scheduledFor(date)
  }

  function openEdit(week: WeekConsistency) {
    setEditWeek(week)
    setCountInput(String(Math.min(week.completed, 7)))
  }

  function saveCount() {
    if (!editWeek) return
    const n = Math.max(0, Math.min(7, Number(countInput) || 0))
    setWeekConsistencyCount(editWeek.start, n)
    setEditWeek(null)
  }

  function handleToggleDay(slot: DaySlot) {
    if (slot.done) {
      setConsistencyDayMark(slot.date, { done: false })
      return
    }
    const scheduled = scheduledFor(slot.date)
    setConsistencyDayMark(slot.date, {
      done: true,
      workoutId: scheduled.id,
      workoutName: scheduled.name,
    })
  }

  function handleEditDay(slot: DaySlot) {
    if (!slot.done) {
      const scheduled = scheduledFor(slot.date)
      setConsistencyDayMark(slot.date, {
        done: true,
        workoutId: scheduled.id,
        workoutName: scheduled.name,
      })
    }
    setPickerDate(slot.date)
  }

  function assignWorkout(date: string, workout: ConsistencyWorkoutOption) {
    setConsistencyDayMark(date, {
      done: true,
      workoutId: workout.id,
      workoutName: workout.name,
    })
  }

  function unmarkDay(date: string) {
    setConsistencyDayMark(date, { done: false })
    setPickerDate(null)
  }

  const pickerWeekday =
    pickerDate &&
    [...preview, ...allWeeks]
      .flatMap((w) => w.daySlots)
      .find((s) => s.date === pickerDate)?.weekday

  const pickerAssigned = pickerDate ? assignedFor(pickerDate) : null

  return (
    <>
      <Card
        title="עקביות שבועית"
        action={
          <span className="text-xs text-muted">יעד {targetPerWeek}/שבוע</span>
        }
      >
        <p className="mb-3 text-xs text-muted">
          לחץ על יום לסימון מהיר. עיפרון קטן מחליף את תבנית האימון.
        </p>
        <ul className="space-y-2">
          {preview.map((week) => (
            <WeekRow
              key={week.weekKey}
              week={week}
              scheduledName={(date) => scheduledFor(date).name}
              onToggleDay={handleToggleDay}
              onEditDay={handleEditDay}
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
              scheduledName={(date) => scheduledFor(date).name}
              onToggleDay={handleToggleDay}
              onEditDay={handleEditDay}
              onEditCount={openEdit}
            />
          ))}
        </ul>
      </Modal>

      <Modal
        open={!!pickerDate}
        title={
          pickerDate
            ? `אימון ליום ${pickerWeekday ?? ''} · ${pickerDate}`
            : 'בחירת אימון'
        }
        onClose={() => setPickerDate(null)}
      >
        {pickerDate && pickerAssigned ? (
          <div className="space-y-4">
            <p className="rounded-2xl bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
              אימון משויך: {pickerAssigned.name}
            </p>
            <label className="block text-xs text-muted">
              בחר תבנית אימון
              <select
                className="mt-1 field"
                value={
                  options.find(
                    (o) =>
                      o.id === pickerAssigned.id ||
                      o.name === pickerAssigned.name,
                  )?.id ?? pickerAssigned.id
                }
                onChange={(e) => {
                  const next = options.find((o) => o.id === e.target.value)
                  if (next) assignWorkout(pickerDate, next)
                }}
              >
                {!options.some(
                  (o) =>
                    o.id === pickerAssigned.id ||
                    o.name === pickerAssigned.name,
                ) ? (
                  <option value={pickerAssigned.id}>
                    {pickerAssigned.name}
                  </option>
                ) : null}
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <p className="mb-2 text-xs text-muted">בחירה מהירה</p>
              <div className="grid grid-cols-2 gap-2">
                {options.map((option) => {
                  const active =
                    pickerAssigned.id === option.id ||
                    pickerAssigned.name === option.name
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => assignWorkout(pickerDate, option)}
                      className={[
                        'min-h-11 rounded-2xl px-3 text-sm font-semibold transition',
                        active
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                          : 'bg-slate-100 text-muted hover:text-text',
                      ].join(' ')}
                    >
                      {option.name}
                    </button>
                  )
                })}
              </div>
            </div>
            <Button
              className="w-full"
              variant="surface"
              onClick={() => unmarkDay(pickerDate)}
            >
              בטל סימון ליום זה
            </Button>
          </div>
        ) : null}
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
            <NumericInput
              decimals={0}
              value={countInput}
              onChange={setCountInput}
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
                  'min-h-11 rounded-2xl px-3 text-xs font-bold',
                  Number(countInput) === n
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-muted',
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

export type { ConsistencyDayMarks }
