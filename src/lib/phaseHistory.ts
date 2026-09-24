import { getDeviceId } from './appStateSync'
import { isSupabaseConfigured, supabase } from './supabase'
import type {
  FoodLogEntry,
  GoalSettings,
  MacroTargets,
  Phase,
  PhaseHistoryEntry,
  WeightEntry,
} from './types'
import { isPhase, todayKey, uid } from './types'

function dayStart(date: string) {
  const d = new Date(`${date}T00:00:00`)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Inclusive day count between two YYYY-MM-DD dates (min 1). */
export function daysBetween(startDate: string, endDate: string) {
  const diff = Math.round(
    (dayStart(endDate).getTime() - dayStart(startDate).getTime()) / 86400000,
  )
  return Math.max(1, diff + 1)
}

export type PhaseSummary = Omit<PhaseHistoryEntry, 'id'>

export function summarizePhase(input: {
  phase: Phase
  goal: GoalSettings
  macroTargets: MacroTargets
  weightLogs: WeightEntry[]
  foodLogs: FoodLogEntry[]
  endDate?: string
}): PhaseSummary {
  const startDate = input.goal.startDate
  const endDate = input.endDate ?? todayKey()
  const inRange = (iso: string) => {
    const day = iso.slice(0, 10)
    return day >= startDate && day <= endDate
  }

  const weights = [...input.weightLogs].sort((a, b) =>
    a.loggedAt.localeCompare(b.loggedAt),
  )
  const weightsInRange = weights.filter((w) => inRange(w.loggedAt))
  const lastBefore = weights
    .filter((w) => w.loggedAt.slice(0, 10) < startDate)
    .at(-1)
  const startWeightKg =
    weightsInRange[0]?.weightKg ?? lastBefore?.weightKg ?? null
  const endWeightKg = weightsInRange.at(-1)?.weightKg ?? null

  const caloriesByDay = new Map<string, number>()
  for (const f of input.foodLogs) {
    if (!inRange(f.loggedAt)) continue
    const day = f.loggedAt.slice(0, 10)
    caloriesByDay.set(day, (caloriesByDay.get(day) ?? 0) + f.calories)
  }
  const dailyTotals = [...caloriesByDay.values()]
  const avgCalories = dailyTotals.length
    ? Math.round(dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length)
    : null

  return {
    phase: input.phase,
    startDate,
    endDate,
    plannedDays: input.goal.totalDays,
    actualDays: daysBetween(startDate, endDate),
    startWeightKg,
    endWeightKg,
    avgCalories,
    targetWeightKg: input.goal.targetWeightKg,
    macroTargets: input.macroTargets,
  }
}

export function createHistoryEntry(summary: PhaseSummary): PhaseHistoryEntry {
  return { ...summary, id: uid() }
}

type PhaseHistoryRow = {
  id: string
  device_id: string
  phase: string
  start_date: string
  end_date: string
  planned_days: number
  actual_days: number
  start_weight_kg: number | null
  end_weight_kg: number | null
  avg_calories: number | null
  target_weight_kg: number | null
  macro_targets: MacroTargets
}

function toRow(entry: PhaseHistoryEntry, deviceId: string): PhaseHistoryRow {
  return {
    id: entry.id,
    device_id: deviceId,
    phase: entry.phase,
    start_date: entry.startDate,
    end_date: entry.endDate,
    planned_days: entry.plannedDays,
    actual_days: entry.actualDays,
    start_weight_kg: entry.startWeightKg,
    end_weight_kg: entry.endWeightKg,
    avg_calories: entry.avgCalories,
    target_weight_kg: entry.targetWeightKg,
    macro_targets: entry.macroTargets,
  }
}

function fromRow(row: PhaseHistoryRow): PhaseHistoryEntry {
  const num = (v: number | string | null) => (v == null ? null : Number(v))
  return {
    id: row.id,
    phase: isPhase(row.phase) ? row.phase : 'bulk',
    startDate: row.start_date,
    endDate: row.end_date,
    plannedDays: Number(row.planned_days),
    actualDays: Number(row.actual_days),
    startWeightKg: num(row.start_weight_kg),
    endWeightKg: num(row.end_weight_kg),
    avgCalories: num(row.avg_calories),
    targetWeightKg: num(row.target_weight_kg),
    macroTargets: row.macro_targets,
  }
}

export function sortHistory(entries: PhaseHistoryEntry[]) {
  return [...entries].sort((a, b) => a.startDate.localeCompare(b.startDate))
}

/** Returns null when Supabase or the phases_history table is unavailable. */
export async function pullPhaseHistory(): Promise<PhaseHistoryEntry[] | null> {
  if (!isSupabaseConfigured || !supabase) return null
  const { data, error } = await supabase
    .from('phases_history')
    .select('*')
    .eq('device_id', getDeviceId())
  if (error || !data) return null
  return (data as PhaseHistoryRow[]).map(fromRow)
}

export async function pushPhaseHistory(
  entries: PhaseHistoryEntry[],
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || entries.length === 0) return false
  const deviceId = getDeviceId()
  const { error } = await supabase
    .from('phases_history')
    .upsert(
      entries.map((e) => toRow(e, deviceId)),
      { onConflict: 'id' },
    )
  return !error
}

export async function deleteRemotePhaseHistory(id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false
  const { error } = await supabase
    .from('phases_history')
    .delete()
    .eq('id', id)
    .eq('device_id', getDeviceId())
  return !error
}
