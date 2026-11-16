/**
 * Data-driven Skill Tree ("עץ מיומנויות ואבני דרך").
 *
 * Master tracks (branches) hold ordered tiers (nodes, Tier 1 → 5). Each tier
 * has a status (mastered / active / queued / locked), measures linked to real
 * data (workout logs, morning routine or a manual benchmark) scored from
 * baseline → target, and a "slot recipe" describing which exercise in which
 * workout it replaces (Smart Slot Swap). Synced inside the
 * `consistency_day_marks` JSON under the reserved key `__skillTree`
 * (per-entity last-write-wins, tombstones on delete).
 */

import type { BodyMeasurement } from './bodyMeasurements'
import type { MorningRoutineState } from './morningRoutine'
import type { SetLog, WeightEntry, WorkoutDay, WorkoutLog } from './types'
import { dayAllExercises, localDateKey, parseLocalDateKey, uid, WEEKDAY_SHORT } from './types'
import { LEGACY_SEED_IDS, SKILL_SEED_MIGRATED_AT, seedSkillBranches, seedSkillNodes } from './skillTreeSeed'

export type SkillBranchStatus = 'active_focus' | 'queued_next_block' | 'completed'
export type SkillSourceType =
  | 'workout_exercise'
  | 'morning_routine'
  | 'body_metric'
  | 'manual_benchmark'
export type SkillMetricType =
  | 'weight_x_reps'
  | 'sets_x_reps'
  | 'duration_seconds'
  | 'body_stat'
  | 'max_reps'
  /** Distance to the floor (cm) — lower is better (splits / mobility). */
  | 'gap_cm'
export type SkillBodyStat = 'weight' | 'waist' | 'bodyFat'
export type SkillIconKey =
  | 'muscleUp'
  | 'frontLever'
  | 'handstand'
  | 'oneArm'
  | 'physique'
  | 'target'
  | 'flame'
  | 'trophy'
  | 'flag'
  | 'leg'
  | 'stretch'

export type SkillTierStatus = 'mastered' | 'active' | 'queued' | 'locked'

export type SkillSlotRole =
  | 'explosive_skill_slot'
  | 'primary_strength_slot'
  | 'horizontal_secondary_slot'
  | 'accessory_core_slot'
  | 'mobility_finisher_slot'

/** Which workout a slot lives in (resolved against the active program / morning routine). */
export type SkillSlotTarget = 'pull' | 'push' | 'combo' | 'morningA' | 'morningB'

export type SkillSlotExercise = {
  name: string
  sets: number
  reps: string
  rest: string
  notes: string
}

/** "מתכון שיבוץ לאימון": replace `replaces` (aliases, `|`) or append when empty / not found. */
export type SkillSlotRecipe = {
  target: SkillSlotTarget
  role: SkillSlotRole
  replaces: string
  exercises: SkillSlotExercise[]
}

/**
 * Structured metric value. Meaning per metric:
 * - weight_x_reps: amount = kg, reps = reps
 * - sets_x_reps / max_reps: amount = reps per set, sets = set count
 * - duration_seconds: amount = seconds per set, sets = set count
 * - body_stat: amount = kg / cm / %
 */
export type SkillValue = {
  amount: number | null
  reps: number | null
  sets: number | null
}

export type SkillManualValue = { value: SkillValue; at: string }

export type SkillMeasure = {
  id: string
  label: string
  sourceType: SkillSourceType
  /** Exercise name(s) to match in workout logs / morning routine, `|`-separated aliases. */
  linkedExercise: string
  metricType: SkillMetricType
  /** Only for body_stat. */
  bodyStat: SkillBodyStat | null
  baseline: SkillValue
  target: SkillValue
  /** Manual current value / override (the better of it and the logs is used). */
  manual: SkillManualValue | null
}

export type SkillProgression = {
  at: string
  fromTitle: string
  toTitle: string
}

export type SkillNode = {
  id: string
  branchId: string
  title: string
  /** Free note (e.g. how the baseline was measured). */
  note: string
  order: number
  tierStatus: SkillTierStatus
  /** What must be mastered before this tier (free text, shown in the blueprint). */
  prerequisites: string
  measures: SkillMeasure[]
  /** Smart Slot Swap recipe(s): where this tier's exercises go in the weekly plan. */
  slots: SkillSlotRecipe[]
  /** ISO time the slots were written into the plan (null = not applied yet). */
  slotsAppliedAt: string | null
  progressions: SkillProgression[]
  updatedAt: string
  deleted?: boolean
}

export type SkillBranch = {
  id: string
  title: string
  subtitle: string
  icon: SkillIconKey
  status: SkillBranchStatus
  order: number
  nextUnlockTitle: string
  updatedAt: string
  deleted?: boolean
}

export type SkillTreeState = {
  blockLabel: string
  blockStartDate: string
  blockWeeks: number
  deloadWeeks: number[]
  benchmarkWeek: number
  settingsUpdatedAt: string
  branches: Record<string, SkillBranch>
  nodes: Record<string, SkillNode>
}

export const SKILL_TREE_STORAGE_KEY = 'tn.skillTree.v1'
export { SKILL_TREE_PAYLOAD_KEY } from './weeklyConsistency'
const EPOCH = '1970-01-01T00:00:00.000Z'

export const SKILL_STATUS_LABELS: Record<SkillBranchStatus, string> = {
  active_focus: 'בפוקוס פעיל',
  queued_next_block: 'בתור',
  completed: 'הושלם',
}

export const SKILL_TIER_LABELS: Record<SkillTierStatus, string> = {
  mastered: 'נשלט ✓',
  active: 'בפוקוס פעיל כרגע 🎯',
  queued: 'בתור לבלוק הבא ⏳',
  locked: 'נעול - שלב הבא 🔒',
}

export const SKILL_SLOT_TARGET_LABELS: Record<SkillSlotTarget, string> = {
  pull: 'אימון 1: כוח משיכה',
  push: 'אימון 2: כוח דחיפה ורגליים',
  combo: 'אימון 3: כוח עליון משולב',
  morningA: 'שגרת בוקר A',
  morningB: 'שגרת בוקר B',
}

export const SKILL_SLOT_ROLE_LABELS: Record<SkillSlotRole, string> = {
  explosive_skill_slot: 'סלוט סקיל מתפרץ (תרגיל 1-2)',
  primary_strength_slot: 'סלוט כוח ראשי',
  horizontal_secondary_slot: 'סלוט משני / אופקי',
  accessory_core_slot: 'סלוט עזר / ליבה',
  mobility_finisher_slot: 'פינישר גמישות (6 דקות בסוף האימון)',
}

/** Recommended maximum of tracks in active focus at once. */
export const SKILL_FOCUS_LIMIT = 4

export const SKILL_SOURCE_LABELS: Record<SkillSourceType, string> = {
  workout_exercise: 'תרגיל מהאימונים',
  morning_routine: 'שגרת בוקר',
  body_metric: 'מדדי גוף',
  manual_benchmark: 'בדיקת שיא ידנית',
}

export const SKILL_METRIC_LABELS: Record<SkillMetricType, string> = {
  weight_x_reps: 'משקל × חזרות',
  sets_x_reps: 'סטים × חזרות',
  duration_seconds: 'זמן (שניות)',
  body_stat: 'מדד גוף',
  max_reps: 'מקסימום חזרות',
  gap_cm: 'מרחק מהרצפה (ס"מ)',
}

export const SKILL_BODY_STAT_LABELS: Record<SkillBodyStat, string> = {
  weight: 'משקל גוף',
  waist: 'היקף מותן',
  bodyFat: 'אחוז שומן',
}

const BODY_STAT_UNITS: Record<SkillBodyStat, string> = {
  weight: 'ק"ג',
  waist: 'ס"מ',
  bodyFat: '%',
}

/** Weight goes up; waist and body fat go down. */
export function bodyStatDirection(stat: SkillBodyStat | null): 'increase' | 'decrease' {
  return stat === 'waist' || stat === 'bodyFat' ? 'decrease' : 'increase'
}

// ---------------------------------------------------------------------------
// Seed (8 tracks × 5 tiers) lives in ./skillTreeSeed
// ---------------------------------------------------------------------------

export function v(amount: number | null, extra: { reps?: number; sets?: number } = {}): SkillValue {
  return { amount, reps: extra.reps ?? null, sets: extra.sets ?? null }
}

/** Most recent Sunday on or before `today` (week 1 of the block). */
function weekStartOf(today: string): string {
  const d = parseLocalDateKey(today)
  d.setDate(d.getDate() - d.getDay())
  return localDateKey(d)
}

export function createDefaultSkillTree(today = localDateKey()): SkillTreeState {
  return {
    blockLabel: 'בלוק 3',
    blockStartDate: weekStartOf(today),
    blockWeeks: 12,
    deloadWeeks: [5, 10],
    benchmarkWeek: 12,
    settingsUpdatedAt: EPOCH,
    branches: Object.fromEntries(seedSkillBranches().map((b) => [b.id, b])),
    nodes: Object.fromEntries(seedSkillNodes().map((n) => [n.id, n])),
  }
}

// ---------------------------------------------------------------------------
// Normalize + merge
// ---------------------------------------------------------------------------

const STATUSES: readonly SkillBranchStatus[] = ['active_focus', 'queued_next_block', 'completed']
const SOURCES: readonly SkillSourceType[] = [
  'workout_exercise',
  'morning_routine',
  'body_metric',
  'manual_benchmark',
]
const METRICS: readonly SkillMetricType[] = [
  'weight_x_reps',
  'sets_x_reps',
  'duration_seconds',
  'body_stat',
  'max_reps',
  'gap_cm',
]
const TIER_STATUSES: readonly SkillTierStatus[] = ['mastered', 'active', 'queued', 'locked']
const SLOT_TARGETS: readonly SkillSlotTarget[] = ['pull', 'push', 'combo', 'morningA', 'morningB']
const SLOT_ROLES: readonly SkillSlotRole[] = [
  'explosive_skill_slot',
  'primary_strength_slot',
  'horizontal_secondary_slot',
  'accessory_core_slot',
  'mobility_finisher_slot',
]
const BODY_STATS: readonly SkillBodyStat[] = ['weight', 'waist', 'bodyFat']
export const SKILL_ICON_KEYS: readonly SkillIconKey[] = [
  'muscleUp',
  'frontLever',
  'handstand',
  'oneArm',
  'physique',
  'target',
  'flame',
  'trophy',
  'flag',
  'leg',
  'stretch',
]

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

function str(value: unknown, max = 300): string {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

function num(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

function iso(value: unknown): string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : EPOCH
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function normalizeSkillValue(raw: unknown): SkillValue {
  const o = obj(raw)
  return { amount: num(o.amount), reps: num(o.reps), sets: num(o.sets) }
}

function normalizeMeasure(raw: unknown, fallbackId: string): SkillMeasure {
  const o = obj(raw)
  const metricType = pick(o.metricType, METRICS, 'max_reps')
  const manual = obj(o.manual)
  return {
    id: str(o.id, 80) || fallbackId,
    label: str(o.label, 160),
    sourceType: pick(o.sourceType, SOURCES, 'manual_benchmark'),
    linkedExercise: str(o.linkedExercise, 300),
    metricType,
    bodyStat:
      metricType === 'body_stat' ? pick(o.bodyStat, BODY_STATS, 'weight') : null,
    baseline: normalizeSkillValue(o.baseline),
    target: normalizeSkillValue(o.target),
    manual:
      o.manual && typeof manual.at === 'string'
        ? { value: normalizeSkillValue(manual.value), at: iso(manual.at) }
        : null,
  }
}

function normalizeSlot(raw: unknown): SkillSlotRecipe {
  const o = obj(raw)
  return {
    target: pick(o.target, SLOT_TARGETS, 'pull'),
    role: pick(o.role, SLOT_ROLES, 'primary_strength_slot'),
    replaces: str(o.replaces, 300),
    exercises: Array.isArray(o.exercises)
      ? o.exercises.slice(0, 6).map((e) => {
          const eo = obj(e)
          return {
            name: str(eo.name, 160),
            sets: Math.min(20, Math.max(1, Math.round(num(eo.sets) ?? 3))),
            reps: str(eo.reps, 80),
            rest: str(eo.rest, 40),
            notes: str(eo.notes, 400),
          }
        }).filter((e) => e.name.trim())
      : [],
  }
}

function normalizeNode(raw: unknown, key: string): SkillNode | null {
  const o = obj(raw)
  const id = str(o.id, 80) || key
  const branchId = str(o.branchId, 80)
  if (!id || !branchId) return null
  const measures = Array.isArray(o.measures)
    ? o.measures.slice(0, 8).map((m, i) => normalizeMeasure(m, `${id}-m${i + 1}`))
    : []
  const progressions = Array.isArray(o.progressions)
    ? o.progressions.slice(-20).map((p) => {
        const po = obj(p)
        return { at: iso(po.at), fromTitle: str(po.fromTitle, 200), toTitle: str(po.toTitle, 200) }
      })
    : []
  return {
    id,
    branchId,
    title: str(o.title, 200),
    note: str(o.note, 500),
    order: num(o.order) ?? 0,
    // Legacy nodes (before tiers) carried `isActiveInCurrentBlock`.
    tierStatus: pick(
      o.tierStatus,
      TIER_STATUSES,
      o.isActiveInCurrentBlock === false ? 'queued' : 'active',
    ),
    prerequisites: str(o.prerequisites, 400),
    measures,
    slots: Array.isArray(o.slots) ? o.slots.slice(0, 4).map(normalizeSlot) : [],
    slotsAppliedAt: typeof o.slotsAppliedAt === 'string' ? iso(o.slotsAppliedAt) : null,
    progressions,
    updatedAt: iso(o.updatedAt),
    ...(o.deleted === true ? { deleted: true } : {}),
  }
}

function normalizeBranch(raw: unknown, key: string): SkillBranch | null {
  const o = obj(raw)
  const id = str(o.id, 80) || key
  if (!id) return null
  return {
    id,
    title: str(o.title, 200),
    subtitle: str(o.subtitle, 300),
    icon: pick(o.icon, SKILL_ICON_KEYS, 'target'),
    status: pick(o.status, STATUSES, 'active_focus'),
    order: num(o.order) ?? 0,
    nextUnlockTitle: str(o.nextUnlockTitle, 300),
    updatedAt: iso(o.updatedAt),
    ...(o.deleted === true ? { deleted: true } : {}),
  }
}

/** Defensive parse; seeds are filled in so a fresh device always has the tree. */
export function normalizeSkillTree(raw: unknown, today = localDateKey()): SkillTreeState {
  const base = createDefaultSkillTree(today)
  const o = obj(raw)
  if (!Object.keys(o).length) return base
  const branches: Record<string, SkillBranch> = { ...base.branches }
  for (const [key, value] of Object.entries(obj(o.branches))) {
    const b = normalizeBranch(value, key)
    if (b) branches[b.id] = b
  }
  const nodes: Record<string, SkillNode> = { ...base.nodes }
  for (const [key, value] of Object.entries(obj(o.nodes))) {
    const n = normalizeNode(value, key)
    if (n) nodes[n.id] = n
  }
  const start = str(o.blockStartDate, 10)
  const deload = Array.isArray(o.deloadWeeks)
    ? o.deloadWeeks.map(num).filter((n): n is number => n != null && n > 0)
    : base.deloadWeeks
  // The original 5-branch seed (incl. body-stat "V-Taper" goals) is retired.
  for (const id of LEGACY_SEED_IDS) {
    const tombstone = (at: string) => (at > SKILL_SEED_MIGRATED_AT ? at : SKILL_SEED_MIGRATED_AT)
    const b = branches[id]
    if (b && !b.deleted) branches[id] = { ...b, deleted: true, updatedAt: tombstone(b.updatedAt) }
    const n = nodes[id]
    if (n && !n.deleted) nodes[id] = { ...n, deleted: true, updatedAt: tombstone(n.updatedAt) }
  }
  return {
    blockLabel: str(o.blockLabel, 60) || base.blockLabel,
    blockStartDate: /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : base.blockStartDate,
    blockWeeks: Math.min(52, Math.max(1, num(o.blockWeeks) ?? base.blockWeeks)),
    deloadWeeks: deload,
    benchmarkWeek: num(o.benchmarkWeek) ?? base.benchmarkWeek,
    settingsUpdatedAt: iso(o.settingsUpdatedAt),
    branches,
    nodes,
  }
}

function lww<T extends { updatedAt: string }>(
  local: Record<string, T>,
  remote: Record<string, T>,
): Record<string, T> {
  const out: Record<string, T> = { ...local }
  for (const [id, r] of Object.entries(remote)) {
    const l = out[id]
    if (!l || r.updatedAt > l.updatedAt) out[id] = r
  }
  return out
}

export function mergeSkillTree(local: SkillTreeState, remote: SkillTreeState): SkillTreeState {
  const settings =
    remote.settingsUpdatedAt > local.settingsUpdatedAt ? remote : local
  return {
    blockLabel: settings.blockLabel,
    blockStartDate:
      remote.settingsUpdatedAt === local.settingsUpdatedAt
        ? // Neither device set it explicitly: keep the earliest implicit start.
          local.blockStartDate < remote.blockStartDate
          ? local.blockStartDate
          : remote.blockStartDate
        : settings.blockStartDate,
    blockWeeks: settings.blockWeeks,
    deloadWeeks: settings.deloadWeeks,
    benchmarkWeek: settings.benchmarkWeek,
    settingsUpdatedAt: settings.settingsUpdatedAt,
    branches: lww(local.branches, remote.branches),
    nodes: lww(local.nodes, remote.nodes),
  }
}

// ---------------------------------------------------------------------------
// Pure edit operations (each stamps updatedAt)
// ---------------------------------------------------------------------------

const now = () => new Date().toISOString()

export function liveBranches(state: SkillTreeState): SkillBranch[] {
  return Object.values(state.branches)
    .filter((b) => !b.deleted)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'he'))
}

export function liveNodes(state: SkillTreeState, branchId: string): SkillNode[] {
  return Object.values(state.nodes)
    .filter((n) => !n.deleted && n.branchId === branchId)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'he'))
}

export function upsertBranch(state: SkillTreeState, branch: SkillBranch): SkillTreeState {
  return { ...state, branches: { ...state.branches, [branch.id]: { ...branch, updatedAt: now() } } }
}

export function newBranch(state: SkillTreeState, title = ''): SkillBranch {
  const order = liveBranches(state).reduce((max, b) => Math.max(max, b.order), 0) + 1
  return {
    id: `st-${uid()}`,
    title,
    subtitle: '',
    icon: 'target',
    status: 'active_focus',
    order,
    nextUnlockTitle: '',
    updatedAt: now(),
  }
}

export function deleteBranch(state: SkillTreeState, id: string): SkillTreeState {
  const at = now()
  const branch = state.branches[id]
  if (!branch) return state
  const nodes = { ...state.nodes }
  for (const n of Object.values(nodes)) {
    if (n.branchId === id && !n.deleted) nodes[n.id] = { ...n, deleted: true, updatedAt: at }
  }
  return { ...state, branches: { ...state.branches, [id]: { ...branch, deleted: true, updatedAt: at } }, nodes }
}

export function emptyMeasure(): SkillMeasure {
  return {
    id: `m-${uid()}`,
    label: '',
    sourceType: 'workout_exercise',
    linkedExercise: '',
    metricType: 'sets_x_reps',
    bodyStat: null,
    baseline: v(null),
    target: v(null),
    manual: null,
  }
}

export function newNode(state: SkillTreeState, branchId: string): SkillNode {
  const order = liveNodes(state, branchId).reduce((max, n) => Math.max(max, n.order), 0) + 1
  return {
    id: `sn-${uid()}`,
    branchId,
    title: '',
    note: '',
    order,
    tierStatus: 'locked',
    prerequisites: '',
    measures: [emptyMeasure()],
    slots: [],
    slotsAppliedAt: null,
    progressions: [],
    updatedAt: now(),
  }
}

export function emptySlot(target: SkillSlotTarget = 'pull'): SkillSlotRecipe {
  return { target, role: 'primary_strength_slot', replaces: '', exercises: [] }
}

export function upsertNode(state: SkillTreeState, node: SkillNode): SkillTreeState {
  return { ...state, nodes: { ...state.nodes, [node.id]: { ...node, updatedAt: now() } } }
}

export function deleteNode(state: SkillTreeState, id: string): SkillTreeState {
  const node = state.nodes[id]
  if (!node) return state
  return { ...state, nodes: { ...state.nodes, [id]: { ...node, deleted: true, updatedAt: now() } } }
}

/** Swap a node with its neighbour inside the branch (re-numbers the whole branch). */
export function moveNode(state: SkillTreeState, id: string, direction: -1 | 1): SkillTreeState {
  const node = state.nodes[id]
  if (!node) return state
  const list = liveNodes(state, node.branchId)
  const index = list.findIndex((n) => n.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= list.length) return state
  const reordered = [...list]
  ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
  const at = now()
  const nodes = { ...state.nodes }
  reordered.forEach((n, i) => {
    if (n.order !== i + 1) nodes[n.id] = { ...n, order: i + 1, updatedAt: at }
  })
  return { ...state, nodes }
}

export function setMeasureManual(
  state: SkillTreeState,
  nodeId: string,
  measureId: string,
  value: SkillValue | null,
): SkillTreeState {
  const node = state.nodes[nodeId]
  if (!node) return state
  const at = now()
  return upsertNode(state, {
    ...node,
    measures: node.measures.map((m) =>
      m.id === measureId ? { ...m, manual: value ? { value, at } : null } : m,
    ),
  })
}

export function setBlockSettings(
  state: SkillTreeState,
  patch: Partial<Pick<SkillTreeState, 'blockLabel' | 'blockStartDate' | 'blockWeeks' | 'deloadWeeks' | 'benchmarkWeek'>>,
): SkillTreeState {
  return { ...state, ...patch, settingsUpdatedAt: now() }
}

/** Previous tier still in focus when `nodeId` gets activated (it becomes mastered). */
export function activeTierOf(state: SkillTreeState, branchId: string): SkillNode | null {
  return liveNodes(state, branchId).find((n) => n.tierStatus === 'active') ?? null
}

/**
 * Put a tier in active focus: lower tiers become mastered, any other active
 * tier of the track is retired (mastered if lower, locked if higher), and the
 * track joins active focus. `slotsApplied` stamps the Smart Slot Swap.
 */
export function activateTier(
  state: SkillTreeState,
  nodeId: string,
  opts: { slotsApplied: boolean },
): SkillTreeState {
  const node = state.nodes[nodeId]
  if (!node) return state
  const at = now()
  const nodes = { ...state.nodes }
  let fromTitle = ''
  for (const n of liveNodes(state, node.branchId)) {
    if (n.id === nodeId) continue
    if (n.order < node.order && n.tierStatus !== 'mastered') {
      if (n.tierStatus === 'active') fromTitle = n.title
      nodes[n.id] = { ...n, tierStatus: 'mastered', updatedAt: at }
    } else if (n.order > node.order && n.tierStatus === 'active') {
      nodes[n.id] = { ...n, tierStatus: 'locked', updatedAt: at }
    }
  }
  nodes[nodeId] = {
    ...node,
    tierStatus: 'active',
    slotsAppliedAt: opts.slotsApplied ? at : node.slotsAppliedAt,
    progressions: fromTitle
      ? [...node.progressions, { at, fromTitle, toTitle: node.title }]
      : node.progressions,
    updatedAt: at,
  }
  const branch = state.branches[node.branchId]
  const branches = branch
    ? { ...state.branches, [branch.id]: { ...branch, status: 'active_focus' as const, updatedAt: at } }
    : state.branches
  return { ...state, nodes, branches }
}

/** Mastery gate passed: tier → mastered; the track completes when nothing is left. */
export function masterTier(state: SkillTreeState, nodeId: string): SkillTreeState {
  const node = state.nodes[nodeId]
  if (!node) return state
  const at = now()
  const nodes = { ...state.nodes, [nodeId]: { ...node, tierStatus: 'mastered' as const, updatedAt: at } }
  const rest = Object.values(nodes).filter((n) => !n.deleted && n.branchId === node.branchId)
  const branch = state.branches[node.branchId]
  let branches = state.branches
  if (branch && rest.every((n) => n.tierStatus === 'mastered')) {
    branches = { ...branches, [branch.id]: { ...branch, status: 'completed', updatedAt: at } }
  }
  return { ...state, nodes, branches }
}

export function markSlotsApplied(state: SkillTreeState, nodeId: string): SkillTreeState {
  const node = state.nodes[nodeId]
  if (!node) return state
  return upsertNode(state, { ...node, slotsAppliedAt: now() })
}

// ---------------------------------------------------------------------------
// Evaluation (auto progress from logs)
// ---------------------------------------------------------------------------

export type SkillDataSources = {
  workoutLogs: WorkoutLog[]
  setLogs: SetLog[]
  weightLogs: WeightEntry[]
  bodyMeasurements: BodyMeasurement[]
  morningRoutine: MorningRoutineState
  programDays: WorkoutDay[]
}

export type SkillCurrentSource = 'log' | 'manual' | 'baseline' | 'body'

export type MeasureEvaluation = {
  measure: SkillMeasure
  current: SkillValue | null
  currentSource: SkillCurrentSource | null
  /** YYYY-MM-DD of the data point behind `current`. */
  currentDate: string | null
  /** Effective baseline (body metrics fall back to the first reading in the block). */
  baseline: SkillValue
  progress: number
  complete: boolean
  feeds: string[]
  /** Number of logged sessions / readings / morning completions that matched. */
  evidenceCount: number
}

export type NodeEvaluation = {
  node: SkillNode
  status: SkillTierStatus
  measures: MeasureEvaluation[]
  /** 1 for mastered tiers, otherwise the average of the measures. */
  progress: number
  /** Mastered, or every measure at 100%. */
  complete: boolean
  /** Active tier whose measures all hit 100% — the mastery gate is open. */
  gateReady: boolean
  feeds: string[]
}

export type BranchFocus = 'active' | 'queued' | 'completed'

export type BranchEvaluation = {
  branch: SkillBranch
  nodes: NodeEvaluation[]
  /** (mastered tiers + active tier progress) / tier count. */
  progress: number
  masteredCount: number
  tierCount: number
  activeNode: NodeEvaluation | null
  /** First not-yet-mastered tier after the active one (or the next queued tier). */
  nextNode: NodeEvaluation | null
  focus: BranchFocus
  complete: boolean
}

function normalizeName(name: string): string {
  return name
    .normalize('NFKC')
    .toLocaleLowerCase('he')
    .replace(/["'״׳()\-–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function linkAliases(link: string): string[] {
  return link
    .split('|')
    .map(normalizeName)
    .filter((a) => a.length >= 2)
}

export function matchesLink(name: string, link: string): boolean {
  const aliases = linkAliases(link)
  if (!aliases.length) return false
  const n = normalizeName(name)
  return aliases.some((a) => n.includes(a))
}

type PerfSet = { weightKg: number | null; reps: number }
type PerfSession = { date: string; sets: PerfSet[] }

function dateOf(isoOrKey: string | undefined): string {
  if (!isoOrKey) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrKey)) return isoOrKey
  const d = new Date(isoOrKey)
  return Number.isNaN(d.getTime()) ? '' : localDateKey(d)
}

function collectSessions(link: string, sources: SkillDataSources, since: string): PerfSession[] {
  const sessions: PerfSession[] = []
  for (const log of sources.workoutLogs) {
    const date = log.performedOn || dateOf(log.completedAt)
    if (!date || date < since) continue
    for (const ex of log.exercises) {
      if (!matchesLink(ex.name, link)) continue
      const sets = ex.sets
        .filter((s) => s.done !== false && s.reps != null && s.reps > 0)
        .map((s) => ({ weightKg: s.weightKg, reps: s.reps ?? 0 }))
      if (sets.length) sessions.push({ date, sets })
    }
  }
  const quick = new Map<string, PerfSession>()
  for (const log of sources.setLogs) {
    const date = dateOf(log.loggedAt)
    if (!date || date < since || !(log.reps > 0) || !matchesLink(log.exerciseName, link)) continue
    const key = `${date}|${normalizeName(log.exerciseName)}`
    const session = quick.get(key) ?? { date, sets: [] }
    session.sets.push({ weightKg: log.weightKg, reps: log.reps })
    quick.set(key, session)
  }
  return [...sessions, ...quick.values()]
}

function e1rm(weightKg: number, reps: number): number {
  if (!(weightKg > 0) || !(reps > 0)) return 0
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30)
}

/** Number of sets the metric is judged over (best N sets of one session). */
export function measureSetCount(measure: SkillMeasure): number {
  if (measure.metricType === 'max_reps' || measure.metricType === 'weight_x_reps') return 1
  return Math.max(1, Math.round(measure.target.sets ?? measure.baseline.sets ?? 1))
}

/** Comparable score of a value (higher = better) for performance metrics. */
function valueScore(measure: SkillMeasure, value: SkillValue | null): number | null {
  if (!value || value.amount == null) return null
  if (measure.metricType === 'weight_x_reps') {
    const reps = value.reps ?? measure.target.reps ?? 1
    return value.amount > 0 ? e1rm(value.amount, reps) : 0
  }
  const n = measureSetCount(measure)
  const cap = measure.target.amount ?? Number.POSITIVE_INFINITY
  const sets = Math.min(n, Math.max(1, value.sets ?? n))
  return (Math.min(value.amount, cap) * sets) / n
}

function bestFromSession(
  measure: SkillMeasure,
  session: PerfSession,
): { value: SkillValue; score: number } | null {
  if (measure.metricType === 'weight_x_reps') {
    let best: { value: SkillValue; score: number } | null = null
    for (const s of session.sets) {
      const w = s.weightKg ?? 0
      if (!(w > 0)) continue
      const score = e1rm(w, s.reps)
      if (!best || score > best.score) best = { value: v(w, { reps: s.reps }), score }
    }
    return best
  }
  const usable =
    measure.metricType === 'max_reps'
      ? session.sets.filter((s) => !(s.weightKg != null && s.weightKg > 0))
      : session.sets
  if (!usable.length) return null
  const n = measureSetCount(measure)
  const cap = measure.target.amount ?? Number.POSITIVE_INFINITY
  const top = usable.map((s) => s.reps).sort((a, b) => b - a).slice(0, n)
  const score = top.reduce((sum, r) => sum + Math.min(r, cap), 0) / n
  return { value: v(Math.min(...top), { sets: top.length }), score }
}

type BodyReading = { date: string; at: string; value: number }

function bodyReadings(stat: SkillBodyStat, sources: SkillDataSources): BodyReading[] {
  const out: BodyReading[] = []
  for (const m of sources.bodyMeasurements) {
    const value =
      stat === 'weight' ? m.weightKg : stat === 'waist' ? m.waistCircumferenceCm : m.bodyFatPercentage
    if (value != null && Number.isFinite(value)) {
      out.push({ date: dateOf(m.recordedAt), at: m.recordedAt, value })
    }
  }
  if (stat !== 'waist') {
    for (const w of sources.weightLogs) {
      const value = stat === 'weight' ? w.weightKg : (w.bodyFatPct ?? null)
      if (value != null && Number.isFinite(value) && value > 0) {
        out.push({ date: dateOf(w.loggedAt), at: w.loggedAt, value })
      }
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at))
}

function ratio(current: number, base: number, target: number): number {
  if (target === base) return current >= target ? 1 : 0
  return Math.max(0, Math.min(1, (current - base) / (target - base)))
}

function weekdaysLabel(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b)
  const names = sorted.map((d) => WEEKDAY_SHORT[d - 1] ?? '')
  return `${sorted.length > 1 ? 'ימים' : 'יום'} ${names.join('/')}`
}

/** Which program days / morning routines feed a measure (derived from live data). */
export function measureFeeds(measure: SkillMeasure, sources: SkillDataSources): string[] {
  if (measure.sourceType === 'body_metric') return ['מדדי גוף']
  if (measure.sourceType === 'morning_routine') {
    const routines = (['A', 'B'] as const).filter((id) =>
      sources.morningRoutine.routines[id].exercises.some((ex) =>
        matchesLink(`${ex.nameHe} ${ex.nameEn}`, measure.linkedExercise),
      ),
    )
    return routines.length
      ? routines.map((id) => `שגרת בוקר ${id}`)
      : ['שגרת בוקר']
  }
  if (!measure.linkedExercise.trim()) return [SKILL_SOURCE_LABELS[measure.sourceType]]
  const byFocus = new Map<string, number[]>()
  for (const day of sources.programDays) {
    if (day.isRest) continue
    if (!dayAllExercises(day).some((ex) => matchesLink(ex.name, measure.linkedExercise))) continue
    const focus = day.focus?.trim().replace(/^כוח\s+/, '') || 'אימון'
    byFocus.set(focus, [...(byFocus.get(focus) ?? []), day.dayNumber])
  }
  const feeds = [...byFocus.entries()].map(([focus, days]) => `${weekdaysLabel(days)} · ${focus}`)
  if (measure.sourceType === 'manual_benchmark') return ['בדיקת שיא', ...feeds]
  return feeds.length ? feeds : ['לא בתוכנית הפעילה']
}

function morningCount(measure: SkillMeasure, sources: SkillDataSources, since: string): number {
  const routines = new Set(
    (['A', 'B'] as const).filter((id) =>
      sources.morningRoutine.routines[id].exercises.some((ex) =>
        matchesLink(`${ex.nameHe} ${ex.nameEn}`, measure.linkedExercise),
      ),
    ),
  )
  return Object.entries(sources.morningRoutine.completions).filter(
    ([date, c]) => date >= since && c.done && c.routine && routines.has(c.routine),
  ).length
}

export function evaluateMeasure(
  measure: SkillMeasure,
  sources: SkillDataSources,
  since: string,
): MeasureEvaluation {
  const feeds = measureFeeds(measure, sources)
  const targetAmount = measure.target.amount

  if (measure.metricType === 'body_stat') {
    const stat = measure.bodyStat ?? 'weight'
    const readings = bodyReadings(stat, sources)
    const latest = readings[readings.length - 1]
    const manual = measure.manual
    const useManual = !!manual && manual.value.amount != null && (!latest || manual.at > latest.at)
    const currentAmount = useManual ? manual!.value.amount : (latest?.value ?? null)
    const firstInBlock = readings.find((r) => r.date >= since)
    const baseAmount = measure.baseline.amount ?? firstInBlock?.value ?? currentAmount
    const baseline = v(baseAmount)
    let progress = 0
    if (currentAmount != null && targetAmount != null && baseAmount != null) {
      const increase = bodyStatDirection(stat) === 'increase'
      const met = increase ? currentAmount >= targetAmount : currentAmount <= targetAmount
      progress = met
        ? 1
        : increase
          ? ratio(currentAmount, baseAmount, targetAmount)
          : ratio(-currentAmount, -baseAmount, -targetAmount)
    }
    return {
      measure,
      current: currentAmount == null ? null : v(currentAmount),
      currentSource: currentAmount == null ? null : useManual ? 'manual' : 'body',
      currentDate: useManual ? dateOf(manual!.at) : (latest?.date ?? null),
      baseline,
      progress,
      complete: progress >= 0.999,
      feeds,
      evidenceCount: readings.filter((r) => r.date >= since).length,
    }
  }

  if (measure.metricType === 'gap_cm') {
    // Manual-only, lower is better; the latest entry is the current value.
    const base = measure.baseline.amount
    const manualAmount = measure.manual?.value.amount ?? null
    const currentAmount = manualAmount ?? base
    let progress = 0
    if (currentAmount != null && targetAmount != null && base != null) {
      progress = currentAmount <= targetAmount ? 1 : ratio(-currentAmount, -base, -targetAmount)
    }
    return {
      measure,
      current: currentAmount == null ? null : v(currentAmount),
      currentSource: manualAmount != null ? 'manual' : base != null ? 'baseline' : null,
      currentDate: manualAmount != null ? dateOf(measure.manual!.at) : null,
      baseline: measure.baseline,
      progress,
      complete: progress >= 0.999,
      feeds,
      evidenceCount: 0,
    }
  }

  type Candidate = { value: SkillValue; score: number; source: SkillCurrentSource; date: string | null }
  const candidates: Candidate[] = []
  const baseScore = valueScore(measure, measure.baseline)
  if (baseScore != null) {
    candidates.push({ value: measure.baseline, score: baseScore, source: 'baseline', date: null })
  }
  let evidenceCount = 0
  if (measure.sourceType === 'workout_exercise' && measure.linkedExercise.trim()) {
    const sessions = collectSessions(measure.linkedExercise, sources, since)
    evidenceCount = sessions.length
    for (const session of sessions) {
      const best = bestFromSession(measure, session)
      if (best) candidates.push({ ...best, source: 'log', date: session.date })
    }
  } else if (measure.sourceType === 'morning_routine') {
    evidenceCount = morningCount(measure, sources, since)
  }
  const manualScore = valueScore(measure, measure.manual?.value ?? null)
  if (measure.manual && manualScore != null) {
    candidates.push({
      value: measure.manual.value,
      score: manualScore,
      source: 'manual',
      date: dateOf(measure.manual.at),
    })
  }
  // Best performance wins; on a tie the most recent data point is shown.
  const best = candidates.reduce<Candidate | null>((acc, c) => {
    if (!acc) return c
    if (c.score > acc.score + 1e-9) return c
    if (Math.abs(c.score - acc.score) <= 1e-9 && (c.date ?? '') > (acc.date ?? '')) return c
    return acc
  }, null)
  const targetScore = valueScore(measure, measure.target)
  const progress =
    best && targetScore != null ? ratio(best.score, baseScore ?? 0, targetScore) : 0
  return {
    measure,
    current: best?.value ?? null,
    currentSource: best?.source ?? null,
    currentDate: best?.date ?? null,
    baseline: measure.baseline,
    progress,
    complete: progress >= 0.999,
    feeds,
    evidenceCount,
  }
}

export function evaluateNode(
  node: SkillNode,
  sources: SkillDataSources,
  since: string,
): NodeEvaluation {
  const measures = node.measures.map((m) => evaluateMeasure(m, sources, since))
  const mastered = node.tierStatus === 'mastered'
  const measured = measures.length
    ? measures.reduce((sum, m) => sum + m.progress, 0) / measures.length
    : 0
  const allMet = measures.length > 0 && measures.every((m) => m.complete)
  const slotFeeds = node.slots.map((s) => SKILL_SLOT_TARGET_LABELS[s.target])
  return {
    node,
    status: node.tierStatus,
    measures,
    progress: mastered ? 1 : measured,
    complete: mastered || allMet,
    gateReady: node.tierStatus === 'active' && allMet,
    feeds: [...new Set([...measures.flatMap((m) => m.feeds), ...(measures.length ? [] : slotFeeds)])],
  }
}

export function evaluateSkillTree(
  state: SkillTreeState,
  sources: SkillDataSources,
): BranchEvaluation[] {
  const since = state.blockStartDate
  return liveBranches(state).map((branch) => {
    const nodes = liveNodes(state, branch.id).map((n) => evaluateNode(n, sources, since))
    const masteredCount = nodes.filter((n) => n.status === 'mastered').length
    const activeNode = nodes.find((n) => n.status === 'active') ?? null
    const progress = nodes.length
      ? nodes.reduce(
          (sum, n) => sum + (n.status === 'mastered' ? 1 : n.status === 'active' ? n.progress : 0),
          0,
        ) / nodes.length
      : 0
    const nextNode =
      nodes.find(
        (n) =>
          n.status !== 'mastered' &&
          n.status !== 'active' &&
          (!activeNode || n.node.order > activeNode.node.order),
      ) ?? null
    const complete = nodes.length > 0 && masteredCount === nodes.length
    const focus: BranchFocus =
      complete || branch.status === 'completed' ? 'completed' : activeNode ? 'active' : 'queued'
    return {
      branch,
      nodes,
      progress,
      masteredCount,
      tierCount: nodes.length,
      activeNode,
      nextNode,
      focus,
      complete,
    }
  })
}

// ---------------------------------------------------------------------------
// Formatting + block calendar
// ---------------------------------------------------------------------------

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100)
}

export function formatSkillValue(measure: SkillMeasure, value: SkillValue | null): string {
  if (!value || value.amount == null) return '—'
  switch (measure.metricType) {
    case 'weight_x_reps':
      return value.amount > 0
        ? `${fmt(value.amount)} ק"ג × ${fmt(value.reps ?? measure.target.reps)}`
        : `משקל גוף × ${fmt(value.reps)}`
    case 'sets_x_reps':
      return `${fmt(value.sets ?? measureSetCount(measure))}×${fmt(value.amount)}`
    case 'duration_seconds': {
      const sets = value.sets ?? (measureSetCount(measure) > 1 ? measureSetCount(measure) : null)
      return sets && sets > 1 ? `${fmt(sets)}×${fmt(value.amount)} שנ'` : `${fmt(value.amount)} שנ'`
    }
    case 'max_reps':
      return `${fmt(value.amount)} חזרות`
    case 'gap_cm':
      return `${fmt(value.amount)} ס"מ מהרצפה`
    case 'body_stat': {
      const unit = BODY_STAT_UNITS[measure.bodyStat ?? 'weight']
      return unit === '%' ? `${fmt(value.amount)}%` : `${fmt(value.amount)} ${unit}`
    }
  }
}

/** Step used by the quick +/- buttons. */
export function quickStep(measure: SkillMeasure): number {
  switch (measure.metricType) {
    case 'weight_x_reps':
      return 2.5
    case 'duration_seconds':
      return 5
    case 'gap_cm':
      return 1
    case 'body_stat':
      return measure.bodyStat === 'waist' ? 0.5 : 0.1
    default:
      return 1
  }
}

/** Value after a quick +/- tap, starting from the shown current value. */
export function bumpValue(
  measure: SkillMeasure,
  current: SkillValue | null,
  direction: 1 | -1,
): SkillValue {
  const step = quickStep(measure)
  const fallback = measure.baseline.amount ?? (measure.metricType === 'body_stat' ? measure.target.amount : 0) ?? 0
  const amount = Math.max(0, Math.round(((current?.amount ?? fallback) + step * direction) * 100) / 100)
  if (measure.metricType === 'weight_x_reps') {
    return v(amount, { reps: current?.reps ?? measure.target.reps ?? measure.baseline.reps ?? 1 })
  }
  if (
    measure.metricType === 'body_stat' ||
    measure.metricType === 'max_reps' ||
    measure.metricType === 'gap_cm'
  ) {
    return v(amount)
  }
  return v(amount, { sets: measureSetCount(measure) })
}

export type BlockWeekInfo = {
  week: number
  totalWeeks: number
  started: boolean
  finished: boolean
  kind: 'training' | 'deload' | 'benchmark'
  label: string
}

export function blockWeekInfo(state: SkillTreeState, today = localDateKey()): BlockWeekInfo {
  const start = parseLocalDateKey(state.blockStartDate).getTime()
  const now = parseLocalDateKey(today).getTime()
  const days = Math.round((now - start) / 86_400_000)
  const week = Math.floor(days / 7) + 1
  const started = days >= 0
  const finished = week > state.blockWeeks
  const kind = state.deloadWeeks.includes(week)
    ? 'deload'
    : week === state.benchmarkWeek
      ? 'benchmark'
      : 'training'
  const label = !started
    ? `${state.blockLabel} מתחיל ב-${state.blockStartDate}`
    : finished
      ? `${state.blockLabel} הסתיים`
      : `${state.blockLabel} · שבוע ${week}/${state.blockWeeks}${
          kind === 'deload' ? ' · דילואד' : kind === 'benchmark' ? ' · שבוע מבחנים' : ''
        }`
  return { week, totalWeeks: state.blockWeeks, started, finished, kind, label }
}

export function percent(progress: number): number {
  return Math.round(Math.max(0, Math.min(1, progress)) * 100)
}
