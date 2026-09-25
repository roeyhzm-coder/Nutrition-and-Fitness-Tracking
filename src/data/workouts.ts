import type {
  DaySession,
  Exercise,
  WorkoutDay,
  WorkoutProgram,
  WorkoutTemplate,
} from '../lib/types'
import { uid } from '../lib/types'
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
      name: 'וול סיט רגל אחת (Single Leg Wall Sit)',
      sets: 2,
      reps: '12 שניות לכל רגל',
      rest: '2 דקות',
      weight: BW,
      notes: 'גב צמוד לקיר, זווית 90 מעלות.',
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
]

/** Bump when the built-in library changes in a way existing users should receive. */
export const LIBRARY_SEED_VERSION = 3

const LEGACY_SEED_IDS = new Set(['tpl-push', 'tpl-pull'])
const LEGACY_SEED_NAMES = new Set(['אימון דחיפה', 'אימון משיכה', 'אימון משולב'])

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

export function needsSeedMigration(templates: WorkoutTemplate[]): boolean {
  return templates.some(
    (t) =>
      LEGACY_SEED_IDS.has(t.id) ||
      t.exercises.some((ex) => withSeedMedia(ex) !== ex),
  )
}

/** Fill missing images/videos on saved program exercises that match a seed exercise. */
export function backfillProgramMedia(
  programs: WorkoutProgram[],
): WorkoutProgram[] {
  return programs.map((p) => ({
    ...p,
    days: p.days.map((d) => ({
      ...d,
      sessions: d.sessions.map((s) => ({
        ...s,
        exercises: s.exercises.map(withSeedMedia),
      })),
      exercises: d.exercises.map(withSeedMedia),
    })),
  }))
}

/**
 * Drop the legacy default workouts and add any missing built-in templates.
 * Keeps user-created templates and user edits to current seeds.
 */
export function migrateSeedTemplates(
  existing: WorkoutTemplate[],
): WorkoutTemplate[] {
  const kept = existing
    .filter(
      (t) => !LEGACY_SEED_IDS.has(t.id) && !LEGACY_SEED_NAMES.has(t.name.trim()),
    )
    .map((t) => ({ ...t, exercises: t.exercises.map(withSeedMedia) }))
  const byId = new Map(kept.map((t) => [t.id, t]))
  const seeds = SEED_WORKOUT_TEMPLATES.map(
    (s) => byId.get(s.id) ?? structuredClone(s),
  )
  const custom = kept.filter(
    (t) => !SEED_WORKOUT_TEMPLATES.some((s) => s.id === t.id),
  )
  return [...seeds, ...custom]
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

function day(dayNumber: number, focus: string, templateId: string): WorkoutDay {
  return {
    id: `day-${dayNumber}`,
    dayNumber,
    title: `יום ${dayNumber}`,
    focus,
    sessions: [sessionFromSeed(templateId)],
    exercises: [],
  }
}

export const DEFAULT_WORKOUT_DAYS: WorkoutDay[] = [
  day(1, 'כוח משיכה - בלוק 1', 'tpl-b1-pull'),
  day(2, 'כוח דחיפה ורגליים - בלוק 1', 'tpl-b1-push'),
  day(3, 'כוח עליון משולב - בלוק 1', 'tpl-b1-combo'),
  day(4, 'כוח משיכה - בלוק 2', 'tpl-b2-pull'),
  day(5, 'כוח דחיפה ורגליים - בלוק 2', 'tpl-b2-push'),
  day(6, 'כוח עליון משולב - בלוק 2', 'tpl-b2-combo'),
]
