import type {
  ActivityLog,
  CustomHabit,
  FoodLogEntry,
  GoalSettings,
  HabitChecks,
  Intensity,
  LifestyleEntry,
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
  calcProcessDay,
  dayAllExercises,
  INTENSITY_LABELS,
  PHASE_LABELS,
} from './types'
import { relativeWeekNumber } from './weeklyConsistency'
import { summarizePhase } from './phaseHistory'

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

const SYSTEM_CONTEXT_BLOCK = `---
[SYSTEM_CONTEXT_FOR_AI]
- Project: Nutrition & Fitness PWA Tracker
- Repository: GitHub (Nutrition-and-Fitness-Tracking)
- Hosting: Netlify (fitpwa-tracker.netlify.app)
- Stack: React + Vite, TypeScript, PWA (Service Worker)
- Database & Auth: Supabase (food_logs, user_profiles, phases_history)
- Local Workspace: fitpwa
- Purpose: 1200-day body transformation tracking across dynamic phases
---`

function localDateKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fmtNum(value: number | null | undefined, unit = '', digits = 0) {
  if (value == null || !Number.isFinite(value)) return NA
  return `${digits ? value.toFixed(digits) : Math.round(value)}${unit}`
}

function fmtText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : NA
}

function fmtMinutes(total: number) {
  if (total <= 0) return NA
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

function formatSport(s: SportSummary) {
  const intensity =
    (Object.keys(INTENSITY_LABELS) as Intensity[])
      .filter((k) => s.intensities[k] > 0)
      .map((k) => `${INTENSITY_LABELS[k]} ×${s.intensities[k]}`)
      .join(', ') || NA
  const notes = s.notes.length ? s.notes.join(' | ') : NA
  return `### ${s.name}
- אימונים השבוע: ${s.sessions}
- משך מצטבר: ${fmtMinutes(s.totalMin)}
- עצימות: ${intensity}
- הערות: ${notes}`
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
  const { profile } = input
  const weekSets = input.setLogs.filter((s) =>
    isInRelativeWeek(s.loggedAt, phaseStart),
  )
  const weekActivities = input.activityLogs.filter((a) =>
    isInRelativeWeek(a.loggedAt, phaseStart),
  )
  const sportSummaries = aggregateActivities(weekActivities)
  const weekStart = startOfRelativeWeek(phaseStart)
  const weekLifestyle = Object.entries(input.lifestyleLogs)
    .filter(([date]) => isInRelativeWeek(`${date}T12:00:00`, phaseStart))
    .map(([, entry]) => entry)
  const pickAvg = (key: keyof LifestyleEntry) => {
    const vals = weekLifestyle
      .map((e) => e[key])
      .filter((v): v is number => v != null && Number.isFinite(v))
    return vals.length ? average(vals) : null
  }
  const avgSteps = pickAvg('steps')
  const avgSleep = pickAvg('sleepHours')
  const avgRecovery = pickAvg('recovery')

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
  const bmi =
    currentWeight != null && profile.heightCm
      ? currentWeight / (profile.heightCm / 100) ** 2
      : null
  const weightDelta =
    startWeight != null && currentWeight != null
      ? currentWeight - startWeight
      : null
  const weekWeights = input.weightLogs.filter((w) =>
    isInRelativeWeek(w.loggedAt, phaseStart),
  )
  const weekFoods = input.foodLogs.filter((f) =>
    isInRelativeWeek(f.loggedAt, phaseStart),
  )

  const setLogDays = new Set(weekSets.map((s) => s.loggedAt.slice(0, 10)))
  const workoutDaysSet = new Set([
    ...setLogDays,
    ...weekActivities.map((a) => a.loggedAt.slice(0, 10)),
  ])
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
      : NA
  const phaseFat =
    input.goal.targetBodyFatPct != null
      ? `${input.goal.targetBodyFatPct}%`
      : NA

  const keyExercises =
    topExercises ||
    input.workoutDays
      .flatMap((d) => {
        const sessions = (d.sessions ?? [])
          .map((s) => `- יום ${d.dayNumber} · ${s.name}`)
          .slice(0, 2)
        const ex = dayAllExercises(d)
          .slice(0, 2)
          .map((e) => `- יום ${d.dayNumber}: ${e.name}`)
        return sessions.length ? sessions : ex
      })
      .slice(0, 8)
      .join('\n') ||
    '- אין תרגילים'

  const programLines = input.workoutDays
    .map((d) => {
      const blocks =
        (d.sessions ?? []).map((s) => s.name).join(' + ') ||
        'תרגילים עצמאיים'
      return `יום ${d.dayNumber} ${d.title} (${blocks})`
    })
    .join(' | ')

  const currentSummary = summarizePhase({
    phase: input.phase,
    goal: input.goal,
    macroTargets: input.macroTargets,
    weightLogs: input.weightLogs,
    foodLogs: input.foodLogs,
  })
  const historySection = input.phaseHistory.length
    ? input.phaseHistory
        .map((h, i) => {
          const delta =
            h.startWeightKg != null && h.endWeightKg != null
              ? ` (${h.endWeightKg - h.startWeightKg > 0 ? '+' : ''}${(h.endWeightKg - h.startWeightKg).toFixed(1)} ק״ג)`
              : ''
          return `${i + 1}. ${PHASE_LABELS[h.phase]} · ${h.startDate} – ${h.endDate} · ${h.actualDays} ימים בפועל (מתוכנן ${h.plannedDays})
   - משקל התחלה → סיום: ${fmtNum(h.startWeightKg, ' ק״ג', 1)} → ${fmtNum(h.endWeightKg, ' ק״ג', 1)}${delta}
   - ממוצע קלוריות: ${fmtNum(h.avgCalories, ' קק״ל')} · יעד קלוריות: ${fmtNum(h.macroTargets?.calories, ' קק״ל')}
   - משקל יעד לשלב: ${fmtNum(h.targetWeightKg, ' ק״ג', 1)}`
        })
        .join('\n')
    : `- ${NA} (אין שלבים שהסתיימו עדיין)`

  const sportsSection = sportSummaries.length
    ? sportSummaries.map(formatSport).join('\n\n')
    : `- ${NA} (לא תועדו פעילויות השבוע)`
  const setLogLine = setLogDays.size
    ? `- רישום סטים (חדר כושר): ${setLogDays.size} ימים · ${weekSets.length} סטים`
    : '- רישום סטים (חדר כושר): לא תועדו סטים השבוע'
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  return `אנא נתח את הנתונים שלי לאימונים ותזונה ותן המלצות ממוקדות בעברית:

## מדדי גוף ובסיס (Biometrics)
- גיל: ${fmtNum(profile.age)}
- גובה: ${fmtNum(profile.heightCm, ' ס״מ')}
- משקל התחלתי: ${fmtNum(startWeight, ' ק״ג', 1)}
- משקל עדכני: ${fmtNum(currentWeight, ' ק״ג', 1)}
- שינוי מתחילת התהליך: ${weightDelta != null ? `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} ק״ג` : NA}
- אחוז שומן מוערך: ${fmtNum(latestFat, '%', 1)}
- BMI: ${fmtNum(bmi, '', 1)}

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
- משקל בתחילת השלב: ${fmtNum(currentSummary.startWeightKg, ' ק״ג', 1)}
- ממוצע קלוריות בשלב עד כה: ${fmtNum(currentSummary.avgCalories, ' קק״ל')}

## היסטוריית שלבים (Phase History)
היסטוריית שלבים קודמים:
${historySection}
- שלב פעיל כעת: ${phaseLabel} · ${input.goal.startDate} – היום · יום ${phaseDay} מתוך ${input.goal.totalDays}

## אימונים ועקביות שבועית
- טווח השבוע: ${localDateKey(weekStart)} – ${localDateKey(weekEnd)}
- ${workoutsThisWeek} מתוך ${targetPerWeek} ימי אימון השבוע
- עמידה ביעד: ${metTarget ? 'כן' : 'לא'}
- סה״כ סטים השבוע: ${weekSets.length}
- תרגילים מרכזיים:
${keyExercises}
- תוכנית נוכחית: ${programLines || NA}

## פילוח ענפי ספורט השבוע (Dynamic Activities)
${setLogLine}
${sportsSection}

## פעילות יומית ואורח חיים (Lifestyle & NEAT)
- ממוצע צעדים יומי: ${avgSteps != null ? Math.round(avgSteps).toLocaleString('he-IL') : NA}
- ממוצע שעות שינה: ${fmtNum(avgSleep, ' ש׳', 1)}
- מדד התאוששות ממוצע (1–10): ${fmtNum(avgRecovery, '', 1)}
- ימים מתועדים השבוע: ${weekLifestyle.length || NA}

## תזונה, מגבלות ובריאות
- מאכלים שנמנעים מהם: ${fmtText(profile.avoidFoods)}
- אלרגיות / רגישויות מזון: ${fmtText(profile.allergies)}
- תוספי תזונה בשימוש שוטף: ${fmtText(profile.supplements)}
- רגישויות מפרקיות / פציעות עבר: ${fmtText(profile.injuries)}

## משקל, אחוזי שומן ומאקרו
- ממוצע שקילה השבוע: ${fmtNum(avgWeight || null, ' ק״ג', 1)} (יעד שלב: ${phaseWeight})
- ממוצע אחוזי שומן השבוע: ${fmtNum(avgFat || null, '%', 1)} (יעד שלב: ${phaseFat})
- יעדי מאקרו לשלב: ${input.macroTargets.calories} קק״ל · חלבון ${input.macroTargets.protein}ג׳ · פחמימות ${input.macroTargets.carbs}ג׳ · שומן ${input.macroTargets.fats}ג׳
- ממוצע קלוריות: ${fmtNum(avgCalories || null, ' קק״ל')}
- ממוצע חלבון: ${fmtNum(avgProtein || null, 'ג׳')}
- ממוצע פחמימות: ${fmtNum(avgCarbs || null, 'ג׳')}
- ממוצע שומן: ${fmtNum(avgFats || null, 'ג׳')}
- ימים עם רישום מזון: ${days.length}

## בקשה
1. הערך התקדמות מול מטרת העל (גוף אל יווני) ומול השלב הנוכחי, בהשוואה לשלבים הקודמים.
2. בדוק עקביות אימונים מול יעד 5 בשבוע, כולל איזון בין ענפי הספורט והעומס המצטבר.
3. בדוק התאמה בין צריכת המאקרו ליעדי השלב בהתחשב בהוצאה האנרגטית (אימונים + צעדים).
4. התחשב במגבלות, אלרגיות, תוספים ופציעות שצוינו.
5. הצע התאמות מעשיות לשבוע היחסי הבא בעברית קצרה.

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
