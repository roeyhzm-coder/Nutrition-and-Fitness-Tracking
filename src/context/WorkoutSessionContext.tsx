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
import { dayAllExercises, uid } from '../lib/types'
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
  finishWorkout: () => WorkoutLog | null
  cancelWorkout: () => void
  workoutLogs: WorkoutLog[]
  deleteWorkoutLog: (id: string) => void
  /** Most recent completed sets for an exercise name, for progress hints. */
  lastPerformance: (exerciseName: string) => LoggedSet[] | null
}

const WorkoutSessionContext = createContext<WorkoutSessionValue | null>(null)

function parseKg(text?: string): number | null {
  const match = text?.match(/^\s*(\d+(?:\.\d+)?)\s*ק/)
  return match ? Number(match[1]) : null
}

/** Completing a set fills blanks from the previous set's weight and a numeric rep target. */
function completeSet(ex: LoggedExercise, index: number, sets = ex.sets): LoggedSet {
  const set = sets[index]
  const targetReps = /^\d+$/.test(ex.targetReps.trim()) ? Number(ex.targetReps) : null
  return {
    ...set,
    done: true,
    weightKg: set.weightKg ?? sets[index - 1]?.weightKg ?? null,
    reps: set.reps ?? targetReps,
  }
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

export function WorkoutSessionProvider({ children }: { children: ReactNode }) {
  const { activeProgram, addSetLog } = useAppData()
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
    (exerciseName: string) => {
      for (let i = workoutLogs.length - 1; i >= 0; i--) {
        const ex = workoutLogs[i].exercises.find((e) => e.name === exerciseName)
        const done = ex?.sets.filter((s) => s.done)
        if (done?.length) return done
      }
      return null
    },
    [workoutLogs],
  )

  const startWorkout = useCallback(
    (day: WorkoutDay) => {
      setTrackerOpen(true)
      if (activeWorkout) return
      const exercises = dayAllExercises(day)
      if (!exercises.length || !activeProgram) return
      setActiveWorkout({
        id: uid(),
        programId: activeProgram.id,
        programName: activeProgram.name,
        dayId: day.id,
        dayNumber: day.dayNumber,
        workoutName:
          day.sessions.map((s) => s.name).join(' + ') || day.focus || day.title,
        startedAt: new Date().toISOString(),
        exercises: exercises.map((ex) => {
          const last = lastPerformance(ex.name)
          const targetKg = parseKg(ex.weight)
          return {
            exerciseId: ex.id,
            name: ex.name,
            targetSets: ex.sets,
            targetReps: ex.reps,
            targetWeight: ex.weight,
            rest: ex.rest,
            imageUrl: ex.imageUrl,
            sets: Array.from({ length: ex.sets }, (_, i) => ({
              weightKg: last?.[i]?.weightKg ?? last?.at(-1)?.weightKg ?? targetKg,
              reps: null,
              done: false,
            })),
          }
        }),
      })
    },
    [activeWorkout, activeProgram, lastPerformance, setActiveWorkout],
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
                { weightKg: ex.sets.at(-1)?.weightKg ?? null, reps: null, done: false },
              ],
            }))
          : prev,
      )
    },
    [setActiveWorkout],
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
    setActiveWorkout(null)
    setTrackerOpen(false)
    return log
  }, [activeWorkout, addSetLog, setActiveWorkout, setWorkoutLogs])

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
