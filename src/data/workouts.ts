import type {
  DaySession,
  Exercise,
  WorkoutDay,
  WorkoutProgram,
  WorkoutTemplate,
} from '../lib/types'
import { uid, WEEKDAYS } from '../lib/types'
import { EXERCISE_MEDIA } from './exerciseMedia.generated'

type SeedExercise = Omit<Exercise, 'id'>

const BW = 'משקל גוף'
const SEED_UPDATED_AT = '2026-09-25T00:00:00.000Z'

function template(
  id: string,
  name: string,
  exercises: SeedExercise[],
): WorkoutTemplate {
  return {
    id,
    name,
    updatedAt: SEED_UPDATED_AT,
    exercises: exercises.map((ex, i) => {
      const exId = `${id}-${i + 1}`
      const media = EXERCISE_MEDIA[exId]
      return media
        ? { id: exId, ...ex, imageUrl: media.imageUrl, mediaUrl: media.videoUrl }
        : { id: exId, ...ex }
    }),
  }
}

const B3_UPDATED_AT = '2026-11-16T00:00:00.000Z'

type B3Set = [weightKg: number | null, reps: number]

/**
 * Block 3 exercise with per-set defaults. Stamped so older global "save as
 * default" rows of a same-named exercise don't override the new prescription.
 */
function b3(
  ex: Omit<SeedExercise, 'defaultSets' | 'defaultsUpdatedAt'>,
  perSet?: B3Set[],
): SeedExercise {
  if (!perSet?.length) return ex
  const [firstWeight, firstReps] = perSet[0]
  return {
    ...ex,
    defaultWeightKg: firstWeight,
    defaultReps: firstReps,
    defaultSets: perSet.map(([weightKg, reps], i) => ({ setNumber: i + 1, weightKg, reps })),
    defaultsUpdatedAt: B3_UPDATED_AT,
  }
}

function repeatSet(count: number, weightKg: number | null, reps: number): B3Set[] {
  return Array.from({ length: count }, (): B3Set => [weightKg, reps])
}

const LATERAL_RAISES: SeedExercise = b3(
  {
    name: 'הרחקות לצדדים (Lateral Raises)',
    sets: 3,
    reps: '10-12',
    rest: '1 דקה',
    weight: '6-8 ק"ג',
    metric: 'reps',
  },
  repeatSet(3, 6, 10),
)

/** Block 3 (12 weeks): deload weeks 5 & 10, benchmark testing in week 12. */
const BLOCK_3_TEMPLATES: WorkoutTemplate[] = [
  template('tpl-b3-pull', 'משיכה 3', [
    b3(
      {
        name: 'מתח כבד בפרונציה (פירמידה הפוכה)',
        sets: 3,
        reps: 'סט 1: 3 (27.5 ק"ג), סט 2: 5 (22.5 ק"ג), סט 3: 7 (17.5 ק"ג)',
        rest: '3-4 דקות',
        weight: '27.5 / 22.5 / 17.5 ק"ג',
        metric: 'reps',
        notes: 'פירמידה הפוכה: הסט הכבד ראשון (27.5×3), אחריו 22.5×5 ו-17.5×7. טווח תנועה מלא.',
      },
      [
        [27.5, 3],
        [22.5, 5],
        [17.5, 7],
      ],
    ),
    b3(
      {
        name: 'חתירת פרונט לבר מקופל (Tuck Front Lever Rows)',
        sets: 3,
        reps: '6-8',
        rest: '2-3 דקות',
        weight: BW,
        metric: 'reps',
        notes: 'כשסוגרים 3x8 עוברים ל-Advanced Tuck.',
      },
      repeatSet(3, null, 6),
    ),
    b3(
      {
        name: 'מתח חזה מתפרץ בפרונציה (Chest To Bar)',
        sets: 2,
        reps: '4-5',
        rest: '2-3 דקות',
        weight: BW,
        metric: 'reps',
        notes: 'עלייה מתפרצת עד נגיעת חזה בבר בכל חזרה.',
      },
      repeatSet(2, null, 4),
    ),
    b3(
      {
        name: 'תלייה אקטיבית בשכמות ביד אחת',
        sets: 3,
        reps: '15-20 שניות לכל יד',
        rest: '1-2 דקות',
        weight: BW,
        metric: 'seconds',
        notes: 'כשסוגרים 3x20 עוברים ל-3x25. שכמה אסופה למטה, Core מוחזק.',
      },
      repeatSet(3, null, 15),
    ),
    b3(
      {
        name: 'כפיפת מרפקים בישיבה בשיפוע + החזקה סטטית ב-90 מעלות',
        sets: 2,
        reps: '6-8 + החזקה 10 שניות',
        rest: '1-2 דקות',
        weight: '16-18 ק"ג',
        metric: 'reps',
        notes: 'בסוף כל סט — החזקה סטטית של 10 שניות ב-90 מעלות.',
      },
      repeatSet(2, 16, 6),
    ),
    b3(
      {
        name: 'הרמת רגליים ישרות למוט (Toes To Bar)',
        sets: 3,
        reps: '6-8',
        rest: '1-2 דקות',
        weight: BW,
        metric: 'reps',
        notes: 'כשסוגרים 3x8 מוסיפים החזקה של 2 שניות למעלה.',
      },
      repeatSet(3, null, 6),
    ),
  ]),
  template('tpl-b3-push', 'דחיפה ורגליים 3', [
    b3(
      {
        name: 'מקבילים כבד (פירמידה הפוכה)',
        sets: 3,
        reps: 'סט 1: 2 (25 ק"ג), סט 2: 4 (20 ק"ג), סט 3: 6 (15 ק"ג)',
        rest: '3-4 דקות',
        weight: '25 / 20 / 15 ק"ג',
        metric: 'reps',
        notes: 'פירמידה הפוכה: 25×2, 20×4, 15×6. כתפיים מטה, טווח מלא.',
      },
      [
        [25, 2],
        [20, 4],
        [15, 6],
      ],
    ),
    b3(
      {
        name: 'סקוואט בולגרי עם משקולות יד',
        sets: 3,
        reps: '6-8 לכל רגל',
        rest: '2 דקות',
        weight: '8-10 ק"ג בכל יד',
        metric: 'reps',
      },
      repeatSet(3, 8, 6),
    ),
    b3(
      {
        name: 'לחיצת כתפיים Pike ברגליים מוגבהות (Elevated Pike Push-ups)',
        sets: 3,
        reps: '5-8',
        rest: '2 דקות',
        weight: BW,
        metric: 'reps',
      },
      repeatSet(3, null, 5),
    ),
    b3(
      {
        name: 'שכיבות סמיכה פסאודו-פלאנש (Pseudo Planche Push-ups)',
        sets: 2,
        reps: '6-8',
        rest: '2 דקות',
        weight: BW,
        metric: 'reps',
      },
      repeatSet(2, null, 6),
    ),
    b3(
      {
        name: 'שכיבות סמיכה מתפרצות בשיפוע שלילי (ניתוק מלא)',
        sets: 2,
        reps: '6-8',
        rest: '1-2 דקות',
        weight: BW,
        metric: 'reps',
        notes: 'רגליים מוגבהות, ניתוק מלא של הידיים בכל חזרה.',
      },
      repeatSet(2, null, 6),
    ),
    b3(
      {
        name: 'דדליפט רומני ברגל אחת עם משקולת (Single-Leg RDL)',
        sets: 2,
        reps: '6-8 לכל רגל',
        rest: '1-2 דקות',
        weight: '12-16 ק"ג',
        metric: 'reps',
      },
      repeatSet(2, 12, 6),
    ),
    LATERAL_RAISES,
  ]),
  template('tpl-b3-combo', 'משולב 3', [
    b3(
      {
        name: 'מתח מתפרץ גבוה (High Pull-ups)',
        sets: 3,
        reps: '3-4',
        rest: '2-3 דקות',
        weight: BW,
        metric: 'reps',
        notes: 'משיכה מתפרצת לגובה בטן עליונה — הבסיס ל-Muscle-Up.',
      },
      repeatSet(3, null, 3),
    ),
    b3(
      {
        name: 'מתח בסופינציה עם משקל',
        sets: 3,
        reps: '4-6',
        rest: '3 דקות',
        weight: '22.5-25 ק"ג',
        metric: 'reps',
      },
      repeatSet(3, 22.5, 4),
    ),
    b3(
      {
        name: 'מקבילים עם משקל (טווח מלא)',
        sets: 3,
        reps: '6-8',
        rest: '2-3 דקות',
        weight: '10-12.5 ק"ג',
        metric: 'reps',
      },
      repeatSet(3, 10, 6),
    ),
    b3({
      name: 'לחיצת כתפיים בעמידה/ישיבה עם משקולות יד',
      sets: 3,
      reps: '6-8',
      rest: '2 דקות',
      weight: 'מתאים',
      metric: 'reps',
    }),
    b3(
      {
        name: 'פשיטת מרפקים בשכיבה על ספסל (Skull Crushers)',
        sets: 3,
        reps: '8-10',
        rest: '1-2 דקות',
        weight: '8-12 ק"ג',
        metric: 'reps',
      },
      repeatSet(3, 8, 8),
    ),
    LATERAL_RAISES,
  ]),
]

/** Built-in library templates (stable ids for seeding). */
export const SEED_WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  template('tpl-b1-pull', 'משיכה 1', [
    {
      name: 'מתח מתפרץ בפרונציה (אחיזה רגילה)',
      sets: 3,
      reps: '5',
      rest: '2-3 דקות',
      weight: BW,
      notes: 'עליה מהירה וגבוהה ככל הניתן, ירידה איטית 5 שניות.',
    },
    {
      name: 'מתח בפרונציה עם משקל (Negatives)',
      sets: 2,
      reps: '2-3',
      rest: '2-3 דקות',
      weight: '10 ק"ג',
      notes: 'עליה להתחלה מעל המוט וירידה איטית מאוד (5-7 שניות) עד נעילה מלאה.',
    },
    {
      name: 'נעילה ב-90 מעלות על המתח בסופינציה',
      sets: 2,
      reps: '15 שניות',
      rest: '2 דקות',
      weight: BW,
      notes: 'נעילה סטטית ב-90 מעלות, מתח שרירי.',
    },
    {
      name: 'חתירה בפולי תחתון - אחיזת הגה',
      sets: 3,
      reps: '12',
      rest: '1-2 דקות',
      weight: 'משקל מתאים לדרישה',
      notes: 'גב זקוף, משיכה עם המרפקים לאחור לכיוון הבטן.',
    },
    {
      name: 'כפיפת מרפקים בישיבה בשיפוע',
      sets: 3,
      reps: '8-12',
      rest: '1-2 דקות',
      weight: 'מתאים',
      notes: 'מרפקים סטטיים צמודים לגוף.',
    },
    {
      name: 'כפיפות בטן ואופניים',
      sets: 2,
      reps: '30 שניות כפיפות + 30 שניות אופניים',
      rest: '1-2 דקות',
      weight: BW,
    },
  ]),
  template('tpl-b1-push', 'דחיפה 1', [
    {
      name: 'מקבילים',
      sets: 3,
      reps: '6',
      rest: '2-3 דקות',
      weight: '7.5 ק"ג',
      notes: 'ממצב של ידיים ישרות ירידה ל-90 מעלות במרפקים.',
    },
    {
      name: 'לחיצת חזה בשיפוע חיובי עם משקולות (30 מעלות)',
      sets: 3,
      reps: '8-10',
      rest: '2 דקות',
      weight: 'מתאים לדרישה',
    },
    {
      name: 'שכיבות סמיכה מתפרצות',
      sets: 3,
      reps: '8-12',
      rest: '1-2 דקות',
      weight: BW,
      notes: 'בכל חזרה ניתוק של פלג הגוף העליון מהקרקע.',
    },
    {
      name: 'לחיצת כתפיים עם משקולות יד בישיבה',
      sets: 3,
      reps: '8-12',
      rest: '1-2 דקות',
      weight: 'מתאים',
    },
    {
      name: 'עלייה מברכיים לסקוואט (Kneeling Jump Squat)',
      sets: 3,
      reps: '6',
      rest: '1-2 דקות',
      weight: BW,
      notes: 'ישיבה על הברכיים, דחיפה חזקה של האגן קדימה ונחיתה בסקוואט.',
    },
    {
      name: 'וול סיט (Wall Sit)',
      sets: 3,
      reps: '30 שניות',
      rest: '1-2 דקות',
      weight: BW,
      notes: 'גב צמוד לקיר, ברכיים ב-90 מעלות שלא עוברות את קו האצבעות.',
    },
  ]),
  template('tpl-b1-combo', 'משולב 1', [
    {
      name: 'מתח פרונציה',
      sets: 3,
      reps: '6',
      rest: '2-3 דקות',
      weight: BW,
      notes: 'אחיזה רגילה, מתלייה פסיבית עד שהסנטר עובר את המתח.',
    },
    {
      name: 'נעילה ב-90 מעלות על המתח בסופינציה',
      sets: 2,
      reps: '12 שניות',
      rest: '2 דקות',
      weight: BW,
      notes: 'החזקה סטטית ב-90 מעלות.',
    },
    {
      name: 'חתירה במכונה / כבלים',
      sets: 3,
      reps: '12',
      rest: '1-2 דקות',
      weight: 'מתאים',
      notes: 'גב זקוף, משיכה עם המרפקים לאחור לכיוון הבטן.',
    },
    {
      name: 'מקבילים',
      sets: 3,
      reps: '6-8',
      rest: '2-3 דקות',
      weight: '5-7.5 ק"ג',
      notes: 'ירידה ל-90 מעלות.',
    },
    {
      name: 'שכיבות שמיכה מתפרצות',
      sets: 3,
      reps: '8-12',
      rest: '1-2 דקות',
      weight: BW,
      notes: 'ניתוק פלג גוף עליון מהרצפה.',
    },
    {
      name: 'פשיטת מרפקים בחבל פולי',
      sets: 3,
      reps: '10-12',
      rest: '1-2 דקות',
      weight: 'מתאים',
    },
  ]),
  template('tpl-b2-pull', 'משיכה 2', [
    {
      name: 'מתח נקי סופינציה פירמידה',
      sets: 3,
      reps: 'סט 1: 6 (17.5 ק"ג), סט 2: 4 (25 ק"ג), סט 3: 2-3 (32.5 ק"ג)',
      rest: '3-4 דקות',
      weight: 'פירמידה עולה (17.5-32.5 ק"ג)',
      notes:
        'סט 1 משקל ל-6 חזרות, סט 2 מעלה משקל ויורד ל-4 חזרות, סט 3 מעלה משקל ויורד ל-2-3 חזרות.',
    },
    {
      name: 'מתח "קשת" (Archer Pullups)',
      sets: 3,
      reps: '2-3 לכל צד',
      rest: '3 דקות',
      weight: BW,
      notes: 'יד אחת מושכת, השנייה מתיישרת הצידה. מינימום סיוע מהיד הישרה.',
    },
    {
      name: 'מתח חזה פרונציה',
      sets: 3,
      reps: '6',
      rest: '3 דקות',
      weight: 'מתחיל במשקל גוף',
      notes: 'נגיעה עם החזה (קו פטמות) בבר בכל חזרה.',
    },
    {
      name: 'תלייה אקטיבית בשכמות ביד אחת',
      sets: 2,
      reps: '10 שניות כל צד',
      rest: '1-2 דקות',
      weight: BW,
      notes:
        'שכמה אסופה למטה (Shoulder Packing), Core מוחזק חזק למניעת סיבוב הגוף.',
    },
    {
      name: 'כפיפת מרפקים בישיבה בשיפוע',
      sets: 3,
      reps: '10',
      rest: '1-2 דקות',
      weight: 'מתאים',
      notes: 'מרפקים סטטיים צמודים לגוף.',
    },
    {
      name: 'Toes To Bar (TTB)',
      sets: 3,
      reps: '6-8',
      rest: '1-2 דקות',
      weight: BW,
      notes: 'עלייה בשליטה, ללא תנופה, בטן אסופה לכל אורך התנועה.',
    },
  ]),
  template('tpl-b2-push', 'דחיפה 2', [
    {
      name: 'מקבילים',
      sets: 3,
      reps: '12',
      rest: '2-3 דקות',
      weight: BW,
      notes: 'ירידה ל-90 מעלות במרפקים בכל חזרה.',
    },
    {
      name: 'מקבילים - טמפו',
      sets: 3,
      reps: '5',
      rest: '3 דקות',
      weight: BW,
      notes:
        'ירידה איטית של 3 שניות, עצירה קצרה בתחתית, עלייה מתפרצת, כתפיים מטה.',
    },
    {
      name: 'לחיצת כתפיים בעמידת ידיים על קיר (Wall Handstand Pushup)',
      sets: 3,
      reps: '6',
      rest: '2-3 דקות',
      weight: BW,
      notes: 'חזה לכיוון הקיר.',
    },
    {
      name: 'שכיבות שמיכה מתפרצות בשיפוע שלילי',
      sets: 3,
      reps: '10',
      rest: '1-2 דקות',
      weight: BW,
      notes: 'רגליים על ספסל/קופסה, ניתוק פלג הגוף העליון בכל חזרה.',
    },
    {
      name: "ג'אמפ סקוואט",
      sets: 3,
      reps: '12',
      rest: '2 דקות',
      weight: 'פלטה 5 ק"ג בידיים',
      notes: 'ניתוק מקסימלי בכל קפיצה ונחיתה רכה ישר לתוך סקוואט.',
    },
    {
      name: 'סקוואט בולגרי (Bulgarian Split Squat)',
      sets: 2,
      reps: '8–10',
      rest: '1.5–2 דקות',
      weight: BW,
      notes:
        '2 סטים לכל רגל. ירידה מבוקרת (2–3 שניות) ועלייה יציבה, טווח תנועה מלא. התחלה ממשקל גוף והעלאת עומס הדרגתית.',
    },
  ]),
  template('tpl-b2-combo', 'משולב 2', [
    {
      name: 'מתח פרונציה',
      sets: 4,
      reps: '4',
      rest: '3-4 דקות',
      weight: '25 ק"ג',
      notes: 'טווח תנועה מלא.',
    },
    {
      name: 'מתח חזה בפרונציה',
      sets: 3,
      reps: '6',
      rest: '3 דקות',
      weight: 'מתחיל במשקל גוף',
      notes: 'נגיעה עם החזה (קו פטמות) בבר בכל חזרה.',
    },
    {
      name: 'מקבילים',
      sets: 4,
      reps: '12',
      rest: '3 דקות',
      weight: BW,
      notes: 'ממצב של ידיים ישרות ירידה ל-90 מעלות.',
    },
    {
      name: 'Archer Push-ups (שכיבות שמיכה קשת)',
      sets: 3,
      reps: '4 לכל צד',
      rest: '2 דקות',
      weight: BW,
      notes: 'ירידה לסירוגין לכל צד כשהיד השנייה נשארת ישרה לחלוטין.',
    },
    {
      name: 'הרמת ברכיים בהחזקה על מקבילים (Dips Hold Knee Raises)',
      sets: 3,
      reps: '12',
      rest: '1-2 דקות',
      weight: BW,
      notes: 'החזקה סטטית במקבילים, אם קל ניתן לבצע ברגליים ישרות.',
    },
  ]),
  template('tpl-swim', 'אימון שחייה / אירובי', [
    {
      name: 'שחייה חופשית',
      sets: 1,
      reps: '20–30 דק׳',
      notes: 'קצב נוח / אירובי',
    },
    {
      name: 'אינטרוולים',
      sets: 6,
      reps: '50–100מ׳',
      rest: '30–45 שניות',
    },
    { name: 'קיק / טכניקה', sets: 4, reps: '25–50מ׳' },
  ]),
  ...BLOCK_3_TEMPLATES,
]

const LEGACY_TEMPLATE_IDS = new Set(['tpl-push', 'tpl-pull'])
const LEGACY_TEMPLATE_NAMES = new Set(['אימון דחיפה', 'אימון משיכה', 'אימון משולב'])
const OBSOLETE_PROGRAM_IDS = new Set(['program-bulk', 'program-cut'])
const OBSOLETE_PROGRAM_NAMES = new Set(['תוכנית מסה', 'תוכנית חיטוב'])

export const OFFICIAL_PROGRAM_IDS = ['program-block-1', 'program-block-2', 'program-block-3'] as const
export const DEFAULT_ACTIVE_PROGRAM_ID = 'program-block-3' as const
export const DEFAULT_ACTIVE_BLOCK_NAME = 'בלוק 3'

export type OfficialBlock = 1 | 2 | 3
const OFFICIAL_TEMPLATE_IDS = [
  'tpl-b1-pull',
  'tpl-b1-push',
  'tpl-b1-combo',
  'tpl-b2-pull',
  'tpl-b2-push',
  'tpl-b2-combo',
  'tpl-b3-pull',
  'tpl-b3-push',
  'tpl-b3-combo',
]

/** Bump to force the official plan onto existing local + Supabase state again. */
export const OFFICIAL_PLAN_VERSION = 7

/** Same exercise name always maps to the same demo across the PDFs. */
const SEED_MEDIA_BY_NAME = new Map(
  SEED_WORKOUT_TEMPLATES.flatMap((t) => t.exercises)
    .filter((ex) => ex.imageUrl)
    .map((ex) => [ex.name, { imageUrl: ex.imageUrl, mediaUrl: ex.mediaUrl }]),
)

function withSeedMedia(ex: Exercise): Exercise {
  if (ex.imageUrl) return ex
  const media = SEED_MEDIA_BY_NAME.get(ex.name.trim())
  if (!media) return ex
  return { ...ex, imageUrl: media.imageUrl, mediaUrl: ex.mediaUrl ?? media.mediaUrl }
}

const SINGLE_LEG_WALL_SIT_RE = /וול סיט רגל אחת|single leg wall sit/i

const BULGARIAN_SPLIT_SQUAT: Omit<Exercise, 'id'> = {
  name: 'סקוואט בולגרי (Bulgarian Split Squat)',
  sets: 2,
  reps: '8–10',
  rest: '1.5–2 דקות',
  weight: BW,
  notes:
    '2 סטים לכל רגל. ירידה מבוקרת (2–3 שניות) ועלייה יציבה, טווח תנועה מלא. התחלה ממשקל גוף והעלאת עומס הדרגתית.',
}

function patchWallSitExercise(ex: Exercise): { exercise: Exercise; changed: boolean } {
  if (!SINGLE_LEG_WALL_SIT_RE.test(ex.name)) return { exercise: ex, changed: false }
  return {
    exercise: {
      ...ex,
      ...BULGARIAN_SPLIT_SQUAT,
      id: ex.id,
      imageUrl: undefined,
      mediaUrl: undefined,
    },
    changed: true,
  }
}

function patchExerciseList(exercises: Exercise[]): { exercises: Exercise[]; changed: boolean } {
  let changed = false
  const next = exercises.map((ex) => {
    const patched = patchWallSitExercise(ex)
    if (patched.changed) changed = true
    return patched.exercise
  })
  return { exercises: next, changed }
}

/** Swap Single-Leg Wall Sit for Bulgarian Split Squat. Idempotent. */
export function replaceSingleLegWallSitInPlan(
  state: WorkoutPlanState,
): WorkoutPlanState & { changed: boolean } {
  let changed = false
  const programs = state.programs.map((program) => {
    let programChanged = false
    const days = program.days.map((day) => {
      const sessions = (day.sessions ?? []).map((session) => {
        const patched = patchExerciseList(session.exercises)
        if (patched.changed) programChanged = true
        return { ...session, exercises: patched.exercises }
      })
      const standalone = patchExerciseList(day.exercises ?? [])
      if (standalone.changed) programChanged = true
      return { ...day, sessions, exercises: standalone.exercises }
    })
    if (!programChanged) return program
    changed = true
    return {
      ...program,
      days,
      updatedAt: new Date().toISOString(),
      planVersion: Math.max(program.planVersion ?? 0, OFFICIAL_PLAN_VERSION),
    }
  })

  const templates = state.templates.map((template) => {
    const patched = patchExerciseList(template.exercises)
    if (!patched.changed) return template
    changed = true
    return {
      ...template,
      exercises: patched.exercises,
      updatedAt: new Date().toISOString(),
    }
  })

  return { ...state, programs, templates, changed }
}

function sessionFromSeed(templateId: string): DaySession {
  const tpl = SEED_WORKOUT_TEMPLATES.find((t) => t.id === templateId)
  if (!tpl) throw new Error(`Unknown seed template: ${templateId}`)
  return {
    id: uid(),
    name: tpl.name,
    sourceTemplateId: tpl.id,
    exercises: tpl.exercises.map((ex) => ({ ...ex, id: uid() })),
  }
}

const FOCUS_BY_KIND = {
  pull: 'כוח משיכה',
  push: 'כוח דחיפה ורגליים',
  combo: 'כוח עליון משולב',
} as const

type DayKind = keyof typeof FOCUS_BY_KIND | 'rest'

/** Weekly schedule from the PDF, Sunday → Saturday. */
const OFFICIAL_WEEK: DayKind[] = ['pull', 'push', 'pull', 'push', 'rest', 'combo', 'rest']

export function officialBlockForProgram(programId: string): OfficialBlock {
  if (programId === 'program-block-3') return 3
  return programId === 'program-block-2' ? 2 : 1
}

/** Fresh official weekday from the built-in weekly schedule. */
export function officialDayFor(
  dayNumber: number,
  block: OfficialBlock = 1,
): WorkoutDay {
  const days = weekDays(block)
  return days.find((d) => d.dayNumber === dayNumber) ?? days[0]
}

function weekDays(block: OfficialBlock): WorkoutDay[] {
  return OFFICIAL_WEEK.map((kind, i) => {
    const dayNumber = i + 1
    const base = { id: `day-${dayNumber}`, dayNumber, title: WEEKDAYS[i], exercises: [] }
    if (kind === 'rest') {
      return { ...base, focus: 'מנוחה', isRest: true, sessions: [] }
    }
    return {
      ...base,
      focus: FOCUS_BY_KIND[kind],
      isRest: false,
      sessions: [sessionFromSeed(`tpl-b${block}-${kind}`)],
    }
  })
}

export const DEFAULT_WORKOUT_DAYS: WorkoutDay[] = weekDays(1)

export function createOfficialPrograms(): WorkoutProgram[] {
  const now = new Date().toISOString()
  return ([1, 2, 3] as const).map((block, i) => ({
    id: OFFICIAL_PROGRAM_IDS[i],
    name: `בלוק ${block}`,
    days: weekDays(block),
    updatedAt: now,
    planVersion: OFFICIAL_PLAN_VERSION,
  }))
}

export type WorkoutPlanState = {
  programs: WorkoutProgram[]
  templates: WorkoutTemplate[]
  activeProgramId: string
}

const isObsoleteProgram = (p: WorkoutProgram) =>
  OBSOLETE_PROGRAM_IDS.has(p.id) || OBSOLETE_PROGRAM_NAMES.has(p.name.trim())

const isLegacyTemplate = (t: WorkoutTemplate) =>
  LEGACY_TEMPLATE_IDS.has(t.id) || LEGACY_TEMPLATE_NAMES.has(t.name.trim())

/** True when official block programs or library templates are missing. */
export function isStalePlan(state: Omit<WorkoutPlanState, 'activeProgramId'>): boolean {
  const templateIds = new Set(state.templates.map((t) => t.id))
  return (
    state.programs.some(isObsoleteProgram) ||
    !OFFICIAL_PROGRAM_IDS.every((id) => state.programs.some((p) => p.id === id)) ||
    state.templates.some(isLegacyTemplate) ||
    !OFFICIAL_TEMPLATE_IDS.every((id) => templateIds.has(id))
  )
}

/** Fill missing official programs/templates without overwriting user edits. */
export function ensureOfficialPlan(state: WorkoutPlanState): WorkoutPlanState {
  const official = createOfficialPrograms()
  const keptPrograms = state.programs
    .filter((p) => !isObsoleteProgram(p))
    .map((p) => backfillProgramMedia([p])[0])
  const haveProgram = new Set(keptPrograms.map((p) => p.id))
  const programs = [
    ...official.filter((p) => !haveProgram.has(p.id)),
    ...keptPrograms,
  ]

  const keptTemplates = state.templates
    .filter((t) => !isLegacyTemplate(t))
    .map((t) => ({ ...t, exercises: t.exercises.map(withSeedMedia) }))
  const haveTemplate = new Set(keptTemplates.map((t) => t.id))
  const templates = [
    ...structuredClone(SEED_WORKOUT_TEMPLATES).filter((t) => !haveTemplate.has(t.id)),
    ...keptTemplates,
  ]

  return {
    programs,
    templates,
    activeProgramId: resolveActiveProgramId({
      programs,
      templates,
      activeProgramId: state.activeProgramId,
    }),
  }
}

/** Prefer Block 3 as the live training block. */
export function resolveActiveProgramId(state: WorkoutPlanState): string {
  if (state.programs.some((p) => p.id === DEFAULT_ACTIVE_PROGRAM_ID)) {
    return DEFAULT_ACTIVE_PROGRAM_ID
  }
  const named = state.programs.find((p) => p.name.trim() === DEFAULT_ACTIVE_BLOCK_NAME)
  if (named) return named.id
  if (state.programs.some((p) => p.id === state.activeProgramId)) {
    return state.activeProgramId
  }
  return state.programs[0]?.id ?? ''
}

export function withDefaultBlockActive(state: WorkoutPlanState): WorkoutPlanState {
  const activeProgramId = resolveActiveProgramId(state)
  if (activeProgramId === state.activeProgramId) return state
  return { ...state, activeProgramId }
}

/**
 * Force the official Block 1 / Block 2 plan: fresh official programs and
 * library workouts, obsolete defaults removed, Block 2 active.
 * User-created programs and templates are kept.
 */
export function applyOfficialPlan(state: WorkoutPlanState): WorkoutPlanState {
  const official = createOfficialPrograms()
  const officialIds = new Set<string>(OFFICIAL_PROGRAM_IDS)
  const customPrograms = state.programs
    .filter((p) => !officialIds.has(p.id) && !isObsoleteProgram(p))
    .map((p) => backfillProgramMedia([p])[0])

  const seedIds = new Set(SEED_WORKOUT_TEMPLATES.map((t) => t.id))
  const customTemplates = state.templates
    .filter((t) => !seedIds.has(t.id) && !isLegacyTemplate(t))
    .map((t) => ({ ...t, exercises: t.exercises.map(withSeedMedia) }))

  return {
    programs: [...official, ...customPrograms],
    templates: [...structuredClone(SEED_WORKOUT_TEMPLATES), ...customTemplates],
    activeProgramId: DEFAULT_ACTIVE_PROGRAM_ID,
  }
}

/** Fill missing images/videos on saved program exercises that match a seed exercise. */
export function backfillProgramMedia(
  programs: WorkoutProgram[],
): WorkoutProgram[] {
  return programs.map((p) => ({
    ...p,
    days: p.days.map((d) => ({
      ...d,
      sessions: (d.sessions ?? []).map((s) => ({
        ...s,
        exercises: s.exercises.map(withSeedMedia),
      })),
      exercises: (d.exercises ?? []).map(withSeedMedia),
    })),
  }))
}
