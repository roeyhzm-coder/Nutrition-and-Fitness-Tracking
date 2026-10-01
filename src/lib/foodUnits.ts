export type FoodAmountUnit = 'grams' | 'serving'

export const BREAD_SLICE_GRAMS = 35
export const DEFAULT_SERVING_GRAMS = 100
export const DEFAULT_GRAMS_AMOUNT = '100'
export const DEFAULT_SERVING_AMOUNT = '1'

const BREAD_RE =
  /לחם|פרוסה|חלה|פיתה|bread|toast|bagel|baguette|pita|brioche|ciabatta/i

export function isBreadLike(name: string, brand?: string): boolean {
  return BREAD_RE.test(`${name} ${brand ?? ''}`)
}

export function gramsPerServing(name: string, brand?: string): number {
  return isBreadLike(name, brand) ? BREAD_SLICE_GRAMS : DEFAULT_SERVING_GRAMS
}

export function servingHint(name: string, brand?: string): string {
  const grams = gramsPerServing(name, brand)
  return isBreadLike(name, brand)
    ? `פרוסה = ${grams} גרם`
    : `מנה = ${grams} גרם`
}

export function resolveAmountGrams(
  amount: number,
  unit: FoodAmountUnit,
  name: string,
  brand?: string,
): number {
  if (unit === 'grams') return amount
  return amount * gramsPerServing(name, brand)
}
