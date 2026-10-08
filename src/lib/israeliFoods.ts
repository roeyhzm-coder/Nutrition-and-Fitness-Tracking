import { useSyncExternalStore } from 'react'
import { allIsraeliFoods, type IsraeliFood } from '../data/foods'
import { seedIsraeliFoods } from '../data/seedFoods'
import {
  macrosFromPer100g,
  normalizeSearch,
  type CatalogFood,
} from './foodCatalog'
import { supabase } from './supabase'
import type { ServingUnit } from './types'

export type { IsraeliFood } from '../data/foods'
export { seedIsraeliFoods }

const SEED_FLAG = 'israeli-foods-seed-v1'
const CUSTOM_KEY = 'israeli-foods-custom-v1'

const customListeners = new Set<() => void>()
let customCache: IsraeliFood[] | null = null

function emitCustom() {
  for (const listener of customListeners) listener()
}

export function loadCustomIsraeliFoods(): IsraeliFood[] {
  if (customCache) return customCache
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    const parsed = raw ? (JSON.parse(raw) as IsraeliFood[]) : []
    customCache = Array.isArray(parsed) ? parsed : []
  } catch {
    customCache = []
  }
  return customCache
}

function persistCustomIsraeliFoods(foods: IsraeliFood[]) {
  customCache = foods
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(foods))
  } catch {
    /* ignore quota */
  }
  emitCustom()
}

export function subscribeCustomIsraeliFoods(listener: () => void) {
  customListeners.add(listener)
  return () => {
    customListeners.delete(listener)
  }
}

export function useCustomIsraeliFoods() {
  return useSyncExternalStore(
    subscribeCustomIsraeliFoods,
    loadCustomIsraeliFoods,
    () => [],
  )
}

export function rememberCustomIsraeliFood(food: IsraeliFood) {
  const current = loadCustomIsraeliFoods()
  persistCustomIsraeliFoods([
    food,
    ...current.filter((item) => item.id !== food.id),
  ])
}

export function catalogIsraeliFoods(): IsraeliFood[] {
  const extras = loadCustomIsraeliFoods()
  const base = allIsraeliFoods()
  const seen = new Set(extras.map((item) => item.id))
  return [...extras, ...base.filter((item) => !seen.has(item.id))]
}

export function israeliFoodCatalogCount() {
  return catalogIsraeliFoods().length
}

export function israeliToCatalog(food: IsraeliFood): CatalogFood {
  const units = israeliFoodUnits(food)
  const def = defaultIsraeliPortion(food)
  const grams = def?.grams ?? 100
  const macros = israeliFoodMacros(food, grams)
  return {
    id: `israeli:${food.id}`,
    name: food.name,
    brand: food.brand ?? undefined,
    category: food.category,
    aliases: [food.category, food.brand ?? ''].filter(Boolean),
    servingGrams: grams,
    servingLabel: def?.name ?? 'מנה',
    calories: macros.calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fats: macros.fats,
    per100g: {
      calories: Number(food.calories_per_100g),
      protein: Number(food.protein_per_100g),
      carbs: Number(food.carbs_per_100g),
      fats: Number(food.fat_per_100g),
    },
    source: 'israeli',
    kind: 'item',
    serving_units: units,
    servingPresets: units,
  }
}

export function israeliFoodLabel(food: IsraeliFood) {
  return food.brand ? `${food.name}` : food.name
}

export function israeliFoodUnits(food: IsraeliFood): ServingUnit[] {
  return food.portions.map((portion, index) => ({
    id: `portion-${index}`,
    name: portion.name,
    grams: portion.grams,
    is_default: portion.isDefault,
  }))
}

export function defaultIsraeliPortion(food: IsraeliFood) {
  return food.portions.find((p) => p.isDefault) ?? food.portions[0]
}

export function israeliFoodMacros(food: IsraeliFood, grams: number) {
  return macrosFromPer100g(
    {
      calories: Number(food.calories_per_100g),
      protein: Number(food.protein_per_100g),
      carbs: Number(food.carbs_per_100g),
      fats: Number(food.fat_per_100g),
    },
    grams,
  )
}

function scoreFood(food: IsraeliFood, q: string) {
  const name = normalizeSearch(food.name)
  const brand = normalizeSearch(food.brand ?? '')
  const category = normalizeSearch(food.category)
  if (name.startsWith(q) || name.includes(` ${q}`)) return 120
  if (brand.startsWith(q)) return 110
  if (name.includes(q)) return 90
  if (brand.includes(q)) return 80
  if (category.includes(q)) return 50
  return 0
}

export function searchIsraeliFoodsLocal(query: string, limit = 20): IsraeliFood[] {
  const q = normalizeSearch(query)
  const catalog = catalogIsraeliFoods()
  if (!q) return catalog.slice(0, limit)
  const scored: { food: IsraeliFood; score: number }[] = []
  for (const food of catalog) {
    const score = scoreFood(food, q)
    if (score > 0) scored.push({ food, score: score - food.name.length * 0.02 })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((row) => row.food)
}

function sanitizeIlike(value: string) {
  return value.replace(/[%_,]/g, ' ').trim()
}

export async function searchIsraeliFoods(
  query: string,
  signal?: AbortSignal,
): Promise<IsraeliFood[]> {
  const q = sanitizeIlike(query)
  if (q.length < 1) return []

  if (supabase) {
    let request = supabase
      .from('israeli_foods')
      .select(
        'id,name,category,brand,calories_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,portions',
      )
      .or(`name.ilike.%${q}%,brand.ilike.%${q}%,category.ilike.%${q}%`)
      .limit(20)
    if (signal) request = request.abortSignal(signal)
    const { data, error } = await request
    if (!error && data?.length) {
      const remote = data.map(normalizeRow)
      const customHits = searchIsraeliFoodsLocal(query, 8).filter(
        (food) => food.id.startsWith('il-custom-'),
      )
      const seen = new Set(remote.map((food) => food.id))
      return [...customHits.filter((food) => !seen.has(food.id)), ...remote]
    }
  }
  return searchIsraeliFoodsLocal(query)
}

function normalizeRow(row: Record<string, unknown>): IsraeliFood {
  const portions = Array.isArray(row.portions) ? row.portions : []
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category),
    brand: row.brand == null ? null : String(row.brand),
    calories_per_100g: Number(row.calories_per_100g),
    protein_per_100g: Number(row.protein_per_100g),
    carbs_per_100g: Number(row.carbs_per_100g),
    fat_per_100g: Number(row.fat_per_100g),
    portions: portions.map((p) => {
      const item = p as { name?: string; grams?: number; isDefault?: boolean }
      return {
        name: String(item.name ?? 'מנה'),
        grams: Number(item.grams ?? 100),
        isDefault: Boolean(item.isDefault),
      }
    }),
  }
}

export async function insertIsraeliFood(input: {
  name: string
  category: string
  brand?: string | null
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  portions: IsraeliFood['portions']
}): Promise<{ food: IsraeliFood; error?: string }> {
  const food: IsraeliFood = {
    id: `il-custom-${crypto.randomUUID()}`,
    name: input.name.trim(),
    category: input.category,
    brand: input.brand?.trim() || null,
    calories_per_100g: input.calories_per_100g,
    protein_per_100g: input.protein_per_100g,
    carbs_per_100g: input.carbs_per_100g,
    fat_per_100g: input.fat_per_100g,
    portions: input.portions,
  }
  rememberCustomIsraeliFood(food)
  if (!supabase) {
    return { food, error: 'Supabase אינו מוגדר — נשמר במכשיר בלבד' }
  }
  const { error } = await supabase.from('israeli_foods').insert({
    ...food,
    is_system: false,
  })
  if (error) return { food, error: error.message }
  return { food }
}

export async function seedIsraeliFoodsOnce() {
  try {
    if (localStorage.getItem(SEED_FLAG) === String(allIsraeliFoods().length)) {
      return
    }
  } catch {
    /* ignore */
  }
  const result = await seedIsraeliFoods()
  if (!result.error) {
    try {
      localStorage.setItem(SEED_FLAG, String(allIsraeliFoods().length))
    } catch {
      /* ignore */
    }
  }
  return result
}
