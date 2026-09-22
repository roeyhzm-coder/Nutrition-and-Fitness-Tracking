import type { KeyLiftId } from '../data/workouts'

export type SetLog = {
  id: string
  exerciseId: string
  exerciseName: string
  dayId: string
  weightKg: number
  reps: number
  rpe: number
  loggedAt: string
  isKeyLift?: boolean
}

export type WeightEntry = {
  id: string
  weightKg: number
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
  source: 'openfoodfacts' | 'manual' | 'recipe'
}

export type HabitChecks = Record<string, string[]>

export function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

export function isKeyLiftId(id: string): id is KeyLiftId {
  return (
    id === 'weighted-pullup' ||
    id === 'weighted-dip' ||
    id === 'incline-db-press'
  )
}
