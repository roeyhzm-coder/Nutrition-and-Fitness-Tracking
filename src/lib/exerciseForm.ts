import type { Exercise, ExerciseDefaultSet } from './types'
import {
  defaultsFromExercise,
  parseDefaultReps,
  parseKg,
  parseOptionalNumber,
} from './exerciseDefaults'

export type ExerciseFormDefaultSet = {
  weightKg: string
  reps: string
}

export type ExerciseForm = {
  name: string
  sets: string
  reps: string
  rest: string
  weight: string
  defaultSets: ExerciseFormDefaultSet[]
  notes: string
  mediaUrl: string
  imageUrl: string
}

function emptyDefaultSetRow(): ExerciseFormDefaultSet {
  return { weightKg: '', reps: '' }
}

export function resizeFormDefaultSets(
  rows: ExerciseFormDefaultSet[],
  count: number,
): ExerciseFormDefaultSet[] {
  const n = Math.max(1, count)
  if (rows.length >= n) return rows.slice(0, n)
  const last = rows[rows.length - 1] ?? emptyDefaultSetRow()
  return [
    ...rows,
    ...Array.from({ length: n - rows.length }, () => ({ ...last })),
  ]
}

export const EMPTY_EXERCISE_FORM: ExerciseForm = {
  name: '',
  sets: '3',
  reps: '8–10',
  rest: '',
  weight: '',
  defaultSets: [emptyDefaultSetRow(), emptyDefaultSetRow(), emptyDefaultSetRow()],
  notes: '',
  mediaUrl: '',
  imageUrl: '',
}

function displayOptionalNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return ''
  return String(value)
}

export function exerciseToForm(ex: Exercise): ExerciseForm {
  const defaults = defaultsFromExercise(ex)
  return {
    name: ex.name,
    sets: String(defaults.sets),
    reps: ex.reps,
    rest: ex.rest ?? '',
    weight: ex.weight ?? '',
    defaultSets: defaults.defaultSets.map((row) => ({
      weightKg: displayOptionalNumber(row.weightKg),
      reps: displayOptionalNumber(row.reps),
    })),
    notes: ex.notes ?? '',
    mediaUrl: ex.mediaUrl ?? '',
    imageUrl: ex.imageUrl ?? '',
  }
}

function formDefaultSets(form: ExerciseForm): ExerciseDefaultSet[] {
  const count = Math.max(1, Number(form.sets) || form.defaultSets.length || 1)
  const rows = resizeFormDefaultSets(form.defaultSets, count)
  const fallbackWeight = parseKg(form.weight)
  const fallbackReps = parseDefaultReps(form.reps)
  return rows.map((row, i) => ({
    setNumber: i + 1,
    weightKg: parseOptionalNumber(row.weightKg) ?? fallbackWeight,
    reps: parseOptionalNumber(row.reps) ?? fallbackReps,
  }))
}

export function formToExercise(form: ExerciseForm): Omit<Exercise, 'id'> {
  const defaultSets = formDefaultSets(form)
  const first = defaultSets[0]
  return {
    name: form.name.trim(),
    sets: Math.max(1, Number(form.sets) || defaultSets.length || 1),
    reps: form.reps.trim() || '8–10',
    rest: form.rest.trim() || undefined,
    weight: form.weight.trim() || undefined,
    defaultWeightKg: first?.weightKg ?? null,
    defaultReps: first?.reps ?? null,
    defaultSets,
    default_sets: defaultSets,
    notes: form.notes.trim() || undefined,
    mediaUrl: form.mediaUrl.trim() || undefined,
    imageUrl: form.imageUrl.trim() || undefined,
  }
}
