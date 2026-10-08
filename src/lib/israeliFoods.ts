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

export function isCustomIsraeliFood(food: Pick<IsraeliFood, 'id' | 'is_custom' | 'is_system'>) {
  if (food.is_custom === true) return true
  if (food.is_system === false) return true
  return food.id.startsWith('il-custom-')
}

export function rememberCustomIsraeliFood(food: IsraeliFood) {
  const marked: IsraeliFood = {
    ...food,
    is_custom: true,
    is_system: false,
  }
  const current = loadCustomIsraeliFoods()
  persistCustomIsraeliFoods([
    marked,
    ...current.filter((item) => item.id !== marked.id),
  ])
}

export function forgetCustomIsraeliFood(id: string) {
  persistCustomIsraeliFoods(
    loadCustomIsraeliFoods().filter((item) => item.id !== id),
  )
}

function mergeRemoteCustomFoods(remote: IsraeliFood[]) {
  const byId = new Map(
    loadCustomIsraeliFoods().map((item) => [item.id, item] as const),
  )
  for (const food of remote) {
    if (!isCustomIsraeliFood(food)) continue
    byId.set(food.id, { ...food, is_custom: true, is_system: false })
  }
  persistCustomIsraeliFoods([...byId.values()])
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
        'id,name,category,brand,calories_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,portions,is_system,is_custom',
      )
      .or(`name.ilike.%${q}%,brand.ilike.%${q}%,category.ilike.%${q}%`)
      .limit(20)
    if (signal) request = request.abortSignal(signal)
    const { data, error } = await request
    if (!error && data?.length) {
      const remote = data.map(normalizeRow)
      const customHits = searchIsraeliFoodsLocal(query, 8).filter(isCustomIsraeliFood)
      const seen = new Set(remote.map((food) => food.id))
      return [...customHits.filter((food) => !seen.has(food.id)), ...remote]
    }
  }
  return searchIsraeliFoodsLocal(query)
}

function normalizeRow(row: Record<string, unknown>): IsraeliFood {
  const portions = Array.isArray(row.portions) ? row.portions : []
  const id = String(row.id)
  const is_system =
    row.is_system === undefined ? !id.startsWith('il-custom-') : Boolean(row.is_system)
  const is_custom =
    row.is_custom === true || is_system === false || id.startsWith('il-custom-')
  return {
    id,
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
    is_system,
    is_custom,
  }
}

const CUSTOM_SELECT =
  'id,name,category,brand,calories_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,portions,is_system,is_custom'

export async function fetchCustomIsraeliFoods(): Promise<IsraeliFood[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('israeli_foods')
      .select(CUSTOM_SELECT)
      .eq('is_system', false)
      .order('created_at', { ascending: false })
    if (!error && data) {
      mergeRemoteCustomFoods(data.map(normalizeRow))
    }
  }
  return loadCustomIsraeliFoods()
}

function customPayload(food: IsraeliFood) {
  return {
    id: food.id,
    name: food.name,
    category: food.category,
    brand: food.brand,
    calories_per_100g: food.calories_per_100g,
    protein_per_100g: food.protein_per_100g,
    carbs_per_100g: food.carbs_per_100g,
    fat_per_100g: food.fat_per_100g,
    portions: food.portions,
    is_system: false,
    is_custom: true,
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
    is_custom: true,
    is_system: false,
  }
  rememberCustomIsraeliFood(food)
  if (!supabase) {
    return { food, error: 'Supabase אינו מוגדר — נשמר במכשיר בלבד' }
  }
  const { error } = await supabase.from('israeli_foods').insert(customPayload(food))
  if (error) return { food, error: error.message }
  return { food }
}

export async function updateIsraeliFood(
  food: IsraeliFood,
): Promise<{ food: IsraeliFood; error?: string }> {
  if (!isCustomIsraeliFood(food)) {
    return { food, error: 'לא ניתן לערוך פריט מערכת' }
  }
  const next: IsraeliFood = {
    ...food,
    name: food.name.trim(),
    brand: food.brand?.trim() || null,
    is_custom: true,
    is_system: false,
  }
  rememberCustomIsraeliFood(next)
  if (!supabase) {
    return { food: next, error: 'Supabase אינו מוגדר — נשמר במכשיר בלבד' }
  }
  const payload = customPayload(next)
  const { error } = await supabase
    .from('israeli_foods')
    .update({
      name: payload.name,
      category: payload.category,
      brand: payload.brand,
      calories_per_100g: payload.calories_per_100g,
      protein_per_100g: payload.protein_per_100g,
      carbs_per_100g: payload.carbs_per_100g,
      fat_per_100g: payload.fat_per_100g,
      portions: payload.portions,
      is_custom: true,
      is_system: false,
    })
    .eq('id', next.id)
    .eq('is_system', false)
  if (error) return { food: next, error: error.message }
  return { food: next }
}

export async function deleteIsraeliFood(id: string): Promise<{ error?: string }> {
  const local = loadCustomIsraeliFoods().find((item) => item.id === id)
  if (local && !isCustomIsraeliFood(local)) {
    return { error: 'לא ניתן למחוק פריט מערכת' }
  }
  if (!id.startsWith('il-custom-') && !local) {
    return { error: 'לא ניתן למחוק פריט מערכת' }
  }
  forgetCustomIsraeliFood(id)
  if (!supabase) return {}
  const { error } = await supabase
    .from('israeli_foods')
    .delete()
    .eq('id', id)
    .eq('is_system', false)
  if (error) return { error: error.message }
  return {}
}

function customDedupeKey(food: IsraeliFood) {
  return `${normalizeSearch(food.name)}|${normalizeSearch(food.brand ?? '')}`
}

export function customIsraeliFoodDuplicateCount(foods = loadCustomIsraeliFoods()) {
  const seen = new Map<string, number>()
  let extras = 0
  for (const food of foods) {
    const key = customDedupeKey(food)
    const count = (seen.get(key) ?? 0) + 1
    seen.set(key, count)
    if (count > 1) extras += 1
  }
  return extras
}

export async function dedupeCustomIsraeliFoods(): Promise<{ removed: number }> {
  const foods = loadCustomIsraeliFoods()
  const kept = new Set<string>()
  const remove: IsraeliFood[] = []
  for (const food of foods) {
    const key = customDedupeKey(food)
    if (kept.has(key)) {
      remove.push(food)
      continue
    }
    kept.add(key)
  }
  for (const food of remove) {
    await deleteIsraeliFood(food.id)
  }
  return { removed: remove.length }
}

const CANONICAL_WHEY_NAME = normalizeSearch('אבקת חלבון')

export async function cleanupDuplicateProteinPowder(): Promise<{ removed: number }> {
  const custom = loadCustomIsraeliFoods().filter((food) => {
    const name = normalizeSearch(food.name)
    return name === CANONICAL_WHEY_NAME || name.includes('בדיקה')
  })
  for (const food of custom) {
    await deleteIsraeliFood(food.id)
  }
  if (supabase) {
    await supabase
      .from('israeli_foods')
      .delete()
      .eq('is_system', false)
      .eq('name', 'אבקת חלבון')
  }
  return { removed: custom.length }
}

export async function seedIsraeliFoodsOnce() {
  try {
    if (localStorage.getItem(SEED_FLAG) === String(allIsraeliFoods().length)) {
      await cleanupDuplicateProteinPowder()
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
  await cleanupDuplicateProteinPowder()
  return result
}
