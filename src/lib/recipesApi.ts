import type { MealType, Recipe } from './types'
import { supabase } from './supabase'

export const DEFAULT_SERVING_GRAMS = 150

export type SupabaseIngredient = {
  item?: string
  name?: string
  unit?: string
  amount?: number | string
}

export type SupabaseRecipeRow = {
  id: string
  title: string
  image?: string | null
  image_url?: string | null
  categories?: string[] | null
  equipment?: string[] | null
  ingredients?: SupabaseIngredient[] | string[] | null
  steps?: string[] | null
  macros?: Record<string, number | string> | null
  base_servings?: number | null
}

function num(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function mapMealType(categories: string[] = []): MealType {
  const joined = categories.join(' ').toLowerCase()
  if (joined.includes('בוקר')) return 'breakfast'
  if (joined.includes('צהריים') || joined.includes('צהרים')) return 'lunch'
  if (joined.includes('ערב')) return 'dinner'
  if (
    joined.includes('נשנוש') ||
    joined.includes('גליד') ||
    joined.includes('קרימי') ||
    joined.includes('creami')
  ) {
    return 'snacks'
  }
  return 'snacks'
}

function formatIngredient(ing: SupabaseIngredient | string): string {
  if (typeof ing === 'string') return ing
  const name = ing.name || ing.item || 'מרכיב'
  const amount = ing.amount != null && ing.amount !== '' ? String(ing.amount) : ''
  const unit = ing.unit ?? ''
  return [amount, unit, name].filter(Boolean).join(' ').trim()
}

function isGramUnit(unit: string) {
  const u = unit.trim().toLowerCase()
  return u === 'g' || u === 'gram' || u === 'grams' || u === 'גרם'
}

function gramsFromIngredientText(text: string): number {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:גרם|g\b)/i)
  return match ? num(match[1]) : 0
}

function sumIngredientGrams(
  ingredients: Array<SupabaseIngredient | string> | null | undefined,
): number {
  let total = 0
  for (const ing of ingredients ?? []) {
    if (typeof ing === 'string') {
      total += gramsFromIngredientText(ing)
      continue
    }
    if (isGramUnit(ing.unit ?? '')) {
      total += num(ing.amount)
      continue
    }
    total += gramsFromIngredientText(formatIngredient(ing))
  }
  return total
}

function servingGramsFromMacros(
  macros: Record<string, number | string>,
): number {
  const candidates = [
    macros.grams,
    macros.serving_grams,
    macros.servingGrams,
    macros.serving_weight,
    macros.weight_g,
    macros['גרם'],
  ]
  for (const value of candidates) {
    const n = num(value)
    if (n > 0) return Math.round(n)
  }
  return 0
}

export function resolveServingGrams(
  recipe: Pick<Recipe, 'servingGrams' | 'ingredients'>,
): number {
  const stored = num(recipe.servingGrams)
  if (stored > 0) return Math.round(stored)
  const fromIngredients = sumIngredientGrams(recipe.ingredients)
  return fromIngredients > 0 ? Math.round(fromIngredients) : DEFAULT_SERVING_GRAMS
}

export function mapSupabaseRecipe(row: SupabaseRecipeRow): Recipe {
  const macros = row.macros ?? {}
  const image = row.image_url || row.image || undefined
  const ingredients = (row.ingredients ?? []).map(formatIngredient)
  const servingGrams =
    servingGramsFromMacros(macros) ||
    Math.round(sumIngredientGrams(row.ingredients)) ||
    undefined
  return {
    id: row.id,
    name: row.title,
    mealType: mapMealType(row.categories ?? []),
    proteinG: num(macros.protein ?? macros['חלבון']),
    calories: num(macros.calories ?? macros['קלוריות']),
    carbsG: num(macros.carbs ?? macros['פחמימות']),
    fatsG: num(macros.fat ?? macros['שומן']),
    timeMin: 10,
    tags: row.categories ?? [],
    ingredients,
    steps: row.steps ?? [],
    image: image ?? undefined,
    categories: row.categories ?? [],
    equipment: row.equipment ?? [],
    servingGrams,
  }
}

const SELECT_WITH_URL =
  'id, title, image, image_url, categories, equipment, ingredients, steps, macros, base_servings'
const SELECT_BASIC =
  'id, title, image, categories, equipment, ingredients, steps, macros, base_servings'

export async function fetchRecipesFromSupabase(): Promise<Recipe[]> {
  if (!supabase) {
    throw new Error('Supabase אינו מוגדר')
  }

  const full = await supabase
    .from('recipes')
    .select(SELECT_WITH_URL)
    .order('title', { ascending: true })

  if (!full.error) {
    return (full.data as SupabaseRecipeRow[] | null)?.map(mapSupabaseRecipe) ?? []
  }

  const basic = await supabase
    .from('recipes')
    .select(SELECT_BASIC)
    .order('title', { ascending: true })

  if (basic.error) throw basic.error

  return (basic.data as SupabaseRecipeRow[] | null)?.map(mapSupabaseRecipe) ?? []
}

/** Unique category labels from synced recipes. */
export function extractRecipeCategories(recipes: Recipe[]): string[] {
  const set = new Set<string>()
  for (const r of recipes) {
    for (const c of r.categories ?? []) {
      const t = c.trim()
      if (t) set.add(t)
    }
    for (const t of r.tags ?? []) {
      const x = t.trim()
      if (x) set.add(x)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'he'))
}
