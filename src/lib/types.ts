export type MacroTargets = {
  calories: number
  protein: number
  carbs: number
  fats: number
}

export type Phase = 'bulk' | 'cut' | 'maintain'

export const PHASES: Phase[] = ['bulk', 'cut', 'maintain']

export type PhaseResult = 'completed' | 'aborted'

export const PHASE_RESULT_LABELS: Record<PhaseResult, string> = {
  completed: 'הושלם',
  aborted: 'הופסק',
}

export type GoalSettings = {
  /** Short-term phase tracker */
  startDate: string
  totalDays: number
  targetWeightKg: number | null
  targetBodyFatPct: number | null
  /** Weekly workout-day target used by consistency tracking */
  weeklyWorkoutTarget: number
  /** Long-term master plan */
  masterStartDate: string
  masterTotalDays: number
  masterTargetWeightKg: number | null
  masterTargetBodyFatPct: number | null
  masterName: string
  phaseName: string
  phaseNumber: number
  totalPhases: number
  /** Weight at the start of the current phase */
  startWeightKg: number | null
}

export type PhaseMacroPresets = Record<Phase, MacroTargets>

export type PhaseHistoryEntry = {
  id: string
  phase: Phase
  name?: string
  startDate: string
  endDate: string
  plannedDays: number
  actualDays: number
  startWeightKg: number | null
  endWeightKg: number | null
  startBodyFatPct?: number | null
  endBodyFatPct?: number | null
  avgCalories: number | null
  targetWeightKg: number | null
  macroTargets: MacroTargets
  result?: PhaseResult
}

export type SetLog = {
  id: string
  exerciseId: string
  exerciseName: string
  dayId: string
  weightKg: number
  reps: number
  rpe: number
  loggedAt: string
}

export type WeightEntry = {
  id: string
  weightKg: number
  bodyFatPct?: number | null
  loggedAt: string
  note?: string
}

export type FoodLogEntry = {
  id: string
  name: string
  grams: number
  calories: number
  protein: number
  carbs: number
  fats: number
  loggedAt: string
  source: 'openfoodfacts' | 'manual' | 'recipe' | 'saved-meal'
}

export type HabitChecks = Record<string, string[]>

export type CustomHabit = {
  id: string
  label: string
}

export type RoutineTimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime'

export type RoutineTimeframe = 'forever' | 'period'

export const ROUTINE_TIMEFRAMES: RoutineTimeframe[] = ['forever', 'period']

export const ROUTINE_TIMEFRAME_LABELS: Record<RoutineTimeframe, string> = {
  forever: 'לתמיד (ללא הגבלת זמן)',
  period: 'לתקופה מוגדרת',
}

export function isRoutineTimeframe(value: unknown): value is RoutineTimeframe {
  return value === 'forever' || value === 'period'
}

export const ROUTINE_TIMES: RoutineTimeOfDay[] = [
  'morning',
  'afternoon',
  'evening',
  'anytime',
]

export const ROUTINE_TIME_LABELS: Record<RoutineTimeOfDay, string> = {
  morning: 'בוקר',
  afternoon: 'צהריים',
  evening: 'ערב',
  anytime: 'ללא שעה',
}

export function isRoutineTime(value: unknown): value is RoutineTimeOfDay {
  return (
    typeof value === 'string' &&
    (ROUTINE_TIMES as readonly string[]).includes(value)
  )
}

export type Routine = {
  id: string
  title: string
  targetMinutes: number
  weeklyTargetDays: number
  timeOfDay: RoutineTimeOfDay
  completedDates: string[]
  createdAt: string
  /** Forever (no end) vs a defined target window. Defaults to forever. */
  timeframe: RoutineTimeframe
  /** Inclusive window start (YYYY-MM-DD). */
  startsOn: string
  /** Inclusive window end (YYYY-MM-DD); null when forever. */
  endsOn: string | null
  /** Target length in days; null when forever. */
  durationDays: number | null
  /** ISO timestamp when the user archived a completed/expired routine. */
  archivedAt: string | null
}

export type ServingUnit = {
  id: string
  name: string
  grams: number
  is_default?: boolean
}

export type SavedPresetKind = 'item' | 'meal'

export function isSavedPresetKind(value: unknown): value is SavedPresetKind {
  return value === 'item' || value === 'meal'
}

export type SavedMealComponent = {
  name: string
  amount: string
  unit: 'grams' | 'serving'
  servingGrams: number
  servingLabel: string
  calories: number
  protein: number
  carbs: number
  fats: number
  per100g: {
    calories: number
    protein: number
    carbs: number
    fats: number
  }
  kind?: SavedPresetKind
  catalogId?: string
  presetId?: string
  unitId?: string
  serving_units?: ServingUnit[]
}

export type SavedMeal = {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fats: number
  /** Optional items list or free-text notes for the preset. */
  notes?: string
  /** Individual staple vs a complete meal/recipe. Older records may omit this. */
  kind?: SavedPresetKind
  /** Grams represented by the stored macros (one unit / serving). */
  servingGrams?: number
  /** Structured composer lines so a saved meal can be reopened and scaled. */
  components?: SavedMealComponent[]
  serving_units?: ServingUnit[]
}

export type Sex = 'male' | 'female'

export const SEX_LABELS: Record<Sex, string> = {
  male: 'זכר',
  female: 'נקבה',
}

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active'

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'יושבני',
  light: 'קלה',
  moderate: 'בינונית',
  active: 'פעילה',
  very_active: 'פעילה מאוד',
}

export type WorkStyle = 'sitting' | 'mixed' | 'moving'

export const WORK_STYLE_LABELS: Record<WorkStyle, string> = {
  sitting: 'ישיבה',
  mixed: 'משולב',
  moving: 'תנועה',
}

export type UserProfile = {
  age: number | null
  heightCm: number | null
  sex: Sex | null
  startWeightKg: number | null
  waistCircumferenceCm: number | null
  neckCircumferenceCm: number | null
  /** Stored Navy-formula result. Never a manual input — derived from waist, neck, height. */
  estimatedBodyFatPct: number | null
  activityLevel: ActivityLevel | null
  avgSleepHours: number | null
  workStyle: WorkStyle | null
  avoidFoods: string
  allergies: string
  supplements: string
  injuries: string
  /** Preferred days between AI export check-ins. */
  aiCheckinIntervalDays: number
  /** Last successful AI prompt copy (YYYY-MM-DD). */
  lastAiExportAt: string | null
}

export const EMPTY_PROFILE: UserProfile = {
  age: null,
  heightCm: null,
  sex: null,
  startWeightKg: null,
  waistCircumferenceCm: null,
  neckCircumferenceCm: null,
  estimatedBodyFatPct: null,
  activityLevel: null,
  avgSleepHours: null,
  workStyle: null,
  avoidFoods: '',
  allergies: '',
  supplements: '',
  injuries: '',
  aiCheckinIntervalDays: 28,
  lastAiExportAt: null,
}

function normalizeIntervalDays(value: unknown, fallback = 28): number {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return fallback
  return Math.min(365, Math.max(1, n))
}

function nullablePositiveNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function normalizeProfile(
  profile: Partial<UserProfile> | null | undefined,
): UserProfile {
  const next = { ...EMPTY_PROFILE, ...(profile ?? {}) }
  const heightCm = nullablePositiveNumber(next.heightCm)
  const waistCircumferenceCm = nullablePositiveNumber(next.waistCircumferenceCm)
  const neckCircumferenceCm = nullablePositiveNumber(next.neckCircumferenceCm)
  const computedFat = calcMaleNavyBodyFatPct(
    waistCircumferenceCm,
    neckCircumferenceCm,
    heightCm,
  )
  return {
    ...next,
    heightCm,
    waistCircumferenceCm,
    neckCircumferenceCm,
    estimatedBodyFatPct:
      computedFat ?? nullablePositiveNumber(next.estimatedBodyFatPct),
    aiCheckinIntervalDays: normalizeIntervalDays(
      profile?.aiCheckinIntervalDays ?? next.aiCheckinIntervalDays,
    ),
    lastAiExportAt:
      typeof next.lastAiExportAt === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(next.lastAiExportAt.slice(0, 10))
        ? next.lastAiExportAt.slice(0, 10)
        : null,
  }
}

export type UserProfileMeasurementColumns = {
  waist_circumference?: unknown
  neck_circumference?: unknown
  body_fat_percentage?: unknown
}

/** Overlay dedicated user_profile columns onto the JSON profile (columns win). */
export function mergeProfileMeasurementColumns(
  profile: Partial<UserProfile> | null | undefined,
  columns: UserProfileMeasurementColumns | null | undefined,
): UserProfile {
  return normalizeProfile({
    ...profile,
    waistCircumferenceCm:
      nullablePositiveNumber(columns?.waist_circumference) ??
      profile?.waistCircumferenceCm,
    neckCircumferenceCm:
      nullablePositiveNumber(columns?.neck_circumference) ??
      profile?.neckCircumferenceCm,
    estimatedBodyFatPct:
      nullablePositiveNumber(columns?.body_fat_percentage) ??
      profile?.estimatedBodyFatPct,
  })
}

export function profileMeasurementColumns(profile: UserProfile | null | undefined) {
  const p = normalizeProfile(profile)
  return {
    waist_circumference: p.waistCircumferenceCm,
    neck_circumference: p.neckCircumferenceCm,
    body_fat_percentage: p.estimatedBodyFatPct,
  }
}

export type Intensity = 'low' | 'moderate' | 'high'

export const INTENSITY_LABELS: Record<Intensity, string> = {
  low: 'קלה',
  moderate: 'בינונית',
  high: 'גבוהה',
}

export type ActivityLog = {
  id: string
  sport: string
  durationMin: number
  intensity: Intensity | null
  notes?: string
  loggedAt: string
}

export type LifestyleEntry = {
  steps: number | null
  sleepHours: number | null
  /** 1–10 subjective recovery score */
  recovery: number | null
}

/** Keyed by YYYY-MM-DD */
export type LifestyleLogs = Record<string, LifestyleEntry>

/** @deprecated use GoalSettings */
export type ProcessSettings = GoalSettings

export type Exercise = {
  id: string
  name: string
  /** Default set count used when starting / loading defaults. */
  sets: number
  /** Default / prescribed reps (free text, e.g. "8-12"); numeric part seeds set reps. */
  reps: string
  /** Free text, e.g. "2-3 דקות", "60 שניות" */
  rest?: string
  /** Default / prescribed weight (free text); numeric part seeds set weightKg. */
  weight?: string
  /** Preferred numeric default weight for autofill. */
  defaultWeightKg?: number | null
  /** Preferred numeric default reps for autofill. */
  defaultReps?: number | null
  notes?: string
  /** Demo video / external link */
  mediaUrl?: string
  imageUrl?: string
}

/** A full workout block slotted into a day (from library or custom). */
export type DaySession = {
  id: string
  name: string
  sourceTemplateId?: string | null
  estimatedCalories?: number | null
  exercises: Exercise[]
}

export type WorkoutDay = {
  id: string
  /** 1 = Sunday … 7 = Saturday */
  dayNumber: number
  title: string
  focus: string
  isRest?: boolean
  /** Modular slotted workouts (e.g. Push + Swim on the same day). */
  sessions: DaySession[]
  /** Standalone exercises not part of a slotted session. */
  exercises: Exercise[]
}

export type WorkoutProgram = {
  id: string
  name: string
  days: WorkoutDay[]
  updatedAt: string
  /** Set on built-in programs; older versions get replaced on load. */
  planVersion?: number
}

export type DayPlan =
  | { type: 'empty' }
  | { type: 'rest' }
  | { type: 'template'; templateId: string }

export const WEEKDAYS = [
  'ראשון',
  'שני',
  'שלישי',
  'רביעי',
  'חמישי',
  'שישי',
  'שבת',
] as const

export const WEEKDAY_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'] as const

/** dayNumber (1–7) of the given date's weekday. */
export function weekdayNumber(d = new Date()) {
  return d.getDay() + 1
}

export function localDateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseLocalDateKey(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const parsed = new Date(y || 1970, (m || 1) - 1, d || 1)
  parsed.setHours(0, 0, 0, 0)
  return parsed
}

export type LoggedSet = {
  weightKg: number | null
  reps: number | null
  done: boolean
  /** Optional RPE 1–10 captured on the set. */
  rpe?: number | null
}

export type LoggedExercise = {
  exerciseId: string
  name: string
  targetSets: number
  targetReps: string
  targetWeight?: string
  /** Numeric defaults mirrored from the exercise definition. */
  defaultWeightKg?: number | null
  defaultReps?: number | null
  rest?: string
  imageUrl?: string
  sets: LoggedSet[]
}

export type WorkoutLog = {
  id: string
  programId: string
  programName: string
  /** Numeric block (1, 2, …) derived from the program; kept for history. */
  blockNumber?: number | null
  dayId: string
  dayNumber: number
  workoutName: string
  startedAt: string
  completedAt: string
  /** Calendar day the session is attributed to (YYYY-MM-DD). */
  performedOn?: string
  /** Estimated calories burned for this session. */
  estimatedCalories?: number | null
  exercises: LoggedExercise[]
}

export type ActiveWorkout = Omit<WorkoutLog, 'completedAt'>

export type WorkoutTemplate = {
  id: string
  name: string
  exercises: Exercise[]
  updatedAt: string
  estimatedCalories?: number | null
}

export type FocusTrackTimeframe = 'forever' | 'period'

export type FocusTrack = {
  id: string
  name: string
  weeklyTargetDays: number
  estimatedCalories: number
  timeframe: FocusTrackTimeframe
  durationMonths: number | null
  startsOn: string
  endsOn: string | null
  completedDates: string[]
  archivedAt: string | null
  createdAt: string
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks'

export type FoodCategory = {
  id: string
  label: string
}

export type Recipe = {
  id: string
  name: string
  mealType: MealType
  proteinG: number
  calories: number
  carbsG: number
  fatsG: number
  timeMin: number
  tags: string[]
  ingredients: string[]
  steps: string[]
  image?: string
  categories?: string[]
  /** Legacy/single-label category from some recipe sources. */
  category?: string
  equipment?: string[]
  /** Grams for one serving; stored macros are per this weight. */
  servingGrams?: number
  /** Recipe yield. Macros on the row are divided by this when > 1. */
  servings?: number
  /** Total cooked weight of the full batch. */
  batchGrams?: number
  /** Optional blurb from the recipe source. */
  description?: string
}

export function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

export function uid() {
  return crypto.randomUUID()
}

export function calcProcessDay(startDate: string, totalDays: number) {
  const start = new Date(startDate)
  const today = new Date()
  start.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const raw = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1
  return Math.min(Math.max(raw, 1), Math.max(totalDays, 1))
}

function finitePositive(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function normalizeGoal(goal: Partial<GoalSettings> | null | undefined): GoalSettings {
  const start = goal?.startDate || '2026-10-01'
  const weekly = Number(goal?.weeklyWorkoutTarget)
  return {
    startDate: start,
    totalDays: finitePositive(goal?.totalDays, 196),
    targetWeightKg: goal?.targetWeightKg ?? 75.5,
    targetBodyFatPct: goal?.targetBodyFatPct ?? 15,
    weeklyWorkoutTarget:
      Number.isFinite(weekly) && weekly > 0 ? Math.round(weekly) : 5,
    masterStartDate: goal?.masterStartDate || start,
    masterTotalDays: finitePositive(goal?.masterTotalDays, 1100),
    masterTargetWeightKg: goal?.masterTargetWeightKg ?? 80,
    masterTargetBodyFatPct: goal?.masterTargetBodyFatPct ?? 9,
    masterName: goal?.masterName?.trim() || 'גוף אל יווני',
    phaseName: goal?.phaseName?.trim() || 'מסה מבוססת הרגלים',
    phaseNumber: Math.max(1, Math.round(finitePositive(goal?.phaseNumber, 1))),
    totalPhases: Math.max(1, Math.round(finitePositive(goal?.totalPhases, 6))),
    startWeightKg: goal?.startWeightKg ?? 69.5,
  }
}

/** US Navy / Hodgdon male formula using centimeters. */
export function calcMaleNavyBodyFatPct(
  waistCm: number | null | undefined,
  neckCm: number | null | undefined,
  heightCm: number | null | undefined,
): number | null {
  if (
    waistCm == null ||
    neckCm == null ||
    heightCm == null ||
    !Number.isFinite(waistCm) ||
    !Number.isFinite(neckCm) ||
    !Number.isFinite(heightCm) ||
    waistCm <= 0 ||
    neckCm <= 0 ||
    heightCm <= 0 ||
    waistCm <= neckCm
  ) {
    return null
  }
  const denom =
    1.0324 -
    0.19077 * Math.log10(waistCm - neckCm) +
    0.15456 * Math.log10(heightCm)
  if (!Number.isFinite(denom) || denom === 0) return null
  const pct = 495 / denom - 450
  if (!Number.isFinite(pct) || pct <= 0 || pct >= 75) return null
  return Math.round(pct * 100) / 100
}

export function navyBodyFatValidationMessage(
  waistCm: number | null | undefined,
  neckCm: number | null | undefined,
  heightCm: number | null | undefined,
): string | null {
  const waistFilled = waistCm != null
  const neckFilled = neckCm != null
  if (!waistFilled && !neckFilled) return null
  if (!waistFilled || !neckFilled) {
    return 'יש להזין היקף מותניים והיקף צוואר.'
  }
  if (waistCm! <= 0 || neckCm! <= 0) {
    return 'ההיקפים חייבים להיות מספרים חיוביים.'
  }
  if (waistCm! <= neckCm!) {
    return 'היקף המותניים חייב להיות גדול מהיקף הצוואר.'
  }
  if (heightCm == null || heightCm <= 0) {
    return 'חסר גובה בפרופיל — לא ניתן לחשב אחוז שומן.'
  }
  if (calcMaleNavyBodyFatPct(waistCm, neckCm, heightCm) == null) {
    return 'לא ניתן לחשב אחוז שומן מהמדידות שהוזנו.'
  }
  return null
}

export function calcBmi(
  weightKg: number | null | undefined,
  heightCm: number | null | undefined,
): number | null {
  if (
    weightKg == null ||
    heightCm == null ||
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    weightKg <= 0 ||
    heightCm <= 0
  ) {
    return null
  }
  return weightKg / (heightCm / 100) ** 2
}

export function toLoggedAt(date?: string | null) {
  if (!date) return new Date().toISOString()
  if (date.includes('T')) return date
  return `${date}T12:00:00`
}

/** Flatten all exercises on a day (sessions + standalone). */
export function dayAllExercises(day: WorkoutDay): Exercise[] {
  return [
    ...(day.sessions ?? []).flatMap((s) => s.exercises),
    ...(day.exercises ?? []),
  ]
}

export function normalizeWorkoutDay(
  day: Partial<WorkoutDay> & {
    id: string
    dayNumber: number
    title: string
  },
): WorkoutDay {
  const sessions = Array.isArray(day.sessions) ? day.sessions : []
  const exercises = Array.isArray(day.exercises) ? day.exercises : []

  // Legacy flat days → one session so existing programs keep their content
  if (sessions.length === 0 && exercises.length > 0) {
    return {
      id: day.id,
      dayNumber: day.dayNumber,
      title: day.title,
      focus: day.focus ?? '',
      isRest: false,
      sessions: [
        {
          id: `${day.id}-session-legacy`,
          name: day.focus || day.title || 'אימון',
          sourceTemplateId: null,
          exercises,
        },
      ],
      exercises: [],
    }
  }

  return {
    id: day.id,
    dayNumber: day.dayNumber,
    title: day.title,
    focus: day.focus ?? '',
    isRest: day.isRest ?? false,
    sessions,
    exercises,
  }
}

/** Always Sunday–Saturday; older N-day programs fill from Sunday onward. */
export function normalizeWorkoutProgram(program: WorkoutProgram): WorkoutProgram {
  const byNumber = new Map(program.days.map((d) => [d.dayNumber, d]))
  const days = WEEKDAYS.map((name, i) => {
    const dayNumber = i + 1
    const existing = byNumber.get(dayNumber)
    return normalizeWorkoutDay({
      ...(existing ?? { id: `day-${dayNumber}`, focus: '' }),
      dayNumber,
      title: name,
    })
  })
  return { ...program, days }
}

export const PHASE_LABELS: Record<Phase, string> = {
  bulk: 'מסה',
  cut: 'חיטוב',
  maintain: 'תחזוקה',
}

export const PHASE_ACTIVE_CLASS: Record<Phase, string> = {
  bulk: 'bg-blue-600 text-white shadow-lg shadow-blue-600/20',
  cut: 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20',
  maintain: 'bg-orange-500 text-white shadow-lg shadow-orange-500/20',
}

export function isPhase(value: unknown): value is Phase {
  return typeof value === 'string' && (PHASES as string[]).includes(value)
}
