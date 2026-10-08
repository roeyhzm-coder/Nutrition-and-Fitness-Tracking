import { food, labeled, P } from './helpers'
import type { IsraeliFood } from './types'

const CAT = 'ממרחים ורטבים'
const OIL_BRANDS = ['יד מרדכי', 'משק ויילר', 'עץ הזית', 'שמן זית גליל'] as const
const HUMMUS_BRANDS = ['צבר', 'אחלה', 'שטראוס', 'תלמה'] as const

export const spreadsSaucesFoods: IsraeliFood[] = [
  ...OIL_BRANDS.flatMap((brand) =>
    (
      [
        ['שמן זית כתית מעולה', 884, 0, 0, 100],
        ['שמן קנולה', 884, 0, 0, 100],
        ['שמן חמניות', 884, 0, 0, 100],
        ['שמן שומשום', 884, 0, 0, 100],
      ] as const
    ).map(([name, cal, p, c, f]) =>
      food(CAT, labeled(name, brand), cal, p, c, f, P.spoon(), brand),
    ),
  ),
  ...(['אחלה', 'ברמן', 'הר ברכה', 'אל ארז'] as const).flatMap((brand) =>
    (
      [
        ['טחינה גולמית', 595, 18, 21, 54],
        ['טחינה מוכנה', 300, 8, 8, 27],
        ['טחינה מלאה גולמית', 580, 20, 18, 52],
      ] as const
    ).map(([name, cal, p, c, f]) =>
      food(CAT, labeled(name, brand), cal, p, c, f, P.tahini(), brand),
    ),
  ),
  ...HUMMUS_BRANDS.flatMap((brand) =>
    (
      [
        ['חומוס טבעי תעשייתי', 177, 8, 14, 10],
        ['חומוס מסעדה טרי', 230, 7.5, 12, 16],
        ['חומוס עם טחינה', 210, 8, 13, 14],
        ['חומוס חריף', 185, 8, 14, 11],
        ['חומוס עם מסבחה', 240, 8, 12, 18],
      ] as const
    ).map(([name, cal, p, c, f]) =>
      food(CAT, labeled(name, brand), cal, p, c, f, P.hummus(), brand),
    ),
  ),
  food(CAT, 'חמאת בוטנים קלאסית', 588, 25, 20, 50, P.tahini(), 'קאלבה'),
  food(CAT, 'חמאת בוטנים טבעית', 590, 26, 18, 50, P.tahini(), 'סקיפי'),
  food(
    'ממרחים ושמנים',
    'חמאת בוטנים טבעית - B&D (בטר אנד דיפרנט)',
    615,
    28,
    12.4,
    49,
    P.peanutButter(),
    'B&D',
  ),
  food(CAT, 'חמאת שקדים', 614, 21, 19, 56, P.tahini()),
  food(CAT, 'ממרח אגוזי לוז שוקולד', 539, 6, 57, 31, P.tahini(), 'נוטלה'),
  food(CAT, 'ריבת תות', 250, 0.4, 65, 0.1, P.spoon(), 'יד מרדכי'),
  food(CAT, 'ריבת משמש', 245, 0.4, 64, 0.1, P.spoon(), 'יד מרדכי'),
  food(CAT, 'ריבת תאנים', 255, 0.5, 66, 0.2, P.spoon(), 'יד מרדכי'),
  food(CAT, 'סילאן טבעי', 310, 0.8, 76, 0, P.spoon(), 'נאות הסמדר'),
  food(CAT, 'דבש טהור', 304, 0.3, 82, 0, P.spoon(), 'יד מרדכי'),
  food(CAT, 'דבש אקליפטוס', 304, 0.3, 82, 0, P.spoon(), 'בוג׳ה'),
  food(CAT, 'מיונז', 680, 1, 1.5, 75, P.spoon(), 'הלמנס'),
  food(CAT, 'מיונז לייט', 270, 1, 8, 25, P.spoon(), 'הלמנס'),
  food(CAT, 'קטשופ', 112, 1.2, 26, 0.1, P.spoon(), 'היינץ'),
  food(CAT, 'קטשופ אוסם', 110, 1.2, 25, 0.1, P.spoon(), 'אוסם'),
  food(CAT, 'רסק עגבניות', 82, 4.3, 19, 0.5, P.spoon(), 'יכין'),
  food(CAT, 'רוטב עגבניות לפסטה', 70, 1.5, 12, 2, P.spoon(), 'יאכין'),
  food(CAT, 'חרדל דיז׳ון', 66, 4, 5, 3.5, P.spoon(), 'היינץ'),
  food(CAT, 'חרדל רגיל', 60, 4, 6, 3, P.spoon(), 'אוסם'),
  food(CAT, 'סויה', 53, 8, 5, 0, P.spoon(), 'קיקומן'),
  food(CAT, 'צ׳ילי מתוק', 110, 0.5, 27, 0.1, P.spoon()),
  food(CAT, 'סרירצ׳ה', 90, 1.5, 18, 1, P.spoon()),
  food(CAT, 'עמבה', 80, 0.8, 18, 0.5, P.spoon()),
  food(CAT, 'טחינה עם לימון ביתית', 280, 8, 7, 25, P.tahini()),
  food(CAT, 'ממרח זיתים ירוקים', 250, 1.5, 4, 25, P.tahini(), 'צבר'),
  food(CAT, 'ממרח עגבניות מיובשות', 280, 4, 12, 24, P.tahini()),
  food(CAT, 'פesto בזיליקום', 370, 5, 6, 36, P.tahini()),
  food(CAT, 'ממרח טונה', 220, 12, 4, 16, P.tahini()),
  food(CAT, 'גוקאמולי', 150, 2, 8, 13, P.tahini()),
  food(CAT, 'סalsa עגבניות', 36, 1.2, 7, 0.2, P.spoon()),
  food(CAT, 'רוטב שום', 350, 2, 6, 35, P.spoon()),
  food(CAT, 'רוטב Barbecue', 130, 0.8, 30, 0.5, P.spoon(), 'היינץ'),
  food(CAT, 'סירופ מייפל', 260, 0, 67, 0, P.spoon()),
  food(CAT, 'סוכר לבן', 387, 0, 100, 0, P.spoon()),
  food(CAT, 'סוכר חום', 377, 0, 98, 0, P.spoon()),
  food(CAT, 'אבקת סוכר', 389, 0, 100, 0, P.spoon()),
  food(CAT, 'מלח גס', 0, 0, 0, 0, P.spoon()),
  food(CAT, 'חומץ בלסמי', 88, 0.5, 17, 0, P.spoon()),
  food(CAT, 'חומץ יין', 18, 0, 0.6, 0, P.spoon()),
  food(CAT, 'שמן קוקוס', 862, 0, 0, 100, P.spoon()),
  food(CAT, 'תרכיז עגבניות', 82, 4.3, 19, 0.5, P.spoon(), 'יכין'),
  food(CAT, 'עגבניות מרוסקות', 32, 1.6, 7, 0.3, P.spoon(), 'יכין'),
  food(CAT, 'מיונז ביצים חופש', 670, 1.2, 1.2, 74, P.spoon(), 'הלמנס'),
  food(CAT, 'חמאת בוטנים קראנץ׳', 595, 24, 20, 51, P.tahini(), 'קאלבה'),
  food(CAT, 'ממרח תמרים', 280, 2, 70, 0.3, P.spoon()),
  food(CAT, 'סירופ אגבה', 310, 0, 76, 0, P.spoon()),
  ...(['תות', 'משמש', 'תאנים', 'תפוז', 'אוכמניות', 'חבושים'] as const).flatMap(
    (flavor) =>
      (['יד מרדכי', 'יכין'] as const).map((brand) =>
        food(
          CAT,
          labeled(`ריבה ${flavor}`, brand),
          250,
          0.4,
          65,
          0.1,
          P.spoon(),
          brand,
        ),
      ),
  ),
  ...(['כתית מעולה', 'רגיל', 'חריף'] as const).flatMap((kind) =>
    (['אחלה', 'הר ברכה'] as const).map((brand) =>
      food(
        CAT,
        labeled(`טחינה מוכנה ${kind}`, brand),
        kind === 'חריף' ? 290 : 300,
        8,
        8,
        27,
        P.tahini(),
        brand,
      ),
    ),
  ),
]
