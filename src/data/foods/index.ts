import { bakeryFoods } from './bakery'
import { commonDishesFoods } from './common_dishes'
import { dairyFoods } from './dairy'
import { grainsPantryFoods } from './grains_pantry'
import { meatFishFoods } from './meat_fish'
import { produceFoods } from './produce'
import { snacksSweetsFoods } from './snacks_sweets'
import { spreadsSaucesFoods } from './spreads_sauces'
import type { IsraeliFood } from './types'

export type { FoodPortion, IsraeliFood, IsraeliFoodRow } from './types'

export const ISRAELI_FOOD_CATEGORIES = [
  'חלב וגבינות',
  'פירות וירקות',
  'לחם ומאפים',
  'בשר דגים וביצים',
  'דגנים ומזווה',
  'ממרחים ורטבים',
  'ממרחים ושמנים',
  'חטיפים ומתוקים',
  'מנות ביתיות',
] as const

export function allIsraeliFoods(): IsraeliFood[] {
  const items = [
    ...dairyFoods,
    ...produceFoods,
    ...bakeryFoods,
    ...meatFishFoods,
    ...grainsPantryFoods,
    ...spreadsSaucesFoods,
    ...snacksSweetsFoods,
    ...commonDishesFoods,
  ]
  const seen = new Set<string>()
  const unique: IsraeliFood[] = []
  for (const item of items) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    unique.push(item)
  }
  return unique
}
