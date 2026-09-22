import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import {
  DEFAULT_MACRO_TARGETS,
  DEFAULT_PROCESS,
  DEFAULT_SAVED_MEALS,
} from '../data/defaults'
import { DEFAULT_RECIPES } from '../data/recipes'
import { DEFAULT_WORKOUT_DAYS } from '../data/workouts'
import { useLocalStorage } from '../hooks/useLocalStorage'
import type {
  CustomHabit,
  Exercise,
  FoodLogEntry,
  HabitChecks,
  MacroTargets,
  ProcessSettings,
  Recipe,
  SavedMeal,
  SetLog,
  WeightEntry,
  WorkoutDay,
} from '../lib/types'
import { todayKey, uid } from '../lib/types'

type AppDataContextValue = {
  macroTargets: MacroTargets
  setMacroTargets: (targets: MacroTargets) => void
  process: ProcessSettings
  setProcess: (settings: ProcessSettings) => void
  setLogs: SetLog[]
  weightLogs: WeightEntry[]
  foodLogs: FoodLogEntry[]
  habitChecks: HabitChecks
  habits: CustomHabit[]
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
  savedMeals: SavedMeal[]
  addSavedMeal: (meal: Omit<SavedMeal, 'id'>) => void
  updateSavedMeal: (id: string, patch: Partial<SavedMeal>) => void
  deleteSavedMeal: (id: string) => void
  recipes: Recipe[]
  setRecipes: (recipes: Recipe[]) => void
  addRecipe: (recipe: Omit<Recipe, 'id'>) => void
  importMealsAndRecipes: (meals: SavedMeal[], recipes: Recipe[]) => void
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

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [macroTargets, setMacroTargets] = useLocalStorage<MacroTargets>(
    'tn.macroTargets',
    DEFAULT_MACRO_TARGETS,
  )
  const [process, setProcess] = useLocalStorage<ProcessSettings>(
    'tn.process',
    DEFAULT_PROCESS,
  )
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
  const [workoutDays, setWorkoutDays] = useLocalStorage<WorkoutDay[]>(
    'tn.workoutDays.v2',
    DEFAULT_WORKOUT_DAYS,
  )
  const [savedMeals, setSavedMeals] = useLocalStorage<SavedMeal[]>(
    'tn.savedMeals.v2',
    DEFAULT_SAVED_MEALS,
  )
  const [recipes, setRecipes] = useLocalStorage<Recipe[]>(
    'tn.recipes.v2',
    DEFAULT_RECIPES,
  )

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

  const updateWorkoutDay = useCallback(
    (dayId: string, patch: Partial<WorkoutDay>) => {
      setWorkoutDays((prev) =>
        prev.map((d) => (d.id === dayId ? { ...d, ...patch } : d)),
      )
    },
    [setWorkoutDays],
  )

  const addExercise = useCallback(
    (dayId: string, exercise: Omit<Exercise, 'id'>) => {
      setWorkoutDays((prev) =>
        prev.map((d) =>
          d.id === dayId
            ? { ...d, exercises: [...d.exercises, { ...exercise, id: uid() }] }
            : d,
        ),
      )
    },
    [setWorkoutDays],
  )

  const updateExercise = useCallback(
    (dayId: string, exerciseId: string, patch: Partial<Exercise>) => {
      setWorkoutDays((prev) =>
        prev.map((d) =>
          d.id === dayId
            ? {
                ...d,
                exercises: d.exercises.map((e) =>
                  e.id === exerciseId ? { ...e, ...patch } : e,
                ),
              }
            : d,
        ),
      )
    },
    [setWorkoutDays],
  )

  const deleteExercise = useCallback(
    (dayId: string, exerciseId: string) => {
      setWorkoutDays((prev) =>
        prev.map((d) =>
          d.id === dayId
            ? {
                ...d,
                exercises: d.exercises.filter((e) => e.id !== exerciseId),
              }
            : d,
        ),
      )
    },
    [setWorkoutDays],
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
      macroTargets,
      setMacroTargets,
      process,
      setProcess,
      setLogs,
      weightLogs,
      foodLogs,
      habitChecks,
      habits,
      workoutDays,
      setWorkoutDays,
      updateWorkoutDay,
      addExercise,
      updateExercise,
      deleteExercise,
      savedMeals,
      addSavedMeal,
      updateSavedMeal,
      deleteSavedMeal,
      recipes,
      setRecipes,
      addRecipe,
      importMealsAndRecipes,
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
      macroTargets,
      setMacroTargets,
      process,
      setProcess,
      setLogs,
      weightLogs,
      foodLogs,
      habitChecks,
      habits,
      workoutDays,
      setWorkoutDays,
      updateWorkoutDay,
      addExercise,
      updateExercise,
      deleteExercise,
      savedMeals,
      addSavedMeal,
      updateSavedMeal,
      deleteSavedMeal,
      recipes,
      setRecipes,
      addRecipe,
      importMealsAndRecipes,
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
