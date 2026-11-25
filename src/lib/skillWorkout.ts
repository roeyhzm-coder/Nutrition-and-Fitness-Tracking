/**
 * Skill Tree ↔ workout bridge. Strict 1-in / 1-out: the in-focus stage of a
 * track is NEVER prepended or injected into a workout. Its progress is read
 * from the exercise that already lives in the plan (Pull 3 / Push 3 /
 * Combined 3) or in Morning Routine A/B; the plan itself only changes through
 * an explicitly confirmed Smart Slot Swap (lib/skillSlotSwap), which replaces
 * one exercise in place.
 */

import {
  liveBranches,
  liveNodes,
  matchesLink,
  trackCategory,
  type SkillMeasure,
  type SkillNode,
  type SkillSlotExercise,
  type SkillSlotRecipe,
  type SkillTrackCategory,
  type SkillTreeState,
} from './skillTree'
import { createOfficialPrograms, DEFAULT_ACTIVE_PROGRAM_ID } from '../data/workouts'
import { normalizeMorningState, type MorningRoutineState } from './morningRoutine'
import type { Exercise, WorkoutDay } from './types'
import { dayAllExercises, WEEKDAY_SHORT } from './types'

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
  /** Where the primary measure is tracked from. */
  sourceType: SkillMeasure['sourceType']
  exercise: Exercise
}

export const SKILL_EXERCISE_PREFIX = 'skill-'

/** Primary measure = the stage's first linked measure (workout exercise or Morning A/B). */
function primaryMeasure(node: SkillNode): SkillMeasure | null {
  return node.measures.find((m) => m.linkedExercise.trim()) ?? null
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
      sourceType: m.sourceType,
      exercise: stageExercise(node, m, branch.title),
    })
  }
  // Pull before push on combined days (matches the session order).
  return out.sort((a, b) => (a.category === b.category ? 0 : a.category === 'pull' ? -1 : 1))
}

/**
 * Strict 1-in / 1-out: the workout's own lineup, unchanged. Skill stages are
 * linked to the exercise already in the list (see skillItemForExercise) and
 * never added as an extra copy. Runtime skill copies (`skill-<nodeId>`) from
 * older sessions are dropped.
 */
export function injectSkillExercises(exercises: Exercise[], _items: SkillFocusItem[] = []): Exercise[] {
  return exercises.some((e) => e.id.startsWith(SKILL_EXERCISE_PREFIX))
    ? exercises.filter((e) => !e.id.startsWith(SKILL_EXERCISE_PREFIX))
    : exercises
}

/** Full lineup for a weekday (no skill injection — see injectSkillExercises). */
export function dayLineupWithSkills(day: WorkoutDay, _tree?: SkillTreeState): Exercise[] {
  return injectSkillExercises(dayAllExercises(day))
}

/** Where a focus stage is tracked from: a plan exercise ("יום א׳/ג׳ · משיכה 3"), Morning B, or nowhere yet. */
export function skillItemSource(
  item: SkillFocusItem,
  days: WorkoutDay[],
  morning?: MorningRoutineState,
): { label: string; linked: boolean } {
  if (item.sourceType === 'morning_routine') {
    const routines = morning?.routines ?? normalizeMorningState(null).routines
    const hits = (['A', 'B'] as const).filter((id) =>
      routines[id].exercises.some((ex) => matchesLink(`${ex.nameHe} ${ex.nameEn}`, item.link)),
    )
    return hits.length
      ? { label: hits.map((id) => `שגרת בוקר ${id}`).join(' + '), linked: true }
      : { label: 'שגרת בוקר (עדכון ידני)', linked: false }
  }
  const byWorkout = new Map<string, number[]>()
  for (const day of days) {
    if (day.isRest) continue
    for (const s of day.sessions ?? []) {
      if (!s.exercises.some((e) => matchesLink(e.name, item.link))) continue
      byWorkout.set(s.name, [...(byWorkout.get(s.name) ?? []), day.dayNumber])
    }
    if ((day.exercises ?? []).some((e) => matchesLink(e.name, item.link))) {
      const name = day.focus || day.title
      byWorkout.set(name, [...(byWorkout.get(name) ?? []), day.dayNumber])
    }
  }
  if (!byWorkout.size) return { label: 'לא בתוכנית הפעילה — נדרשת החלפת סלוט מאושרת', linked: false }
  const label = [...byWorkout.entries()]
    .map(([name, nums]) => `${nums.length > 1 ? 'ימים' : 'יום'} ${nums.map((n) => WEEKDAY_SHORT[n - 1] ?? n).join('/')} · ${name}`)
    .join(' | ')
  return { label, linked: true }
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

/** The official Block 3 plan / default morning routine exercise a recipe first replaced. */
export function originalPlanExercise(slot: SkillSlotRecipe): SkillSlotExercise | null {
  if (slot.target === 'morningA' || slot.target === 'morningB') {
    const routine = normalizeMorningState(null).routines[slot.target === 'morningA' ? 'A' : 'B']
    const hit = routine.exercises.find((e) => matchesLink(`${e.nameHe} ${e.nameEn}`, slot.replaces))
    return hit
      ? { name: `${hit.nameHe} ${hit.nameEn}`.trim(), sets: 1, reps: hit.target, rest: '—', notes: hit.description }
      : null
  }
  const want = slot.target === 'combo' ? 'both' : slot.target
  const program = createOfficialPrograms().find((p) => p.id === DEFAULT_ACTIVE_PROGRAM_ID)
  for (const day of program?.days ?? []) {
    for (const session of day.sessions ?? []) {
      if (skillKindOfName(session.name) !== want) continue
      const hit = session.exercises.find((e) => matchesLink(e.name, slot.replaces))
      if (hit) return { name: hit.name, sets: hit.sets, reps: hit.reps, rest: hit.rest ?? '', notes: hit.notes ?? '' }
    }
  }
  return null
}

