import { supabase, isSupabaseConfigured } from './supabase'
import type {
  GoalSettings,
  Phase,
  PhaseMacroPresets,
  WorkoutProgram,
  WorkoutTemplate,
} from './types'
import { normalizeGoal } from './types'

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
  updatedAt: string
}

export async function pullAppState(): Promise<SyncedAppState | null> {
  if (!isSupabaseConfigured || !supabase) return null

  const deviceId = getDeviceId()
  let data: Record<string, unknown> | null = null

  const full = await supabase
    .from('client_app_state')
    .select(
      'phase, goal, macro_presets, active_program_id, workout_programs, workout_templates, updated_at',
    )
    .eq('device_id', deviceId)
    .maybeSingle()

  if (full.error) {
    const basic = await supabase
      .from('client_app_state')
      .select(
        'phase, goal, macro_presets, active_program_id, workout_programs, updated_at',
      )
      .eq('device_id', deviceId)
      .maybeSingle()
    if (basic.error || !basic.data) return null
    data = basic.data as Record<string, unknown>
  } else {
    if (!full.data) return null
    data = full.data as Record<string, unknown>
  }

  return {
    phase: data.phase as Phase,
    goal: normalizeGoal(data.goal as GoalSettings),
    macroPresets: data.macro_presets as PhaseMacroPresets,
    activeProgramId: data.active_program_id as string,
    workoutPrograms: data.workout_programs as WorkoutProgram[],
    workoutTemplates: (data.workout_templates as WorkoutTemplate[]) ?? [],
    updatedAt: data.updated_at as string,
  }
}

export async function pushAppState(
  state: Omit<SyncedAppState, 'updatedAt'>,
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false

  const deviceId = getDeviceId()
  const updatedAt = new Date().toISOString()

  const { error } = await supabase.from('client_app_state').upsert(
    {
      device_id: deviceId,
      phase: state.phase,
      goal: state.goal,
      macro_presets: state.macroPresets,
      active_program_id: state.activeProgramId,
      workout_programs: state.workoutPrograms,
      workout_templates: state.workoutTemplates,
      updated_at: updatedAt,
    },
    { onConflict: 'device_id' },
  )

  return !error
}
