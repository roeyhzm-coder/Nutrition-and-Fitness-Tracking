import type {
  GoalSettings,
  MacroTargets,
  Phase,
  PhaseMacroPresets,
  SavedMeal,
  SavedPresetKind,
  UserProfile,
  WeightEntry,
  WorkoutDay,
  WorkoutProgram,
} from '../lib/types'
import {
  DEFAULT_GOAL_START_DATE,
  DEFAULT_MASTER_DAYS,
  DEFAULT_MASTER_NAME,
  DEFAULT_PHASE_DAYS,
  DEFAULT_PHASE_NAME,
  DEFAULT_PHASE_START_KG,
  DEFAULT_PHASE_TARGET_KG,
  DEFAULT_TOTAL_PHASES,
  isSavedPresetKind,
  normalizeWorkoutDay,
  uid,
} from '../lib/types'
import { mergeRestoredSavedMeals } from './pinnedSavedMeals'
import { DEFAULT_WORKOUT_DAYS, createOfficialPrograms } from './workouts'

export const PLAN_SEED_VERSION = 4
export const PLAN_SEED_KEY = 'tn.targetsSeedVersion'

/** Old 6-phase / 1100-day calibration that this seed replaces. */
export function isStaleMasterPlanGoal(
  goal: Partial<GoalSettings> | null | undefined,
) {
  if (!goal) return true
  return (
    Number(goal.masterTotalDays) === 1100 ||
    Number(goal.totalDays) === 196 ||
    goal.startDate === '2026-10-01' ||
    goal.masterStartDate === '2026-09-26' ||
    goal.phaseName?.trim() === 'מסה מבוססת הרגלים' ||
    Number(goal.totalPhases) === 6
  )
}

export function isStaleBulkMacros(
  presets: Partial<PhaseMacroPresets> | null | undefined,
) {
  const calories = Number(presets?.bulk?.calories)
  const protein = Number(presets?.bulk?.protein)
  return calories === 2600 || (calories === 2600 && protein === 155)
}
export const CATALOG_SEED_KEY = 'tn.catalogSeed.v1'

export const DEFAULT_MACRO_BULK: MacroTargets = {
  calories: 2650,
  protein: 160,
  carbs: 330,
  fats: 70,
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
  startDate: DEFAULT_GOAL_START_DATE,
  totalDays: DEFAULT_PHASE_DAYS,
  targetWeightKg: DEFAULT_PHASE_TARGET_KG,
  targetBodyFatPct: 15,
  weeklyWorkoutTarget: 5,
  masterStartDate: DEFAULT_GOAL_START_DATE,
  masterTotalDays: DEFAULT_MASTER_DAYS,
  masterTargetWeightKg: 80,
  masterTargetBodyFatPct: 9,
  masterName: DEFAULT_MASTER_NAME,
  phaseName: DEFAULT_PHASE_NAME,
  phaseNumber: 1,
  totalPhases: DEFAULT_TOTAL_PHASES,
  startWeightKg: DEFAULT_PHASE_START_KG,
}

export const DEFAULT_PROFILE: UserProfile = {
  age: 26,
  heightCm: 182,
  sex: 'male',
  startWeightKg: DEFAULT_PHASE_START_KG,
  waistCircumferenceCm: null,
  neckCircumferenceCm: null,
  estimatedBodyFatPct: 14,
  activityLevel: 'sedentary',
  avgSleepHours: 8,
  workStyle: null,
  avoidFoods: '',
  allergies: '',
  supplements: '',
  injuries: '',
  aiCheckinIntervalDays: 28,
  lastAiExportAt: null,
}

export const SEED_WEIGHT_ENTRY: WeightEntry = {
  id: 'seed-weight-phase1-2026-10-08',
  weightKg: DEFAULT_PHASE_START_KG,
  bodyFatPct: 14,
  loggedAt: `${DEFAULT_GOAL_START_DATE}T12:00:00`,
  note: 'התחלת שלב 1',
}

const LEGACY_SEED_WEIGHT_IDS = new Set([
  'seed-weight-phase1-2026-09-26',
  'seed-weight-phase1-2026-10-01',
  'seed-weight-phase1-2026-10-08',
  'seed-weight-current',
])

/** Seed only empty histories. Never overwrite real weigh-ins. */
export function applySeedWeightLogs(prev: WeightEntry[]): WeightEntry[] {
  const withoutSeed = prev.filter((w) => !LEGACY_SEED_WEIGHT_IDS.has(w.id))
  if (withoutSeed.length > 0) return withoutSeed
  return [SEED_WEIGHT_ENTRY]
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
    id: 'meal-protein-oats',
    name: 'שייק חלבון ושיבולת שועל',
    calories: 420,
    protein: 42,
    carbs: 45,
    fats: 8,
    notes: 'שייק חלבון + 40ג׳ שיבולת שועל + מים/חלב',
    kind: 'meal',
  },
  {
    id: 'meal-eggs-toast',
    name: 'ארוחת ביצים וטוסט',
    calories: 480,
    protein: 32,
    carbs: 35,
    fats: 22,
    notes: '3 ביצים + 2 פרוסות לחם מלא + ירקות',
    kind: 'meal',
  },
]

const DEFAULT_SAVED_MEAL_IDS = new Set(DEFAULT_SAVED_MEALS.map((m) => m.id))
const DEFAULT_SAVED_MEAL_NAMES = new Set(
  DEFAULT_SAVED_MEALS.map((m) => m.name.trim()),
)

export function savedPresetKind(meal: SavedMeal): SavedPresetKind {
  if (isSavedPresetKind(meal.kind)) return meal.kind
  if (DEFAULT_SAVED_MEAL_IDS.has(meal.id)) return 'meal'
  if (DEFAULT_SAVED_MEAL_NAMES.has(meal.name.trim())) return 'meal'
  if (meal.notes && (meal.notes.includes('+') || meal.notes.includes('•'))) {
    return 'meal'
  }
  return 'item'
}

export function normalizeSavedMeal(meal: SavedMeal): SavedMeal {
  return { ...meal, kind: savedPresetKind(meal) }
}

export function mergeSavedMeals(existing: SavedMeal[]): SavedMeal[] {
  return mergeRestoredSavedMeals(existing.map(normalizeSavedMeal))
}

export function seedSavedMealsIfEmpty(existing: SavedMeal[]): SavedMeal[] {
  return existing.length > 0 ? existing.map(normalizeSavedMeal) : DEFAULT_SAVED_MEALS
}

export function savedMealsEqual(a: SavedMeal[], b: SavedMeal[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  return a.every((m, i) => {
    const n = b[i]
    return (
      n != null &&
      m.id === n.id &&
      m.kind === n.kind &&
      m.name === n.name &&
      m.calories === n.calories &&
      m.protein === n.protein &&
      m.carbs === n.carbs &&
      m.fats === n.fats &&
      m.notes === n.notes
    )
  })
}

const PRESET_MEAL_KEYS = ['user_preset_meals', 'tn.savedMeals.v2'] as const

/** Load persisted preset meals, migrating legacy keys. Empty lists stay empty. */
export function loadPresetMeals(): SavedMeal[] {
  try {
    for (const key of PRESET_MEAL_KEYS) {
      const raw = localStorage.getItem(key)
      if (raw == null) continue
      const parsed = JSON.parse(raw) as SavedMeal[]
      if (Array.isArray(parsed)) return parsed.map(normalizeSavedMeal)
    }
  } catch {
    /* fall through */
  }
  return []
}

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
