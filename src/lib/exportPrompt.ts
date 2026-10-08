import type {
  ActivityLog,
  CustomHabit,
  FocusTrack,
  FoodLogEntry,
  GoalSettings,
  HabitChecks,
  Intensity,
  LifestyleLogs,
  MacroTargets,
  Phase,
  PhaseHistoryEntry,
  Recipe,
  Routine,
  SavedMeal,
  SetLog,
  UserProfile,
  WeightEntry,
  WorkoutDay,
  WorkoutLog,
  WorkoutProgram,
} from './types'
import type { BodyMeasurement } from './bodyMeasurements'
import { extractBodyMeasurementsHistory } from './bodyMeasurements'
import {
  ACTIVITY_LEVEL_LABELS,
  calcBmi,
  calcProcessDay,
  DEFAULT_MASTER_NAME,
  DEFAULT_PHASE_NAME,
  DEFAULT_TOTAL_PHASES,
  localDateKey,
  PHASE_LABELS,
  ROUTINE_TIME_LABELS,
  SEX_LABELS,
  WEEKDAY_SHORT,
  WORK_STYLE_LABELS,
} from './types'
import {
  parseDayMark,
  relativeWeekNumber,
  type ConsistencyDayMarks,
} from './weeklyConsistency'
import { workoutPerformedOn } from './caloriesBurned'
import {
  buildActiveBlockStrengthRows,
  buildStrengthRowsFromLogs,
  collectProgramExerciseSlots,
  formatBlockStrengthMarkdown,
  formatStrengthDelta,
  logsForActiveBlock,
} from './blockStrength'
import {
  buildFoodCatalog,
  normalizeSearch,
  type CatalogFood,
} from './foodCatalog'

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
  '1. שלב 1: מסה נקייה ומואצת (71.0 -> 77.0 ק״ג | 210 ימים | עד 15% שומן)',
  '2. שלב 2: פריצה למשקל שיא (77.0 -> 82.0 ק״ג | 150 ימים | צפיפות שריר מקסימלית)',
  '3. שלב 3: חיטוב מהודק לגוף אל יווני (82.0 -> 80.0 ק״ג ב-9% שומן | 120 ימים)',
] as const

const RECENT_WORKOUT_DAYS = 14

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

function startOfDay(date = new Date()) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function isInLastDays(iso: string, days: number, today = startOfDay()) {
  const start = addDays(today, -(days - 1))
  const date = startOfDay(new Date(iso))
  return date >= start && date <= today
}

function eachDateKey(start: Date, end: Date): string[] {
  const keys: string[] = []
  for (let cursor = startOfDay(start); cursor <= end; cursor = addDays(cursor, 1)) {
    keys.push(localDateKey(cursor))
  }
  return keys
}

function weekdayNumberFromKey(dateKey: string) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y || 1970, (m || 1) - 1, d || 1).getDay() + 1
}

function scheduledDayNumbers(days: WorkoutDay[]): Set<number> {
  const planned = days.filter((day) => {
    if (day.isRest) return false
    return (day.sessions?.length ?? 0) > 0 || (day.exercises?.length ?? 0) > 0
  })
  if (planned.length) return new Set(planned.map((day) => day.dayNumber))
  return new Set(days.filter((day) => !day.isRest).map((day) => day.dayNumber))
}

function completedDateKeys(input: {
  workoutLogs: WorkoutLog[]
  setLogs: SetLog[]
  activityLogs: ActivityLog[]
  dayMarks: ConsistencyDayMarks
}): Set<string> {
  const dates = new Set<string>()
  for (const log of input.workoutLogs) dates.add(workoutPerformedOn(log))
  for (const set of input.setLogs) dates.add(set.loggedAt.slice(0, 10))
  for (const activity of input.activityLogs) {
    dates.add(activity.loggedAt.slice(0, 10))
  }
  for (const [date, mark] of Object.entries(input.dayMarks)) {
    if (parseDayMark(mark)?.done) dates.add(date)
  }
  return dates
}

type Adherence = { scheduled: number; completed: number; pct: number }

function adherenceForDates(
  dateKeys: string[],
  scheduledDays: Set<number>,
  completedDates: Set<string>,
): Adherence | null {
  let scheduled = 0
  let completed = 0
  for (const date of dateKeys) {
    if (!scheduledDays.has(weekdayNumberFromKey(date))) continue
    scheduled += 1
    if (completedDates.has(date)) completed += 1
  }
  if (!scheduled) return null
  return {
    scheduled,
    completed,
    pct: (completed / scheduled) * 100,
  }
}

function formatAdherenceLine(label: string, value: Adherence) {
  return `- ${label}: ${fmtNum(value.pct)}% (${value.completed}/${value.scheduled} ימים מתוכננים)`
}

function summarizeSets(
  sets: Array<{ weightKg?: number | null; reps?: number | null; done?: boolean }>,
) {
  const done = sets.filter((set) => set.done !== false)
  if (!done.length) return ''
  const tokens = done.map((set) => `${set.weightKg ?? 0}×${set.reps ?? 0}`)
  const first = tokens[0]
  if (first && tokens.every((token) => token === first)) {
    return tokens.length > 1 ? `${first}×${tokens.length}` : first
  }
  return tokens.join('/')
}

function formatRecentWorkouts(
  logs: WorkoutLog[],
  days?: WorkoutDay[],
): string {
  const today = startOfDay()
  const recent = [...logs]
    .filter((log) =>
      isInLastDays(workoutPerformedOn(log), RECENT_WORKOUT_DAYS, today),
    )
    .sort((a, b) => workoutPerformedOn(a).localeCompare(workoutPerformedOn(b)))
  if (recent.length) {
    return recent
      .map((log) => {
        const session = log.workoutName.trim() || 'אימון'
        const exercises = (log.exercises ?? [])
          .map((ex) => {
            const sets = summarizeSets(ex.sets ?? [])
            return sets ? `${ex.name} ${sets}` : ex.name
          })
          .filter(Boolean)
          .join('; ')
        return `- ${workoutPerformedOn(log)} · ${session}${exercises ? `: ${exercises}` : ''}`
      })
      .join('\n')
  }
  const planned = [
    ...new Set(
      collectProgramExerciseSlots(days)
        .map((slot) => slot.sessionName || slot.focus)
        .filter(Boolean),
    ),
  ]
  if (!planned.length) return ''
  return `- אין אימונים מתועדים ב-${RECENT_WORKOUT_DAYS} הימים האחרונים. סוגי אימון פעילים בבלוק: ${planned.join(' · ')}`
}

function findCatalogMatch(
  name: string,
  catalog: CatalogFood[],
): CatalogFood | null {
  const q = normalizeSearch(name)
  if (!q) return null
  const exact = catalog.find((item) => normalizeSearch(item.name) === q)
  if (exact) return exact
  const alias = catalog.find((item) =>
    item.aliases.some((aliasName) => normalizeSearch(aliasName) === q),
  )
  if (alias) return alias
  return (
    catalog.find((item) => {
      const itemName = normalizeSearch(item.name)
      return itemName.startsWith(q) || q.startsWith(itemName)
    }) ?? null
  )
}

function gramsFromMacros(entry: FoodLogEntry, match: CatalogFood | null) {
  const per100 = match?.per100g.calories ?? 0
  if (per100 > 0 && entry.calories > 0) {
    return Math.round((entry.calories / per100) * 1000) / 10
  }
  return null
}

export type ResolvedFoodServing = {
  grams: number | null
  servings: number | null
  label: string
}

/** Resolve serving-based leftovers (grams<=1) to catalog grams / unit label. */
export function resolveFoodLogServing(
  entry: FoodLogEntry,
  meals: SavedMeal[] = [],
  recipes: Recipe[] = [],
): ResolvedFoodServing {
  const catalog = buildFoodCatalog(recipes, meals)
  const match = findCatalogMatch(entry.name, catalog)
  const servingGrams = match?.servingGrams && match.servingGrams > 0
    ? match.servingGrams
    : null
  const inferred = gramsFromMacros(entry, match)
  const unit = match?.servingLabel?.trim() || 'מנה'

  if (entry.grams > 1) {
    const grams = entry.grams
    const servings =
      servingGrams != null ? Math.round((grams / servingGrams) * 100) / 100 : null
    if (servings != null && servings > 0 && Math.abs(servings - 1) < 0.05) {
      return { grams, servings: 1, label: `1 ${unit} (${fmtNum(grams, grams % 1 ? 1 : 0)}ג׳)` }
    }
    if (servings != null && servings > 0 && servings <= 4) {
      return {
        grams,
        servings,
        label: `${fmtNum(servings, servings % 1 ? 1 : 0)} ${unit} (${fmtNum(grams, grams % 1 ? 1 : 0)}ג׳)`,
      }
    }
    return {
      grams,
      servings,
      label: `${fmtNum(grams, grams % 1 ? 1 : 0)}ג׳`,
    }
  }

  const servings = entry.grams > 0 ? entry.grams : 1
  const grams =
    inferred && inferred > 1
      ? inferred
      : servingGrams != null
        ? Math.round(servingGrams * servings * 10) / 10
        : null
  if (grams != null && grams > 1) {
    return {
      grams,
      servings,
      label: `${fmtNum(servings, servings % 1 ? 1 : 0)} ${unit} (${fmtNum(grams, grams % 1 ? 1 : 0)}ג׳)`,
    }
  }
  return {
    grams: null,
    servings,
    label: `${fmtNum(servings, servings % 1 ? 1 : 0)} ${unit}`,
  }
}

/** Prefer logged grams; resolve 1-serving leftovers from the catalog. */
export function resolveFoodLogGrams(
  entry: FoodLogEntry,
  meals: SavedMeal[] = [],
  recipes: Recipe[] = [],
): number {
  const resolved = resolveFoodLogServing(entry, meals, recipes)
  if (resolved.grams != null && resolved.grams > 1) return resolved.grams
  return entry.grams
}

function formatFoodLogs(
  logs: FoodLogEntry[],
  meals: SavedMeal[],
  recipes: Recipe[],
): string {
  const today = startOfDay()
  const recent = [...logs]
    .filter((log) => isInLastDays(log.loggedAt, RECENT_WORKOUT_DAYS, today))
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
  if (!recent.length) return ''
  return recent
    .map((log) => {
      const serving = resolveFoodLogServing(log, meals, recipes)
      const date = log.loggedAt.slice(0, 10)
      return `- ${date} · ${log.name} · ${serving.label} · ${fmtNum(log.calories)} קק״ל · ח ${fmtNum(log.protein, 1)} · פ ${fmtNum(log.carbs, 1)} · ש ${fmtNum(log.fats, 1)}`
    })
    .join('\n')
}

function formatRoutinesDump(routines: Routine[]): string {
  if (!routines.length) return ''
  return routines
    .map((r) => {
      const window =
        r.timeframe === 'period' && r.endsOn
          ? `${r.startsOn} עד ${r.endsOn} (${r.durationDays ?? '?'} ימים)`
          : 'לתמיד'
      const archived = r.archivedAt ? ` · בארכיון מ-${r.archivedAt.slice(0, 10)}` : ''
      return `- ${r.title}: יעד ${r.weeklyTargetDays}/שבוע · ${r.targetMinutes} דק׳ · ${ROUTINE_TIME_LABELS[r.timeOfDay]} · ${window} · בוצעו ${r.completedDates.length} ימים${archived}`
    })
    .join('\n')
}

function formatFocusTracksDump(tracks: FocusTrack[]): string {
  if (!tracks.length) return ''
  return tracks
    .map((t) => {
      const window =
        t.timeframe === 'period' && t.endsOn
          ? `${t.startsOn} עד ${t.endsOn} (${t.durationMonths ?? '?'} חודשים)`
          : 'לתמיד'
      const archived = t.archivedAt ? ` · בארכיון מ-${t.archivedAt.slice(0, 10)}` : ''
      return `- ${t.name}: יעד ${t.weeklyTargetDays}/שבוע · ${t.estimatedCalories} קק״ל · ${window} · בוצעו ${t.completedDates.length} ימים${archived}`
    })
    .join('\n')
}

type DailyMacros = {
  calories: number
  protein: number
  carbs: number
  fats: number
}

function isValidFoodEntry(entry: FoodLogEntry) {
  return (
    entry.name.trim().length > 0 &&
    (entry.calories > 0 || entry.protein > 0 || entry.carbs > 0 || entry.fats > 0)
  )
}

function macrosByDay(logs: FoodLogEntry[]): Map<string, DailyMacros> {
  const map = new Map<string, DailyMacros>()
  for (const food of logs) {
    if (!isValidFoodEntry(food)) continue
    const day = food.loggedAt.slice(0, 10)
    const curr = map.get(day) ?? {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
    }
    curr.calories += food.calories
    curr.protein += food.protein
    curr.carbs += food.carbs
    curr.fats += food.fats
    map.set(day, curr)
  }
  return map
}

function rollingWeightAverage(logs: WeightEntry[], days: number): number | null {
  const window = logs.filter(
    (log) => log.weightKg > 0 && isInLastDays(log.loggedAt, days),
  )
  if (!window.length) return null
  return average(window.map((log) => log.weightKg))
}

function rollingMacroAverage(
  byDay: Map<string, DailyMacros>,
  days: number,
  minCalories = 0,
): (DailyMacros & { loggedDays: number }) | null {
  const today = startOfDay()
  const values: DailyMacros[] = []
  for (const [date, macros] of byDay) {
    if (!isInLastDays(date, days, today)) continue
    if (macros.calories < minCalories) continue
    values.push(macros)
  }
  if (!values.length) return null
  return {
    calories: average(values.map((row) => row.calories)),
    protein: average(values.map((row) => row.protein)),
    carbs: average(values.map((row) => row.carbs)),
    fats: average(values.map((row) => row.fats)),
    loggedDays: values.length,
  }
}

function formatMacroAverage(
  label: string,
  avg: (DailyMacros & { loggedDays: number }) | null,
) {
  if (!avg) return ''
  return `- ${label}: ${fmtNum(avg.calories)} קק״ל | חלבון: ${fmtNum(avg.protein, 1)}ג׳ | שומן: ${fmtNum(avg.fats, 1)}ג׳ | פחמימות: ${fmtNum(avg.carbs, 1)}ג׳ (${avg.loggedDays} ימים)`
}

function joinSections(parts: Array<string | ''>) {
  return parts.filter((part) => part.trim().length > 0).join('\n\n')
}

function blockIdentity(log: WorkoutLog) {
  return log.programId || log.programName || `block-${log.blockNumber ?? 'x'}`
}

function isActiveBlockLog(
  log: WorkoutLog,
  activeProgramId: string,
  activeProgramName: string,
) {
  if (activeProgramId && log.programId === activeProgramId) return true
  if (activeProgramName && log.programName === activeProgramName) return true
  return false
}

function weightNearDate(sorted: WeightEntry[], dateKey: string): number | null {
  if (!sorted.length) return null
  let before: WeightEntry | null = null
  let after: WeightEntry | null = null
  for (const entry of sorted) {
    const key = entry.loggedAt.slice(0, 10)
    if (key <= dateKey) before = entry
    if (key >= dateKey && !after) after = entry
  }
  return (before ?? after)?.weightKg ?? null
}

function formatPastBlockSnapshots(
  logs: WorkoutLog[],
  activeProgramId: string,
  activeProgramName: string,
  programs: WorkoutProgram[],
  sortedWeights: WeightEntry[],
  weeklyTarget: number,
): string {
  const groups = new Map<string, WorkoutLog[]>()
  for (const log of logs) {
    if (isActiveBlockLog(log, activeProgramId, activeProgramName)) continue
    const key = blockIdentity(log)
    const curr = groups.get(key) ?? []
    curr.push(log)
    groups.set(key, curr)
  }
  if (!groups.size) return ''

  const lines = [...groups.entries()]
    .map(([, group]) => {
      const ordered = [...group].sort((a, b) =>
        workoutPerformedOn(a).localeCompare(workoutPerformedOn(b)),
      )
      const first = ordered[0]
      const last = ordered.at(-1)
      if (!first || !last) return ''
      const start = workoutPerformedOn(first)
      const end = workoutPerformedOn(last)
      const name =
        first.programName.trim() ||
        (first.blockNumber != null ? `בלוק ${first.blockNumber}` : 'בלוק קודם')
      const startW = weightNearDate(sortedWeights, start)
      const endW = weightNearDate(sortedWeights, end)
      const program =
        programs.find((p) => p.id === first.programId) ??
        programs.find((p) => p.name === first.programName)
      const scheduledDays = scheduledDayNumbers(program?.days ?? [])
      const completed = new Set(ordered.map((log) => workoutPerformedOn(log)))
      const adherence = adherenceForDates(
        eachDateKey(startOfDay(new Date(start)), startOfDay(new Date(end))),
        scheduledDays.size ? scheduledDays : new Set(),
        completed,
      )
      const fallbackAdherence = (): Adherence => {
        const span = Math.max(
          1,
          Math.round(
            (startOfDay(new Date(end)).getTime() -
              startOfDay(new Date(start)).getTime()) /
              86400000,
          ) + 1,
        )
        const weeks = Math.max(1, span / 7)
        const scheduled = Math.max(1, Math.round(weeks * (weeklyTarget || 5)))
        return {
          scheduled,
          completed: completed.size,
          pct: (completed.size / scheduled) * 100,
        }
      }
      const used = adherence ?? fallbackAdherence()
      const keyChanges = buildStrengthRowsFromLogs(ordered)
        .map((row) => ({
          row,
          label: formatStrengthDelta(row),
          score: Math.abs(row.weightDelta) * 10 + Math.abs(row.repsDelta),
        }))
        .filter((item): item is typeof item & { label: string } =>
          Boolean(item.label),
        )
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((item) => item.label)
      const weightPart =
        startW != null || endW != null
          ? `משקל ${fmtNum(startW, 2)} -> ${fmtNum(endW, 2)} ק״ג`
          : ''
      const details = [
        weightPart,
        `התמדה: ${fmtNum(used.pct)}%`,
        keyChanges.length ? `שינויי מפתח: ${keyChanges.join(', ')}` : '',
      ].filter(Boolean)
      return `- ${name} (${start} עד ${end}): ${details.join(' | ')}`
    })
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'he'))

  if (!lines.length) return ''
  return `## היסטוריית בלוקים קודמים\n${lines.join('\n')}`
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
  workoutLogs?: WorkoutLog[]
  activeProgramId?: string
  activeProgramName?: string
  routines?: Routine[]
  focusTracks?: FocusTrack[]
  consistencyDayMarks?: ConsistencyDayMarks
  savedMeals?: SavedMeal[]
  recipes?: Recipe[]
  workoutPrograms?: WorkoutProgram[]
  bodyMeasurements?: BodyMeasurement[]
}): string {
  const phaseStart = input.goal.startDate
  const { profile, goal, macroTargets } = input
  const workoutLogs = input.workoutLogs ?? []
  const savedMeals = input.savedMeals ?? []
  const recipes = input.recipes ?? []
  const today = startOfDay()

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

  const weeklyRate = weeklyWeightRate(sortedWeights)
  const dayMacros = macrosByDay(input.foodLogs)
  const minDayCalories = Math.max(200, Math.round((macroTargets.calories || 0) * 0.25))
  const avgWeight7 = rollingWeightAverage(sortedWeights, 7)
  const avgWeight14 = rollingWeightAverage(sortedWeights, 14)
  const avgMacros7 = rollingMacroAverage(dayMacros, 7, minDayCalories)
  const avgMacros14 = rollingMacroAverage(dayMacros, 14, minDayCalories)

  const masterDay = calcProcessDay(goal.masterStartDate, goal.masterTotalDays)
  const phaseDay = calcProcessDay(goal.startDate, goal.totalDays)
  const phaseWeek = relativeWeekNumber(phaseStart)
  const phaseTotalWeeks = Math.max(1, Math.round(goal.totalDays / 7))
  const masterPercent = (
    (masterDay / Math.max(1, goal.masterTotalDays)) *
    100
  ).toFixed(1)
  const masterName = goal.masterName || DEFAULT_MASTER_NAME
  const masterWeight = goal.masterTargetWeightKg ?? 80
  const masterFat = goal.masterTargetBodyFatPct ?? 9
  const phaseName = goal.phaseName || DEFAULT_PHASE_NAME
  const phaseNumber = goal.phaseNumber || 1
  const totalPhases = goal.totalPhases || DEFAULT_TOTAL_PHASES

  const historySection = input.phaseHistory.length
    ? [
        '## היסטוריית שלבים קודמים (תכנון מול ביצוע בפועל)',
        input.phaseHistory
          .map((h, i) => {
            const type = PHASE_LABELS[h.phase]
            const name = h.name?.trim() || type
            return `- שלב ${i + 1} (${name}, ${type}): ${h.startDate} עד ${h.endDate} | משקל התחלה: ${fmtNum(h.startWeightKg, 2)} ק״ג -> משקל סיום: ${fmtNum(h.endWeightKg, 2)} ק״ג (יעד היה ${fmtNum(h.targetWeightKg, 2)} ק״ג) | שומן: ${fmtNum(h.endBodyFatPct, 2)}% | ממוצע צריכה בפועל: ${fmtNum(h.avgCalories)} קק״ל`
          })
          .join('\n'),
      ].join('\n')
    : ''

  const measurementHistory = [...(input.bodyMeasurements ?? [])].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt),
  )
  const measurementHistorySection = measurementHistory.length
    ? [
        '## היסטוריית מדידות גוף (מותניים / צוואר / שומן)',
        measurementHistory
          .map((row) => {
            const day = row.recordedAt.slice(0, 10)
            return `- ${day} | משקל: ${fmtNum(row.weightKg, 2)} ק״ג | מותן: ${fmtNum(row.waistCircumferenceCm, 1)} ס״מ | צוואר: ${fmtNum(row.neckCircumferenceCm, 1)} ס״מ | שומן: ${fmtNum(row.bodyFatPercentage, 2)}%`
          })
          .join('\n'),
      ].join('\n')
    : ''

  let activeProgramId = input.activeProgramId ?? ''
  let activeProgramName = input.activeProgramName?.trim() ?? ''
  const activeProgram =
    input.workoutPrograms?.find((program) => program.id === activeProgramId) ??
    input.workoutPrograms?.find(
      (program) => program.name.trim() === activeProgramName,
    )
  const activeDays = activeProgram?.days?.length
    ? activeProgram.days
    : input.workoutDays
  let activeLogs = logsForActiveBlock(
    workoutLogs,
    activeProgramId,
    activeProgramName,
    activeDays,
  )
  if (!activeLogs.length && workoutLogs.length && !activeDays.length) {
    const latest = [...workoutLogs].sort((a, b) =>
      b.completedAt.localeCompare(a.completedAt),
    )[0]
    if (latest) {
      activeProgramId = latest.programId
      activeProgramName = latest.programName.trim()
      activeLogs = logsForActiveBlock(
        workoutLogs,
        activeProgramId,
        activeProgramName,
        activeDays,
      )
    }
  }
  const strengthRows = buildActiveBlockStrengthRows({
    logs: workoutLogs,
    days: activeDays,
    setLogs: input.setLogs,
    activeProgramId,
    activeProgramName,
  })
  const strengthSection = strengthRows.length
    ? formatBlockStrengthMarkdown(
        strengthRows,
        activeProgramName || 'בלוק פעיל',
      )
    : ''
  const pastBlocksSection = formatPastBlockSnapshots(
    workoutLogs,
    activeProgramId,
    activeProgramName,
    input.workoutPrograms ?? [],
    sortedWeights,
    goal.weeklyWorkoutTarget || 5,
  )

  const routinesSection = formatRoutinesDump(input.routines ?? [])
  const tracksSection = formatFocusTracksDump(input.focusTracks ?? [])
  const workoutLogsSection = formatRecentWorkouts(workoutLogs, activeDays)
  const foodLogsSection = formatFoodLogs(input.foodLogs, savedMeals, recipes)
  const splitSummary = formatSplitSummary(input.workoutDays)

  const completedDates = completedDateKeys({
    workoutLogs,
    setLogs: input.setLogs,
    activityLogs: input.activityLogs,
    dayMarks: input.consistencyDayMarks ?? {},
  })
  const scheduledDays = scheduledDayNumbers(input.workoutDays)
  const weekStart = startOfRelativeWeek(phaseStart, today)
  const weekAdherence = adherenceForDates(
    eachDateKey(weekStart, today),
    scheduledDays,
    completedDates,
  )
  const monthAdherence = adherenceForDates(
    eachDateKey(addDays(today, -29), today),
    scheduledDays,
    completedDates,
  )
  const adherenceLines = [
    weekAdherence ? formatAdherenceLine('השבוע הנוכחי', weekAdherence) : '',
    monthAdherence
      ? formatAdherenceLine('30 הימים האחרונים', monthAdherence)
      : '',
  ].filter(Boolean)

  const rollingLines = [
    avgWeight7 != null
      ? `- ממוצע משקל 7 ימים: ${fmtNum(avgWeight7, 2)} ק״ג`
      : '',
    avgWeight14 != null
      ? `- ממוצע משקל 14 ימים: ${fmtNum(avgWeight14, 2)} ק״ג`
      : '',
    weeklyRate != null ? `- קצב שבועי: ${fmtSigned(weeklyRate)} ק״ג/שבוע` : '',
    formatMacroAverage('ממוצע מאקרו 7 ימים', avgMacros7),
    formatMacroAverage('ממוצע מאקרו 14 ימים', avgMacros14),
  ].filter(Boolean)

  const habitLines = input.habits
    .map((habit) => habit.label.trim())
    .filter(Boolean)
    .map((label) => `- ${label}`)

  const lifestyleLines = Object.entries(input.lifestyleLogs)
    .filter(([, entry]) =>
      Object.values(entry).some((value) => value != null),
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, entry]) => {
      const parts = [
        entry.steps != null ? `${entry.steps} צעדים` : '',
        entry.sleepHours != null ? `${fmtNum(entry.sleepHours, 1)} ש׳ שינה` : '',
        entry.recovery != null ? `התאוששות ${entry.recovery}/10` : '',
      ].filter(Boolean)
      return parts.length ? `- ${date} · ${parts.join(' · ')}` : ''
    })
    .filter(Boolean)

  return joinSections([
    `אנא נתח את הנתונים שלי לאימונים ותזונה ותן המלצות ממוקדות בעברית:

## מדדי גוף ומטרות (Biometrics & Goals)
- גיל: ${fmtNum(profile.age)} | מין: ${profile.sex ? SEX_LABELS[profile.sex] : NA} | גובה: ${fmtNum(profile.heightCm)} ס״מ
- משקל התחלתי: ${fmtNum(startWeight, 2)} ק״ג | משקל עדכני: ${fmtNum(currentWeight, 2)} ק״ג (שינוי: ${fmtSigned(weightDelta)} ק״ג)
- אחוז שומן מוערך: ${fmtNum(latestFat, 2)}% | BMI: ${fmtNum(bmi, 1)}
- שעות שינה ממוצעות: ${fmtNum(profile.avgSleepHours, 1)} ש׳ | רמת פעילות: ${profile.activityLevel ? ACTIVITY_LEVEL_LABELS[profile.activityLevel] : NA} | עבודה: ${profile.workStyle ? WORK_STYLE_LABELS[profile.workStyle] : NA}

## מטרת על ארוכת טווח (Master Plan)
- יעד: ${masterName} (${fmtNum(masterWeight, 1)} ק״ג ו-${fmtNum(masterFat, 0)}% שומן)
- התקדמות: יום ${masterDay} מתוך ${goal.masterTotalDays} (${masterPercent}%)
- תאריך התחלה: ${goal.masterStartDate}

## שלד התוכנית המקורית (3-Phase Blueprint Reference)
${PHASE_BLUEPRINT.join('\n')}

## שלב פעיל נוכחי (Current Phase)
- שלב ${phaseNumber} מתוך ${totalPhases}: ${phaseName} (סוג: ${PHASE_LABELS[input.phase]})
- התקדמות בשלב: יום ${phaseDay} מתוך ${goal.totalDays} (שבוע ${phaseWeek} מתוך ${phaseTotalWeeks})
- יעד משקל לשלב: ${fmtNum(goal.targetWeightKg, 2)} ק״ג | יעד שומן: עד ${fmtNum(goal.targetBodyFatPct, 2)}%
- יעדי מאקרו יומיים: ${fmtNum(macroTargets.calories)} קק״ל | חלבון: ${fmtNum(macroTargets.protein)}ג׳ | שומן: ${fmtNum(macroTargets.fats)}ג׳ | פחמימות: ${fmtNum(macroTargets.carbs)}ג׳`,
    historySection,
    measurementHistorySection,
    pastBlocksSection,
    adherenceLines.length || splitSummary !== NA || activitiesSummary !== NA
      ? [
          '## עקביות ואימונים',
          ...adherenceLines,
          splitSummary !== NA ? `- חלוקת תוכנית: ${splitSummary}` : '',
          activitiesSummary !== NA
            ? `- פילוח פעילויות השבוע: ${activitiesSummary}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
      : '',
    routinesSection ? `## שגרות והרגלים\n${routinesSection}` : '',
    habitLines.length ? `## הרגלים\n${habitLines.join('\n')}` : '',
    tracksSection ? `## מסלולי מיקוד\n${tracksSection}` : '',
    workoutLogsSection
      ? `## אימונים אחרונים (עד ${RECENT_WORKOUT_DAYS} ימים)\n${workoutLogsSection}`
      : '',
    strengthSection,
    `## תזונה ובריאות
- מאכלים שנמנעים מהם: ${fmtText(profile.avoidFoods)}
- תוספי תזונה: ${fmtText(profile.supplements)}
- רגישויות מפרקיות / פציעות: ${fmtText(profile.injuries)}`,
    foodLogsSection
      ? `## יומן מזון (עד ${RECENT_WORKOUT_DAYS} ימים)\n${foodLogsSection}`
      : '',
    rollingLines.length
      ? `## ממוצעים נעים (Rolling Averages)\n${rollingLines.join('\n')}`
      : '',
    lifestyleLines.length
      ? `## אורח חיים (14 ימים)\n${lifestyleLines.join('\n')}`
      : '',
    RECALIBRATION_DIRECTIVE,
  ])
}

export type ImportPayload = {
  savedMeals?: Array<Partial<SavedMeal> & { name: string }>
  recipes?: Array<Partial<Recipe> & { name: string }>
  body_measurements_history?: unknown
  entities?: Record<string, unknown>
}

export function parseImportJson(raw: string): {
  savedMeals: SavedMeal[]
  recipes: Recipe[]
  bodyMeasurements: BodyMeasurement[]
} {
  const data = JSON.parse(raw) as ImportPayload | SavedMeal[] | Recipe[]
  const bodyMeasurements = Array.isArray(data)
    ? []
    : extractBodyMeasurementsHistory(data)

  const asMeals = (items: Array<Partial<SavedMeal> & { name: string }>) =>
    items.map((m) => ({
      id: m.id ?? crypto.randomUUID(),
      name: m.name,
      calories: Number(m.calories ?? 0),
      protein: Number(m.protein ?? 0),
      carbs: Number(m.carbs ?? 0),
      fats: Number(m.fats ?? 0),
      notes:
        typeof m.notes === 'string' && m.notes.trim()
          ? m.notes.trim()
          : undefined,
      kind: m.kind === 'item' ? ('item' as const) : ('meal' as const),
      servingGrams:
        m.servingGrams != null && Number.isFinite(Number(m.servingGrams))
          ? Number(m.servingGrams)
          : undefined,
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
      servingGrams:
        r.servingGrams != null && Number.isFinite(Number(r.servingGrams))
          ? Number(r.servingGrams)
          : undefined,
      servings:
        r.servings != null && Number.isFinite(Number(r.servings))
          ? Number(r.servings)
          : undefined,
      batchGrams:
        r.batchGrams != null && Number.isFinite(Number(r.batchGrams))
          ? Number(r.batchGrams)
          : undefined,
      description:
        typeof r.description === 'string' && r.description.trim()
          ? r.description.trim()
          : undefined,
      variations: Array.isArray(r.variations) ? r.variations : undefined,
    }))

  if (Array.isArray(data)) {
    const looksLikeRecipe = data.some(
      (item) => 'mealType' in item || 'ingredients' in item || 'steps' in item,
    )
    if (looksLikeRecipe) {
      return { savedMeals: [], recipes: asRecipes(data as Recipe[]), bodyMeasurements }
    }
    return {
      savedMeals: asMeals(data as SavedMeal[]),
      recipes: [],
      bodyMeasurements,
    }
  }

  return {
    savedMeals: asMeals(data.savedMeals ?? []),
    recipes: asRecipes(data.recipes ?? []),
    bodyMeasurements,
  }
}
