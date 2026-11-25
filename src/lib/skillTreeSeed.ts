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
/**
 * Seed v2 (4 tracks in focus / 4 queued, strict 1-in-1-out recipes): every seed
 * track / tier last written before this time is reset to the seed (manual values kept).
 */
export const SKILL_SEED_V2_AT = '2026-11-17T10:30:00.000Z'
/**
 * Seed revision stamped on every seed track / tier. A seed entity without the
 * current revision (written by an older bundle, which drops unknown fields) is
 * reset to the seed on load — independent of its timestamp, so a stale client
 * can never resurrect an old tier state again. Bump when the seed changes.
 */
export const SKILL_SEED_REV = 7
/**
 * Floor timestamp for the current seed revision's migration.
 * Rev 6: the pull/dip station can't fit Front Lever rows → Front Lever queued
 * (equipment note), One-Arm Chin-Up joins focus next to Handstand.
 * Rev 7: content refresh only — Handstand stage 1 reads Morning Routine B
 * (no injected duplicate), Archer slot prescription 3×4-6 per side.
 */
export const SKILL_SEED_REV_AT = '2026-11-25T08:00:00.000Z'
/** Seed entities older than this revision are fully reset (rev 4: clean Stage 1 baseline). */
export const SKILL_FULL_RESET_BELOW = 4
/**
 * Targeted resets: tracks fully reset when coming from below the revision.
 * Other tracks only get the refreshed seed content (baselines) and keep their state.
 */
export const SKILL_TRACK_RESETS: Readonly<Record<number, readonly string[]>> = {
  5: ['sk-handstand'],
}

/**
 * Realistic start for a target (never at, or above, the target): reps ~50%,
 * holds of 30 s+ ~50% (rounded to 5 s), short holds ~20% (15 s → 3 s),
 * loads ~50% (rounded down to 2.5 kg). Distance-to-floor goals keep their own start.
 */
function startFor(metric: SkillMeasure['metricType'], target: SkillValue, own: SkillValue): SkillValue {
  const t = target.amount
  if (t == null || metric === 'gap_cm' || metric === 'body_stat') return own
  let amount: number
  switch (metric) {
    case 'duration_seconds':
      amount = t >= 30 ? Math.round((t * 0.5) / 5) * 5 : Math.max(1, Math.round(t * 0.2))
      break
    case 'weight_x_reps':
      amount = Math.floor((t * 0.5) / 2.5) * 2.5
      break
    default:
      amount = Math.max(1, Math.round(t * 0.5))
  }
  return { ...own, amount: Math.min(amount, t > 1 ? t - 1 : 0), reps: target.reps, sets: target.sets }
}

export type SkillTrackCategory = 'pull' | 'push'
/** Training-day category of each seed track (badge on the card + 1 pull / 1 push focus). */
export const SKILL_TRACK_CATEGORY: Readonly<Record<string, { kind: SkillTrackCategory; badge: string }>> = {
  'sk-front-lever': { kind: 'pull', badge: "משיכה (ימים א', ג')" },
  'sk-one-arm': { kind: 'pull', badge: "משיכה (ימים א', ג', ו')" },
  'sk-muscle-up': { kind: 'pull', badge: "משיכה מתפרצת (ימים א', ג', ו')" },
  'sk-core-flag': { kind: 'pull', badge: "משיכה וליבה (ימים א', ג')" },
  'sk-handstand': { kind: 'push', badge: "דחיפה אנכית (ימים ב', ד' + בוקר B)" },
  'sk-planche': { kind: 'push', badge: "דחיפה אופקית (ימים ב', ד')" },
  'sk-pistol': { kind: 'push', badge: "רגליים (ימים ב', ד')" },
  'sk-splits': { kind: 'push', badge: "גמישות - סוף אימון דחיפה/רגליים (ב', ד')" },
}
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
      baseline: startFor(m.metricType, m.target, m.baseline),
      target: m.target,
      manual: null,
    })),
    slots: input.slots ?? [],
    slotsAppliedAt: tierStatus === 'active' && input.slots?.length ? IN_BLOCK_3 : null,
    progressions: [],
    updatedAt: EPOCH,
    seedRev: SKILL_SEED_REV,
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
  holdNote?: string,
): SkillBranch {
  return {
    id,
    order,
    icon,
    title,
    subtitle,
    status,
    nextUnlockTitle,
    updatedAt: EPOCH,
    seedRev: SKILL_SEED_REV,
    ...(holdNote ? { holdNote } : {}),
  }
}

// Exercise-name aliases (`|`) used both for measures and for the swap targets.
// Each tier's `replaces` also lists the earlier tiers' exercises, so jumping
// straight to a tier still swaps 1-for-1 instead of appending.
const HIGH_PULL = 'מתח מתפרץ גבוה|High Pull'
const CTB = 'Chest To Bar|מתח חזה'
const HEAVY_DIPS = 'מקבילים כבד|מקבילים עם משקל|Weighted Dips'
const TUCK_ROWS = 'Tuck Front Lever Rows|חתירת פרונט לבר מקופל|Tuck FL Rows'
const HEAVY_PULL = 'מתח כבד בפרונציה'
const TTB = 'Toes To Bar|TTB'
const OA_HANG = 'תלייה אקטיבית בשכמות ביד אחת|תלייה ביד אחת'
const HEAVY_CHIN = 'מתח בסופינציה עם משקל'
const INCLINE_CURL = 'כפיפת מרפקים בישיבה בשיפוע'
const PIKE = 'Pike|פייק'
const PSEUDO = 'Pseudo Planche|פסאודו'
const BULGARIAN = 'סקוואט בולגרי|Bulgarian'
const SL_RDL = 'Single-Leg RDL|דדליפט רומני ברגל אחת'
const WALL_HS = 'עמידת ידיים מול קיר|Wall Handstand'
const FINISHER = 'סיומת גמישות לשפגאט'
const TUCK_FL_HOLD = 'Tuck Front Lever Hold|החזקת פרונט לבר מקופל'
const HOLLOW = 'Hollow Body|הולו'
const CTW_HS = 'עמידת ידיים חזה לקיר|Chest-to-Wall Handstand'
const BW_DIPS = 'מקבילים משקל גוף|Bodyweight Dips'

const MU3 = 'Strict Bar Muscle-Up נקי (ללא קיפ)'
const MU4 = 'Muscle-Up Sets (סטים של 5 נקיים)'
const MU5 = 'Weighted / Slow Muscle-Up'
const FL3 = 'Advanced Tuck Front Lever Rows'
const FL4 = 'Straddle / One-Leg Front Lever'
const FL5 = 'Full Front Lever Hold & Pulls'
const OA3 = 'Archer Pull-ups / Uneven Chin-ups'
const OA4 = 'One-Arm Chin-Up Negatives'
const OA5 = 'Full One-Arm Chin-Up'
const HS3 = 'Deep Deficit Pike Push-ups'
const HS3M = 'עמידת ידיים חופשית (Freestanding Handstand)'
const HS4 = 'Full Chest-to-Wall HSPU'
const HS5 = 'Freestanding HSPU'
const PL3 = 'Tuck Planche Hold'
const PL4 = 'Advanced Tuck Planche & Push-ups'
const PL5 = 'Straddle / Full Planche'
const CF2 = 'סופרסט ליבה: Full L-Sit + Windshield Wipers'
const CF3 = 'Dragon Flag'
const CF4 = 'Tuck / Straddle Human Flag'
const CF5 = 'Full Human Flag'
const PS3 = 'Freestanding Pistol Squat'
const PS4 = 'Weighted Pistol Squat'
const PS4B = 'Nordic Hamstring Curl (אקסצנטרי)'
const PS5 = 'Advanced Shrimp Squat'
const PS5B = 'Full Nordic Curl (ללא ידיים)'

const chain = (...aliases: string[]) => aliases.join('|')

export const FRONT_LEVER_HOLD_NOTE = 'ממתין לציוד מתאים ל-Front Lever'

/**
 * Pull focus slot ("1 נכנס, 1 יוצא"): the one exercise in the pull workout
 * (משיכה) that belongs to whichever pull track is in active focus. When the
 * focus changes, the queued track's exercise there is swapped in place for the
 * focused track's — never appended, never duplicated (see lib/skillFocusSlot).
 * `owns` lists every variant a track may have put in that slot (its tier
 * recipes upgrade it in place, e.g. Tuck → Advanced Tuck FL Rows).
 */
export type SkillFocusHandoff = {
  target: 'pull'
  owns: string
  exercise: SkillSlotExercise
}
const ARCHER_PULL = 'Archer Pull-ups|Uneven Chin-ups|מתח קשת'
export const SKILL_FOCUS_HANDOFFS: Readonly<Record<string, SkillFocusHandoff>> = {
  'sk-front-lever': {
    target: 'pull',
    owns: chain(TUCK_ROWS, FL3, FL4, FL5),
    exercise: ex('חתירת פרונט לבר מקופל (Tuck Front Lever Rows)', 3, '6-8', '2-3 דקות', 'כשסוגרים 3x8 עוברים ל-Advanced Tuck.'),
  },
  'sk-one-arm': {
    target: 'pull',
    owns: ARCHER_PULL,
    exercise: ex(
      'Archer Pull-ups / Uneven Chin-ups (מתח קשת)',
      3,
      '4-6 לכל צד',
      '2-3 דקות',
      'מסלול One-Arm Chin-Up: היד העובדת מושכת, היד השנייה רק מייצבת. מחליף את Tuck FL Rows (לא אפשרי בעמדת המתח הביתית). כשסוגרים 3×6 לכל צד — מעבר ל-OAC Negatives.',
    ),
  },
  'sk-muscle-up': {
    target: 'pull',
    owns: HIGH_PULL,
    exercise: ex('מתח מתפרץ גבוה (High Pull-ups)', 3, '3-4', '2-3 דקות'),
  },
}

export function seedSkillBranches(): SkillBranch[] {
  return [
    track('sk-muscle-up', 1, 'muscleUp', 'Muscle-Up & Explosive Bar Mastery', 'משיכה מתפרצת ומאסל-אפ', 'queued_next_block', 'Strict Bar Muscle-Up נקי ללא קיפ'),
    track('sk-front-lever', 2, 'frontLever', 'Front Lever Mastery', 'פרונט לבר וכוח משיכה אופקי', 'queued_next_block', 'Advanced Tuck Front Lever Rows', FRONT_LEVER_HOLD_NOTE),
    track('sk-one-arm', 3, 'oneArm', 'One-Arm Chin-Up & Streetlifting Pull', 'מתח יד אחת ומשיכה מקסימלית', 'active_focus', 'Archer Pull-ups / Uneven Chin-ups'),
    track('sk-handstand', 4, 'handstand', 'Handstand & Freestanding HSPU', 'עמידת ידיים ולחיצה אנכית', 'active_focus', 'Freestanding Handstand 15 שניות'),
    track('sk-planche', 5, 'flame', 'Planche & Heavy Push Mastery', 'פלאנש ודחיפה כבדה', 'queued_next_block', 'Tuck Planche Hold'),
    track('sk-core-flag', 6, 'flag', 'Human Flag & Elite Core Compression', 'דגל אנושי, V-Sit וליבה', 'queued_next_block', 'Full L-Sit + Windshield Wipers'),
    track('sk-pistol', 7, 'leg', 'Single-Leg Strength & Pistol Squat', 'שליטה ברגל אחת ופיסטול סקוואט', 'queued_next_block', 'Freestanding Pistol Squat'),
    track('sk-splits', 8, 'stretch', 'Splits & Mobility Mastery', 'שפגאט קדמי/אמצעי וגמישות קצה', 'queued_next_block', 'בסיס לשפגאט (Couch + PNF + Frog)'),
  ]
}

/** One 6-minute mobility finisher; each tier swaps the previous tier's finisher. */
function finisher(stage: string, notes: string): SkillSlotRecipe {
  return slot('push', 'mobility_finisher_slot', FINISHER, [
    ex(`${FINISHER} - 6 דק׳ (${stage})`, 1, '6 דקות', '—', notes),
  ])
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
    // 1. Muscle-Up & Explosive Bar — slot: אימון 3 (יום ו׳), High Pull-ups.
    tier(mu, 1, 'queued', 'מתח חזה רצוף (16 חזרות משקל גוף)', {
      measures: [maxReps('מתח חזה רצוף (משקל גוף)', CTB, 10, 16)],
    }),
    tier(mu, 2, 'locked', 'High Pull-ups לבטן עליונה (3×4) + מתח חזה (18 חזרות / +5 ק"ג) + מקבילים כבד (30 ק"ג × 2)', {
      prereq: 'מתח חזה רצוף 16 חזרות',
      measures: [
        setsReps('High Pull-ups לגובה בטן עליונה', HIGH_PULL, 3, 3, 4),
        maxReps('מתח חזה (Chest To Bar) — מקסימום חזרות', CTB, 16, 18),
        weighted('מקבילים כבד — סט שיא', HEAVY_DIPS, [25, 2], [30, 2]),
      ],
      slots: [slot('combo', 'explosive_skill_slot', HIGH_PULL, [ex('מתח מתפרץ גבוה (High Pull-ups)', 3, '3-4', '2-3 דקות')])],
    }),
    tier(mu, 3, 'locked', 'Strict Bar Muscle-Up נקי ללא קיפ (3 סטים × 2-3 חזרות)', {
      prereq: 'High Pull-ups 3×4 לבטן עליונה + 18 מתח חזה + מקבילים 30 ק"ג × 2',
      measures: [setsReps('Strict Muscle-Up — חזרות נקיות לסט', 'Strict Bar Muscle-Up', 3, 0, 3)],
      slots: [
        slot('combo', 'explosive_skill_slot', HIGH_PULL, [
          ex(MU3, 3, '2-3', '3 דקות', 'משיכה מתפרצת לבטן תחתונה, מעבר מהיר של פרקי הידיים, בלי קיפ.'),
        ]),
      ],
    }),
    tier(mu, 4, 'locked', 'Muscle-Up Sets (3 סטים × 5 חזרות נקיות)', {
      prereq: 'Strict Muscle-Up 3×2-3 נקי',
      measures: [setsReps('Muscle-Up — 3 סטים', 'Muscle-Up Sets', 3, 3, 5)],
      slots: [slot('combo', 'explosive_skill_slot', chain('Strict Bar Muscle-Up', HIGH_PULL), [ex(MU4, 3, '5', '3 דקות')])],
    }),
    tier(mu, 5, 'locked', 'Weighted / Slow Muscle-Up (3×3, +5-10 ק"ג או ללא מומנטום)', {
      prereq: '3×5 Muscle-Up נקיים',
      measures: [weighted('Weighted Muscle-Up', 'Weighted / Slow Muscle-Up|Weighted Muscle-Up', [0, 3], [7.5, 3])],
      slots: [
        slot('combo', 'explosive_skill_slot', chain('Muscle-Up Sets', 'Strict Bar Muscle-Up', HIGH_PULL), [
          ex(MU5, 3, '3', '3-4 דקות', '+5-10 ק"ג, או איטי לגמרי ללא מומנטום.'),
        ]),
      ],
    }),

    // 2. Front Lever — slot: אימון 1 (א׳/ג׳), Tuck FL Rows.
    tier(fl, 1, 'queued', 'Tuck Front Lever Hold (20 שניות) + Hollow Body Hold (60 שניות)', {
      measures: [
        hold('Tuck Front Lever Hold', TUCK_FL_HOLD, 10, 20, { sets: 3 }),
        hold('Hollow Body Hold', HOLLOW, 30, 60),
      ],
    }),
    tier(fl, 2, 'locked', 'Tuck Front Lever Rows (3×8) + מתח פרונציה כבד (32.5 ק"ג × 3) + Toes To Bar (3×8 עם עצירה)', {
      prereq: "Tuck FL Hold 20 שנ' + Hollow 60 שנ'",
      measures: [
        setsReps('Tuck FL Rows — חזרות נקיות', TUCK_ROWS, 3, 6, 8),
        weighted('מתח כבד בפרונציה — סט כבד', HEAVY_PULL, [27.5, 3], [32.5, 3]),
        setsReps("Toes To Bar (עצירה 2 שנ' למעלה)", TTB, 3, 6, 8),
      ],
      slots: [
        slot('pull', 'horizontal_secondary_slot', TUCK_ROWS, [ex('חתירת פרונט לבר מקופל (Tuck Front Lever Rows)', 3, '6-8', '2 דקות')]),
      ],
    }),
    tier(fl, 3, 'locked', 'Advanced Tuck Front Lever Rows (3×6, גב שטוח 90 מעלות)', {
      prereq: 'Tuck FL Rows 3×8 + מתח כבד 32.5 ק"ג × 3 + TTB 3×8',
      measures: [setsReps('Advanced Tuck FL Rows', FL3, 3, 3, 6)],
      slots: [slot('pull', 'horizontal_secondary_slot', TUCK_ROWS, [ex(FL3, 3, '6', '2-3 דקות', 'גב שטוח, ירכיים בקו הגב.')])],
    }),
    tier(fl, 4, 'locked', 'Straddle / One-Leg Front Lever (3×10 שניות)', {
      prereq: 'Advanced Tuck FL Rows 3×6',
      measures: [hold('Straddle / One-Leg FL Hold', FL4, 3, 10, { sets: 3 })],
      slots: [slot('pull', 'horizontal_secondary_slot', chain(FL3, TUCK_ROWS), [ex(FL4, 3, '10 שניות', '2-3 דקות')])],
    }),
    tier(fl, 5, 'locked', 'Full Front Lever Hold & Pulls (3×8 שניות)', {
      prereq: "Straddle FL Hold 3×10 שנ'",
      measures: [hold('Full Front Lever Hold', 'Full Front Lever', 2, 8, { sets: 3 })],
      slots: [slot('pull', 'horizontal_secondary_slot', chain(FL4, FL3, TUCK_ROWS), [ex(FL5, 3, '8 שניות', '3 דקות')])],
    }),

    // 3. One-Arm Chin-Up — tier 2/4/5 slot: אימון 1 hang; tier 3: אימון 3 weighted chin-ups.
    tier(oa, 1, 'active', 'מתח סופינציה +32.5 ק"ג × 2 חזרות', {
      measures: [weighted('מתח סופינציה עם משקל', HEAVY_CHIN, [25, 2], [32.5, 2])],
    }),
    tier(oa, 2, 'locked', "תלייה אקטיבית בשכמה ביד אחת (3×25 שנ') + מתח סופינציה כבד (40-42.5 ק\"ג × 2 / 30 ק\"ג × 6) + כפיפת מרפקים בשיפוע עם החזקה ב-90° (18 ק\"ג × 8)", {
      prereq: 'מתח סופינציה +32.5 ק"ג × 2',
      measures: [
        hold('תלייה ביד אחת — שניות לכל יד', OA_HANG, 15, 25, { sets: 3 }),
        weighted('מתח סופינציה כבד — 2 חזרות', HEAVY_CHIN, [32.5, 2], [40, 2]),
        weighted('מתח סופינציה — 6 חזרות', HEAVY_CHIN, [22.5, 5], [30, 6]),
        weighted('כפיפת מרפקים בשיפוע + 90°', INCLINE_CURL, [16, 6], [18, 8]),
      ],
      slots: [slot('pull', 'primary_strength_slot', OA_HANG, [ex('תלייה אקטיבית בשכמות ביד אחת', 3, '15-25 שניות לכל יד', '90 שניות')])],
    }),
    tier(oa, 3, 'locked', 'Archer Pull-ups / Uneven Chin-ups (3×5 לכל צד)', {
      prereq: "תלייה ביד אחת 3×25 שנ' + מתח סופינציה 40 ק\"ג × 2",
      measures: [setsReps('Archer / Uneven — לכל צד', 'Archer|Uneven', 3, 2, 5)],
      slots: [slot('combo', 'primary_strength_slot', HEAVY_CHIN, [ex(OA3, 3, '5 לכל צד', '2-3 דקות')])],
    }),
    tier(oa, 4, 'locked', 'One-Arm Chin-Up Negatives (3×3 לכל יד, ירידה של 6 שניות)', {
      prereq: 'Archer Pull-ups 3×5 לכל צד',
      measures: [setsReps('OAC Negatives — לכל יד', OA4, 3, 1, 3)],
      slots: [slot('pull', 'primary_strength_slot', OA_HANG, [ex(OA4, 3, '3 לכל יד', '3 דקות', 'ירידה של 6 שניות ביד אחת.')])],
    }),
    tier(oa, 5, 'locked', 'Full One-Arm Chin-Up (3×1-2 לכל יד)', {
      prereq: 'OAC Negatives 3×3 לכל יד',
      measures: [maxReps('One-Arm Chin-Up מלא — חזרות לכל יד', OA5, 0, 2)],
      slots: [slot('pull', 'primary_strength_slot', chain(OA4, OA_HANG), [ex(OA5, 3, '1-2 לכל יד', '4 דקות')])],
    }),

    // 4. Handstand & HSPU — slots: אימון 2 Pike + שגרת בוקר B.
    tier(hs, 1, 'active', 'עמידת ידיים חזה לקיר (60 שניות) + Wall HSPU בסיסי', {
      measures: [
        // Already in Morning Routine B: progress is read from there, never injected into a workout.
        hold('עמידת ידיים חזה לקיר', `${CTW_HS}|עמידת ידיים מול קיר`, 30, 60, { sets: 3, source: 'morning_routine' }),
        maxReps('Wall HSPU בסיסי', 'Wall HSPU', 1, 3),
      ],
    }),
    tier(hs, 2, 'locked', "Elevated Pike Push-ups (3×8 מלאות) + עמידת ידיים מול קיר בשגרת בוקר B (60 שנ')", {
      prereq: "עמידת ידיים חזה לקיר 60 שנ'",
      measures: [
        setsReps('Elevated Pike Push-ups — חזרות מלאות', 'Elevated Pike', 3, 5, 8),
        hold('עמידת ידיים מול קיר (שגרת בוקר B)', 'עמידת ידיים מול קיר|Handstand', null, 60, { source: 'morning_routine' }),
      ],
      slots: [
        slot('push', 'primary_strength_slot', PIKE, [
          ex('לחיצת כתפיים Pike ברגליים מוגבהות (Elevated Pike Push-ups)', 3, '5-8', '2-3 דקות'),
        ]),
      ],
    }),
    tier(hs, 3, 'locked', 'Freestanding Handstand (15 שניות) + Deep Deficit Pike Push-ups (3×6)', {
      prereq: "Pike מוגבה 3×8 + עמידת ידיים לקיר 60 שנ'",
      measures: [
        hold('עמידת ידיים חופשית', 'Freestanding Handstand|עמידת ידיים חופשית', 0, 15, { source: 'morning_routine' }),
        setsReps('Deep Deficit Pike Push-ups', 'Deficit Pike', 3, 3, 6),
      ],
      slots: [
        slot('push', 'primary_strength_slot', PIKE, [ex(HS3, 3, '6', '2-3 דקות', 'על ידיות / פלטות, ראש מתחת לגובה הידיים.')]),
        slot('morningB', 'accessory_core_slot', WALL_HS, [
          ex(HS3M, 5, '15 שניות', '30 שניות', 'נסיונות קצרים, יציאה בטוחה לצד (cartwheel).'),
        ]),
      ],
    }),
    tier(hs, 4, 'locked', 'Full Chest-to-Wall HSPU (3×6 ראש עד הרצפה)', {
      prereq: "עמידה חופשית 15 שנ' + Deficit Pike 3×6",
      measures: [setsReps('Chest-to-Wall HSPU — טווח מלא', 'Chest-to-Wall HSPU', 3, 2, 6)],
      slots: [slot('push', 'primary_strength_slot', chain('Deficit Pike', PIKE), [ex(HS4, 3, '6', '3 דקות')])],
    }),
    tier(hs, 5, 'locked', 'Freestanding HSPU (3×3)', {
      prereq: 'Chest-to-Wall HSPU 3×6',
      measures: [setsReps('Freestanding HSPU', HS5, 3, 1, 3)],
      slots: [slot('push', 'primary_strength_slot', chain('Chest-to-Wall HSPU', PIKE), [ex(HS5, 3, '3', '3-4 דקות')])],
    }),

    // 5. Planche & Heavy Push — slot: אימון 2, Pseudo Planche.
    tier(pl, 1, 'queued', 'מקבילים משקל גוף (17 חזרות) + שכיבות סמיכה מתפרצות (31 חזרות)', {
      measures: [
        maxReps('מקבילים משקל גוף', BW_DIPS, 12, 17),
        maxReps('שכיבות סמיכה מתפרצות', 'שכיבות סמיכה מתפרצות|Explosive Push', 20, 31),
      ],
    }),
    tier(pl, 2, 'locked', 'Pseudo Planche Push-ups בהישענות מקסימלית (2×8) + מקבילים כבד (30 ק"ג × 2)', {
      prereq: '17 מקבילים + 31 שכיבות סמיכה מתפרצות',
      measures: [
        setsReps('Pseudo Planche Push-ups', PSEUDO, 2, 6, 8),
        weighted('מקבילים כבד — סט שיא', HEAVY_DIPS, [25, 2], [30, 2]),
      ],
      slots: [
        slot('push', 'horizontal_secondary_slot', PSEUDO, [ex('שכיבות סמיכה פסאודו-פלאנש (Pseudo Planche Push-ups)', 2, '6-8', '2 דקות')]),
      ],
    }),
    tier(pl, 3, 'locked', 'Tuck Planche Hold (4×15 שניות)', {
      prereq: 'Pseudo Planche 2×8 + מקבילים 30 ק"ג × 2',
      measures: [hold('Tuck Planche Hold', PL3, 5, 15, { sets: 4 })],
      slots: [slot('push', 'horizontal_secondary_slot', PSEUDO, [ex(PL3, 4, '15 שניות', '2 דקות')])],
    }),
    tier(pl, 4, 'locked', 'Advanced Tuck Planche & Push-ups (3×5)', {
      prereq: "Tuck Planche 4×15 שנ'",
      measures: [setsReps('Advanced Tuck Planche Push-ups', 'Advanced Tuck Planche', 3, 2, 5)],
      slots: [slot('push', 'horizontal_secondary_slot', chain(PL3, PSEUDO), [ex(PL4, 3, '5', '2-3 דקות')])],
    }),
    tier(pl, 5, 'locked', 'Straddle / Full Planche (3×10 שניות)', {
      prereq: 'Advanced Tuck Planche & Push-ups 3×5',
      measures: [hold('Straddle / Full Planche Hold', PL5, 3, 10, { sets: 3 })],
      slots: [
        slot('push', 'horizontal_secondary_slot', chain('Advanced Tuck Planche', PL3, PSEUDO), [ex(PL5, 3, '5-10 שניות', '3 דקות')]),
      ],
    }),

    // 6. Human Flag & Core — slot: אימון 1, Toes To Bar.
    tier(cf, 1, 'queued', 'הרמות פייק (2×10) + החזקת הולו (60 שניות) + L-Sit ברכיים', {
      measures: [
        setsReps('הרמות פייק', 'הרמות פייק|Pike Leg Raise|Pike Lift', 2, 6, 10),
        hold('Hollow Body Hold', HOLLOW, 30, 60),
        hold('L-Sit ברכיים', 'L-Sit ברכיים|Tuck L-Sit', 10, 20),
      ],
    }),
    tier(cf, 2, 'locked', 'Full L-Sit (3×20 שניות) + Hanging Windshield Wipers (3×8)', {
      prereq: "הרמות פייק 2×10 + הולו 60 שנ' + L-Sit ברכיים",
      measures: [
        hold('Full L-Sit', 'L-Sit', 8, 20, { sets: 3, source: 'manual_benchmark' }),
        setsReps('Hanging Windshield Wipers', 'Windshield Wipers', 3, 4, 8),
      ],
      slots: [
        slot('pull', 'accessory_core_slot', TTB, [
          ex(CF2, 3, "L-Sit 20 שנ' + 8 מגבים", '90 שניות', 'סופרסט: L-Sit ומיד אחריו Windshield Wipers.'),
        ]),
      ],
    }),
    tier(cf, 3, 'locked', 'Dragon Flag מלא ונקי (3×6)', {
      prereq: "L-Sit 3×20 שנ' + Windshield Wipers 3×8",
      measures: [setsReps('Dragon Flag מלא', CF3, 3, 3, 6)],
      slots: [slot('pull', 'accessory_core_slot', chain('Windshield Wipers', TTB), [ex(CF3, 3, '6', '2 דקות')])],
    }),
    tier(cf, 4, 'locked', 'Tuck / Straddle Human Flag (10 שניות לכל צד)', {
      prereq: 'Dragon Flag 3×6',
      measures: [hold('Tuck / Straddle Human Flag — לכל צד', 'Straddle Human Flag', 3, 10)],
      slots: [slot('pull', 'accessory_core_slot', chain(CF3, 'Windshield Wipers', TTB), [ex(CF4, 3, '10 שניות לכל צד', '2-3 דקות')])],
    }),
    tier(cf, 5, 'locked', 'Full Human Flag (דגל אנושי מלא וישר)', {
      prereq: "Straddle Flag 10 שנ' לכל צד",
      measures: [hold('Full Human Flag', CF5, 3, 10)],
      slots: [
        slot('pull', 'accessory_core_slot', chain('Straddle Human Flag', CF3, 'Windshield Wipers', TTB), [
          ex(CF5, 3, '5-10 שניות לכל צד', '3 דקות'),
        ]),
      ],
    }),

    // 7. Single-Leg & Pistol — slots: אימון 2, Bulgarian + Single-Leg RDL.
    tier(ps, 1, 'queued', "וול-סיט רגל אחת (12 שניות) + ג'אמפ סקוואט עם משקל", {
      measures: [hold('וול-סיט רגל אחת', 'וול-סיט רגל אחת|Single-Leg Wall Sit', 5, 12, { sets: 3 })],
    }),
    tier(ps, 2, 'locked', 'סקוואט בולגרי כבד (14 ק"ג בכל יד × 8 חזרות לרגל) + Single-Leg RDL (16 ק"ג × 8)', {
      prereq: "וול-סיט רגל אחת 12 שנ'",
      measures: [
        weighted('סקוואט בולגרי — ק"ג בכל יד', BULGARIAN, [8, 8], [14, 8]),
        weighted('Single-Leg RDL', SL_RDL, [12, 8], [16, 8]),
      ],
      slots: [slot('push', 'primary_strength_slot', BULGARIAN, [ex('סקוואט בולגרי עם משקולות יד', 3, '6-8 לכל רגל', '2 דקות')])],
    }),
    tier(ps, 3, 'locked', 'Freestanding Pistol Squat (3×5 לכל רגל)', {
      prereq: 'בולגרי 14 ק"ג × 8 + SL RDL 16 ק"ג × 8',
      measures: [setsReps('Pistol Squat — לכל רגל', PS3, 3, 2, 5)],
      slots: [slot('push', 'primary_strength_slot', BULGARIAN, [ex(PS3, 3, '5 לכל רגל', '2 דקות')])],
    }),
    tier(ps, 4, 'locked', 'Weighted Pistol Squat (+10 ק"ג × 5) + Nordic Hamstring Curl (אקסצנטרי)', {
      prereq: 'Pistol חופשי 3×5 לכל רגל',
      measures: [
        weighted('Weighted Pistol Squat', PS4, [4, 5], [10, 5]),
        setsReps('Nordic Curl אקסצנטרי', 'Nordic Hamstring', 3, 3, 5),
      ],
      slots: [
        slot('push', 'primary_strength_slot', chain(PS3, BULGARIAN), [ex(PS4, 3, '5 לכל רגל', '2-3 דקות')]),
        slot('push', 'accessory_core_slot', SL_RDL, [ex(PS4B, 3, '3-5', '2 דקות')]),
      ],
    }),
    tier(ps, 5, 'locked', 'Advanced Shrimp Squat + Full Nordic Curl ללא ידיים (3×5)', {
      prereq: 'Weighted Pistol +10 ק"ג × 5 + Nordic אקסצנטרי 3×5',
      measures: [
        setsReps('Advanced Shrimp Squat', PS5, 3, 2, 5),
        setsReps('Full Nordic Curl', 'Full Nordic', 3, 2, 5),
      ],
      slots: [
        slot('push', 'primary_strength_slot', chain(PS4, PS3, BULGARIAN), [ex(PS5, 3, '5 לכל רגל', '2 דקות')]),
        slot('push', 'accessory_core_slot', chain('Nordic Hamstring', SL_RDL), [ex(PS5B, 3, '5', '2-3 דקות')]),
      ],
    }),

    // 8. Splits & Mobility — one 6-minute finisher at the end of אימון 2, swapped per tier.
    tier(sp, 1, 'queued', 'ישיבת סקוואט עמוקה (90 שניות כל בוקר) + סיבובי גב עליון', {
      measures: [hold('ישיבת סקוואט עמוקה', 'ישיבת סקוואט עמוקה|Deep Squat Hold', 45, 90)],
    }),
    tier(sp, 2, 'locked', 'בסיס לשפגאט: Couch Stretch + PNF Hamstring Stretch + Frog Stretch (ירידה ל-15 ס"מ מהרצפה)', {
      prereq: "ישיבת סקוואט עמוקה 90 שנ' כל בוקר",
      note: 'סיומת של 6 דקות בסוף אימון דחיפה ורגליים כשהשרירים חמים — בלי אימון נפרד.',
      measures: [gap('Frog Stretch — מרחק מהרצפה', 'Frog Stretch', 30, 15)],
      slots: [
        finisher('Couch + PNF + Frog', 'Couch Stretch 60 שנ׳ לכל רגל · PNF Hamstring (10 שנ׳ כיווץ, שחרור והעמקה) · Frog Stretch 60 שנ׳.'),
      ],
    }),
    tier(sp, 3, 'locked', 'Loaded Butterfly & Pancake Stretch + Front Split (5 ס"מ מהרצפה)', {
      prereq: 'Frog Stretch 15 ס"מ מהרצפה',
      measures: [gap('Front Split — מרחק מהרצפה', 'Front Split', 20, 5)],
      slots: [
        finisher('Butterfly + Pancake + Front Split', 'Loaded Butterfly 60 שנ׳ · Pancake 60 שנ׳ · Front Split עם בלוקים 60 שנ׳ לכל רגל.'),
      ],
    }),
    tier(sp, 4, 'locked', 'Full Front Split (שפגאט קדמי מלא בשתי הרגליים - 30 שניות)', {
      prereq: 'Front Split 5 ס"מ מהרצפה',
      measures: [hold('Full Front Split — לכל רגל', 'Full Front Split', 0, 30, { source: 'manual_benchmark' })],
      slots: [finisher('Full Front Split', 'Full Front Split 2×30 שנ׳ לכל רגל · Pancake 60 שנ׳.')],
    }),
    tier(sp, 5, 'locked', 'Full Middle Split (שפגאט אמצעי מלא - 30 שניות)', {
      prereq: "Full Front Split 30 שנ' בשתי הרגליים",
      measures: [hold('Full Middle Split', 'Middle Split', 0, 30, { source: 'manual_benchmark' })],
      slots: [finisher('Middle Split', 'Middle Split 2×30-60 שנ׳ · Full Front Split 30 שנ׳ לכל רגל.')],
    }),
  ]
}
