/**
 * Smart Slot Swap: write a skill tier's exercises into the existing weekly
 * plan by replacing the exercise it supersedes (or appending a finisher),
 * so no separate "side workout" is ever created.
 */

import type { MorningExercise, MorningIllustrationKind, MorningRoutineState } from './morningRoutine'
import {
  matchesLink,
  SKILL_SLOT_TARGET_LABELS,
  type SkillNode,
  type SkillSlotExercise,
  type SkillSlotRecipe,
} from './skillTree'
import type { Exercise, WorkoutDay } from './types'
import { uid, WEEKDAY_SHORT } from './types'

const PROGRAM_TARGET_ALIASES = {
  pull: 'משיכה|pull',
  push: 'דחיפה|push',
  combo: 'משולב|combo|full',
} as const

function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('he') === b.trim().toLocaleLowerCase('he')
}

function isProgramTarget(slot: SkillSlotRecipe): slot is SkillSlotRecipe & {
  target: keyof typeof PROGRAM_TARGET_ALIASES
} {
  return slot.target in PROGRAM_TARGET_ALIASES
}

type Container = { dayIndex: number; sessionIndex: number | null; label: string; day: string; name: string }

/** The exercise lists (session or standalone) that belong to the slot's workout. */
function containersFor(slot: SkillSlotRecipe, days: WorkoutDay[]): Container[] {
  if (!isProgramTarget(slot)) return []
  const alias = PROGRAM_TARGET_ALIASES[slot.target]
  const out: Container[] = []
  days.forEach((day, dayIndex) => {
    if (day.isRest) return
    const short = WEEKDAY_SHORT[day.dayNumber - 1] ?? String(day.dayNumber)
    const dayName = `יום ${short}`
    const sessions = day.sessions ?? []
    const sessionIndex = sessions.findIndex((s) => matchesLink(s.name, alias))
    if (sessionIndex >= 0) {
      const name = sessions[sessionIndex].name
      out.push({ dayIndex, sessionIndex, label: `${dayName} · ${name}`, day: short, name })
      return
    }
    if (matchesLink(`${day.focus} ${day.title}`, alias)) {
      if (sessions.length) {
        const name = sessions[0].name
        out.push({ dayIndex, sessionIndex: 0, label: `${dayName} · ${name}`, day: short, name })
      } else {
        const name = day.focus || day.title
        out.push({ dayIndex, sessionIndex: null, label: `${dayName} · ${name}`, day: short, name })
      }
    }
  })
  return out
}

function listOf(day: WorkoutDay, sessionIndex: number | null): Exercise[] {
  return sessionIndex == null ? (day.exercises ?? []) : day.sessions[sessionIndex].exercises
}

function toExercise(input: SkillSlotExercise): Exercise {
  return {
    id: uid(),
    name: input.name.trim(),
    sets: input.sets,
    reps: input.reps,
    ...(input.rest && input.rest !== '—' ? { rest: input.rest } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    metric: /שני|sec/i.test(input.reps) ? 'seconds' : 'reps',
  }
}

/** Replace the superseded exercise(s) in place, or append at the end. */
function swapList<T>(
  list: T[],
  slot: SkillSlotRecipe,
  nameOf: (item: T) => string,
  create: (input: SkillSlotExercise) => T,
): { list: T[]; removed: string[]; added: string[] } {
  const matched = slot.replaces.trim()
    ? list.filter((item) => matchesLink(nameOf(item), slot.replaces))
    : []
  const remaining = list.filter((item) => !matched.includes(item))
  const incoming: T[] = []
  const added: string[] = []
  for (const input of slot.exercises) {
    // Keep the existing entry (and its saved defaults) when the name is unchanged.
    const keep = matched.find((item) => sameName(nameOf(item), input.name))
    if (keep) {
      incoming.push(keep)
      continue
    }
    if (remaining.some((item) => sameName(nameOf(item), input.name))) continue
    incoming.push(create(input))
    added.push(input.name)
  }
  const removed = matched.filter((item) => !incoming.includes(item)).map(nameOf)
  if (!matched.length) return { list: [...list, ...incoming], removed, added }
  const at = list.indexOf(matched[0])
  const before = list.slice(0, at).filter((item) => !matched.includes(item))
  const after = list.slice(at).filter((item) => !matched.includes(item))
  return { list: [...before, ...incoming, ...after], removed, added }
}

export type SlotPreview = {
  slot: SkillSlotRecipe
  targetLabel: string
  /** Where it lands, e.g. "יום א׳ · משיכה 3". */
  places: string[]
  /** Same, grouped per workout: "יום א׳/ג׳ · משיכה 1". */
  placeSummary: string
  outgoing: string[]
  incoming: SkillSlotExercise[]
  mode: 'replace' | 'append'
  /** The workout this slot targets is not in the active plan. */
  missingTarget: boolean
  /** Every incoming exercise is already in place — nothing would change. */
  alreadyApplied: boolean
}

function morningRoutineId(slot: SkillSlotRecipe): 'A' | 'B' | null {
  return slot.target === 'morningA' ? 'A' : slot.target === 'morningB' ? 'B' : null
}

function morningName(ex: MorningExercise): string {
  return `${ex.nameHe} ${ex.nameEn}`.trim()
}

function illustrationFor(name: string): MorningIllustrationKind {
  if (/עמידת ידיים|handstand/i.test(name)) return 'handstand'
  if (/הולו|hollow|l-sit|v-sit/i.test(name)) return 'hollow'
  if (/תלי|hang/i.test(name)) return 'deadHang'
  if (/פייק|pike/i.test(name)) return 'pike'
  if (/גב|spine|rotation/i.test(name)) return 'tSpine'
  return 'deepSquat'
}

function toMorningExercise(input: SkillSlotExercise): MorningExercise {
  return {
    id: uid(),
    nameHe: input.name.trim(),
    nameEn: '',
    badge: 'מעץ המיומנויות',
    target: input.sets > 1 ? `${input.sets} × ${input.reps}` : input.reps,
    description: input.notes,
    tip: '',
    illustration: illustrationFor(input.name),
  }
}

function summarizeContainers(containers: Container[]): string {
  const groups = new Map<string, string[]>()
  for (const c of containers) groups.set(c.name, [...(groups.get(c.name) ?? []), c.day])
  return [...groups.entries()].map(([name, days]) => `יום ${days.join('/')} · ${name}`).join(' | ')
}

/** What leaves the workout: the matched exercise(s), else the recipe's first alias. */
export function outgoingLabel(preview: SlotPreview): string {
  if (preview.outgoing.length) return preview.outgoing.join(' + ')
  const first = preview.slot.replaces.split('|')[0]?.trim()
  return first || ''
}

/** "שם 3×5" for the incoming exercise(s). */
export function incomingLabel(preview: SlotPreview): string {
  return preview.incoming.map((e) => `${e.name} (${e.sets}×${e.reps})`).join(' + ')
}

/** Preview of every slot of a tier against the live plan (nothing is written). */
export function planSlotSwap(
  slots: SkillSlotRecipe[],
  days: WorkoutDay[],
  morning: MorningRoutineState,
): SlotPreview[] {
  return slots.map((slot) => {
    const targetLabel = SKILL_SLOT_TARGET_LABELS[slot.target]
    const routineId = morningRoutineId(slot)
    if (routineId) {
      const result = swapList(
        morning.routines[routineId].exercises,
        slot,
        morningName,
        toMorningExercise,
      )
      return {
        slot,
        targetLabel,
        places: [`שגרת בוקר ${routineId}`],
        placeSummary: `שגרת בוקר ${routineId}`,
        outgoing: result.removed,
        incoming: slot.exercises,
        mode: result.removed.length ? 'replace' : 'append',
        missingTarget: false,
        alreadyApplied: !result.added.length && !result.removed.length,
      }
    }
    const containers = containersFor(slot, days)
    const outgoing = new Set<string>()
    let changes = 0
    for (const c of containers) {
      const result = swapList(listOf(days[c.dayIndex], c.sessionIndex), slot, (e) => e.name, toExercise)
      result.removed.forEach((n) => outgoing.add(n))
      changes += result.added.length + result.removed.length
    }
    return {
      slot,
      targetLabel,
      places: containers.map((c) => c.label),
      placeSummary: summarizeContainers(containers) || targetLabel,
      outgoing: [...outgoing],
      incoming: slot.exercises,
      mode: outgoing.size ? 'replace' : 'append',
      missingTarget: containers.length === 0,
      alreadyApplied: containers.length > 0 && changes === 0,
    }
  })
}

/** Write program slots into the active program's days (pure). */
export function applyProgramSlots(days: WorkoutDay[], slots: SkillSlotRecipe[]): WorkoutDay[] {
  let next = days
  for (const slot of slots) {
    for (const c of containersFor(slot, next)) {
      const day = next[c.dayIndex]
      const { list } = swapList(listOf(day, c.sessionIndex), slot, (e) => e.name, toExercise)
      const updated: WorkoutDay =
        c.sessionIndex == null
          ? { ...day, exercises: list }
          : {
              ...day,
              sessions: day.sessions.map((s, i) => (i === c.sessionIndex ? { ...s, exercises: list } : s)),
            }
      next = next.map((d, i) => (i === c.dayIndex ? updated : d))
    }
  }
  return next
}

/** New exercise list for each morning routine touched by the slots. */
export function applyMorningSlots(
  morning: MorningRoutineState,
  slots: SkillSlotRecipe[],
): Partial<Record<'A' | 'B', MorningExercise[]>> {
  const out: Partial<Record<'A' | 'B', MorningExercise[]>> = {}
  for (const slot of slots) {
    const id = morningRoutineId(slot)
    if (!id) continue
    const current = out[id] ?? morning.routines[id].exercises
    out[id] = swapList(current, slot, morningName, toMorningExercise).list
  }
  return out
}

/**
 * Swap a track back to tier `toOrder` in the plan (reset / un-master).
 * Recipes are grouped per workout slot (target + role); for each group the
 * exercise that belongs to tier `toOrder` (the latest one at or below it, else
 * the original plan exercise from `original`) replaces whatever later tiers
 * swapped in. Nothing to restore (e.g. an appended finisher) → it is removed.
 */
export function rewindRecipes(
  nodes: SkillNode[],
  toOrder: number,
  original: (slot: SkillSlotRecipe) => SkillSlotExercise | null,
): SkillSlotRecipe[] {
  const groups = new Map<string, { order: number; slot: SkillSlotRecipe }[]>()
  for (const n of [...nodes].filter((x) => !x.deleted).sort((a, b) => a.order - b.order)) {
    for (const slot of n.slots) {
      const key = `${slot.target}|${slot.role}`
      groups.set(key, [...(groups.get(key) ?? []), { order: n.order, slot }])
    }
  }
  const out: SkillSlotRecipe[] = []
  for (const list of groups.values()) {
    const later = list.filter((x) => x.order > toOrder)
    if (!later.length) continue
    const home = [...list].reverse().find((x) => x.order <= toOrder)
    const first = list[0]!.slot
    const exercises = home ? home.slot.exercises : [original(first)].filter((e): e is SkillSlotExercise => !!e)
    const laterNames = later.flatMap((x) => x.slot.exercises.map((e) => e.name.trim()))
    const keep = new Set(exercises.map((e) => e.name.trim()))
    const chain = [...new Set(laterNames.filter((n) => n && !keep.has(n)))]
    if (!chain.length) continue
    out.push({ ...first, replaces: chain.join('|'), exercises })
  }
  return out
}
