import { supabase, isSupabaseConfigured } from './supabase'
import type {
  ActivityLog,
  FoodCategory,
  FoodLogEntry,
  GoalSettings,
  LifestyleLogs,
  Phase,
  PhaseMacroPresets,
  FocusTrack,
  Routine,
  Recipe,
  SavedMeal,
  UserProfile,
  WeightEntry,
  WorkoutProgram,
  WorkoutTemplate,
} from './types'
import { isPhase, normalizeGoal, normalizeProfile } from './types'
import { normalizeMacroPresets } from '../data/defaults'
import type { ConsistencyDayMarks } from './weeklyConsistency'

const DEVICE_KEY = 'tn.deviceId'

/** All devices read and write this same owner row. */
export const SHARED_OWNER_ID = 'primary'
export const NUTRITION_CLOUD_ACK_KEY = 'tn.nutritionCloudAck.v1'

export function markNutritionCloudAck() {
  localStorage.setItem(NUTRITION_CLOUD_ACK_KEY, '1')
}

/** Keep unsynced local rows instead of adopting an empty cloud list. */
export function shouldKeepLocalList<T>(
  local: T[],
  remote: T[] | undefined,
  dirty: boolean,
): boolean {
  if (remote === undefined) return true
  if (dirty) return true
  if (remote.length === 0 && local.length > 0) {
    return localStorage.getItem(NUTRITION_CLOUD_ACK_KEY) !== '1'
  }
  return false
}

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
  /** Undefined when the remote table lacks the workout_templates column. */
  workoutTemplates?: WorkoutTemplate[]
  consistencyDayMarks: ConsistencyDayMarks
  foodCategories: FoodCategory[]
  /** Undefined when the remote table lacks the extended columns. */
  savedMeals?: SavedMeal[]
  recipes?: Recipe[]
  foodLogs?: FoodLogEntry[]
  profile?: UserProfile
  activityLogs?: ActivityLog[]
  lifestyleLogs?: LifestyleLogs
  weightLogs?: WeightEntry[]
  /** Undefined when the remote table lacks the routines column. */
  routines?: Routine[]
  /** Undefined when the remote table lacks the focus_tracks column. */
  focusTracks?: FocusTrack[]
  updatedAt: string
}

const BASE_COLUMNS =
  'phase, goal, macro_presets, active_program_id, workout_programs, updated_at'
const TEMPLATE_COLUMNS = `${BASE_COLUMNS}, workout_templates`
const FULL_COLUMNS = `${TEMPLATE_COLUMNS}, consistency_day_marks, food_categories`
const EXTENDED_COLUMNS = `${FULL_COLUMNS}, saved_meals, user_profile, activity_logs, lifestyle_logs`
const FOOD_LOG_COLUMNS = `${EXTENDED_COLUMNS}, food_logs`
const ROUTINES_COLUMNS = `${FOOD_LOG_COLUMNS}, routines`
const FOCUS_TRACKS_COLUMNS = `${ROUTINES_COLUMNS}, focus_tracks`
const WEIGHT_COLUMNS = `${FOCUS_TRACKS_COLUMNS}, weight_logs`
const RECIPES_COLUMNS = `${WEIGHT_COLUMNS}, recipes`
const APP_STATE_COLUMNS = `${RECIPES_COLUMNS}, owner_id`

type ColumnSet = {
  columns: string
  hasTemplates: boolean
  hasExtended: boolean
  hasFoodLogs: boolean
  hasRoutines: boolean
  hasFocusTracks: boolean
  hasWeightLogs: boolean
  hasRecipes: boolean
}

const COLUMN_SETS: ColumnSet[] = [
  {
    columns: APP_STATE_COLUMNS,
    hasTemplates: true,
    hasExtended: true,
    hasFoodLogs: true,
    hasRoutines: true,
    hasFocusTracks: true,
    hasWeightLogs: true,
    hasRecipes: true,
  },
  {
    columns: RECIPES_COLUMNS,
    hasTemplates: true,
    hasExtended: true,
    hasFoodLogs: true,
    hasRoutines: true,
    hasFocusTracks: true,
    hasWeightLogs: true,
    hasRecipes: true,
  },
  {
    columns: WEIGHT_COLUMNS,
    hasTemplates: true,
    hasExtended: true,
    hasFoodLogs: true,
    hasRoutines: true,
    hasFocusTracks: true,
    hasWeightLogs: true,
    hasRecipes: false,
  },
  {
    columns: FOCUS_TRACKS_COLUMNS,
    hasTemplates: true,
    hasExtended: true,
    hasFoodLogs: true,
    hasRoutines: true,
    hasFocusTracks: true,
    hasWeightLogs: false,
    hasRecipes: false,
  },
  {
    columns: ROUTINES_COLUMNS,
    hasTemplates: true,
    hasExtended: true,
    hasFoodLogs: true,
    hasRoutines: true,
    hasFocusTracks: false,
    hasWeightLogs: false,
    hasRecipes: false,
  },
  {
    columns: FOOD_LOG_COLUMNS,
    hasTemplates: true,
    hasExtended: true,
    hasFoodLogs: true,
    hasRoutines: false,
    hasFocusTracks: false,
    hasWeightLogs: false,
    hasRecipes: false,
  },
  {
    columns: EXTENDED_COLUMNS,
    hasTemplates: true,
    hasExtended: true,
    hasFoodLogs: false,
    hasRoutines: false,
    hasFocusTracks: false,
    hasWeightLogs: false,
    hasRecipes: false,
  },
  {
    columns: FULL_COLUMNS,
    hasTemplates: true,
    hasExtended: false,
    hasFoodLogs: false,
    hasRoutines: false,
    hasFocusTracks: false,
    hasWeightLogs: false,
    hasRecipes: false,
  },
  {
    columns: TEMPLATE_COLUMNS,
    hasTemplates: true,
    hasExtended: false,
    hasFoodLogs: false,
    hasRoutines: false,
    hasFocusTracks: false,
    hasWeightLogs: false,
    hasRecipes: false,
  },
  {
    columns: BASE_COLUMNS,
    hasTemplates: false,
    hasExtended: false,
    hasFoodLogs: false,
    hasRoutines: false,
    hasFocusTracks: false,
    hasWeightLogs: false,
    hasRecipes: false,
  },
]

function parseRow(
  data: Record<string, unknown>,
  flags: Omit<ColumnSet, 'columns'>,
): SyncedAppState {
  const rawGoal = (data.goal ?? {}) as Partial<GoalSettings> & {
    activePhase?: unknown
  }
  const phase: Phase = isPhase(rawGoal.activePhase)
    ? rawGoal.activePhase
    : isPhase(data.phase)
      ? data.phase
      : 'maintain'

  return {
    phase,
    goal: normalizeGoal(rawGoal),
    macroPresets: normalizeMacroPresets(
      data.macro_presets as Partial<PhaseMacroPresets> | null,
    ),
    activeProgramId: (data.active_program_id as string) ?? '',
    workoutPrograms: (data.workout_programs as WorkoutProgram[]) ?? [],
    workoutTemplates: flags.hasTemplates
      ? ((data.workout_templates as WorkoutTemplate[] | null) ?? [])
      : undefined,
    consistencyDayMarks:
      (data.consistency_day_marks as ConsistencyDayMarks) ?? {},
    foodCategories: (data.food_categories as FoodCategory[]) ?? [],
    ...(flags.hasExtended
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
    ...(flags.hasFoodLogs
      ? { foodLogs: (data.food_logs as FoodLogEntry[] | null) ?? undefined }
      : {}),
    ...(flags.hasWeightLogs
      ? { weightLogs: (data.weight_logs as WeightEntry[] | null) ?? undefined }
      : {}),
    ...(flags.hasRoutines
      ? { routines: (data.routines as Routine[] | null) ?? undefined }
      : {}),
    ...(flags.hasFocusTracks
      ? { focusTracks: (data.focus_tracks as FocusTrack[] | null) ?? undefined }
      : {}),
    ...(flags.hasRecipes
      ? { recipes: (data.recipes as Recipe[] | null) ?? undefined }
      : {}),
    updatedAt: (data.updated_at as string) ?? new Date().toISOString(),
  }
}

async function selectRow(
  table: 'app_state' | 'client_app_state' | 'user_profile',
  columns: string,
  filter: { column: string; value: string } | 'latest',
): Promise<Record<string, unknown> | null> {
  if (!supabase) return null
  let query = supabase
    .from(table)
    .select(columns)
    .order('updated_at', { ascending: false })
    .limit(1)
  if (filter !== 'latest') {
    query = query.eq(filter.column, filter.value)
  }
  const { data, error } = await query.maybeSingle()
  if (error) {
    console.error('[appStateSync] select failed', {
      table,
      columns,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    return null
  }
  if (!data) return null
  return data as unknown as Record<string, unknown>
}

async function pullFromTable(
  table: 'app_state' | 'client_app_state',
): Promise<SyncedAppState | null> {
  const filters: Array<{ column: string; value: string } | 'latest'> = [
    { column: 'owner_id', value: SHARED_OWNER_ID },
    { column: 'device_id', value: SHARED_OWNER_ID },
    'latest',
  ]
  if (table === 'app_state') {
    filters.splice(1, 1)
  }

  for (const filter of filters) {
    for (const set of COLUMN_SETS) {
      const data = await selectRow(table, set.columns, filter)
      if (!data) continue
      return parseRow(data, set)
    }
  }
  return null
}

async function pullFromUserProfile(): Promise<SyncedAppState | null> {
  const data = await selectRow(
    'user_profile',
    'owner_id, profile, phase, goal, macro_presets, updated_at',
    { column: 'owner_id', value: SHARED_OWNER_ID },
  )
  if (!data) return null
  const rawGoal = (data.goal ?? {}) as Partial<GoalSettings> & {
    activePhase?: unknown
  }
  const phase: Phase = isPhase(rawGoal.activePhase)
    ? rawGoal.activePhase
    : isPhase(data.phase)
      ? data.phase
      : 'maintain'
  return {
    phase,
    goal: normalizeGoal(rawGoal),
    macroPresets: normalizeMacroPresets(
      data.macro_presets as Partial<PhaseMacroPresets> | null,
    ),
    activeProgramId: '',
    workoutPrograms: [],
    consistencyDayMarks: {},
    foodCategories: [],
    profile: data.profile
      ? normalizeProfile(data.profile as Partial<UserProfile>)
      : undefined,
    updatedAt: (data.updated_at as string) ?? new Date().toISOString(),
  }
}

export async function pullAppState(): Promise<SyncedAppState | null> {
  if (!isSupabaseConfigured || !supabase) return null

  const fromApp = await pullFromTable('app_state')
  if (fromApp) return fromApp

  const fromClient = await pullFromTable('client_app_state')
  if (fromClient) return fromClient

  return pullFromUserProfile()
}

function nutritionSnapshot(state: Omit<SyncedAppState, 'updatedAt'>) {
  return {
    saved_meals: state.savedMeals ?? [],
    food_logs: state.foodLogs ?? [],
    recipes: state.recipes ?? [],
  }
}

function buildNutritionPayloads(
  state: Omit<SyncedAppState, 'updatedAt'>,
  updatedAt: string,
) {
  const goal = { ...state.goal, activePhase: state.phase }
  const nutrition = nutritionSnapshot(state)
  const full = {
    owner_id: SHARED_OWNER_ID,
    phase: state.phase as string,
    goal,
    macro_presets: state.macroPresets,
    active_program_id: state.activeProgramId,
    workout_programs: state.workoutPrograms,
    workout_templates: state.workoutTemplates ?? [],
    consistency_day_marks: state.consistencyDayMarks,
    food_categories: state.foodCategories,
    user_profile: state.profile ?? null,
    activity_logs: state.activityLogs ?? [],
    lifestyle_logs: state.lifestyleLogs ?? {},
    routines: state.routines ?? [],
    focus_tracks: state.focusTracks ?? [],
    weight_logs: state.weightLogs ?? [],
    updated_at: updatedAt,
    ...nutrition,
  }
  const withoutRecipes = { ...full }
  delete (withoutRecipes as { recipes?: unknown }).recipes
  return [full, withoutRecipes]
}

function logUpsertError(
  table: string,
  error: { message: string; details?: string; hint?: string; code?: string },
  payload: Record<string, unknown>,
) {
  console.error('[appStateSync] nutrition upsert failed', {
    table,
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
    foodLogs: Array.isArray(payload.food_logs)
      ? payload.food_logs.length
      : 'missing',
    savedMeals: Array.isArray(payload.saved_meals)
      ? payload.saved_meals.length
      : 'missing',
    recipes: Array.isArray(payload.recipes) ? payload.recipes.length : 'missing',
  })
}

async function upsertRow(
  table: 'app_state' | 'client_app_state',
  payload: Record<string, unknown>,
  onConflict: string,
): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from(table).upsert(payload, { onConflict })
  if (error) {
    logUpsertError(table, error, payload)
    return false
  }
  return true
}

export async function pushAppState(
  state: Omit<SyncedAppState, 'updatedAt'>,
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false

  const updatedAt = new Date().toISOString()
  const payloads = buildNutritionPayloads(state, updatedAt)
  let wroteNutrition = false

  for (const payload of payloads) {
    const ok = await upsertRow('app_state', payload, 'owner_id')
    if (ok) {
      wroteNutrition = true
      break
    }
  }

  for (const payload of payloads) {
    const ok = await upsertRow(
      'client_app_state',
      { ...payload, device_id: SHARED_OWNER_ID },
      'device_id',
    )
    if (ok) {
      wroteNutrition = true
      break
    }
  }

  const { error: profileError } = await supabase
    .from('user_profile')
    .upsert(
      {
        owner_id: SHARED_OWNER_ID,
        profile: state.profile ?? {},
        phase: state.phase,
        goal: { ...state.goal, activePhase: state.phase },
        macro_presets: state.macroPresets,
        updated_at: updatedAt,
      },
      { onConflict: 'owner_id' },
    )
  if (profileError) {
    console.error('[appStateSync] user_profile upsert failed', profileError)
  }

  if (!wroteNutrition) {
    console.error(
      '[appStateSync] food_logs/saved_meals/recipes were not written to Supabase',
      {
        foodLogs: state.foodLogs?.length ?? 0,
        savedMeals: state.savedMeals?.length ?? 0,
        recipes: state.recipes?.length ?? 0,
      },
    )
    return false
  }

  markNutritionCloudAck()
  return true
}

export function subscribeSharedSync(
  onChange: () => void,
  channelName = 'shared-cloud-sync',
): () => void {
  if (!isSupabaseConfigured || !supabase) return () => {}

  let timer: number | undefined
  const fire = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(onChange, 200)
  }

  const channel = supabase
    .channel(`${channelName}-${SHARED_OWNER_ID}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_state' },
      fire,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'client_app_state' },
      fire,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_profile' },
      fire,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'workout_logs' },
      fire,
    )
    .subscribe()

  return () => {
    window.clearTimeout(timer)
    void supabase!.removeChannel(channel)
  }
}

export function onWindowResume(onResume: () => void): () => void {
  const handleFocus = () => onResume()
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') onResume()
  }
  const handleOnline = () => onResume()
  const handlePageShow = (event: PageTransitionEvent) => {
    if (event.persisted) onResume()
    else onResume()
  }
  window.addEventListener('focus', handleFocus)
  document.addEventListener('visibilitychange', handleVisibility)
  window.addEventListener('online', handleOnline)
  window.addEventListener('pageshow', handlePageShow)
  return () => {
    window.removeEventListener('focus', handleFocus)
    document.removeEventListener('visibilitychange', handleVisibility)
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('pageshow', handlePageShow)
  }
}
