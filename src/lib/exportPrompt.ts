import type {
  ActivityLog,
  CustomHabit,
  FoodLogEntry,
  GoalSettings,
  HabitChecks,
  Intensity,
  LifestyleLogs,
  MacroTargets,
  Phase,
  PhaseHistoryEntry,
  Recipe,
  SavedMeal,
  SetLog,
  UserProfile,
  WeightEntry,
  WorkoutDay,
} from './types'
import {
  ACTIVITY_LEVEL_LABELS,
  calcBmi,
  calcProcessDay,
  PHASE_LABELS,
  SEX_LABELS,
  WEEKDAY_SHORT,
  WORK_STYLE_LABELS,
} from './types'
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

const NA = 'לא צוין'

export const PHASE_BLUEPRINT = [
  '1. שלב 1: מסה מבוססת הרגלים (יעד מקורי: 70.0 -> 75.5 ק״ג)',
  '2. שלב 2: מיני-חיטוב ומחיקת שומן (יעד מקורי: 75.5 -> 73.0 ק״ג)',
  '3. שלב 3: תחזוקה והסתגלות מבנית (יעד מקורי: 73.0 -> 73.5 ק״ג)',
  '4. שלב 4: מסה מרכזית - צפיפות שריר (יעד מקורי: 73.5 -> 80.0 ק״ג)',
  '5. שלב 5: חיטוב ביניים ואיפוס (יעד מקורי: 80.0 -> 76.5 ק״ג)',
  '6. שלב 6: מסת פריצה וחיטוב סופי (יעד סופי: 80.0 ק״ג ו-9% שומן)',
] as const

const SYSTEM_CONTEXT_BLOCK = `---
[SYSTEM_CONTEXT_FOR_AI]
- Project: Nutrition & Fitness PWA Tracker
- Repository: GitHub (roeyhzm-coder/Nutrition-and-Fitness-Tracking)
- Hosting: Vercel (https://training-and-nutrition-plan-trackin.vercel.app)
- Stack: React + Vite, TypeScript, Tailwind CSS, Supabase
---`

const RECALIBRATION_DIRECTIVE = `## הנחיית כיול דינמי ל-AI (Dynamic Recalibration Directive)
1. שלד התוכנית המקורי משמש כקו מנחה בלבד. אין להיצמד למספרים היסטוריים אם קצב ההתקדמות בפועל שונה מהתכנון.
2. בסיום שלב או בצומת החלטה, יש לנתח את המצב הפיזיולוגי הקיים (קצב עלייה/ירידה שבועי, שינוי אחוזי שומן ועומס אימונים) ולבצע כיול מחדש (Recalibration): לקבוע האם יש צורך בהארכת השלב, מעבר מיידי לחיטוב, או שלב תחזוקה.
3. ספק יעדי קלוריות ומאקרו מדויקים והתאמות אימונים מעשיות לשלב הבא בהתאם לנתוני האמת שהושגו.`

function fmtNum(value: number | null | undefined, digits = 0) {
  if (value == null || !Number.isFinite(value)) return NA
  return digits ? value.toFixed(digits) : String(Math.round(value))
}

function fmtSigned(value: number | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(value)) return NA
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}`
}

function fmtText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : NA
}

function fmtMinutes(total: number) {
  if (total <= 0) return ''
  const h = Math.floor(total / 60)
  const m = Math.round(total % 60)
  if (!h) return `${m} דק׳`
  return m ? `${h} ש׳ ${m} דק׳` : `${h} ש׳`
}

type SportSummary = {
  name: string
  sessions: number
  totalMin: number
  intensities: Record<Intensity, number>
  notes: string[]
}

/** Groups any logged sport by name — new sports appear without code changes. */
export function aggregateActivities(logs: ActivityLog[]): SportSummary[] {
  const map = new Map<string, SportSummary>()
  for (const log of logs) {
    const name = log.sport.trim()
    if (!name) continue
    const key = name.toLocaleLowerCase('he')
    const curr = map.get(key) ?? {
      name,
      sessions: 0,
      totalMin: 0,
      intensities: { low: 0, moderate: 0, high: 0 },
      notes: [],
    }
    curr.sessions += 1
    curr.totalMin += Math.max(0, log.durationMin || 0)
    if (log.intensity) curr.intensities[log.intensity] += 1
    const note = log.notes?.trim()
    if (note) curr.notes.push(note)
    map.set(key, curr)
  }
  return [...map.values()].sort(
    (a, b) => b.sessions - a.sessions || b.totalMin - a.totalMin,
  )
}

function formatActivitiesSummary(summaries: SportSummary[]) {
  if (summaries.length === 0) return NA
  return summaries
    .map((s) => {
      const mins = fmtMinutes(s.totalMin)
      return mins ? `${s.name} ×${s.sessions} (${mins})` : `${s.name} ×${s.sessions}`
    })
    .join(' · ')
}

function formatSplitSummary(days: WorkoutDay[]) {
  if (days.length === 0) return NA
  return days
    .map((d) => {
      const label = WEEKDAY_SHORT[d.dayNumber - 1] ?? d.title
      const sessions = (d.sessions ?? []).map((s) => s.name.trim()).filter(Boolean)
      if (d.isRest && sessions.length === 0) return `${label} מנוחה`
      if (sessions.length) return `${label} ${sessions.join('+')}`
      if (d.focus.trim()) return `${label} ${d.focus}`
      return `${label} ${d.title}`
    })
    .join(' · ')
}

/** Weekly rate from the latest weigh-in vs the closest entry ~7 days earlier. */
function weeklyWeightRate(sorted: WeightEntry[]): number | null {
  if (sorted.length < 2) return null
  const latest = sorted.at(-1)
  if (!latest) return null
  const target = new Date(latest.loggedAt).getTime() - 7 * 86400000
  let prev: WeightEntry | null = null
  for (const w of sorted) {
    if (w.id === latest.id) break
    if (new Date(w.loggedAt).getTime() <= target) prev = w
  }
  prev ??= sorted[0]
  if (prev.id === latest.id) return null
  const days = Math.max(
    1,
    (new Date(latest.loggedAt).getTime() - new Date(prev.loggedAt).getTime()) /
      86400000,
  )
  return ((latest.weightKg - prev.weightKg) / days) * 7
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
  profile: UserProfile
  activityLogs: ActivityLog[]
  lifestyleLogs: LifestyleLogs
  phaseHistory: PhaseHistoryEntry[]
}): string {
  const phaseStart = input.goal.startDate
  const { profile, goal, macroTargets } = input

  const weekSets = input.setLogs.filter((s) =>
    isInRelativeWeek(s.loggedAt, phaseStart),
  )
  const weekActivities = input.activityLogs.filter((a) =>
    isInRelativeWeek(a.loggedAt, phaseStart),
  )
  const activitiesSummary = formatActivitiesSummary(
    aggregateActivities(weekActivities),
  )

  const sortedWeights = [...input.weightLogs].sort((a, b) =>
    a.loggedAt.localeCompare(b.loggedAt),
  )
  const startWeight = profile.startWeightKg ?? sortedWeights[0]?.weightKg ?? null
  const currentWeight = sortedWeights.at(-1)?.weightKg ?? null
  const latestFat =
    [...sortedWeights].reverse().find((w) => w.bodyFatPct != null)
      ?.bodyFatPct ??
    profile.estimatedBodyFatPct ??
    null
  const bmi = calcBmi(currentWeight, profile.heightCm)
  const weightDelta =
    startWeight != null && currentWeight != null
      ? currentWeight - startWeight
      : null

  const weekFoods = input.foodLogs.filter((f) =>
    isInRelativeWeek(f.loggedAt, phaseStart),
  )
  const weekWeights = input.weightLogs.filter((w) =>
    isInRelativeWeek(w.loggedAt, phaseStart),
  )

  const setLogDays = new Set(weekSets.map((s) => s.loggedAt.slice(0, 10)))
  const workoutDaysSet = new Set([
    ...setLogDays,
    ...weekActivities.map((a) => a.loggedAt.slice(0, 10)),
  ])
  const workoutsThisWeek = workoutDaysSet.size
  const targetPerWeek = goal.weeklyWorkoutTarget || 5

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
  const loggedDays = [...macrosByDay.values()]
  const avgCalories = loggedDays.length
    ? average(loggedDays.map((d) => d.calories))
    : null
  const avgProtein = loggedDays.length
    ? average(loggedDays.map((d) => d.protein))
    : null
  const avgCarbs = loggedDays.length
    ? average(loggedDays.map((d) => d.carbs))
    : null
  const avgFats = loggedDays.length
    ? average(loggedDays.map((d) => d.fats))
    : null

  const avgWeightWeek = weekWeights.length
    ? average(weekWeights.map((w) => w.weightKg))
    : null
  const weeklyRate = weeklyWeightRate(sortedWeights)

  const masterDay = calcProcessDay(goal.masterStartDate, goal.masterTotalDays)
  const phaseDay = calcProcessDay(goal.startDate, goal.totalDays)
  const phaseWeek = relativeWeekNumber(phaseStart)
  const phaseTotalWeeks = Math.max(1, Math.round(goal.totalDays / 7))
  const masterPercent = (
    (masterDay / Math.max(1, goal.masterTotalDays)) *
    100
  ).toFixed(1)
  const masterName = goal.masterName || 'גוף אל יווני'
  const masterWeight = goal.masterTargetWeightKg ?? 80
  const masterFat = goal.masterTargetBodyFatPct ?? 9
  const phaseName = goal.phaseName || PHASE_LABELS[input.phase]
  const phaseNumber = goal.phaseNumber || 1
  const totalPhases = goal.totalPhases || 6

  const historySection = input.phaseHistory.length
    ? input.phaseHistory
        .map((h, i) => {
          const type = PHASE_LABELS[h.phase]
          const name = h.name?.trim() || type
          return `- שלב ${i + 1} (${name}, ${type}): ${h.startDate} עד ${h.endDate} | משקל התחלה: ${fmtNum(h.startWeightKg, 2)} ק״ג -> משקל סיום: ${fmtNum(h.endWeightKg, 2)} ק״ג (יעד היה ${fmtNum(h.targetWeightKg, 2)} ק״ג) | שומן: ${fmtNum(h.endBodyFatPct, 2)}% | ממוצע צריכה בפועל: ${fmtNum(h.avgCalories)} קק״ל`
        })
        .join('\n')
    : '- אין שלבים קודמים (זהו שלב 1 בתהליך הכולל)'

  return `אנא נתח את הנתונים שלי לאימונים ותזונה ותן המלצות ממוקדות בעברית:

## מדדי גוף ובסיס (Biometrics)
- גיל: ${fmtNum(profile.age)} | מין: ${profile.sex ? SEX_LABELS[profile.sex] : NA} | גובה: ${fmtNum(profile.heightCm)} ס״מ
- משקל התחלתי: ${fmtNum(startWeight, 2)} ק״ג | משקל עדכני: ${fmtNum(currentWeight, 2)} ק״ג (שינוי: ${fmtSigned(weightDelta)} ק״ג)
- אחוז שומן מוערך: ${fmtNum(latestFat, 2)}% | BMI: ${fmtNum(bmi, 1)}
- שעות שינה ממוצעות: ${fmtNum(profile.avgSleepHours, 1)} ש׳ | רמת פעילות: ${profile.activityLevel ? ACTIVITY_LEVEL_LABELS[profile.activityLevel] : NA} | עבודה: ${profile.workStyle ? WORK_STYLE_LABELS[profile.workStyle] : NA}

## מטרת על ארוכת טווח (Master Plan)
- יעד: ${masterName} (${fmtNum(masterWeight, 0)} ק״ג ו-${fmtNum(masterFat, 0)}% שומן)
- התקדמות: יום ${masterDay} מתוך ${goal.masterTotalDays} (${masterPercent}%)
- תאריך התחלה: ${goal.masterStartDate}

## שלד התוכנית המקורית (6-Phase Blueprint Reference)
${PHASE_BLUEPRINT.join('\n')}

## שלב פעיל נוכחי (Current Phase)
- שלב ${phaseNumber} מתוך ${totalPhases}: ${phaseName} (סוג: ${PHASE_LABELS[input.phase]})
- התקדמות בשלב: יום ${phaseDay} מתוך ${goal.totalDays} (שבוע ${phaseWeek} מתוך ${phaseTotalWeeks})
- יעד משקל לשלב: ${fmtNum(goal.targetWeightKg, 2)} ק״ג | יעד שומן: עד ${fmtNum(goal.targetBodyFatPct, 2)}%
- יעדי מאקרו יומיים: ${fmtNum(macroTargets.calories)} קק״ל | חלבון: ${fmtNum(macroTargets.protein)}ג׳ | שומן: ${fmtNum(macroTargets.fats)}ג׳ | פחמימות: ${fmtNum(macroTargets.carbs)}ג׳

## היסטוריית שלבים קודמים (תכנון מול ביצוע בפועל)
${historySection}

## עקביות ואימונים שבועיים
- אימונים השבוע: ${workoutsThisWeek} מתוך ${targetPerWeek} ימים
- סה״כ סטים מתועדים השבוע: ${weekSets.length}
- חלוקת תוכנית: ${formatSplitSummary(input.workoutDays)}
- פילוח פעילויות: ${activitiesSummary}

## תזונה ובריאות
- מאכלים שנמנעים מהם: ${fmtText(profile.avoidFoods)}
- תוספי תזונה: ${fmtText(profile.supplements)}
- רגישויות מפרקיות / פציעות: ${fmtText(profile.injuries)}

## ממוצעים שבועיים בפועל (Actual Weekly Averages)
- ממוצע שקילה השבוע: ${fmtNum(avgWeightWeek, 2)} ק״ג (קצב שבועי: ${fmtSigned(weeklyRate)} ק״ג/שבוע)
- ממוצע קלוריות ומאקרו בפועל: ${fmtNum(avgCalories)} קק״ל | חלבון: ${fmtNum(avgProtein, 1)}ג׳ | שומן: ${fmtNum(avgFats, 1)}ג׳ | פחמימות: ${fmtNum(avgCarbs, 1)}ג׳
- ימים עם רישום מזון מלא: ${loggedDays.length}/7

${RECALIBRATION_DIRECTIVE}

${SYSTEM_CONTEXT_BLOCK}`
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
