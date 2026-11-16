/**
 * Data-driven Skill Tree ("עץ מיומנויות ואבני דרך").
 *
 * Master goals (branches) hold milestone nodes. Every node owns one or more
 * measures; each measure is linked to a real data source (workout logs,
 * morning routine, body metrics or a manual benchmark) and is scored from
 * baseline → target. Synced inside the `consistency_day_marks` JSON under the
 * reserved key `__skillTree` (per-entity last-write-wins, tombstones on delete).
 */

import type { BodyMeasurement } from './bodyMeasurements'
import type { MorningRoutineState } from './morningRoutine'
import type { SetLog, WeightEntry, WorkoutDay, WorkoutLog } from './types'
import { dayAllExercises, localDateKey, parseLocalDateKey, uid, WEEKDAY_SHORT } from './types'

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
  isActiveInCurrentBlock: boolean
  nextProgressionStep: string
  measures: SkillMeasure[]
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
  active_focus: 'בפוקוס בבלוק 3',
  queued_next_block: 'בלוקים הבאים',
  completed: 'הושלם',
}

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
// Seed: Block 3 (week-12 targets)
// ---------------------------------------------------------------------------

function v(amount: number | null, extra: { reps?: number; sets?: number } = {}): SkillValue {
  return { amount, reps: extra.reps ?? null, sets: extra.sets ?? null }
}

type SeedMeasure = Omit<SkillMeasure, 'id' | 'manual' | 'bodyStat'> & {
  bodyStat?: SkillBodyStat
}

function seedNode(
  branchId: string,
  index: number,
  input: {
    title: string
    note?: string
    next?: string
    measures: SeedMeasure[]
  },
): SkillNode {
  const id = `${branchId}-n${index}`
  return {
    id,
    branchId,
    title: input.title,
    note: input.note ?? '',
    order: index,
    isActiveInCurrentBlock: true,
    nextProgressionStep: input.next ?? '',
    measures: input.measures.map((m, i) => ({
      ...m,
      bodyStat: m.bodyStat ?? null,
      id: `${id}-m${i + 1}`,
      manual: null,
    })),
    progressions: [],
    updatedAt: EPOCH,
  }
}

function seedBranch(
  id: string,
  order: number,
  input: Pick<SkillBranch, 'title' | 'subtitle' | 'icon' | 'nextUnlockTitle'>,
): SkillBranch {
  return { id, order, status: 'active_focus', updatedAt: EPOCH, ...input }
}

const workout = 'workout_exercise' as const

export function seedSkillBranches(): SkillBranch[] {
  return [
    seedBranch('st-muscle-up', 1, {
      title: 'Muscle-Up נקי (ללא קיפ)',
      subtitle: 'משיכה מתפרצת, מעבר מעל המוט ודחיפה',
      icon: 'muscleUp',
      nextUnlockTitle: 'Muscle-Up נקי על מוט ועבודה על סטים של 2-3 חזרות',
    }),
    seedBranch('st-front-lever', 2, {
      title: 'Front Lever (פרונט לבר)',
      subtitle: 'כוח משיכה אופקי וליבה',
      icon: 'frontLever',
      nextUnlockTitle: 'Advanced Tuck Front Lever Rows & Static Hold',
    }),
    seedBranch('st-hspu-planche', 3, {
      title: 'Handstand Push-Up & Planche (עמידת ידיים ודחיפה)',
      subtitle: 'כוח דחיפה אנכי והישענות קדימה',
      icon: 'handstand',
      nextUnlockTitle: 'Deep Deficit HSPU & Tuck Planche Push-ups',
    }),
    seedBranch('st-one-arm', 4, {
      title: 'One-Arm Chin-Up (בסיס למתח יד אחת וכוח משיכה מקסימלי)',
      subtitle: 'אחיזה, שכמות וכוח מקסימלי',
      icon: 'oneArm',
      nextUnlockTitle: 'One-Arm Assisted Pull-ups / Uneven Chin-ups',
    }),
    seedBranch('st-physique', 5, {
      title: 'פרופורציות "אל יווני" ורגליים (V-Taper & Lower Body)',
      subtitle: 'כתפיים רחבות, מותן צרה ורגליים חזקות',
      icon: 'physique',
      nextUnlockTitle: 'בלוק 4 - המשך טיפוס ל-80 ק"ג על 9% שומן',
    }),
  ]
}

export function seedSkillNodes(): SkillNode[] {
  return [
    // 1. Muscle-Up
    seedNode('st-muscle-up', 1, {
      title: 'מתח מתפרץ גבוה (High Pull-ups)',
      note: 'יעד: 4 חזרות לגובה בטן עליונה, 3 סטים',
      measures: [
        {
          label: 'High Pull-ups לגובה בטן עליונה',
          sourceType: workout,
          linkedExercise: 'מתח מתפרץ גבוה|High Pull',
          metricType: 'sets_x_reps',
          baseline: v(3, { sets: 3 }),
          target: v(4, { sets: 3 }),
        },
      ],
    }),
    seedNode('st-muscle-up', 2, {
      title: 'מתח חזה מתפרץ בפרונציה (Chest To Bar)',
      note: 'יעד חלופי: +5 ק"ג ל-5 חזרות',
      measures: [
        {
          label: 'Chest To Bar — מקסימום חזרות משקל גוף',
          sourceType: workout,
          linkedExercise: 'Chest To Bar|מתח חזה',
          metricType: 'max_reps',
          baseline: v(16),
          target: v(18),
        },
      ],
    }),
    seedNode('st-muscle-up', 3, {
      title: 'מקבילים כבד (Weighted Dips)',
      measures: [
        {
          label: 'מקבילים כבד — סט שיא',
          sourceType: workout,
          linkedExercise: 'מקבילים כבד|מקבילים עם משקל',
          metricType: 'weight_x_reps',
          baseline: v(25, { reps: 2 }),
          target: v(30, { reps: 2 }),
        },
      ],
    }),
    // 2. Front Lever
    seedNode('st-front-lever', 1, {
      title: 'חתירת פרונט לבר מקופל (Tuck FL Rows)',
      next: 'מעבר ל-Advanced Tuck FL Rows',
      measures: [
        {
          label: 'Tuck FL Rows — חזרות נקיות',
          sourceType: workout,
          linkedExercise: 'Tuck Front Lever|Tuck FL|פרונט לבר מקופל',
          metricType: 'sets_x_reps',
          baseline: v(6, { sets: 3 }),
          target: v(8, { sets: 3 }),
        },
      ],
    }),
    seedNode('st-front-lever', 2, {
      title: 'מתח כבד בפרונציה - סט שיא',
      measures: [
        {
          label: 'מתח כבד בפרונציה — סט כבד',
          sourceType: workout,
          linkedExercise: 'מתח כבד בפרונציה',
          metricType: 'weight_x_reps',
          baseline: v(27.5, { reps: 3 }),
          target: v(32.5, { reps: 3 }),
        },
      ],
    }),
    seedNode('st-front-lever', 3, {
      title: 'ליבה: החזקת הולו (שגרה A) + Toes To Bar',
      note: 'TTB עם עצירה של 2 שניות למעלה',
      measures: [
        {
          label: 'Toes To Bar (עם עצירה 2 שנ\' למעלה)',
          sourceType: workout,
          linkedExercise: 'Toes To Bar|TTB',
          metricType: 'sets_x_reps',
          baseline: v(6, { sets: 3 }),
          target: v(8, { sets: 3 }),
        },
        {
          label: 'החזקת הולו (Hollow Body Hold)',
          sourceType: 'morning_routine',
          linkedExercise: 'Hollow|הולו',
          metricType: 'duration_seconds',
          baseline: v(null),
          target: v(60),
        },
      ],
    }),
    // 3. HSPU & Planche
    seedNode('st-hspu-planche', 1, {
      title: 'לחיצת כתפיים Pike ברגליים מוגבהות (Elevated Pike Push-ups)',
      next: 'הגבהת ספסל / קירוב ידיים / HSPU לקיר',
      measures: [
        {
          label: 'Elevated Pike Push-ups — חזרות מלאות',
          sourceType: workout,
          linkedExercise: 'Pike|פייק',
          metricType: 'sets_x_reps',
          baseline: v(5, { sets: 3 }),
          target: v(8, { sets: 3 }),
        },
      ],
    }),
    seedNode('st-hspu-planche', 2, {
      title: 'שכיבות סמיכה פסאודו-פלאנש (Pseudo Planche Push-ups)',
      note: 'בהישענות מקסימלית קדימה',
      measures: [
        {
          label: 'Pseudo Planche Push-ups',
          sourceType: workout,
          linkedExercise: 'Pseudo Planche|פסאודו',
          metricType: 'sets_x_reps',
          baseline: v(6, { sets: 2 }),
          target: v(8, { sets: 2 }),
        },
      ],
    }),
    seedNode('st-hspu-planche', 3, {
      title: 'עמידת ידיים מול קיר (שגרת בוקר B)',
      note: 'בסיס: 60 שנ\' צמוד לקיר / 17 מקבילים',
      measures: [
        {
          label: 'עמידת ידיים — החזקה יציבה',
          sourceType: 'morning_routine',
          linkedExercise: 'Handstand|עמידת ידיים',
          metricType: 'duration_seconds',
          baseline: v(null),
          target: v(60),
        },
        {
          label: 'מקבילים משקל גוף — מקסימום חזרות',
          sourceType: 'manual_benchmark',
          linkedExercise: 'מקבילים',
          metricType: 'max_reps',
          baseline: v(17),
          target: v(22),
        },
      ],
    }),
    // 4. One-Arm Chin-Up
    seedNode('st-one-arm', 1, {
      title: 'תלייה אקטיבית בשכמות ביד אחת',
      measures: [
        {
          label: 'תלייה ביד אחת — שניות לכל יד',
          sourceType: workout,
          linkedExercise: 'תלייה אקטיבית בשכמות ביד אחת|תלייה ביד אחת',
          metricType: 'duration_seconds',
          baseline: v(15, { sets: 3 }),
          target: v(25, { sets: 3 }),
        },
      ],
    }),
    seedNode('st-one-arm', 2, {
      title: 'מתח סופינציה כבד',
      note: 'בדיקת שיא ביום ו\' / שבוע 12',
      measures: [
        {
          label: 'בדיקת שיא — 2 חזרות',
          sourceType: workout,
          linkedExercise: 'מתח בסופינציה עם משקל|מתח סופינציה|מתח נקי סופינציה',
          metricType: 'weight_x_reps',
          baseline: v(32.5, { reps: 2 }),
          target: v(40, { reps: 2 }),
        },
        {
          label: 'יום ו\' — 6 חזרות',
          sourceType: workout,
          linkedExercise: 'מתח בסופינציה עם משקל',
          metricType: 'weight_x_reps',
          baseline: v(22.5, { reps: 5 }),
          target: v(30, { reps: 6 }),
        },
      ],
    }),
    seedNode('st-one-arm', 3, {
      title: 'כפיפת מרפקים בשיפוע + החזקה ב-90°',
      note: 'כולל 10 שניות החזקה ב-90°',
      measures: [
        {
          label: 'כפיפת מרפקים בשיפוע',
          sourceType: workout,
          linkedExercise: 'כפיפת מרפקים בישיבה בשיפוע',
          metricType: 'weight_x_reps',
          baseline: v(16, { reps: 6 }),
          target: v(18, { reps: 8 }),
        },
      ],
    }),
    // 5. V-Taper & Lower Body
    seedNode('st-physique', 1, {
      title: 'סקוואט בולגרי עם משקולות יד',
      note: 'משקל בכל יד, חזרות לכל רגל',
      measures: [
        {
          label: 'סקוואט בולגרי — ק"ג בכל יד',
          sourceType: workout,
          linkedExercise: 'סקוואט בולגרי',
          metricType: 'weight_x_reps',
          baseline: v(8, { reps: 8 }),
          target: v(14, { reps: 8 }),
        },
      ],
    }),
    seedNode('st-physique', 2, {
      title: 'דדליפט רומני ברגל אחת (Single-Leg RDL) + הרחקות לצדדים',
      measures: [
        {
          label: 'Single-Leg RDL',
          sourceType: workout,
          linkedExercise: 'Single-Leg RDL|דדליפט רומני ברגל אחת',
          metricType: 'weight_x_reps',
          baseline: v(12, { reps: 8 }),
          target: v(16, { reps: 8 }),
        },
        {
          label: 'הרחקות לצדדים',
          sourceType: workout,
          linkedExercise: 'Lateral Raises|הרחקות לצדדים',
          metricType: 'weight_x_reps',
          baseline: v(6, { reps: 12 }),
          target: v(8, { reps: 12 }),
        },
      ],
    }),
    seedNode('st-physique', 3, {
      title: 'מדדי גוף (מסה נקייה סוף בלוק 3)',
      note: 'יעד: משקל 75.5-76.0 ק"ג | מותן מתחת ל-80 ס"מ | שומן ≤14.5%',
      measures: [
        {
          label: 'משקל גוף',
          sourceType: 'body_metric',
          linkedExercise: '',
          metricType: 'body_stat',
          bodyStat: 'weight',
          baseline: v(73.2),
          target: v(75.5),
        },
        {
          label: 'היקף מותן',
          sourceType: 'body_metric',
          linkedExercise: '',
          metricType: 'body_stat',
          bodyStat: 'waist',
          baseline: v(null),
          target: v(80),
        },
        {
          label: 'אחוז שומן',
          sourceType: 'body_metric',
          linkedExercise: '',
          metricType: 'body_stat',
          bodyStat: 'bodyFat',
          baseline: v(null),
          target: v(14.5),
        },
      ],
    }),
  ]
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
    isActiveInCurrentBlock: o.isActiveInCurrentBlock !== false,
    nextProgressionStep: str(o.nextProgressionStep, 300),
    measures,
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
    isActiveInCurrentBlock: true,
    nextProgressionStep: '',
    measures: [emptyMeasure()],
    progressions: [],
    updatedAt: now(),
  }
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

export type SkillAdvanceInput = {
  title: string
  nextProgressionStep: string
  measures: { id: string; baseline: SkillValue; target: SkillValue; linkedExercise: string }[]
}

/** Promote a completed node to its next stage: new title/targets, history kept. */
export function advanceNode(
  state: SkillTreeState,
  nodeId: string,
  input: SkillAdvanceInput,
): SkillTreeState {
  const node = state.nodes[nodeId]
  if (!node) return state
  const at = now()
  const byId = new Map(input.measures.map((m) => [m.id, m]))
  return upsertNode(state, {
    ...node,
    title: input.title.trim() || node.title,
    nextProgressionStep: input.nextProgressionStep.trim(),
    measures: node.measures.map((m) => {
      const next = byId.get(m.id)
      return next
        ? {
            ...m,
            baseline: next.baseline,
            target: next.target,
            linkedExercise: next.linkedExercise,
            manual: null,
          }
        : m
    }),
    progressions: [
      ...node.progressions,
      { at, fromTitle: node.title, toTitle: input.title.trim() || node.title },
    ],
  })
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
  measures: MeasureEvaluation[]
  progress: number
  complete: boolean
  feeds: string[]
}

export type BranchEvaluation = {
  branch: SkillBranch
  nodes: NodeEvaluation[]
  progress: number
  completedCount: number
  countedNodes: number
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
  const progress = measures.length
    ? measures.reduce((sum, m) => sum + m.progress, 0) / measures.length
    : 0
  return {
    node,
    measures,
    progress,
    complete: measures.length > 0 && measures.every((m) => m.complete),
    feeds: [...new Set(measures.flatMap((m) => m.feeds))],
  }
}

export function evaluateSkillTree(
  state: SkillTreeState,
  sources: SkillDataSources,
): BranchEvaluation[] {
  const since = state.blockStartDate
  return liveBranches(state).map((branch) => {
    const nodes = liveNodes(state, branch.id).map((n) => evaluateNode(n, sources, since))
    const active = nodes.filter((n) => n.node.isActiveInCurrentBlock)
    const counted = active.length ? active : nodes
    const progress = counted.length
      ? counted.reduce((sum, n) => sum + n.progress, 0) / counted.length
      : 0
    const completedCount = counted.filter((n) => n.complete).length
    return {
      branch,
      nodes,
      progress,
      completedCount,
      countedNodes: counted.length,
      complete: counted.length > 0 && completedCount === counted.length,
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
  if (measure.metricType === 'body_stat' || measure.metricType === 'max_reps') return v(amount)
  return v(amount, { sets: measureSetCount(measure) })
}

/** Suggested next target after a node is completed. */
export function suggestNextTarget(measure: SkillMeasure): SkillValue {
  const t = measure.target
  switch (measure.metricType) {
    case 'weight_x_reps':
      return { ...t, amount: t.amount == null ? null : t.amount + 2.5 }
    case 'duration_seconds':
      return { ...t, amount: t.amount == null ? null : t.amount + 5 }
    case 'body_stat':
      return t
    default:
      return { ...t, amount: t.amount == null ? null : t.amount + 2 }
  }
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
