import { PANTRY_CATEGORY_LABELS, PANTRY_ITEMS, type PantryItem } from '../data/pantry'
import { savedPresetKind } from '../data/defaults'
import { savedItemServingGrams } from './foodUnits'
import { formatNiceNumber, parsePositiveDecimal, roundTo } from './numericInput'
import type { Recipe, SavedMeal, SavedPresetKind } from './types'

export type MacroPer100g = {
  calories: number
  protein: number
  carbs: number
  fats: number
}

export type CatalogSource = 'pantry' | 'recipe' | 'saved'

export type CatalogFood = {
  id: string
  name: string
  brand?: string
  category: string
  aliases: string[]
  servingGrams: number
  servingLabel: string
  calories: number
  protein: number
  carbs: number
  fats: number
  per100g: MacroPer100g
  source: CatalogSource
  kind: SavedPresetKind
}

export type MealIngredientLine = {
  id: string
  name: string
  amount: string
  unit: 'grams' | 'serving'
  servingGrams: number
  servingLabel: string
  calories: number
  protein: number
  carbs: number
  fats: number
  per100g: MacroPer100g
}

export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/['׳`״"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function macrosFromPer100g(per100g: MacroPer100g, grams: number) {
  const f = grams / 100
  return {
    calories: Math.round(per100g.calories * f),
    protein: roundTo(per100g.protein * f, 2),
    carbs: roundTo(per100g.carbs * f, 2),
    fats: roundTo(per100g.fats * f, 2),
  }
}

function per100gFromServing(
  calories: number,
  protein: number,
  carbs: number,
  fats: number,
  servingGrams: number,
): MacroPer100g {
  const grams = servingGrams > 0 ? servingGrams : 100
  const f = 100 / grams
  return {
    calories: roundTo(calories * f, 2),
    protein: roundTo(protein * f, 2),
    carbs: roundTo(carbs * f, 2),
    fats: roundTo(fats * f, 2),
  }
}

export function pantryToCatalog(item: PantryItem): CatalogFood {
  const macros = macrosFromPer100g(item, item.servingGrams)
  return {
    id: item.id,
    name: item.name,
    brand: item.brand,
    category: PANTRY_CATEGORY_LABELS[item.category],
    aliases: item.aliases,
    servingGrams: item.servingGrams,
    servingLabel: item.servingLabel,
    calories: macros.calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fats: macros.fats,
    per100g: {
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fats: item.fats,
    },
    source: 'pantry',
    kind: 'item',
  }
}

export function recipeToCatalog(recipe: Recipe): CatalogFood {
  const servingGrams = recipe.servingGrams && recipe.servingGrams > 0 ? recipe.servingGrams : 100
  return {
    id: `recipe:${recipe.id}`,
    name: recipe.name,
    category: 'מתכון',
    aliases: [...recipe.ingredients, ...recipe.tags],
    servingGrams,
    servingLabel: 'מנה',
    calories: recipe.calories,
    protein: recipe.proteinG,
    carbs: recipe.carbsG,
    fats: recipe.fatsG,
    per100g: per100gFromServing(
      recipe.calories,
      recipe.proteinG,
      recipe.carbsG,
      recipe.fatsG,
      servingGrams,
    ),
    source: 'recipe',
    kind: 'meal',
  }
}

export function savedToCatalog(meal: SavedMeal): CatalogFood {
  const servingGrams = savedItemServingGrams(meal)
  const kind = savedPresetKind(meal)
  return {
    id: `saved:${meal.id}`,
    name: meal.name,
    category: kind === 'meal' ? 'ארוחה שמורה' : 'פריט שמור',
    aliases: meal.notes ? [meal.notes] : [],
    servingGrams,
    servingLabel: 'מנה',
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fats: meal.fats,
    per100g: per100gFromServing(
      meal.calories,
      meal.protein,
      meal.carbs,
      meal.fats,
      servingGrams,
    ),
    source: 'saved',
    kind,
  }
}

export function buildFoodCatalog(
  recipes: Recipe[],
  savedMeals: SavedMeal[],
  excludeSavedId?: string,
): CatalogFood[] {
  const items = PANTRY_ITEMS.map(pantryToCatalog)
  for (const recipe of recipes) {
    items.push(recipeToCatalog(recipe))
  }
  for (const meal of savedMeals) {
    if (meal.id === excludeSavedId) continue
    items.push(savedToCatalog(meal))
  }
  return items
}

export function filterCatalog(
  items: CatalogFood[],
  query: string,
  limit = 8,
): CatalogFood[] {
  const q = normalizeSearch(query)
  if (!q) return []
  const scored: { item: CatalogFood; score: number }[] = []
  for (const item of items) {
    const name = normalizeSearch(item.name)
    const brand = normalizeSearch(item.brand ?? '')
    const category = normalizeSearch(item.category)
    const hay = [name, brand, category, ...item.aliases.map(normalizeSearch)]
    let score = 0
    if (name.startsWith(q) || name.includes(` ${q}`)) score = 120
    else if (brand.startsWith(q)) score = 110
    else if (name.includes(q)) score = 90
    else if (brand.includes(q)) score = 80
    else if (hay.some((h) => h.startsWith(q))) score = 70
    else if (hay.some((h) => h.includes(q))) score = 50
    if (score > 0) scored.push({ item, score: score - name.length * 0.02 })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((row) => row.item)
}

export function catalogDisplayName(item: CatalogFood): string {
  return item.brand ? `${item.name} · ${item.brand}` : item.name
}

export function catalogMacroPreview(item: {
  calories: number
  protein: number
  carbs: number
  fats: number
}): string {
  return [
    `${formatNiceNumber(item.calories, 0)} קק״ל`,
    `ח ${formatNiceNumber(item.protein)}`,
    `פ ${formatNiceNumber(item.carbs)}`,
    `ש ${formatNiceNumber(item.fats)}`,
  ].join(' · ')
}

export function catalogToLine(item: CatalogFood, id: string): MealIngredientLine {
  return {
    id,
    name: catalogDisplayName(item),
    amount: '1',
    unit: 'serving',
    servingGrams: item.servingGrams,
    servingLabel: item.servingLabel,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fats: item.fats,
    per100g: item.per100g,
  }
}

export function emptyIngredientLine(id: string): MealIngredientLine {
  return {
    id,
    name: '',
    amount: '1',
    unit: 'serving',
    servingGrams: 100,
    servingLabel: 'מנה',
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    per100g: { calories: 0, protein: 0, carbs: 0, fats: 0 },
  }
}

export function scaleIngredientLine(line: MealIngredientLine) {
  const amount = parsePositiveDecimal(line.amount)
  if (amount == null) {
    return { calories: 0, protein: 0, carbs: 0, fats: 0, grams: 0 }
  }
  if (line.unit === 'grams') {
    return { ...macrosFromPer100g(line.per100g, amount), grams: amount }
  }
  return {
    calories: Math.round(line.calories * amount),
    protein: roundTo(line.protein * amount, 2),
    carbs: roundTo(line.carbs * amount, 2),
    fats: roundTo(line.fats * amount, 2),
    grams: roundTo(amount * line.servingGrams, 2),
  }
}

export function sumIngredientLines(lines: MealIngredientLine[]) {
  return lines.reduce(
    (acc, line) => {
      if (!line.name.trim()) return acc
      const scaled = scaleIngredientLine(line)
      acc.calories += scaled.calories
      acc.protein = roundTo(acc.protein + scaled.protein, 2)
      acc.carbs = roundTo(acc.carbs + scaled.carbs, 2)
      acc.fats = roundTo(acc.fats + scaled.fats, 2)
      acc.grams = roundTo(acc.grams + scaled.grams, 2)
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fats: 0, grams: 0 },
  )
}

export function formatIngredientNotes(lines: MealIngredientLine[]): string {
  return lines
    .filter((line) => line.name.trim())
    .map((line) => {
      const amount = line.amount.trim() || '1'
      if (line.unit === 'grams') return `${amount} גרם ${line.name}`
      return `${amount} ${line.servingLabel} ${line.name}`
    })
    .join(' · ')
}
