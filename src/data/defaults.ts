import type {
  GoalSettings,
  MacroTargets,
  Phase,
  PhaseMacroPresets,
  SavedMeal,
  WorkoutDay,
  WorkoutProgram,
} from '../lib/types'
import { normalizeWorkoutDay, todayKey, uid } from '../lib/types'
import { DEFAULT_WORKOUT_DAYS, createOfficialPrograms } from './workouts'

export const DEFAULT_MACRO_BULK: MacroTargets = {
  calories: 2800,
  protein: 180,
  carbs: 300,
  fats: 80,
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
  startDate: todayKey(),
  totalDays: 84,
  targetWeightKg: null,
  targetBodyFatPct: null,
  weeklyWorkoutTarget: 5,
  masterStartDate: todayKey(),
  masterTotalDays: 1200,
  masterTargetWeightKg: 80,
  masterTargetBodyFatPct: 9,
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
