import type {
  GoalSettings,
  MacroTargets,
  Phase,
  PhaseMacroPresets,
  SavedMeal,
  UserProfile,
  WeightEntry,
  WorkoutDay,
  WorkoutProgram,
} from '../lib/types'
import { normalizeWorkoutDay, todayKey, toLoggedAt, uid } from '../lib/types'
import { DEFAULT_WORKOUT_DAYS, createOfficialPrograms } from './workouts'

export const PLAN_SEED_VERSION = 1
export const PLAN_SEED_KEY = 'tn.targetsSeedVersion'

export const DEFAULT_MACRO_BULK: MacroTargets = {
  calories: 2600,
  protein: 155,
  carbs: 350,
  fats: 65,
}

export const DEFAULT_MACRO_CUT: MacroTargets = {
  calories: 2000,
  protein: 190,
  carbs: 160,
  fats: 55,
}

export const DEFAULT_MACRO_MAINTAIN: MacroTargets = {
  calories: 2400,
  protein: 180,
  carbs: 240,
  fats: 70,
}

export const DEFAULT_MACRO_TARGETS = DEFAULT_MACRO_BULK

export const DEFAULT_PHASE_MACROS: PhaseMacroPresets = {
  bulk: DEFAULT_MACRO_BULK,
  cut: DEFAULT_MACRO_CUT,
  maintain: DEFAULT_MACRO_MAINTAIN,
}

export function normalizeMacroPresets(
  presets: Partial<PhaseMacroPresets> | null | undefined,
): PhaseMacroPresets {
  return { ...DEFAULT_PHASE_MACROS, ...(presets ?? {}) }
}

export const DEFAULT_PHASE: Phase = 'bulk'

export const DEFAULT_GOAL: GoalSettings = {
  startDate: '2026-09-26',
  totalDays: 196,
  targetWeightKg: 75.5,
  targetBodyFatPct: 15,
  weeklyWorkoutTarget: 5,
  masterStartDate: '2026-09-26',
  masterTotalDays: 1100,
  masterTargetWeightKg: 80,
  masterTargetBodyFatPct: 9,
  masterName: 'גוף אל יווני',
  phaseName: 'מסה מבוססת הרגלים',
  phaseNumber: 1,
  totalPhases: 6,
  startWeightKg: 70,
}

export const DEFAULT_PROFILE: UserProfile = {
  age: 26,
  heightCm: 182,
  sex: 'male',
  startWeightKg: 70,
  estimatedBodyFatPct: 14,
  activityLevel: 'sedentary',
  avgSleepHours: 8,
  workStyle: null,
  avoidFoods: '',
  allergies: '',
  supplements: '',
  injuries: '',
}

export const SEED_WEIGHT_ENTRY: WeightEntry = {
  id: 'seed-weight-phase1-2026-09-26',
  weightKg: 70,
  bodyFatPct: 14,
  loggedAt: '2026-09-26T12:00:00',
  note: 'התחלת שלב 1',
}

export function applySeedWeightLogs(prev: WeightEntry[]): WeightEntry[] {
  const withoutSeed = prev.filter(
    (w) =>
      w.id !== SEED_WEIGHT_ENTRY.id && w.id !== 'seed-weight-current',
  )
  const next = [...withoutSeed, SEED_WEIGHT_ENTRY].sort((a, b) =>
    a.loggedAt.localeCompare(b.loggedAt),
  )
  const latest = next.at(-1)
  if (latest && latest.weightKg === 70) return next
  return [
    ...next,
    {
      id: 'seed-weight-current',
      weightKg: 70,
      bodyFatPct: 14,
      loggedAt: toLoggedAt(todayKey()),
      note: 'משקל עדכני',
    },
  ]
}

/** @deprecated */
export const DEFAULT_PROCESS = DEFAULT_GOAL

export function createDefaultPrograms(): WorkoutProgram[] {
  return createOfficialPrograms().map((p) => ({
    ...p,
    days: p.days.map((d) => normalizeWorkoutDay(d)),
  }))
}

export const DEFAULT_SAVED_MEALS: SavedMeal[] = [
  {
    id: 'meal-breakfast',
    name: 'ארוחת בוקר קבועה',
    calories: 450,
    protein: 40,
    carbs: 35,
    fats: 12,
  },
  {
    id: 'meal-lunch',
    name: 'ארוחת צהריים קבועה',
    calories: 650,
    protein: 50,
    carbs: 60,
    fats: 18,
  },
]

export function cloneProgram(
  name: string,
  days?: WorkoutDay[],
): WorkoutProgram {
  const source = days ?? DEFAULT_WORKOUT_DAYS
  return {
    id: uid(),
    name,
    days: structuredClone(source).map((d) =>
      normalizeWorkoutDay({
        ...d,
        id: uid(),
        sessions: (d.sessions ?? []).map((s) => ({
          ...s,
          id: uid(),
          exercises: s.exercises.map((ex) => ({ ...ex, id: uid() })),
        })),
        exercises: (d.exercises ?? []).map((ex) => ({ ...ex, id: uid() })),
      }),
    ),
    updatedAt: new Date().toISOString(),
  }
}
