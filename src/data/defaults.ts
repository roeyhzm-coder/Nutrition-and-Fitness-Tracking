import type { MacroTargets, ProcessSettings, SavedMeal } from '../lib/types'
import { todayKey } from '../lib/types'

export const DEFAULT_MACRO_TARGETS: MacroTargets = {
  calories: 2400,
  protein: 180,
  carbs: 220,
  fats: 70,
}

export const DEFAULT_PROCESS: ProcessSettings = {
  startDate: todayKey(),
  totalDays: 84,
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
