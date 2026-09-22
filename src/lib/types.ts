export type MacroTargets = {
  calories: number
  protein: number
  carbs: number
  fats: number
}

export type Phase = 'bulk' | 'cut'

export type GoalSettings = {
  startDate: string
  totalDays: number
  targetWeightKg: number | null
  targetBodyFatPct: number | null
}

export type PhaseMacroPresets = {
  bulk: MacroTargets
  cut: MacroTargets
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

/** @deprecated use GoalSettings */
export type ProcessSettings = GoalSettings

export type Exercise = {
  id: string
  name: string
  sets: number
  reps: string
  notes?: string
}

export type WorkoutDay = {
  id: string
  dayNumber: number
  title: string
  focus: string
  exercises: Exercise[]
}

export type WorkoutProgram = {
  id: string
  name: string
  days: WorkoutDay[]
  updatedAt: string
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks'

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

export const PHASE_LABELS: Record<Phase, string> = {
  bulk: 'מסה',
  cut: 'חיטוב',
}
