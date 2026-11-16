import { useMemo } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { useWorkoutSession } from '../../context/WorkoutSessionContext'
import { dayAllExercises } from '../../lib/types'
import {
  evaluateSkillTree,
  type BranchEvaluation,
  type SkillDataSources,
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
