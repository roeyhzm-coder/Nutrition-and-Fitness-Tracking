/**
 * Skill Tree ↔ workout bridge: the single in-focus stage of every active-focus
 * track is injected at the very top of a matching workout (Pull → pull tracks,
 * Push / legs → push tracks, Combined → both), resolved from the workout
 * template type, never from the calendar day.
 */

import {
  liveBranches,
  liveNodes,
  matchesLink,
  trackCategory,
  type SkillMeasure,
  type SkillNode,
  type SkillTrackCategory,
  type SkillTreeState,
} from './skillTree'
import type { Exercise, WorkoutDay } from './types'
import { dayAllExercises } from './types'

export type WorkoutSkillKind = 'pull' | 'push' | 'both'

const COMBO_RE = /משולב|עליון|פול ?בודי|full|upper|combo/i
const PULL_RE = /משיכה|pull/i
const PUSH_RE = /דחיפה|רגליים|push|legs?/i

/** Workout type from a template / session name ("משיכה 3", "דחיפה ורגליים 3", "משולב 3"). */
export function skillKindOfName(name: string): WorkoutSkillKind | null {
  if (COMBO_RE.test(name)) return 'both'
  const pull = PULL_RE.test(name)
  const push = PUSH_RE.test(name)
  if (pull && push) return 'both'
  if (pull) return 'pull'
  if (push) return 'push'
  return null
}

function mergeKinds(kinds: (WorkoutSkillKind | null)[]): WorkoutSkillKind | null {
  const set = new Set(kinds.filter((k): k is WorkoutSkillKind => k != null))
  if (set.has('both') || (set.has('pull') && set.has('push'))) return 'both'
  if (set.has('pull')) return 'pull'
  if (set.has('push')) return 'push'
  return null
}

/** Sessions decide (a day may hold several); the day's focus is the fallback. */
export function skillKindOfDay(day: WorkoutDay): WorkoutSkillKind | null {
  if (day.isRest) return null
  const fromSessions = mergeKinds((day.sessions ?? []).map((s) => skillKindOfName(s.name)))
  return fromSessions ?? skillKindOfName(`${day.focus} ${day.title}`)
}

export type SkillFocusItem = {
  nodeId: string
  branchId: string
  branchTitle: string
  category: SkillTrackCategory
  order: number
  tierCount: number
  /** Stage criteria as written in the Skill Tree (shown as "יעד למעבר שלב"). */
  target: string
  /** Aliases of the stage's primary exercise (`|`). */
  link: string
  exercise: Exercise
}

export const SKILL_EXERCISE_PREFIX = 'skill-'

/** Primary measure = first one fed by the workout log (else the first one). */
function primaryMeasure(node: SkillNode): SkillMeasure | null {
  const withLink = node.measures.filter((m) => m.linkedExercise.trim())
  return withLink.find((m) => m.sourceType === 'workout_exercise') ?? withLink[0] ?? null
}

function firstAlias(link: string): string {
  return link.split('|').map((a) => a.trim()).find(Boolean) ?? ''
}

function prescription(m: SkillMeasure): Pick<Exercise, 'sets' | 'reps' | 'weight' | 'metric'> {
  const t = m.target
  const sets = t.sets && t.sets > 0 ? t.sets : 3
  switch (m.metricType) {
    case 'duration_seconds':
      return { sets, reps: `${t.amount ?? 20} שניות`, metric: 'seconds' }
    case 'weight_x_reps':
      return {
        sets,
        reps: String(t.reps ?? 3),
        ...(t.amount != null ? { weight: `${t.amount} ק"ג` } : {}),
        metric: 'reps',
      }
    case 'gap_cm':
      return { sets, reps: '60 שניות', metric: 'seconds' }
    default:
      return { sets, reps: String(t.amount ?? 5), metric: 'reps' }
  }
}

/** Playable exercise card for a stage (clean sets / reps / seconds). */
function stageExercise(node: SkillNode, m: SkillMeasure, branchTitle: string): Exercise {
  return {
    id: `${SKILL_EXERCISE_PREFIX}${node.id}`,
    name: firstAlias(m.linkedExercise),
    ...prescription(m),
    rest: '2-3 דקות',
    notes: `🎯 עץ מיומנויות · ${branchTitle} · שלב ${node.order}: ${node.title}`,
  }
}

/** The single in-focus stage of every active-focus track (optionally of one kind). */
export function focusSkillItems(
  tree: SkillTreeState,
  kind: WorkoutSkillKind | null = 'both',
): SkillFocusItem[] {
  if (!kind) return []
  const out: SkillFocusItem[] = []
  for (const branch of liveBranches(tree)) {
    if (branch.status !== 'active_focus') continue
    const category = trackCategory(branch.id)?.kind
    if (!category || (kind !== 'both' && kind !== category)) continue
    const nodes = liveNodes(tree, branch.id)
    const node = nodes.find((n) => n.tierStatus === 'active')
    const m = node ? primaryMeasure(node) : null
    if (!node || !m) continue
    out.push({
      nodeId: node.id,
      branchId: branch.id,
      branchTitle: branch.title,
      category,
      order: node.order,
      tierCount: nodes.length,
      target: node.title,
      link: m.linkedExercise,
      exercise: stageExercise(node, m, branch.title),
    })
  }
  // Pull before push on combined days (matches the session order).
  return out.sort((a, b) => (a.category === b.category ? 0 : a.category === 'pull' ? -1 : 1))
}

/**
 * Put the skill stages first (index 0…). An exercise already in the list that
 * matches the stage is moved to the top instead of being duplicated.
 */
export function injectSkillExercises(exercises: Exercise[], items: SkillFocusItem[]): Exercise[] {
  if (!items.length) return exercises
  const rest = [...exercises]
  const head: Exercise[] = []
  for (const item of items) {
    const at = rest.findIndex((e) => e.id === item.exercise.id || matchesLink(e.name, item.link))
    head.push(at >= 0 ? rest.splice(at, 1)[0]! : item.exercise)
  }
  return [...head, ...rest]
}

/** Full lineup for a weekday: its exercises with the matching skill stages on top. */
export function dayLineupWithSkills(day: WorkoutDay, tree: SkillTreeState): Exercise[] {
  return injectSkillExercises(dayAllExercises(day), focusSkillItems(tree, skillKindOfDay(day)))
}

/** Skill stage an exercise in the active workout belongs to (injected or matched by name). */
export function skillItemForExercise(
  exercise: { exerciseId: string; name: string },
  items: SkillFocusItem[],
): SkillFocusItem | null {
  return (
    items.find((i) => i.exercise.id === exercise.exerciseId) ??
    items.find((i) => matchesLink(exercise.name, i.link)) ??
    null
  )
}
