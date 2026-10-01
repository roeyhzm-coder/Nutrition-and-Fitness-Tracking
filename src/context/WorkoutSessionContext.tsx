import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import {
  buildSetsFromDefaults,
  defaultsFromExercise,
  defaultsFromLoggedSets,
  exercisePatchFromDefaults,
  loggedSetsAreUnset,
  parseDefaultReps,
  type ExerciseDefaultValues,
} from '../lib/exerciseDefaults'
import type {
  ActiveWorkout,
  Exercise,
  LoggedExercise,
  LoggedSet,
  WorkoutDay,
  WorkoutLog,
} from '../lib/types'
import { dayAllExercises, localDateKey, uid } from '../lib/types'
import {
  deleteRemoteWorkoutLog,
  deriveBlockNumber,
  mergeWorkoutLogs,
  pullWorkoutLogs,
  pushWorkoutLogs,
} from '../lib/workoutHistory'
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
  /** Persist current set values as the exercise's permanent defaults. */
  saveAsDefaults: (exIndex: number) => boolean
  finishWorkout: () => WorkoutLog | null
  cancelWorkout: () => void
  workoutLogs: WorkoutLog[]
  deleteWorkoutLog: (id: string) => void
}

const WorkoutSessionContext = createContext<WorkoutSessionValue | null>(null)

/** Completing a set fills blanks from the previous set's weight and a numeric rep target. */
function completeSet(ex: LoggedExercise, index: number, sets = ex.sets): LoggedSet {
  const set = sets[index]
  const targetReps =
    ex.defaultReps != null && Number.isFinite(ex.defaultReps)
      ? ex.defaultReps
      : parseDefaultReps(ex.targetReps)
  return {
    ...set,
    done: true,
    weightKg: set.weightKg ?? sets[index - 1]?.weightKg ?? ex.defaultWeightKg ?? null,
    reps: set.reps ?? targetReps,
  }
}

function updateLoggedExercise(
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

function findProgramExercise(
  days: WorkoutDay[] | undefined,
  dayId: string,
  exerciseId: string,
): Exercise | undefined {
  const day = days?.find((d) => d.id === dayId)
  if (!day) return undefined
  return dayAllExercises(day).find((e) => e.id === exerciseId)
}

function loggedTargetsFromDefaults(
  defaults: ExerciseDefaultValues,
): Pick<
  LoggedExercise,
  'targetSets' | 'targetReps' | 'targetWeight' | 'defaultWeightKg' | 'defaultReps'
> {
  const patch = exercisePatchFromDefaults(defaults)
  return {
    targetSets: patch.sets,
    targetReps: patch.reps,
    targetWeight: patch.weight,
    defaultWeightKg: patch.defaultWeightKg ?? null,
    defaultReps: patch.defaultReps ?? null,
  }
}

function resolveDefaults(
  logged: LoggedExercise,
  programEx?: Exercise,
): ExerciseDefaultValues {
  if (programEx) return defaultsFromExercise(programEx)
  return defaultsFromExercise({
    sets: logged.targetSets,
    reps: logged.targetReps,
    weight: logged.targetWeight,
    defaultWeightKg: logged.defaultWeightKg,
    defaultReps: logged.defaultReps,
  })
}

function applyDefaultsIfUnset(
  logged: LoggedExercise,
  programEx?: Exercise,
): LoggedExercise {
  if (!loggedSetsAreUnset(logged.sets)) return logged
  const defaults = resolveDefaults(logged, programEx)
  return {
    ...logged,
    ...loggedTargetsFromDefaults(defaults),
    sets: buildSetsFromDefaults(defaults),
  }
}

export function WorkoutSessionProvider({ children }: { children: ReactNode }) {
  const {
    activeProgram,
    addSetLog,
    setConsistencyDayMark,
    updateExercise: updateProgramExercise,
  } = useAppData()
  const [activeWorkout, setActiveWorkout] = useLocalStorage<ActiveWorkout | null>(
    'tn.activeWorkout.v1',
    null,
  )
  const [workoutLogs, setWorkoutLogs] = useLocalStorage<WorkoutLog[]>(
    'tn.workoutLogs.v1',
    [],
  )
  const [trackerOpen, setTrackerOpen] = useState(false)
  const activeWorkoutId = activeWorkout?.id
  const programDays = activeProgram?.days

  useEffect(() => {
    let cancelled = false
    void pullWorkoutLogs().then((remote) => {
      if (cancelled || !remote) return
      setWorkoutLogs((local) => {
        const { merged, localOnly } = mergeWorkoutLogs(local, remote)
        if (localOnly.length) void pushWorkoutLogs(localOnly)
        return merged
      })
    })
    return () => {
      cancelled = true
    }
  }, [setWorkoutLogs])

  useEffect(() => {
    if (!activeWorkoutId) return
    setActiveWorkout((prev) => {
      if (!prev || prev.id !== activeWorkoutId) return prev
      let changed = false
      const exercises = prev.exercises.map((logged) => {
        const programEx = findProgramExercise(programDays, prev.dayId, logged.exerciseId)
        const next = applyDefaultsIfUnset(logged, programEx)
        if (next !== logged) changed = true
        return next
      })
      return changed ? { ...prev, exercises } : prev
    })
  }, [activeWorkoutId, programDays, setActiveWorkout])

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
        blockNumber: deriveBlockNumber(activeProgram.id, activeProgram.name),
        dayId: day.id,
        dayNumber: day.dayNumber,
        workoutName: name,
        startedAt: new Date().toISOString(),
        exercises: exercises.map((ex) => {
          const defaults = defaultsFromExercise(ex)
          return {
            exerciseId: ex.id,
            name: ex.name,
            targetSets: ex.sets,
            targetReps: ex.reps,
            targetWeight: ex.weight,
            defaultWeightKg: defaults.weightKg,
            defaultReps: defaults.reps,
            rest: ex.rest,
            imageUrl: ex.imageUrl,
            sets: buildSetsFromDefaults(defaults),
          }
        }),
      })
    },
    [activeWorkout, activeProgram, setActiveWorkout],
  )

  const updateSet = useCallback(
    (exIndex: number, setIndex: number, patch: Partial<LoggedSet>) => {
      setActiveWorkout((prev) =>
        prev
          ? updateLoggedExercise(prev, exIndex, (ex) => {
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
          ? updateLoggedExercise(prev, exIndex, (ex) => {
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
          ? updateLoggedExercise(prev, exIndex, (ex) => ({
              ...ex,
              sets: [
                ...ex.sets,
                {
                  weightKg:
                    ex.sets.at(-1)?.weightKg ?? ex.defaultWeightKg ?? null,
                  reps: ex.sets.at(-1)?.reps ?? ex.defaultReps ?? null,
                  done: false,
                  rpe: ex.sets.at(-1)?.rpe ?? null,
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
          ? updateLoggedExercise(prev, exIndex, (ex) => {
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

  const saveAsDefaults = useCallback(
    (exIndex: number) => {
      const workout = activeWorkout
      if (!workout) return false
      const logged = workout.exercises[exIndex]
      if (!logged) return false

      const defaults = defaultsFromLoggedSets(logged.sets)
      const patch = exercisePatchFromDefaults(defaults)

      // Persist onto the program exercise (localStorage + Supabase sync via AppData).
      updateProgramExercise(workout.dayId, logged.exerciseId, patch)

      setActiveWorkout((prev) =>
        prev
          ? updateLoggedExercise(prev, exIndex, (current) => ({
              ...current,
              ...loggedTargetsFromDefaults(defaults),
            }))
          : prev,
      )
      return true
    },
    [activeWorkout, setActiveWorkout, updateProgramExercise],
  )

  const finishWorkout = useCallback(() => {
    if (!activeWorkout) return null
    const completedAt = new Date().toISOString()
    const exercises = activeWorkout.exercises
      .map((ex) => ({
        ...ex,
        sets: ex.sets
          .filter((s) => s.done)
          .map((s) => ({
            weightKg: s.weightKg,
            reps: s.reps,
            done: true,
            rpe: s.rpe ?? null,
          })),
      }))
      .filter((ex) => ex.sets.length > 0)
    if (!exercises.length) return null

    const log: WorkoutLog = {
      ...activeWorkout,
      blockNumber:
        activeWorkout.blockNumber ??
        deriveBlockNumber(activeWorkout.programId, activeWorkout.programName),
      completedAt,
      exercises,
    }
    setWorkoutLogs((prev) => [...prev, log])
    void pushWorkoutLogs([log])
    for (const ex of exercises) {
      for (const set of ex.sets) {
        addSetLog({
          exerciseId: ex.exerciseId,
          exerciseName: ex.name,
          dayId: activeWorkout.dayId,
          weightKg: set.weightKg ?? 0,
          reps: set.reps ?? 0,
          rpe: set.rpe ?? 0,
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
    (id: string) => {
      setWorkoutLogs((prev) => prev.filter((l) => l.id !== id))
      void deleteRemoteWorkoutLog(id)
    },
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
      saveAsDefaults,
      finishWorkout,
      cancelWorkout,
      workoutLogs,
      deleteWorkoutLog,
    }),
    [
      activeWorkout,
      trackerOpen,
      startWorkout,
      updateSet,
      setExerciseDone,
      addSet,
      removeSet,
      saveAsDefaults,
      finishWorkout,
      cancelWorkout,
      workoutLogs,
      deleteWorkoutLog,
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
