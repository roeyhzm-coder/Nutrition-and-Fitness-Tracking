import { supabase, isSupabaseConfigured } from './supabase'
import type {
  GoalSettings,
  Phase,
  PhaseMacroPresets,
  WorkoutProgram,
} from './types'

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
  updatedAt: string
}

export async function pullAppState(): Promise<SyncedAppState | null> {
  if (!isSupabaseConfigured || !supabase) return null

  const deviceId = getDeviceId()
  const { data, error } = await supabase
    .from('client_app_state')
    .select(
      'phase, goal, macro_presets, active_program_id, workout_programs, updated_at',
    )
    .eq('device_id', deviceId)
    .maybeSingle()

  if (error || !data) return null

  return {
    phase: data.phase as Phase,
    goal: data.goal as GoalSettings,
    macroPresets: data.macro_presets as PhaseMacroPresets,
    activeProgramId: data.active_program_id as string,
    workoutPrograms: data.workout_programs as WorkoutProgram[],
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
      updated_at: updatedAt,
    },
    { onConflict: 'device_id' },
  )

  return !error
}
