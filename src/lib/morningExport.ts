import { daysUntilReview } from './aiCheckin'
import {
  buildMorningWeeks,
  effectiveMorningStart,
  MORNING_AI_INTERVAL_DAYS,
  MORNING_ROUTINE_IDS,
  MORNING_ROUTINE_LABELS,
  MORNING_ROUTINE_SUBTITLES,
  MORNING_WEEKLY_TARGET,
  type MorningRoutineState,
} from './morningRoutine'
import { localDateKey } from './types'
import type { WeekConsistency, WeekStartDay } from './weeklyConsistency'

function fmtRange(week: WeekConsistency) {
  const fmt = (d: Date) => d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
  return `${fmt(week.start)} – ${fmt(week.end)}`
}

function routineSplit(week: WeekConsistency) {
  let a = 0
  let b = 0
  let unknown = 0
  for (const slot of week.daySlots) {
    if (!slot.done) continue
    if (slot.workoutId === 'A') a++
    else if (slot.workoutId === 'B') b++
    else unknown++
  }
  return { a, b, unknown }
}

function reviewLine(label: string, remaining: number, interval: number, anchor: string) {
  const when =
    remaining <= 0 ? `מגיע כעת (באיחור של ${-remaining} ימים)` : `בעוד ${remaining} ימים`
  return `- ${label}: ${when} · מחזור ${interval} ימים · עדכון אחרון ${anchor}`
}

/** "## מועדי בדיקת AI" — remaining days for the main plan and the morning routine. */
export function formatAiReviewSchedule(input: {
  mainAnchor: string
  mainIntervalDays: number
  morning?: MorningRoutineState
  today?: string
}): string {
  const today = input.today ?? localDateKey()
  const lines = [
    reviewLine(
      'בדיקת AI לתוכנית הראשית',
      daysUntilReview(input.mainAnchor, input.mainIntervalDays, today),
      input.mainIntervalDays,
      input.mainAnchor,
    ),
  ]
  if (input.morning) {
    const anchor = input.morning.aiReview.lastReviewAt ?? effectiveMorningStart(input.morning)
    const interval = input.morning.aiReview.intervalDays || MORNING_AI_INTERVAL_DAYS
    lines.push(
      reviewLine('בדיקת AI לשגרת הבוקר', daysUntilReview(anchor, interval, today), interval, anchor),
    )
  }
  return `## מועדי בדיקת AI\n${lines.join('\n')}`
}

/** Morning micro-routine: active A/B definitions + full weekly consistency. */
export function formatMorningRoutineSection(
  state: MorningRoutineState,
  weekStartsOn: WeekStartDay,
): string {
  const weeks = buildMorningWeeks(state, weekStartsOn, 'all').sort(
    (a, b) => a.weekNumber - b.weekNumber,
  )
  const definitions = MORNING_ROUTINE_IDS.map((id) => {
    const routine = state.routines[id]
    const exercises = routine.exercises.map((ex, i) => {
      const parts = [
        `${i + 1}. ${ex.nameHe}${ex.nameEn ? ` (${ex.nameEn})` : ''}`,
        ex.target ? `יעד: ${ex.target}` : '',
        ex.badge ? `[${ex.badge}]` : '',
        ex.description,
        ex.tip ? `דגש: ${ex.tip}` : '',
      ].filter(Boolean)
      return parts.join(' · ')
    })
    return [
      `### ${MORNING_ROUTINE_LABELS[id]} — ${routine.title} (${MORNING_ROUTINE_SUBTITLES[id]})${routine.meta ? ` · ${routine.meta}` : ''}`,
      ...exercises,
      routine.footerNote ? `הערה: ${routine.footerNote}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  })

  const totals = weeks.reduce(
    (acc, week) => {
      const split = routineSplit(week)
      acc.days += week.completed
      acc.a += split.a
      acc.b += split.b
      acc.unknown += split.unknown
      if (week.completed >= MORNING_WEEKLY_TARGET) acc.met++
      if (week.completed >= 7) acc.bonus++
      return acc
    },
    { days: 0, a: 0, b: 0, unknown: 0, met: 0, bonus: 0 },
  )

  const weekLines = weeks.map((week) => {
    const split = routineSplit(week)
    const status =
      week.completed >= 7
        ? 'בונוס 7/7'
        : week.completed >= MORNING_WEEKLY_TARGET
          ? 'עמד ביעד'
          : `חסרו ${MORNING_WEEKLY_TARGET - week.completed}`
    const splitText = [
      `A ${split.a}`,
      `B ${split.b}`,
      split.unknown ? `לא צוין ${split.unknown}` : '',
    ]
      .filter(Boolean)
      .join(' · ')
    const note = week.note ? ` · הערה: ${week.note.replace(/\s*\n+\s*/g, ' / ')}` : ''
    return `- שבוע ${week.weekNumber} (${fmtRange(week)}): ${week.completed}/${MORNING_WEEKLY_TARGET} (${splitText}) · ${status}${note}`
  })

  return [
    `## שגרת בוקר (Morning Micro-Routine)
- יום 1: ${effectiveMorningStart(state)} · יעד: ${MORNING_WEEKLY_TARGET}/7 בקרים בשבוע (7/7 = בונוס)
- סה״כ: ${totals.days} בקרים · שגרה A: ${totals.a} · שגרה B: ${totals.b}${totals.unknown ? ` · לא צוין: ${totals.unknown}` : ''}
- שבועות שעמדו ביעד: ${totals.met}/${weeks.length} · שבועות בונוס 7/7: ${totals.bonus}`,
    ...definitions,
    weekLines.length ? `### עקביות שבועית — שגרת בוקר\n${weekLines.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

/** Flat entity rows for the JSON export (each key becomes an entity list). */
export function morningExportEntities(
  state: MorningRoutineState,
  weekStartsOn: WeekStartDay,
): {
  morningRoutineExercises: Record<string, unknown>[]
  morningRoutineCompletions: Record<string, unknown>[]
  morningRoutineWeeks: Record<string, unknown>[]
} {
  const weeks = buildMorningWeeks(state, weekStartsOn, 'all').sort(
    (a, b) => a.weekNumber - b.weekNumber,
  )
  return {
    morningRoutineExercises: MORNING_ROUTINE_IDS.flatMap((id) =>
      state.routines[id].exercises.map((ex, i) => ({
        routine: id,
        routineTitle: state.routines[id].title,
        order: i + 1,
        nameHe: ex.nameHe,
        nameEn: ex.nameEn,
        target: ex.target,
        badge: ex.badge,
        description: ex.description,
        tip: ex.tip,
      })),
    ),
    morningRoutineCompletions: Object.entries(state.completions)
      .filter(([, entry]) => entry.done)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, entry]) => ({ date, routine: entry.routine ?? null })),
    morningRoutineWeeks: weeks.map((week) => {
      const split = routineSplit(week)
      return {
        weekNumber: week.weekNumber,
        start: localDateKey(week.start),
        end: localDateKey(week.end),
        completed: week.completed,
        target: MORNING_WEEKLY_TARGET,
        routineA: split.a,
        routineB: split.b,
        note: week.note ?? null,
      }
    }),
  }
}
