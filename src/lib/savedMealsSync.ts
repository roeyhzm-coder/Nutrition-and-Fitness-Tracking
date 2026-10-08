import { RESTORED_SAVED_MEALS } from '../data/pinnedSavedMeals'
import { normalizeSavedMeal } from '../data/defaults'
import { isSupabaseConfigured, supabase } from './supabase'
import type { SavedMeal } from './types'

const SHARED_OWNER_ID = 'primary'
const SHARED_OWNER_ALIASES = ['primary', 'primary_user'] as const

type SavedMealRow = {
  id: string
  user_id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fats: number
  notes: string | null
  kind: string | null
  serving_grams: number | null
  components: SavedMeal['components']
  serving_units: SavedMeal['serving_units']
  payload: SavedMeal
  updated_at: string
}

function toRow(meal: SavedMeal, userId = SHARED_OWNER_ID): SavedMealRow {
  const normalized = normalizeSavedMeal(meal)
  return {
    id: normalized.id,
    user_id: userId,
    name: normalized.name,
    calories: normalized.calories,
    protein: normalized.protein,
    carbs: normalized.carbs,
    fats: normalized.fats,
    notes: normalized.notes ?? null,
    kind: normalized.kind ?? 'meal',
    serving_grams: normalized.servingGrams ?? null,
    components: normalized.components ?? [],
    serving_units: normalized.serving_units ?? [],
    payload: normalized,
    updated_at: new Date().toISOString(),
  }
}

function fromRow(row: SavedMealRow): SavedMeal | null {
  const payload =
    row.payload && typeof row.payload === 'object' ? row.payload : null
  const meal: SavedMeal = {
    id: row.id,
    name: row.name,
    calories: Number(row.calories) || 0,
    protein: Number(row.protein) || 0,
    carbs: Number(row.carbs) || 0,
    fats: Number(row.fats) || 0,
    notes: row.notes ?? payload?.notes,
    kind: (row.kind as SavedMeal['kind']) ?? payload?.kind,
    servingGrams: row.serving_grams ?? payload?.servingGrams,
    components: row.components?.length ? row.components : payload?.components,
    serving_units: row.serving_units?.length
      ? row.serving_units
      : payload?.serving_units,
  }
  if (!meal.id || !meal.name?.trim()) return null
  return normalizeSavedMeal(meal)
}

export async function pullUserSavedMeals(): Promise<SavedMeal[] | null> {
  if (!isSupabaseConfigured || !supabase) return null
  for (const owner of SHARED_OWNER_ALIASES) {
    const { data, error } = await supabase
      .from('user_saved_meals')
      .select(
        'id, user_id, name, calories, protein, carbs, fats, notes, kind, serving_grams, components, serving_units, payload, updated_at',
      )
      .eq('user_id', owner)
      .order('updated_at', { ascending: true })
    if (error) {
      console.error('[savedMealsSync] pull failed', error.message)
      return null
    }
    if (data?.length) {
      return (data as SavedMealRow[]).map(fromRow).filter(Boolean) as SavedMeal[]
    }
  }
  const { data, error } = await supabase
    .from('user_saved_meals')
    .select(
      'id, user_id, name, calories, protein, carbs, fats, notes, kind, serving_grams, components, serving_units, payload, updated_at',
    )
    .order('updated_at', { ascending: true })
  if (error) {
    console.error('[savedMealsSync] pull-all failed', error.message)
    return null
  }
  return ((data as SavedMealRow[] | null) ?? [])
    .map(fromRow)
    .filter(Boolean) as SavedMeal[]
}

export async function pushUserSavedMeals(meals: SavedMeal[]): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false
  const rows = meals.map((meal) => toRow(meal))
  if (rows.length) {
    const { error } = await supabase
      .from('user_saved_meals')
      .upsert(rows, { onConflict: 'id' })
    if (error) {
      console.error('[savedMealsSync] upsert failed', error.message)
      return false
    }
  }

  const keepIds = new Set(meals.map((meal) => meal.id))
  const { data: existing, error: listError } = await supabase
    .from('user_saved_meals')
    .select('id')
    .eq('user_id', SHARED_OWNER_ID)
  if (listError) {
    console.error('[savedMealsSync] list-for-delete failed', listError.message)
    return rows.length > 0
  }
  const stale = (existing ?? [])
    .map((row) => row.id as string)
    .filter((id) => !keepIds.has(id))
  if (!stale.length) return true
  if (meals.length === 0) return true
  const { error: deleteError } = await supabase
    .from('user_saved_meals')
    .delete()
    .eq('user_id', SHARED_OWNER_ID)
    .in('id', stale)
  if (deleteError) {
    console.error('[savedMealsSync] delete stale failed', deleteError.message)
    return false
  }
  return true
}

export async function restorePinnedSavedMeals(): Promise<SavedMeal[] | null> {
  if (!isSupabaseConfigured || !supabase) return RESTORED_SAVED_MEALS
  const { error } = await supabase
    .from('user_saved_meals')
    .upsert(
      RESTORED_SAVED_MEALS.map((meal) => toRow(meal)),
      { onConflict: 'id' },
    )
  if (error) {
    console.error('[savedMealsSync] restore pinned failed', error.message)
    return null
  }
  return RESTORED_SAVED_MEALS
}
