import { PANTRY_CATEGORY_LABELS, PANTRY_ITEMS, type PantryItem } from '../data/pantry'
import { savedPresetKind } from '../data/defaults'
import { savedItemServingGrams } from './foodUnits'
import {
  formatNiceNumber,
  parseDecimal,
  parsePositiveDecimal,
  roundTo,
} from './numericInput'
import {
  recipePortionUnits,
  recipeServings,
  recipeWithVariation,
  resolveServingGrams,
} from './recipesApi'
import {
  defaultServingUnit,
  effectiveGrams,
  GRAMS_UNIT_ID,
  resolveServingUnits,
  type ServingFamily,
} from './servingUnits'
import type { ServingUnit } from './types'
import type {
  Recipe,
  SavedMeal,
  SavedMealComponent,
  SavedPresetKind,
} from './types'

export type MacroPer100g = {
  calories: number
  protein: number
  carbs: number
  fats: number
}

export type CatalogSource = 'pantry' | 'recipe' | 'saved' | 'israeli'

export type CatalogFood = {
  id: string
  name: string
  brand?: string
  category: string
  aliases: string[]
  servingGrams: number
  servingLabel: string
  calories: number
  protein: number
  carbs: number
  fats: number
  per100g: MacroPer100g
  source: CatalogSource
  kind: SavedPresetKind
  servingFamily?: ServingFamily
  serving_units: ServingUnit[]
  servingPresets: ServingUnit[]
}

export type MealIngredientLine = {
  id: string
  name: string
  amount: string
  unit: 'grams' | 'serving'
  unitId: string
  servingGrams: number
  servingLabel: string
  calories: number
  protein: number
  carbs: number
  fats: number
  per100g: MacroPer100g
  kind: SavedPresetKind
  catalogId?: string
  presetId?: string
  serving_units: ServingUnit[]
  servingPresets: ServingUnit[]
}

export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/['׳`״"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function macrosFromPer100g(per100g: MacroPer100g, grams: number) {
  const f = grams / 100
  return {
    calories: roundTo(per100g.calories * f, 2),
    protein: roundTo(per100g.protein * f, 2),
    carbs: roundTo(per100g.carbs * f, 2),
    fats: roundTo(per100g.fats * f, 2),
  }
}

function per100gFromServing(
  calories: number,
  protein: number,
  carbs: number,
  fats: number,
  servingGrams: number,
): MacroPer100g {
  const grams = servingGrams > 0 ? servingGrams : 100
  const f = 100 / grams
  return {
    calories: roundTo(calories * f, 2),
    protein: roundTo(protein * f, 2),
    carbs: roundTo(carbs * f, 2),
    fats: roundTo(fats * f, 2),
  }
}

function withUnits(
  units: ServingUnit[],
): { serving_units: ServingUnit[]; servingPresets: ServingUnit[] } {
  return { serving_units: units, servingPresets: units }
}

export function pantryToCatalog(item: PantryItem): CatalogFood {
  const macros = macrosFromPer100g(item, item.servingGrams)
  const units = resolveServingUnits({
    name: item.name,
    brand: item.brand,
    servingGrams: item.servingGrams,
    servingLabel: item.servingLabel,
    family: item.servingFamily,
    serving_units: item.serving_units,
  })
  return {
    id: item.id,
    name: item.name,
    brand: item.brand,
    category: PANTRY_CATEGORY_LABELS[item.category],
    aliases: item.aliases,
    servingGrams: item.servingGrams,
    servingLabel: item.servingLabel,
    calories: macros.calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fats: macros.fats,
    per100g: {
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fats: item.fats,
    },
    source: 'pantry',
    kind: 'item',
    servingFamily: item.servingFamily,
    ...withUnits(units),
  }
}

export function recipeToCatalog(recipe: Recipe): CatalogFood {
  const profile = recipeWithVariation(recipe)
  const servingGrams = resolveServingGrams(profile)
  const units = recipePortionUnits(profile)
  const servingLabel =
    defaultServingUnit(units)?.name ?? `מנה 1 (1 מתוך ${recipeServings(profile)})`
  return {
    id: `recipe:${recipe.id}`,
    name: recipe.name,
    category: 'מתכון',
    aliases: [
      ...profile.ingredients,
      ...recipe.tags,
      ...(recipe.description ? [recipe.description] : []),
      ...(recipe.variations ?? []).map((item) => item.name),
    ],
    servingGrams,
    servingLabel,
    calories: profile.calories,
    protein: profile.proteinG,
    carbs: profile.carbsG,
    fats: profile.fatsG,
    per100g: per100gFromServing(
      profile.calories,
      profile.proteinG,
      profile.carbsG,
      profile.fatsG,
      servingGrams,
    ),
    source: 'recipe',
    kind: 'meal',
    servingFamily: 'unit',
    ...withUnits(units),
  }
}

export function savedToCatalog(meal: SavedMeal): CatalogFood {
  const servingGrams = savedItemServingGrams(meal)
  const kind = savedPresetKind(meal)
  return {
    id: `saved:${meal.id}`,
    name: meal.name,
    category: kind === 'meal' ? 'ארוחה שמורה' : 'פריט שמור',
    aliases: meal.notes ? [meal.notes] : [],
    servingGrams,
    servingLabel: 'מנה',
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fats: meal.fats,
    per100g: per100gFromServing(
      meal.calories,
      meal.protein,
      meal.carbs,
      meal.fats,
      servingGrams,
    ),
    source: 'saved',
    kind,
    servingFamily: kind === 'meal' ? 'unit' : undefined,
    ...withUnits(
      resolveServingUnits({
        name: meal.name,
        servingGrams,
        servingLabel: 'מנה',
        family: kind === 'meal' ? 'unit' : undefined,
        serving_units: meal.serving_units,
      }),
    ),
  }
}

export function buildFoodCatalog(
  recipes: Recipe[],
  savedMeals: SavedMeal[],
  excludeSavedId?: string,
): CatalogFood[] {
  const items = PANTRY_ITEMS.map(pantryToCatalog)
  for (const recipe of recipes) {
    items.push(recipeToCatalog(recipe))
  }
  for (const meal of savedMeals) {
    if (meal.id === excludeSavedId) continue
    items.push(savedToCatalog(meal))
  }
  return items
}

export function filterCatalog(
  items: CatalogFood[],
  query: string,
  limit = 12,
): CatalogFood[] {
  const q = normalizeSearch(query)
  if (!q) return items.slice(0, limit)
  const scored: { item: CatalogFood; score: number }[] = []
  for (const item of items) {
    const name = normalizeSearch(item.name)
    const brand = normalizeSearch(item.brand ?? '')
    const category = normalizeSearch(item.category)
    const hay = [name, brand, category, ...item.aliases.map(normalizeSearch)]
    let score = 0
    if (name.startsWith(q) || name.includes(` ${q}`)) score = 120
    else if (brand.startsWith(q)) score = 110
    else if (name.includes(q)) score = 90
    else if (brand.includes(q)) score = 80
    else if (hay.some((h) => h.startsWith(q))) score = 70
    else if (hay.some((h) => h.includes(q))) score = 50
    if (score > 0) scored.push({ item, score: score - name.length * 0.02 })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((row) => row.item)
}

export function catalogDisplayName(item: CatalogFood): string {
  return item.brand ? `${item.name} · ${item.brand}` : item.name
}

export function catalogMacroPreview(item: {
  calories: number
  protein: number
  carbs: number
  fats: number
}): string {
  return [
    `${formatNiceNumber(item.calories, 0)} קק״ל`,
    `ח ${formatNiceNumber(item.protein)}`,
    `פ ${formatNiceNumber(item.carbs)}`,
    `ש ${formatNiceNumber(item.fats)}`,
  ].join(' · ')
}

export function catalogToLine(item: CatalogFood, id: string): MealIngredientLine {
  const units = item.serving_units
  const def = defaultServingUnit(units)
  const servingGrams = def?.grams ?? item.servingGrams
  const servingLabel = def?.name ?? item.servingLabel
  const macros = macrosFromPer100g(item.per100g, servingGrams)
  return {
    id,
    name: catalogDisplayName(item),
    amount: '1',
    unit: 'serving',
    unitId: def?.id ?? GRAMS_UNIT_ID,
    servingGrams,
    servingLabel,
    calories: macros.calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fats: macros.fats,
    per100g: item.per100g,
    kind: item.kind,
    catalogId: item.id,
    presetId: def?.id,
    serving_units: units,
    servingPresets: units,
  }
}

export function emptyIngredientLine(id: string): MealIngredientLine {
  const units = resolveServingUnits({
    name: 'מזון',
    servingGrams: 100,
    servingLabel: 'מנה',
    family: 'general',
  })
  return {
    id,
    name: '',
    amount: '1',
    unit: 'serving',
    unitId: defaultServingUnit(units)?.id ?? GRAMS_UNIT_ID,
    servingGrams: 100,
    servingLabel: 'מנה',
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    per100g: { calories: 0, protein: 0, carbs: 0, fats: 0 },
    kind: 'item',
    serving_units: units,
    servingPresets: units,
  }
}

export function applyLineQuantity(
  line: MealIngredientLine,
  quantity: string,
  unitId: string,
): MealIngredientLine {
  const units = line.serving_units
  const amount = parsePositiveDecimal(quantity)
  const grams = amount != null ? effectiveGrams(amount, unitId, units) : 0
  const macros =
    grams > 0
      ? macrosFromPer100g(line.per100g, grams)
      : { calories: 0, protein: 0, carbs: 0, fats: 0 }
  const found = units.find((u) => u.id === unitId)
  return {
    ...line,
    amount: quantity,
    unitId,
    unit: unitId === GRAMS_UNIT_ID ? 'grams' : 'serving',
    servingGrams: found?.grams ?? (unitId === GRAMS_UNIT_ID ? 1 : line.servingGrams),
    servingLabel: found?.name ?? (unitId === GRAMS_UNIT_ID ? 'גרמים' : line.servingLabel),
    presetId: found?.id,
    calories: macros.calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fats: macros.fats,
  }
}

export function lineToComponent(line: MealIngredientLine): SavedMealComponent {
  return {
    name: line.name,
    amount: line.amount,
    unit: line.unit,
    servingGrams: line.servingGrams,
    servingLabel: line.servingLabel,
    calories: line.calories,
    protein: line.protein,
    carbs: line.carbs,
    fats: line.fats,
    per100g: line.per100g,
    kind: line.kind,
    catalogId: line.catalogId,
    presetId: line.presetId,
    unitId: line.unitId,
    serving_units: line.serving_units,
  }
}

export function scaleLineQuantity(
  line: MealIngredientLine,
  ratio: number,
): MealIngredientLine {
  if (!Number.isFinite(ratio) || ratio === 1) return line
  const n = parseDecimal(line.amount)
  if (n == null) return line
  return applyLineQuantity(
    line,
    formatNiceNumber(n * ratio, 2),
    line.unitId,
  )
}

export function mealComponentsToLines(
  components: SavedMealComponent[] | undefined,
): MealIngredientLine[] {
  if (!components?.length) return []
  return components.map((component, index) =>
    componentToLine(component, `comp-${index}`),
  )
}

export function componentToLine(
  component: SavedMealComponent,
  id: string,
): MealIngredientLine {
  const units = resolveServingUnits({
    name: component.name,
    servingGrams: component.servingGrams,
    servingLabel: component.servingLabel,
    family: component.kind === 'meal' ? 'unit' : undefined,
    serving_units: component.serving_units,
  })
  const unitId =
    component.unitId ??
    (component.unit === 'grams' ? GRAMS_UNIT_ID : component.presetId ?? defaultServingUnit(units)?.id ?? GRAMS_UNIT_ID)
  return applyLineQuantity(
    {
      id,
      name: component.name,
      amount: component.amount,
      unit: component.unit,
      unitId,
      servingGrams: component.servingGrams,
      servingLabel: component.servingLabel,
      calories: component.calories,
      protein: component.protein,
      carbs: component.carbs,
      fats: component.fats,
      per100g: component.per100g,
      kind: component.kind ?? 'item',
      catalogId: component.catalogId,
      presetId: component.presetId,
      serving_units: units,
      servingPresets: units,
    },
    component.amount,
    unitId,
  )
}

export function suggestMealName(lines: MealIngredientLine[]): string {
  const named = lines.filter((line) => line.name.trim())
  if (named.length === 0) return ''
  const describe = (line: MealIngredientLine) => {
    const amount = line.amount.trim() || '1'
    if (line.unit === 'grams') return `${amount} גרם ${line.name}`
    return `${amount} ${line.servingLabel} ${line.name}`
  }
  if (named.length === 1) return describe(named[0])
  const [first, ...rest] = named
  return `${first.name} עם ${rest.map(describe).join(' ו')}`
}

export function scaleIngredientLine(line: MealIngredientLine) {
  const amount = parsePositiveDecimal(line.amount)
  if (amount == null) {
    return { calories: 0, protein: 0, carbs: 0, fats: 0, grams: 0 }
  }
  const grams = effectiveGrams(
    amount,
    line.unitId ?? (line.unit === 'grams' ? GRAMS_UNIT_ID : line.presetId ?? GRAMS_UNIT_ID),
    line.serving_units ?? line.servingPresets,
  )
  return { ...macrosFromPer100g(line.per100g, grams), grams }
}

export function sumIngredientLines(lines: MealIngredientLine[]) {
  return lines.reduce(
    (acc, line) => {
      if (!line.name.trim()) return acc
      const scaled = scaleIngredientLine(line)
      acc.calories += scaled.calories
      acc.protein = roundTo(acc.protein + scaled.protein, 2)
      acc.carbs = roundTo(acc.carbs + scaled.carbs, 2)
      acc.fats = roundTo(acc.fats + scaled.fats, 2)
      acc.grams = roundTo(acc.grams + scaled.grams, 2)
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fats: 0, grams: 0 },
  )
}

export function formatIngredientNotes(lines: MealIngredientLine[]): string {
  return lines
    .filter((line) => line.name.trim())
    .map((line) => {
      const amount = line.amount.trim() || '1'
      if (line.unit === 'grams') return `${amount} גרם ${line.name}`
      return `${amount} ${line.servingLabel} ${line.name}`
    })
    .join(' · ')
}
