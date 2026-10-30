import { isSupabaseConfigured, supabase } from './supabase'
import { SHARED_OWNER_ID } from './appStateSync'
import { uid } from './types'

export type TipItem = {
  id: string
  title: string
  /** Plain text; lines starting with "-" or "•" render as bullets, **x** as bold. */
  body: string
}

export type TipCategory = {
  id: string
  title: string
  items: TipItem[]
}

export type FitnessTipsDoc = {
  categories: TipCategory[]
  /** ISO timestamp of the last local edit; the epoch marks the untouched seed. */
  updatedAt: string
  /** `updatedAt` of the version last confirmed in the cloud (the merge base). */
  syncedAt?: string
  /** Tombstones (ids + titles) of entries deleted here but not yet pushed — kept out of merges. */
  pendingDeletes?: string[]
}

export const FITNESS_TIPS_STORAGE_KEY = 'tn.fitnessTips.v1'
export const SEED_UPDATED_AT = new Date(0).toISOString()

export const TIP_TITLE_MAX = 120
export const TIP_BODY_MAX = 4000
export const CATEGORY_TITLE_MAX = 80

function item(title: string, body: string): TipItem {
  return { id: uid(), title, body }
}

export function seedFitnessTips(): FitnessTipsDoc {
  return {
    updatedAt: SEED_UPDATED_AT,
    categories: [
      {
        id: uid(),
        title: 'דגשים בזמן אימון',
        items: [
          item(
            'הפעלת שריר נגדי (גב אחרי חזה)',
            '- אחרי סט לחזה, בצע סט משיכה (חתירה / פולי) כסופרסט או במנוחה הפעילה\n- השריר הנגדי משחרר את הכתפיים קדימה ומאזן את היציבה\n- **מנוחה:** 60–90 שניות בין זוג הסטים',
          ),
          item(
            'שליטה בקצב (טמפו)',
            '- ירידה מבוקרת של **2–3 שניות** בשלב האקסצנטרי\n- עצירה קצרה בתחתית, בלי קפיצה\n- עלייה נמרצת אך נשלטת',
          ),
          item(
            'מנוחות בין סטים',
            '- תרגילי בסיס כבדים: **2–3 דקות**\n- תרגילי עזר ובידוד: **60–90 שניות**\n- סופרסטים: מנוחה רק אחרי השלמת הזוג',
          ),
          item(
            'נשימה',
            '- שאיפה בירידה, נשיפה בשלב המאמץ\n- בתרגילים כבדים: שאיפה עמוקה לבטן ונעילת ליבה לפני החזרה',
          ),
        ],
      },
      {
        id: uid(),
        title: 'דגשים לתרגילי חזה / דחיפה',
        items: [
          item(
            'מנח שכמות',
            '- שכמות מכווצות לאחור ולמטה לאורך כל הסט\n- חזה "גבוה" — קשת עדינה בגב התחתון, ישבן על הספסל',
          ),
          item(
            'מרפקים ומסלול',
            '- מרפקים בזווית של כ־45° מהגוף, לא פתוחים ל־90°\n- המוט יורד לקו הפטמות / חזה תחתון',
          ),
          item(
            'לחיצת כתפיים',
            '- ליבה נעולה, בלי קשת מוגזמת בגב\n- הראש "עובר" קדימה מתחת למוט בסוף התנועה',
          ),
        ],
      },
      {
        id: uid(),
        title: 'דגשים לתרגילי גב / משיכה',
        items: [
          item(
            'להוביל עם המרפקים',
            '- לחשוב "מרפקים לכיס האחורי" ולא "ידיים למשוך"\n- אחיזה רפויה יחסית כדי להוריד עומס מהזרועות',
          ),
          item(
            'כיווץ בשיא',
            '- עצירה של **שנייה** עם שכמות מכווצות בסוף כל חזרה\n- מתיחה מלאה בחזרה — בלי לאבד יציבה',
          ),
          item(
            'חתירה בהטיה',
            '- גב ניטרלי, ירכיים לאחור, ברכיים מעט כפופות\n- בלי תנופה של הגו — אם צריך תנופה, המשקל כבד מדי',
          ),
        ],
      },
      {
        id: uid(),
        title: 'חימום ומוביליטי לפני אימון',
        items: [
          item(
            'חימום כללי',
            '- **5 דקות** אירובי קל (הליכה מהירה / אופניים)\n- מטרה: הזעה קלה ודופק מוגבר',
          ),
          item(
            'מוביליטי ממוקד',
            '- סיבובי כתפיים, פתיחות חזה עם גומייה (Band pull-apart)\n- Cat-Cow וסיבובי עמוד שדרה חזי\n- סקוואט עמוק מוחזק 30 שניות',
          ),
          item(
            'סטים מדורגים',
            '- 2–3 סטי חימום בתרגיל הראשון: 50% → 70% → 85% מהמשקל העבודה\n- מעט חזרות בסטים הכבדים כדי לא להתעייף',
          ),
        ],
      },
    ],
  }
}

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

function normalizeItem(raw: unknown): TipItem | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Partial<TipItem>
  const title = clip(row.title, TIP_TITLE_MAX).trim()
  const body = clip(row.body, TIP_BODY_MAX)
  if (!title && !body.trim()) return null
  return { id: typeof row.id === 'string' && row.id ? row.id : uid(), title, body }
}

export function normalizeCategories(raw: unknown): TipCategory[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((entry): TipCategory[] => {
    if (!entry || typeof entry !== 'object') return []
    const row = entry as Partial<TipCategory>
    const title = clip(row.title, CATEGORY_TITLE_MAX).trim()
    if (!title) return []
    const items = Array.isArray(row.items)
      ? row.items.map(normalizeItem).filter((i): i is TipItem => Boolean(i))
      : []
    return [{ id: typeof row.id === 'string' && row.id ? row.id : uid(), title, items }]
  })
}

export function loadLocalTips(): FitnessTipsDoc {
  try {
    const raw = localStorage.getItem(FITNESS_TIPS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FitnessTipsDoc>
      if (Array.isArray(parsed.categories) && typeof parsed.updatedAt === 'string') {
        return {
          categories: normalizeCategories(parsed.categories),
          updatedAt: parsed.updatedAt,
          syncedAt: typeof parsed.syncedAt === 'string' ? parsed.syncedAt : undefined,
          pendingDeletes: Array.isArray(parsed.pendingDeletes)
            ? parsed.pendingDeletes.filter((id): id is string => typeof id === 'string')
            : [],
        }
      }
    }
  } catch {
    // Corrupt or blocked storage falls through to the seed.
  }
  return seedFitnessTips()
}

export function saveLocalTips(doc: FitnessTipsDoc) {
  try {
    localStorage.setItem(FITNESS_TIPS_STORAGE_KEY, JSON.stringify(doc))
  } catch (err) {
    console.error('[fitnessTips] local save failed', err)
  }
}

export type PullTipsResult =
  | { ok: true; doc: FitnessTipsDoc | null }
  | { ok: false; error: string }

export async function pullFitnessTips(): Promise<PullTipsResult> {
  if (!isSupabaseConfigured || !supabase) return { ok: false, error: 'Supabase אינו מוגדר' }
  const { data, error } = await supabase
    .from('fitness_tips')
    .select('categories, updated_at')
    .eq('owner_id', SHARED_OWNER_ID)
    .maybeSingle()
  if (error) {
    console.error('[fitnessTips] pull failed', error)
    return { ok: false, error: error.message }
  }
  if (!data) return { ok: true, doc: null }
  const row = data as { categories: unknown; updated_at: string }
  return {
    ok: true,
    doc: { categories: normalizeCategories(row.categories), updatedAt: row.updated_at },
  }
}

export async function pushFitnessTips(doc: FitnessTipsDoc): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return 'Supabase אינו מוגדר'
  const { error } = await supabase.from('fitness_tips').upsert(
    { owner_id: SHARED_OWNER_ID, categories: doc.categories, updated_at: doc.updatedAt },
    { onConflict: 'owner_id' },
  )
  if (error) {
    console.error('[fitnessTips] push failed', error)
    return error.message
  }
  return null
}

export function subscribeFitnessTips(onChange: () => void): () => void {
  if (!isSupabaseConfigured || !supabase) return () => {}
  const channel = supabase
    .channel(`fitness-tips-${SHARED_OWNER_ID}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fitness_tips' }, onChange)
    .subscribe()
  return () => {
    void supabase!.removeChannel(channel)
  }
}

/** True when this device holds edits the cloud has not confirmed yet. */
export function hasUnsyncedChanges(doc: FitnessTipsDoc): boolean {
  return doc.updatedAt !== SEED_UPDATED_AT && doc.updatedAt !== doc.syncedAt
}

function titleKey(title: string) {
  return title.trim().toLowerCase()
}

function sameKey(a: { id: string; title: string }, b: { id: string; title: string }) {
  return a.id === b.id || titleKey(a.title) === titleKey(b.title)
}

/** Tombstone keys for a deleted entry: its id plus its title (seeded ids differ per device). */
export function deletionKeys(entry: { id: string; title: string }): string[] {
  return [entry.id, `title:${titleKey(entry.title)}`]
}

/**
 * Combines unsynced local edits with a newer cloud version instead of letting
 * either side overwrite the other. Categories and tips match by id or by title
 * (each device seeds its own ids); on a clash the local copy wins, local order
 * is kept, cloud-only entries are appended, and local unsynced deletes stay deleted.
 */
export function mergeTipCategories(
  local: TipCategory[],
  remote: TipCategory[],
  pendingDeletes: readonly string[] = [],
): TipCategory[] {
  const tombstones = new Set(pendingDeletes)
  const isDeleted = (e: { id: string; title: string }) =>
    deletionKeys(e).some((k) => tombstones.has(k))
  const merged = local.map((cat) => {
    const twin = remote.find((r) => sameKey(r, cat))
    if (!twin) return cat
    const extra = twin.items.filter(
      (ri) => !isDeleted(ri) && !cat.items.some((li) => sameKey(li, ri)),
    )
    return extra.length ? { ...cat, items: [...cat.items, ...extra] } : cat
  })
  for (const cat of remote) {
    if (isDeleted(cat) || merged.some((m) => sameKey(m, cat))) continue
    merged.push({ ...cat, items: cat.items.filter((i) => !isDeleted(i)) })
  }
  return merged
}

export function moveInArray<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta
  if (index < 0 || target < 0 || target >= list.length) return list
  const next = [...list]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  return next
}
