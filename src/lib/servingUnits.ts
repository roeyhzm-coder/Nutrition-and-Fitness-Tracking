import { supabase } from './supabase'
import { roundTo } from './numericInput'
import type { ServingUnit } from './types'

export const GRAMS_UNIT_ID = 'grams'

export type ServingFamily =
  | 'dairy_tub'
  | 'bread'
  | 'egg'
  | 'scoop'
  | 'spoon'
  | 'snack_bag'
  | 'canned'
  | 'produce'
  | 'unit'
  | 'general'

/** @deprecated use ServingUnit */
export type ServingPreset = ServingUnit & { family?: ServingFamily; label?: string }

type PackRow = ServingUnit & {
  family: ServingFamily
  matchAliases: string[]
  sortOrder: number
}

function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/['׳`״"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function unit(
  id: string,
  name: string,
  grams: number,
  extra?: { is_default?: boolean },
): ServingUnit {
  return { id, name, grams, is_default: extra?.is_default }
}

function pack(
  id: string,
  family: ServingFamily,
  name: string,
  grams: number,
  matchAliases: string[],
  sortOrder: number,
  is_default?: boolean,
): PackRow {
  return { id, family, name, grams, is_default, matchAliases, sortOrder }
}

export const FALLBACK_SERVING_UNITS: ServingUnit[] = [
  unit('fallback-gram', 'גרם (1g)', 1),
  unit('fallback-tbsp', 'כף (15g)', 15),
  unit('fallback-tsp', 'כפית (5g)', 5),
  unit('fallback-portion', 'מנה (100g)', 100),
]

const PACKS: PackRow[] = [
  pack('dairy-tub-full', 'dairy_tub', 'גביע שלם (250g)', 250, ['קוטג', 'cottage', 'יוגורט', 'גביע', 'גבינה לבנה'], 10, true),
  pack('dairy-tub-half', 'dairy_tub', 'חצי גביע (125g)', 125, ['קוטג', 'cottage', 'יוגורט', 'גביע', 'גבינה לבנה'], 20),
  pack('dairy-heaped-tbsp', 'dairy_tub', 'כף גדושה (30g)', 30, ['קוטג', 'cottage', 'יוגורט', 'גביע', 'גבינה'], 30),
  pack('bread-slice', 'bread', 'פרוסה (30g)', 30, ['לחם', 'פרוסה', 'חלה', 'bread', 'toast'], 10, true),
  pack('bread-pita', 'bread', 'פיתה (100g)', 100, ['פיתה', 'pita'], 20),
  pack('bread-bun', 'bread', 'לחמניה (80g)', 80, ['לחמניה', 'לחמני', 'bun', 'roll'], 30),
  pack('egg-l', 'egg', 'יחידה L (60g)', 60, ['ביצה', 'ביצים', 'egg'], 10, true),
  pack('egg-m', 'egg', 'יחידה M (50g)', 50, ['ביצה', 'ביצים', 'egg'], 20),
  pack('scoop-25', 'scoop', 'סקופ (25g)', 25, ['אבקת', 'חלבון', 'whey', 'protein', 'שיבולת', 'oats', 'סקופ'], 10, true),
  pack('scoop-30', 'scoop', 'סקופ (30g)', 30, ['אבקת', 'חלבון', 'whey', 'protein', 'שיבולת', 'oats', 'סקופ'], 20),
  pack('snack-small', 'snack_bag', 'שקית קטנה (25g)', 25, ['במבה', 'ביסלי', 'bamba', 'bisli', 'שקית'], 10),
  pack('snack-large', 'snack_bag', 'שקית גדולה (80g)', 80, ['במבה', 'ביסלי', 'bamba', 'bisli', 'שקית'], 20, true),
  pack('snack-mega', 'snack_bag', 'שקית ענק (100g)', 100, ['במבה', 'ביסלי', 'bamba', 'bisli', 'שקית'], 30),
  pack('can-drained', 'canned', 'קופסה מסוננת (112g)', 112, ['טונה', 'tuna', 'קופסה'], 10, true),
  pack('can-full', 'canned', 'קופסה מלאה (160g)', 160, ['טונה', 'tuna', 'קופסה'], 20),
  pack('produce-banana', 'produce', 'יחידה בינונית (100g)', 100, ['בננה', 'banana'], 10, true),
  pack('spoon-tbsp', 'spoon', 'כף (15g)', 15, ['שמן', 'זית', 'טחינה', 'חמאת', 'מיונז', 'כף'], 10, true),
  pack('spoon-tsp', 'spoon', 'כפית (5g)', 5, ['שמן', 'זית', 'טחינה', 'חמאת', 'מיונז', 'כפית'], 20),
]

const FAMILY_ALIASES: Record<ServingFamily, string[]> = {
  dairy_tub: ['קוטג', 'cottage', 'יוגורט', 'yogurt', 'גביע', 'גבינה לבנה'],
  bread: ['לחם', 'פרוסה', 'חלה', 'פיתה', 'לחמניה', 'bread', 'toast', 'pita', 'bun'],
  egg: ['ביצה', 'ביצים', 'egg'],
  scoop: ['אבקת', 'חלבון', 'whey', 'protein', 'שיבולת', 'oats', 'סקופ'],
  spoon: ['שמן', 'זית', 'olive', 'טחינה', 'חמאת', 'מיונז', 'נוטלה', 'קטשופ'],
  snack_bag: ['במבה', 'ביסלי', 'bamba', 'bisli', 'חטיף', 'שקית'],
  canned: ['טונה', 'tuna', 'שימורים', 'קופסה'],
  produce: ['בננה', 'banana', 'תפוח', 'מלפפון', 'עגבנ'],
  unit: [],
  general: [],
}

let remotePacks: PackRow[] | null = null

function packSource(): PackRow[] {
  return remotePacks && remotePacks.length > 0 ? remotePacks : PACKS
}

export function hydrateServingPresetsFromRows(rows: PackRow[]) {
  remotePacks = rows
}

export async function hydrateServingPresets(): Promise<void> {
  if (!supabase) return
  const { data, error } = await supabase
    .from('food_serving_presets')
    .select('id, family, label, grams, match_aliases, sort_order')
    .order('sort_order', { ascending: true })
  if (error || !data) return
  remotePacks = data.flatMap((row) => {
    const family = String(row.family) as ServingFamily
    if (!(family in FAMILY_ALIASES)) return []
    const grams = Number(row.grams)
    if (!Number.isFinite(grams) || grams <= 0) return []
    return [
      {
        id: String(row.id),
        family,
        name: String(row.label ?? row.id),
        grams,
        matchAliases: Array.isArray(row.match_aliases)
          ? row.match_aliases.map(String)
          : [],
        sortOrder: Number(row.sort_order) || 0,
      },
    ]
  })
}

export function inferServingFamily(
  name: string,
  brand?: string,
  explicit?: ServingFamily,
): ServingFamily {
  if (explicit) return explicit
  const hay = normalizeSearch(`${name} ${brand ?? ''}`)
  const order: ServingFamily[] = [
    'snack_bag',
    'canned',
    'dairy_tub',
    'egg',
    'scoop',
    'bread',
    'spoon',
    'produce',
  ]
  for (const family of order) {
    if (FAMILY_ALIASES[family].some((alias) => hay.includes(normalizeSearch(alias)))) {
      return family
    }
  }
  return 'general'
}

function dedupeUnits(units: ServingUnit[]): ServingUnit[] {
  const seen = new Set<string>()
  const out: ServingUnit[] = []
  for (const item of units) {
    const key = String(roundTo(item.grams, 2))
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      id: item.id,
      name: item.name,
      grams: item.grams,
      is_default: item.is_default,
    })
  }
  return out
}

function withFallbacks(units: ServingUnit[]): ServingUnit[] {
  const grams = new Set(units.map((u) => roundTo(u.grams, 2)))
  const extra = FALLBACK_SERVING_UNITS.filter(
    (u) => !grams.has(roundTo(u.grams, 2)),
  )
  return dedupeUnits([...units, ...extra])
}

function familyUnits(family: ServingFamily): ServingUnit[] {
  return packSource()
    .filter((row) => row.family === family)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ id, name, grams, is_default }) => ({ id, name, grams, is_default }))
}

export function resolveServingUnits(input: {
  name: string
  brand?: string
  servingGrams?: number
  servingLabel?: string
  family?: ServingFamily
  serving_units?: ServingUnit[]
}): ServingUnit[] {
  const servingGrams =
    input.servingGrams != null && input.servingGrams > 0
      ? roundTo(input.servingGrams, 2)
      : 0
  const family = inferServingFamily(input.name, input.brand, input.family)
  const explicit = (input.serving_units ?? []).filter((u) => u.grams > 0)
  const fromFamily = family === 'general' || family === 'unit' ? [] : familyUnits(family)
  const product =
    servingGrams > 0
      ? [
          unit(
            `product-${servingGrams}`,
            `${input.servingLabel?.trim() || 'מנה'} (${servingGrams}g)`,
            servingGrams,
            { is_default: explicit.length === 0 && fromFamily.every((u) => !u.is_default) },
          ),
        ]
      : []

  const merged = withFallbacks(
    dedupeUnits([...explicit, ...fromFamily, ...product]),
  )

  if (!merged.some((u) => u.is_default)) {
    const preferred =
      merged.find((u) => servingGrams > 0 && Math.abs(u.grams - servingGrams) < 0.05) ??
      merged[0]
    return merged.map((u) =>
      preferred && u.id === preferred.id ? { ...u, is_default: true } : { ...u, is_default: false },
    )
  }
  return merged
}

/** @deprecated use resolveServingUnits */
export function presetsForFood(
  name: string,
  brand?: string,
  servingGrams = 100,
  servingLabel = 'מנה',
  family?: ServingFamily,
): ServingUnit[] {
  return resolveServingUnits({ name, brand, servingGrams, servingLabel, family })
}

export function defaultServingUnit(units: ServingUnit[]): ServingUnit | undefined {
  return units.find((u) => u.is_default) ?? units[0]
}

export function servingUnitById(
  units: ServingUnit[],
  id: string,
): ServingUnit | undefined {
  return units.find((u) => u.id === id)
}

export function effectiveGrams(
  quantity: number,
  unitId: string,
  units: ServingUnit[],
): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0
  if (unitId === GRAMS_UNIT_ID) return quantity
  const found = servingUnitById(units, unitId)
  return roundTo(quantity * (found?.grams ?? 1), 2)
}

export function convertQuantityKeepingGrams(
  quantity: number,
  fromId: string,
  toId: string,
  units: ServingUnit[],
): number {
  const grams = effectiveGrams(quantity, fromId, units)
  if (toId === GRAMS_UNIT_ID) return grams
  const found = servingUnitById(units, toId)
  if (!found || found.grams <= 0) return quantity
  return roundTo(grams / found.grams, 2)
}

export const GRAMS_PRESET_ID = GRAMS_UNIT_ID

export function matchPreset(
  units: ServingUnit[],
  grams: number | null,
  mode: 'grams' | 'serving',
): string {
  if (mode === 'grams' || grams == null) return GRAMS_UNIT_ID
  return units.find((u) => Math.abs(u.grams - grams) < 0.05)?.id ?? GRAMS_UNIT_ID
}
