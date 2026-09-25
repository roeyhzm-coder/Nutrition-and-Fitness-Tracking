import type { Exercise } from './types'

export type ExerciseForm = {
  name: string
  sets: string
  reps: string
  rest: string
  weight: string
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
  notes: '',
  mediaUrl: '',
  imageUrl: '',
}

export function exerciseToForm(ex: Exercise): ExerciseForm {
  return {
    name: ex.name,
    sets: String(ex.sets),
    reps: ex.reps,
    rest: ex.rest ?? '',
    weight: ex.weight ?? '',
    notes: ex.notes ?? '',
    mediaUrl: ex.mediaUrl ?? '',
    imageUrl: ex.imageUrl ?? '',
  }
}

export function formToExercise(form: ExerciseForm): Omit<Exercise, 'id'> {
  return {
    name: form.name.trim(),
    sets: Math.max(1, Number(form.sets) || 1),
    reps: form.reps.trim() || '8–10',
    rest: form.rest.trim() || undefined,
    weight: form.weight.trim() || undefined,
    notes: form.notes.trim() || undefined,
    mediaUrl: form.mediaUrl.trim() || undefined,
    imageUrl: form.imageUrl.trim() || undefined,
  }
}
