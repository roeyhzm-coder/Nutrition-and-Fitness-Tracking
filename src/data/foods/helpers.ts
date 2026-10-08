import type { FoodPortion, IsraeliFood } from './types'

export function portions(
  ...rows: Array<[name: string, grams: number, isDefault?: boolean]>
): FoodPortion[] {
  const mapped = rows.map(([name, grams, isDefault]) => ({
    name,
    grams,
    isDefault: Boolean(isDefault),
  }))
  if (!mapped.some((p) => p.isDefault) && mapped.length > 0) {
    mapped[0] = { ...mapped[0], isDefault: true }
  }
  if (!mapped.some((p) => p.grams === 100 && p.name.includes('100'))) {
    mapped.push({ name: '100 גרם', grams: 100, isDefault: mapped.length === 0 })
  }
  return mapped
}

export const P = {
  dairy: () =>
    portions(
      ['גביע שלם', 250, true],
      ['חצי גביע', 125],
      ['כף', 30],
      ['100 גרם', 100],
    ),
  yogurtCup: () =>
    portions(
      ['גביע', 150, true],
      ['חצי גביע', 75],
      ['כף', 25],
      ['100 גרם', 100],
    ),
  milk: () =>
    portions(
      ['כוס', 240, true],
      ['חצי כוס', 120],
      ['כף', 15],
      ['100 מ״ל', 100],
    ),
  cheeseSlice: () =>
    portions(
      ['פרוסה', 25, true],
      ['2 פרוסות', 50],
      ['כף מגורדת', 10],
      ['100 גרם', 100],
    ),
  produce: (small: number, medium: number, large: number, cup = 120) =>
    portions(
      ['יחידה בינונית', medium, true],
      ['יחידה קטנה', small],
      ['יחידה גדולה', large],
      ['כוס קוביות', cup],
      ['100 גרם', 100],
    ),
  leaf: () =>
    portions(
      ['כוס', 30, true],
      ['חופן', 20],
      ['יחידה', 10],
      ['100 גרם', 100],
    ),
  bread: () =>
    portions(
      ['פרוסה', 30, true],
      ['2 פרוסות', 60],
      ['לחמניה', 80],
      ['100 גרם', 100],
    ),
  pita: () =>
    portions(
      ['פיתה', 75, true],
      ['חצי פיתה', 38],
      ['פיתה קטנה', 50],
      ['100 גרם', 100],
    ),
  bun: () =>
    portions(
      ['לחמניה', 80, true],
      ['חצי לחמניה', 40],
      ['פרוסה', 30],
      ['100 גרם', 100],
    ),
  cracker: () =>
    portions(
      ['יחידה', 8, true],
      ['4 יחידות', 32],
      ['פרוסה', 10],
      ['100 גרם', 100],
    ),
  meat: () =>
    portions(
      ['יחידה / מנה', 120, true],
      ['חצי מנה', 60],
      ['כף', 20],
      ['100 גרם', 100],
    ),
  cookedGrain: () =>
    portions(
      ['כוס מבושל', 160, true],
      ['חצי כוס', 80],
      ['כף', 20],
      ['100 גרם', 100],
    ),
  dryGrain: () =>
    portions(
      ['כוס יבש', 180, true],
      ['חצי כוס', 90],
      ['כף', 12],
      ['100 גרם', 100],
    ),
  cereal: () =>
    portions(
      ['כוס', 40, true],
      ['חצי כוס', 20],
      ['כף', 10],
      ['100 גרם', 100],
    ),
  spoon: () =>
    portions(
      ['כף', 15, true],
      ['כפית', 5],
      ['2 כפות', 30],
      ['100 גרם', 100],
    ),
  scoop: () =>
    portions(
      ['סקופ', 30, true],
      ['חצי סקופ', 15],
      ['כף', 10],
      ['100 גרם', 100],
    ),
  tahini: () =>
    portions(
      ['כף', 15, true],
      ['כפית', 5],
      ['רבע כוס', 60],
      ['100 גרם', 100],
    ),
  peanutButter: () =>
    portions(
      ['כף שטוחה', 15, true],
      ['כף גדושה', 25],
      ['כפית', 5],
      ['100 גרם', 100],
    ),
  hummus: () =>
    portions(
      ['כף', 25, true],
      ['חצי גביע', 125],
      ['גביע', 250],
      ['100 גרם', 100],
    ),
  snackBag: (small: number, medium: number, large: number) =>
    portions(
      [`שקית ${small}ג`, small, true],
      [`שקית ${medium}ג`, medium],
      [`שקית ${large}ג`, large],
      ['חופן', 15],
      ['100 גרם', 100],
    ),
  chocolate: () =>
    portions(
      ['ריבוע', 8, true],
      ['4 ריבועים', 32],
      ['חפיסה', 100],
      ['100 גרם', 100],
    ),
  iceCream: () =>
    portions(
      ['כדור', 60, true],
      ['גביע', 100],
      ['כף', 20],
      ['100 גרם', 100],
    ),
  dish: (serving: number) =>
    portions(
      ['מנה', serving, true],
      ['חצי מנה', Math.round(serving / 2)],
      ['כף', 30],
      ['100 גרם', 100],
    ),
  egg: () =>
    portions(
      ['יחידה L', 60, true],
      ['יחידה XL', 70],
      ['חלבון בלבד', 33],
      ['100 גרם', 100],
    ),
  tuna: () =>
    portions(
      ['קופסה מסוננת', 112, true],
      ['כף', 16],
      ['חצי קופסה', 56],
      ['100 גרם', 100],
    ),
}

function slugPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['׳`״"]/g, '')
    .replace(/[^a-z0-9א-ת]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

export function food(
  category: string,
  name: string,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  portionList: FoodPortion[],
  brand: string | null = null,
): IsraeliFood {
  const slug = [category, slugPart(name), slugPart(brand ?? 'gen')]
    .filter(Boolean)
    .join('-')
  return {
    id: `il-${slug}`,
    name,
    category,
    brand,
    calories_per_100g: calories,
    protein_per_100g: protein,
    carbs_per_100g: carbs,
    fat_per_100g: fat,
    portions: portionList,
  }
}

export function withBrands(
  brands: Array<string | null>,
  make: (brand: string | null) => IsraeliFood,
): IsraeliFood[] {
  return brands.map((brand) => make(brand))
}

export function labeled(name: string, brand?: string | null) {
  void brand
  return name
}
