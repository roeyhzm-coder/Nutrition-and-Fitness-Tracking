export type Exercise = {
  id: string
  name: string
  sets: number
  reps: string
  notes?: string
  isKeyLift?: boolean
}

export type WorkoutDay = {
  id: string
  dayNumber: number
  title: string
  focus: string
  exercises: Exercise[]
}

export const KEY_LIFTS = [
  {
    id: 'weighted-pullup',
    name: 'מתח עם משקל',
    nameEn: 'Weighted Pull-up',
  },
  {
    id: 'weighted-dip',
    name: 'מקבילים עם משקל',
    nameEn: 'Weighted Dip',
  },
  {
    id: 'incline-db-press',
    name: 'לחיצת חזה בשיפוע חיובי',
    nameEn: 'Incline Dumbbell Press',
  },
] as const

export type KeyLiftId = (typeof KEY_LIFTS)[number]['id']

export const WORKOUT_DAYS: WorkoutDay[] = [
  {
    id: 'day-1',
    dayNumber: 1,
    title: 'יום 1 — דחיפה',
    focus: 'חזה · כתפיים · תלת ראשי + קליסתניקס',
    exercises: [
      {
        id: 'incline-db-press',
        name: 'לחיצת חזה בשיפוע חיובי',
        sets: 4,
        reps: '6–8',
        isKeyLift: true,
        notes: 'Key Lift — עומס מתקדם',
      },
      {
        id: 'weighted-dip',
        name: 'מקבילים עם משקל',
        sets: 4,
        reps: '5–8',
        isKeyLift: true,
        notes: 'Key Lift — עומס מתקדם',
      },
      {
        id: 'ohp',
        name: 'לחיצת כתפיים בעמידה',
        sets: 3,
        reps: '8–10',
      },
      {
        id: 'pike-pushup',
        name: 'שכיבות סמיכה פיק / ידית',
        sets: 3,
        reps: '8–12',
      },
      {
        id: 'lateral-raise',
        name: 'הרחקות כתף בצד',
        sets: 3,
        reps: '12–15',
      },
      {
        id: 'tricep-ext',
        name: 'פשיטת מרפקים בחבל',
        sets: 3,
        reps: '10–12',
      },
    ],
  },
  {
    id: 'day-2',
    dayNumber: 2,
    title: 'יום 2 — משיכה',
    focus: 'גב · דו־ראשי + מתח',
    exercises: [
      {
        id: 'weighted-pullup',
        name: 'מתח עם משקל',
        sets: 4,
        reps: '4–7',
        isKeyLift: true,
        notes: 'Key Lift — עומס מתקדם',
      },
      {
        id: 'chest-supported-row',
        name: 'חתירה עם תמיכת חזה',
        sets: 4,
        reps: '8–10',
      },
      {
        id: 'australian-pullup',
        name: 'מתח אוסטרלי',
        sets: 3,
        reps: '10–15',
      },
      {
        id: 'face-pull',
        name: 'משיכת פנים בחבל',
        sets: 3,
        reps: '12–15',
      },
      {
        id: 'hammer-curl',
        name: 'כפיפת מרפקים פטיש',
        sets: 3,
        reps: '10–12',
      },
      {
        id: 'dead-hang',
        name: 'תלייה סטטית',
        sets: 3,
        reps: '30–45 שנ׳',
      },
    ],
  },
  {
    id: 'day-3',
    dayNumber: 3,
    title: 'יום 3 — רגליים וליבה',
    focus: 'רגליים · ישבן · בטן',
    exercises: [
      {
        id: 'goblet-squat',
        name: 'סקוואט גובלט',
        sets: 4,
        reps: '8–10',
      },
      {
        id: 'rdl',
        name: 'דדליפט רומני',
        sets: 3,
        reps: '8–10',
      },
      {
        id: 'walking-lunge',
        name: 'לאנג׳ בהליכה',
        sets: 3,
        reps: '10 לכל צד',
      },
      {
        id: 'calf-raise',
        name: 'הרמות שוק',
        sets: 3,
        reps: '12–15',
      },
      {
        id: 'hanging-knee-raise',
        name: 'הרמות ברכיים בתלייה',
        sets: 3,
        reps: '10–15',
      },
      {
        id: 'plank',
        name: 'פלאנק',
        sets: 3,
        reps: '40–60 שנ׳',
      },
    ],
  },
  {
    id: 'day-4',
    dayNumber: 4,
    title: 'יום 4 — עליון היברידי',
    focus: 'קליסתניקס + משקולות קלות',
    exercises: [
      {
        id: 'pullup-bodyweight',
        name: 'מתח במשקל גוף',
        sets: 4,
        reps: 'AMRAP',
      },
      {
        id: 'pushup-deficit',
        name: 'שכיבות סמיכה עם גובה',
        sets: 4,
        reps: '10–15',
      },
      {
        id: 'ring-row',
        name: 'חתירת טבעות / TRX',
        sets: 3,
        reps: '10–12',
      },
      {
        id: 'db-bench',
        name: 'לחיצת חזה שטוחה במשקולות',
        sets: 3,
        reps: '8–10',
      },
      {
        id: 'y-raise',
        name: 'הרמות Y לכתף',
        sets: 3,
        reps: '12–15',
      },
      {
        id: 'bicep-curl',
        name: 'כפיפת מרפקים',
        sets: 3,
        reps: '10–12',
      },
    ],
  },
  {
    id: 'day-5',
    dayNumber: 5,
    title: 'יום 5 — Key Lifts + כוח',
    focus: 'העמסה על הרמות המרכזיות',
    exercises: [
      {
        id: 'weighted-pullup',
        name: 'מתח עם משקל',
        sets: 5,
        reps: '3–5',
        isKeyLift: true,
        notes: 'Key Lift — עומס מתקדם',
      },
      {
        id: 'weighted-dip',
        name: 'מקבילים עם משקל',
        sets: 5,
        reps: '3–6',
        isKeyLift: true,
        notes: 'Key Lift — עומס מתקדם',
      },
      {
        id: 'incline-db-press',
        name: 'לחיצת חזה בשיפוע חיובי',
        sets: 4,
        reps: '5–7',
        isKeyLift: true,
        notes: 'Key Lift — עומס מתקדם',
      },
      {
        id: 'farmer-carry',
        name: 'הליכת חקלאי',
        sets: 3,
        reps: '40 מ׳',
      },
      {
        id: 'core-circuit',
        name: 'מעגל ליבה קצר',
        sets: 3,
        reps: '45 שנ׳ עבודה',
      },
    ],
  },
]
