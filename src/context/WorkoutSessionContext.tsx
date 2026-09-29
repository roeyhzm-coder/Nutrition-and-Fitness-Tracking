import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import type {
  ActiveWorkout,
  LoggedExercise,
  LoggedSet,
  WorkoutDay,
  WorkoutLog,
} from '../lib/types'
import { dayAllExercises, localDateKey, uid } from '../lib/types'
import { useAppData } from './AppDataContext'

type WorkoutSessionValue = {
  activeWorkout: ActiveWorkout | null
  trackerOpen: boolean
  openTracker: () => void
  minimizeTracker: () => void
  /** Starts a workout for the day, or reopens the one already in progress. */
  startWorkout: (day: WorkoutDay) => void
  updateSet: (exIndex: number, setIndex: number, patch: Partial<LoggedSet>) => void
  setExerciseDone: (exIndex: number, done: boolean) => void
  addSet: (exIndex: number) => void
  /** Removes a set; always keeps at least one set. */
  removeSet: (exIndex: number, setIndex: number) => void
  /** Refills weight/reps from the last time this exercise was logged. */
  loadPreviousSets: (exIndex: number) => boolean
  finishWorkout: () => WorkoutLog | null
  cancelWorkout: () => void
  workoutLogs: WorkoutLog[]
  deleteWorkoutLog: (id: string) => void
  /** Most recent completed sets for an exercise (by id or name), across any workout. */
  lastPerformance: (exerciseName: string, exerciseId?: string) => LoggedSet[] | null
}

const WorkoutSessionContext = createContext<WorkoutSessionValue | null>(null)

/** Pulls the first numeric kg value from free-text weight (e.g. `10 ק"ג`, `25`). */
function parseKg(text?: string): number | null {
  if (!text?.trim()) return null
  const match = text.match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}

/** Pulls a default rep count from free-text (e.g. `8-12` → 8, `6` → 6). */
function parseDefaultReps(text?: string): number | null {
  if (!text?.trim()) return null
  const match = text.match(/(\d+)/)
  return match ? Number(match[1]) : null
}

function matchesExercise(
  logged: { exerciseId: string; name: string },
  exerciseName: string,
  exerciseId?: string,
) {
  if (exerciseId && logged.exerciseId === exerciseId) return true
  return logged.name === exerciseName
}

/** Completing a set fills blanks from the previous set's weight and a numeric rep target. */
function completeSet(ex: LoggedExercise, index: number, sets = ex.sets): LoggedSet {
  const set = sets[index]
  const targetReps = parseDefaultReps(ex.targetReps)
  return {
    ...set,
    done: true,
    weightKg: set.weightKg ?? sets[index - 1]?.weightKg ?? null,
    reps: set.reps ?? targetReps,
  }
}

function buildSetsFromHistory(
  setCount: number,
  last: LoggedSet[] | null,
  defaultWeightKg: number | null,
  defaultReps: number | null,
): LoggedSet[] {
  return Array.from({ length: Math.max(1, setCount) }, (_, i) => {
    const prev = last?.[i] ?? last?.at(-1)
    return {
      weightKg: prev?.weightKg ?? defaultWeightKg,
      reps: prev?.reps ?? defaultReps,
      done: false,
    }
  })
}

function updateExercise(
  workout: ActiveWorkout,
  exIndex: number,
  fn: (ex: LoggedExercise) => LoggedExercise,
): ActiveWorkout {
  return {
    ...workout,
    exercises: workout.exercises.map((ex, i) => (i === exIndex ? fn(ex) : ex)),
  }
}

function workoutLabel(day: WorkoutDay) {
  return day.sessions.map((s) => s.name).join(' + ') || day.focus || day.title
}

function doneSetsFrom(sets: LoggedSet[] | undefined): LoggedSet[] | null {
  const done = sets?.filter((s) => s.done)
  return done?.length ? done : null
}

/** Latest done sets for an exercise across all workout logs (by completedAt). */
function findLastExercisePerformance(
  logs: WorkoutLog[],
  exerciseName: string,
  exerciseId?: string,
): LoggedSet[] | null {
  let best: { at: string; sets: LoggedSet[] } | null = null
  for (const log of logs) {
    const ex = log.exercises.find((e) =>
      matchesExercise(e, exerciseName, exerciseId),
    )
    const done = doneSetsFrom(ex?.sets)
    if (!done) continue
    if (!best || log.completedAt >= best.at) {
      best = { at: log.completedAt, sets: done }
    }
  }
  return best?.sets ?? null
}

export function WorkoutSessionProvider({ children }: { children: ReactNode }) {
  const { activeProgram, addSetLog, setConsistencyDayMark } = useAppData()
  const [activeWorkout, setActiveWorkout] = useLocalStorage<ActiveWorkout | null>(
    'tn.activeWorkout.v1',
    null,
  )
  const [workoutLogs, setWorkoutLogs] = useLocalStorage<WorkoutLog[]>(
    'tn.workoutLogs.v1',
    [],
  )
  const [trackerOpen, setTrackerOpen] = useState(false)

  const lastPerformance = useCallback(
    (exerciseName: string, exerciseId?: string) =>
      findLastExercisePerformance(workoutLogs, exerciseName, exerciseId),
    [workoutLogs],
  )

  const startWorkout = useCallback(
    (day: WorkoutDay) => {
      setTrackerOpen(true)
      if (activeWorkout) return
      const exercises = dayAllExercises(day)
      if (!exercises.length || !activeProgram) return
      const name = workoutLabel(day)

      setActiveWorkout({
        id: uid(),
        programId: activeProgram.id,
        programName: activeProgram.name,
        dayId: day.id,
        dayNumber: day.dayNumber,
        workoutName: name,
        startedAt: new Date().toISOString(),
        exercises: exercises.map((ex) => {
          // Exercise-level history: last time THIS exercise was performed, any workout type.
          const last = findLastExercisePerformance(workoutLogs, ex.name, ex.id)
          const defaultWeightKg = parseKg(ex.weight)
          const defaultReps = parseDefaultReps(ex.reps)
          return {
            exerciseId: ex.id,
            name: ex.name,
            targetSets: ex.sets,
            targetReps: ex.reps,
            targetWeight: ex.weight,
            rest: ex.rest,
            imageUrl: ex.imageUrl,
            sets: buildSetsFromHistory(
              ex.sets,
              last,
              defaultWeightKg,
              defaultReps,
            ),
          }
        }),
      })
    },
    [activeWorkout, activeProgram, setActiveWorkout, workoutLogs],
  )

  const updateSet = useCallback(
    (exIndex: number, setIndex: number, patch: Partial<LoggedSet>) => {
      setActiveWorkout((prev) =>
        prev
          ? updateExercise(prev, exIndex, (ex) => {
              const sets = ex.sets.map((s, i) => (i === setIndex ? { ...s, ...patch } : s))
              if (patch.done) sets[setIndex] = completeSet(ex, setIndex, sets)
              return { ...ex, sets }
            })
          : prev,
      )
    },
    [setActiveWorkout],
  )

  const setExerciseDone = useCallback(
    (exIndex: number, done: boolean) => {
      setActiveWorkout((prev) =>
        prev
          ? updateExercise(prev, exIndex, (ex) => {
              if (!done) return { ...ex, sets: ex.sets.map((s) => ({ ...s, done: false })) }
              const sets = [...ex.sets]
              sets.forEach((_, i) => {
                sets[i] = completeSet(ex, i, sets)
              })
              return { ...ex, sets }
            })
          : prev,
      )
    },
    [setActiveWorkout],
  )

  const addSet = useCallback(
    (exIndex: number) => {
      setActiveWorkout((prev) =>
        prev
          ? updateExercise(prev, exIndex, (ex) => ({
              ...ex,
              sets: [
                ...ex.sets,
                {
                  weightKg: ex.sets.at(-1)?.weightKg ?? null,
                  reps: ex.sets.at(-1)?.reps ?? null,
                  done: false,
                },
              ],
            }))
          : prev,
      )
    },
    [setActiveWorkout],
  )

  const removeSet = useCallback(
    (exIndex: number, setIndex: number) => {
      setActiveWorkout((prev) =>
        prev
          ? updateExercise(prev, exIndex, (ex) => {
              if (ex.sets.length <= 1) return ex
              const nextIndex = Math.min(Math.max(setIndex, 0), ex.sets.length - 1)
              return {
                ...ex,
                sets: ex.sets.filter((_, i) => i !== nextIndex),
              }
            })
          : prev,
      )
    },
    [setActiveWorkout],
  )

  const loadPreviousSets = useCallback(
    (exIndex: number) => {
      const workout = activeWorkout
      if (!workout) return false
      const ex = workout.exercises[exIndex]
      if (!ex) return false
      const last = findLastExercisePerformance(
        workoutLogs,
        ex.name,
        ex.exerciseId,
      )
      if (!last?.length) return false

      const defaultWeightKg = parseKg(ex.targetWeight)
      const defaultReps = parseDefaultReps(ex.targetReps)
      setActiveWorkout((prev) =>
        prev
          ? updateExercise(prev, exIndex, (current) => ({
              ...current,
              sets: buildSetsFromHistory(
                Math.max(current.sets.length, last.length),
                last,
                defaultWeightKg,
                defaultReps,
              ),
            }))
          : prev,
      )
      return true
    },
    [activeWorkout, setActiveWorkout, workoutLogs],
  )

  const finishWorkout = useCallback(() => {
    if (!activeWorkout) return null
    const completedAt = new Date().toISOString()
    const exercises = activeWorkout.exercises
      .map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.done) }))
      .filter((ex) => ex.sets.length > 0)
    if (!exercises.length) return null

    const log: WorkoutLog = { ...activeWorkout, completedAt, exercises }
    setWorkoutLogs((prev) => [...prev, log])
    for (const ex of exercises) {
      for (const set of ex.sets) {
        addSetLog({
          exerciseId: ex.exerciseId,
          exerciseName: ex.name,
          dayId: activeWorkout.dayId,
          weightKg: set.weightKg ?? 0,
          reps: set.reps ?? 0,
          rpe: 0,
        })
      }
    }
    setConsistencyDayMark(localDateKey(new Date(completedAt)), {
      done: true,
      workoutId: activeWorkout.dayId,
      workoutName: activeWorkout.workoutName,
    })
    setActiveWorkout(null)
    setTrackerOpen(false)
    return log
  }, [
    activeWorkout,
    addSetLog,
    setActiveWorkout,
    setConsistencyDayMark,
    setWorkoutLogs,
  ])

  const cancelWorkout = useCallback(() => {
    setActiveWorkout(null)
    setTrackerOpen(false)
  }, [setActiveWorkout])

  const deleteWorkoutLog = useCallback(
    (id: string) => setWorkoutLogs((prev) => prev.filter((l) => l.id !== id)),
    [setWorkoutLogs],
  )

  const value = useMemo(
    () => ({
      activeWorkout,
      trackerOpen: trackerOpen && !!activeWorkout,
      openTracker: () => setTrackerOpen(true),
      minimizeTracker: () => setTrackerOpen(false),
      startWorkout,
      updateSet,
      setExerciseDone,
      addSet,
      removeSet,
      loadPreviousSets,
      finishWorkout,
      cancelWorkout,
      workoutLogs,
      deleteWorkoutLog,
      lastPerformance,
    }),
    [
      activeWorkout,
      trackerOpen,
      startWorkout,
      updateSet,
      setExerciseDone,
      addSet,
      removeSet,
      loadPreviousSets,
      finishWorkout,
      cancelWorkout,
      workoutLogs,
      deleteWorkoutLog,
      lastPerformance,
    ],
  )

  return (
    <WorkoutSessionContext.Provider value={value}>
      {children}
    </WorkoutSessionContext.Provider>
  )
}

export function useWorkoutSession() {
  const ctx = useContext(WorkoutSessionContext)
  if (!ctx) throw new Error('useWorkoutSession must be used within WorkoutSessionProvider')
  return ctx
}
