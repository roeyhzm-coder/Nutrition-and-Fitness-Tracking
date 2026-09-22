import type {
  CustomHabit,
  FoodLogEntry,
  HabitChecks,
  MacroTargets,
  ProcessSettings,
  Recipe,
  SavedMeal,
  SetLog,
  WeightEntry,
  WorkoutDay,
} from './types'

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
  habits: CustomHabit[]
  habitChecks: HabitChecks
  macroTargets: MacroTargets
  process: ProcessSettings
  workoutDays: WorkoutDay[]
}): string {
  const weekSets = input.setLogs.filter((s) => isInCurrentWeek(s.loggedAt))
  const weekWeights = input.weightLogs.filter((w) => isInCurrentWeek(w.loggedAt))
  const weekFoods = input.foodLogs.filter((f) => isInCurrentWeek(f.loggedAt))

  const workoutsByDay = new Map<string, number>()
  for (const s of weekSets) {
    const day = s.loggedAt.slice(0, 10)
    workoutsByDay.set(day, (workoutsByDay.get(day) ?? 0) + 1)
  }

  const workoutLines =
    weekSets.length === 0
      ? '- אין רישומי אימון השבוע'
      : [...workoutsByDay.entries()]
          .map(([day, count]) => `- ${day}: ${count} סטים`)
          .join('\n')

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
  const latest = weekWeights.at(-1)

  const habitIds = input.habits.map((h) => h.id)
  const weekHabitDays = 7
  let completedSlots = 0
  let totalSlots = 0
  const start = startOfWeek()
  for (let i = 0; i < weekHabitDays; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    const done = new Set(input.habitChecks[key] ?? [])
    for (const id of habitIds) {
      totalSlots += 1
      if (done.has(id)) completedSlots += 1
    }
  }
  const habitRate =
    totalSlots === 0 ? 0 : Math.round((completedSlots / totalSlots) * 100)

  const startDate = new Date(input.process.startDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  startDate.setHours(0, 0, 0, 0)
  const dayNum = Math.max(
    1,
    Math.floor((today.getTime() - startDate.getTime()) / 86400000) + 1,
  )
  const processDay = Math.min(dayNum, input.process.totalDays)

  return `אנא נתח את הנתונים השבועיים שלי לאימונים ותזונה ותן המלצות ממוקדות בעברית:

## התקדמות בתהליך
- יום ${processDay} מתוך ${input.process.totalDays}
- תאריך התחלה: ${input.process.startDate}

## משקל ואחוזי שומן
- ממוצע משקל השבוע: ${avgWeight ? avgWeight.toFixed(1) : 'אין נתונים'} ק״ג
- ממוצע אחוזי שומן השבוע: ${avgFat ? `${avgFat.toFixed(1)}%` : 'אין נתונים'}
- מדידה אחרונה: ${
    latest
      ? `${latest.weightKg} ק״ג${
          latest.bodyFatPct != null ? ` · ${latest.bodyFatPct}% שומן` : ''
        }`
      : 'אין נתונים'
  }

## תזונה (ממוצעים יומיים בשבוע)
- יעדים: ${input.macroTargets.calories} קק״ל · חלבון ${input.macroTargets.protein}ג׳ · פחמימות ${input.macroTargets.carbs}ג׳ · שומן ${input.macroTargets.fats}ג׳
- ממוצע קלוריות: ${avgCalories ? Math.round(avgCalories) : 'אין נתונים'} קק״ל
- ממוצע חלבון: ${avgProtein ? Math.round(avgProtein) : 'אין נתונים'}ג׳
- ממוצע פחמימות: ${avgCarbs ? Math.round(avgCarbs) : 'אין נתונים'}ג׳
- ממוצע שומן: ${avgFats ? Math.round(avgFats) : 'אין נתונים'}ג׳
- ימים עם רישום מזון: ${days.length}

## אימונים
- ימי אימון עם רישום: ${workoutsByDay.size}
- סה״כ סטים השבוע: ${weekSets.length}
${workoutLines}
${topExercises ? `\nתרגילים בולטים:\n${topExercises}` : ''}
- תוכנית נוכחית: ${input.workoutDays.map((d) => d.title).join(' | ')}

## הרגלים
- מספר הרגלים פעילים: ${input.habits.length}
- אחוז השלמה שבועי: ${habitIds.length === 0 ? 'אין הרגלים' : `${habitRate}%`} (${completedSlots}/${totalSlots})

## בקשה
1. הערך את מגמת המשקל ואחוזי השומן.
2. בדוק התאמה בין צריכת המאקרו ליעדים.
3. הערך את נפח האימונים והרגלים.
4. הצע התאמות מעשיות לשבוע הבא בעברית קצרה.`
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
