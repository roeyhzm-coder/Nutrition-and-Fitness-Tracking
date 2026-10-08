import { supabase } from '../lib/supabase'
import { allIsraeliFoods } from './foods'

const CHUNK = 120

export { allIsraeliFoods }

export function israeliFoodCatalogStats() {
  const foods = allIsraeliFoods()
  const byCategory = new Map<string, number>()
  for (const food of foods) {
    byCategory.set(food.category, (byCategory.get(food.category) ?? 0) + 1)
  }
  return {
    total: foods.length,
    byCategory: Object.fromEntries(byCategory),
  }
}

/** Upserts catalog rows by stable id. Never truncates user-owned rows. */
export async function seedIsraeliFoods(): Promise<{
  upserted: number
  error?: string
}> {
  const foods = allIsraeliFoods()
  if (!supabase) return { upserted: 0, error: 'Supabase אינו מוגדר' }

  let upserted = 0
  for (let i = 0; i < foods.length; i += CHUNK) {
    const chunk = foods.slice(i, i + CHUNK).map((food) => ({
      ...food,
      is_system: true,
      is_custom: false,
    }))
    const { error } = await supabase.from('israeli_foods').upsert(chunk, {
      onConflict: 'id',
      ignoreDuplicates: false,
    })
    if (error) return { upserted, error: error.message }
    upserted += chunk.length
  }
  return { upserted }
}
