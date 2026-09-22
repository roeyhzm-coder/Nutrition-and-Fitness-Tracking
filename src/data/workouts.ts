import type { WorkoutDay } from '../lib/types'

export const DEFAULT_WORKOUT_DAYS: WorkoutDay[] = [
  {
    id: 'day-1',
    dayNumber: 1,
    title: 'יום 1 — דחיפה',
    focus: 'Push',
    exercises: [
      { id: 'd1-e1', name: 'לחיצת חזה בשיפוע חיובי', sets: 4, reps: '6–8' },
      { id: 'd1-e2', name: 'מקבילים עם משקל', sets: 4, reps: '5–8' },
      { id: 'd1-e3', name: 'לחיצת כתפיים בעמידה', sets: 3, reps: '8–10' },
      { id: 'd1-e4', name: 'הרחקות כתף בצד', sets: 3, reps: '12–15' },
      { id: 'd1-e5', name: 'פשיטת מרפקים בחבל', sets: 3, reps: '10–12' },
    ],
  },
  {
    id: 'day-2',
    dayNumber: 2,
    title: 'יום 2 — משיכה',
    focus: 'Pull',
    exercises: [
      { id: 'd2-e1', name: 'מתח עם משקל', sets: 4, reps: '4–7' },
      { id: 'd2-e2', name: 'חתירה עם תמיכת חזה', sets: 4, reps: '8–10' },
      { id: 'd2-e3', name: 'משיכת פנים בחבל', sets: 3, reps: '12–15' },
      { id: 'd2-e4', name: 'כפיפת מרפקים פטיש', sets: 3, reps: '10–12' },
      { id: 'd2-e5', name: 'תלייה סטטית', sets: 3, reps: '30–45 שנ׳' },
    ],
  },
  {
    id: 'day-3',
    dayNumber: 3,
    title: 'יום 3 — דחיפה',
    focus: 'Push',
    exercises: [
      { id: 'd3-e1', name: 'לחיצת חזה שטוחה', sets: 4, reps: '6–8' },
      { id: 'd3-e2', name: 'שכיבות סמיכה עם גובה', sets: 3, reps: '10–15' },
      { id: 'd3-e3', name: 'לחיצת כתפיים בישיבה', sets: 3, reps: '8–10' },
      { id: 'd3-e4', name: 'הרמות קדמיות', sets: 3, reps: '12–15' },
      { id: 'd3-e5', name: 'פשיטת מרפקים מעל הראש', sets: 3, reps: '10–12' },
    ],
  },
  {
    id: 'day-4',
    dayNumber: 4,
    title: 'יום 4 — משיכה',
    focus: 'Pull',
    exercises: [
      { id: 'd4-e1', name: 'מתח במשקל גוף', sets: 4, reps: 'AMRAP' },
      { id: 'd4-e2', name: 'חתירת טבעות / TRX', sets: 3, reps: '10–12' },
      { id: 'd4-e3', name: 'משיכה אנכית', sets: 3, reps: '8–10' },
      { id: 'd4-e4', name: 'כפיפת מרפקים', sets: 3, reps: '10–12' },
      { id: 'd4-e5', name: 'הרמות Y לכתף', sets: 3, reps: '12–15' },
    ],
  },
  {
    id: 'day-5',
    dayNumber: 5,
    title: 'יום 5 — דחיפה + משיכה',
    focus: 'Push + Pull',
    exercises: [
      { id: 'd5-e1', name: 'לחיצת חזה בשיפוע חיובי', sets: 3, reps: '6–8' },
      { id: 'd5-e2', name: 'מתח עם משקל', sets: 3, reps: '4–7' },
      { id: 'd5-e3', name: 'מקבילים עם משקל', sets: 3, reps: '5–8' },
      { id: 'd5-e4', name: 'חתירה עם משקולת', sets: 3, reps: '8–10' },
      { id: 'd5-e5', name: 'מעגל ליבה קצר', sets: 3, reps: '45 שנ׳' },
    ],
  },
]
