import type { FoodCategory, MealType, Recipe } from '../lib/types'
import { RECIPE_BOOK_RECIPES } from './recipeBookRecipes'

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'ארוחת בוקר',
  lunch: 'ארוחת צהריים',
  dinner: 'ארוחת ערב',
  snacks: 'נשנושים',
}

export const DEFAULT_FOOD_CATEGORIES: FoodCategory[] = [
  { id: 'breakfast', label: 'ארוחת בוקר' },
  { id: 'lunch', label: 'ארוחת צהריים' },
  { id: 'dinner', label: 'ארוחת ערב' },
  { id: 'snacks', label: 'נשנושים' },
]

/** מתכונים עתירי חלבון — ללא דגים/טונה, חרדל ובשר מעובד */
export const DEFAULT_RECIPES: Recipe[] = [
  {
    id: 'recipe-shakshuka',
    name: 'שקשוקה חלבונים וגבינה',
    mealType: 'breakfast',
    proteinG: 32,
    calories: 280,
    carbsG: 8,
    fatsG: 12,
    timeMin: 15,
    tags: ['בוקר'],
    ingredients: ['6 חלבונים', 'גבינה לבנה 5%', 'עגבניות', 'תבלינים'],
    steps: ['לטגן עגבניות', 'להוסיף חלבונים וגבינה', 'לבשל עד מוכן'],
    servingGrams: 300,
  },
  {
    id: 'recipe-yogurt',
    name: 'יוגורט יווני עם אבקת חלבון',
    mealType: 'breakfast',
    proteinG: 40,
    calories: 260,
    carbsG: 18,
    fatsG: 4,
    timeMin: 5,
    tags: ['מהיר'],
    ingredients: ['יוגורט יווני 0%', 'כף אבקת חלבון', 'פירות יער'],
    steps: ['לערבב יוגורט ואבקה', 'להוסיף פירות'],
    servingGrams: 250,
  },
  {
    id: 'recipe-chicken-rice',
    name: 'חזה עוף עם אורז וירקות',
    mealType: 'lunch',
    proteinG: 48,
    calories: 520,
    carbsG: 55,
    fatsG: 10,
    timeMin: 30,
    tags: ['צהריים'],
    ingredients: ['חזה עוף', 'אורז', 'ירקות מאודים', 'שמן זית'],
    steps: ['לבשל אורז', 'לצלות עוף', 'להגיש עם ירקות'],
    servingGrams: 400,
  },
  {
    id: 'recipe-turkey',
    name: 'קציצות הודו עם בטטה',
    mealType: 'lunch',
    proteinG: 42,
    calories: 480,
    carbsG: 40,
    fatsG: 14,
    timeMin: 35,
    tags: ['צהריים'],
    ingredients: ['הודו טחון', 'בטטה', 'תבלינים', 'ביצה'],
    steps: ['לערבב קציצות', 'לאפות', 'להגיש עם בטטה'],
    servingGrams: 350,
  },
  {
    id: 'recipe-steak',
    name: 'סטייק רזה עם סלט',
    mealType: 'dinner',
    proteinG: 45,
    calories: 420,
    carbsG: 12,
    fatsG: 18,
    timeMin: 25,
    tags: ['ערב'],
    ingredients: ['סטייק רזה', 'סלט ירקות', 'שמן זית'],
    steps: ['לצלות סטייק', 'להכין סלט', 'להגיש'],
    servingGrams: 300,
  },
  {
    id: 'recipe-thighs',
    name: 'ירכי עוף פריכות עם ירקות',
    mealType: 'dinner',
    proteinG: 40,
    calories: 390,
    carbsG: 15,
    fatsG: 16,
    timeMin: 35,
    tags: ['ערב'],
    ingredients: ['ירכי עוף ללא עור', 'ירקות שורש', 'תבלינים'],
    steps: ['לתבל', 'לאפות עד מוכן'],
    servingGrams: 350,
  },
  {
    id: 'recipe-shake',
    name: 'שייק חלבון וניל',
    mealType: 'snacks',
    proteinG: 30,
    calories: 180,
    carbsG: 12,
    fatsG: 2,
    timeMin: 3,
    tags: ['נשנוש'],
    ingredients: ['אבקת חלבון', 'חלב דל שומן', 'קרח'],
    steps: ['לבלנדר עד אחיד'],
    servingGrams: 300,
  },
  {
    id: 'recipe-cottage',
    name: 'גבינה לבנה עם מלפפון',
    mealType: 'snacks',
    proteinG: 22,
    calories: 160,
    carbsG: 6,
    fatsG: 5,
    timeMin: 3,
    tags: ['נשנוש'],
    ingredients: ['גבינה לבנה 5%', 'מלפפון', 'מלח'],
    steps: ['לערבב ולהגיש'],
    servingGrams: 200,
  },
  ...RECIPE_BOOK_RECIPES,
]

export function mergeRecipes(existing: Recipe[]): Recipe[] {
  const byId = new Map<string, Recipe>()
  for (const recipe of existing) {
    if (byId.has(recipe.id)) continue
    byId.set(recipe.id, recipe)
  }
  return [...byId.values()]
}

/** Remote rows win on id so a live Supabase pull replaces stale local copies. */
export function adoptRemoteRecipes(local: Recipe[], remote: Recipe[]): Recipe[] {
  const byId = new Map<string, Recipe>()
  for (const recipe of local) byId.set(recipe.id, recipe)
  for (const recipe of remote) byId.set(recipe.id, recipe)
  return [...byId.values()]
}

export function seedRecipesIfEmpty(existing: Recipe[]): Recipe[] {
  return existing.length > 0 ? mergeRecipes(existing) : DEFAULT_RECIPES
}

export function recipesEqual(a: Recipe[], b: Recipe[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  return a.every((r, i) => {
    const n = b[i]
    return (
      n != null &&
      r.id === n.id &&
      r.name === n.name &&
      r.calories === n.calories &&
      r.proteinG === n.proteinG &&
      r.carbsG === n.carbsG &&
      r.fatsG === n.fatsG &&
      r.servings === n.servings &&
      r.description === n.description
    )
  })
}
