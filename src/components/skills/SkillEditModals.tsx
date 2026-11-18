import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { skillKindOfName } from '../../lib/skillWorkout'
import { parseDecimal } from '../../lib/numericInput'
import {
  emptyMeasure,
  type SkillSlotExercise,
  type SkillSlotRecipe,
  type SkillSlotTarget,
  type SkillTierStatus,
  SKILL_ICON_KEYS,
  SKILL_SOURCE_LABELS,
  type SkillBranch,
  type SkillBranchStatus,
  type SkillMeasure,
  type SkillMetricType,
  type SkillNode,
  type SkillSourceType,
  type SkillTreeState,
  type SkillValue,
} from '../../lib/skillTree'
import { Button } from '../ui/button'
import { Modal } from '../ui/Modal'
import { NumericInput } from '../ui/NumericInput'
import { SKILL_ICONS, SkillIcon } from './SkillIcon'

// ---------------------------------------------------------------------------
// Shared fields
// ---------------------------------------------------------------------------

function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength = 200,
  multiline = false,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
  maxLength?: number
  multiline?: boolean
}) {
  return (
    <label className="block text-xs text-muted">
      {label}
      {multiline ? (
        <textarea
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          rows={2}
          onChange={(e) => onChange(e.target.value)}
          className="field mt-1 resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="field mt-1"
        />
      )}
    </label>
  )
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly { id: T; label: string }[]
  onChange: (next: T) => void
}) {
  return (
    <label className="block text-xs text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="field mt-1"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

type ValueDraft = { amount: string; reps: string; sets: string }

function toDraft(value: SkillValue | null | undefined): ValueDraft {
  const s = (n: number | null | undefined) => (n == null ? '' : String(n))
  return { amount: s(value?.amount), reps: s(value?.reps), sets: s(value?.sets) }
}

function fromDraft(draft: ValueDraft, metric: SkillMetricType): SkillValue {
  const amount = parseDecimal(draft.amount)
  return {
    amount,
    reps: metric === 'weight_x_reps' ? parseDecimal(draft.reps) : null,
    sets:
      metric === 'sets_x_reps' || metric === 'duration_seconds' ? parseDecimal(draft.sets) : null,
  }
}

function fieldLabels(metric: SkillMetricType): { amount: string; second?: { key: 'reps' | 'sets'; label: string } } {
  switch (metric) {
    case 'weight_x_reps':
      return { amount: 'ק"ג', second: { key: 'reps', label: 'חזרות' } }
    case 'sets_x_reps':
      return { amount: 'חזרות לסט', second: { key: 'sets', label: 'סטים' } }
    case 'duration_seconds':
      return { amount: 'שניות', second: { key: 'sets', label: 'סטים' } }
    case 'max_reps':
      return { amount: 'חזרות' }
    case 'body_stat':
      return { amount: 'ערך' }
    case 'gap_cm':
      return { amount: 'ס"מ מהרצפה' }
  }
}

export function ValueFields({
  title,
  metric,
  draft,
  onChange,
}: {
  title: string
  metric: SkillMetricType
  draft: ValueDraft
  onChange: (next: ValueDraft) => void
}) {
  const labels = fieldLabels(metric)
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 text-xs font-semibold text-text">{title}</legend>
      <div className="grid grid-cols-2 gap-2">
        {labels.second?.key === 'sets' ? (
          <label className="block text-[11px] text-muted">
            {labels.second.label}
            <NumericInput
              decimals={0}
              value={draft.sets}
              onChange={(sets) => onChange({ ...draft, sets })}
            />
          </label>
        ) : null}
        <label className="block text-[11px] text-muted">
          {labels.amount}
          <NumericInput
            value={draft.amount}
            onChange={(amount) => onChange({ ...draft, amount })}
          />
        </label>
        {labels.second?.key === 'reps' ? (
          <label className="block text-[11px] text-muted">
            {labels.second.label}
            <NumericInput
              decimals={0}
              value={draft.reps}
              onChange={(reps) => onChange({ ...draft, reps })}
            />
          </label>
        ) : null}
      </div>
    </fieldset>
  )
}

const STATUS_OPTIONS: { id: SkillBranchStatus; label: string }[] = [
  { id: 'active_focus', label: 'בפוקוס פעיל' },
  { id: 'queued_next_block', label: 'בתור (בלוקים הבאים)' },
  { id: 'completed', label: 'הושלם' },
]

// Body stats live on the dashboard / profile, not in the calisthenics tree.
const SOURCE_OPTIONS = (Object.keys(SKILL_SOURCE_LABELS) as SkillSourceType[])
  .filter((id) => id !== 'body_metric')
  .map((id) => ({
  id,
  label: SKILL_SOURCE_LABELS[id],
}))

// ---------------------------------------------------------------------------
// Branch (master goal)
// ---------------------------------------------------------------------------

export function SkillBranchModal({
  open,
  branch,
  isNew,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  branch: SkillBranch | null
  isNew: boolean
  onClose: () => void
  onSave: (branch: SkillBranch) => void
  onDelete: (id: string) => void
}) {
  const [draft, setDraft] = useState<SkillBranch | null>(branch)
  const [confirmDelete, setConfirmDelete] = useState(false)
  useEffect(() => {
    if (open) {
      setDraft(branch)
      setConfirmDelete(false)
    }
  }, [open, branch])
  if (!draft) return null

  return (
    <Modal open={open} title={isNew ? 'יעד-על חדש' : 'עריכת יעד-על'} onClose={onClose}>
      <form
        className="space-y-3"
        dir="rtl"
        onSubmit={(e) => {
          e.preventDefault()
          if (!draft.title.trim()) return
          onSave({ ...draft, title: draft.title.trim(), subtitle: draft.subtitle.trim() })
        }}
      >
        <TextField
          label="שם היעד"
          value={draft.title}
          onChange={(title) => setDraft({ ...draft, title })}
          placeholder="למשל: Muscle-Up נקי"
        />
        <TextField
          label="תת-כותרת"
          value={draft.subtitle}
          onChange={(subtitle) => setDraft({ ...draft, subtitle })}
        />
        <div>
          <p className="mb-1 text-xs text-muted">אייקון</p>
          <div className="flex flex-wrap gap-1.5">
            {SKILL_ICON_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                aria-label={SKILL_ICONS[key].label}
                aria-pressed={draft.icon === key}
                onClick={() => setDraft({ ...draft, icon: key })}
                className={[
                  'flex size-11 items-center justify-center rounded-xl transition',
                  draft.icon === key
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                ].join(' ')}
              >
                <SkillIcon icon={key} />
              </button>
            ))}
          </div>
        </div>
        <SelectField
          label="סטטוס"
          value={draft.status}
          options={STATUS_OPTIONS}
          onChange={(status) => setDraft({ ...draft, status })}
        />
        <TextField
          label="נפתח ב-100% (השלב הבא)"
          value={draft.nextUnlockTitle}
          onChange={(nextUnlockTitle) => setDraft({ ...draft, nextUnlockTitle })}
          multiline
          maxLength={300}
        />
        <Button type="submit" className="w-full" variant="accent" disabled={!draft.title.trim()}>
          שמור יעד
        </Button>
        {!isNew ? (
          confirmDelete ? (
            <div className="flex gap-2">
              <Button
                type="button"
                className="flex-1"
                variant="destructive"
                onClick={() => onDelete(draft.id)}
              >
                כן, מחק את היעד ואבני הדרך
              </Button>
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                ביטול
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              className="w-full gap-2"
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
              מחק יעד
            </Button>
          )
        ) : null}
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Node (milestone) + its measures
// ---------------------------------------------------------------------------

type MeasureDraft = Omit<SkillMeasure, 'baseline' | 'target' | 'manual'> & {
  baseline: ValueDraft
  target: ValueDraft
  manual: ValueDraft
  manualAt: string | null
}

function measureToDraft(m: SkillMeasure): MeasureDraft {
  return {
    ...m,
    baseline: toDraft(m.baseline),
    target: toDraft(m.target),
    manual: toDraft(m.manual?.value),
    manualAt: m.manual?.at ?? null,
  }
}

function draftToMeasure(d: MeasureDraft, original: SkillMeasure | undefined): SkillMeasure {
  const manualValue = fromDraft(d.manual, d.metricType)
  const manualChanged =
    JSON.stringify(manualValue) !== JSON.stringify(original?.manual?.value ?? null)
  const label = d.label.trim()
  return {
    id: d.id,
    label,
    sourceType: d.sourceType,
    // Auto-match: with no explicit link, the exercise name is the link.
    linkedExercise: d.linkedExercise.trim() || label,
    metricType: d.metricType,
    bodyStat: d.metricType === 'body_stat' ? (d.bodyStat ?? 'weight') : null,
    baseline: fromDraft(d.baseline, d.metricType),
    target: fromDraft(d.target, d.metricType),
    manual:
      manualValue.amount == null
        ? null
        : {
            value: manualValue,
            at: manualChanged || !d.manualAt ? new Date().toISOString() : d.manualAt,
          },
  }
}

type Unit = 'reps' | 'seconds' | 'weight' | 'cm'

function unitOf(metric: SkillMetricType): Unit {
  if (metric === 'duration_seconds') return 'seconds'
  if (metric === 'weight_x_reps') return 'weight'
  if (metric === 'gap_cm') return 'cm'
  return 'reps'
}

const UNIT_OPTIONS: { id: Unit; label: string }[] = [
  { id: 'reps', label: 'חזרות' },
  { id: 'seconds', label: 'שניות' },
  { id: 'weight', label: 'ק"ג × חזרות' },
]

function PillGroup<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: readonly { id: T; label: string }[]
  onChange: (next: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((o) => {
        const on = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={[
              'min-h-8 rounded-full px-3 text-[11px] font-bold transition',
              on ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
            ].join(' ')}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function NumBox({
  label,
  value,
  onChange,
  decimals = 1,
  placeholder,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  decimals?: number
  placeholder?: string
}) {
  return (
    <label className="block min-w-0 text-[10px] font-semibold text-muted">
      {label}
      <NumericInput
        decimals={decimals}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className="field mt-0.5 px-1.5 text-center tabular-nums"
      />
    </label>
  )
}

/** One compact row per exercise: name · unit pills · start | now | goal (+ sets / reps). */
function MeasureEditor({
  draft,
  count,
  onChange,
  onRemove,
}: {
  draft: MeasureDraft
  count: number
  onChange: (next: MeasureDraft) => void
  onRemove: () => void
}) {
  const unit = unitOf(draft.metricType)
  const shared = unit === 'weight' ? 'reps' : unit === 'cm' ? null : 'sets'
  const sharedValue = shared ? draft.target[shared] || draft.baseline[shared] : ''
  function setUnit(next: Unit) {
    const sets = draft.target.sets || draft.baseline.sets
    const metricType: SkillMetricType =
      next === 'seconds'
        ? 'duration_seconds'
        : next === 'weight'
          ? 'weight_x_reps'
          : next === 'cm'
            ? 'gap_cm'
            : sets
              ? 'sets_x_reps'
              : 'max_reps'
    onChange({ ...draft, metricType })
  }
  function setShared(value: string) {
    if (!shared) return
    const metricType: SkillMetricType =
      unit === 'reps' ? (value ? 'sets_x_reps' : 'max_reps') : draft.metricType
    onChange({
      ...draft,
      metricType,
      baseline: { ...draft.baseline, [shared]: value },
      target: { ...draft.target, [shared]: value },
      manual: draft.manual.amount ? { ...draft.manual, [shared]: value } : draft.manual,
    })
  }
  const unitOptions =
    unit === 'cm' ? [...UNIT_OPTIONS, { id: 'cm' as const, label: 'ס"מ מהרצפה' }] : UNIT_OPTIONS
  return (
    <section className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={draft.label}
          maxLength={160}
          aria-label="שם התרגיל"
          placeholder="שם התרגיל"
          onChange={(e) => {
            const label = e.target.value
            const autoLink = !draft.linkedExercise.trim() || draft.linkedExercise.trim() === draft.label.trim()
            onChange({ ...draft, label, ...(autoLink ? { linkedExercise: label } : {}) })
          }}
          className="field min-w-0 flex-1 py-2 text-sm font-semibold"
        />
        <button
          type="button"
          aria-label="מחק תרגיל"
          disabled={count <= 1}
          onClick={onRemove}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <PillGroup label="יחידת מידה" value={unit} options={unitOptions} onChange={setUnit} />
      <div className={`grid items-end gap-1.5 ${shared ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <NumBox
          label="נקודת התחלה"
          value={draft.baseline.amount}
          onChange={(amount) => onChange({ ...draft, baseline: { ...draft.baseline, amount } })}
        />
        <NumBox
          label="איפה אני עכשיו"
          value={draft.manual.amount}
          placeholder="מהיומן"
          onChange={(amount) =>
            onChange({
              ...draft,
              manual: { ...draft.manual, amount, ...(shared && sharedValue ? { [shared]: sharedValue } : {}) },
            })
          }
        />
        <NumBox
          label="יעד לסיום"
          value={draft.target.amount}
          onChange={(amount) => onChange({ ...draft, target: { ...draft.target, amount } })}
        />
        {shared ? (
          <NumBox
            label={shared === 'sets' ? 'מספר סטים' : 'חזרות'}
            decimals={0}
            value={sharedValue}
            onChange={setShared}
          />
        ) : null}
      </div>
    </section>
  )
}

const TIER_PILLS: { id: SkillTierStatus; label: string }[] = [
  { id: 'active', label: 'בפוקוס פעיל כרגע' },
  { id: 'mastered', label: 'נשלט ✓' },
  { id: 'locked', label: 'שלב עתידי 🔒' },
]

type PlacementTarget = SkillSlotTarget | 'none'

const PLACEMENT_OPTIONS: { id: PlacementTarget; label: string }[] = [
  { id: 'none', label: 'לא משובץ (נכנס אוטומטית לתחילת האימון)' },
  { id: 'pull', label: 'אימון משיכה' },
  { id: 'push', label: 'אימון דחיפה ורגליים' },
  { id: 'combo', label: 'אימון משולב' },
  { id: 'morningA', label: 'שגרת בוקר A' },
  { id: 'morningB', label: 'שגרת בוקר B' },
]

const KEEP_CHAIN = '__keep__'
const APPEND = '__append__'

/** Exercise names of the workout a placement targets (for "מחליף את"). */
function useWorkoutExerciseNames(target: PlacementTarget): string[] {
  const { workoutDays, morningRoutine } = useAppData()
  return useMemo(() => {
    if (target === 'none') return []
    if (target === 'morningA' || target === 'morningB') {
      const id = target === 'morningA' ? 'A' : 'B'
      return morningRoutine.routines[id].exercises.map((e) => `${e.nameHe} ${e.nameEn}`.trim())
    }
    const want = target === 'combo' ? 'both' : target
    const names = workoutDays.flatMap((d) =>
      (d.sessions ?? []).filter((s) => skillKindOfName(s.name) === want).flatMap((s) => s.exercises.map((e) => e.name)),
    )
    return [...new Set(names)]
  }, [target, workoutDays, morningRoutine])
}

/** "באיזה אימון זה משובץ?" + "מחליף את" for one recipe of the stage. */
function PlacementEditor({
  slot,
  fallback,
  onChange,
}: {
  slot: SkillSlotRecipe | null
  /** Incoming exercise for a new placement (the stage's first exercise). */
  fallback: SkillSlotExercise
  onChange: (next: SkillSlotRecipe | null) => void
}) {
  const target: PlacementTarget = slot?.target ?? 'none'
  const names = useWorkoutExerciseNames(target)
  const firstAlias = slot?.replaces.split('|')[0]?.trim() ?? ''
  const chosen = !slot
    ? APPEND
    : !slot.replaces.trim()
      ? APPEND
      : names.includes(slot.replaces.trim())
        ? slot.replaces.trim()
        : KEEP_CHAIN
  return (
    <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-white p-2.5">
      <SelectField
        label="באיזה אימון זה משובץ?"
        value={target}
        options={PLACEMENT_OPTIONS}
        onChange={(next) => {
          if (next === 'none') return onChange(null)
          onChange(
            slot
              ? { ...slot, target: next }
              : { target: next, role: 'primary_strength_slot', replaces: '', exercises: [fallback] },
          )
        }}
      />
      {slot ? (
        <>
          <label className="block text-xs text-muted">
            מחליף את התרגיל
            <select
              value={chosen}
              onChange={(e) => {
                const v = e.target.value
                if (v === KEEP_CHAIN) return
                onChange({ ...slot, replaces: v === APPEND ? '' : v })
              }}
              className="field mt-1"
            >
              {chosen === KEEP_CHAIN ? <option value={KEEP_CHAIN}>{firstAlias} (התאמה אוטומטית)</option> : null}
              <option value={APPEND}>— לא מחליף (מתווסף בסוף האימון)</option>
              {names.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[11px] text-slate-600" dir="auto">
            נכנס לאימון: {slot.exercises.map((e) => `${e.name} (${e.sets}×${e.reps})`).join(' + ') || '—'}
          </p>
        </>
      ) : null}
    </div>
  )
}

function incomingFrom(measure: MeasureDraft | undefined): SkillSlotExercise {
  const sets = Math.max(1, Math.round(Number(measure?.target.sets) || 3))
  const amount = measure?.target.amount || ''
  const reps =
    measure?.metricType === 'duration_seconds'
      ? `${amount || 20} שניות`
      : measure?.metricType === 'weight_x_reps'
        ? `${measure.target.reps || 5}`
        : `${amount || 5}`
  return { name: measure?.label.trim() || 'תרגיל השלב', sets, reps, rest: '2 דקות', notes: '' }
}

export function SkillNodeModal({
  open,
  node,
  isNew,
  exerciseNames,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  node: SkillNode | null
  isNew: boolean
  exerciseNames: string[]
  onClose: () => void
  onSave: (node: SkillNode) => void
  onDelete: (id: string) => void
}) {
  const [draft, setDraft] = useState<SkillNode | null>(node)
  const [measures, setMeasures] = useState<MeasureDraft[]>([])
  const [slots, setSlots] = useState<SkillSlotRecipe[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  useEffect(() => {
    if (open && node) {
      setDraft(node)
      setMeasures(node.measures.map(measureToDraft))
      setSlots(node.slots)
      setConfirmDelete(false)
    }
  }, [open, node])
  if (!draft || !node) return null

  const originals = new Map(node.measures.map((m) => [m.id, m]))
  const tierPills =
    draft.tierStatus === 'queued' ? [...TIER_PILLS, { id: 'queued' as const, label: 'בתור ⏳' }] : TIER_PILLS
  const listId = `skill-exercises-${draft.id}`

  return (
    <Modal open={open} title={isNew ? 'שלב חדש' : `עריכת שלב ${draft.order}`} onClose={onClose} wide>
      <form
        className="space-y-3.5"
        dir="rtl"
        onSubmit={(e) => {
          e.preventDefault()
          if (!draft.title.trim()) return
          onSave({
            ...draft,
            title: draft.title.trim(),
            note: draft.note.trim(),
            prerequisites: draft.prerequisites.trim(),
            measures: measures.map((m) => draftToMeasure(m, originals.get(m.id))),
            slots: slots
              .map((sl) => ({
                ...sl,
                replaces: sl.replaces.trim(),
                exercises: sl.exercises
                  .map((x) => ({ ...x, name: x.name.trim(), reps: x.reps.trim(), rest: x.rest.trim() }))
                  .filter((x) => x.name),
              }))
              .filter((sl) => sl.exercises.length),
          })
        }}
      >
        <TextField
          label="שם השלב / התרגיל"
          value={draft.title}
          onChange={(title) => setDraft({ ...draft, title })}
          maxLength={200}
        />
        <div className="space-y-1">
          <p className="text-xs text-muted">סטטוס השלב</p>
          <PillGroup
            label="סטטוס השלב"
            value={draft.tierStatus}
            options={tierPills}
            onChange={(tierStatus) => setDraft({ ...draft, tierStatus })}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-700">מדדי ההתקדמות</p>
          {measures.map((m, i) => (
            <MeasureEditor
              key={m.id}
              draft={m}
              count={measures.length}
              onChange={(next) => setMeasures(measures.map((x, j) => (j === i ? next : x)))}
              onRemove={() => setMeasures(measures.filter((_, j) => j !== i))}
            />
          ))}
          {measures.length < 8 ? (
            <Button
              type="button"
              className="w-full gap-2"
              variant="surface"
              onClick={() =>
                setMeasures([...measures, measureToDraft({ ...emptyMeasure(), sourceType: 'workout_exercise' })])
              }
            >
              <Plus className="size-4" strokeWidth={2} />
              תרגיל נוסף
            </Button>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-700">שיבוץ באימון</p>
          {(slots.length ? slots : [null]).map((sl, i) => (
            <PlacementEditor
              key={i}
              slot={sl}
              fallback={incomingFrom(measures[0])}
              onChange={(next) =>
                setSlots(
                  slots.length
                    ? next
                      ? slots.map((x, j) => (j === i ? next : x))
                      : slots.filter((_, j) => j !== i)
                    : next
                      ? [next]
                      : [],
                )
              }
            />
          ))}
        </div>

        <details className="group rounded-2xl border border-slate-200 bg-white">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-xs font-bold text-slate-600">
            הגדרות מתקדמות
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" strokeWidth={2} />
          </summary>
          <div className="space-y-2.5 border-t border-slate-100 p-3">
            <TextField
              label="תנאי פתיחה"
              value={draft.prerequisites}
              onChange={(prerequisites) => setDraft({ ...draft, prerequisites })}
              multiline
              maxLength={400}
            />
            <TextField
              label="הערה"
              value={draft.note}
              onChange={(note) => setDraft({ ...draft, note })}
              multiline
              maxLength={500}
            />
            {measures.map((m, i) => (
              <div key={m.id} className="space-y-1.5 rounded-xl bg-slate-50 p-2">
                <p className="truncate text-[11px] font-bold text-slate-700" dir="auto">
                  {m.label || `תרגיל ${i + 1}`}
                </p>
                <label className="block text-[11px] text-muted">
                  שמות לזיהוי ביומן (מופרדים ב-|)
                  <input
                    type="text"
                    list={listId}
                    value={m.linkedExercise}
                    maxLength={300}
                    onChange={(e) =>
                      setMeasures(measures.map((x, j) => (j === i ? { ...x, linkedExercise: e.target.value } : x)))
                    }
                    className="field mt-1"
                  />
                </label>
                <SelectField
                  label="מקור נתונים"
                  value={m.sourceType}
                  options={SOURCE_OPTIONS}
                  onChange={(sourceType) =>
                    setMeasures(measures.map((x, j) => (j === i ? { ...x, sourceType } : x)))
                  }
                />
              </div>
            ))}
            <datalist id={listId}>
              {exerciseNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
        </details>

        <Button type="submit" className="w-full" variant="accent" disabled={!draft.title.trim()}>
          שמור שלב
        </Button>
        {!isNew ? (
          confirmDelete ? (
            <div className="flex gap-2">
              <Button
                type="button"
                className="flex-1"
                variant="destructive"
                onClick={() => onDelete(draft.id)}
              >
                כן, מחק
              </Button>
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                ביטול
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              className="w-full gap-2"
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
              מחק שלב
            </Button>
          )
        ) : null}
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Block settings
// ---------------------------------------------------------------------------

export function SkillBlockSettingsModal({
  open,
  state,
  onClose,
  onSave,
}: {
  open: boolean
  state: SkillTreeState
  onClose: () => void
  onSave: (patch: {
    blockLabel: string
    blockStartDate: string
    blockWeeks: number
    deloadWeeks: number[]
    benchmarkWeek: number
  }) => void
}) {
  const [label, setLabel] = useState(state.blockLabel)
  const [start, setStart] = useState(state.blockStartDate)
  const [weeks, setWeeks] = useState(String(state.blockWeeks))
  const [deload, setDeload] = useState(state.deloadWeeks.join(', '))
  const [benchmark, setBenchmark] = useState(String(state.benchmarkWeek))
  useEffect(() => {
    if (!open) return
    setLabel(state.blockLabel)
    setStart(state.blockStartDate)
    setWeeks(String(state.blockWeeks))
    setDeload(state.deloadWeeks.join(', '))
    setBenchmark(String(state.benchmarkWeek))
  }, [open, state])
  const validStart = /^\d{4}-\d{2}-\d{2}$/.test(start)

  return (
    <Modal open={open} title="הגדרות בלוק" onClose={onClose}>
      <form
        className="space-y-3"
        dir="rtl"
        onSubmit={(e) => {
          e.preventDefault()
          if (!validStart) return
          const totalWeeks = Math.min(52, Math.max(1, Math.round(parseDecimal(weeks) ?? 12)))
          onSave({
            blockLabel: label.trim() || state.blockLabel,
            blockStartDate: start,
            blockWeeks: totalWeeks,
            deloadWeeks: deload
              .split(/[,\s]+/)
              .map((x) => Math.round(Number(x)))
              .filter((n) => Number.isFinite(n) && n > 0 && n <= totalWeeks),
            benchmarkWeek: Math.round(parseDecimal(benchmark) ?? totalWeeks),
          })
        }}
      >
        <TextField label="שם הבלוק" value={label} onChange={setLabel} maxLength={60} />
        <label className="block text-xs text-muted">
          תאריך התחלה (שבוע 1) — הביצועים נספרים מתאריך זה
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="field mt-1"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-muted">
            מספר שבועות
            <NumericInput decimals={0} value={weeks} onChange={setWeeks} />
          </label>
          <label className="block text-xs text-muted">
            שבוע מבחנים
            <NumericInput decimals={0} value={benchmark} onChange={setBenchmark} />
          </label>
        </div>
        <TextField label="שבועות דילואד (מופרדים בפסיק)" value={deload} onChange={setDeload} maxLength={60} />
        <Button type="submit" className="w-full" variant="accent" disabled={!validStart}>
          שמור הגדרות
        </Button>
      </form>
    </Modal>
  )
}
