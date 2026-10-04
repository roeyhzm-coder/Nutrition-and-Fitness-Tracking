import { supabase } from './supabase'
import { roundTo } from './numericInput'

function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/['׳`״"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export type ServingFamily =
  | 'dairy_tub'
  | 'bread'
  | 'egg'
  | 'scoop'
  | 'spoon'
  | 'unit'
  | 'general'

export type ServingPreset = {
  id: string
  family: ServingFamily
  label: string
  grams: number
}

export type ServingPresetRow = ServingPreset & {
  matchAliases: string[]
  sortOrder: number
}

export const GRAMS_PRESET_ID = 'grams'

const FAMILIES: ServingFamily[] = [
  'dairy_tub',
  'bread',
  'egg',
  'scoop',
  'spoon',
  'unit',
  'general',
]

function row(
  id: string,
  family: ServingFamily,
  label: string,
  grams: number,
  matchAliases: string[],
  sortOrder: number,
): ServingPresetRow {
  return { id, family, label, grams, matchAliases, sortOrder }
}

/** Canonical Israeli serving units — mirrored in supabase/food_serving_presets.sql */
export const LOCAL_SERVING_PRESET_ROWS: ServingPresetRow[] = [
  row('dairy-tub-full', 'dairy_tub', 'גביע שלם (250 גרם)', 250, ['קוטג', 'cottage', 'יוגורט', 'גביע', 'גבינה לבנה'], 10),
  row('dairy-tub-half', 'dairy_tub', 'חצי גביע (125 גרם)', 125, ['קוטג', 'cottage', 'יוגורט', 'גביע', 'גבינה לבנה'], 20),
  row('dairy-tub-tbsp', 'dairy_tub', 'כף (30 גרם)', 30, ['קוטג', 'cottage', 'יוגורט', 'גביע', 'גבינה לבנה'], 30),
  row('bread-slice', 'bread', 'פרוסה (30 גרם)', 30, ['לחם', 'פרוסה', 'חלה', 'bread', 'toast'], 10),
  row('bread-two-slices', 'bread', '2 פרוסות (60 גרם)', 60, ['לחם', 'פרוסה', 'חלה', 'bread', 'toast'], 20),
  row('egg-l', 'egg', 'יחידה L (60 גרם)', 60, ['ביצה', 'ביצים', 'egg'], 10),
  row('egg-m', 'egg', 'יחידה M (50 גרם)', 50, ['ביצה', 'ביצים', 'egg'], 20),
  row('scoop-25', 'scoop', 'סקופ (25 גרם)', 25, ['אבקת', 'חלבון', 'whey', 'oats', 'שיבולת', 'סקופ'], 10),
  row('scoop-30', 'scoop', 'סקופ (30 גרם)', 30, ['אבקת', 'חלבון', 'whey', 'oats', 'שיבולת', 'סקופ'], 20),
  row('unit-1', 'unit', 'יחידה', 1, [], 10),
  row('spoon-tbsp', 'spoon', 'כף (15 גרם)', 15, ['שמן', 'זית', 'טחינה', 'חמאת', 'מיונז', 'כף'], 10),
  row('spoon-tsp', 'spoon', 'כפית (5 גרם)', 5, ['שמן', 'זית', 'טחינה', 'חמאת', 'מיונז', 'כפית'], 20),
  row('general-scoop-25', 'general', 'סקופ (25 גרם)', 25, [], 10),
  row('general-scoop-30', 'general', 'סקופ (30 גרם)', 30, [], 20),
  row('general-unit', 'general', 'יחידה', 1, [], 30),
  row('general-tbsp', 'general', 'כף (15 גרם)', 15, [], 40),
  row('general-tsp', 'general', 'כפית (5 גרם)', 5, [], 50),
]

const FAMILY_ALIASES: Record<Exclude<ServingFamily, 'general' | 'unit'>, string[]> = {
  dairy_tub: ['קוטג', 'cottage', 'יוגורט', 'yogurt', 'גביע', 'גבינה לבנה'],
  bread: ['לחם', 'פרוסה', 'חלה', 'פיתה', 'bread', 'toast', 'pita'],
  egg: ['ביצה', 'ביצים', 'egg'],
  scoop: ['אבקת', 'חלבון', 'whey', 'protein', 'שיבולת', 'oats', 'סקופ'],
  spoon: ['שמן', 'זית', 'olive', 'טחינה', 'חמאת', 'מיונז', 'נוטלה', 'קטשופ'],
}

let remoteRows: ServingPresetRow[] | null = null

function isFamily(value: string): value is ServingFamily {
  return FAMILIES.includes(value as ServingFamily)
}

export function hydrateServingPresetsFromRows(rows: ServingPresetRow[]) {
  remoteRows = rows
}

export async function hydrateServingPresets(): Promise<void> {
  if (!supabase) return
  const { data, error } = await supabase
    .from('food_serving_presets')
    .select('id, family, label, grams, match_aliases, sort_order')
    .order('sort_order', { ascending: true })
  if (error || !data) return
  remoteRows = data.flatMap((row) => {
    if (!isFamily(String(row.family))) return []
    const grams = Number(row.grams)
    if (!Number.isFinite(grams) || grams <= 0) return []
    return [
      {
        id: String(row.id),
        family: row.family as ServingFamily,
        label: String(row.label),
        grams,
        matchAliases: Array.isArray(row.match_aliases)
          ? row.match_aliases.map(String)
          : [],
        sortOrder: Number(row.sort_order) || 0,
      },
    ]
  })
}

export function servingPresetSource(): ServingPresetRow[] {
  return remoteRows && remoteRows.length > 0 ? remoteRows : LOCAL_SERVING_PRESET_ROWS
}

export function inferServingFamily(
  name: string,
  brand?: string,
  explicit?: ServingFamily,
): ServingFamily {
  if (explicit) return explicit
  const hay = normalizeSearch(`${name} ${brand ?? ''}`)
  for (const [family, aliases] of Object.entries(FAMILY_ALIASES) as Array<
    [keyof typeof FAMILY_ALIASES, string[]]
  >) {
    if (aliases.some((alias) => hay.includes(normalizeSearch(alias)))) {
      return family
    }
  }
  return 'general'
}

function rowsForFamily(family: ServingFamily): ServingPresetRow[] {
  return servingPresetSource()
    .filter((row) => row.family === family)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

function withProductServing(
  presets: ServingPreset[],
  servingGrams: number,
  servingLabel: string,
): ServingPreset[] {
  const grams = servingGrams > 0 ? roundTo(servingGrams, 2) : 0
  if (grams <= 0) return presets
  const already = presets.some((preset) => Math.abs(preset.grams - grams) < 0.05)
  if (already) return presets
  return [
    {
      id: `product-serving-${grams}`,
      family: 'unit',
      label: `${servingLabel} (${grams} גרם)`,
      grams,
    },
    ...presets,
  ]
}

function uniqueByGrams(presets: ServingPreset[]): ServingPreset[] {
  const seen = new Set<string>()
  const out: ServingPreset[] = []
  for (const preset of presets) {
    const key = String(roundTo(preset.grams, 2))
    if (seen.has(key)) continue
    seen.add(key)
    out.push(preset)
  }
  return out
}

export function presetsForFood(
  name: string,
  brand?: string,
  servingGrams = 100,
  servingLabel = 'מנה',
  family?: ServingFamily,
): ServingPreset[] {
  const resolved = inferServingFamily(name, brand, family)
  const familyRows = rowsForFamily(resolved).map(
    ({ matchAliases: _a, sortOrder: _s, ...preset }) => preset,
  )

  if (resolved === 'unit') {
    const grams = servingGrams > 0 ? servingGrams : 1
    return [
      {
        id: 'unit-product',
        family: 'unit',
        label: `${servingLabel} (${grams} גרם)`,
        grams,
      },
    ]
  }

  if (resolved === 'general') {
    const general = rowsForFamily('general').map((row) =>
      row.id === 'general-unit'
        ? {
            id: row.id,
            family: row.family,
            label: `${servingLabel} (${servingGrams > 0 ? servingGrams : 100} גרם)`,
            grams: servingGrams > 0 ? servingGrams : 100,
          }
        : { id: row.id, family: row.family, label: row.label, grams: row.grams },
    )
    return uniqueByGrams(withProductServing(general, servingGrams, servingLabel))
  }

  return uniqueByGrams(withProductServing(familyRows, servingGrams, servingLabel))
}

export function matchPreset(
  presets: ServingPreset[],
  grams: number | null,
  unit: 'grams' | 'serving',
): string {
  if (unit === 'grams' || grams == null) return GRAMS_PRESET_ID
  const hit = presets.find((preset) => Math.abs(preset.grams - grams) < 0.05)
  return hit?.id ?? GRAMS_PRESET_ID
}
