import type { MealType, Recipe } from './types'
import { supabase } from './supabase'

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

export function mapSupabaseRecipe(row: SupabaseRecipeRow): Recipe {
  const macros = row.macros ?? {}
  const image = row.image_url || row.image || undefined
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
    ingredients: (row.ingredients ?? []).map(formatIngredient),
    steps: row.steps ?? [],
    image: image ?? undefined,
    categories: row.categories ?? [],
    equipment: row.equipment ?? [],
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
