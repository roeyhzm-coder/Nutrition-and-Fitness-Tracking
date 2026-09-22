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
    image: row.image ?? undefined,
    categories: row.categories ?? [],
    equipment: row.equipment ?? [],
  }
}

export async function fetchRecipesFromSupabase(): Promise<Recipe[]> {
  if (!supabase) {
    throw new Error('Supabase אינו מוגדר')
  }

  const { data, error } = await supabase
    .from('recipes')
    .select(
      'id, title, image, categories, equipment, ingredients, steps, macros, base_servings',
    )
    .order('title', { ascending: true })

  if (error) {
    throw error
  }

  return (data as SupabaseRecipeRow[] | null)?.map(mapSupabaseRecipe) ?? []
}
