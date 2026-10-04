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
  isSavedPresetKind,
  normalizeWorkoutDay,
  todayKey,
  toLoggedAt,
  uid,
} from '../lib/types'
import { DEFAULT_WORKOUT_DAYS, createOfficialPrograms } from './workouts'

export const PLAN_SEED_VERSION = 2
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
  startDate: '2026-10-01',
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
  startWeightKg: 69.5,
}

export const DEFAULT_PROFILE: UserProfile = {
  age: 26,
  heightCm: 182,
  sex: 'male',
  startWeightKg: 69.5,
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
  id: 'seed-weight-phase1-2026-10-01',
  weightKg: 69.5,
  bodyFatPct: 14,
  loggedAt: '2026-10-01T12:00:00',
  note: 'התחלת שלב 1',
}

const LEGACY_SEED_WEIGHT_IDS = new Set([
  'seed-weight-phase1-2026-09-26',
  'seed-weight-phase1-2026-10-01',
  'seed-weight-current',
])

export function applySeedWeightLogs(prev: WeightEntry[]): WeightEntry[] {
  const withoutSeed = prev.filter((w) => !LEGACY_SEED_WEIGHT_IDS.has(w.id))
  const next = [...withoutSeed, SEED_WEIGHT_ENTRY].sort((a, b) =>
    a.loggedAt.localeCompare(b.loggedAt),
  )
  const latest = next.at(-1)
  if (latest && latest.weightKg === 69.5) return next
  return [
    ...next,
    {
      id: 'seed-weight-current',
      weightKg: 69.5,
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
  const list = (existing.length ? existing : []).map(normalizeSavedMeal)
  const ids = new Set(list.map((m) => m.id))
  const names = new Set(list.map((m) => m.name.trim()))
  const next = [...list]
  for (const preset of DEFAULT_SAVED_MEALS) {
    if (ids.has(preset.id) || names.has(preset.name.trim())) continue
    next.push(preset)
    ids.add(preset.id)
    names.add(preset.name.trim())
  }
  return next.length > 0 ? next : DEFAULT_SAVED_MEALS
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

/** Load persisted preset meals, migrating legacy keys; never returns empty. */
export function loadPresetMeals(): SavedMeal[] {
  try {
    for (const key of PRESET_MEAL_KEYS) {
      const raw = localStorage.getItem(key)
      if (raw == null) continue
      const parsed = JSON.parse(raw) as SavedMeal[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        return mergeSavedMeals(parsed)
      }
    }
  } catch {
    /* fall through */
  }
  return DEFAULT_SAVED_MEALS
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
