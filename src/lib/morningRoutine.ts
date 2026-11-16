import { localDateKey } from './types'
import {
  buildRelativeWeeklyConsistency,
  mergeWeekNotes,
  MORNING_PAYLOAD_KEY,
  parseWeekNotes,
  weekDates,
  type ConsistencyDayMarks,
  type ConsistencyWeekNotes,
  type WeekConsistency,
  type WeekStartDay,
} from './weeklyConsistency'

export type MorningRoutineId = 'A' | 'B'
export const MORNING_ROUTINE_IDS: readonly MorningRoutineId[] = ['A', 'B']

export type MorningIllustrationKind =
  | 'vacuum'
  | 'deepSquat'
  | 'tSpine'
  | 'hollow'
  | 'deadHang'
  | 'pike'
  | 'superman'
  | 'handstand'

export const MORNING_ILLUSTRATIONS: { kind: MorningIllustrationKind; label: string }[] = [
  { kind: 'vacuum', label: 'ואקום בטן' },
  { kind: 'deepSquat', label: 'ישיבת סקוואט עמוקה' },
  { kind: 'tSpine', label: 'סיבובי גב עליון' },
  { kind: 'hollow', label: 'החזקת הולו' },
  { kind: 'deadHang', label: 'תלייה חופשית' },
  { kind: 'pike', label: 'הרמות פייק' },
  { kind: 'superman', label: 'החזקת סופרמן' },
  { kind: 'handstand', label: 'עמידת ידיים מול קיר' },
]

export type MorningExercise = {
  id: string
  nameHe: string
  nameEn: string
  /** Optional chip, e.g. "כל בוקר". */
  badge: string
  /** Free text target: "1:30", "4 נשימות", "2 × 10". */
  target: string
  description: string
  /** Optional cue shown under the exercise. */
  tip: string
  illustration: MorningIllustrationKind
}

export type MorningRoutineDef = {
  id: MorningRoutineId
  /** e.g. "בוקר לפני יום משיכה" */
  title: string
  /** e.g. "5 תרגילים · כ-6 דקות" */
  meta: string
  footerNote: string
  exercises: MorningExercise[]
  updatedAt: string
}

/** `done: false` is a tombstone so un-marking syncs across devices. */
export type MorningCompletion = {
  done: boolean
  routine?: MorningRoutineId
  updatedAt: string
}

export type MorningAiReview = {
  intervalDays: number
  /** YYYY-MM-DD of the last AI review; null → counted from day 1. */
  lastReviewAt: string | null
  updatedAt: string
}

export type MorningRoutineState = {
  /** Day 1 of the morning routine (relative week numbering). */
  startDate: string
  startDateUpdatedAt: string
  routines: Record<MorningRoutineId, MorningRoutineDef>
  completions: Record<string, MorningCompletion>
  weekNotes: ConsistencyWeekNotes
  aiReview: MorningAiReview
}

export const MORNING_WEEKLY_TARGET = 6
export const MORNING_AI_INTERVAL_DAYS = 90
export const MORNING_STORAGE_KEY = 'tn.morningRoutine.v1'
/**
 * Synced inside the existing `consistency_day_marks` JSON column under this
 * reserved key (same pattern as week notes): no migration / RLS change needed.
 */
export const MORNING_ROUTINE_MARKS_KEY = MORNING_PAYLOAD_KEY

/** Defaults carry the epoch so any real edit (local or remote) wins a merge. */
const EPOCH = '1970-01-01T00:00:00.000Z'
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

export const MORNING_ROUTINE_LABELS: Record<MorningRoutineId, string> = {
  A: 'שגרה A',
  B: 'שגרה B',
}

export const MORNING_ROUTINE_SUBTITLES: Record<MorningRoutineId, string> = {
  A: 'לפני יום משיכה',
  B: 'לפני יום דחיפה',
}

const SHARED_OPENERS: Omit<MorningExercise, 'id'>[] = [
  {
    nameHe: 'ואקום בטן',
    nameEn: 'Stomach Vacuum',
    badge: 'כל בוקר',
    target: '4 נשימות',
    description: 'מותן צרה ושרירי בטן עמוקים חזקים',
    tip: '',
    illustration: 'vacuum',
  },
  {
    nameHe: 'ישיבת סקוואט עמוקה',
    nameEn: 'Deep Squat Hold',
    badge: 'כל בוקר',
    target: '1:30',
    description: 'ירכיים וקרסוליים גמישים, נגד ישיבה ממושכת',
    tip: '',
    illustration: 'deepSquat',
  },
]

function withIds(prefix: string, list: Omit<MorningExercise, 'id'>[]): MorningExercise[] {
  return list.map((exercise, i) => ({ ...exercise, id: `${prefix}${i + 1}` }))
}

export function defaultMorningRoutine(id: MorningRoutineId): MorningRoutineDef {
  if (id === 'A') {
    return {
      id,
      title: 'בוקר לפני יום משיכה',
      meta: '5 תרגילים · כ-6 דקות',
      footerNote: 'הניגוד בבוקר B: הולו ↔ סופרמן · תלייה ↔ עמידת ידיים',
      updatedAt: EPOCH,
      exercises: withIds('a', [
        ...SHARED_OPENERS,
        {
          nameHe: 'סיבובי גב עליון',
          nameEn: 'Quadruped T-Spine Rotation',
          badge: '',
          target: '8 לכל צד',
          description: 'גב עליון פתוח ויציבה זקופה',
          tip: '',
          illustration: 'tSpine',
        },
        {
          nameHe: 'החזקת הולו',
          nameEn: 'Hollow Body Hold',
          badge: '',
          target: '1:00',
          description: 'ליבה מתוחה, הבסיס לכל תרגילי הסטטיקה',
          tip: '',
          illustration: 'hollow',
        },
        {
          nameHe: 'תלייה חופשית',
          nameEn: 'Dead Hang',
          badge: '',
          target: '1:30',
          description: 'משחררת את עמוד השדרה, אחיזה חזקה וכתפיים בריאות',
          tip: '',
          illustration: 'deadHang',
        },
      ]),
    }
  }
  return {
    id,
    title: 'בוקר לפני יום דחיפה',
    meta: '5 תרגילים · כ-6 דקות',
    footerNote: '',
    updatedAt: EPOCH,
    exercises: withIds('b', [
      ...SHARED_OPENERS,
      {
        nameHe: 'הרמות פייק',
        nameEn: 'Pike Compression Lifts',
        badge: '',
        target: '2 × 10',
        description: 'בסיס ל־L-sit, ל־TTB ול־Press to Handstand',
        tip: '',
        illustration: 'pike',
      },
      {
        nameHe: 'החזקת סופרמן',
        nameEn: 'Superman / Arch Hold',
        badge: '',
        target: '1:00',
        description: 'גב תחתון חזק, ההפך של ההולו',
        tip: '',
        illustration: 'superman',
      },
      {
        nameHe: 'עמידת ידיים מול קיר',
        nameEn: 'Chest-to-Wall Handstand',
        badge: '',
        target: '1:00',
        description: 'כתפיים יציבות, ההפך של התלייה',
        tip: 'לפני עמידת הידיים כדאי לסובב את שורשי כפות הידיים 10 שניות',
        illustration: 'handstand',
      },
    ]),
  }
}

export function createDefaultMorningState(today = localDateKey()): MorningRoutineState {
  return {
    startDate: today,
    startDateUpdatedAt: EPOCH,
    routines: { A: defaultMorningRoutine('A'), B: defaultMorningRoutine('B') },
    completions: {},
    weekNotes: {},
    aiReview: {
      intervalDays: MORNING_AI_INTERVAL_DAYS,
      lastReviewAt: null,
      updatedAt: EPOCH,
    },
  }
}

// ---------------------------------------------------------------------------
// Defensive parsing (local storage and cloud JSON are both untrusted shapes)
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function str(value: unknown, fallback = '', max = 300): string {
  return typeof value === 'string' ? value.slice(0, max) : fallback
}

function stamp(value: unknown): string {
  return typeof value === 'string' && value.length >= 10 ? value : EPOCH
}

function dateKeyOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const key = value.slice(0, 10)
  return DATE_KEY_RE.test(key) ? key : null
}

function isRoutineId(value: unknown): value is MorningRoutineId {
  return value === 'A' || value === 'B'
}

const ILLUSTRATION_KINDS = new Set<string>(MORNING_ILLUSTRATIONS.map((i) => i.kind))

function parseExercise(raw: unknown, fallback: MorningExercise): MorningExercise | null {
  if (!isRecord(raw)) return null
  const illustration =
    typeof raw.illustration === 'string' && ILLUSTRATION_KINDS.has(raw.illustration)
      ? (raw.illustration as MorningIllustrationKind)
      : fallback.illustration
  const nameHe = str(raw.nameHe, fallback.nameHe, 80).trim()
  if (!nameHe) return null
  return {
    id: str(raw.id, fallback.id, 40) || fallback.id,
    nameHe,
    nameEn: str(raw.nameEn, '', 80),
    badge: str(raw.badge, '', 30),
    target: str(raw.target, '', 30),
    description: str(raw.description, '', 300),
    tip: str(raw.tip, '', 300),
    illustration,
  }
}

function parseRoutine(raw: unknown, id: MorningRoutineId): MorningRoutineDef {
  const fallback = defaultMorningRoutine(id)
  if (!isRecord(raw)) return fallback
  const rawExercises = Array.isArray(raw.exercises) ? raw.exercises : null
  const exercises = rawExercises
    ? rawExercises
        .slice(0, 12)
        .map((row, i) =>
          parseExercise(row, fallback.exercises[i] ?? { ...fallback.exercises[0], id: `${id.toLowerCase()}${i + 1}` }),
        )
        .filter((row): row is MorningExercise => row != null)
    : fallback.exercises
  return {
    id,
    title: str(raw.title, fallback.title, 80) || fallback.title,
    meta: str(raw.meta, fallback.meta, 80),
    footerNote: str(raw.footerNote, fallback.footerNote, 300),
    exercises: exercises.length ? exercises : fallback.exercises,
    updatedAt: stamp(raw.updatedAt),
  }
}

function parseCompletions(raw: unknown): Record<string, MorningCompletion> {
  const out: Record<string, MorningCompletion> = {}
  if (!isRecord(raw)) return out
  for (const [date, value] of Object.entries(raw)) {
    if (!DATE_KEY_RE.test(date) || !isRecord(value)) continue
    out[date] = {
      done: value.done === true,
      routine: isRoutineId(value.routine) ? value.routine : undefined,
      updatedAt: stamp(value.updatedAt),
    }
  }
  return out
}

function normalizeInterval(value: unknown): number {
  const n = Math.round(Number(value))
  return Number.isFinite(n) && n >= 1 ? Math.min(365, n) : MORNING_AI_INTERVAL_DAYS
}

export function normalizeMorningState(raw: unknown): MorningRoutineState {
  const base = createDefaultMorningState()
  if (!isRecord(raw)) return base
  const routines = isRecord(raw.routines) ? raw.routines : {}
  const review = isRecord(raw.aiReview) ? raw.aiReview : {}
  return {
    startDate: dateKeyOrNull(raw.startDate) ?? base.startDate,
    startDateUpdatedAt: stamp(raw.startDateUpdatedAt),
    routines: {
      A: parseRoutine(routines.A, 'A'),
      B: parseRoutine(routines.B, 'B'),
    },
    completions: parseCompletions(raw.completions),
    weekNotes: parseWeekNotes(raw.weekNotes),
    aiReview: {
      intervalDays: normalizeInterval(review.intervalDays),
      lastReviewAt: dateKeyOrNull(review.lastReviewAt),
      updatedAt: stamp(review.updatedAt),
    },
  }
}

/** Per-entry last-write-wins merge, so two devices never clobber each other. */
export function mergeMorningState(
  local: MorningRoutineState,
  remote: MorningRoutineState,
): MorningRoutineState {
  const completions = { ...local.completions }
  for (const [date, entry] of Object.entries(remote.completions)) {
    const mine = completions[date]
    if (!mine || entry.updatedAt > mine.updatedAt) completions[date] = entry
  }

  let startDate = local.startDate
  let startDateUpdatedAt = local.startDateUpdatedAt
  if (remote.startDateUpdatedAt > local.startDateUpdatedAt) {
    startDate = remote.startDate
    startDateUpdatedAt = remote.startDateUpdatedAt
  } else if (
    remote.startDateUpdatedAt === local.startDateUpdatedAt &&
    remote.startDate < local.startDate
  ) {
    // Neither side set it explicitly: the earliest device's day 1 wins.
    startDate = remote.startDate
  }

  return {
    startDate,
    startDateUpdatedAt,
    routines: {
      A: remote.routines.A.updatedAt > local.routines.A.updatedAt ? remote.routines.A : local.routines.A,
      B: remote.routines.B.updatedAt > local.routines.B.updatedAt ? remote.routines.B : local.routines.B,
    },
    completions,
    weekNotes: mergeWeekNotes(local.weekNotes, remote.weekNotes),
    aiReview: remote.aiReview.updatedAt > local.aiReview.updatedAt ? remote.aiReview : local.aiReview,
  }
}

// ---------------------------------------------------------------------------
// Derived views
// ---------------------------------------------------------------------------

export function completionFor(
  state: MorningRoutineState,
  date: string,
): MorningCompletion | undefined {
  const entry = state.completions[date]
  return entry?.done ? entry : undefined
}

/** Day 1, pulled earlier if the user back-filled days before it. */
export function effectiveMorningStart(state: MorningRoutineState): string {
  let start = state.startDate
  for (const [date, entry] of Object.entries(state.completions)) {
    if (entry.done && date < start) start = date
  }
  return start
}

/** Completions in the day-mark shape used by the shared weekly builder. */
export function morningDayMarks(state: MorningRoutineState): ConsistencyDayMarks {
  const marks: ConsistencyDayMarks = {}
  for (const [date, entry] of Object.entries(state.completions)) {
    marks[date] = entry.done
      ? {
          done: true,
          workoutId: entry.routine,
          workoutName: entry.routine ? MORNING_ROUTINE_LABELS[entry.routine] : undefined,
        }
      : { done: false }
  }
  return marks
}

export function buildMorningWeeks(
  state: MorningRoutineState,
  weekStartsOn: WeekStartDay,
  weeksBack: number | 'all',
): WeekConsistency[] {
  return buildRelativeWeeklyConsistency([], effectiveMorningStart(state), {
    weeksBack,
    target: MORNING_WEEKLY_TARGET,
    dayMarks: morningDayMarks(state),
    weekStartsOn,
    weekNotes: state.weekNotes,
  })
}

/** Alternate from the most recent completed routine (A → B → A …). */
export function suggestedMorningRoutine(
  state: MorningRoutineState,
  today = localDateKey(),
): MorningRoutineId {
  const todays = completionFor(state, today)
  if (todays?.routine) return todays.routine
  const last = Object.entries(state.completions)
    .filter(([date, entry]) => entry.done && entry.routine && date < today)
    .sort(([a], [b]) => b.localeCompare(a))[0]?.[1]
  return last?.routine === 'A' ? 'B' : 'A'
}

/**
 * Set exactly `count` completed days in a week: keeps existing days (and their
 * A/B choice), removes the latest ones first, and fills past days before future.
 */
export function completionsForWeekCount(
  weekStart: Date,
  count: number,
  completions: Record<string, MorningCompletion>,
  fallbackRoutine: MorningRoutineId,
  today = localDateKey(),
  now = new Date().toISOString(),
): Record<string, MorningCompletion> {
  const next = { ...completions }
  const dates = weekDates(weekStart)
  const n = Math.max(0, Math.min(7, Math.round(count)))
  const done = dates.filter((date) => next[date]?.done)

  if (done.length > n) {
    for (const date of done.slice(n)) {
      next[date] = { done: false, updatedAt: now }
    }
    return next
  }

  const candidates = [
    ...dates.filter((date) => !next[date]?.done && date <= today),
    ...dates.filter((date) => !next[date]?.done && date > today),
  ].slice(0, n - done.length)
  const fill = new Set(candidates)

  let last: MorningRoutineId = fallbackRoutine === 'A' ? 'B' : 'A'
  for (const date of dates) {
    const entry = next[date]
    if (entry?.done) {
      if (entry.routine) last = entry.routine
      continue
    }
    if (!fill.has(date)) continue
    const routine: MorningRoutineId = last === 'A' ? 'B' : 'A'
    next[date] = { done: true, routine, updatedAt: now }
    last = routine
  }
  return next
}

/** Week row styling for the 6/7 target with a turquoise 7/7 bonus tier. */
export function morningWeekTone(count: number): { className: string; onDark: boolean } {
  if (count >= 7) {
    return {
      className:
        'bg-gradient-to-l from-teal-500 via-teal-400 to-emerald-400 text-white border border-teal-300 shadow-md shadow-teal-500/25 font-bold',
      onDark: true,
    }
  }
  if (count === 6) return { className: 'bg-blue-600 text-white border border-blue-700', onDark: true }
  if (count === 5) return { className: 'bg-blue-400 text-white border border-blue-500', onDark: true }
  if (count >= 3) return { className: 'bg-sky-200 text-sky-950 border border-sky-300', onDark: false }
  if (count >= 1) return { className: 'bg-sky-50 text-sky-900 border border-sky-200', onDark: false }
  return { className: 'bg-white text-slate-600 border border-slate-200', onDark: false }
}

export function morningStatusLabel(count: number): string {
  if (count >= 7) return 'בונוס 7/7 — מעל היעד!'
  if (count >= MORNING_WEEKLY_TARGET) return 'עמדת ביעד השבועי'
  return `חסרים ${MORNING_WEEKLY_TARGET - count} ימים ליעד`
}
