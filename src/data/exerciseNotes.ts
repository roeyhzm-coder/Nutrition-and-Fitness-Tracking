import type { Exercise } from '../lib/types'

/**
 * Coaching cues from the Block 1 / Block 2 programs. Each entry lists every
 * spelling of the exercise name used in the plans; matching is normalized
 * (spaces, hyphens / maqaf, quotes, parentheses).
 */
const NOTE_ENTRIES: ReadonlyArray<{ names: readonly string[]; note: string }> = [
  // Block 1
  {
    names: ['מתח מתפרץ בפרונציה', 'מתח מתפרץ'],
    note: 'עלייה מהירה וגבוהה ככל הניתן, ירידה איטית של 5 שניות.',
  },
  {
    names: ['מתח בפרונציה עם משקל (Negatives)', 'מתח שלילי'],
    note: 'עלייה להתחלה מעל המוט וירידה איטית מאוד (5-7 שניות) עד נעילה מלאה של המרפקים.',
  },
  {
    names: ['נעילה ב-90 מעלות על המתח בסופינציה', 'נעילה ב־90 מעלות על המתח בסופינציה'],
    note: 'סטטי – נעילה ב-90 מעלות במרפקים באחיזה הפוכה.',
  },
  {
    names: ['חתירה בפולי תחתון - אחיזת הגה', 'חתירה בפולי תחתון'],
    note: 'גב זקוף, משיכה עם המרפקים לאחור לכיוון הבטן.',
  },
  {
    names: ['כפיפת מרפקים בישיבה בשיפוע'],
    note: 'מרפקים סטטיים וצמודים לאורך כל התנועה.',
  },
  {
    names: ['כפיפות בטן + אופניים', 'כפיפות בטן ואופניים'],
    note: '30 שניות כפיפות בטן ומיד 30 שניות אופניים.',
  },
  {
    names: ['מקבילים'],
    note: 'ממצב של ידיים ישרות יורד עד 90 מעלות במרפקים בכל חזרה.',
  },
  {
    names: [
      'לחיצת חזה בשיפוע חיובי עם משקולות יד (30 מעלות)',
      'לחיצת חזה בשיפוע חיובי עם משקולות (30 מעלות)',
      'לחיצת חזה בשיפוע חיובי',
    ],
    note: 'שיפוע חיובי 30 מעלות, הורדה מבוקרת ולחיצה מלאה.',
  },
  {
    names: ['שכיבות שמיכה מתפרצות', 'שכיבות סמיכה מתפרצות'],
    note: 'בכל חזרה יש לנתק את פלג הגוף העליון מהקרקע.',
  },
  {
    names: ['לחיצת כתפיים עם משקולות יד בישיבה'],
    note: 'גב צמוד למשענת, הורדה בשליטה ולחיצה מלאה למעלה.',
  },
  {
    names: ['עלייה מברכיים לסקוואט', 'Kneeling Jump Squat'],
    note: 'מתחילים בישיבה על הברכיים, דוחפים חזק את האגן קדימה ועולים בקפיצה מתפרצת למצב סקוואט. יורדים חזרה לרצפה רגל-רגל תוך שמירה על ברכיים שלא עוברות את קו האצבעות.',
  },
  {
    names: ['וול סיט', 'Wall Sit'],
    note: 'גב צמוד לקיר ורגליים ב-90 מעלות.',
  },
  {
    names: ['מתח פרונציה'],
    note: 'טווח מלא – ממצב של תלייה פסיבית (ידיים ישרות) למצב שהסנטר עובר את המתח.',
  },
  {
    names: ['פשיטת מרפקים בחבל פולי', 'פשיטת מרפקים בחבל פולי עליון'],
    note: 'מרפקים צמודים לגוף, פשיטה מלאה בתחתית התנועה.',
  },
  // Block 2
  {
    names: ['מתח נקי סופינציה פרמידה', 'מתח נקי סופינציה פירמידה'],
    note: 'מתחיל סט ראשון עם משקל שמתאים ל-6 חזרות (17.5 ק״ג), בסט הבא מעלה משקל ויורד ל-4 חזרות (25 ק״ג), ובסט השלישי מעלה משקל ל-2-3 חזרות (32.5 ק״ג).',
  },
  {
    names: ['מתח "קשת" (Archer Pullups)', 'מתח קשת', 'Archer Pullups'],
    note: 'יד אחת מושכת והשנייה מייצבת כשהיא ישרה, עם מינימום סיוע של היד הישרה. אם קשה בהתחלה – להיעזר בגומייה או לכופף מעט את היד המסייעת.',
  },
  {
    names: ['מתח חזה פרונציה', 'מתח חזה בפרונציה'],
    note: 'מתחיל במשקל גוף. נגיעה עם החזה (קו פטמות) בבר בכל חזרה.',
  },
  {
    names: ['תלייה אקטיבית בשכמות ביד אחת'],
    note: '10 שניות כל יד. כתף משוכה למטה (Shoulder Packing), בלי להסתובב, בטן (Core) חזקה.',
  },
  {
    names: ['Toes To Bar (TTB)', 'Toes To Bar'],
    note: 'עלייה בשליטה, בלי תנופה, בטן אסופה לאורך כל התנועה.',
  },
  {
    names: ['מקבילים - טמפו', 'מקבילים-טמפו'],
    note: 'משקל נמוך מהרגיל שמתאים לחזרות מתפרצות. ירידה איטית 3 שניות, עצירה קצרה בתחתית, עלייה מתפרצת.',
  },
  {
    names: [
      'לחיצת כתפיים בעמידת ידיים על קיר (Wall Handstand Pushup)',
      'לחיצת כתפיים בעמידת ידיים בהשענות על קיר',
    ],
    note: 'חזה לכיוון הקיר, לשמור על כתפיים יציבות. במידה וקל או קשה מדי – ניתן להתאים לווריאציה קשה או קלה יותר.',
  },
  {
    names: ['שכיבות שמיכה מתפרצות בשיפוע שלילי', 'שכיבות סמיכה מתפרצות בשיפוע שלילי'],
    note: 'רגליים על קובייה או ספסל. ניתוק של פלג הגוף העליון בכל חזרה.',
  },
  {
    names: ["ג'אמפ סקוואט", 'Jump Squat'],
    note: 'להתחיל עם פלטה של 5 ק״ג בידיים. בכל חזרה מתפרץ לקפיצה הכי גבוהה שמצליח ויורד לסקוואט.',
  },
  {
    names: ['וול סיט רגל אחת', 'Single Leg Wall Sit'],
    note: 'מתחיל במשקל גוף. גב צמוד לקיר, זווית 90 מעלות ברגל אחת.',
  },
  {
    names: ['Archer push-ups', 'Archer Push-Ups'],
    note: 'שכיבות שמיכה – כל פעם יורד לצד אחר כאשר היד השנייה נשארת ישרה.',
  },
  {
    names: ['הרמת ברכיים בהחזקה על מקבילים'],
    note: 'משקל גוף, בהחזקה על מקבילים. אם קל – יכול לנסות ליישר רגליים.',
  },
]

/** Normalized lookup key: case, spacing, hyphens / maqaf, quotes and brackets. */
export function exerciseNoteKey(name: string): string {
  return name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/["'`״׳]/g, '')
    .replace(/[()[\]{}]/g, ' ')
    .replace(/[-‐‑‒–—―־/+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function withoutParens(name: string): string {
  return name.replace(/\([^)]*\)/g, ' ')
}

/** Lookup variants in order: full name, name without "(…)", each "(…)" part alone. */
function nameCandidates(name: string): string[] {
  const inner = [...name.matchAll(/\(([^)]*)\)/g)].map((m) => m[1] ?? '')
  return [name, withoutParens(name), ...inner].map(exerciseNoteKey).filter(Boolean)
}

/** Normalized name → note. Aliases list English names explicitly, so "(…)" parts are not keys. */
export const DEFAULT_EXERCISE_NOTES: ReadonlyMap<string, string> = new Map(
  NOTE_ENTRIES.flatMap(({ names, note }) =>
    names.flatMap((n) =>
      [n, withoutParens(n)].map((variant) => [exerciseNoteKey(variant), note] as const),
    ),
  ),
)

export function defaultExerciseNote(name: string): string | undefined {
  for (const key of nameCandidates(name)) {
    const note = DEFAULT_EXERCISE_NOTES.get(key)
    if (note) return note
  }
  return undefined
}

/**
 * Seed the program's coaching cue onto an exercise the user has not
 * annotated themselves (`notesUpdatedAt` marks a manual edit).
 */
export function withDefaultNote<T extends Exercise>(ex: T): T {
  if (ex.notesUpdatedAt) return ex
  const note = defaultExerciseNote(ex.name)
  if (!note || ex.notes === note) return ex
  return { ...ex, notes: note }
}
