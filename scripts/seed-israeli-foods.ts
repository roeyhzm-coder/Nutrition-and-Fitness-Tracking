import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { allIsraeliFoods } from '../src/data/foods'

function loadEnvFile(path: string, env: Record<string, string>) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
}

const env: Record<string, string> = {}
loadEnvFile(resolve(process.cwd(), '.env'), env)
loadEnvFile(resolve(process.cwd(), '.env.local'), env)
const url = env.VITE_SUPABASE_URL
const anon = env.VITE_SUPABASE_ANON_KEY
if (!url || !anon) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

const foodsList = allIsraeliFoods()
const byCategory: Record<string, number> = {}
for (const food of foodsList) {
  byCategory[food.category] = (byCategory[food.category] ?? 0) + 1
}
console.log(JSON.stringify({ total: foodsList.length, byCategory }, null, 2))

const supabase = createClient(url, anon)
const foods = foodsList.map((food) => ({ ...food, is_system: true }))
const chunkSize = 120
let upserted = 0
for (let i = 0; i < foods.length; i += chunkSize) {
  const chunk = foods.slice(i, i + chunkSize)
  const { error } = await supabase.from('israeli_foods').upsert(chunk, {
    onConflict: 'id',
  })
  if (error) {
    console.error(error.message)
    process.exit(1)
  }
  upserted += chunk.length
  console.log(`upserted ${upserted}/${foods.length}`)
}

console.log(`done: ${upserted} system catalog rows`)
