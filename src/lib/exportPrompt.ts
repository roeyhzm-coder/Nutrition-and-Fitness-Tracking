import type {
  CustomHabit,
  FoodLogEntry,
  GoalSettings,
  HabitChecks,
  MacroTargets,
  Phase,
  Recipe,
  SavedMeal,
  SetLog,
  WeightEntry,
  WorkoutDay,
} from './types'
import { calcProcessDay, PHASE_LABELS } from './types'
import { relativeWeekNumber } from './weeklyConsistency'

function average(nums: number[]) {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function startOfRelativeWeek(phaseStartDate: string, date = new Date()) {
  const start = new Date(phaseStartDate)
  start.setHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const weekIndex = Math.max(
    0,
    Math.floor((d.getTime() - start.getTime()) / 86400000 / 7),
  )
  const weekStart = new Date(start)
  weekStart.setDate(start.getDate() + weekIndex * 7)
  return weekStart
}

function isInRelativeWeek(iso: string, phaseStartDate: string) {
  const date = new Date(iso)
  const start = startOfRelativeWeek(phaseStartDate)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return date >= start && date < end
}

export function buildAiExportPrompt(input: {
  setLogs: SetLog[]
  weightLogs: WeightEntry[]
  foodLogs: FoodLogEntry[]
  habits: CustomHabit[]
  habitChecks: HabitChecks
  macroTargets: MacroTargets
  goal: GoalSettings
  phase: Phase
  workoutDays: WorkoutDay[]
}): string {
  const phaseStart = input.goal.startDate
  const weekSets = input.setLogs.filter((s) =>
    isInRelativeWeek(s.loggedAt, phaseStart),
  )
  const weekWeights = input.weightLogs.filter((w) =>
    isInRelativeWeek(w.loggedAt, phaseStart),
  )
  const weekFoods = input.foodLogs.filter((f) =>
    isInRelativeWeek(f.loggedAt, phaseStart),
  )

  const workoutDaysSet = new Set(
    weekSets.map((s) => s.loggedAt.slice(0, 10)),
  )
  const workoutsThisWeek = workoutDaysSet.size
  const targetPerWeek = 5
  const metTarget = workoutsThisWeek >= targetPerWeek

  const topExercises = Object.entries(
    weekSets.reduce<Record<string, number>>((acc, s) => {
      acc[s.exerciseName] = (acc[s.exerciseName] ?? 0) + 1
      return acc
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => `- ${name}: ${count} סטים`)
    .join('\n')

  const macrosByDay = new Map<
    string,
    { calories: number; protein: number; carbs: number; fats: number }
  >()
  for (const f of weekFoods) {
    const day = f.loggedAt.slice(0, 10)
    const curr = macrosByDay.get(day) ?? {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
    }
    curr.calories += f.calories
    curr.protein += f.protein
    curr.carbs += f.carbs
    curr.fats += f.fats
    macrosByDay.set(day, curr)
  }
  const days = [...macrosByDay.values()]
  const avgCalories = average(days.map((d) => d.calories))
  const avgProtein = average(days.map((d) => d.protein))
  const avgCarbs = average(days.map((d) => d.carbs))
  const avgFats = average(days.map((d) => d.fats))

  const weights = weekWeights.map((w) => w.weightKg)
  const fats = weekWeights
    .map((w) => w.bodyFatPct)
    .filter((v): v is number => v != null)
  const avgWeight = average(weights)
  const avgFat = average(fats)

  const masterDay = calcProcessDay(
    input.goal.masterStartDate,
    input.goal.masterTotalDays,
  )
  const phaseDay = calcProcessDay(input.goal.startDate, input.goal.totalDays)
  const relativeWeek = relativeWeekNumber(phaseStart)
  const phaseLabel = PHASE_LABELS[input.phase]

  const masterWeight = input.goal.masterTargetWeightKg ?? 80
  const masterFat = input.goal.masterTargetBodyFatPct ?? 9
  const phaseWeight =
    input.goal.targetWeightKg != null
      ? `${input.goal.targetWeightKg} ק״ג`
      : 'לא הוגדר'
  const phaseFat =
    input.goal.targetBodyFatPct != null
      ? `${input.goal.targetBodyFatPct}%`
      : 'לא הוגדר'

  const keyExercises =
    topExercises ||
    input.workoutDays
      .flatMap((d) => d.exercises.slice(0, 2).map((e) => `- ${d.title}: ${e.name}`))
      .slice(0, 8)
      .join('\n') ||
    '- אין תרגילים'

  return `אנא נתח את הנתונים שלי לאימונים ותזונה ותן המלצות ממוקדות בעברית:

## מטרת על ארוכת טווח (Master Plan)
- שם: גוף אל יווני
- יעד: ${masterWeight} ק״ג ו-${masterFat}% שומן
- יום ${masterDay} מתוך ${input.goal.masterTotalDays}
- תאריך התחלה: ${input.goal.masterStartDate}

## שלב נוכחי (Current Phase)
- שלב פעיל: ${phaseLabel}
- יום ${phaseDay} מתוך ${input.goal.totalDays}
- שבוע יחסי: ${relativeWeek}
- תאריך תחילת שלב: ${input.goal.startDate}
- יעד משקל לשלב: ${phaseWeight}
- יעד שומן לשלב: ${phaseFat}

## אימונים ועקביות שבועית
- ${workoutsThisWeek} מתוך ${targetPerWeek} אימונים השבוע
- עמידה ביעד: ${metTarget ? 'כן' : 'לא'}
- סה״כ סטים השבוע: ${weekSets.length}
- תרגילים מרכזיים:
${keyExercises}
- תוכנית נוכחית: ${input.workoutDays.map((d) => `יום ${d.dayNumber} ${d.title}`).join(' | ')}

## משקל, אחוזי שומן ומאקרו
- ממוצע שקילה השבוע: ${avgWeight ? avgWeight.toFixed(1) : 'אין נתונים'} ק״ג (יעד שלב: ${phaseWeight})
- ממוצע אחוזי שומן השבוע: ${avgFat ? `${avgFat.toFixed(1)}%` : 'אין נתונים'} (יעד שלב: ${phaseFat})
- יעדי מאקרו לשלב: ${input.macroTargets.calories} קק״ל · חלבון ${input.macroTargets.protein}ג׳ · פחמימות ${input.macroTargets.carbs}ג׳ · שומן ${input.macroTargets.fats}ג׳
- ממוצע קלוריות: ${avgCalories ? Math.round(avgCalories) : 'אין נתונים'} קק״ל
- ממוצע חלבון: ${avgProtein ? Math.round(avgProtein) : 'אין נתונים'}ג׳
- ממוצע פחמימות: ${avgCarbs ? Math.round(avgCarbs) : 'אין נתונים'}ג׳
- ממוצע שומן: ${avgFats ? Math.round(avgFats) : 'אין נתונים'}ג׳
- ימים עם רישום מזון: ${days.length}

## בקשה
1. הערך התקדמות מול מטרת העל (גוף אל יווני) ומול השלב הנוכחי.
2. בדוק עקביות אימונים מול יעד 5 בשבוע.
3. בדוק התאמה בין צריכת המאקרו ליעדי השלב.
4. הצע התאמות מעשיות לשבוע היחסי הבא בעברית קצרה.`
}

export type ImportPayload = {
  savedMeals?: Array<Partial<SavedMeal> & { name: string }>
  recipes?: Array<Partial<Recipe> & { name: string }>
}

export function parseImportJson(raw: string): {
  savedMeals: SavedMeal[]
  recipes: Recipe[]
} {
  const data = JSON.parse(raw) as ImportPayload | SavedMeal[] | Recipe[]

  const asMeals = (items: Array<Partial<SavedMeal> & { name: string }>) =>
    items.map((m) => ({
      id: m.id ?? crypto.randomUUID(),
      name: m.name,
      calories: Number(m.calories ?? 0),
      protein: Number(m.protein ?? 0),
      carbs: Number(m.carbs ?? 0),
      fats: Number(m.fats ?? 0),
    }))

  const asRecipes = (
    items: Array<
      Partial<Recipe> & {
        name: string
        protein?: number
        carbs?: number
        fats?: number
      }
    >,
  ) =>
    items.map((r) => ({
      id: r.id ?? crypto.randomUUID(),
      name: r.name,
      mealType: (r.mealType as Recipe['mealType']) ?? 'snacks',
      proteinG: Number(r.proteinG ?? r.protein ?? 0),
      calories: Number(r.calories ?? 0),
      carbsG: Number(r.carbsG ?? r.carbs ?? 0),
      fatsG: Number(r.fatsG ?? r.fats ?? 0),
      timeMin: Number(r.timeMin ?? 10),
      tags: r.tags ?? [],
      ingredients: r.ingredients ?? [],
      steps: r.steps ?? [],
    }))

  if (Array.isArray(data)) {
    const looksLikeRecipe = data.some(
      (item) => 'mealType' in item || 'ingredients' in item || 'steps' in item,
    )
    if (looksLikeRecipe) {
      return { savedMeals: [], recipes: asRecipes(data as Recipe[]) }
    }
    return {
      savedMeals: asMeals(data as SavedMeal[]),
      recipes: [],
    }
  }

  return {
    savedMeals: asMeals(data.savedMeals ?? []),
    recipes: asRecipes(data.recipes ?? []),
  }
}
