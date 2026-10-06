import type { MealType, Recipe, RecipeVariation, ServingUnit } from './types'
import { roundTo } from './numericInput'
import { GRAMS_UNIT_ID } from './servingUnits'
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
  description?: string | null
  image?: string | null
  image_url?: string | null
  categories?: string[] | string | null
  category?: string | null
  equipment?: string[] | null
  ingredients?: SupabaseIngredient[] | string[] | null
  steps?: string[] | null
  macros?: Record<string, number | string> | null
  servings?: number | string | null
  base_servings?: number | string | null
  updated_at?: string | null
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
    macros.cooked_grams,
    macros.cookedGrams,
    macros.total_grams,
    macros.totalGrams,
    macros.batch_grams,
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

export function recipeServings(
  recipe: Pick<Recipe, 'servings'>,
): number {
  const n = Number(recipe.servings)
  if (!Number.isFinite(n) || n <= 1) return 1
  return Math.max(1, Math.round(n))
}

export function resolveServingGrams(
  recipe: Pick<Recipe, 'servingGrams' | 'batchGrams' | 'servings' | 'ingredients'>,
): number {
  const stored = num(recipe.servingGrams)
  if (stored > 0) return Math.round(stored)
  const servings = recipeServings(recipe)
  const batch = num(recipe.batchGrams)
  if (batch > 0) return Math.max(1, Math.round(batch / servings))
  const fromIngredients = sumIngredientGrams(recipe.ingredients)
  if (fromIngredients > 0) {
    return Math.max(1, Math.round(fromIngredients / servings))
  }
  return DEFAULT_SERVING_GRAMS
}

/** Portion dropdown for recipes: 1 serving, full batch, half, cooked grams. */
export function recipePortionUnits(recipe: Recipe): ServingUnit[] {
  const servings = recipeServings(recipe)
  const perGrams = resolveServingGrams(recipe)
  const batchGrams =
    num(recipe.batchGrams) > 0
      ? Math.round(num(recipe.batchGrams))
      : Math.round(perGrams * servings)
  const units: ServingUnit[] = [
    {
      id: 'recipe-serving-1',
      name: `מנה 1 (1 מתוך ${servings})`,
      grams: perGrams,
      is_default: true,
    },
  ]
  if (servings > 1) {
    units.push({
      id: 'recipe-full-batch',
      name: `כל המתכון השלם (${servings} מנות)`,
      grams: batchGrams,
    })
  }
  units.push({
    id: 'recipe-half-serving',
    name: 'חצי מנה (0.5)',
    grams: roundTo(perGrams * 0.5, 2),
  })
  units.push({
    id: GRAMS_UNIT_ID,
    name: 'גרמים מוכנים',
    grams: 1,
  })
  return units
}

function resolveCookedYield(opts: {
  listedGrams: number
  ingredientGrams: number
  servings: number
  isPer100: boolean
  isBatch: boolean
}): { servingGrams: number; batchGrams: number } {
  const { listedGrams, ingredientGrams, servings, isPer100, isBatch } = opts
  const cookedTotal = listedGrams || ingredientGrams
  if (isPer100) {
    const servingGrams = listedGrams || 100
    return { servingGrams, batchGrams: Math.round(servingGrams * servings) }
  }
  if (cookedTotal > 0) {
    const looksLikeBatch = servings > 1 && cookedTotal >= 80 * servings
    if (isBatch && looksLikeBatch) {
      return {
        batchGrams: cookedTotal,
        servingGrams: Math.max(1, Math.round(cookedTotal / servings)),
      }
    }
    if (isBatch) {
      return {
        servingGrams: cookedTotal,
        batchGrams: Math.round(cookedTotal * servings),
      }
    }
    return { servingGrams: cookedTotal, batchGrams: cookedTotal }
  }
  return {
    servingGrams: DEFAULT_SERVING_GRAMS,
    batchGrams: Math.round(DEFAULT_SERVING_GRAMS * servings),
  }
}

export function defaultRecipeVariation(
  recipe: Pick<Recipe, 'variations'>,
): RecipeVariation | undefined {
  const list = recipe.variations ?? []
  if (list.length === 0) return undefined
  return list.find((item) => item.isDefault) ?? list[0]
}

/** Overlay a variation's per-serving macros onto the base recipe. */
export function recipeWithVariation(
  recipe: Recipe,
  variationId?: string | null,
): Recipe {
  const list = recipe.variations ?? []
  if (list.length === 0) return recipe
  const selected =
    list.find((item) => item.id === variationId) ?? defaultRecipeVariation(recipe)
  if (!selected) return recipe
  return {
    ...recipe,
    calories: selected.calories,
    proteinG: selected.proteinG,
    carbsG: selected.carbsG,
    fatsG: selected.fatsG,
    servingGrams: selected.servingGrams ?? recipe.servingGrams,
    batchGrams: selected.batchGrams ?? recipe.batchGrams,
    ingredients:
      selected.ingredients && selected.ingredients.length > 0
        ? selected.ingredients
        : recipe.ingredients,
    description: selected.description ?? recipe.description,
  }
}

function parseVariations(
  loose: Record<string, unknown>,
  servings: number,
  divisor: number,
  isPer100: boolean,
  isBatch: boolean,
  fallback: { servingGrams: number; batchGrams: number },
): RecipeVariation[] {
  const raw = loose.variations
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const rec = item as Record<string, unknown>
    const name = String(rec.name ?? rec.title ?? '').trim()
    if (!name) return []
    const nested =
      rec.macros && typeof rec.macros === 'object'
        ? (rec.macros as Record<string, unknown>)
        : rec
    const calories = roundMacro(num(nested.calories ?? nested['קלוריות']) / divisor)
    const proteinG = roundMacro(num(nested.protein ?? nested['חלבון']) / divisor)
    const carbsG = roundMacro(num(nested.carbs ?? nested['פחמימות']) / divisor)
    const fatsG = roundMacro(num(nested.fat ?? nested.fats ?? nested['שומן']) / divisor)
    const ingredients = Array.isArray(rec.ingredients)
      ? rec.ingredients.map((ing) =>
          formatIngredient(ing as Parameters<typeof formatIngredient>[0]),
        )
      : undefined
    const listedGrams = servingGramsFromMacros(
      nested as Record<string, number | string>,
    )
    const ingredientGrams = ingredients
      ? Math.round(sumIngredientGrams(ingredients))
      : 0
    const yieldGrams = resolveCookedYield({
      listedGrams,
      ingredientGrams,
      servings,
      isPer100,
      isBatch,
    })
    const description =
      typeof rec.description === 'string' && rec.description.trim()
        ? rec.description.trim()
        : undefined
    return [
      {
        id: String(rec.id ?? `var-${index}`),
        name,
        isDefault: rec.isDefault === true,
        description,
        calories: calories || 0,
        proteinG,
        carbsG,
        fatsG,
        servingGrams: yieldGrams.servingGrams || fallback.servingGrams,
        batchGrams: yieldGrams.batchGrams || fallback.batchGrams,
        ingredients,
      },
    ]
  })
}

function parseServings(
  row: SupabaseRecipeRow,
  macros: Record<string, number | string>,
): number {
  const candidates = [
    row.servings,
    row.base_servings,
    macros.servings,
    macros.base_servings,
    macros.yield,
  ]
  for (const value of candidates) {
    const n = num(value)
    if (n > 0) return Math.max(1, Math.round(n))
  }
  return 1
}

function parseDescription(
  row: SupabaseRecipeRow,
  macros: Record<string, unknown>,
): string | undefined {
  const direct = [row.description, macros.description]
  for (const value of direct) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  const variations = macros.variations
  if (Array.isArray(variations)) {
    const records = variations.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object',
    )
    const preferred =
      records.find((item) => item.isDefault === true) ?? records[0]
    const text = preferred?.description
    if (typeof text === 'string' && text.trim()) return text.trim()
  }
  return undefined
}

function roundMacro(value: number) {
  if (!Number.isFinite(value)) return 0
  return roundTo(value, 2)
}

function asCategoryList(value: unknown): string[] {
  if (value == null || value === '') return []
  if (Array.isArray(value)) {
    return value.flatMap((item) => asCategoryList(item))
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    if (/[,|/]/.test(trimmed) && !trimmed.startsWith('[')) {
      return trimmed
        .split(/[,|/]/)
        .map((part) => part.trim())
        .filter(Boolean)
    }
    return [trimmed]
  }
  return []
}

export function recipeCategoryLabels(recipe: {
  categories?: string[]
  category?: string
  tags?: string[]
  equipment?: string[]
}): string[] {
  return [
    ...asCategoryList(recipe.categories),
    ...asCategoryList(recipe.category),
    ...asCategoryList(recipe.tags),
    ...asCategoryList(recipe.equipment),
  ]
}

function foldLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/['׳`״"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function recipeMatchesCategoryTag(
  recipe: Recipe,
  tag: string,
): boolean {
  const needle = foldLabel(tag)
  if (!needle) return false
  const labels = recipeCategoryLabels(recipe)
  if (labels.some((label) => foldLabel(label) === needle)) return true
  const category = recipe.category?.trim() ?? ''
  if (category) {
    const hay = foldLabel(category)
    if (hay === needle || hay.includes(needle) || needle.includes(hay)) {
      return true
    }
  }
  return labels.some((label) => {
    const hay = foldLabel(label)
    return hay.includes(needle) || needle.includes(hay)
  })
}

export function mapSupabaseRecipe(row: SupabaseRecipeRow): Recipe {
  const macros = (row.macros ?? {}) as Record<string, number | string>
  const looseMacros = (row.macros ?? {}) as Record<string, unknown>
  const image =
    row.image_url ||
    row.image ||
    (typeof macros.imageUrl === 'string' ? macros.imageUrl : undefined)
  const ingredients = (row.ingredients ?? []).map(formatIngredient)
  const servings = parseServings(row, macros)
  const basis = String(macros.nutritionBasis ?? '').toLowerCase()
  const isPer100 = basis === '100g' || basis === 'per100g' || basis === 'per_100g'
  const isBatch = !isPer100 && (basis === 'recipe' || servings > 1)
  const divisor = isBatch ? servings : 1
  const totalCalories = num(macros.calories ?? macros['קלוריות'])
  const totalProtein = num(macros.protein ?? macros['חלבון'])
  const totalCarbs = num(macros.carbs ?? macros['פחמימות'])
  const totalFats = num(macros.fat ?? macros['שומן'])
  const listedGrams = servingGramsFromMacros(macros)
  const ingredientGrams = Math.round(sumIngredientGrams(row.ingredients))
  const { servingGrams, batchGrams } = resolveCookedYield({
    listedGrams,
    ingredientGrams,
    servings,
    isPer100,
    isBatch,
  })
  const categories = [
    ...asCategoryList(row.categories),
    ...asCategoryList(row.category),
  ]
  const uniqueCategories = [...new Set(categories.filter(Boolean))]
  const title = String(row.title ?? '').trim()
  const variations = parseVariations(
    looseMacros,
    servings,
    divisor,
    isPer100,
    isBatch,
    { servingGrams, batchGrams },
  )
  return {
    id: row.id,
    name: title,
    mealType: mapMealType(uniqueCategories),
    proteinG: roundMacro(totalProtein / divisor),
    calories: roundMacro(totalCalories / divisor),
    carbsG: roundMacro(totalCarbs / divisor),
    fatsG: roundMacro(totalFats / divisor),
    timeMin: Math.max(1, Math.round(num(macros.cookTime ?? macros.prepTime, 10))),
    tags: uniqueCategories,
    ingredients,
    steps: row.steps ?? [],
    image: image || undefined,
    categories: uniqueCategories,
    category: row.category?.trim() || uniqueCategories[0],
    equipment: row.equipment ?? [],
    servingGrams,
    servings,
    batchGrams,
    description: parseDescription(row, looseMacros),
    variations: variations.length > 0 ? variations : undefined,
  }
}

export async function fetchRecipesFromSupabase(): Promise<Recipe[]> {
  if (!supabase) {
    throw new Error('Supabase אינו מוגדר')
  }

  const { data, error } = await supabase.from('recipes').select('*')
  if (error) throw error
  return (data as SupabaseRecipeRow[] | null)?.map(mapSupabaseRecipe) ?? []
}

/** Unique category labels from synced recipes. */
export function extractRecipeCategories(recipes: Recipe[]): string[] {
  const set = new Set<string>()
  for (const r of recipes) {
    for (const c of recipeCategoryLabels(r)) {
      const t = c.trim()
      if (t) set.add(t)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'he'))
}
