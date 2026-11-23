/**
 * Pull focus slot — strict "1 נכנס, 1 יוצא" between pull tracks.
 *
 * The pull workout (משיכה) holds exactly one exercise that belongs to the
 * pull track in active focus (Front Lever rows, Archer pull-ups, high pulls…,
 * see SKILL_FOCUS_HANDOFFS). This module is a pure, idempotent reconciler:
 * whenever the focused pull track differs from the slot's owner, the owner's
 * exercise is replaced *in place* by the focused track's exercise. It never
 * appends (workout length stays identical) and never duplicates (a stale copy
 * is dropped when the focused exercise is already there). It runs for every
 * focus change regardless of where it came from (toggle, stage advance, track
 * editor, seed migration, another device) — see SkillPlanSync.
 */

import { SKILL_FOCUS_HANDOFFS, type SkillFocusHandoff } from './skillTreeSeed'
import {
  liveBranches,
  liveNodes,
  matchesLink,
  type SkillSlotExercise,
  type SkillTreeState,
} from './skillTree'
import { skillKindOfDay, skillKindOfName } from './skillWorkout'
import type { Exercise, WorkoutDay, WorkoutTemplate } from './types'
import { uid } from './types'

export type FocusSlotChange = { out: string; in: string | null }

type Plan = { branchId: string; handoff: SkillFocusHandoff; incoming: SkillSlotExercise }

/** The focused pull track that owns a slot exercise (null = nothing to reconcile). */
function focusPlan(tree: SkillTreeState): Plan | null {
  const branch = liveBranches(tree).find(
    (b) => b.status === 'active_focus' && SKILL_FOCUS_HANDOFFS[b.id]?.target === 'pull',
  )
  if (!branch) return null
  const handoff = SKILL_FOCUS_HANDOFFS[branch.id]!
  const nodes = liveNodes(tree, branch.id)
  const current =
    nodes.find((n) => n.tierStatus === 'active' || n.tierStatus === 'queued') ?? nodes.at(-1) ?? null
  // The track's own tier recipes upgrade the slot (Tuck → Advanced Tuck …):
  // use the latest variant at or below the current tier.
  let incoming = handoff.exercise
  for (const n of nodes) {
    if (current && n.order > current.order) break
    for (const slot of n.slots) {
      if (slot.target !== handoff.target) continue
      const hit = slot.exercises.find((e) => matchesLink(e.name, handoff.owns))
      if (hit) incoming = hit
    }
  }
  return { branchId: branch.id, handoff, incoming }
}

function firstNumber(text: string): number | null {
  const m = text.match(/\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : null
}

function toExercise(input: SkillSlotExercise): Exercise {
  const metric = /שני|sec/i.test(input.reps) ? 'seconds' : 'reps'
  const reps = firstNumber(input.reps)
  return {
    id: uid(),
    name: input.name.trim(),
    sets: input.sets,
    reps: input.reps,
    ...(input.rest && input.rest !== '—' ? { rest: input.rest } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    metric,
    ...(reps != null
      ? {
          defaultReps: reps,
          defaultSets: Array.from({ length: input.sets }, (_, i) => ({ setNumber: i + 1, weightKg: null, reps })),
          defaultsUpdatedAt: new Date().toISOString(),
        }
      : {}),
  }
}

/** Reconcile one pull exercise list. Returns the same array when nothing changes. */
export function reconcileFocusSlotList(
  list: Exercise[],
  tree: SkillTreeState,
): { list: Exercise[]; change: FocusSlotChange | null } {
  const plan = focusPlan(tree)
  if (!plan) return { list, change: null }
  const mine = plan.handoff.owns
  const others = Object.entries(SKILL_FOCUS_HANDOFFS)
    .filter(([id, h]) => id !== plan.branchId && h.target === plan.handoff.target)
    .map(([, h]) => h.owns)
  const isStale = (name: string) => !matchesLink(name, mine) && others.some((o) => matchesLink(name, o))
  const at = list.findIndex((e) => isStale(e.name))
  if (at < 0) return { list, change: null }
  const out = list[at]!.name
  if (list.some((e) => matchesLink(e.name, mine))) {
    // The focused exercise is already in place: only drop the stale copy.
    return { list: list.filter((e) => !isStale(e.name)), change: { out, in: null } }
  }
  const incoming = toExercise(plan.incoming)
  const next = list.map((e, i) => (i === at ? incoming : e)).filter((e) => !isStale(e.name))
  return { list: next, change: { out, in: incoming.name } }
}

/** Reconcile every pull session / pull day of a weekly plan (pure). */
export function reconcileFocusSlotDays(
  days: WorkoutDay[],
  tree: SkillTreeState,
): { days: WorkoutDay[]; changes: FocusSlotChange[] } {
  const changes: FocusSlotChange[] = []
  let touched = false
  const next = days.map((day) => {
    if (day.isRest) return day
    const sessions = day.sessions ?? []
    if (sessions.length) {
      let dayTouched = false
      const nextSessions = sessions.map((s) => {
        if (skillKindOfName(s.name) !== 'pull') return s
        const r = reconcileFocusSlotList(s.exercises, tree)
        if (!r.change) return s
        changes.push(r.change)
        dayTouched = true
        return { ...s, exercises: r.list }
      })
      if (!dayTouched) return day
      touched = true
      return { ...day, sessions: nextSessions }
    }
    if (skillKindOfDay(day) !== 'pull') return day
    const r = reconcileFocusSlotList(day.exercises ?? [], tree)
    if (!r.change) return day
    changes.push(r.change)
    touched = true
    return { ...day, exercises: r.list }
  })
  return { days: touched ? next : days, changes }
}

/** Reconcile pull templates in the library (pure). */
export function reconcileFocusSlotTemplates(
  templates: WorkoutTemplate[],
  tree: SkillTreeState,
): { templates: WorkoutTemplate[]; changed: boolean } {
  let changed = false
  const next = templates.map((t) => {
    if (skillKindOfName(t.name) !== 'pull') return t
    const r = reconcileFocusSlotList(t.exercises, tree)
    if (!r.change) return t
    changed = true
    return { ...t, exercises: r.list, updatedAt: new Date().toISOString() }
  })
  return { templates: changed ? next : templates, changed }
}

/** Toast text for a set of slot changes ("X נכנס במקום Y"). */
export function describeFocusSlotChanges(changes: FocusSlotChange[]): string | null {
  const first = changes.find((c) => c.in) ?? changes[0]
  if (!first) return null
  return first.in
    ? `${first.in} נכנס במקום ${first.out} באימון המשיכה (1 נכנס, 1 יוצא).`
    : `${first.out} הוסר מאימון המשיכה (התרגיל של המסלול בפוקוס כבר קיים).`
}
