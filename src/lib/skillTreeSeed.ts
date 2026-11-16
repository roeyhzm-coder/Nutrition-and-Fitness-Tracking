/**
 * Seed for the skill tree: 8 calisthenics & mobility master tracks, 5 tiers
 * each (Tier 1 mastered → Tier 2 active / queued → Tiers 3-5 locked).
 * Every tier carries its measures (linked to the exercise names it puts in the
 * plan) and a Smart Slot Swap recipe.
 */

import type {
  SkillBranch,
  SkillIconKey,
  SkillMeasure,
  SkillNode,
  SkillSlotExercise,
  SkillSlotRecipe,
  SkillSlotRole,
  SkillSlotTarget,
  SkillTierStatus,
  SkillValue,
} from './skillTree'

const EPOCH = '1970-01-01T00:00:00.000Z'
/** Block 3 tiers were already written into the plan when the block started. */
const IN_BLOCK_3 = '2026-11-15T00:00:00.000Z'

/** Tombstone time for the retired 5-branch seed (deterministic on every device). */
export const SKILL_SEED_MIGRATED_AT = '2026-11-17T00:00:00.000Z'
const LEGACY_BRANCHES = ['st-muscle-up', 'st-front-lever', 'st-hspu-planche', 'st-one-arm', 'st-physique']
export const LEGACY_SEED_IDS: ReadonlySet<string> = new Set([
  ...LEGACY_BRANCHES,
  ...LEGACY_BRANCHES.flatMap((b) => [1, 2, 3].map((n) => `${b}-n${n}`)),
])

function val(amount: number | null, extra: { reps?: number; sets?: number } = {}): SkillValue {
  return { amount, reps: extra.reps ?? null, sets: extra.sets ?? null }
}

type SeedMeasure = Pick<SkillMeasure, 'label' | 'linkedExercise' | 'metricType' | 'baseline' | 'target'> & {
  source?: SkillMeasure['sourceType']
}

/** Workout measure: sets × reps (or seconds) from the logs. */
function setsReps(label: string, link: string, sets: number, from: number, to: number): SeedMeasure {
  return { label, linkedExercise: link, metricType: 'sets_x_reps', baseline: val(from, { sets }), target: val(to, { sets }) }
}
function weighted(label: string, link: string, from: [number, number], to: [number, number]): SeedMeasure {
  return {
    label,
    linkedExercise: link,
    metricType: 'weight_x_reps',
    baseline: val(from[0], { reps: from[1] }),
    target: val(to[0], { reps: to[1] }),
  }
}
function hold(
  label: string,
  link: string,
  from: number | null,
  to: number,
  opts: { sets?: number; source?: SkillMeasure['sourceType'] } = {},
): SeedMeasure {
  return {
    label,
    linkedExercise: link,
    metricType: 'duration_seconds',
    baseline: val(from, opts.sets ? { sets: opts.sets } : {}),
    target: val(to, opts.sets ? { sets: opts.sets } : {}),
    source: opts.source,
  }
}
function maxReps(label: string, link: string, from: number, to: number, source?: SkillMeasure['sourceType']): SeedMeasure {
  return { label, linkedExercise: link, metricType: 'max_reps', baseline: val(from), target: val(to), source }
}
function gap(label: string, link: string, from: number, to: number): SeedMeasure {
  return {
    label,
    linkedExercise: link,
    metricType: 'gap_cm',
    baseline: val(from),
    target: val(to),
    source: 'manual_benchmark',
  }
}

function ex(name: string, sets: number, reps: string, rest: string, notes = ''): SkillSlotExercise {
  return { name, sets, reps, rest, notes }
}
function slot(
  target: SkillSlotTarget,
  role: SkillSlotRole,
  replaces: string,
  exercises: SkillSlotExercise[],
): SkillSlotRecipe {
  return { target, role, replaces, exercises }
}

function tier(
  branchId: string,
  order: number,
  tierStatus: SkillTierStatus,
  title: string,
  input: { prereq?: string; note?: string; measures?: SeedMeasure[]; slots?: SkillSlotRecipe[] } = {},
): SkillNode {
  const id = `${branchId}-t${order}`
  return {
    id,
    branchId,
    title,
    note: input.note ?? '',
    order,
    tierStatus,
    prerequisites: input.prereq ?? '',
    measures: (input.measures ?? []).map((m, i) => ({
      id: `${id}-m${i + 1}`,
      label: m.label,
      sourceType: m.source ?? 'workout_exercise',
      linkedExercise: m.linkedExercise,
      metricType: m.metricType,
      bodyStat: null,
      baseline: m.baseline,
      target: m.target,
      manual: null,
    })),
    slots: input.slots ?? [],
    slotsAppliedAt: tierStatus === 'active' && input.slots?.length ? IN_BLOCK_3 : null,
    progressions: [],
    updatedAt: EPOCH,
  }
}

function track(
  id: string,
  order: number,
  icon: SkillIconKey,
  title: string,
  subtitle: string,
  status: SkillBranch['status'],
  nextUnlockTitle: string,
): SkillBranch {
  return { id, order, icon, title, subtitle, status, nextUnlockTitle, updatedAt: EPOCH }
}

// Exercise-name aliases used both for measures and for the swap targets.
const HIGH_PULL = 'מתח מתפרץ גבוה|High Pull'
const CTB = 'Chest To Bar|מתח חזה'
const HEAVY_DIPS = 'מקבילים כבד|מקבילים עם משקל|Weighted Dips'
const TUCK_ROWS = 'Tuck Front Lever Rows|חתירת פרונט לבר מקופל|Tuck FL Rows'
const HEAVY_PULL = 'מתח כבד בפרונציה'
const TTB = 'Toes To Bar|TTB'
const OA_HANG = 'תלייה אקטיבית בשכמות ביד אחת|תלייה ביד אחת'
const HEAVY_CHIN = 'מתח בסופינציה עם משקל|מתח סופינציה|מתח נקי סופינציה'
const INCLINE_CURL = 'כפיפת מרפקים בישיבה בשיפוע'
const PIKE = 'Pike|פייק'
const PSEUDO = 'Pseudo Planche|פסאודו'
const BULGARIAN = 'סקוואט בולגרי|Bulgarian'
const SL_RDL = 'Single-Leg RDL|דדליפט רומני ברגל אחת'

export function seedSkillBranches(): SkillBranch[] {
  return [
    track('sk-muscle-up', 1, 'muscleUp', 'Muscle-Up & Explosive Bar Mastery', 'משיכה מתפרצת ומאסל-אפ', 'active_focus', 'Strict Bar Muscle-Up נקי ללא קיפ'),
    track('sk-front-lever', 2, 'frontLever', 'Front Lever Mastery', 'פרונט לבר וכוח משיכה אופקי', 'active_focus', 'Advanced Tuck Front Lever'),
    track('sk-one-arm', 3, 'oneArm', 'One-Arm Chin-Up & Streetlifting Pull', 'מתח יד אחת ומשיכה מקסימלית', 'active_focus', 'Archer Pull-ups / Uneven Towel Chin-ups'),
    track('sk-handstand', 4, 'handstand', 'Handstand & Freestanding HSPU', 'עמידת ידיים ולחיצה אנכית', 'active_focus', 'Freestanding Handstand 15 שניות'),
    track('sk-planche', 5, 'flame', 'Planche & Heavy Push Mastery', 'פלאנש ודחיפה כבדה', 'active_focus', 'Tuck Planche Hold 15 שניות'),
    track('sk-core-flag', 6, 'flag', 'Human Flag & Elite Core Compression', 'דגל אנושי, V-Sit וליבה', 'queued_next_block', 'Full L-Sit + Hanging Windshield Wipers'),
    track('sk-pistol', 7, 'leg', 'Single-Leg Strength & Pistol Squat', 'שליטה ברגל אחת ופיסטול סקוואט', 'active_focus', 'Freestanding Pistol Squat'),
    track('sk-splits', 8, 'stretch', 'Splits & Mobility Mastery', 'שפגאט קדמי/אמצעי וגמישות קצה', 'queued_next_block', 'בסיס לשפגאט (Couch + PNF + Frog)'),
  ]
}

export function seedSkillNodes(): SkillNode[] {
  const mu = 'sk-muscle-up'
  const fl = 'sk-front-lever'
  const oa = 'sk-one-arm'
  const hs = 'sk-handstand'
  const pl = 'sk-planche'
  const cf = 'sk-core-flag'
  const ps = 'sk-pistol'
  const sp = 'sk-splits'
  return [
    // 1. Muscle-Up & Explosive Bar
    tier(mu, 1, 'mastered', 'מתח חזה רצוף (16 חזרות משקל גוף)'),
    tier(mu, 2, 'active', 'High Pull-ups לבטן עליונה (3×4) + מתח חזה (18 חזרות / +5 ק"ג) + מקבילים כבד (30 ק"ג × 2)', {
      prereq: 'מתח חזה רצוף 16 חזרות',
      measures: [
        setsReps('High Pull-ups לגובה בטן עליונה', HIGH_PULL, 3, 3, 4),
        maxReps('מתח חזה (Chest To Bar) — מקסימום חזרות', CTB, 16, 18),
        weighted('מקבילים כבד — סט שיא', HEAVY_DIPS, [25, 2], [30, 2]),
      ],
      slots: [
        slot('combo', 'explosive_skill_slot', HIGH_PULL, [ex('מתח מתפרץ גבוה (High Pull-ups)', 3, '3-4', '3 דקות')]),
      ],
    }),
    tier(mu, 3, 'locked', 'Strict Bar Muscle-Up נקי ללא קיפ (3 סטים × 2-3 חזרות)', {
      prereq: 'High Pull-ups 3×4 לבטן עליונה + 18 מתח חזה + מקבילים 30 ק"ג × 2',
      measures: [setsReps('Strict Muscle-Up — חזרות נקיות לסט', 'Strict Bar Muscle-Up|Muscle-Up נקי', 3, 0, 2)],
      slots: [
        slot('combo', 'explosive_skill_slot', HIGH_PULL, [
          ex('Strict Bar Muscle-Up נקי (ללא קיפ)', 3, '2-3', '3 דקות', 'משיכה מתפרצת לבטן תחתונה, מעבר מהיר של פרקי הידיים, בלי קיפ.'),
          ex('Muscle-Up Negatives (ירידה איטית)', 2, '3 × 5 שניות', '2 דקות'),
        ]),
      ],
    }),
    tier(mu, 4, 'locked', 'Muscle-Up Sets (3 סטים × 5 חזרות נקיות)', {
      prereq: 'Strict Muscle-Up 3×2-3 נקי',
      measures: [setsReps('Muscle-Up — 3 סטים', 'Muscle-Up', 3, 3, 5)],
      slots: [
        slot('combo', 'explosive_skill_slot', 'Muscle-Up', [ex('Muscle-Up נקי — סטים של 5', 3, '3-5', '3 דקות')]),
      ],
    }),
    tier(mu, 5, 'locked', 'Slow No-Momentum Muscle-Up / Weighted Muscle-Up (+5-10 ק"ג)', {
      prereq: '3×5 Muscle-Up נקיים',
      measures: [weighted('Weighted Muscle-Up', 'Weighted Muscle-Up|Muscle-Up עם משקל', [0, 3], [7.5, 3])],
      slots: [
        slot('combo', 'explosive_skill_slot', 'Muscle-Up', [
          ex('Weighted Muscle-Up (+5-10 ק"ג)', 3, '2-3', '3-4 דקות'),
          ex('Slow Muscle-Up ללא מומנטום', 2, '2', '3 דקות'),
        ]),
      ],
    }),

    // 2. Front Lever
    tier(fl, 1, 'mastered', 'Tuck Front Lever Hold (20 שניות) + Hollow Body Hold (60 שניות)'),
    tier(fl, 2, 'active', 'Tuck Front Lever Rows (3×8) + מתח פרונציה כבד (32.5 ק"ג × 3) + Toes To Bar (3×8 עם עצירה)', {
      prereq: 'Tuck FL Hold 20 שנ\' + Hollow 60 שנ\'',
      measures: [
        setsReps('Tuck FL Rows — חזרות נקיות', TUCK_ROWS, 3, 6, 8),
        weighted('מתח כבד בפרונציה — סט כבד', HEAVY_PULL, [27.5, 3], [32.5, 3]),
        setsReps('Toes To Bar (עצירה 2 שנ\' למעלה)', TTB, 3, 6, 8),
      ],
      slots: [
        slot('pull', 'horizontal_secondary_slot', TUCK_ROWS, [ex('חתירת פרונט לבר מקופל (Tuck Front Lever Rows)', 3, '6-8', '2 דקות')]),
      ],
    }),
    tier(fl, 3, 'locked', 'Advanced Tuck Front Lever (Hold 15s + Rows 3×6 גב שטוח 90 מעלות)', {
      prereq: 'Tuck FL Rows 3×8 + מתח כבד 32.5 ק"ג × 3 + TTB 3×8',
      measures: [
        hold('Advanced Tuck FL Hold', 'Advanced Tuck Front Lever Hold|Advanced Tuck FL Hold', 5, 15),
        setsReps('Advanced Tuck FL Rows', 'Advanced Tuck Front Lever Rows|Advanced Tuck FL Rows', 3, 3, 6),
      ],
      slots: [
        slot('pull', 'horizontal_secondary_slot', TUCK_ROWS, [
          ex('Advanced Tuck Front Lever Rows (גב שטוח)', 3, '4-6', '2-3 דקות'),
          ex('Advanced Tuck Front Lever Hold', 3, '8-15 שניות', '2 דקות'),
        ]),
      ],
    }),
    tier(fl, 4, 'locked', 'One-Leg / Straddle Front Lever (Hold 10-12s + Straddle Negatives)', {
      prereq: 'Advanced Tuck Hold 15 שנ\' + Rows 3×6',
      measures: [hold('Straddle / One-Leg FL Hold', 'Straddle Front Lever Hold|One-Leg Front Lever', 3, 12)],
      slots: [
        slot('pull', 'horizontal_secondary_slot', 'Advanced Tuck Front Lever', [
          ex('Straddle / One-Leg Front Lever Hold', 3, '6-12 שניות', '2-3 דקות'),
          ex('Straddle Front Lever Negatives', 3, '3 × 5 שניות', '2-3 דקות'),
        ]),
      ],
    }),
    tier(fl, 5, 'locked', 'Full Front Lever Hold (8-10 שניות) & Full FL Pull-ups', {
      prereq: 'Straddle FL Hold 12 שנ\'',
      measures: [
        hold('Full Front Lever Hold', 'Full Front Lever Hold', 2, 10),
        maxReps('Full FL Pull-ups', 'Full Front Lever Pull-ups', 0, 3),
      ],
      slots: [
        slot('pull', 'horizontal_secondary_slot', 'Straddle|One-Leg Front Lever', [
          ex('Full Front Lever Hold', 3, '5-10 שניות', '3 דקות'),
          ex('Full Front Lever Pull-ups', 3, '1-3', '3 דקות'),
        ]),
      ],
    }),

    // 3. One-Arm Chin-Up
    tier(oa, 1, 'mastered', 'מתח סופינציה +32.5 ק"ג × 2 חזרות'),
    tier(oa, 2, 'active', 'תלייה אקטיבית בשכמה ביד אחת (3×25 שנ\') + מתח סופינציה כבד (40-42.5 ק"ג × 2 / 30 ק"ג × 6) + כפיפת מרפקים בשיפוע עם החזקה ב-90° (18 ק"ג × 8)', {
      prereq: 'מתח סופינציה +32.5 ק"ג × 2',
      measures: [
        hold('תלייה ביד אחת — שניות לכל יד', OA_HANG, 15, 25, { sets: 3 }),
        weighted('מתח סופינציה כבד — 2 חזרות', HEAVY_CHIN, [32.5, 2], [40, 2]),
        weighted('מתח סופינציה — 6 חזרות', HEAVY_CHIN, [22.5, 5], [30, 6]),
        weighted('כפיפת מרפקים בשיפוע + 90°', INCLINE_CURL, [16, 6], [18, 8]),
      ],
      slots: [
        slot('pull', 'primary_strength_slot', OA_HANG, [ex('תלייה אקטיבית בשכמות ביד אחת', 3, '15-25 שניות לכל יד', '90 שניות')]),
      ],
    }),
    tier(oa, 3, 'locked', 'Archer Pull-ups נקיים (3×5 לכל צד) / Uneven Towel Chin-ups', {
      prereq: 'תלייה ביד אחת 3×25 שנ\' + מתח סופינציה 40 ק"ג × 2',
      measures: [setsReps('Archer Pull-ups — לכל צד', 'Archer|מתח קשת|Towel', 3, 2, 5)],
      slots: [
        slot('pull', 'primary_strength_slot', OA_HANG, [
          ex('מתח "קשת" (Archer Pull-ups)', 3, '3-5 לכל צד', '2-3 דקות'),
          ex('Uneven Towel Chin-ups', 2, '3-4 לכל צד', '2 דקות'),
        ]),
      ],
    }),
    tier(oa, 4, 'locked', 'One-Arm Chin-Up Negatives (ירידה של 6 שניות ביד אחת) + Band-Assisted OAC (3×3)', {
      prereq: 'Archer Pull-ups 3×5 לכל צד',
      measures: [
        hold('OAC Negative — שניות ירידה', 'One-Arm Chin-Up Negatives', 2, 6, { source: 'manual_benchmark' }),
        setsReps('Band-Assisted OAC', 'Band-Assisted One-Arm|Band-Assisted OAC', 3, 1, 3),
      ],
      slots: [
        slot('pull', 'primary_strength_slot', 'Archer|Towel', [
          ex('One-Arm Chin-Up Negatives (ירידה 6 שניות)', 3, '2 לכל יד', '3 דקות'),
          ex('Band-Assisted One-Arm Chin-Up (OAC)', 3, '3 לכל יד', '3 דקות'),
        ]),
      ],
    }),
    tier(oa, 5, 'locked', 'Full One-Arm Chin-Up / Pull-Up (עליית מתח מלאה ונקייה ביד אחת לכל צד)', {
      prereq: 'ירידה של 6 שניות + Band OAC 3×3',
      measures: [maxReps('One-Arm Chin-Up מלא — חזרות לכל יד', 'One-Arm Chin-Up מלא', 0, 1, 'manual_benchmark')],
      slots: [
        slot('pull', 'primary_strength_slot', 'One-Arm Chin-Up Negatives|Band-Assisted', [
          ex('One-Arm Chin-Up מלא', 3, '1-2 לכל יד', '4 דקות'),
        ]),
      ],
    }),

    // 4. Handstand & HSPU
    tier(hs, 1, 'mastered', 'עמידת ידיים חזה לקיר (60 שניות) + Wall HSPU בסיסי'),
    tier(hs, 2, 'active', 'Elevated Pike Push-ups (3×8 מלאות) + עמידת ידיים מול קיר בשגרת בוקר B (60 שנ\')', {
      prereq: 'עמידת ידיים חזה לקיר 60 שנ\'',
      measures: [
        setsReps('Elevated Pike Push-ups — חזרות מלאות', PIKE, 3, 5, 8),
        hold('עמידת ידיים מול קיר (שגרת בוקר B)', 'Handstand|עמידת ידיים', null, 60, { source: 'morning_routine' }),
      ],
      slots: [
        slot('push', 'primary_strength_slot', PIKE, [
          ex('לחיצת כתפיים Pike ברגליים מוגבהות (Elevated Pike Push-ups)', 3, '5-8', '2-3 דקות'),
        ]),
      ],
    }),
    tier(hs, 3, 'locked', 'Freestanding Handstand (עמידת ידיים חופשית 15 שניות) + Deep Deficit Pike Push-ups על ידיות', {
      prereq: 'Pike מוגבה 3×8 + עמידת ידיים לקיר 60 שנ\'',
      measures: [
        hold('עמידת ידיים חופשית', 'Freestanding Handstand|עמידת ידיים חופשית', 0, 15, { source: 'morning_routine' }),
        setsReps('Deep Deficit Pike Push-ups', 'Deficit Pike', 3, 4, 8),
      ],
      slots: [
        slot('push', 'primary_strength_slot', PIKE, [ex('Deep Deficit Pike Push-ups על ידיות', 3, '5-8', '2-3 דקות')]),
        slot('morningB', 'accessory_core_slot', 'עמידת ידיים מול קיר|Wall Handstand', [
          ex('עמידת ידיים חופשית (Freestanding Handstand)', 5, '10-15 שניות', '30 שניות', 'נסיונות קצרים, יציאה בטוחה לצד (cartwheel).'),
        ]),
      ],
    }),
    tier(hs, 4, 'locked', 'Full Range Chest-to-Wall HSPU (3×6 ראש עד הרצפה)', {
      prereq: 'עמידה חופשית 15 שנ\' + Deficit Pike 3×8',
      measures: [setsReps('Chest-to-Wall HSPU — טווח מלא', 'Chest-to-Wall HSPU|Wall HSPU', 3, 2, 6)],
      slots: [
        slot('push', 'primary_strength_slot', 'Deficit Pike|Pike', [
          ex('Chest-to-Wall HSPU (טווח מלא, ראש לרצפה)', 3, '3-6', '3 דקות'),
        ]),
      ],
    }),
    tier(hs, 5, 'locked', 'Freestanding HSPU (לחיצת כתפיים בעמידת ידיים חופשית) / 90-Degree Hold', {
      prereq: 'Chest-to-Wall HSPU 3×6',
      measures: [maxReps('Freestanding HSPU', 'Freestanding HSPU', 0, 3, 'manual_benchmark')],
      slots: [
        slot('push', 'primary_strength_slot', 'Chest-to-Wall HSPU|Wall HSPU', [
          ex('Freestanding HSPU', 4, '1-3', '3-4 דקות'),
          ex('90-Degree Hold (על מקבילים)', 3, '5-10 שניות', '2 דקות'),
        ]),
      ],
    }),

    // 5. Planche & Heavy Push
    tier(pl, 1, 'mastered', 'מקבילים משקל גוף (17 חזרות) + שכיבות סמיכה מתפרצות (31 חזרות)'),
    tier(pl, 2, 'active', 'Pseudo Planche Push-ups בהישענות מקסימלית (2×8) + מקבילים כבד (30 ק"ג × 2)', {
      prereq: '17 מקבילים + 31 שכיבות סמיכה מתפרצות',
      measures: [
        setsReps('Pseudo Planche Push-ups', PSEUDO, 2, 6, 8),
        weighted('מקבילים כבד — סט שיא', HEAVY_DIPS, [25, 2], [30, 2]),
      ],
      slots: [
        slot('push', 'horizontal_secondary_slot', PSEUDO, [
          ex('שכיבות סמיכה פסאודו-פלאנש (Pseudo Planche Push-ups)', 2, '6-8', '2 דקות'),
        ]),
      ],
    }),
    tier(pl, 3, 'locked', 'Tuck Planche Hold (15 שניות על מקבילים/רצפה) + Weighted Dips (40 ק"ג × 3)', {
      prereq: 'Pseudo Planche 2×8 + מקבילים 30 ק"ג × 2',
      measures: [
        hold('Tuck Planche Hold', 'Tuck Planche Hold', 5, 15),
        weighted('Weighted Dips', HEAVY_DIPS, [30, 3], [40, 3]),
      ],
      slots: [
        slot('push', 'horizontal_secondary_slot', PSEUDO, [ex('Tuck Planche Hold (על מקבילים / רצפה)', 4, '8-15 שניות', '2 דקות')]),
      ],
    }),
    tier(pl, 4, 'locked', 'Advanced Tuck Planche (12 שניות, גב ישר) + Tuck Planche Push-ups (3×5)', {
      prereq: 'Tuck Planche 15 שנ\' + מקבילים 40 ק"ג × 3',
      measures: [
        hold('Advanced Tuck Planche', 'Advanced Tuck Planche', 4, 12),
        setsReps('Tuck Planche Push-ups', 'Tuck Planche Push-ups', 3, 2, 5),
      ],
      slots: [
        slot('push', 'horizontal_secondary_slot', 'Tuck Planche Hold', [
          ex('Advanced Tuck Planche Hold (גב ישר)', 4, '6-12 שניות', '2-3 דקות'),
          ex('Tuck Planche Push-ups', 3, '3-5', '2-3 דקות'),
        ]),
      ],
    }),
    tier(pl, 5, 'locked', 'Straddle Planche -> Full Planche Hold', {
      prereq: 'Advanced Tuck Planche 12 שנ\' + Tuck Planche Push-ups 3×5',
      measures: [hold('Straddle / Full Planche Hold', 'Straddle Planche|Full Planche', 3, 10)],
      slots: [
        slot('push', 'horizontal_secondary_slot', 'Advanced Tuck Planche|Tuck Planche Push-ups', [
          ex('Straddle Planche Hold', 4, '5-10 שניות', '3 דקות'),
          ex('Full Planche Lean / Negatives', 3, '3-5 שניות', '3 דקות'),
        ]),
      ],
    }),

    // 6. Human Flag & Core Compression
    tier(cf, 1, 'mastered', 'הרמות פייק (2×10) + החזקת הולו (60 שניות) + L-Sit ברכיים'),
    tier(cf, 2, 'queued', 'Full L-Sit על מקבילים/רצפה (3×20 שניות) + Hanging Windshield Wipers (3×8)', {
      prereq: 'הרמות פייק 2×10 + הולו 60 שנ\' + L-Sit ברכיים',
      measures: [
        hold('Full L-Sit', 'L-Sit', 8, 20, { sets: 3 }),
        setsReps('Hanging Windshield Wipers', 'Windshield Wipers', 3, 4, 8),
      ],
      slots: [
        slot('combo', 'accessory_core_slot', '', [
          ex('Full L-Sit (מקבילים / רצפה)', 3, '10-20 שניות', '90 שניות'),
          ex('Hanging Windshield Wipers', 3, '6-8', '90 שניות'),
        ]),
      ],
    }),
    tier(cf, 3, 'locked', 'Dragon Flag מלא ונקי (3×6) + L-Sit to Tuck V-Sit', {
      prereq: 'L-Sit 3×20 שנ\' + Windshield Wipers 3×8',
      measures: [setsReps('Dragon Flag מלא', 'Dragon Flag', 3, 3, 6)],
      slots: [
        slot('combo', 'accessory_core_slot', 'Windshield Wipers|L-Sit', [
          ex('Dragon Flag מלא', 3, '4-6', '2 דקות'),
          ex('L-Sit to Tuck V-Sit', 3, '5-10 שניות', '90 שניות'),
        ]),
      ],
    }),
    tier(cf, 4, 'locked', 'Tuck / Straddle Human Flag (דגל אנושי בפישוק - 10 שניות לכל צד)', {
      prereq: 'Dragon Flag 3×6',
      measures: [hold('Tuck / Straddle Human Flag — לכל צד', 'Human Flag|דגל אנושי', 3, 10)],
      slots: [
        slot('combo', 'accessory_core_slot', 'Dragon Flag', [ex('Tuck / Straddle Human Flag', 4, '5-10 שניות לכל צד', '2-3 דקות')]),
      ],
    }),
    tier(cf, 5, 'locked', 'Full Human Flag (דגל אנושי מלא וישר) & 45° V-Sit', {
      prereq: 'Straddle Flag 10 שנ\' לכל צד',
      measures: [
        hold('Full Human Flag', 'Full Human Flag', 3, 10),
        hold('45° V-Sit', 'V-Sit', 3, 10),
      ],
      slots: [
        slot('combo', 'accessory_core_slot', 'Human Flag|V-Sit', [
          ex('Full Human Flag', 4, '3-10 שניות לכל צד', '3 דקות'),
          ex('45° V-Sit', 3, '5-10 שניות', '2 דקות'),
        ]),
      ],
    }),

    // 7. Single-Leg & Pistol
    tier(ps, 1, 'mastered', 'וול-סיט רגל אחת (12 שניות) + ג\'אמפ סקוואט עם משקל'),
    tier(ps, 2, 'active', 'סקוואט בולגרי כבד (14 ק"ג בכל יד × 8 חזרות לרגל) + Single-Leg RDL (16 ק"ג × 8)', {
      prereq: 'וול-סיט רגל אחת 12 שנ\'',
      measures: [
        weighted('סקוואט בולגרי — ק"ג בכל יד', BULGARIAN, [8, 8], [14, 8]),
        weighted('Single-Leg RDL', SL_RDL, [12, 8], [16, 8]),
      ],
      slots: [
        slot('push', 'primary_strength_slot', BULGARIAN, [ex('סקוואט בולגרי עם משקולות יד', 3, '6-8 לכל רגל', '2 דקות')]),
      ],
    }),
    tier(ps, 3, 'locked', 'Box Pistol Squat נשלט -> Freestanding Pistol Squat (3×5 לכל רגל)', {
      prereq: 'בולגרי 14 ק"ג × 8 + SL RDL 16 ק"ג × 8',
      measures: [setsReps('Pistol Squat — לכל רגל', 'Pistol', 3, 2, 5)],
      slots: [
        slot('push', 'primary_strength_slot', BULGARIAN, [ex('Pistol Squat (Box → חופשי)', 3, '3-5 לכל רגל', '2 דקות')]),
      ],
    }),
    tier(ps, 4, 'locked', 'Weighted Pistol Squat (+10-16 ק"ג ל-5 חזרות) + Nordic Hamstring Curl (אקסצנטרי)', {
      prereq: 'Pistol חופשי 3×5 לכל רגל',
      measures: [
        weighted('Weighted Pistol Squat', 'Weighted Pistol', [4, 5], [10, 5]),
        setsReps('Nordic Curl אקסצנטרי', 'Nordic', 3, 3, 5),
      ],
      slots: [
        slot('push', 'primary_strength_slot', 'Pistol', [ex('Weighted Pistol Squat', 3, '5 לכל רגל', '2-3 דקות')]),
        slot('push', 'accessory_core_slot', SL_RDL, [ex('Nordic Hamstring Curl (אקסצנטרי)', 3, '3-5', '2 דקות')]),
      ],
    }),
    tier(ps, 5, 'locked', 'Full Nordic Curl ללא ידיים (3×5) + Advanced Shrimp Squat', {
      prereq: 'Weighted Pistol +10 ק"ג × 5 + Nordic אקסצנטרי 3×5',
      measures: [
        setsReps('Full Nordic Curl', 'Full Nordic', 3, 2, 5),
        setsReps('Advanced Shrimp Squat', 'Shrimp Squat', 3, 2, 5),
      ],
      slots: [
        slot('push', 'accessory_core_slot', 'Nordic', [ex('Full Nordic Curl (ללא ידיים)', 3, '3-5', '2-3 דקות')]),
        slot('push', 'primary_strength_slot', 'Weighted Pistol|Pistol', [ex('Advanced Shrimp Squat', 3, '3-5 לכל רגל', '2 דקות')]),
      ],
    }),

    // 8. Splits & Mobility
    tier(sp, 1, 'mastered', 'ישיבת סקוואט עמוקה (90 שניות כל בוקר) + סיבובי גב עליון'),
    tier(sp, 2, 'queued', 'בסיס לשפגאט: Couch Stretch + PNF Hamstring Stretch + Frog Stretch (ירידה ל-15 ס"מ מהרצפה)', {
      prereq: 'ישיבת סקוואט עמוקה 90 שנ\' כל בוקר',
      note: 'פינישר של 6 דקות בסוף אימון דחיפה ורגליים כשהשרירים חמים — בלי אימון נפרד.',
      measures: [gap('Frog Stretch — מרחק מהרצפה', 'Frog Stretch', 30, 15)],
      slots: [
        slot('push', 'mobility_finisher_slot', '', [
          ex('Couch Stretch + PNF Hamstring Stretch (סופרסט)', 2, '60 שניות לכל רגל', '—', 'PNF: 10 שניות כיווץ, שחרור והעמקה.'),
          ex('Frog Stretch', 2, '60 שניות', '—'),
        ]),
      ],
    }),
    tier(sp, 3, 'locked', 'Loaded Butterfly & Pancake Stretch (חזה נוגע ברצפה בישיבת פישוק) + Front Split (5 ס"מ מהרצפה)', {
      prereq: 'Frog Stretch 15 ס"מ מהרצפה',
      measures: [gap('Front Split — מרחק מהרצפה', 'Front Split', 20, 5)],
      slots: [
        slot('push', 'mobility_finisher_slot', 'Couch Stretch|Frog Stretch', [
          ex('Loaded Butterfly + Pancake Stretch', 2, '60 שניות', '—'),
          ex('Front Split מתקדם (עם בלוקים)', 2, '60 שניות לכל רגל', '—'),
        ]),
      ],
    }),
    tier(sp, 4, 'locked', 'Full Front Split (שפגאט קדמי מלא על הרצפה בשתי הרגליים - 30 שניות)', {
      prereq: 'Front Split 5 ס"מ מהרצפה',
      measures: [hold('Full Front Split — לכל רגל', 'Full Front Split', 0, 30, { source: 'manual_benchmark' })],
      slots: [
        slot('push', 'mobility_finisher_slot', 'Front Split|Butterfly|Pancake', [
          ex('Full Front Split', 2, '30 שניות לכל רגל', '—'),
          ex('Pancake Stretch', 1, '60 שניות', '—'),
        ]),
      ],
    }),
    tier(sp, 5, 'locked', 'Full Middle Split (שפגאט אמצעי/בנים מלא - 30 שניות)', {
      prereq: 'Full Front Split 30 שנ\' בשתי הרגליים',
      measures: [hold('Full Middle Split', 'Middle Split', 0, 30, { source: 'manual_benchmark' })],
      slots: [
        slot('push', 'mobility_finisher_slot', 'Full Front Split|Pancake', [
          ex('Middle Split (שפגאט בנים)', 2, '30-60 שניות', '—'),
          ex('Full Front Split', 1, '30 שניות לכל רגל', '—'),
        ]),
      ],
    }),
  ]
}
