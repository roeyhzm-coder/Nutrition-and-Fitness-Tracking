export type PantryCategory =
  | 'dairy'
  | 'cheese'
  | 'bread'
  | 'protein'
  | 'spreads'
  | 'sauces'
  | 'produce'
  | 'staples'

export const PANTRY_CATEGORY_LABELS: Record<PantryCategory, string> = {
  dairy: 'מוצרי חלב',
  cheese: 'גבינות',
  bread: 'לחם',
  protein: 'חלבון',
  spreads: 'ממרחים',
  sauces: 'רטבים',
  produce: 'ירקות ופירות',
  staples: 'מזווה',
}

export type PantryItem = {
  id: string
  name: string
  brand?: string
  category: PantryCategory
  aliases: string[]
  /** Macros per 100g. */
  calories: number
  protein: number
  carbs: number
  fats: number
  servingGrams: number
  servingLabel: string
}

function p(
  id: string,
  name: string,
  category: PantryCategory,
  calories: number,
  protein: number,
  carbs: number,
  fats: number,
  servingGrams: number,
  servingLabel: string,
  extra?: { brand?: string; aliases?: string[] },
): PantryItem {
  return {
    id,
    name,
    category,
    calories,
    protein,
    carbs,
    fats,
    servingGrams,
    servingLabel,
    brand: extra?.brand,
    aliases: extra?.aliases ?? [],
  }
}

/** Israeli pantry staples used by the catalog picker. Values are per 100g. */
export const PANTRY_ITEMS: PantryItem[] = [
  p('pantry-cottage-tnuva-5', "קוטג' 5%", 'dairy', 97, 11, 3.4, 4.5, 250, 'גביע', {
    brand: 'תנובה',
    aliases: ['קוטג', 'cottage', 'קוטג תנובה', 'גביע קוטג'],
  }),
  p('pantry-cottage-strauss-5', "קוטג' 5%", 'dairy', 97, 11, 3.4, 4.5, 250, 'גביע', {
    brand: 'שטראוס',
    aliases: ['קוטג', 'cottage', 'קוטג שטראוס'],
  }),
  p('pantry-cottage-tnuva-3', "קוטג' 3%", 'dairy', 80, 12, 3.5, 3, 250, 'גביע', {
    brand: 'תנובה',
    aliases: ['קוטג', 'cottage', 'קוטג 3'],
  }),
  p('pantry-cottage-tnuva-9', "קוטג' 9%", 'dairy', 130, 10, 3.5, 9, 250, 'גביע', {
    brand: 'תנובה',
    aliases: ['קוטג', 'cottage', 'קוטג 9'],
  }),
  p('pantry-white-cheese-5', 'גבינה לבנה 5%', 'dairy', 97, 11, 3.5, 4.5, 100, 'מנה', {
    brand: 'תנובה',
    aliases: ['גבינה לבנה', 'white cheese'],
  }),
  p('pantry-white-cheese-9', 'גבינה לבנה 9%', 'dairy', 145, 9, 3.5, 9, 100, 'מנה', {
    aliases: ['גבינה לבנה'],
  }),
  p('pantry-greek-yogurt-0', 'יוגורט יווני 0%', 'dairy', 57, 10, 4, 0.2, 150, 'גביע', {
    aliases: ['יוגורט', 'greek yogurt', 'יווני'],
  }),
  p('pantry-yogurt-15', 'יוגורט 1.5%', 'dairy', 60, 4.5, 6, 1.5, 150, 'גביע', {
    aliases: ['יוגורט'],
  }),
  p('pantry-milk-1', 'חלב 1%', 'dairy', 42, 3.4, 5, 1, 200, 'כוס', {
    aliases: ['חלב', 'milk'],
  }),
  p('pantry-egg-l', 'ביצה L', 'dairy', 143, 12.6, 0.7, 9.5, 55, 'יחידה', {
    aliases: ['ביצה', 'ביצים', 'egg'],
  }),

  p('pantry-yellow-emek-9', 'גבינה צהובה 9%', 'cheese', 250, 25, 1, 16, 20, 'פרוסה', {
    brand: 'עמק',
    aliases: ['צהובה', 'עמק', 'yellow cheese'],
  }),
  p('pantry-mozzarella-9', 'מוצרלה 9%', 'cheese', 248, 22, 2, 17, 30, 'מנה', {
    aliases: ['מוצרלה', 'mozzarella'],
  }),
  p('pantry-feta-5', 'פטה 5%', 'cheese', 150, 14, 1, 10, 30, 'מנה', {
    aliases: ['פטה', 'feta', 'בולגרית'],
  }),
  p('pantry-bulgarian-5', 'גבינה בולגרית 5%', 'cheese', 140, 15, 1, 8, 30, 'מנה', {
    aliases: ['בולגרית', 'פטה'],
  }),
  p('pantry-cream-cheese-5', 'גבינת שמנת 5%', 'cheese', 150, 8, 4, 11, 30, 'כף', {
    aliases: ['שמנת', 'cream cheese'],
  }),
  p('pantry-cottage-cheese-spread', 'גבינה לבנה למריחה 5%', 'cheese', 110, 9, 4, 5, 30, 'כף', {
    aliases: ['מריחה', 'גבינה'],
  }),

  p('pantry-angel-whole', 'לחם מלא', 'bread', 247, 9.5, 42, 3.5, 35, 'פרוסה', {
    brand: "אנג'ל",
    aliases: ['לחם', 'לחם אנגול', 'לחם אנג׳ל', 'angel', 'פרוסה', 'מלא'],
  }),
  p('pantry-angel-rye', 'לחם שיפון', 'bread', 230, 8, 40, 2, 35, 'פרוסה', {
    brand: "אנג'ל",
    aliases: ['לחם', 'שיפון', 'angel'],
  }),
  p('pantry-whole-slice', 'לחם מלא פרוס', 'bread', 250, 9, 45, 3, 35, 'פרוסה', {
    aliases: ['לחם', 'פרוסה', 'טוסט'],
  }),
  p('pantry-pita-whole', 'פיתה מלאה', 'bread', 265, 9, 50, 2.5, 70, 'יחידה', {
    aliases: ['פיתה', 'pita', 'לחם'],
  }),

  p(
    'pantry-myprotein-whey',
    'אבקת חלבון Impact Whey',
    'protein',
    412,
    82,
    4.5,
    7.5,
    25,
    'סקופ',
    {
      brand: 'Myprotein',
      aliases: ['אבקת', 'חלבון', 'whey', 'myprotein', 'מייפרוטאין', 'סקופ'],
    },
  ),
  p('pantry-whey-generic', 'אבקת חלבון', 'protein', 400, 80, 5, 5, 30, 'סקופ', {
    aliases: ['אבקת', 'חלבון', 'whey', 'protein'],
  }),
  p('pantry-chicken-breast', 'חזה עוף מבושל', 'protein', 165, 31, 0, 3.6, 100, 'מנה', {
    aliases: ['עוף', 'חזה', 'chicken'],
  }),
  p('pantry-turkey-mince', 'הודו טחון מבושל', 'protein', 170, 27, 0, 7, 100, 'מנה', {
    aliases: ['הודו', 'טחון', 'turkey'],
  }),
  p('pantry-lean-steak', 'סטייק רזה מבושל', 'protein', 180, 30, 0, 6, 100, 'מנה', {
    aliases: ['סטייק', 'בקר', 'steak'],
  }),

  p('pantry-bd-pb', 'חמאת בוטנים', 'spreads', 632, 28, 11, 53, 32, 'כף', {
    brand: 'B&D',
    aliases: ['חמאת בוטנים', 'בוטנים', 'peanut', 'bd', 'בי אנד די'],
  }),
  p('pantry-tahini', 'טחינה גולמית', 'spreads', 595, 17, 21, 54, 15, 'כף', {
    aliases: ['טחינה', 'tahini'],
  }),
  p('pantry-hummus', 'חומוס', 'spreads', 166, 8, 14, 10, 50, 'מנה', {
    aliases: ['חומוס', 'hummus'],
  }),

  p('pantry-ketchup', 'קטשופ', 'sauces', 112, 1.2, 26, 0.1, 15, 'כף', {
    aliases: ['קטשופ', 'ketchup', 'רוטב'],
  }),
  p('pantry-mayo-light', 'מיונז לייט', 'sauces', 270, 1, 7, 26, 15, 'כף', {
    aliases: ['מיונז', 'mayo', 'רוטב'],
  }),
  p('pantry-olive-oil', 'שמן זית', 'sauces', 884, 0, 0, 100, 10, 'כף', {
    aliases: ['שמן', 'זית', 'olive'],
  }),
  p('pantry-soy-sauce', 'רוטב סויה', 'sauces', 53, 8, 5, 0, 10, 'כף', {
    aliases: ['סויה', 'soy', 'רוטב'],
  }),
  p('pantry-bbq', 'רוטב ברביקיו', 'sauces', 130, 0.8, 30, 0.4, 15, 'כף', {
    aliases: ['ברביקיו', 'bbq', 'רוטב'],
  }),
  p('pantry-salsa', 'סלסה', 'sauces', 36, 1.5, 7, 0.2, 30, 'כף', {
    aliases: ['סלסה', 'salsa', 'רוטב'],
  }),
  p('pantry-tomato-sauce', 'רוטב עגבניות', 'sauces', 29, 1.3, 5.5, 0.2, 40, 'כף', {
    aliases: ['עגבניות', 'רוטב', 'marinara'],
  }),

  p('pantry-cucumber', 'מלפפון', 'produce', 16, 0.7, 3.6, 0.1, 100, 'יחידה', {
    aliases: ['מלפפון', 'cucumber'],
  }),
  p('pantry-tomato', 'עגבנייה', 'produce', 18, 0.9, 3.9, 0.2, 100, 'יחידה', {
    aliases: ['עגבניה', 'tomato'],
  }),
  p('pantry-banana', 'בננה', 'produce', 89, 1.1, 23, 0.3, 120, 'יחידה', {
    aliases: ['בננה', 'banana'],
  }),
  p('pantry-apple', 'תפוח', 'produce', 52, 0.3, 14, 0.2, 150, 'יחידה', {
    aliases: ['תפוח', 'apple'],
  }),
  p('pantry-avocado', 'אבוקדו', 'produce', 160, 2, 9, 15, 50, 'חצי', {
    aliases: ['אבוקדו', 'avocado'],
  }),
  p('pantry-berries', 'פירות יער', 'produce', 57, 0.7, 14, 0.3, 80, 'מנה', {
    aliases: ['יער', 'תות', 'berries'],
  }),
  p('pantry-sweet-potato', 'בטטה מבושלת', 'produce', 86, 1.6, 20, 0.1, 150, 'מנה', {
    aliases: ['בטטה', 'sweet potato'],
  }),

  p('pantry-oats', 'שיבולת שועל', 'staples', 389, 17, 66, 7, 40, 'מנה', {
    aliases: ['שיבולת', 'שועל', 'oats', 'קווקר'],
  }),
  p('pantry-rice', 'אורז לבן מבושל', 'staples', 130, 2.7, 28, 0.3, 150, 'מנה', {
    aliases: ['אורז', 'rice'],
  }),
  p('pantry-pasta', 'פסטה מבושלת', 'staples', 131, 5, 25, 1.1, 150, 'מנה', {
    aliases: ['פסטה', 'pasta'],
  }),
  p('pantry-quinoa', 'קינואה מבושלת', 'staples', 120, 4.4, 21, 1.9, 150, 'מנה', {
    aliases: ['קינואה', 'quinoa'],
  }),
]
