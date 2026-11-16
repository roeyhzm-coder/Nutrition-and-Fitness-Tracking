import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarRange, ChevronLeft, Sparkles, Sunrise } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useTodayKey } from '../../hooks/useTodayKey'
import {
  buildMorningWeeks,
  completionFor,
  MORNING_ROUTINE_LABELS,
  MORNING_WEEKLY_TARGET,
  morningStatusLabel,
  morningWeekTone,
  suggestedMorningRoutine,
  type MorningRoutineId,
} from '../../lib/morningRoutine'
import {
  parseWeekStartDay,
  WEEK_START_STORAGE_KEY,
  type DaySlot,
  type WeekConsistency,
  type WeekStartDay,
} from '../../lib/weeklyConsistency'
import { AllTimeWeeksTracker } from '../dashboard/AllTimeWeeksTracker'
import { Button } from '../ui/button'
import { Card } from '../ui/Card'

const MORNING_COUNT_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7] as const

function useWeekStart(): WeekStartDay {
  const [stored] = useLocalStorage<WeekStartDay>(WEEK_START_STORAGE_KEY, 0)
  return parseWeekStartDay(stored)
}

/** Current (relative) week of the morning routine plus the full history. */
export function useMorningWeeks() {
  const { morningRoutine } = useAppData()
  const weekStartsOn = useWeekStart()
  const today = useTodayKey()
  const all = buildMorningWeeks(morningRoutine, weekStartsOn, 'all')
  const current = all[0]
  return { all, current, today }
}

/** Full morning history (same UI as the strength tracker, 6/7 target, 7/7 bonus). */
export function MorningHistoryTracker({
  open,
  onClose,
  weeks,
}: {
  open: boolean
  onClose: () => void
  weeks: WeekConsistency[]
}) {
  const { morningRoutine, setMorningWeekCount, setMorningWeekNote } = useAppData()
  return (
    <AllTimeWeeksTracker
      open={open}
      onClose={onClose}
      weeks={weeks}
      title="מעקב שבועות מלא · שגרת בוקר"
      description="יעד 6/7 בשבוע, 7/7 = בונוס טורקיז. עיפרון לעדכון ספירה, פתק להערה."
      tone={morningWeekTone}
      countOptions={MORNING_COUNT_OPTIONS}
      showTarget
      onSetCount={(week, n) =>
        setMorningWeekCount(week.start, n, suggestedMorningRoutine(morningRoutine))
      }
      onSaveNote={(week, text) => setMorningWeekNote(week.noteKey, text)}
    />
  )
}

function nextRoutineState(slot: DaySlot): MorningRoutineId | null {
  // Tap cycle: empty → A → B → empty, so past days can be fixed in place.
  if (!slot.done) return 'A'
  if (slot.workoutId === 'A') return 'B'
  return null
}

function slotLetter(slot: DaySlot) {
  if (!slot.done) return null
  return slot.workoutId === 'A' || slot.workoutId === 'B' ? slot.workoutId : '✓'
}

function WeekDots({
  week,
  today,
  onTap,
  compact = false,
}: {
  week: WeekConsistency
  today: string
  onTap?: (slot: DaySlot) => void
  compact?: boolean
}) {
  const bonus = week.completed >= 7
  return (
    <ul className={`flex justify-between ${compact ? 'gap-1' : 'gap-1.5'}`}>
      {week.daySlots.map((slot) => {
        const letter = slotLetter(slot)
        const future = slot.date > today
        const isToday = slot.date === today
        const label = `${slot.weekday} · ${
          slot.done ? (slot.workoutName ?? 'בוצע') : future ? 'עתידי' : 'לא בוצע'
        }`
        const tone = slot.done
          ? bonus
            ? 'bg-gradient-to-b from-teal-400 to-emerald-400 text-white shadow-sm shadow-teal-500/25'
            : 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
          : future
            ? 'bg-slate-50 text-slate-300 ring-1 ring-slate-100'
            : 'bg-slate-50 text-muted ring-1 ring-slate-200'
        const size = compact ? 'size-8 text-[10px]' : 'size-10 text-[11px]'
        const content = (
          <>
            <span className="leading-none">{slot.weekday}</span>
            {letter ? (
              <span className="text-[9px] font-extrabold leading-none">{letter}</span>
            ) : null}
          </>
        )
        return (
          <li key={slot.date} className="flex flex-col items-center gap-0.5">
            {onTap ? (
              <button
                type="button"
                disabled={future}
                onClick={() => onTap(slot)}
                aria-label={`${label} — הקשה: A, שוב: B, שוב: ביטול`}
                title={label}
                className={`flex ${size} flex-col items-center justify-center gap-0.5 rounded-full font-bold transition disabled:cursor-not-allowed ${tone} ${isToday ? 'outline outline-2 outline-offset-2 outline-blue-300' : ''}`}
              >
                {content}
              </button>
            ) : (
              <span
                title={label}
                className={`flex ${size} flex-col items-center justify-center gap-0.5 rounded-full font-bold ${tone} ${isToday ? 'outline outline-2 outline-offset-2 outline-blue-300' : ''}`}
              >
                {content}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function CountPill({ completed }: { completed: number }) {
  const bonus = completed >= 7
  const met = completed >= MORNING_WEEKLY_TARGET
  return (
    <span
      className={[
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold tabular-nums',
        bonus
          ? 'bg-gradient-to-l from-teal-500 to-emerald-400 text-white shadow-sm shadow-teal-500/30'
          : met
            ? 'bg-blue-600 text-white'
            : 'bg-slate-100 text-slate-700',
      ].join(' ')}
    >
      {bonus ? <Sparkles className="size-3" strokeWidth={2.25} /> : null}
      {completed}/{MORNING_WEEKLY_TARGET} השבוע
    </span>
  )
}

/** Morning page card: this week's days (tap to fix A/B) + full history. */
export function MorningConsistencyCard() {
  const { setMorningCompletion } = useAppData()
  const { all, current, today } = useMorningWeeks()
  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    <>
      <Card
        title="עקביות שגרת בוקר"
        action={<span className="text-xs text-muted">יעד {MORNING_WEEKLY_TARGET}/שבוע · 7/7 בונוס</span>}
      >
        {current ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text">שבוע {current.weekNumber}</p>
                <p className="text-xs text-muted">{morningStatusLabel(current.completed)}</p>
              </div>
              <CountPill completed={current.completed} />
            </div>
            <WeekDots
              week={current}
              today={today}
              onTap={(slot) => setMorningCompletion(slot.date, nextRoutineState(slot))}
            />
            <p className="text-[11px] text-muted">
              הקשה על יום מסמנת שגרה A, הקשה נוספת B, ושלישית מבטלת. שבועות קודמים — במעקב המלא.
            </p>
          </div>
        ) : null}
        <Button
          className="mt-3 w-full gap-2"
          variant="surface"
          onClick={() => setHistoryOpen(true)}
        >
          <CalendarRange className="size-4" strokeWidth={1.75} />
          מעקב שבועות מלא מהיום הראשון
        </Button>
      </Card>
      <MorningHistoryTracker
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        weeks={all}
      />
    </>
  )
}

/** Compact dashboard row: this week's morning progress + quick links. */
export function MorningConsistencySummary() {
  const { morningRoutine } = useAppData()
  const { all, current, today } = useMorningWeeks()
  const [historyOpen, setHistoryOpen] = useState(false)
  if (!current) return null

  const bonus = current.completed >= 7
  const todayDone = completionFor(morningRoutine, today)

  return (
    <>
      <section
        className={[
          'rounded-2xl border p-4 shadow-sm',
          bonus
            ? 'border-teal-300 bg-gradient-to-l from-teal-50 via-white to-emerald-50 shadow-teal-200/60'
            : 'border-slate-200 bg-white shadow-slate-200/80',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={[
                'flex size-8 shrink-0 items-center justify-center rounded-xl',
                bonus ? 'bg-teal-500 text-white' : 'bg-blue-50 text-blue-600',
              ].join(' ')}
            >
              <Sunrise className="size-4" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-display text-sm font-semibold text-slate-900">
                עקביות שגרת בוקר
              </h2>
              <p className="truncate text-[11px] text-muted">
                {todayDone?.routine
                  ? `היום: ${MORNING_ROUTINE_LABELS[todayDone.routine]} ✓`
                  : 'היום: טרם בוצעה'}
                {' · '}
                {morningStatusLabel(current.completed)}
              </p>
            </div>
          </div>
          <CountPill completed={current.completed} />
        </div>
        <div className="mt-3">
          <WeekDots week={current} today={today} compact />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            <CalendarRange className="size-3.5" strokeWidth={2} />
            היסטוריה
          </button>
          <Link
            to="/tips"
            className="inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-xl bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            לשגרת הבוקר
            <ChevronLeft className="size-3.5" strokeWidth={2} />
          </Link>
        </div>
      </section>
      <MorningHistoryTracker
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        weeks={all}
      />
    </>
  )
}
