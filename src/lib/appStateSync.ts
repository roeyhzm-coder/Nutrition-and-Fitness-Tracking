import { supabase, isSupabaseConfigured } from './supabase'
import type {
  ActivityLog,
  FoodCategory,
  FoodLogEntry,
  GoalSettings,
  LifestyleLogs,
  Phase,
  PhaseMacroPresets,
  SavedMeal,
  UserProfile,
  WorkoutProgram,
  WorkoutTemplate,
} from './types'
import { normalizeGoal, normalizeProfile } from './types'
import type { ConsistencyDayMarks } from './weeklyConsistency'

const DEVICE_KEY = 'tn.deviceId'

export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

export type SyncedAppState = {
  phase: Phase
  goal: GoalSettings
  macroPresets: PhaseMacroPresets
  activeProgramId: string
  workoutPrograms: WorkoutProgram[]
  workoutTemplates: WorkoutTemplate[]
  consistencyDayMarks: ConsistencyDayMarks
  foodCategories: FoodCategory[]
  /** Undefined when the remote table lacks the extended columns. */
  savedMeals?: SavedMeal[]
  foodLogs?: FoodLogEntry[]
  profile?: UserProfile
  activityLogs?: ActivityLog[]
  lifestyleLogs?: LifestyleLogs
  updatedAt: string
}

const BASE_COLUMNS =
  'phase, goal, macro_presets, active_program_id, workout_programs, updated_at'
const TEMPLATE_COLUMNS = `${BASE_COLUMNS}, workout_templates`
const FULL_COLUMNS = `${TEMPLATE_COLUMNS}, consistency_day_marks, food_categories`
const EXTENDED_COLUMNS = `${FULL_COLUMNS}, saved_meals, user_profile, activity_logs, lifestyle_logs`
const FOOD_LOG_COLUMNS = `${EXTENDED_COLUMNS}, food_logs`

export async function pullAppState(): Promise<SyncedAppState | null> {
  if (!isSupabaseConfigured || !supabase) return null

  const deviceId = getDeviceId()
  let data: Record<string, unknown> | null = null
  let hasExtended = false
  let hasFoodLogs = false

  for (const columns of [
    FOOD_LOG_COLUMNS,
    EXTENDED_COLUMNS,
    FULL_COLUMNS,
    TEMPLATE_COLUMNS,
    BASE_COLUMNS,
  ]) {
    const res = await supabase
      .from('client_app_state')
      .select(columns)
      .eq('device_id', deviceId)
      .maybeSingle()
    if (res.error) continue
    if (!res.data) return null
    data = res.data as unknown as Record<string, unknown>
    hasFoodLogs = columns === FOOD_LOG_COLUMNS
    hasExtended = hasFoodLogs || columns === EXTENDED_COLUMNS
    break
  }

  if (!data) return null

  return {
    phase: data.phase as Phase,
    goal: normalizeGoal(data.goal as GoalSettings),
    macroPresets: data.macro_presets as PhaseMacroPresets,
    activeProgramId: data.active_program_id as string,
    workoutPrograms: data.workout_programs as WorkoutProgram[],
    workoutTemplates: (data.workout_templates as WorkoutTemplate[]) ?? [],
    consistencyDayMarks:
      (data.consistency_day_marks as ConsistencyDayMarks) ?? {},
    foodCategories: (data.food_categories as FoodCategory[]) ?? [],
    ...(hasExtended
      ? {
          savedMeals: (data.saved_meals as SavedMeal[] | null) ?? undefined,
          profile: data.user_profile
            ? normalizeProfile(data.user_profile as Partial<UserProfile>)
            : undefined,
          activityLogs:
            (data.activity_logs as ActivityLog[] | null) ?? undefined,
          lifestyleLogs:
            (data.lifestyle_logs as LifestyleLogs | null) ?? undefined,
        }
      : {}),
    ...(hasFoodLogs
      ? { foodLogs: (data.food_logs as FoodLogEntry[] | null) ?? undefined }
      : {}),
    updatedAt: data.updated_at as string,
  }
}

export async function pushAppState(
  state: Omit<SyncedAppState, 'updatedAt'>,
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false

  const deviceId = getDeviceId()
  const updatedAt = new Date().toISOString()

  const basePayload = {
    device_id: deviceId,
    phase: state.phase,
    goal: state.goal,
    macro_presets: state.macroPresets,
    active_program_id: state.activeProgramId,
    workout_programs: state.workoutPrograms,
    workout_templates: state.workoutTemplates,
    updated_at: updatedAt,
  }
  const fullPayload = {
    ...basePayload,
    consistency_day_marks: state.consistencyDayMarks,
    food_categories: state.foodCategories,
  }
  const extendedPayload = {
    ...fullPayload,
    saved_meals: state.savedMeals ?? [],
    user_profile: state.profile ?? null,
    activity_logs: state.activityLogs ?? [],
    lifestyle_logs: state.lifestyleLogs ?? {},
  }
  const foodLogPayload = {
    ...extendedPayload,
    food_logs: state.foodLogs ?? [],
  }

  // Fall back progressively if newer columns are missing
  for (const payload of [
    foodLogPayload,
    extendedPayload,
    fullPayload,
    basePayload,
  ]) {
    const { error } = await supabase
      .from('client_app_state')
      .upsert(payload, { onConflict: 'device_id' })
    if (!error) return true
  }
  return false
}
