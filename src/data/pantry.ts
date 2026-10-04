export type PantryCategory =
  | 'dairy'
  | 'cheese'
  | 'bread'
  | 'protein'
  | 'spreads'
  | 'sauces'
  | 'produce'
  | 'staples'
  | 'snacks'

export const PANTRY_CATEGORY_LABELS: Record<PantryCategory, string> = {
  dairy: 'מוצרי חלב',
  cheese: 'גבינות',
  bread: 'לחם',
  protein: 'חלבון',
  spreads: 'ממרחים',
  sauces: 'רטבים',
  produce: 'ירקות ופירות',
  staples: 'מזווה',
  snacks: 'נשנושים',
}

export type PantryServingFamily =
  | 'dairy_tub'
  | 'bread'
  | 'egg'
  | 'scoop'
  | 'spoon'
  | 'unit'
  | 'general'

export type PantryItem = {
  id: string
  name: string
  brand?: string
  category: PantryCategory
  aliases: string[]
  /** Macros per 100g (or 100ml when the serving is liquid). */
  calories: number
  protein: number
  carbs: number
  fats: number
  servingGrams: number
  servingLabel: string
  servingFamily?: PantryServingFamily
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
  extra?: {
    brand?: string
    aliases?: string[]
    servingFamily?: PantryServingFamily
  },
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
    servingFamily: extra?.servingFamily,
  }
}

/** Verified Israeli pantry staples from recipe-book, plus everyday proteins. Values are per 100g. */
export const PANTRY_ITEMS: PantryItem[] = [
  p('pantry-cottage-tnuva-5', "קוטג' 5%", 'dairy', 95, 10.7, 1.8, 5, 250, 'גביע', {
    brand: 'תנובה',
    aliases: ['קוטג', 'cottage', 'קוטג תנובה', 'גביע קוטג'],
    servingFamily: 'dairy_tub',
  }),
  p('pantry-cottage-strauss-5', "קוטג' 5%", 'dairy', 93, 11, 1.5, 5, 250, 'גביע', {
    brand: 'שטראוס',
    aliases: ['קוטג', 'cottage', 'קוטג שטראוס'],
    servingFamily: 'dairy_tub',
  }),
  p('pantry-cottage-tnuva-3', "קוטג' 3%", 'dairy', 80, 12, 3.5, 3, 250, 'גביע', {
    brand: 'תנובה',
    aliases: ['קוטג', 'cottage', 'קוטג 3'],
    servingFamily: 'dairy_tub',
  }),
  p('pantry-cottage-tnuva-9', "קוטג' 9%", 'dairy', 130, 10, 3.5, 9, 250, 'גביע', {
    brand: 'תנובה',
    aliases: ['קוטג', 'cottage', 'קוטג 9'],
    servingFamily: 'dairy_tub',
  }),
  p('pantry-white-cheese-5', 'גבינה לבנה 5%', 'dairy', 97, 11, 3.5, 4.5, 100, 'מנה', {
    brand: 'תנובה',
    aliases: ['גבינה לבנה', 'white cheese'],
    servingFamily: 'dairy_tub',
  }),
  p('pantry-greek-yogurt-0', 'יוגורט יווני 0%', 'dairy', 57, 10, 4, 0.2, 150, 'גביע', {
    aliases: ['יוגורט', 'greek yogurt', 'יווני'],
    servingFamily: 'dairy_tub',
  }),
  p('pantry-yogurt-15', 'יוגורט 1.5%', 'dairy', 60, 4.5, 6, 1.5, 150, 'גביע', {
    aliases: ['יוגורט'],
    servingFamily: 'dairy_tub',
  }),
  p('pantry-milk-1', 'חלב 1%', 'dairy', 42, 3.4, 5, 1, 200, 'כוס', {
    aliases: ['חלב', 'milk'],
  }),
  p(
    'pantry-alpro-almond',
    'משקה שקדים ללא סוכר',
    'dairy',
    15,
    0.5,
    0,
    1.2,
    200,
    'כוס',
    {
      brand: 'Alpro',
      aliases: ['אלפרו', 'alpro', 'שקדים', 'משקה שקדים', 'חלב שקדים'],
    },
  ),
  p('pantry-egg-l', 'ביצה L', 'dairy', 133, 12.5, 0.7, 9.2, 60, 'יחידה L', {
    aliases: ['ביצה', 'ביצים', 'egg', 'L'],
    servingFamily: 'egg',
  }),
  p('pantry-egg-m', 'ביצה M', 'dairy', 133, 12.5, 0.7, 9.2, 50, 'יחידה M', {
    aliases: ['ביצה', 'ביצים', 'egg', 'M', 'ביצה בינונית'],
    servingFamily: 'egg',
  }),

  p('pantry-mozz-gad-22', 'מוצרלה מגוררת 22%', 'cheese', 285, 21, 0, 22, 30, 'מנה', {
    brand: 'גד',
    aliases: ['מוצרלה', 'mozzarella', 'גד'],
  }),
  p('pantry-noam-tara-9', 'גבינת נועם 9%', 'cheese', 201, 30, 0, 9, 22.5, 'פרוסה', {
    brand: 'טרה',
    aliases: ['נועם', 'צהובה', 'עמק', 'yellow cheese', 'טרה'],
  }),
  p('pantry-yellow-emek-9', 'גבינה צהובה 9%', 'cheese', 250, 25, 1, 16, 20, 'פרוסה', {
    brand: 'עמק',
    aliases: ['צהובה', 'עמק', 'yellow cheese'],
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

  p(
    'pantry-bread-angel-ww',
    'לחם 100% קמח מלא',
    'bread',
    227,
    11.2,
    36.6,
    2.4,
    35,
    'פרוסה',
    {
      brand: "אנג'ל",
      aliases: ['לחם', 'לחם אנגול', 'לחם אנג׳ל', 'angel', 'פרוסה', 'מלא'],
      servingFamily: 'bread',
    },
  ),
  p('pantry-angel-rye', 'לחם שיפון', 'bread', 230, 8, 40, 2, 35, 'פרוסה', {
    brand: "אנג'ל",
    aliases: ['לחם', 'שיפון', 'angel'],
    servingFamily: 'bread',
  }),
  p('pantry-bread-generic', 'לחם', 'bread', 265, 9, 49, 3.2, 30, 'פרוסה', {
    aliases: ['לחם', 'פרוסה', 'bread', 'slice'],
    servingFamily: 'bread',
  }),
  p('pantry-pita-whole', 'פיתה מלאה', 'bread', 265, 9, 50, 2.5, 70, 'יחידה', {
    aliases: ['פיתה', 'pita', 'לחם'],
    servingFamily: 'bread',
  }),
  p(
    'pantry-tortilla-shkadia',
    'טורטייה חיטה',
    'bread',
    310,
    8.5,
    54,
    6.5,
    45,
    'יחידה',
    {
      brand: 'שקדיה',
      aliases: ['טורטיה', 'טורטייה', 'tortilla', 'שקדיה'],
    },
  ),
  p(
    'pantry-tortilla-masterchef',
    'טורטייה חיטה וכוסמין',
    'bread',
    298,
    9,
    52,
    5.5,
    40,
    'יחידה',
    {
      brand: 'מאסטר שף',
      aliases: ['טורטיה', 'טורטייה', 'tortilla', 'כוסמין'],
    },
  ),

  p(
    'pantry-protein-myprotein-white-choc',
    'אבקת חלבון שוקולד לבן',
    'protein',
    408,
    80,
    7.5,
    7.2,
    25,
    'סקופ',
    {
      brand: 'Myprotein',
      aliases: ['אבקת', 'חלבון', 'whey', 'myprotein', 'מייפרוטאין', 'סקופ', 'שוקולד'],
      servingFamily: 'scoop',
    },
  ),
  p('pantry-whey-generic', 'אבקת חלבון', 'protein', 400, 80, 5, 5, 30, 'סקופ', {
    aliases: ['אבקת', 'חלבון', 'whey', 'protein'],
    servingFamily: 'scoop',
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
  p(
    'pantry-schnitzel-airfryer',
    'שניצל ביתי אייר פרייר',
    'protein',
    215,
    24,
    13,
    7,
    120,
    'יחידה',
    {
      aliases: ['שניצל', 'schnitzel', 'עוף'],
    },
  ),

  p('pantry-pb-bd', 'חמאת בוטנים טבעית', 'spreads', 630, 26, 15, 52, 15, 'כף', {
    brand: 'B&D',
    aliases: ['חמאת בוטנים', 'בוטנים', 'peanut', 'bd', 'בי אנד די'],
    servingFamily: 'spoon',
  }),
  p('pantry-tahini', 'טחינה גולמית', 'spreads', 595, 17, 21, 54, 15, 'כף', {
    aliases: ['טחינה', 'tahini'],
    servingFamily: 'spoon',
  }),
  p('pantry-hummus', 'חומוס', 'spreads', 166, 8, 14, 10, 50, 'מנה', {
    aliases: ['חומוס', 'hummus'],
  }),
  p('pantry-nutella', 'ממרח נוטלה', 'spreads', 539, 6.3, 57.5, 30.9, 15, 'כף', {
    brand: 'Nutella',
    aliases: ['נוטלה', 'nutella', 'שוקולד'],
  }),

  p('pantry-ketchup-heinz', 'קטשופ', 'sauces', 119, 1, 27.2, 0, 15, 'כף', {
    brand: 'היינץ',
    aliases: ['קטשופ', 'ketchup', 'רוטב', 'היינץ', 'heinz'],
  }),
  p(
    'pantry-pomodoro-ym',
    'רוטב עגבניות פומודורו',
    'sauces',
    40,
    1.8,
    6.5,
    0,
    40,
    'כף',
    {
      brand: 'יד מרדכי',
      aliases: ['פומודורו', 'pomodoro', 'עגבניות', 'רוטב', 'marinara'],
    },
  ),
  p('pantry-mayo-light', 'מיונז לייט', 'sauces', 270, 1, 7, 26, 15, 'כף', {
    aliases: ['מיונז', 'mayo', 'רוטב'],
  }),
  p('pantry-olive-oil', 'שמן זית', 'sauces', 884, 0, 0, 100, 15, 'כף', {
    aliases: ['שמן', 'זית', 'olive'],
    servingFamily: 'spoon',
  }),
  p('pantry-soy-sauce', 'רוטב סויה', 'sauces', 53, 8, 5, 0, 10, 'כף', {
    aliases: ['סויה', 'soy', 'רוטב'],
  }),
  p('pantry-bbq', 'רוטב ברביקיו', 'sauces', 130, 0.8, 30, 0.4, 15, 'כף', {
    aliases: ['ברביקיו', 'bbq', 'רוטב'],
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
  p(
    'pantry-sweet-potato-airfryer',
    'בטטה באייר פרייר',
    'produce',
    95,
    1.8,
    21,
    0.3,
    150,
    'מנה',
    {
      aliases: ['בטטה', 'sweet potato'],
    },
  ),
  p('pantry-green-onion', 'בצל ירוק', 'produce', 32, 1.8, 7.3, 0.2, 50, 'מנה', {
    aliases: ['בצל', 'ירוק', 'green onion'],
  }),
  p('pantry-olives-yavne-green', 'זיתים ירוקים', 'produce', 118, 1, 2.4, 11, 15, 'מנה', {
    brand: 'קבוצת יבנה',
    aliases: ['זיתים', 'olives', 'יבנה'],
  }),
  p('pantry-olives-rami-mix', 'מיקס זיתים', 'produce', 204, 1.5, 4.5, 20, 15, 'מנה', {
    brand: 'רמי לוי',
    aliases: ['זיתים', 'olives', 'רמי'],
  }),

  p(
    'pantry-oats-quaker',
    'שיבולת שועל להכנה מהירה',
    'staples',
    374,
    11,
    69,
    8,
    40,
    'מנה',
    {
      brand: 'Quaker',
      aliases: ['שיבולת', 'שועל', 'oats', 'קווקר', 'quaker'],
      servingFamily: 'scoop',
    },
  ),
  p(
    'pantry-rice-daawat-cooked',
    'אורז בסמטי מבושל',
    'staples',
    123,
    2.8,
    27,
    0,
    150,
    'מנה',
    {
      brand: 'Daawat',
      aliases: ['אורז', 'rice', 'בסמטי', 'daawat'],
    },
  ),
  p(
    'pantry-rice-daawat-dry',
    'אורז בסמטי יבש',
    'staples',
    350,
    8.8,
    78,
    0,
    55,
    'מנה',
    {
      brand: 'Daawat',
      aliases: ['אורז', 'rice', 'יבש', 'בסמטי'],
    },
  ),
  p('pantry-pasta-barilla-penne', 'פסטה פנה', 'staples', 359, 13, 71, 2, 80, 'מנה', {
    brand: 'Barilla',
    aliases: ['פסטה', 'pasta', 'פנה', 'ברילה', 'barilla'],
  }),
  p('pantry-quinoa', 'קינואה מבושלת', 'staples', 120, 4.4, 21, 1.9, 150, 'מנה', {
    aliases: ['קינואה', 'quinoa'],
  }),
  p(
    'pantry-fries-airfryer',
    'צ\'יפס תפו"א באייר פרייר',
    'staples',
    125,
    2.5,
    23,
    2.8,
    150,
    'מנה',
    {
      aliases: ['ציפס', 'צ׳יפס', 'תפוח אדמה', 'fries'],
    },
  ),

  p(
    'pantry-chips-sweetango',
    "שוקולד צ'יפס ללא סוכר",
    'snacks',
    389,
    3.6,
    44.8,
    37,
    15,
    'מנה',
    {
      brand: 'Sweetango',
      aliases: ['ציפס', 'שוקולד', 'sweetango', 'נשנוש'],
    },
  ),
  p(
    'pantry-chips-lilys-salted-caramel',
    'נטיפי שוקולד קרמל מלוח',
    'snacks',
    429,
    6.5,
    57.1,
    28.6,
    14,
    'כף',
    {
      brand: "Lily's",
      aliases: ['lily', 'שוקולד', 'נטיפים', 'chips'],
    },
  ),
  p(
    'pantry-chips-mimuns-dark',
    'נטיפי שוקולד חום',
    'snacks',
    508,
    0,
    75.3,
    23,
    15,
    'מנה',
    {
      brand: 'מימונס',
      aliases: ['מימונס', 'שוקולד', 'נטיפים', 'חום'],
    },
  ),
  p(
    'pantry-chips-mimuns-white',
    'נטיפי שוקולד לבן',
    'snacks',
    530,
    0,
    68,
    29,
    15,
    'מנה',
    {
      brand: 'מימונס',
      aliases: ['מימונס', 'שוקולד', 'נטיפים', 'לבן'],
    },
  ),
  p(
    'pantry-cocoa-almandos',
    'אבקת קקאו 20%-22%',
    'snacks',
    389,
    24,
    13,
    21,
    10,
    'כף',
    {
      brand: 'אלמנדוס',
      aliases: ['קקאו', 'cocoa', 'אלמנדוס'],
    },
  ),
]
