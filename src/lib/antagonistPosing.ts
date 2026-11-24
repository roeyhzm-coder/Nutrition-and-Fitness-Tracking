/**
 * Antagonist posing ("פוזינג נגדי") — a short isometric squeeze of the muscle
 * opposite to the one an exercise works, cued between sets.
 *
 * Preferences are keyed by canonical exercise name (the same exercise in the
 * plan, a library template and the active workout share one setting) and
 * synced inside the `consistency_day_marks` JSON under
 * ANTAGONIST_PAYLOAD_KEY (no Supabase table / migration), per-entry
 * last-write-wins on `updatedAt`.
 */

import { canonicalExerciseKey } from './exerciseDefaults'

export { ANTAGONIST_PAYLOAD_KEY } from './weeklyConsistency'

export const ANTAGONIST_STORAGE_KEY = 'tn.antagonistPosing.v1'
export const ANTAGONIST_LABEL = 'פוזינג נגדי'
export const ANTAGONIST_FALLBACK_CUE = 'כיווץ השריר הנגדי (5–10 שנ׳)'
export const ANTAGONIST_CUE_MAX_LENGTH = 120

export type AntagonistPattern =
  | 'core'
  | 'lateral'
  | 'triceps'
  | 'biceps'
  | 'hinge'
  | 'squat'
  | 'pull'
  | 'push'
  | 'fallback'

type Rule = { pattern: Exclude<AntagonistPattern, 'fallback'>; cue: string; re: RegExp }

/**
 * Ordered: earlier rules win. Core precedes pull/push because hanging / dip-bar
 * leg raises contain "מתח" / "מקבילים"; triceps & hinge precede biceps so
 * "פשיטת מרפקים" and hamstring curls never read as a biceps curl.
 */
const RULES: readonly Rule[] = [
  {
    pattern: 'core',
    cue: 'כיווץ גב תחתון וישבן (5–10 שנ׳)',
    re: /הרמת\s*(רגליים|ברכיים)|הולו|בטן|פלאנק|toes?\s*to\s*bar|\bttb\b|hollow|\bcore\b|\babs?\b|crunch|plank|knee\s*raise|leg\s*raise|l-?sit/i,
  },
  {
    pattern: 'lateral',
    cue: 'הורדת כתפיים וכיווץ רחב גבי (5–10 שנ׳)',
    re: /הרחקות|lateral\s*raise|side\s*raise/i,
  },
  {
    pattern: 'triceps',
    cue: 'כיווץ יד קדמית חזק (5–10 שנ׳)',
    re: /פשיטת\s*מרפקים|יד\s*אחורית|טרייספס|skull|tricep|french\s*press|pushdown/i,
  },
  {
    pattern: 'hinge',
    cue: 'כיווץ ארבע-ראשי חזק (5–10 שנ׳)',
    re: /דדליפט|רומני|המסטרינג|כפיפת\s*ברכיים|\brdl\b|deadlift|hamstring|leg\s*curl|good\s*morning|nordic/i,
  },
  {
    pattern: 'biceps',
    cue: 'כיווץ יד אחורית חזק (5–10 שנ׳)',
    re: /כפיפת\s*מרפקים|בייספס|biceps?|\bcurls?\b/i,
  },
  {
    pattern: 'squat',
    cue: 'כיווץ המסטרינג וישבן (5–10 שנ׳)',
    re: /סקוואט|בולגרי|מכרע|וול\s*סיט|פיסטול|squat|lunge|split|wall\s*sit|pistol|leg\s*press|step[-\s]*up/i,
  },
  {
    pattern: 'pull',
    cue: 'כיווץ חזה חזק (5–10 שנ׳)',
    re: /מתח|חתירה|פרונט\s*לבר|תלייה|מאסל|pull[-\s]*ups?|chin[-\s]*ups?|chest\s*to\s*bar|muscle[-\s]*ups?|front\s*lever|\brows?\b|rowing|scapular|hang|lat\s*pull/i,
  },
  {
    pattern: 'push',
    cue: 'כיווץ גב עליון וכתף אחורית (5–10 שנ׳)',
    re: /מקבילים|פייק|pike|שכיבות\s*(סמיכה|שמיכה)|פלאנש|לחיצת\s*(כתפיים|חזה)|עמידת\s*ידיים|dips?\b|push[-\s]*ups?|planche|press|handstand|\bhspu\b/i,
  },
]

export type AntagonistRecommendation = { pattern: AntagonistPattern; cue: string }

/** Recommended antagonist cue inferred from the exercise name (Hebrew / English). */
export function recommendAntagonist(name: string): AntagonistRecommendation {
  const text = name.normalize('NFKC')
  for (const rule of RULES) {
    if (rule.re.test(text)) return { pattern: rule.pattern, cue: rule.cue }
  }
  return { pattern: 'fallback', cue: ANTAGONIST_FALLBACK_CUE }
}

/** Stored per-exercise preference (snake_case = the synced JSONB shape). */
export type AntagonistPref = {
  exercise_name: string
  show_antagonist_posing: boolean
  /** Custom cue override; '' / undefined = use the auto recommendation. */
  antagonist_cue?: string
  updatedAt: string
}

export type AntagonistState = Record<string, AntagonistPref>

export type ResolvedAntagonist = {
  show: boolean
  cue: string
  recommendedCue: string
  isCustom: boolean
  pattern: AntagonistPattern
}

export const antagonistKey = canonicalExerciseKey

/**
 * Effective setting for an exercise. Unset = ON for every recognised movement
 * pattern (all strength lifts) and OFF for unrecognised work (swim, intervals…).
 */
export function resolveAntagonist(state: AntagonistState, name: string): ResolvedAntagonist {
  const rec = recommendAntagonist(name)
  const pref = state[antagonistKey(name)]
  const custom = pref?.antagonist_cue?.trim() ?? ''
  return {
    show: pref ? pref.show_antagonist_posing : rec.pattern !== 'fallback',
    cue: custom || rec.cue,
    recommendedCue: rec.cue,
    isCustom: custom.length > 0 && custom !== rec.cue,
    pattern: rec.pattern,
  }
}

/** Pure edit: write a new preference for `name` (keeps fields not in `patch`). */
export function withAntagonistPref(
  state: AntagonistState,
  name: string,
  patch: Partial<Pick<AntagonistPref, 'show_antagonist_posing' | 'antagonist_cue'>>,
  updatedAt = new Date().toISOString(),
): AntagonistState {
  const trimmedName = name.trim()
  if (!trimmedName) return state
  const key = antagonistKey(trimmedName)
  const current = resolveAntagonist(state, trimmedName)
  const prev = state[key]
  const cue =
    patch.antagonist_cue !== undefined
      ? clampCue(patch.antagonist_cue)
      : (prev?.antagonist_cue ?? '')
  const next: AntagonistPref = {
    exercise_name: trimmedName,
    show_antagonist_posing: patch.show_antagonist_posing ?? current.show,
    // Saving the recommendation verbatim stores no override, so future
    // mapping improvements still reach this exercise.
    antagonist_cue: cue && cue !== current.recommendedCue ? cue : '',
    updatedAt: updatedAt > (prev?.updatedAt ?? '') ? updatedAt : bump(prev!.updatedAt),
  }
  return { ...state, [key]: next }
}

function bump(iso: string): string {
  return new Date(Date.parse(iso) + 1).toISOString()
}

function clampCue(cue: string): string {
  return cue.replace(/\s+/g, ' ').trim().slice(0, ANTAGONIST_CUE_MAX_LENGTH)
}

/** Defensive parse of a local / remote payload. */
export function normalizeAntagonistState(raw: unknown): AntagonistState {
  const out: AntagonistState = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const value of Object.values(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue
    const v = value as Record<string, unknown>
    const name = typeof v.exercise_name === 'string' ? v.exercise_name.trim() : ''
    const updatedAt =
      typeof v.updatedAt === 'string' && !Number.isNaN(Date.parse(v.updatedAt))
        ? new Date(v.updatedAt).toISOString()
        : null
    if (!name || !updatedAt || typeof v.show_antagonist_posing !== 'boolean') continue
    const key = antagonistKey(name)
    const entry: AntagonistPref = {
      exercise_name: name,
      show_antagonist_posing: v.show_antagonist_posing,
      antagonist_cue: typeof v.antagonist_cue === 'string' ? clampCue(v.antagonist_cue) : '',
      updatedAt,
    }
    if (!out[key] || entry.updatedAt > out[key].updatedAt) out[key] = entry
  }
  return out
}

/** Per-exercise last-write-wins merge; returns `local` when nothing changes. */
export function mergeAntagonistState(
  local: AntagonistState,
  remote: AntagonistState,
): AntagonistState {
  let changed = false
  const next = { ...local }
  for (const [key, entry] of Object.entries(remote)) {
    const prev = next[key]
    if (!prev || entry.updatedAt > prev.updatedAt) {
      next[key] = entry
      changed = true
    }
  }
  return changed ? next : local
}
