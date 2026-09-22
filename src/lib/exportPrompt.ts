import { KEY_LIFTS, type KeyLiftId } from '../data/workouts'
import type { SetLog } from './types'
import type { WeightEntry } from './types'
import type { FoodLogEntry } from './types'

function average(nums: number[]) {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function startOfWeek(d = new Date()) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function isInCurrentWeek(iso: string) {
  const date = new Date(iso)
  const start = startOfWeek()
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return date >= start && date < end
}

export function buildAiExportPrompt(input: {
  setLogs: SetLog[]
  weightLogs: WeightEntry[]
  foodLogs: FoodLogEntry[]
  calorieTarget: number
}): string {
  const weekSets = input.setLogs.filter((s) => isInCurrentWeek(s.loggedAt))
  const weekWeights = input.weightLogs.filter((w) => isInCurrentWeek(w.loggedAt))
  const weekFoods = input.foodLogs.filter((f) => isInCurrentWeek(f.loggedAt))

  const liftSummaries = KEY_LIFTS.map((lift) => {
    const sets = weekSets.filter((s) => s.exerciseId === (lift.id as KeyLiftId))
    if (sets.length === 0) {
      return `- ${lift.name}: אין רישומים השבוע`
    }
    const best = sets.reduce((acc, s) =>
      s.weightKg * s.reps > acc.weightKg * acc.reps ? s : acc,
    )
    const avgRpe = average(sets.map((s) => s.rpe))
    return `- ${lift.name}: משקל שיא משוער ${best.weightKg} ק״ג × ${best.reps} חזרות (RPE ממוצע ${avgRpe.toFixed(1)}, ${sets.length} סטים)`
  }).join('\n')

  const caloriesByDay = new Map<string, number>()
  for (const f of weekFoods) {
    const day = f.loggedAt.slice(0, 10)
    caloriesByDay.set(day, (caloriesByDay.get(day) ?? 0) + f.calories)
  }
  const dailyCals = [...caloriesByDay.values()]
  const avgCalories = average(dailyCals)

  const weights = weekWeights.map((w) => w.weightKg)
  const avgWeight = average(weights)
  const latestWeight = weekWeights.at(-1)?.weightKg

  return `אנא נתח את הנתונים השבועיים שלי לאימונים ותזונה ותן המלצות ממוקדות בעברית:

## הרמות המרכזיות (Key Lifts)
${liftSummaries}

## תזונה
- יעד קלורי יומי: ${input.calorieTarget} קק״ל
- ממוצע קלורי יומי השבוע: ${avgCalories ? Math.round(avgCalories) : 'אין נתונים'} קק״ל
- מספר ימים עם רישום מזון: ${dailyCals.length}

## משקל גוף
- ממוצע שקילות השבוע: ${avgWeight ? avgWeight.toFixed(1) : 'אין נתונים'} ק״ג
- שקילה אחרונה: ${latestWeight != null ? `${latestWeight.toFixed(1)} ק״ג` : 'אין נתונים'}

## בקשה
1. הערך את ההתקדמות בעומס מתקדם ב-Key Lifts.
2. ציין אם צריכת הקלוריות תואמת את היעד.
3. הצע התאמות לאימון ולתזונה לשבוע הבא.
4. שמור על תשובה קצרה, מעשית וברורה.`
}
