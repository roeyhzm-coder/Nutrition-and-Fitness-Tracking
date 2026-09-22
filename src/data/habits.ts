export type HabitItem = {
  id: string
  label: string
}

export type HabitGroup = {
  id: string
  title: string
  description: string
  items: HabitItem[]
}

export const HABIT_GROUPS: HabitGroup[] = [
  {
    id: 'mobility',
    title: 'ניידות מפרקים — 10 דקות',
    description: 'שגרת בוקר קצרה לפני המסך או האימון',
    items: [
      { id: 'mob-neck', label: 'סיבובי צוואר וכתפיים — 2 דק׳' },
      { id: 'mob-hips', label: 'פתיחות ירך / 90-90 — 3 דק׳' },
      { id: 'mob-thoracic', label: 'פתיחת חזה ועמוד שדרה חזי — 2 דק׳' },
      { id: 'mob-ankles', label: 'ניידות קרסוליים וסקוואט עמוק קל — 3 דק׳' },
    ],
  },
  {
    id: 'impulse',
    title: 'שליטה בדחפים והימנעות ממסך',
    description: 'צ׳קליסט בוקר למיקוד והפחתת הסחות',
    items: [
      { id: 'imp-no-phone', label: 'לא לפתוח טלפון ב־20 הדקות הראשונות' },
      { id: 'imp-water', label: 'לשתות כוס מים לפני כל גלילה' },
      { id: 'imp-intention', label: 'לכתוב כוונה אחת ליום (משפט קצר)' },
      { id: 'imp-delay', label: 'השהיית דחף של 2 דק׳ לפני פתיחת אפליקציה' },
    ],
  },
]

export const DEFAULT_MACRO_TARGETS = {
  calories: 2400,
  protein: 180,
  carbs: 220,
  fats: 70,
}
