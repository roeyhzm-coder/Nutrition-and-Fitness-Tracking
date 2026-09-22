export type MacroTargets = {
  calories: number
  protein: number
  carbs: number
  fats: number
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

export type ProcessSettings = {
  startDate: string
  totalDays: number
}

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
}

export function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

export function uid() {
  return crypto.randomUUID()
}
