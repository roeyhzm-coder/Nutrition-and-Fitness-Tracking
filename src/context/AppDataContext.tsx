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
import {
  cloneProgram,
  createDefaultPrograms,
  DEFAULT_GOAL,
  DEFAULT_PHASE,
  DEFAULT_PHASE_MACROS,
  DEFAULT_SAVED_MEALS,
} from '../data/defaults'
import { DEFAULT_RECIPES } from '../data/recipes'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { pullAppState, pushAppState } from '../lib/appStateSync'
import { fetchRecipesFromSupabase } from '../lib/recipesApi'
import { isSupabaseConfigured } from '../lib/supabase'
import type {
  CustomHabit,
  Exercise,
  FoodLogEntry,
  GoalSettings,
  HabitChecks,
  MacroTargets,
  Phase,
  PhaseMacroPresets,
  Recipe,
  SavedMeal,
  SetLog,
  WeightEntry,
  WorkoutDay,
  WorkoutProgram,
  WorkoutTemplate,
} from '../lib/types'
import { normalizeGoal, todayKey, uid } from '../lib/types'

type RecipesSyncStatus = 'idle' | 'loading' | 'synced' | 'error'

type AppDataContextValue = {
  phase: Phase
  setPhase: (phase: Phase) => void
  goal: GoalSettings
  setGoal: (goal: GoalSettings) => void
  /** @deprecated alias of goal */
  process: GoalSettings
  setProcess: (settings: GoalSettings) => void
  macroPresets: PhaseMacroPresets
  setMacroPresets: (presets: PhaseMacroPresets) => void
  macroTargets: MacroTargets
  setMacroTargets: (targets: MacroTargets) => void
  setLogs: SetLog[]
  weightLogs: WeightEntry[]
  foodLogs: FoodLogEntry[]
  habitChecks: HabitChecks
  habits: CustomHabit[]
  workoutPrograms: WorkoutProgram[]
  activeProgramId: string
  activeProgram: WorkoutProgram | null
  setActiveProgramId: (id: string) => void
  createProgram: (name: string, fromActive?: boolean) => void
  renameProgram: (id: string, name: string) => void
  deleteProgram: (id: string) => void
  duplicateProgram: (id: string, name?: string) => void
  workoutDays: WorkoutDay[]
  setWorkoutDays: (days: WorkoutDay[]) => void
  updateWorkoutDay: (dayId: string, patch: Partial<WorkoutDay>) => void
  addExercise: (dayId: string, exercise: Omit<Exercise, 'id'>) => void
  updateExercise: (
    dayId: string,
    exerciseId: string,
    patch: Partial<Exercise>,
  ) => void
  deleteExercise: (dayId: string, exerciseId: string) => void
  workoutTemplates: WorkoutTemplate[]
  addWorkoutTemplate: (
    template: Omit<WorkoutTemplate, 'id' | 'updatedAt'>,
  ) => string
  updateWorkoutTemplate: (
    id: string,
    patch: Partial<Pick<WorkoutTemplate, 'name' | 'exercises'>>,
  ) => void
  deleteWorkoutTemplate: (id: string) => void
  assignTemplateToDay: (
    dayId: string,
    templateId: string,
    exercisesOverride?: Exercise[],
  ) => void
  saveDayAsTemplate: (dayId: string, name: string) => void
  savedMeals: SavedMeal[]
  addSavedMeal: (meal: Omit<SavedMeal, 'id'>) => void
  updateSavedMeal: (id: string, patch: Partial<SavedMeal>) => void
  deleteSavedMeal: (id: string) => void
  recipes: Recipe[]
  setRecipes: (recipes: Recipe[]) => void
  addRecipe: (recipe: Omit<Recipe, 'id'>) => void
  importMealsAndRecipes: (meals: SavedMeal[], recipes: Recipe[]) => void
  recipesSyncStatus: RecipesSyncStatus
  recipesSyncError: string | null
  syncRecipes: () => Promise<void>
  stateSyncStatus: 'idle' | 'syncing' | 'synced' | 'error'
  addSetLog: (entry: Omit<SetLog, 'id' | 'loggedAt'>) => void
  addWeight: (input: {
    weightKg: number
    bodyFatPct?: number | null
    note?: string
  }) => void
  addFood: (entry: Omit<FoodLogEntry, 'id' | 'loggedAt'>) => void
  logSavedMeal: (mealId: string) => void
  addHabit: (label: string) => void
  updateHabit: (id: string, label: string) => void
  deleteHabit: (id: string) => void
  toggleHabit: (itemId: string) => void
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

function updateActiveProgramDays(
  programs: WorkoutProgram[],
  activeId: string,
  updater: (days: WorkoutDay[]) => WorkoutDay[],
) {
  return programs.map((p) =>
    p.id === activeId
      ? {
          ...p,
          days: updater(p.days),
          updatedAt: new Date().toISOString(),
        }
      : p,
  )
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const defaults = useMemo(() => createDefaultPrograms(), [])
  const [phase, setPhaseState] = useLocalStorage<Phase>(
    'tn.phase',
    DEFAULT_PHASE,
  )
  const [goalRaw, setGoalRaw] = useLocalStorage<GoalSettings>(
    'tn.goal.v2',
    DEFAULT_GOAL,
  )
  const goal = useMemo(() => normalizeGoal(goalRaw), [goalRaw])
  const setGoal = useCallback(
    (next: GoalSettings) => setGoalRaw(normalizeGoal(next)),
    [setGoalRaw],
  )
  const [macroPresets, setMacroPresets] = useLocalStorage<PhaseMacroPresets>(
    'tn.macroPresets.v1',
    DEFAULT_PHASE_MACROS,
  )
  const [workoutPrograms, setWorkoutPrograms] = useLocalStorage<
    WorkoutProgram[]
  >('tn.workoutPrograms.v1', defaults)
  const [activeProgramId, setActiveProgramIdState] = useLocalStorage<string>(
    'tn.activeProgramId.v1',
    defaults[0]?.id ?? '',
  )
  const [workoutTemplates, setWorkoutTemplates] = useLocalStorage<
    WorkoutTemplate[]
  >('tn.workoutTemplates.v1', [])

  const [setLogs, setSetLogs] = useLocalStorage<SetLog[]>('tn.setLogs', [])
  const [weightLogs, setWeightLogs] = useLocalStorage<WeightEntry[]>(
    'tn.weightLogs',
    [],
  )
  const [foodLogs, setFoodLogs] = useLocalStorage<FoodLogEntry[]>(
    'tn.foodLogs',
    [],
  )
  const [habitChecks, setHabitChecks] = useLocalStorage<HabitChecks>(
    'tn.habitChecks',
    {},
  )
  const [habits, setHabits] = useLocalStorage<CustomHabit[]>('tn.habits', [])
  const [savedMeals, setSavedMeals] = useLocalStorage<SavedMeal[]>(
    'tn.savedMeals.v2',
    DEFAULT_SAVED_MEALS,
  )
  const [recipes, setRecipes] = useLocalStorage<Recipe[]>(
    'tn.recipes.v3',
    DEFAULT_RECIPES,
  )
  const [recipesSyncStatus, setRecipesSyncStatus] =
    useState<RecipesSyncStatus>('idle')
  const [recipesSyncError, setRecipesSyncError] = useState<string | null>(null)
  const [stateSyncStatus, setStateSyncStatus] = useState<
    'idle' | 'syncing' | 'synced' | 'error'
  >('idle')
  const hydratedRef = useRef(false)
  const skipNextPush = useRef(false)

  const activeProgram =
    workoutPrograms.find((p) => p.id === activeProgramId) ??
    workoutPrograms[0] ??
    null

  const workoutDays = activeProgram?.days ?? []
  const macroTargets = macroPresets[phase]

  const setPhase = useCallback(
    (next: Phase) => {
      setPhaseState(next)
    },
    [setPhaseState],
  )

  const setMacroTargets = useCallback(
    (targets: MacroTargets) => {
      setMacroPresets((prev) => ({ ...prev, [phase]: targets }))
    },
    [phase, setMacroPresets],
  )

  const setActiveProgramId = useCallback(
    (id: string) => {
      if (workoutPrograms.some((p) => p.id === id)) {
        setActiveProgramIdState(id)
      }
    },
    [workoutPrograms, setActiveProgramIdState],
  )

  const setWorkoutDays = useCallback(
    (days: WorkoutDay[]) => {
      if (!activeProgram) return
      setWorkoutPrograms((prev) =>
        updateActiveProgramDays(prev, activeProgram.id, () => days),
      )
    },
    [activeProgram, setWorkoutPrograms],
  )

  const updateWorkoutDay = useCallback(
    (dayId: string, patch: Partial<WorkoutDay>) => {
      if (!activeProgram) return
      setWorkoutPrograms((prev) =>
        updateActiveProgramDays(prev, activeProgram.id, (days) =>
          days.map((d) => (d.id === dayId ? { ...d, ...patch } : d)),
        ),
      )
    },
    [activeProgram, setWorkoutPrograms],
  )

  const addExercise = useCallback(
    (dayId: string, exercise: Omit<Exercise, 'id'>) => {
      if (!activeProgram) return
      setWorkoutPrograms((prev) =>
        updateActiveProgramDays(prev, activeProgram.id, (days) =>
          days.map((d) =>
            d.id === dayId
              ? {
                  ...d,
                  exercises: [...d.exercises, { ...exercise, id: uid() }],
                }
              : d,
          ),
        ),
      )
    },
    [activeProgram, setWorkoutPrograms],
  )

  const updateExercise = useCallback(
    (dayId: string, exerciseId: string, patch: Partial<Exercise>) => {
      if (!activeProgram) return
      setWorkoutPrograms((prev) =>
        updateActiveProgramDays(prev, activeProgram.id, (days) =>
          days.map((d) =>
            d.id === dayId
              ? {
                  ...d,
                  exercises: d.exercises.map((e) =>
                    e.id === exerciseId ? { ...e, ...patch } : e,
                  ),
                }
              : d,
          ),
        ),
      )
    },
    [activeProgram, setWorkoutPrograms],
  )

  const deleteExercise = useCallback(
    (dayId: string, exerciseId: string) => {
      if (!activeProgram) return
      setWorkoutPrograms((prev) =>
        updateActiveProgramDays(prev, activeProgram.id, (days) =>
          days.map((d) =>
            d.id === dayId
              ? {
                  ...d,
                  exercises: d.exercises.filter((e) => e.id !== exerciseId),
                }
              : d,
          ),
        ),
      )
    },
    [activeProgram, setWorkoutPrograms],
  )

  const addWorkoutTemplate = useCallback(
    (template: Omit<WorkoutTemplate, 'id' | 'updatedAt'>) => {
      const id = uid()
      setWorkoutTemplates((prev) => [
        ...prev,
        {
          ...template,
          id,
          updatedAt: new Date().toISOString(),
        },
      ])
      return id
    },
    [setWorkoutTemplates],
  )

  const updateWorkoutTemplate = useCallback(
    (
      id: string,
      patch: Partial<Pick<WorkoutTemplate, 'name' | 'exercises'>>,
    ) => {
      setWorkoutTemplates((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, ...patch, updatedAt: new Date().toISOString() }
            : t,
        ),
      )
    },
    [setWorkoutTemplates],
  )

  const deleteWorkoutTemplate = useCallback(
    (id: string) => {
      setWorkoutTemplates((prev) => prev.filter((t) => t.id !== id))
    },
    [setWorkoutTemplates],
  )

  const assignTemplateToDay = useCallback(
    (dayId: string, templateId: string, exercisesOverride?: Exercise[]) => {
      if (!activeProgram) return
      const template = workoutTemplates.find((t) => t.id === templateId)
      const source = exercisesOverride ?? template?.exercises
      if (!source) return
      setWorkoutPrograms((prev) =>
        updateActiveProgramDays(prev, activeProgram.id, (days) =>
          days.map((d) =>
            d.id === dayId
              ? {
                  ...d,
                  exercises: source.map((ex) => ({
                    ...ex,
                    id: uid(),
                  })),
                }
              : d,
          ),
        ),
      )
    },
    [activeProgram, workoutTemplates, setWorkoutPrograms],
  )

  const saveDayAsTemplate = useCallback(
    (dayId: string, name: string) => {
      const day = activeProgram?.days.find((d) => d.id === dayId)
      if (!day) return
      addWorkoutTemplate({
        name: name.trim() || day.title,
        exercises: day.exercises.map((ex) => ({ ...ex, id: uid() })),
      })
    },
    [activeProgram, addWorkoutTemplate],
  )

  const createProgram = useCallback(
    (name: string, fromActive = true) => {
      const baseDays = fromActive && activeProgram ? activeProgram.days : undefined
      const program = cloneProgram(name.trim() || 'תוכנית חדשה', baseDays)
      setWorkoutPrograms((prev) => [...prev, program])
      setActiveProgramIdState(program.id)
    },
    [activeProgram, setWorkoutPrograms, setActiveProgramIdState],
  )

  const renameProgram = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      setWorkoutPrograms((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, name: trimmed, updatedAt: new Date().toISOString() }
            : p,
        ),
      )
    },
    [setWorkoutPrograms],
  )

  const deleteProgram = useCallback(
    (id: string) => {
      setWorkoutPrograms((prev) => {
        if (prev.length <= 1) return prev
        const next = prev.filter((p) => p.id !== id)
        if (activeProgramId === id) {
          setActiveProgramIdState(next[0]?.id ?? '')
        }
        return next
      })
    },
    [activeProgramId, setWorkoutPrograms, setActiveProgramIdState],
  )

  const duplicateProgram = useCallback(
    (id: string, name?: string) => {
      const source = workoutPrograms.find((p) => p.id === id)
      if (!source) return
      const copy = cloneProgram(
        name?.trim() || `${source.name} (עותק)`,
        source.days,
      )
      setWorkoutPrograms((prev) => [...prev, copy])
      setActiveProgramIdState(copy.id)
    },
    [workoutPrograms, setWorkoutPrograms, setActiveProgramIdState],
  )

  const syncRecipes = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setRecipesSyncStatus('error')
      setRecipesSyncError('חסרים משתני סביבה של Supabase')
      return
    }

    setRecipesSyncStatus('loading')
    setRecipesSyncError(null)
    try {
      const remote = await fetchRecipesFromSupabase()
      if (remote.length > 0) setRecipes(remote)
      setRecipesSyncStatus('synced')
    } catch (err) {
      setRecipesSyncStatus('error')
      setRecipesSyncError(
        err instanceof Error ? err.message : 'סנכרון המתכונים נכשל',
      )
    }
  }, [setRecipes])

  useEffect(() => {
    void syncRecipes()
  }, [syncRecipes])

  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      const remote = await pullAppState()
      if (cancelled || !remote) {
        hydratedRef.current = true
        return
      }
      skipNextPush.current = true
      setPhaseState(remote.phase)
      setGoal(normalizeGoal(remote.goal))
      setMacroPresets(remote.macroPresets)
      if (remote.workoutPrograms?.length) {
        setWorkoutPrograms(remote.workoutPrograms)
        setActiveProgramIdState(
          remote.activeProgramId || remote.workoutPrograms[0].id,
        )
      }
      if (remote.workoutTemplates) {
        setWorkoutTemplates(remote.workoutTemplates)
      }
      setStateSyncStatus('synced')
      hydratedRef.current = true
    }
    void hydrate()
    return () => {
      cancelled = true
    }
  }, [
    setPhaseState,
    setGoal,
    setMacroPresets,
    setWorkoutPrograms,
    setActiveProgramIdState,
    setWorkoutTemplates,
  ])

  useEffect(() => {
    if (!hydratedRef.current) return
    if (skipNextPush.current) {
      skipNextPush.current = false
      return
    }
    if (!activeProgramId || workoutPrograms.length === 0) return

    const handle = window.setTimeout(() => {
      setStateSyncStatus('syncing')
      void pushAppState({
        phase,
        goal,
        macroPresets,
        activeProgramId,
        workoutPrograms,
        workoutTemplates,
      }).then((ok) => setStateSyncStatus(ok ? 'synced' : 'error'))
    }, 800)

    return () => window.clearTimeout(handle)
  }, [
    phase,
    goal,
    macroPresets,
    activeProgramId,
    workoutPrograms,
    workoutTemplates,
  ])

  const addSetLog = useCallback(
    (entry: Omit<SetLog, 'id' | 'loggedAt'>) => {
      setSetLogs((prev) => [
        ...prev,
        { ...entry, id: uid(), loggedAt: new Date().toISOString() },
      ])
    },
    [setSetLogs],
  )

  const addWeight = useCallback(
    (input: {
      weightKg: number
      bodyFatPct?: number | null
      note?: string
    }) => {
      setWeightLogs((prev) => [
        ...prev,
        {
          id: uid(),
          weightKg: input.weightKg,
          bodyFatPct: input.bodyFatPct ?? null,
          note: input.note,
          loggedAt: new Date().toISOString(),
        },
      ])
    },
    [setWeightLogs],
  )

  const addFood = useCallback(
    (entry: Omit<FoodLogEntry, 'id' | 'loggedAt'>) => {
      setFoodLogs((prev) => [
        ...prev,
        { ...entry, id: uid(), loggedAt: new Date().toISOString() },
      ])
    },
    [setFoodLogs],
  )

  const addSavedMeal = useCallback(
    (meal: Omit<SavedMeal, 'id'>) => {
      setSavedMeals((prev) => [...prev, { ...meal, id: uid() }])
    },
    [setSavedMeals],
  )

  const updateSavedMeal = useCallback(
    (id: string, patch: Partial<SavedMeal>) => {
      setSavedMeals((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      )
    },
    [setSavedMeals],
  )

  const deleteSavedMeal = useCallback(
    (id: string) => {
      setSavedMeals((prev) => prev.filter((m) => m.id !== id))
    },
    [setSavedMeals],
  )

  const addRecipe = useCallback(
    (recipe: Omit<Recipe, 'id'>) => {
      setRecipes((prev) => [...prev, { ...recipe, id: uid() }])
    },
    [setRecipes],
  )

  const importMealsAndRecipes = useCallback(
    (meals: SavedMeal[], nextRecipes: Recipe[]) => {
      if (meals.length) setSavedMeals((prev) => [...prev, ...meals])
      if (nextRecipes.length) setRecipes((prev) => [...prev, ...nextRecipes])
    },
    [setSavedMeals, setRecipes],
  )

  const logSavedMeal = useCallback(
    (mealId: string) => {
      const meal = savedMeals.find((m) => m.id === mealId)
      if (!meal) return
      addFood({
        name: meal.name,
        grams: 1,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fats: meal.fats,
        source: 'saved-meal',
      })
    },
    [savedMeals, addFood],
  )

  const addHabit = useCallback(
    (label: string) => {
      const trimmed = label.trim()
      if (!trimmed) return
      setHabits((prev) => [...prev, { id: uid(), label: trimmed }])
    },
    [setHabits],
  )

  const updateHabit = useCallback(
    (id: string, label: string) => {
      setHabits((prev) =>
        prev.map((h) => (h.id === id ? { ...h, label: label.trim() } : h)),
      )
    },
    [setHabits],
  )

  const deleteHabit = useCallback(
    (id: string) => {
      setHabits((prev) => prev.filter((h) => h.id !== id))
      setHabitChecks((prev) => {
        const next: HabitChecks = {}
        for (const [day, ids] of Object.entries(prev)) {
          next[day] = ids.filter((x) => x !== id)
        }
        return next
      })
    },
    [setHabits, setHabitChecks],
  )

  const toggleHabit = useCallback(
    (itemId: string) => {
      const day = todayKey()
      setHabitChecks((prev) => {
        const current = new Set(prev[day] ?? [])
        if (current.has(itemId)) current.delete(itemId)
        else current.add(itemId)
        return { ...prev, [day]: [...current] }
      })
    },
    [setHabitChecks],
  )

  const value = useMemo(
    () => ({
      phase,
      setPhase,
      goal,
      setGoal,
      process: goal,
      setProcess: setGoal,
      macroPresets,
      setMacroPresets,
      macroTargets,
      setMacroTargets,
      setLogs,
      weightLogs,
      foodLogs,
      habitChecks,
      habits,
      workoutPrograms,
      activeProgramId: activeProgram?.id ?? activeProgramId,
      activeProgram,
      setActiveProgramId,
      createProgram,
      renameProgram,
      deleteProgram,
      duplicateProgram,
      workoutDays,
      setWorkoutDays,
      updateWorkoutDay,
      addExercise,
      updateExercise,
      deleteExercise,
      workoutTemplates,
      addWorkoutTemplate,
      updateWorkoutTemplate,
      deleteWorkoutTemplate,
      assignTemplateToDay,
      saveDayAsTemplate,
      savedMeals,
      addSavedMeal,
      updateSavedMeal,
      deleteSavedMeal,
      recipes,
      setRecipes,
      addRecipe,
      importMealsAndRecipes,
      recipesSyncStatus,
      recipesSyncError,
      syncRecipes,
      stateSyncStatus,
      addSetLog,
      addWeight,
      addFood,
      logSavedMeal,
      addHabit,
      updateHabit,
      deleteHabit,
      toggleHabit,
    }),
    [
      phase,
      setPhase,
      goal,
      setGoal,
      macroPresets,
      setMacroPresets,
      macroTargets,
      setMacroTargets,
      setLogs,
      weightLogs,
      foodLogs,
      habitChecks,
      habits,
      workoutPrograms,
      activeProgramId,
      activeProgram,
      setActiveProgramId,
      createProgram,
      renameProgram,
      deleteProgram,
      duplicateProgram,
      workoutDays,
      setWorkoutDays,
      updateWorkoutDay,
      addExercise,
      updateExercise,
      deleteExercise,
      workoutTemplates,
      addWorkoutTemplate,
      updateWorkoutTemplate,
      deleteWorkoutTemplate,
      assignTemplateToDay,
      saveDayAsTemplate,
      savedMeals,
      addSavedMeal,
      updateSavedMeal,
      deleteSavedMeal,
      recipes,
      setRecipes,
      addRecipe,
      importMealsAndRecipes,
      recipesSyncStatus,
      recipesSyncError,
      syncRecipes,
      stateSyncStatus,
      addSetLog,
      addWeight,
      addFood,
      logSavedMeal,
      addHabit,
      updateHabit,
      deleteHabit,
      toggleHabit,
    ],
  )

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  )
}

export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
