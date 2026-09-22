import type {
  GoalSettings,
  MacroTargets,
  Phase,
  PhaseMacroPresets,
  SavedMeal,
  WorkoutDay,
  WorkoutProgram,
} from '../lib/types'
import { todayKey, uid } from '../lib/types'
import { DEFAULT_WORKOUT_DAYS } from './workouts'

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

export const DEFAULT_MACRO_TARGETS = DEFAULT_MACRO_BULK

export const DEFAULT_PHASE_MACROS: PhaseMacroPresets = {
  bulk: DEFAULT_MACRO_BULK,
  cut: DEFAULT_MACRO_CUT,
}

export const DEFAULT_PHASE: Phase = 'bulk'

export const DEFAULT_GOAL: GoalSettings = {
  startDate: todayKey(),
  totalDays: 84,
  targetWeightKg: null,
  targetBodyFatPct: null,
  masterStartDate: todayKey(),
  masterTotalDays: 365,
  masterTargetWeightKg: null,
  masterTargetBodyFatPct: 9,
}

/** @deprecated */
export const DEFAULT_PROCESS = DEFAULT_GOAL

export function createDefaultPrograms(): WorkoutProgram[] {
  const now = new Date().toISOString()
  return [
    {
      id: 'program-bulk',
      name: 'תוכנית מסה',
      days: structuredClone(DEFAULT_WORKOUT_DAYS),
      updatedAt: now,
    },
    {
      id: 'program-cut',
      name: 'תוכנית חיטוב',
      days: structuredClone(DEFAULT_WORKOUT_DAYS).map((day) => ({
        ...day,
        exercises: day.exercises.map((ex) => ({
          ...ex,
          sets: Math.max(2, ex.sets - 1),
        })),
      })),
      updatedAt: now,
    },
  ]
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
  return {
    id: uid(),
    name,
    days: structuredClone(days ?? DEFAULT_WORKOUT_DAYS),
    updatedAt: new Date().toISOString(),
  }
}
