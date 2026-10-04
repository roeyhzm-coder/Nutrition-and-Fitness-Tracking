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
  applySeedWeightLogs,
  DEFAULT_GOAL,
  DEFAULT_PHASE,
  DEFAULT_PHASE_MACROS,
  DEFAULT_PROFILE,
  loadPresetMeals,
  mergeSavedMeals,
  seedSavedMealsIfEmpty,
  CATALOG_SEED_KEY,
  PLAN_SEED_KEY,
  PLAN_SEED_VERSION,
  normalizeMacroPresets,
} from '../data/defaults'
import {
  createHistoryEntry,
  deleteRemotePhaseHistory,
  pullPhaseHistory,
  pushPhaseHistory,
  sortHistory,
  summarizePhase,
} from '../lib/phaseHistory'
import {
  deleteRemoteRoutine,
  normalizeRoutine,
  pullRoutines,
  pushRoutines,
  sortRoutines,
  toggleCompletedDate,
} from '../lib/routines'
import {
  mergeFocusTracks,
  newFocusTrack,
  seedFocusTracksIfEmpty,
  normalizeFocusTrack,
  sortFocusTracks,
} from '../lib/focusTracks'
import { DEFAULT_FOOD_CATEGORIES, mergeRecipes, seedRecipesIfEmpty } from '../data/recipes'
import {
  OFFICIAL_PLAN_VERSION,
  ensureOfficialPlan,
  backfillProgramMedia,
  isStalePlan,
  officialBlockForProgram,
  officialDayFor,
} from '../data/workouts'
import { useLocalStorage } from '../hooks/useLocalStorage'
import {
  onWindowResume,
  countNewById,
  isMobileClient,
  pullAppState,
  pushAppState,
  shouldKeepLocalList,
  subscribeSharedSync,
  unionById,
  type SyncedAppState,
} from '../lib/appStateSync'
import {
  extractRecipeCategories,
  fetchRecipesFromSupabase,
} from '../lib/recipesApi'
import { latestDateKey, readLastAiExportAt } from '../lib/aiCheckin'
import { hydrateServingPresets } from '../lib/servingPresets'
import { isSupabaseConfigured } from '../lib/supabase'
import type {
  ActivityLog,
  CustomHabit,
  Exercise,
  FocusTrack,
  FoodCategory,
  FoodLogEntry,
  GoalSettings,
  HabitChecks,
  LifestyleEntry,
  LifestyleLogs,
  MacroTargets,
  Phase,
  PhaseHistoryEntry,
  PhaseMacroPresets,
  Recipe,
  Routine,
  SavedMeal,
  SetLog,
  UserProfile,
  WeightEntry,
  DayPlan,
  WorkoutDay,
  WorkoutProgram,
  WorkoutTemplate,
} from '../lib/types'
import {
  dayAllExercises,
  normalizeGoal,
  normalizeProfile,
  normalizeWorkoutDay,
  normalizeWorkoutProgram,
  todayKey,
  toLoggedAt,
  uid,
} from '../lib/types'
import {
  marksForWeekCount,
  type ConsistencyDayAssignment,
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
  setConsistencyDayMark: (date: string, mark: ConsistencyDayAssignment) => void
  setWeekConsistencyCount: (weekStart: Date, count: number) => void
  weightLogs: WeightEntry[]
  foodLogs: FoodLogEntry[]
  habitChecks: HabitChecks
  habits: CustomHabit[]
  routines: Routine[]
  addRoutine: (
    input: Omit<Routine, 'id' | 'createdAt' | 'completedDates'>,
  ) => Routine
  updateRoutine: (
    id: string,
    patch: Partial<Omit<Routine, 'id' | 'createdAt' | 'completedDates'>>,
  ) => void
  deleteRoutine: (id: string) => void
  toggleRoutineDate: (id: string, date: string) => void
  focusTracks: FocusTrack[]
  addFocusTrack: (
    input: Omit<FocusTrack, 'id' | 'createdAt' | 'completedDates' | 'archivedAt'> & {
      archivedAt?: string | null
    },
  ) => FocusTrack
  updateFocusTrack: (id: string, patch: Partial<Omit<FocusTrack, 'id' | 'createdAt'>>) => void
  deleteFocusTrack: (id: string) => void
  toggleFocusTrackDate: (id: string, date: string) => void
  foodCategories: FoodCategory[]
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
    patch: Partial<Pick<WorkoutTemplate, 'name' | 'exercises' | 'estimatedCalories'>>,
  ) => void
  deleteWorkoutTemplate: (id: string) => void
  /** Replace the day's workout with a library template. */
  assignTemplateToDay: (
    dayId: string,
    templateId: string,
    exercisesOverride?: Exercise[],
  ) => void
  /** Append a library template as an extra session on the day. */
  attachTemplateToDay: (
    dayId: string,
    templateId: string,
    exercisesOverride?: Exercise[],
  ) => void
  saveDayAsTemplate: (dayId: string, name: string) => void
  /** Set a weekday to a library workout, rest, or empty. */
  setDayPlan: (dayId: string, plan: DayPlan) => void
  /** Restore this weekday to the original official weekly plan. */
  resetDayToOfficialPlan: (dayId: string) => void
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
  lastSyncNotice: { type: 'ok' | 'error'; message: string } | null
  clearSyncNotice: () => void
  syncNow: () => Promise<{ ok: boolean; uploaded: number; error?: string }>
  addSetLog: (entry: Omit<SetLog, 'id' | 'loggedAt'>) => void
  addWeight: (input: {
    weightKg: number
    bodyFatPct?: number | null
    note?: string
    loggedAt?: string
  }) => void
  addBodyFat: (input: { bodyFatPct: number; loggedAt?: string }) => void
  addFood: (entry: Omit<FoodLogEntry, 'id' | 'loggedAt'>) => void
  updateFood: (
    id: string,
    patch: Partial<Omit<FoodLogEntry, 'id' | 'loggedAt'>>,
  ) => void
  deleteFood: (id: string) => void
  logSavedMeal: (mealId: string) => boolean
  addHabit: (label: string) => void
  updateHabit: (id: string, label: string) => void
  deleteHabit: (id: string) => void
  toggleHabit: (itemId: string) => void
  profile: UserProfile
  setProfile: (profile: UserProfile) => void
  activityLogs: ActivityLog[]
  addActivityLog: (entry: Omit<ActivityLog, 'id' | 'loggedAt'> & {
    loggedAt?: string
  }) => void
  deleteActivityLog: (id: string) => void
  lifestyleLogs: LifestyleLogs
  setLifestyleEntry: (date: string, entry: LifestyleEntry) => void
  phaseHistory: PhaseHistoryEntry[]
  finishPhase: (next: NewPhaseInput) => PhaseHistoryEntry
  deletePhaseHistory: (id: string) => void
}

export type NewPhaseInput = {
  phase: Phase
  phaseName?: string
  totalDays: number
  targetWeightKg: number | null
  targetBodyFatPct: number | null
  startWeightKg?: number | null
  macros: MacroTargets
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

const PROGRAMS_KEY = 'tn.workoutPrograms.v1'
const ACTIVE_PROGRAM_KEY = 'tn.activeProgramId.v1'
const TEMPLATES_KEY = 'tn.workoutTemplates.v1'
const PLAN_VERSION_KEY = 'tn.officialPlanVersion'

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

/**
 * Runs before the stored workout state is read, so the first render already
 * shows the official plan instead of stale defaults.
 */
function migrateStoredPlan() {
  const version = Number(localStorage.getItem(PLAN_VERSION_KEY) ?? 0)
  const stored = {
    programs: readStored<WorkoutProgram[]>(PROGRAMS_KEY, []),
    templates: readStored<WorkoutTemplate[]>(TEMPLATES_KEY, []),
    activeProgramId: readStored<string>(ACTIVE_PROGRAM_KEY, ''),
  }
  if (!isStalePlan(stored)) {
    if (version < OFFICIAL_PLAN_VERSION) {
      localStorage.setItem(PLAN_VERSION_KEY, String(OFFICIAL_PLAN_VERSION))
    }
    return
  }
  const plan = ensureOfficialPlan(stored)
  localStorage.setItem(PROGRAMS_KEY, JSON.stringify(plan.programs))
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(plan.templates))
  localStorage.setItem(ACTIVE_PROGRAM_KEY, JSON.stringify(plan.activeProgramId))
  localStorage.setItem(PLAN_VERSION_KEY, String(OFFICIAL_PLAN_VERSION))
  localStorage.removeItem('tn.librarySeeded.v1')
  localStorage.removeItem('tn.librarySeedVersion.v1')
}

function needsPlanSeed() {
  return Number(localStorage.getItem(PLAN_SEED_KEY) ?? 0) < PLAN_SEED_VERSION
}

function markPlanSeeded() {
  localStorage.setItem(PLAN_SEED_KEY, String(PLAN_SEED_VERSION))
}

function needsCatalogSeed() {
  return (
    localStorage.getItem(CATALOG_SEED_KEY) == null &&
    localStorage.getItem('user_preset_meals') == null &&
    localStorage.getItem('tn.recipes.v3') == null
  )
}

function markCatalogSeeded() {
  localStorage.setItem(CATALOG_SEED_KEY, '1')
}

/** Writes Phase 1 / master-plan targets before the first React read. */
function migratePlanTargets() {
  if (!needsPlanSeed()) return
  localStorage.setItem('tn.goal.v2', JSON.stringify(DEFAULT_GOAL))
  localStorage.setItem('tn.phase', JSON.stringify(DEFAULT_PHASE))
  localStorage.setItem(
    'tn.macroPresets.v1',
    JSON.stringify(DEFAULT_PHASE_MACROS),
  )
  localStorage.setItem('tn.profile.v1', JSON.stringify(DEFAULT_PROFILE))
  localStorage.setItem('tn.consistencyDayMarks.v1', JSON.stringify({}))
  const weights = readStored<WeightEntry[]>('tn.weightLogs', [])
  localStorage.setItem(
    'tn.weightLogs',
    JSON.stringify(applySeedWeightLogs(weights)),
  )
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  useState(migrateStoredPlan)
  useState(migratePlanTargets)
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
  const [macroPresetsRaw, setMacroPresetsRaw] =
    useLocalStorage<PhaseMacroPresets>('tn.macroPresets.v1', DEFAULT_PHASE_MACROS)
  const macroPresets = useMemo(
    () => normalizeMacroPresets(macroPresetsRaw),
    [macroPresetsRaw],
  )
  const setMacroPresets = useCallback(
    (
      next:
        | PhaseMacroPresets
        | ((prev: PhaseMacroPresets) => PhaseMacroPresets),
    ) => {
      setMacroPresetsRaw((prev) =>
        normalizeMacroPresets(
          typeof next === 'function' ? next(normalizeMacroPresets(prev)) : next,
        ),
      )
    },
    [setMacroPresetsRaw],
  )
  const [phaseHistory, setPhaseHistory] = useLocalStorage<PhaseHistoryEntry[]>(
    'tn.phaseHistory.v1',
    [],
  )
  const [workoutProgramsRaw, setWorkoutProgramsRaw] = useLocalStorage<
    WorkoutProgram[]
  >(PROGRAMS_KEY, defaults)
  const [activeProgramId, setActiveProgramIdState] = useLocalStorage<string>(
    ACTIVE_PROGRAM_KEY,
    defaults[0]?.id ?? '',
  )
  const [workoutTemplates, setWorkoutTemplates] = useLocalStorage<
    WorkoutTemplate[]
  >(TEMPLATES_KEY, [])

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
  const [routines, setRoutines] = useLocalStorage<Routine[]>('tn.routines.v1', [])
  const [focusTracks, setFocusTracks] = useLocalStorage<FocusTrack[]>(
    'tn.focusTracks.v1',
    [],
  )
  const [foodCategories, setFoodCategories] = useLocalStorage<FoodCategory[]>(
    'tn.foodCategories.v1',
    DEFAULT_FOOD_CATEGORIES,
  )
  const [savedMeals, setSavedMeals] = useLocalStorage<SavedMeal[]>(
    'user_preset_meals',
    loadPresetMeals(),
  )
  const [recipes, setRecipes] = useLocalStorage<Recipe[]>(
    'tn.recipes.v3',
    [],
  )
  const [profileRaw, setProfileRaw] = useLocalStorage<UserProfile>(
    'tn.profile.v1',
    DEFAULT_PROFILE,
  )
  const profile = useMemo(() => normalizeProfile(profileRaw), [profileRaw])
  const setProfile = useCallback(
    (next: UserProfile) => setProfileRaw(normalizeProfile(next)),
    [setProfileRaw],
  )
  const [activityLogs, setActivityLogs] = useLocalStorage<ActivityLog[]>(
    'tn.activityLogs.v1',
    [],
  )
  const [lifestyleLogs, setLifestyleLogs] = useLocalStorage<LifestyleLogs>(
    'tn.lifestyleLogs.v1',
    {},
  )
  const [recipesSyncStatus, setRecipesSyncStatus] =
    useState<RecipesSyncStatus>('idle')
  const [recipesSyncError, setRecipesSyncError] = useState<string | null>(null)
  const [stateSyncStatus, setStateSyncStatus] = useState<
    'idle' | 'syncing' | 'synced' | 'error'
  >('idle')
  const [lastSyncNotice, setLastSyncNotice] = useState<{
    type: 'ok' | 'error'
    message: string
  } | null>(null)
  const hydratedRef = useRef(false)
  const skipNextPush = useRef(false)
  const localDirtyRef = useRef(false)
  const flushTimerRef = useRef<number>(0)
  const snapshotRef = useRef<Omit<SyncedAppState, 'updatedAt'> | null>(null)

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
      patch: Partial<Pick<WorkoutTemplate, 'name' | 'exercises' | 'estimatedCalories'>>,
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
            return {
              ...normalizeWorkoutDay(d),
              isRest: false,
              focus: sessionName,
              exercises: [],
              sessions: [
                {
                  id: uid(),
                  name: sessionName,
                  sourceTemplateId: templateId,
                  estimatedCalories: template?.estimatedCalories ?? null,
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

  const attachTemplateToDay = useCallback(
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
              isRest: false,
              sessions: [
                ...day.sessions,
                {
                  id: uid(),
                  name: sessionName,
                  sourceTemplateId: templateId,
                  estimatedCalories: template?.estimatedCalories ?? null,
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

  const setDayPlan = useCallback(
    (dayId: string, plan: DayPlan) => {
      if (!activeProgram) return
      const template =
        plan.type === 'template'
          ? workoutTemplates.find((t) => t.id === plan.templateId)
          : undefined
      if (plan.type === 'template' && !template) return
      setWorkoutPrograms((prev) =>
        updateActiveProgramDays(prev, activeProgram.id, (days) =>
          days.map((d) => {
            if (d.id !== dayId) return d
            if (plan.type === 'rest') {
              return { ...d, isRest: true, focus: 'מנוחה', sessions: [], exercises: [] }
            }
            if (!template) {
              return { ...d, isRest: false, focus: '', sessions: [], exercises: [] }
            }
            return {
              ...d,
              isRest: false,
              focus: template.name,
              sessions: [
                {
                  id: uid(),
                  name: template.name,
                  sourceTemplateId: template.id,
                  estimatedCalories: template.estimatedCalories ?? null,
                  exercises: template.exercises.map((ex) => ({ ...ex, id: uid() })),
                },
              ],
            }
          }),
        ),
      )
    },
    [activeProgram, workoutTemplates, setWorkoutPrograms],
  )

  const resetDayToOfficialPlan = useCallback(
    (dayId: string) => {
      if (!activeProgram) return
      const current = activeProgram.days.find((d) => d.id === dayId)
      if (!current) return
      const official = officialDayFor(
        current.dayNumber,
        officialBlockForProgram(activeProgram.id),
      )
      setWorkoutPrograms((prev) =>
        updateActiveProgramDays(prev, activeProgram.id, (days) =>
          days.map((d) => {
            if (d.id !== dayId) return d
            return {
              ...official,
              id: d.id,
              dayNumber: d.dayNumber,
              title: d.title,
            }
          }),
        ),
      )
    },
    [activeProgram, setWorkoutPrograms],
  )

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
        const done =
          typeof current === 'boolean' ? current : current?.done === true
        return { ...prev, [date]: { done: !done } }
      })
    },
    [setConsistencyDayMarks, setLogs],
  )

  const setConsistencyDayMark = useCallback(
    (date: string, mark: ConsistencyDayAssignment) => {
      setConsistencyDayMarks((prev) => ({ ...prev, [date]: mark }))
    },
    [setConsistencyDayMarks],
  )

  const setWeekConsistencyCount = useCallback(
    (weekStart: Date, count: number) => {
      setConsistencyDayMarks((prev) => marksForWeekCount(weekStart, count, prev))
    },
    [setConsistencyDayMarks],
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
      if (remote.length > 0) {
        setRecipes((prev) => {
          if (prev.length === 0 && needsCatalogSeed()) {
            markCatalogSeeded()
            return mergeRecipes(remote)
          }
          const byId = new Map(remote.map((row) => [row.id, row]))
          return prev.map((row) => byId.get(row.id) ?? row)
        })
      }
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
    void hydrateServingPresets()
  }, [])

  snapshotRef.current = {
    phase,
    goal,
    macroPresets,
    activeProgramId: activeProgram?.id ?? activeProgramId,
    workoutPrograms,
    workoutTemplates,
    consistencyDayMarks,
    foodCategories,
    savedMeals,
    recipes,
    foodLogs,
    weightLogs,
    profile,
    activityLogs,
    lifestyleLogs,
    routines,
    focusTracks,
  }

  const flushCloud = useCallback(
    async (
      reason: string,
      patch?: Partial<Omit<SyncedAppState, 'updatedAt'>>,
    ) => {
      const current = snapshotRef.current
      if (!current) return false
      const next = { ...current, ...patch }
      snapshotRef.current = next
      setStateSyncStatus('syncing')
      const result = await pushAppState(next)
      if (result.ok) {
        localDirtyRef.current = false
        setStateSyncStatus('synced')
      } else {
        console.error('[AppData] cloud flush failed', reason, result.error)
        setStateSyncStatus('error')
        const message = result.error ?? 'סנכרון הענן נכשל'
        setLastSyncNotice({ type: 'error', message })
      }
      return result.ok
    },
    [],
  )

  const scheduleFlush = useCallback(
    (reason: string, patch?: Partial<Omit<SyncedAppState, 'updatedAt'>>) => {
      localDirtyRef.current = true
      if (patch && snapshotRef.current) {
        snapshotRef.current = { ...snapshotRef.current, ...patch }
      }
      window.clearTimeout(flushTimerRef.current)
      flushTimerRef.current = window.setTimeout(() => {
        void flushCloud(reason)
      }, 120)
    },
    [flushCloud],
  )

  const applyRemoteState = useCallback(
    (remote: SyncedAppState) => {
      skipNextPush.current = true
      setPhaseState(remote.phase)
      setGoal(normalizeGoal(remote.goal))
      setMacroPresets(remote.macroPresets)
      const remotePlan = {
        programs: (remote.workoutPrograms ?? []).map(normalizeWorkoutProgram),
        templates:
          remote.workoutTemplates ??
          readStored<WorkoutTemplate[]>(TEMPLATES_KEY, []),
        activeProgramId: remote.activeProgramId,
      }
      const remoteStale = isStalePlan(remotePlan)
      const plan = remoteStale
        ? ensureOfficialPlan(remotePlan)
        : {
            ...remotePlan,
            programs: backfillProgramMedia(remotePlan.programs),
            activeProgramId:
              remotePlan.activeProgramId || remotePlan.programs[0]?.id || '',
          }
      if (remoteStale) skipNextPush.current = false
      if (plan.programs.length) {
        setWorkoutPrograms(plan.programs)
        setActiveProgramIdState(plan.activeProgramId)
      }
      if (remote.workoutTemplates) setWorkoutTemplates(plan.templates)
      if (remote.consistencyDayMarks) {
        setConsistencyDayMarks(remote.consistencyDayMarks)
      }
      if (remote.foodCategories !== undefined && remote.foodCategories.length) {
        setFoodCategories(remote.foodCategories)
      }
      if (remote.savedMeals !== undefined) {
        setSavedMeals((local) => {
          if (shouldKeepLocalList(local, remote.savedMeals, localDirtyRef.current)) {
            skipNextPush.current = false
            localDirtyRef.current = true
            return local
          }
          markCatalogSeeded()
          return mergeSavedMeals(remote.savedMeals ?? [])
        })
      } else if (needsCatalogSeed()) {
        setSavedMeals((prev) => seedSavedMealsIfEmpty(prev))
        markCatalogSeeded()
      }
      if (remote.recipes !== undefined) {
        setRecipes((local) => {
          if (shouldKeepLocalList(local, remote.recipes, localDirtyRef.current)) {
            skipNextPush.current = false
            localDirtyRef.current = true
            return local
          }
          return mergeRecipes(remote.recipes ?? [])
        })
      }
      if (remote.foodLogs !== undefined) {
        setFoodLogs((local) => {
          if (shouldKeepLocalList(local, remote.foodLogs, localDirtyRef.current)) {
            skipNextPush.current = false
            localDirtyRef.current = true
            return local
          }
          return remote.foodLogs ?? local
        })
      }
      if (remote.weightLogs !== undefined) {
        setWeightLogs(
          [...remote.weightLogs].sort((a, b) =>
            a.loggedAt.localeCompare(b.loggedAt),
          ),
        )
      }
      if (remote.profile) {
        setProfileRaw(
          normalizeProfile({
            ...remote.profile,
            lastAiExportAt: latestDateKey(
              remote.profile.lastAiExportAt,
              readLastAiExportAt(),
            ),
          }),
        )
      }
      if (remote.activityLogs !== undefined) {
        setActivityLogs(remote.activityLogs)
      }
      if (remote.lifestyleLogs !== undefined) {
        setLifestyleLogs(remote.lifestyleLogs)
      }
      if (remote.routines !== undefined) {
        setRoutines(
          sortRoutines(
            (remote.routines ?? [])
              .map((row) => normalizeRoutine(row))
              .filter((row): row is Routine => Boolean(row)),
          ),
        )
      }
      if (remote.focusTracks !== undefined) {
        setFocusTracks((local) =>
          mergeFocusTracks(local, remote.focusTracks ?? []),
        )
      }
    },
    [
      setPhaseState,
      setGoal,
      setMacroPresets,
      setWorkoutPrograms,
      setActiveProgramIdState,
      setWorkoutTemplates,
      setConsistencyDayMarks,
      setFoodCategories,
      setSavedMeals,
      setRecipes,
      setFoodLogs,
      setWeightLogs,
      setProfileRaw,
      setActivityLogs,
      setLifestyleLogs,
      setRoutines,
      setFocusTracks,
    ],
  )

  const clearSyncNotice = useCallback(() => setLastSyncNotice(null), [])

  const syncNow = useCallback(async () => {
    const local = snapshotRef.current
    if (!local) {
      const message = 'אין נתונים מקומיים לסנכרון'
      setLastSyncNotice({ type: 'error', message })
      window.alert(message)
      return { ok: false, uploaded: 0, error: message }
    }

    setStateSyncStatus('syncing')
    const remote = await pullAppState()
    const nextFoodLogs = unionById(local.foodLogs, remote?.foodLogs)
    const nextSavedMeals = unionById(local.savedMeals, remote?.savedMeals)
    const nextRecipes = unionById(local.recipes, remote?.recipes)
    const uploaded =
      countNewById(local.foodLogs, remote?.foodLogs) +
      countNewById(local.savedMeals, remote?.savedMeals) +
      countNewById(local.recipes, remote?.recipes)
    const merged = {
      ...local,
      foodLogs: nextFoodLogs,
      savedMeals: nextSavedMeals,
      recipes: nextRecipes,
    }
    snapshotRef.current = merged
    skipNextPush.current = true
    setFoodLogs(nextFoodLogs)
    setSavedMeals(nextSavedMeals)
    setRecipes(nextRecipes)

    const result = await pushAppState(merged)
    if (!result.ok) {
      const message = result.error ?? 'ה-upsert לענן נכשל'
      setStateSyncStatus('error')
      setLastSyncNotice({ type: 'error', message })
      window.alert(message)
      return { ok: false, uploaded: 0, error: message }
    }

    if (!isMobileClient() && remote) {
      applyRemoteState({
        ...remote,
        foodLogs: nextFoodLogs,
        savedMeals: nextSavedMeals,
        recipes: nextRecipes,
      })
    }

    localDirtyRef.current = false
    setStateSyncStatus('synced')
    const written = result.foodLogs + result.savedMeals + result.recipes
    const shown = Math.max(uploaded, written, nextFoodLogs.length)
    const message = `סונכרן בהצלחה! הועלו ${shown} רשומות לענן`
    setLastSyncNotice({ type: 'ok', message })
    return { ok: true, uploaded: shown }
  }, [applyRemoteState, setFoodLogs, setSavedMeals, setRecipes])

  const hydrateFromCloud = useCallback(
    async (reason: 'load' | 'refetch') => {
      if (localDirtyRef.current) {
        await flushCloud(`before-${reason}`)
      }
      const remote = await pullAppState()
      if (!remote) {
        if (reason === 'load' && needsPlanSeed()) {
          setPhaseState(DEFAULT_PHASE)
          setGoal(DEFAULT_GOAL)
          setMacroPresets(DEFAULT_PHASE_MACROS)
          setProfileRaw(DEFAULT_PROFILE)
          setWeightLogs((prev) => applySeedWeightLogs(prev))
          markPlanSeeded()
        }
        if (reason === 'load' && needsCatalogSeed()) {
          setSavedMeals((prev) => seedSavedMealsIfEmpty(prev))
          setRecipes((prev) => seedRecipesIfEmpty(prev))
          setFocusTracks((prev) => seedFocusTracksIfEmpty(prev))
          markCatalogSeeded()
        }
        hydratedRef.current = true
        if (reason === 'load') {
          setStateSyncStatus(isSupabaseConfigured ? 'error' : 'idle')
        }
        return
      }
      applyRemoteState(remote)
      if (needsPlanSeed()) markPlanSeeded()
      hydratedRef.current = true
      if (localDirtyRef.current) {
        await flushCloud('hydrate-adopt-local-nutrition')
        return
      }
      setStateSyncStatus('synced')
    },
    [
      applyRemoteState,
      flushCloud,
      setPhaseState,
      setGoal,
      setMacroPresets,
      setProfileRaw,
      setWeightLogs,
    ],
  )

  useEffect(() => {
    let cancelled = false
    void hydrateFromCloud('load').then(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
  }, [hydrateFromCloud])

  useEffect(() => {
    const refetch = () => {
      if (!hydratedRef.current) return
      void hydrateFromCloud('refetch')
    }
    const stopRealtime = subscribeSharedSync(refetch, 'app-state')
    const stopResume = onWindowResume(refetch)
    return () => {
      stopRealtime()
      stopResume()
    }
  }, [hydrateFromCloud])

  useEffect(() => {
    if (!hydratedRef.current) return
    if (skipNextPush.current) {
      skipNextPush.current = false
      return
    }
    scheduleFlush('state-change')
  }, [
    phase,
    goal,
    macroPresets,
    activeProgramId,
    workoutPrograms,
    workoutTemplates,
    consistencyDayMarks,
    foodCategories,
    savedMeals,
    recipes,
    foodLogs,
    weightLogs,
    profile,
    activityLogs,
    lifestyleLogs,
    routines,
    focusTracks,
    scheduleFlush,
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
      loggedAt?: string
    }) => {
      setWeightLogs((prev) => [
        ...prev,
        {
          id: uid(),
          weightKg: input.weightKg,
          bodyFatPct: input.bodyFatPct ?? null,
          note: input.note,
          loggedAt: toLoggedAt(input.loggedAt),
        },
      ])
    },
    [setWeightLogs],
  )

  const addBodyFat = useCallback(
    (input: { bodyFatPct: number; loggedAt?: string }) => {
      const loggedAt = toLoggedAt(input.loggedAt)
      const day = loggedAt.slice(0, 10)
      setWeightLogs((prev) => {
        const sameDay = [...prev]
          .reverse()
          .find((e) => e.loggedAt.startsWith(day))
        if (sameDay) {
          return prev.map((e) =>
            e.id === sameDay.id
              ? { ...e, bodyFatPct: input.bodyFatPct }
              : e,
          )
        }
        const lastWeight =
          [...prev].reverse().find((e) => e.weightKg > 0)?.weightKg ?? 0
        return [
          ...prev,
          {
            id: uid(),
            weightKg: lastWeight,
            bodyFatPct: input.bodyFatPct,
            loggedAt,
            note: lastWeight > 0 ? undefined : 'מדידת שומן',
          },
        ]
      })
    },
    [setWeightLogs],
  )

  const addFood = useCallback(
    (entry: Omit<FoodLogEntry, 'id' | 'loggedAt'>) => {
      setFoodLogs((prev) => {
        const next = [
          ...prev,
          { ...entry, id: uid(), loggedAt: new Date().toISOString() },
        ]
        scheduleFlush('addFood', { foodLogs: next })
        return next
      })
    },
    [setFoodLogs, scheduleFlush],
  )

  const updateFood = useCallback(
    (id: string, patch: Partial<Omit<FoodLogEntry, 'id' | 'loggedAt'>>) => {
      setFoodLogs((prev) => {
        const next = prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
        scheduleFlush('updateFood', { foodLogs: next })
        return next
      })
    },
    [setFoodLogs, scheduleFlush],
  )

  const deleteFood = useCallback(
    (id: string) => {
      setFoodLogs((prev) => {
        const next = prev.filter((f) => f.id !== id)
        scheduleFlush('deleteFood', { foodLogs: next })
        return next
      })
    },
    [setFoodLogs, scheduleFlush],
  )

  const addSavedMeal = useCallback(
    (meal: Omit<SavedMeal, 'id'>) => {
      setSavedMeals((prev) => {
        const next: SavedMeal[] = [
          ...prev,
          { ...meal, kind: meal.kind ?? 'item', id: uid() },
        ]
        scheduleFlush('addSavedMeal', { savedMeals: next })
        return next
      })
    },
    [setSavedMeals, scheduleFlush],
  )

  const updateSavedMeal = useCallback(
    (id: string, patch: Partial<SavedMeal>) => {
      setSavedMeals((prev) => {
        const next = prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
        scheduleFlush('updateSavedMeal', { savedMeals: next })
        return next
      })
    },
    [setSavedMeals, scheduleFlush],
  )

  const deleteSavedMeal = useCallback(
    (id: string) => {
      setSavedMeals((prev) => {
        const next = prev.filter((m) => m.id !== id)
        scheduleFlush('deleteSavedMeal', { savedMeals: next })
        return next
      })
    },
    [setSavedMeals, scheduleFlush],
  )

  const addRecipe = useCallback(
    (recipe: Omit<Recipe, 'id'>) => {
      setRecipes((prev) => {
        const next = [...prev, { ...recipe, id: uid() }]
        scheduleFlush('addRecipe', { recipes: next })
        return next
      })
    },
    [setRecipes, scheduleFlush],
  )

  const importMealsAndRecipes = useCallback(
    (meals: SavedMeal[], nextRecipes: Recipe[]) => {
      if (meals.length) {
        setSavedMeals((prev) => {
          const next: SavedMeal[] = [
            ...prev,
            ...meals.map((m) => ({
              ...m,
              kind: m.kind === 'item' ? ('item' as const) : ('meal' as const),
            })),
          ]
          scheduleFlush('importMeals', { savedMeals: next })
          return next
        })
      }
      if (nextRecipes.length) {
        setRecipes((prev) => {
          const next = [...prev, ...nextRecipes]
          scheduleFlush('importRecipes', { recipes: next })
          return next
        })
      }
    },
    [setSavedMeals, setRecipes, scheduleFlush],
  )

  const logSavedMeal = useCallback(
    (mealId: string) => {
      const meal = savedMeals.find((m) => m.id === mealId)
      if (!meal) return false
      addFood({
        name: meal.name,
        grams: 1,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fats: meal.fats,
        source: 'saved-meal',
      })
      return true
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

  const addRoutine = useCallback(
    (input: Omit<Routine, 'id' | 'createdAt' | 'completedDates'>) => {
      const created: Routine = {
        id: uid(),
        title: input.title.trim(),
        targetMinutes: Math.max(1, Math.round(input.targetMinutes) || 30),
        weeklyTargetDays: Math.min(
          7,
          Math.max(1, Math.round(input.weeklyTargetDays) || 4),
        ),
        timeOfDay: input.timeOfDay,
        completedDates: [],
        createdAt: new Date().toISOString(),
        timeframe: input.timeframe ?? 'forever',
        startsOn: input.startsOn,
        endsOn: input.endsOn ?? null,
        durationDays: input.durationDays ?? null,
        archivedAt: input.archivedAt ?? null,
      }
      const normalized = normalizeRoutine(created) ?? created
      setRoutines((prev) => sortRoutines([...prev, normalized]))
      void pushRoutines([normalized])
      return normalized
    },
    [setRoutines],
  )

  const updateRoutine = useCallback(
    (
      id: string,
      patch: Partial<Omit<Routine, 'id' | 'createdAt' | 'completedDates'>>,
    ) => {
      let updated: Routine | null = null
      setRoutines((prev) =>
        sortRoutines(
          prev.map((row) => {
            if (row.id !== id) return row
            const next =
              normalizeRoutine({ ...row, ...patch }) ?? {
                ...row,
                ...patch,
                title: patch.title?.trim() || row.title,
              }
            updated = next
            return next
          }),
        ),
      )
      if (updated) void pushRoutines([updated])
    },
    [setRoutines],
  )

  const deleteRoutine = useCallback(
    (id: string) => {
      setRoutines((prev) => prev.filter((row) => row.id !== id))
      void deleteRemoteRoutine(id)
    },
    [setRoutines],
  )

  const toggleRoutineDate = useCallback(
    (id: string, date: string) => {
      let updated: Routine | null = null
      setRoutines((prev) =>
        prev.map((row) => {
          if (row.id !== id) return row
          const next = {
            ...row,
            completedDates: toggleCompletedDate(row.completedDates, date),
          }
          updated = next
          return next
        }),
      )
      if (updated) void pushRoutines([updated])
    },
    [setRoutines],
  )

  const addFocusTrack = useCallback(
    (
      input: Omit<FocusTrack, 'id' | 'createdAt' | 'completedDates' | 'archivedAt'> & {
        archivedAt?: string | null
      },
    ) => {
      const created = newFocusTrack(input)
      setFocusTracks((prev) => sortFocusTracks([...prev, created]))
      return created
    },
    [setFocusTracks],
  )

  const updateFocusTrack = useCallback(
    (id: string, patch: Partial<Omit<FocusTrack, 'id' | 'createdAt'>>) => {
      setFocusTracks((prev) =>
        sortFocusTracks(
          prev.map((row) => {
            if (row.id !== id) return row
            return (
              normalizeFocusTrack({ ...row, ...patch }) ?? { ...row, ...patch }
            )
          }),
        ),
      )
    },
    [setFocusTracks],
  )

  const deleteFocusTrack = useCallback(
    (id: string) => {
      setFocusTracks((prev) => prev.filter((row) => row.id !== id))
    },
    [setFocusTracks],
  )

  const toggleFocusTrackDate = useCallback(
    (id: string, date: string) => {
      setFocusTracks((prev) =>
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                completedDates: toggleCompletedDate(row.completedDates, date),
              }
            : row,
        ),
      )
    },
    [setFocusTracks],
  )

  useEffect(() => {
    let cancelled = false
    setRoutines((local) =>
      sortRoutines(
        local
          .map((row) => normalizeRoutine(row))
          .filter((row): row is Routine => Boolean(row)),
      ),
    )
    void pullRoutines().then((remote) => {
      if (cancelled || !remote || remote.length === 0) return
      if (hydratedRef.current) return
      setRoutines(
        sortRoutines(
          remote
            .map((row) => normalizeRoutine(row))
            .filter((row): row is Routine => Boolean(row)),
        ),
      )
    })
    return () => {
      cancelled = true
    }
  }, [setRoutines])

  useEffect(() => {
    let cancelled = false
    void pullPhaseHistory().then((remote) => {
      if (cancelled || !remote) return
      setPhaseHistory((local) => {
        const remoteIds = new Set(remote.map((e) => e.id))
        const localOnly = local.filter((e) => !remoteIds.has(e.id))
        if (localOnly.length) void pushPhaseHistory(localOnly)
        return sortHistory([...remote, ...localOnly])
      })
    })
    return () => {
      cancelled = true
    }
  }, [setPhaseHistory])

  const finishPhase = useCallback(
    (next: NewPhaseInput) => {
      const entry = createHistoryEntry(
        summarizePhase({ phase, goal, macroTargets, weightLogs, foodLogs }),
      )
      setPhaseHistory((prev) => sortHistory([...prev, entry]))
      void pushPhaseHistory([entry])
      setMacroPresets((prev) => ({ ...prev, [next.phase]: next.macros }))
      setPhaseState(next.phase)
      const latestWeight =
        next.startWeightKg ??
        [...weightLogs].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt)).at(-1)
          ?.weightKg ??
        goal.startWeightKg
      setGoal({
        ...goal,
        startDate: todayKey(),
        totalDays: Math.max(1, Math.round(next.totalDays) || 1),
        targetWeightKg: next.targetWeightKg,
        targetBodyFatPct: next.targetBodyFatPct,
        phaseName: next.phaseName?.trim() || goal.phaseName,
        phaseNumber: (goal.phaseNumber || 1) + 1,
        startWeightKg: latestWeight ?? null,
      })
      return entry
    },
    [
      phase,
      goal,
      macroTargets,
      weightLogs,
      foodLogs,
      setPhaseHistory,
      setMacroPresets,
      setPhaseState,
      setGoal,
    ],
  )

  const deletePhaseHistory = useCallback(
    (id: string) => {
      setPhaseHistory((prev) => prev.filter((e) => e.id !== id))
      void deleteRemotePhaseHistory(id)
    },
    [setPhaseHistory],
  )

  const addActivityLog = useCallback(
    (
      entry: Omit<ActivityLog, 'id' | 'loggedAt'> & { loggedAt?: string },
    ) => {
      const sport = entry.sport.trim()
      if (!sport) return
      setActivityLogs((prev) => [
        ...prev,
        {
          ...entry,
          sport,
          id: uid(),
          loggedAt: entry.loggedAt ?? new Date().toISOString(),
        },
      ])
    },
    [setActivityLogs],
  )

  const deleteActivityLog = useCallback(
    (id: string) => {
      setActivityLogs((prev) => prev.filter((a) => a.id !== id))
    },
    [setActivityLogs],
  )

  const setLifestyleEntry = useCallback(
    (date: string, entry: LifestyleEntry) => {
      setLifestyleLogs((prev) => ({ ...prev, [date]: entry }))
    },
    [setLifestyleLogs],
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
      setConsistencyDayMark,
      setWeekConsistencyCount,
      weightLogs,
      foodLogs,
      habitChecks,
      habits,
      routines,
      addRoutine,
      updateRoutine,
      deleteRoutine,
      toggleRoutineDate,
      focusTracks,
      addFocusTrack,
      updateFocusTrack,
      deleteFocusTrack,
      toggleFocusTrackDate,
      foodCategories,
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
      setDayPlan,
      resetDayToOfficialPlan,
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
      lastSyncNotice,
      clearSyncNotice,
      syncNow,
      addSetLog,
      addWeight,
      addBodyFat,
      addFood,
      updateFood,
      deleteFood,
      logSavedMeal,
      addHabit,
      updateHabit,
      deleteHabit,
      toggleHabit,
      profile,
      setProfile,
      activityLogs,
      addActivityLog,
      deleteActivityLog,
      lifestyleLogs,
      setLifestyleEntry,
      phaseHistory,
      finishPhase,
      deletePhaseHistory,
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
      setConsistencyDayMark,
      setWeekConsistencyCount,
      weightLogs,
      foodLogs,
      habitChecks,
      habits,
      routines,
      addRoutine,
      updateRoutine,
      deleteRoutine,
      toggleRoutineDate,
      focusTracks,
      addFocusTrack,
      updateFocusTrack,
      deleteFocusTrack,
      toggleFocusTrackDate,
      foodCategories,
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
      setDayPlan,
      resetDayToOfficialPlan,
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
      lastSyncNotice,
      clearSyncNotice,
      syncNow,
      addSetLog,
      addWeight,
      addBodyFat,
      addFood,
      updateFood,
      deleteFood,
      logSavedMeal,
      addHabit,
      updateHabit,
      deleteHabit,
      toggleHabit,
      profile,
      setProfile,
      activityLogs,
      addActivityLog,
      deleteActivityLog,
      lifestyleLogs,
      setLifestyleEntry,
      phaseHistory,
      finishPhase,
      deletePhaseHistory,
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
