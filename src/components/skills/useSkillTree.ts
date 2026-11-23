import { useEffect, useMemo, useRef } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { useWorkoutSession } from '../../context/WorkoutSessionContext'
import { dayAllExercises } from '../../lib/types'
import { originalPlanExercise } from '../../lib/skillWorkout'
import {
  applyMorningSlots,
  applyProgramSlots,
  incomingLabel,
  outgoingLabel,
  planSlotSwap,
  rewindRecipes,
} from '../../lib/skillSlotSwap'
import {
  activateTier,
  evaluateSkillTree,
  liveNodes,
  masterTier,
  resetBranchProgress,
  soloFocusInCategory,
  unmasterTier,
  clearRewind,
  type SkillSlotRecipe,
  type BranchEvaluation,
  type SkillDataSources,
  type SkillNode,
} from '../../lib/skillTree'

/** Live skill-tree evaluation from workout logs, morning routine and body data. */
export function useSkillTreeEvaluation(): {
  evaluations: BranchEvaluation[]
  sources: SkillDataSources
} {
  const { skillTree, setLogs, weightLogs, bodyMeasurements, morningRoutine, workoutDays } =
    useAppData()
  const { workoutLogs } = useWorkoutSession()
  const sources = useMemo<SkillDataSources>(
    () => ({
      workoutLogs,
      setLogs,
      weightLogs,
      bodyMeasurements,
      morningRoutine,
      programDays: workoutDays,
    }),
    [workoutLogs, setLogs, weightLogs, bodyMeasurements, morningRoutine, workoutDays],
  )
  const evaluations = useMemo(() => evaluateSkillTree(skillTree, sources), [skillTree, sources])
  return { evaluations, sources }
}

/** Exercise names available for linking (active program + morning routine). */
export function useLinkableExerciseNames(): string[] {
  const { workoutDays, morningRoutine } = useAppData()
  return useMemo(() => {
    const names = new Set<string>()
    for (const day of workoutDays) {
      for (const ex of dayAllExercises(day)) names.add(ex.name.trim())
    }
    for (const routine of Object.values(morningRoutine.routines)) {
      for (const ex of routine.exercises) names.add(ex.nameEn.trim() || ex.nameHe.trim())
    }
    return [...names].filter(Boolean).sort((a, b) => a.localeCompare(b, 'he'))
  }, [workoutDays, morningRoutine])
}

/**
 * Stage writes shared by the Skill Tree tab and the active workout:
 * Smart Slot Swap into the plan (1 out ⬅ 1 in) and instant stage promotion.
 */
export function useSkillStageActions(): {
  writeSlots: (node: SkillNode) => string | null
  /** Write several recipes in one plan update (batch stage advances). */
  writeRecipes: (slots: SkillSlotRecipe[]) => string | null
  advanceStage: (nodeId: string) => string | null
  resetTrack: (branchId: string) => string
  undoMastery: (nodeId: string) => string | null
  rewindPlan: (branchId: string, toOrder: number) => void
} {
  const { skillTree, updateSkillTree, workoutDays, setWorkoutDays, morningRoutine, updateMorningRoutine } =
    useAppData()

  function writeSlots(node: SkillNode): string | null {
    return writeRecipes(node.slots)
  }

  function writeRecipes(slots: SkillSlotRecipe[]): string | null {
    if (!slots.length) return null
    const changes = planSlotSwap(slots, workoutDays, morningRoutine).filter(
      (p) => !p.missingTarget && !p.alreadyApplied,
    )
    const programSlots = slots.filter((s) => s.target !== 'morningA' && s.target !== 'morningB')
    if (programSlots.length) setWorkoutDays(applyProgramSlots(workoutDays, programSlots))
    const morning = applyMorningSlots(morningRoutine, slots)
    for (const id of ['A', 'B'] as const) {
      const exercises = morning[id]
      if (exercises) updateMorningRoutine(id, { exercises })
    }
    if (!changes.length) return null
    return `האימון עודכן אוטומטית! ${changes
      .map((p) => {
        const out = outgoingLabel(p)
        return out
          ? `${incomingLabel(p)} החליף את ${out} ב-${p.placeSummary}`
          : `${incomingLabel(p)} נוסף בסוף ${p.placeSummary}`
      })
      .join(' · ')}.`
  }

  /** Current stage → mastered; the next stage becomes the single focus (plan swapped in). */
  function advanceStage(nodeId: string): string | null {
    const current = skillTree.nodes[nodeId]
    if (!current || current.deleted) return null
    const branch = skillTree.branches[current.branchId]
    const next = liveNodes(skillTree, current.branchId).find(
      (n) => n.order > current.order && n.tierStatus !== 'mastered',
    )
    if (!next) {
      updateSkillTree((prev) => masterTier(prev, nodeId))
      return `🏆 ${branch?.title ?? 'המסלול'} נשלט במלואו!`
    }
    const message = writeSlots(next)
    // activateTier masters every lower tier (incl. this one) and logs the progression.
    updateSkillTree((prev) => activateTier(prev, next.id, { slotsApplied: true }))
    return `✅ שלב ${current.order} הושלם! עכשיו בפוקוס: שלב ${next.order} — ${next.title}${message ? ` · ${message}` : ''}`
  }

  /** Put tier `toOrder` back into the plan (replacing what later tiers swapped in). */
  function rewindPlan(branchId: string, toOrder: number) {
    writeRecipes(rewindRecipes(liveNodes(skillTree, branchId), toOrder, originalPlanExercise))
  }

  /** "אפס התקדמות מסלול": Tier 1 at 0% in active focus, plan swapped back. */
  function resetTrack(branchId: string): string {
    rewindPlan(branchId, 1)
    updateSkillTree((prev) => soloFocusInCategory(resetBranchProgress(prev, branchId), branchId))
    const title = skillTree.branches[branchId]?.title ?? 'המסלול'
    return `🔄 ${title} אופס — שלב 1 בפוקוס פעיל (0%).`
  }

  /** "בטל השלמת שלב": the tier is in focus again and its exercises return to the plan. */
  function undoMastery(nodeId: string): string | null {
    const node = skillTree.nodes[nodeId]
    if (!node || node.tierStatus !== 'mastered') return null
    rewindPlan(node.branchId, node.order)
    updateSkillTree((prev) => soloFocusInCategory(unmasterTier(prev, nodeId), node.branchId))
    return `↩️ שלב ${node.order} חזר לפוקוס — ${node.title}`
  }

  return { writeSlots, writeRecipes, advanceStage, resetTrack, undoMastery, rewindPlan }
}

/**
 * Applies plan rewinds requested by a migration (e.g. a track reset to Tier 1
 * whose later-tier exercises are still in the weekly plan). Mounted once in the shell.
 */
export function SkillPlanSync(): null {
  const { skillTree, updateSkillTree } = useAppData()
  const { rewindPlan } = useSkillStageActions()
  const done = useRef(new Set<string>())
  const pending = Object.values(skillTree.branches)
    .filter((b) => b.rewindPending && !b.deleted)
    .map((b) => b.id)
    .join(',')
  useEffect(() => {
    if (!pending) return
    for (const id of pending.split(',')) {
      if (done.current.has(id)) continue
      done.current.add(id)
      rewindPlan(id, 1)
      updateSkillTree((prev) => clearRewind(prev, id))
    }
    // rewindPlan reads the latest plan from this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending])
  return null
}
