import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { parseDecimal } from '../../lib/numericInput'
import {
  emptyMeasure,
  SKILL_BODY_STAT_LABELS,
  SKILL_ICON_KEYS,
  SKILL_METRIC_LABELS,
  SKILL_SOURCE_LABELS,
  suggestNextTarget,
  type MeasureEvaluation,
  type NodeEvaluation,
  type SkillAdvanceInput,
  type SkillBodyStat,
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
  { id: 'active_focus', label: 'בפוקוס בבלוק הנוכחי' },
  { id: 'queued_next_block', label: 'בתור לבלוקים הבאים' },
  { id: 'completed', label: 'הושלם' },
]

const SOURCE_OPTIONS = (Object.keys(SKILL_SOURCE_LABELS) as SkillSourceType[]).map((id) => ({
  id,
  label: SKILL_SOURCE_LABELS[id],
}))
const METRIC_OPTIONS = (Object.keys(SKILL_METRIC_LABELS) as SkillMetricType[]).map((id) => ({
  id,
  label: SKILL_METRIC_LABELS[id],
}))
const BODY_OPTIONS = (Object.keys(SKILL_BODY_STAT_LABELS) as SkillBodyStat[]).map((id) => ({
  id,
  label: SKILL_BODY_STAT_LABELS[id],
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
  return {
    id: d.id,
    label: d.label.trim(),
    sourceType: d.sourceType,
    linkedExercise: d.linkedExercise.trim(),
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

function MeasureEditor({
  draft,
  index,
  count,
  exerciseNames,
  onChange,
  onRemove,
  onMove,
}: {
  draft: MeasureDraft
  index: number
  count: number
  exerciseNames: string[]
  onChange: (next: MeasureDraft) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const listId = `skill-exercises-${draft.id}`
  return (
    <section className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-700">מדד {index + 1}</p>
        <div className="flex items-center">
          <button
            type="button"
            aria-label="הזז למעלה"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-white disabled:opacity-30"
          >
            <ArrowUp className="size-4" />
          </button>
          <button
            type="button"
            aria-label="הזז למטה"
            disabled={index === count - 1}
            onClick={() => onMove(1)}
            className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-white disabled:opacity-30"
          >
            <ArrowDown className="size-4" />
          </button>
          <button
            type="button"
            aria-label="מחק מדד"
            disabled={count <= 1}
            onClick={onRemove}
            className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      <TextField
        label="שם המדד"
        value={draft.label}
        onChange={(label) => onChange({ ...draft, label })}
      />
      <div className="grid grid-cols-2 gap-2">
        <SelectField
          label="מקור נתונים"
          value={draft.sourceType}
          options={SOURCE_OPTIONS}
          onChange={(sourceType) =>
            onChange({
              ...draft,
              sourceType,
              ...(sourceType === 'body_metric'
                ? { metricType: 'body_stat' as const, bodyStat: draft.bodyStat ?? 'weight' }
                : draft.metricType === 'body_stat'
                  ? { metricType: 'sets_x_reps' as const, bodyStat: null }
                  : {}),
            })
          }
        />
        {draft.sourceType === 'body_metric' ? (
          <SelectField
            label="מדד"
            value={draft.bodyStat ?? 'weight'}
            options={BODY_OPTIONS}
            onChange={(bodyStat) => onChange({ ...draft, bodyStat })}
          />
        ) : (
          <SelectField
            label="סוג מדידה"
            value={draft.metricType}
            options={METRIC_OPTIONS.filter((o) => o.id !== 'body_stat')}
            onChange={(metricType) => onChange({ ...draft, metricType })}
          />
        )}
      </div>
      {draft.sourceType !== 'body_metric' ? (
        <label className="block text-xs text-muted">
          תרגיל מקושר (אפשר כמה שמות מופרדים ב-|)
          <input
            type="text"
            list={listId}
            value={draft.linkedExercise}
            maxLength={300}
            onChange={(e) => onChange({ ...draft, linkedExercise: e.target.value })}
            className="field mt-1"
          />
          <datalist id={listId}>
            {exerciseNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>
      ) : null}
      <ValueFields
        title="בסיס (תחילת הבלוק)"
        metric={draft.metricType}
        draft={draft.baseline}
        onChange={(baseline) => onChange({ ...draft, baseline })}
      />
      <ValueFields
        title="יעד (100%)"
        metric={draft.metricType}
        draft={draft.target}
        onChange={(target) => onChange({ ...draft, target })}
      />
      <ValueFields
        title="ערך נוכחי ידני (ריק = אוטומטי מהיומן)"
        metric={draft.metricType}
        draft={draft.manual}
        onChange={(manual) => onChange({ ...draft, manual })}
      />
    </section>
  )
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
  const [confirmDelete, setConfirmDelete] = useState(false)
  useEffect(() => {
    if (open && node) {
      setDraft(node)
      setMeasures(node.measures.map(measureToDraft))
      setConfirmDelete(false)
    }
  }, [open, node])
  if (!draft || !node) return null

  const originals = new Map(node.measures.map((m) => [m.id, m]))

  function moveMeasure(index: number, dir: -1 | 1) {
    const next = [...measures]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setMeasures(next)
  }

  return (
    <Modal open={open} title={isNew ? 'אבן דרך חדשה' : 'עריכת אבן דרך'} onClose={onClose} wide>
      <form
        className="space-y-3"
        dir="rtl"
        onSubmit={(e) => {
          e.preventDefault()
          if (!draft.title.trim()) return
          onSave({
            ...draft,
            title: draft.title.trim(),
            note: draft.note.trim(),
            nextProgressionStep: draft.nextProgressionStep.trim(),
            measures: measures.map((m) => draftToMeasure(m, originals.get(m.id))),
          })
        }}
      >
        <TextField
          label="שם אבן הדרך"
          value={draft.title}
          onChange={(title) => setDraft({ ...draft, title })}
        />
        <TextField
          label="הערה"
          value={draft.note}
          onChange={(note) => setDraft({ ...draft, note })}
          multiline
          maxLength={500}
        />
        <TextField
          label="השלב הבא כשמגיעים ל-100%"
          value={draft.nextProgressionStep}
          onChange={(nextProgressionStep) => setDraft({ ...draft, nextProgressionStep })}
          placeholder="למשל: מעבר ל-Advanced Tuck FL Rows"
          maxLength={300}
        />
        <div
          role="radiogroup"
          aria-label="שיוך לבלוק"
          className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
        >
          {[
            { id: true, label: 'פעיל בבלוק הנוכחי' },
            { id: false, label: 'בתור לבלוק עתידי' },
          ].map((o) => (
            <button
              key={String(o.id)}
              type="button"
              role="radio"
              aria-checked={draft.isActiveInCurrentBlock === o.id}
              onClick={() => setDraft({ ...draft, isActiveInCurrentBlock: o.id })}
              className={[
                'min-h-10 rounded-lg text-xs font-bold transition',
                draft.isActiveInCurrentBlock === o.id
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-muted hover:text-text',
              ].join(' ')}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {measures.map((m, i) => (
            <MeasureEditor
              key={m.id}
              draft={m}
              index={i}
              count={measures.length}
              exerciseNames={exerciseNames}
              onChange={(next) => setMeasures(measures.map((x, j) => (j === i ? next : x)))}
              onRemove={() => setMeasures(measures.filter((_, j) => j !== i))}
              onMove={(dir) => moveMeasure(i, dir)}
            />
          ))}
          {measures.length < 8 ? (
            <Button
              type="button"
              className="w-full gap-2"
              variant="surface"
              onClick={() => setMeasures([...measures, measureToDraft(emptyMeasure())])}
            >
              <Plus className="size-4" strokeWidth={2} />
              מדד נוסף
            </Button>
          ) : null}
        </div>

        <Button type="submit" className="w-full" variant="accent" disabled={!draft.title.trim()}>
          שמור אבן דרך
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
              מחק אבן דרך
            </Button>
          )
        ) : null}
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Advance to the next progression step
// ---------------------------------------------------------------------------

export type SkillAdvanceSubmit = SkillAdvanceInput & {
  /** Rename the linked program exercise(s) to this name (empty = keep). */
  renameExercise: { measureId: string; from: string; to: string; reps: string } | null
}

export function SkillAdvanceModal({
  open,
  evaluation,
  onClose,
  onSubmit,
}: {
  open: boolean
  evaluation: NodeEvaluation | null
  onClose: () => void
  onSubmit: (input: SkillAdvanceSubmit) => void
}) {
  const node = evaluation?.node ?? null
  const [title, setTitle] = useState('')
  const [nextStep, setNextStep] = useState('')
  const [drafts, setDrafts] = useState<Record<string, { baseline: ValueDraft; target: ValueDraft }>>({})
  const [renameTo, setRenameTo] = useState('')
  const [renameReps, setRenameReps] = useState('')

  const workoutMeasure: MeasureEvaluation | undefined = evaluation?.measures.find(
    (m) => m.measure.sourceType === 'workout_exercise' && m.measure.linkedExercise.trim(),
  )

  useEffect(() => {
    if (!open || !evaluation) return
    setTitle(evaluation.node.nextProgressionStep.replace(/^מעבר ל-?/, '') || evaluation.node.title)
    setNextStep('')
    setDrafts(
      Object.fromEntries(
        evaluation.measures.map((m) => [
          m.measure.id,
          {
            baseline: toDraft(m.current ?? m.measure.baseline),
            target: toDraft(suggestNextTarget(m.measure)),
          },
        ]),
      ),
    )
    setRenameTo('')
    setRenameReps('')
  }, [open, evaluation])

  if (!node || !evaluation) return null

  return (
    <Modal open={open} title="קדם תרגיל לשלב הבא" onClose={onClose} wide>
      <form
        className="space-y-3"
        dir="rtl"
        onSubmit={(e) => {
          e.preventDefault()
          const rename =
            workoutMeasure && renameTo.trim()
              ? {
                  measureId: workoutMeasure.measure.id,
                  from: workoutMeasure.measure.linkedExercise,
                  to: renameTo.trim(),
                  reps: renameReps.trim(),
                }
              : null
          onSubmit({
            title,
            nextProgressionStep: nextStep,
            measures: evaluation.measures.map((m) => {
              const d = drafts[m.measure.id]
              const link =
                rename && rename.measureId === m.measure.id
                  ? `${rename.to}|${m.measure.linkedExercise}`.slice(0, 300)
                  : m.measure.linkedExercise
              return {
                id: m.measure.id,
                baseline: d ? fromDraft(d.baseline, m.measure.metricType) : m.measure.baseline,
                target: d ? fromDraft(d.target, m.measure.metricType) : m.measure.target,
                linkedExercise: link,
              }
            }),
            renameExercise: rename,
          })
        }}
      >
        <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          הושלם: <span className="font-semibold">{node.title}</span>. השלב הנוכחי נשמר בהיסטוריה, הבסיס החדש הוא
          הביצוע הנוכחי שלך.
        </p>
        <TextField label="שם השלב החדש" value={title} onChange={setTitle} />
        <TextField
          label="השלב שאחריו (אופציונלי)"
          value={nextStep}
          onChange={setNextStep}
          maxLength={300}
        />
        {evaluation.measures.map((m) => {
          const d = drafts[m.measure.id]
          if (!d) return null
          return (
            <section key={m.measure.id} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-700">{m.measure.label || 'מדד'}</p>
              <ValueFields
                title="בסיס חדש"
                metric={m.measure.metricType}
                draft={d.baseline}
                onChange={(baseline) => setDrafts({ ...drafts, [m.measure.id]: { ...d, baseline } })}
              />
              <ValueFields
                title="יעד חדש"
                metric={m.measure.metricType}
                draft={d.target}
                onChange={(target) => setDrafts({ ...drafts, [m.measure.id]: { ...d, target } })}
              />
            </section>
          )
        })}
        {workoutMeasure ? (
          <section className="space-y-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
            <p className="text-xs font-bold text-blue-800">עדכון התרגיל בתוכנית האימונים (אופציונלי)</p>
            <TextField
              label="שם תרגיל חדש בכל ימי התוכנית"
              value={renameTo}
              onChange={setRenameTo}
              placeholder="למשל: חתירת פרונט לבר Advanced Tuck"
            />
            <TextField
              label="חזרות מתוכננות (טקסט, אופציונלי)"
              value={renameReps}
              onChange={setRenameReps}
              placeholder="למשל: 5-6"
              maxLength={60}
            />
          </section>
        ) : null}
        <Button type="submit" className="w-full" variant="accent">
          קדם לשלב הבא
        </Button>
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
