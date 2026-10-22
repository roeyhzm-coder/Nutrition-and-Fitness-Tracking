import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { onWindowResume, subscribeSharedSync } from '../lib/appStateSync'
import { useLocalStorage } from '../hooks/useLocalStorage'
import {
  buildSetsFromDefaults,
  defaultSetAt,
  defaultsFromExercise,
  defaultsFromLoggedSets,
  exercisePatchFromDefaults,
  loggedSetsAreUnset,
  parseDefaultReps,
  resolveExerciseMetric,
  type ExerciseDefaultValues,
} from '../lib/exerciseDefaults'
import { withDefaultNote } from '../data/exerciseNotes'
import {
  withStoredNotes,
  type ExerciseDefaultsMap,
  type ExerciseDefaultsWriteResult,
} from '../lib/exerciseDefaultsStore'
import {
  reconcileWorkoutExercises,
  resolveExerciseDefaults,
  type ExerciseDefaultsContext,
} from '../lib/exerciseDefaultsResolve'
import type {
  ActiveWorkout,
  Exercise,
  ExerciseMetric,
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
  /** Starts a scheduled day, or reopens the workout already in progress. */
  startWorkout: (day: WorkoutDay) => void
  /** Start any workout (template / other day's plan) regardless of today's slot. */
  startFlexibleWorkout: (source: FlexibleWorkoutSource) => void
  setPerformedOn: (date: string) => void
  setEstimatedCalories: (calories: number | null) => void
  updateSet: (exIndex: number, setIndex: number, patch: Partial<LoggedSet>) => void
  setExerciseDone: (exIndex: number, done: boolean) => void
  addSet: (exIndex: number) => void
  /** Removes a set; always keeps at least one set. */
  removeSet: (exIndex: number, setIndex: number) => void
  /**
   * Switch an exercise between counting reps and seconds. Updates the active
   * workout immediately and persists the metric onto the exercise's saved
   * defaults (keeping its saved sets / kg / values).
   */
  setExerciseMetric: (
    exIndex: number,
    metric: ExerciseMetric,
  ) => Promise<ExerciseDefaultsWriteResult>
  /** Persist current sets, kg, reps/seconds and metric as the exercise's defaults (Supabase). */
  saveAsDefaults: (exIndex: number) => Promise<ExerciseDefaultsWriteResult>
  /**
   * Save an exercise's notes: updates the active workout immediately, then
   * persists by exercise name (Supabase + every program / template copy).
   */
  saveExerciseNote: (exIndex: number, notes: string) => Promise<ExerciseDefaultsWriteResult>
  finishWorkout: () => WorkoutLog | null
  cancelWorkout: () => void
  workoutLogs: WorkoutLog[]
  deleteWorkoutLog: (id: string) => void
}

export type FlexibleWorkoutSource = {
  name: string
  exercises: Exercise[]
  dayId?: string
  dayNumber?: number
  estimatedCalories?: number | null
}

const WorkoutSessionContext = createContext<WorkoutSessionValue | null>(null)

function loggedExerciseDefaults(ex: LoggedExercise): ExerciseDefaultValues {
  return defaultsFromExercise({
    sets: ex.targetSets,
    reps: ex.targetReps,
    weight: ex.targetWeight,
    defaultWeightKg: ex.defaultWeightKg,
    defaultReps: ex.defaultReps,
    defaultSets: ex.defaultSets,
    metric: ex.defaultMetric,
  })
}

/** Exercise-shaped view of a logged exercise, for resolving stored defaults by name. */
function loggedAsExercise(logged: LoggedExercise): Exercise {
  return {
    id: logged.exerciseId,
    name: logged.name,
    sets: logged.targetSets,
    reps: logged.targetReps,
    weight: logged.targetWeight,
    defaultWeightKg: logged.defaultWeightKg,
    defaultReps: logged.defaultReps,
    defaultSets: logged.defaultSets,
    metric: logged.defaultMetric,
    notes: logged.notes,
  }
}

/** Completing a set fills blanks from that set's default, then the previous set. */
function completeSet(ex: LoggedExercise, index: number, sets = ex.sets): LoggedSet {
  const set = sets[index]
  const perSet = defaultSetAt(loggedExerciseDefaults(ex), index)
  const targetReps =
    perSet.reps ??
    (ex.defaultReps != null && Number.isFinite(ex.defaultReps)
      ? ex.defaultReps
      : parseDefaultReps(ex.targetReps))
  return {
    ...set,
    done: true,
    weightKg:
      set.weightKg ??
      perSet.weightKg ??
      sets[index - 1]?.weightKg ??
      ex.defaultWeightKg ??
      null,
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

/**
 * Patch the exercise by identity. Async results (save as default, metric)
 * must never land on whatever exercise now sits at the old index.
 */
function updateLoggedExerciseById(
  workout: ActiveWorkout,
  exerciseId: string,
  fn: (ex: LoggedExercise) => LoggedExercise,
): ActiveWorkout {
  return {
    ...workout,
    exercises: workout.exercises.map((ex) => (ex.exerciseId === exerciseId ? fn(ex) : ex)),
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
  | 'targetSets'
  | 'targetReps'
  | 'targetWeight'
  | 'defaultWeightKg'
  | 'defaultReps'
  | 'defaultSets'
> {
  const patch = exercisePatchFromDefaults(defaults)
  return {
    targetSets: patch.sets,
    targetReps: patch.reps,
    targetWeight: patch.weight,
    defaultWeightKg: patch.defaultWeightKg ?? null,
    defaultReps: patch.defaultReps ?? null,
    defaultSets: patch.defaultSets,
  }
}

/** Live program copy (else the logged snapshot) with its seeded / saved note. */
function sourceExercise(
  logged: LoggedExercise,
  programEx: Exercise | undefined,
  stored: ExerciseDefaultsMap,
): Exercise {
  return withStoredNotes(withDefaultNote(programEx ?? loggedAsExercise(logged)), stored)
}

/** Keep the logged exercise's notes in step with the newest saved / program note. */
function refreshLoggedNotes(
  logged: LoggedExercise,
  programEx: Exercise | undefined,
  stored: ExerciseDefaultsMap,
): LoggedExercise {
  const source = sourceExercise(logged, programEx, stored)
  return (source.notes ?? '') === (logged.notes ?? '')
    ? logged
    : { ...logged, notes: source.notes }
}

function applyDefaultsIfUnset(
  logged: LoggedExercise,
  programEx: Exercise | undefined,
  ctx: ExerciseDefaultsContext,
): LoggedExercise {
  if (!loggedSetsAreUnset(logged.sets)) return logged
  const resolved = resolveExerciseDefaults(sourceExercise(logged, programEx, ctx.stored), ctx)
  const defaults = defaultsFromExercise(resolved.exercise)
  return {
    ...logged,
    ...loggedTargetsFromDefaults(defaults),
    metric: resolved.metric,
    defaultMetric: resolved.metric,
    sets: buildSetsFromDefaults(defaults),
  }
}

/** Fresh logged exercise hydrated through the strict defaults priority. */
function hydrateLoggedExercise(ex: Exercise, ctx: ExerciseDefaultsContext): LoggedExercise {
  const resolved = resolveExerciseDefaults(withStoredNotes(withDefaultNote(ex), ctx.stored), ctx)
  return seedLoggedExercise(resolved.exercise, resolved.metric)
}

function seedLoggedExercise(ex: Exercise, metric = resolveExerciseMetric(ex)): LoggedExercise {
  const defaults = defaultsFromExercise(ex)
  return {
    exerciseId: ex.id,
    name: ex.name,
    targetSets: defaults.sets,
    targetReps: ex.reps,
    targetWeight: ex.weight,
    defaultWeightKg: defaults.weightKg,
    defaultReps: defaults.reps,
    defaultSets: defaults.defaultSets,
    metric,
    defaultMetric: metric,
    rest: ex.rest,
    imageUrl: ex.imageUrl,
    notes: ex.notes,
    sets: buildSetsFromDefaults(defaults),
  }
}

export function WorkoutSessionProvider({ children }: { children: ReactNode }) {
  const {
    activeProgram,
    addSetLog,
    setConsistencyDayMark,
    exerciseDefaults,
    persistExerciseDefaults,
    persistExerciseNote,
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
  // Latest workout for async actions, so a value typed right before tapping
  // "save as default" is never read from a stale render closure.
  const activeWorkoutRef = useRef<ActiveWorkout | null>(activeWorkout)
  activeWorkoutRef.current = activeWorkout
  const activeWorkoutId = activeWorkout?.id
  const programDays = activeProgram?.days

  useEffect(() => {
    let cancelled = false
    const hydrateLogs = async () => {
      const remote = await pullWorkoutLogs()
      if (cancelled || !remote) return
      setWorkoutLogs((local) => {
        const { merged, localOnly } = mergeWorkoutLogs(local, remote)
        if (localOnly.length) void pushWorkoutLogs(localOnly)
        return merged
      })
    }
    void hydrateLogs()
    const stopRealtime = subscribeSharedSync(() => {
      void hydrateLogs()
    }, 'workout-logs')
    const stopResume = onWindowResume(() => {
      void hydrateLogs()
    })
    return () => {
      cancelled = true
      stopRealtime()
      stopResume()
    }
  }, [setWorkoutLogs])

  useEffect(() => {
    if (!activeWorkoutId) return
    setActiveWorkout((prev) => {
      if (!prev || prev.id !== activeWorkoutId) return prev
      const ctx: ExerciseDefaultsContext = {
        blockId: prev.programId,
        stored: exerciseDefaults,
        logs: workoutLogs,
      }
      // Day's template switched (e.g. דחיפה → משיכה): drop the old lineup's
      // uncommitted sets and hydrate the new exercises by their own keys.
      const linkedDay = prev.linkedDayId
        ? programDays?.find((d) => d.id === prev.linkedDayId)
        : undefined
      const lineup = linkedDay && !linkedDay.isRest ? dayAllExercises(linkedDay) : []
      const realigned = lineup.length
        ? reconcileWorkoutExercises(prev.exercises, lineup, (ex) => hydrateLoggedExercise(ex, ctx))
        : null
      const base = realigned
        ? { ...prev, workoutName: workoutLabel(linkedDay!), exercises: realigned }
        : prev

      let changed = !!realigned
      const exercises = base.exercises.map((logged) => {
        const programEx = findProgramExercise(programDays, prev.dayId, logged.exerciseId)
        const next = refreshLoggedNotes(
          applyDefaultsIfUnset(logged, programEx, ctx),
          programEx,
          exerciseDefaults,
        )
        if (next !== logged) changed = true
        return next
      })
      return changed ? { ...base, exercises } : prev
    })
  }, [activeWorkoutId, programDays, exerciseDefaults, workoutLogs, setActiveWorkout])

  const startFlexibleWorkout = useCallback(
    (source: FlexibleWorkoutSource) => {
      setTrackerOpen(true)
      if (activeWorkout) return
      if (!source.exercises.length || !activeProgram) return
      const today = localDateKey()
      const calories =
        source.estimatedCalories != null && Number.isFinite(source.estimatedCalories)
          ? Math.max(0, Math.round(source.estimatedCalories))
          : null
      const ctx: ExerciseDefaultsContext = {
        blockId: activeProgram.id,
        stored: exerciseDefaults,
        logs: workoutLogs,
      }

      // Prefer the latest program copy (callers may pass a stale day snapshot),
      // then hydrate each exercise by canonical key: block default → global
      // default → last logged session → seed.
      const exercises = source.exercises.map((ex) => {
        const live = source.dayId
          ? (findProgramExercise(activeProgram.days, source.dayId, ex.id) ?? ex)
          : ex
        return hydrateLoggedExercise(live, ctx)
      })

      setActiveWorkout({
        id: uid(),
        programId: activeProgram.id,
        programName: activeProgram.name,
        blockNumber: deriveBlockNumber(activeProgram.id, activeProgram.name),
        dayId: source.dayId || activeProgram.days[0]?.id || '',
        dayNumber: source.dayNumber || 1,
        workoutName: source.name,
        startedAt: new Date().toISOString(),
        performedOn: today,
        estimatedCalories: calories,
        exercises,
        ...(source.dayId ? { linkedDayId: source.dayId } : {}),
      })
    },
    [activeWorkout, activeProgram, exerciseDefaults, workoutLogs, setActiveWorkout],
  )

  const startWorkout = useCallback(
    (day: WorkoutDay) => {
      startFlexibleWorkout({
        name: workoutLabel(day),
        exercises: dayAllExercises(day),
        dayId: day.id,
        dayNumber: day.dayNumber,
        estimatedCalories: day.sessions.reduce(
          (sum, session) => sum + (session.estimatedCalories ?? 0),
          0,
        ) || null,
      })
    },
    [startFlexibleWorkout],
  )

  const setPerformedOn = useCallback(
    (date: string) => {
      setActiveWorkout((prev) => (prev ? { ...prev, performedOn: date } : prev))
    },
    [setActiveWorkout],
  )

  const setEstimatedCalories = useCallback(
    (calories: number | null) => {
      setActiveWorkout((prev) =>
        prev ? { ...prev, estimatedCalories: calories } : prev,
      )
    },
    [setActiveWorkout],
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
          ? updateLoggedExercise(prev, exIndex, (ex) => {
              const last = ex.sets.at(-1)
              const extra = defaultSetAt(loggedExerciseDefaults(ex), ex.sets.length)
              return {
                ...ex,
                sets: [
                  ...ex.sets,
                  {
                    weightKg: last?.weightKg ?? extra.weightKg ?? ex.defaultWeightKg ?? null,
                    reps: last?.reps ?? extra.reps ?? ex.defaultReps ?? null,
                    done: false,
                    rpe: null,
                  },
                ],
              }
            })
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

  /** Functional update of one logged exercise (by identity) that also refreshes the ref. */
  const patchLoggedExercise = useCallback(
    (exerciseId: string, fn: (ex: LoggedExercise) => LoggedExercise) => {
      setActiveWorkout((prev) => {
        if (!prev) return prev
        const next = updateLoggedExerciseById(prev, exerciseId, fn)
        activeWorkoutRef.current = next
        return next
      })
    },
    [setActiveWorkout],
  )

  const setExerciseMetric = useCallback(
    async (exIndex: number, metric: ExerciseMetric): Promise<ExerciseDefaultsWriteResult> => {
      const workout = activeWorkoutRef.current
      const logged = workout?.exercises[exIndex]
      if (!workout || !logged) return { ok: false, error: 'התרגיל לא נמצא באימון הפעיל' }

      patchLoggedExercise(logged.exerciseId, (ex) => ({ ...ex, metric }))
      if (logged.defaultMetric === metric) return { ok: true }

      // Same saved sets / kg / values — only the unit changes.
      const defaults: ExerciseDefaultValues = { ...loggedExerciseDefaults(logged), metric }
      const result = await persistExerciseDefaults(logged.name, defaults, {
        blockId: workout.programId,
      })
      if (!result.ok) return result

      const targets = loggedTargetsFromDefaults(defaults)
      patchLoggedExercise(logged.exerciseId, (current) => ({
        ...current,
        ...targets,
        defaultMetric: metric,
      }))
      return result
    },
    [patchLoggedExercise, persistExerciseDefaults],
  )

  const saveAsDefaults = useCallback(
    async (exIndex: number): Promise<ExerciseDefaultsWriteResult> => {
      const workout = activeWorkoutRef.current
      const logged = workout?.exercises[exIndex]
      if (!workout || !logged) return { ok: false, error: 'התרגיל לא נמצא באימון הפעיל' }

      // Every set's own weight + reps/seconds, saved for this block and globally.
      const metric = logged.metric ?? resolveExerciseMetric(loggedAsExercise(logged))
      const defaults = defaultsFromLoggedSets(logged.sets, metric)
      const result = await persistExerciseDefaults(logged.name, defaults, {
        blockId: workout.programId,
      })
      if (!result.ok) return result

      const targets = loggedTargetsFromDefaults(defaults)
      patchLoggedExercise(logged.exerciseId, (current) => ({
        ...current,
        ...targets,
        metric,
        defaultMetric: metric,
      }))
      return result
    },
    [patchLoggedExercise, persistExerciseDefaults],
  )

  const saveExerciseNote = useCallback(
    async (exIndex: number, notes: string): Promise<ExerciseDefaultsWriteResult> => {
      const logged = activeWorkoutRef.current?.exercises[exIndex]
      if (!logged) return { ok: false, error: 'התרגיל לא נמצא באימון הפעיל' }
      const trimmed = notes.trim()
      // Every copy of this exercise in the session shares the name-keyed note.
      setActiveWorkout((prev) => {
        if (!prev) return prev
        const next = {
          ...prev,
          exercises: prev.exercises.map((ex) =>
            ex.name === logged.name ? { ...ex, notes: trimmed || undefined } : ex,
          ),
        }
        activeWorkoutRef.current = next
        return next
      })
      return persistExerciseNote(logged.name, trimmed)
    },
    [persistExerciseNote, setActiveWorkout],
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

    const performedOn = activeWorkout.performedOn || localDateKey()
    const { linkedDayId, ...session } = activeWorkout
    void linkedDayId
    const log: WorkoutLog = {
      ...session,
      blockNumber:
        activeWorkout.blockNumber ??
        deriveBlockNumber(activeWorkout.programId, activeWorkout.programName),
      completedAt,
      performedOn,
      estimatedCalories: activeWorkout.estimatedCalories ?? null,
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
    setConsistencyDayMark(performedOn, {
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
      startFlexibleWorkout,
      setPerformedOn,
      setEstimatedCalories,
      updateSet,
      setExerciseDone,
      addSet,
      removeSet,
      setExerciseMetric,
      saveAsDefaults,
      saveExerciseNote,
      finishWorkout,
      cancelWorkout,
      workoutLogs,
      deleteWorkoutLog,
    }),
    [
      activeWorkout,
      trackerOpen,
      startWorkout,
      startFlexibleWorkout,
      setPerformedOn,
      setEstimatedCalories,
      updateSet,
      setExerciseDone,
      addSet,
      removeSet,
      setExerciseMetric,
      saveAsDefaults,
      saveExerciseNote,
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
