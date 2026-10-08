import { PANTRY_ITEMS, type PantryItem } from './pantry'
import { roundTo } from '../lib/numericInput'
import { resolveServingUnits } from '../lib/servingUnits'
import type { SavedMeal, SavedMealComponent } from '../lib/types'

function pantryItem(id: string): PantryItem {
  const item = PANTRY_ITEMS.find((row) => row.id === id)
  if (!item) {
    throw new Error(`Missing pantry item: ${id}`)
  }
  return item
}

function macrosAtGrams(item: PantryItem, grams: number) {
  const f = grams / 100
  return {
    calories: roundTo(item.calories * f, 2),
    protein: roundTo(item.protein * f, 2),
    carbs: roundTo(item.carbs * f, 2),
    fats: roundTo(item.fats * f, 2),
  }
}

function pantryComponent(input: {
  pantryId: string
  name?: string
  amount: string
  grams: number
  unit: 'grams' | 'serving'
  servingGrams: number
  servingLabel: string
}): SavedMealComponent {
  const item = pantryItem(input.pantryId)
  const macros = macrosAtGrams(item, input.grams)
  const units = resolveServingUnits({
    name: input.name ?? item.name,
    brand: item.brand,
    servingGrams: input.servingGrams,
    servingLabel: input.servingLabel,
    family: item.servingFamily,
    serving_units: item.serving_units,
  })
  const unit =
    input.unit === 'grams'
      ? units.find((row) => row.id === 'grams')
      : units.find(
          (row) =>
            row.grams === input.servingGrams && row.id !== 'grams',
        ) ?? units.find((row) => row.is_default) ?? units[0]
  const unitId = unit?.id ?? (input.unit === 'grams' ? 'grams' : 'serving')
  return {
    name: input.name ?? (item.brand ? `${item.name} ${item.brand}` : item.name),
    amount: input.amount,
    unit: input.unit,
    servingGrams: unit?.grams ?? input.servingGrams,
    servingLabel: unit?.name ?? input.servingLabel,
    ...macros,
    per100g: {
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fats: item.fats,
    },
    kind: 'item',
    catalogId: item.id,
    presetId: unitId,
    unitId,
    serving_units: units,
  }
}

function mealFromComponents(
  id: string,
  name: string,
  components: SavedMealComponent[],
  notes: string,
  totals?: { calories: number; protein: number; carbs: number; fats: number },
): SavedMeal {
  const calories = totals?.calories ?? roundTo(
    components.reduce((sum, row) => sum + row.calories, 0),
    2,
  )
  const protein = totals?.protein ?? roundTo(
    components.reduce((sum, row) => sum + row.protein, 0),
    2,
  )
  const carbs = totals?.carbs ?? roundTo(
    components.reduce((sum, row) => sum + row.carbs, 0),
    2,
  )
  const fats = totals?.fats ?? roundTo(
    components.reduce((sum, row) => sum + row.fats, 0),
    2,
  )
  const servingGrams = roundTo(
    components.reduce((sum, row) => {
      const amount = Number(row.amount)
      const grams =
        row.unit === 'grams'
          ? amount
          : amount * row.servingGrams
      return sum + (Number.isFinite(grams) ? grams : 0)
    }, 0),
    2,
  )
  return {
    id,
    name,
    calories,
    protein,
    carbs,
    fats,
    notes,
    kind: 'meal',
    servingGrams,
    components,
  }
}

const toastComponents: SavedMealComponent[] = [
  pantryComponent({
    pantryId: 'pantry-bread-generic',
    name: 'לחם',
    amount: '2',
    grams: 60,
    unit: 'serving',
    servingGrams: 30,
    servingLabel: 'פרוסה (30g)',
  }),
  pantryComponent({
    pantryId: 'pantry-yellow-emek-9',
    name: 'גבינה צהובה 9% עמק',
    amount: '2',
    grams: 40,
    unit: 'serving',
    servingGrams: 20,
    servingLabel: 'פרוסה (20g)',
  }),
]

const cottageBreadComponents: SavedMealComponent[] = [
  pantryComponent({
    pantryId: 'pantry-cottage-tnuva-5',
    name: "קוטג' 5% תנובה",
    amount: '1',
    grams: 250,
    unit: 'serving',
    servingGrams: 250,
    servingLabel: 'גביע שלם (250g)',
  }),
  pantryComponent({
    pantryId: 'pantry-bread-generic',
    name: 'לחם',
    amount: '2',
    grams: 60,
    unit: 'serving',
    servingGrams: 30,
    servingLabel: 'פרוסה (30g)',
  }),
]

const acaiComponents: SavedMealComponent[] = [
  pantryComponent({
    pantryId: 'pantry-protein-myprotein-white-choc',
    name: 'אבקת חלבון Myprotein שוקולד לבן',
    amount: '1',
    grams: 25,
    unit: 'serving',
    servingGrams: 25,
    servingLabel: 'סקופ (25g)',
  }),
  pantryComponent({
    pantryId: 'pantry-banana',
    name: 'בננה',
    amount: '80',
    grams: 80,
    unit: 'grams',
    servingGrams: 100,
    servingLabel: 'יחידה בינונית (100g)',
  }),
  pantryComponent({
    pantryId: 'pantry-berries',
    name: 'תותים קפואים / מנגו',
    amount: '50',
    grams: 50,
    unit: 'grams',
    servingGrams: 80,
    servingLabel: 'מנה (80g)',
  }),
  pantryComponent({
    pantryId: 'pantry-pb-bd',
    name: 'חמאת בוטנים טבעית',
    amount: '1',
    grams: 15,
    unit: 'serving',
    servingGrams: 15,
    servingLabel: 'כף (15g)',
  }),
]

/** Durable custom meals restored into Supabase `user_saved_meals`. */
export const RESTORED_SAVED_MEALS: SavedMeal[] = [
  mealFromComponents(
    'meal-toast',
    'טוסט',
    toastComponents,
    '2 פרוסות לחם (30 גרם לפרוסה) + 2 פרוסות גבינה צהובה 9% עמק (20 גרם לפרוסה)',
    { calories: 259, protein: 15.4, carbs: 29.8, fats: 8.32 },
  ),
  mealFromComponents(
    'meal-cottage-bread',
    "לחם קוטג'",
    cottageBreadComponents,
    "1 גביע קוטג' 5% תנובה (250 גרם) + 2 פרוסות לחם (30 גרם לפרוסה)",
    { calories: 477, protein: 34.85, carbs: 33.9, fats: 14.42 },
  ),
  mealFromComponents(
    'meal-acai-protein',
    'קערת אסאי חלבון',
    acaiComponents,
    '25 גרם אבקת חלבון Myprotein שוקולד לבן + 80 גרם בננה + 50 גרם תותים קפואים / מנגו + 15 גרם חמאת בוטנים טבעית',
  ),
]

/** Fill structured ingredients on restored meals that survived as notes-only. */
export function mergeRestoredSavedMeals(existing: SavedMeal[]): SavedMeal[] {
  const restoredById = new Map(RESTORED_SAVED_MEALS.map((meal) => [meal.id, meal]))
  return existing.map((meal) => {
    const restored = restoredById.get(meal.id)
    if (!restored || meal.components?.length) return meal
    return {
      ...restored,
      ...meal,
      components: restored.components,
      notes: meal.notes?.trim() ? meal.notes : restored.notes,
    }
  })
}
