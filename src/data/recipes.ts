export type RecipeAppliance = 'ninja-grill' | 'air-fryer' | 'ninja-creami'

export type Recipe = {
  id: string
  name: string
  appliance: RecipeAppliance
  proteinG: number
  calories: number
  carbsG: number
  fatsG: number
  timeMin: number
  tags: string[]
  ingredients: string[]
  steps: string[]
}

export const APPLIANCE_LABELS: Record<RecipeAppliance, string> = {
  'ninja-grill': 'נינג׳ה גריל',
  'air-fryer': 'אייר פרייר',
  'ninja-creami': 'נינג׳ה קרימי',
}

/** מתכונים עתירי חלבון — ללא דגים/טונה, חרדל ובשר מעובד */
export const RECIPES: Recipe[] = [
  {
    id: 'grill-chicken-skewers',
    name: 'שיפודי חזה עוף בנינג׳ה גריל',
    appliance: 'ninja-grill',
    proteinG: 48,
    calories: 320,
    carbsG: 6,
    fatsG: 10,
    timeMin: 25,
    tags: ['ארוחת צהריים', 'גבוה חלבון'],
    ingredients: [
      '400 גרם חזה עוף',
      'כף שמן זית',
      'שום כתוש',
      'פפריקה מתוקה',
      'מלח ופלפל',
      'מיץ לימון',
    ],
    steps: [
      'לחתוך לקוביות ולערבב עם התבלינים.',
      'להשחיל על שיפודים.',
      'לצלות בנינג׳ה גריל 10–12 דק׳ עד מוכן.',
    ],
  },
  {
    id: 'grill-turkey-burger',
    name: 'המבורגר הודו רזה בגריל',
    appliance: 'ninja-grill',
    proteinG: 42,
    calories: 380,
    carbsG: 28,
    fatsG: 12,
    timeMin: 20,
    tags: ['ארוחת ערב'],
    ingredients: [
      '300 גרם בשר הודו טחון',
      'חלמון ביצה',
      'בצל קצוץ',
      'תבלינים לפי טעם',
      'לחם מלא / חסה לעטיפה',
    ],
    steps: [
      'לערבב בשר, ביצה ובצל לעיסת קציצות.',
      'לעצב קציצות ולצלות בנינג׳ה גריל.',
      'להגיש בלחם מלא או בעלי חסה.',
    ],
  },
  {
    id: 'grill-steak-veg',
    name: 'סטייק רזה עם ירקות צלויים',
    appliance: 'ninja-grill',
    proteinG: 45,
    calories: 410,
    carbsG: 12,
    fatsG: 18,
    timeMin: 22,
    tags: ['ארוחת ערב', 'דל פחמימה'],
    ingredients: [
      '250 גרם סטייק רזה',
      'זוקיני ופלפלים',
      'שמן זית',
      'מלח, פלפל, שום',
    ],
    steps: [
      'לתבל את הבשר והירקות.',
      'לצלות את הסטייק ואז את הירקות בנינג׳ה גריל.',
    ],
  },
  {
    id: 'af-chicken-thighs',
    name: 'ירכי עוף פריכות באייר פרייר',
    appliance: 'air-fryer',
    proteinG: 40,
    calories: 360,
    carbsG: 4,
    fatsG: 16,
    timeMin: 28,
    tags: ['ארוחת ערב'],
    ingredients: [
      '4 ירכי עוף ללא עור',
      'פפריקה, שום גבישי, מלח',
      'רסס שמן קל',
    ],
    steps: [
      'לייבש ולתבל היטב.',
      'לצלות באייר פרייר ב־190° למשך 22–26 דק׳.',
    ],
  },
  {
    id: 'af-egg-white-bites',
    name: 'ביצי חלבון אפויות עם גבינה',
    appliance: 'air-fryer',
    proteinG: 32,
    calories: 220,
    carbsG: 4,
    fatsG: 8,
    timeMin: 18,
    tags: ['ארוחת בוקר'],
    ingredients: [
      '6 חלבונים',
      '60 גרם גבינה לבנה 5%',
      'תרד קצוץ',
      'מלח ופלפל',
    ],
    steps: [
      'לערבב את כל המרכיבים בתבניות מאפינס סיליקון.',
      'לאפות באייר פרייר 14–16 דק׳ ב־170°.',
    ],
  },
  {
    id: 'af-sweet-potato-chicken',
    name: 'קוביות בטטה וחזה עוף',
    appliance: 'air-fryer',
    proteinG: 38,
    calories: 420,
    carbsG: 35,
    fatsG: 10,
    timeMin: 30,
    tags: ['ארוחת צהריים', 'מאוזן'],
    ingredients: [
      '300 גרם חזה עוף',
      'בטטה בינונית',
      'שמן זית, פפריקה, מלח',
    ],
    steps: [
      'לחתוך לקוביות דומות בגודל.',
      'לערבב עם תבלינים ולצלות 20–25 דק׳ ב־185°.',
    ],
  },
  {
    id: 'creami-protein-vanilla',
    name: 'גלידת חלבון וניל קרימי',
    appliance: 'ninja-creami',
    proteinG: 35,
    calories: 240,
    carbsG: 18,
    fatsG: 4,
    timeMin: 10,
    tags: ['קינוח', 'חטיף'],
    ingredients: [
      'כף אבקת חלבון וניל',
      '200 מ״ל חלב דל שומן / אלטרנטיבה',
      'יוגורט יווני 0–2%',
      'ממתיק לפי טעם',
    ],
    steps: [
      'לערבב, להקפיא בפינת Creami לפי ההוראות.',
      'להריץ במצב Lite Ice Cream / Protein Ice Cream.',
    ],
  },
  {
    id: 'creami-chocolate-pb',
    name: 'קרמי שוקולד וחמאת בוטנים',
    appliance: 'ninja-creami',
    proteinG: 38,
    calories: 290,
    carbsG: 20,
    fatsG: 9,
    timeMin: 10,
    tags: ['קינוח'],
    ingredients: [
      'כף אבקת חלבון שוקולד',
      'כפית חמאת בוטנים טבעית',
      'חלב דל שומן',
      'קקאו לא ממותק',
    ],
    steps: [
      'לערבב עד אחיד ולהקפיא.',
      'להריץ ב־Creami; במידת הצורך להוסיף מעט נוזל ול־Re-spin.',
    ],
  },
  {
    id: 'creami-berry-yogurt',
    name: 'סורבה יוגורט ופירות יער',
    appliance: 'ninja-creami',
    proteinG: 28,
    calories: 210,
    carbsG: 22,
    fatsG: 3,
    timeMin: 8,
    tags: ['קינוח', 'קל'],
    ingredients: [
      'יוגורט יווני 0%',
      'תערובת פירות יער קפואים',
      'אבקת חלבון נייטרלית / וניל',
      'מעט מים או חלב',
    ],
    steps: [
      'לשלב את המרכיבים בכלי Creami.',
      'להקפיא ולהריץ במצב Sorbet / Lite Ice Cream.',
    ],
  },
]
