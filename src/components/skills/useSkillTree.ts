import { useMemo } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { useWorkoutSession } from '../../context/WorkoutSessionContext'
import { dayAllExercises } from '../../lib/types'
import {
  applyMorningSlots,
  applyProgramSlots,
  incomingLabel,
  outgoingLabel,
  planSlotSwap,
} from '../../lib/skillSlotSwap'
import {
  activateTier,
  evaluateSkillTree,
  liveNodes,
  masterTier,
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
  advanceStage: (nodeId: string) => string | null
} {
  const { skillTree, updateSkillTree, workoutDays, setWorkoutDays, morningRoutine, updateMorningRoutine } =
    useAppData()

  function writeSlots(node: SkillNode): string | null {
    const changes = planSlotSwap(node.slots, workoutDays, morningRoutine).filter(
      (p) => !p.missingTarget && !p.alreadyApplied,
    )
    const programSlots = node.slots.filter((s) => s.target !== 'morningA' && s.target !== 'morningB')
    if (programSlots.length) setWorkoutDays(applyProgramSlots(workoutDays, programSlots))
    const morning = applyMorningSlots(morningRoutine, node.slots)
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

  return { writeSlots, advanceStage }
}
