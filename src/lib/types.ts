export type MacroTargets = {
  calories: number
  protein: number
  carbs: number
  fats: number
}

export type Phase = 'bulk' | 'cut' | 'maintain'

export const PHASES: Phase[] = ['bulk', 'cut', 'maintain']

export type GoalSettings = {
  /** Short-term phase tracker */
  startDate: string
  totalDays: number
  targetWeightKg: number | null
  targetBodyFatPct: number | null
  /** Long-term master plan */
  masterStartDate: string
  masterTotalDays: number
  masterTargetWeightKg: number | null
  masterTargetBodyFatPct: number | null
}

export type PhaseMacroPresets = Record<Phase, MacroTargets>

export type PhaseHistoryEntry = {
  id: string
  phase: Phase
  startDate: string
  endDate: string
  plannedDays: number
  actualDays: number
  startWeightKg: number | null
  endWeightKg: number | null
  avgCalories: number | null
  targetWeightKg: number | null
  macroTargets: MacroTargets
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

export type SavedMeal = {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fats: number
}

export type UserProfile = {
  age: number | null
  heightCm: number | null
  startWeightKg: number | null
  estimatedBodyFatPct: number | null
  avoidFoods: string
  allergies: string
  supplements: string
  injuries: string
}

export const EMPTY_PROFILE: UserProfile = {
  age: null,
  heightCm: null,
  startWeightKg: null,
  estimatedBodyFatPct: null,
  avoidFoods: '',
  allergies: '',
  supplements: '',
  injuries: '',
}

export function normalizeProfile(
  profile: Partial<UserProfile> | null | undefined,
): UserProfile {
  return { ...EMPTY_PROFILE, ...(profile ?? {}) }
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
  sets: number
  reps: string
  /** Free text, e.g. "2-3 דקות", "60 שניות" */
  rest?: string
  weight?: string
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

export type LoggedSet = {
  weightKg: number | null
  reps: number | null
  done: boolean
}

export type LoggedExercise = {
  exerciseId: string
  name: string
  targetSets: number
  targetReps: string
  targetWeight?: string
  rest?: string
  imageUrl?: string
  sets: LoggedSet[]
}

export type WorkoutLog = {
  id: string
  programId: string
  programName: string
  dayId: string
  dayNumber: number
  workoutName: string
  startedAt: string
  completedAt: string
  exercises: LoggedExercise[]
}

export type ActiveWorkout = Omit<WorkoutLog, 'completedAt'>

export type WorkoutTemplate = {
  id: string
  name: string
  exercises: Exercise[]
  updatedAt: string
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
  equipment?: string[]
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

export function normalizeGoal(goal: Partial<GoalSettings> | null | undefined): GoalSettings {
  const start = goal?.startDate || todayKey()
  return {
    startDate: start,
    totalDays: goal?.totalDays ?? 84,
    targetWeightKg: goal?.targetWeightKg ?? null,
    targetBodyFatPct: goal?.targetBodyFatPct ?? null,
    masterStartDate: goal?.masterStartDate || start,
    masterTotalDays: goal?.masterTotalDays ?? 1200,
    masterTargetWeightKg: goal?.masterTargetWeightKg ?? 80,
    masterTargetBodyFatPct: goal?.masterTargetBodyFatPct ?? 9,
  }
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
  bulk: 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20',
  cut: 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20',
  maintain: 'bg-orange-400 text-slate-950 shadow-lg shadow-orange-400/20',
}

export function isPhase(value: unknown): value is Phase {
  return typeof value === 'string' && (PHASES as string[]).includes(value)
}
