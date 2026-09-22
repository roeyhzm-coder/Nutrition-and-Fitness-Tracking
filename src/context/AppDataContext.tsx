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
import { DEFAULT_RECIPES, DEFAULT_FOOD_CATEGORIES } from '../data/recipes'
import { ensureSeedTemplates } from '../data/workouts'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { pullAppState, pushAppState } from '../lib/appStateSync'
import {
  extractRecipeCategories,
  fetchRecipesFromSupabase,
} from '../lib/recipesApi'
import { isSupabaseConfigured } from '../lib/supabase'
import type {
  CustomHabit,
  Exercise,
  FoodCategory,
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
import {
  dayAllExercises,
  normalizeGoal,
  normalizeWorkoutDay,
  normalizeWorkoutProgram,
  todayKey,
  uid,
} from '../lib/types'
import {
  marksForWeekCount,
  type ConsistencyDayMarks,
} from '../lib/weeklyConsistency'

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
  consistencyDayMarks: ConsistencyDayMarks
  toggleConsistencyDay: (date: string) => void
  setWeekConsistencyCount: (weekStart: Date, count: number) => void
  weightLogs: WeightEntry[]
  foodLogs: FoodLogEntry[]
  habitChecks: HabitChecks
  habits: CustomHabit[]
  foodCategories: FoodCategory[]
  addFoodCategory: (label: string) => void
  updateFoodCategory: (id: string, label: string) => void
  deleteFoodCategory: (id: string) => void
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
  addExercise: (
    dayId: string,
    exercise: Omit<Exercise, 'id'>,
    sessionId?: string | null,
  ) => void
  updateExercise: (
    dayId: string,
    exerciseId: string,
    patch: Partial<Exercise>,
  ) => void
  deleteExercise: (dayId: string, exerciseId: string) => void
  removeDaySession: (dayId: string, sessionId: string) => void
  workoutTemplates: WorkoutTemplate[]
  addWorkoutTemplate: (
    template: Omit<WorkoutTemplate, 'id' | 'updatedAt'>,
  ) => string
  updateWorkoutTemplate: (
    id: string,
    patch: Partial<Pick<WorkoutTemplate, 'name' | 'exercises'>>,
  ) => void
  deleteWorkoutTemplate: (id: string) => void
  /** Attach (append) a library template as a new session on the day. */
  assignTemplateToDay: (
    dayId: string,
    templateId: string,
    exercisesOverride?: Exercise[],
  ) => void
  attachTemplateToDay: (
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
  const [workoutProgramsRaw, setWorkoutProgramsRaw] = useLocalStorage<
    WorkoutProgram[]
  >('tn.workoutPrograms.v1', defaults)
  const [activeProgramId, setActiveProgramIdState] = useLocalStorage<string>(
    'tn.activeProgramId.v1',
    defaults[0]?.id ?? '',
  )
  const [workoutTemplates, setWorkoutTemplates] = useLocalStorage<
    WorkoutTemplate[]
  >('tn.workoutTemplates.v1', [])
  const [librarySeeded, setLibrarySeeded] = useLocalStorage<boolean>(
    'tn.librarySeeded.v1',
    false,
  )

  const setWorkoutPrograms = useCallback(
    (
      next:
        | WorkoutProgram[]
        | ((prev: WorkoutProgram[]) => WorkoutProgram[]),
    ) => {
      setWorkoutProgramsRaw((prev) => {
        const normalizedPrev = prev.map(normalizeWorkoutProgram)
        const resolved =
          typeof next === 'function' ? next(normalizedPrev) : next
        return resolved.map(normalizeWorkoutProgram)
      })
    },
    [setWorkoutProgramsRaw],
  )

  const workoutPrograms = useMemo(
    () => workoutProgramsRaw.map(normalizeWorkoutProgram),
    [workoutProgramsRaw],
  )

  const [setLogs, setSetLogs] = useLocalStorage<SetLog[]>('tn.setLogs', [])
  const [consistencyDayMarks, setConsistencyDayMarks] =
    useLocalStorage<ConsistencyDayMarks>('tn.consistencyDayMarks.v1', {})
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
  const [foodCategories, setFoodCategories] = useLocalStorage<FoodCategory[]>(
    'tn.foodCategories.v1',
    DEFAULT_FOOD_CATEGORIES,
  )
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

  useEffect(() => {
    if (librarySeeded) return
    setWorkoutTemplates((prev) => {
      const { templates } = ensureSeedTemplates(prev, false)
      return templates
    })
    setLibrarySeeded(true)
  }, [librarySeeded, setWorkoutTemplates, setLibrarySeeded])

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
    (
      dayId: string,
      exercise: Omit<Exercise, 'id'>,
      sessionId?: string | null,
    ) => {
      if (!activeProgram) return
      const nextEx = { ...exercise, id: uid() }
      setWorkoutPrograms((prev) =>
        updateActiveProgramDays(prev, activeProgram.id, (days) =>
          days.map((d) => {
            if (d.id !== dayId) return d
            const day = normalizeWorkoutDay(d)
            if (sessionId) {
              return {
                ...day,
                sessions: day.sessions.map((s) =>
                  s.id === sessionId
                    ? { ...s, exercises: [...s.exercises, nextEx] }
                    : s,
                ),
              }
            }
            return {
              ...day,
              exercises: [...day.exercises, nextEx],
            }
          }),
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
          days.map((d) => {
            if (d.id !== dayId) return d
            const day = normalizeWorkoutDay(d)
            return {
              ...day,
              sessions: day.sessions.map((s) => ({
                ...s,
                exercises: s.exercises.map((e) =>
                  e.id === exerciseId ? { ...e, ...patch } : e,
                ),
              })),
              exercises: day.exercises.map((e) =>
                e.id === exerciseId ? { ...e, ...patch } : e,
              ),
            }
          }),
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
          days.map((d) => {
            if (d.id !== dayId) return d
            const day = normalizeWorkoutDay(d)
            return {
              ...day,
              sessions: day.sessions.map((s) => ({
                ...s,
                exercises: s.exercises.filter((e) => e.id !== exerciseId),
              })),
              exercises: day.exercises.filter((e) => e.id !== exerciseId),
            }
          }),
        ),
      )
    },
    [activeProgram, setWorkoutPrograms],
  )

  const removeDaySession = useCallback(
    (dayId: string, sessionId: string) => {
      if (!activeProgram) return
      setWorkoutPrograms((prev) =>
        updateActiveProgramDays(prev, activeProgram.id, (days) =>
          days.map((d) => {
            if (d.id !== dayId) return d
            const day = normalizeWorkoutDay(d)
            return {
              ...day,
              sessions: day.sessions.filter((s) => s.id !== sessionId),
            }
          }),
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
      const sessionName = template?.name ?? 'אימון'
      setWorkoutPrograms((prev) =>
        updateActiveProgramDays(prev, activeProgram.id, (days) =>
          days.map((d) => {
            if (d.id !== dayId) return d
            const day = normalizeWorkoutDay(d)
            return {
              ...day,
              sessions: [
                ...day.sessions,
                {
                  id: uid(),
                  name: sessionName,
                  sourceTemplateId: templateId,
                  exercises: source.map((ex) => ({ ...ex, id: uid() })),
                },
              ],
            }
          }),
        ),
      )
    },
    [activeProgram, workoutTemplates, setWorkoutPrograms],
  )

  const attachTemplateToDay = assignTemplateToDay

  const saveDayAsTemplate = useCallback(
    (dayId: string, name: string) => {
      const day = activeProgram?.days.find((d) => d.id === dayId)
      if (!day) return
      const normalized = normalizeWorkoutDay(day)
      addWorkoutTemplate({
        name: name.trim() || day.title,
        exercises: dayAllExercises(normalized).map((ex) => ({
          ...ex,
          id: uid(),
        })),
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

  const toggleConsistencyDay = useCallback(
    (date: string) => {
      setConsistencyDayMarks((prev) => {
        const logHas = setLogs.some((s) => s.loggedAt.startsWith(date))
        const current = Object.prototype.hasOwnProperty.call(prev, date)
          ? prev[date]
          : logHas
        return { ...prev, [date]: !current }
      })
    },
    [setConsistencyDayMarks, setLogs],
  )

  const setWeekConsistencyCount = useCallback(
    (weekStart: Date, count: number) => {
      setConsistencyDayMarks((prev) => marksForWeekCount(weekStart, count, prev))
    },
    [setConsistencyDayMarks],
  )

  const addFoodCategory = useCallback(
    (label: string) => {
      const trimmed = label.trim()
      if (!trimmed) return
      setFoodCategories((prev) => {
        if (prev.some((c) => c.label === trimmed)) return prev
        return [...prev, { id: uid(), label: trimmed }]
      })
    },
    [setFoodCategories],
  )

  const updateFoodCategory = useCallback(
    (id: string, label: string) => {
      const trimmed = label.trim()
      if (!trimmed) return
      setFoodCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, label: trimmed } : c)),
      )
    },
    [setFoodCategories],
  )

  const deleteFoodCategory = useCallback(
    (id: string) => {
      setFoodCategories((prev) => {
        if (prev.length <= 1) return prev
        return prev.filter((c) => c.id !== id)
      })
    },
    [setFoodCategories],
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
      const fromRecipes = extractRecipeCategories(remote)
      if (fromRecipes.length > 0) {
        setFoodCategories((prev) => {
          const existing = new Set(prev.map((c) => c.label.toLowerCase()))
          const extras = fromRecipes
            .filter((label) => !existing.has(label.toLowerCase()))
            .map((label) => ({ id: uid(), label }))
          return extras.length ? [...prev, ...extras] : prev
        })
      }
      setRecipesSyncStatus('synced')
    } catch (err) {
      setRecipesSyncStatus('error')
      setRecipesSyncError(
        err instanceof Error ? err.message : 'סנכרון המתכונים נכשל',
      )
    }
  }, [setRecipes, setFoodCategories])

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
        setWorkoutPrograms(
          remote.workoutPrograms.map(normalizeWorkoutProgram),
        )
        setActiveProgramIdState(
          remote.activeProgramId || remote.workoutPrograms[0].id,
        )
      }
      if (remote.workoutTemplates) {
        if (!librarySeeded && remote.workoutTemplates.length === 0) {
          const { templates, seeded } = ensureSeedTemplates([], false)
          setWorkoutTemplates(templates)
          setLibrarySeeded(seeded)
        } else {
          setWorkoutTemplates(remote.workoutTemplates)
          if (!librarySeeded) setLibrarySeeded(true)
        }
      }
      if (remote.consistencyDayMarks) {
        setConsistencyDayMarks(remote.consistencyDayMarks)
      }
      if (remote.foodCategories?.length) {
        setFoodCategories(remote.foodCategories)
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
    setLibrarySeeded,
    setConsistencyDayMarks,
    setFoodCategories,
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
        consistencyDayMarks,
        foodCategories,
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
    consistencyDayMarks,
    foodCategories,
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
      consistencyDayMarks,
      toggleConsistencyDay,
      setWeekConsistencyCount,
      weightLogs,
      foodLogs,
      habitChecks,
      habits,
      foodCategories,
      addFoodCategory,
      updateFoodCategory,
      deleteFoodCategory,
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
      removeDaySession,
      workoutTemplates,
      addWorkoutTemplate,
      updateWorkoutTemplate,
      deleteWorkoutTemplate,
      assignTemplateToDay,
      attachTemplateToDay,
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
      consistencyDayMarks,
      toggleConsistencyDay,
      setWeekConsistencyCount,
      weightLogs,
      foodLogs,
      habitChecks,
      habits,
      foodCategories,
      addFoodCategory,
      updateFoodCategory,
      deleteFoodCategory,
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
      removeDaySession,
      workoutTemplates,
      addWorkoutTemplate,
      updateWorkoutTemplate,
      deleteWorkoutTemplate,
      assignTemplateToDay,
      attachTemplateToDay,
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
