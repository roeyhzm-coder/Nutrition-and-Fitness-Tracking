import type { Exercise } from './types'
import { parseDefaultReps, parseKg } from './exerciseDefaults'

export type ExerciseForm = {
  name: string
  sets: string
  reps: string
  rest: string
  weight: string
  defaultWeightKg: string
  defaultReps: string
  notes: string
  mediaUrl: string
  imageUrl: string
}

export const EMPTY_EXERCISE_FORM: ExerciseForm = {
  name: '',
  sets: '3',
  reps: '8–10',
  rest: '',
  weight: '',
  defaultWeightKg: '',
  defaultReps: '',
  notes: '',
  mediaUrl: '',
  imageUrl: '',
}

function displayOptionalNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return ''
  return String(value)
}

export function exerciseToForm(ex: Exercise): ExerciseForm {
  const weightKg =
    ex.defaultWeightKg != null && Number.isFinite(ex.defaultWeightKg)
      ? ex.defaultWeightKg
      : parseKg(ex.weight)
  const reps =
    ex.defaultReps != null && Number.isFinite(ex.defaultReps)
      ? ex.defaultReps
      : parseDefaultReps(ex.reps)

  return {
    name: ex.name,
    sets: String(ex.sets),
    reps: ex.reps,
    rest: ex.rest ?? '',
    weight: ex.weight ?? '',
    defaultWeightKg: displayOptionalNumber(weightKg),
    defaultReps: displayOptionalNumber(reps),
    notes: ex.notes ?? '',
    mediaUrl: ex.mediaUrl ?? '',
    imageUrl: ex.imageUrl ?? '',
  }
}

export function formToExercise(form: ExerciseForm): Omit<Exercise, 'id'> {
  const defaultWeightKg = form.defaultWeightKg.trim()
    ? Number(form.defaultWeightKg)
    : parseKg(form.weight)
  const defaultReps = form.defaultReps.trim()
    ? Number(form.defaultReps)
    : parseDefaultReps(form.reps)

  return {
    name: form.name.trim(),
    sets: Math.max(1, Number(form.sets) || 1),
    reps: form.reps.trim() || '8–10',
    rest: form.rest.trim() || undefined,
    weight: form.weight.trim() || undefined,
    defaultWeightKg:
      defaultWeightKg != null && Number.isFinite(defaultWeightKg)
        ? defaultWeightKg
        : null,
    defaultReps:
      defaultReps != null && Number.isFinite(defaultReps) ? defaultReps : null,
    notes: form.notes.trim() || undefined,
    mediaUrl: form.mediaUrl.trim() || undefined,
    imageUrl: form.imageUrl.trim() || undefined,
  }
}
