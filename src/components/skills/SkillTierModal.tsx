import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, ArrowLeftRight, Lock, Pencil, Plus } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { planSlotSwap, type SlotPreview } from '../../lib/skillSlotSwap'
import {
  formatSkillValue,
  percent,
  SKILL_FOCUS_LIMIT,
  SKILL_SLOT_ROLE_LABELS,
  SKILL_TIER_LABELS,
  type BranchEvaluation,
  type NodeEvaluation,
} from '../../lib/skillTree'
import { ExerciseStickmanSvg } from '../ExerciseStickmanSvg'
import { Button } from '../ui/button'
import { Modal } from '../ui/Modal'
import { tierFigure } from './SkillBranchCard'

export type TierModalMode = 'details' | 'confirm'

function SlotPreviewCard({ preview }: { preview: SlotPreview }) {
  const { slot } = preview
  return (
    <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 ring-1 ring-blue-100">
          {SKILL_SLOT_ROLE_LABELS[slot.role]}
        </span>
      </div>
      <dl className="space-y-2 text-xs">
        <div>
          <dt className="font-bold text-slate-500">באיזה אימון:</dt>
          <dd className="mt-0.5 font-semibold text-slate-900">
            {preview.placeSummary}
          </dd>
        </div>
        <div className="rounded-xl bg-rose-50 p-2 ring-1 ring-rose-100">
          <dt className="font-bold text-rose-700">יוצא מהאימון (מוחלף):</dt>
          <dd className="mt-0.5 text-slate-800">
            {preview.outgoing.length
              ? preview.outgoing.join(' · ')
              : slot.replaces.trim() && !preview.alreadyApplied
                ? `— (לא נמצא "${slot.replaces.split('|')[0]}" — יתווסף בסוף האימון)`
                : '— לא מוחלף דבר, מתווסף בסוף האימון'}
          </dd>
        </div>
        <div className="rounded-xl bg-emerald-50 p-2 ring-1 ring-emerald-100">
          <dt className="font-bold text-emerald-700">נכנס לאימון במקומו:</dt>
          <dd className="mt-1 space-y-1.5">
            {preview.incoming.map((e) => (
              <div key={e.name} className="flex items-center gap-2">
                <ExerciseStickmanSvg name={e.name} size="sm" />
                <div className="min-w-0">
                  <p className="font-semibold leading-snug text-slate-900">{e.name}</p>
                  <p className="text-[11px] text-slate-600" dir="auto">
                    {e.sets} סטים × {e.reps}
                    {e.rest && e.rest !== '—' ? ` · מנוחה ${e.rest}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </dd>
        </div>
      </dl>
      {preview.missingTarget ? (
        <p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-700">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
          האימון הזה לא נמצא בתוכנית הפעילה — השינוי לא ייכתב לתוכנית.
        </p>
      ) : preview.alreadyApplied ? (
        <p className="text-[11px] font-semibold text-emerald-700">✓ כבר משובץ בתוכנית — אין מה להחליף.</p>
      ) : null}
    </section>
  )
}

export function SkillTierModal({
  open,
  mode,
  evaluation,
  branch,
  focusCount,
  focusRival,
  onClose,
  onModeChange,
  onEdit,
  onMove,
  onConfirm,
  onActivateOnly,
}: {
  open: boolean
  mode: TierModalMode
  evaluation: NodeEvaluation | null
  branch: BranchEvaluation | null
  focusCount: number
  /** Focused track of the same category that moves to the queue on activation. */
  focusRival: string | null
  onClose: () => void
  onModeChange: (mode: TierModalMode) => void
  onEdit: () => void
  onMove: (dir: -1 | 1) => void
  /** Activate (if needed) and write the slot recipes into the plan. */
  onConfirm: () => void
  /** Activate without touching the plan. */
  onActivateOnly: () => void
}) {
  const { workoutDays, morningRoutine } = useAppData()
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (open) setBusy(false)
  }, [open, evaluation?.node.id, mode])

  const previews = useMemo(
    () => (evaluation ? planSlotSwap(evaluation.node.slots, workoutDays, morningRoutine) : []),
    [evaluation, workoutDays, morningRoutine],
  )
  if (!evaluation || !branch) return null
  const { node, status } = evaluation
  const isActive = status === 'active'
  const otherActive = branch.activeNode && branch.activeNode.node.id !== node.id ? branch.activeNode : null
  const branchInFocus = branch.focus === 'active'
  const overLimit = !branchInFocus && !focusRival && focusCount >= SKILL_FOCUS_LIMIT
  const writable = previews.some((p) => !p.missingTarget && !p.alreadyApplied)
  const lowerOpen = branch.nodes.filter(
    (n) => n.node.order < node.order && n.status !== 'mastered' && n.node.id !== otherActive?.node.id,
  )

  const title =
    mode === 'confirm'
      ? isActive
        ? 'שיבוץ בתוכנית האימונים'
        : 'הפעלת שלב ושיבוץ באימון'
      : `שלב ${node.order} · ${SKILL_TIER_LABELS[status]}`

  return (
    <Modal open={open} title={title} onClose={onClose} wide>
      <div className="space-y-3" dir="rtl">
        <div className="flex items-start gap-3">
          <ExerciseStickmanSvg name={node.title} kind={tierFigure(node)} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-muted" dir="auto">
              {branch.branch.title}
            </p>
            <h3 className="text-sm font-bold leading-snug text-slate-900">{node.title}</h3>
            {node.note ? <p className="mt-1 text-[11px] text-muted">{node.note}</p> : null}
          </div>
        </div>

        {mode === 'details' ? (
          <>
            {node.prerequisites ? (
              <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-2.5 text-xs ring-1 ring-slate-200">
                <Lock className="mt-0.5 size-3.5 shrink-0 text-slate-500" strokeWidth={2} />
                <p>
                  <span className="font-bold text-slate-700">תנאי פתיחה: </span>
                  {node.prerequisites}
                </p>
              </div>
            ) : null}
            {evaluation.measures.length ? (
              <section className="space-y-1.5">
                <p className="text-xs font-bold text-slate-700">מדדי שליטה (כולם ב-100% = נשלט)</p>
                <ul className="space-y-1">
                  {evaluation.measures.map((m) => (
                    <li
                      key={m.measure.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-xs ring-1 ring-slate-200"
                    >
                      <span className="min-w-0 truncate text-slate-700">{m.measure.label}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-slate-900" dir="auto">
                        {formatSkillValue(m.measure, m.current)} → {formatSkillValue(m.measure, m.measure.target)}{' '}
                        <span className={m.complete ? 'text-emerald-600' : 'text-blue-700'}>
                          ({percent(m.progress)}%)
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {previews.length ? (
              <section className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <ArrowLeftRight className="size-3.5" strokeWidth={2.25} />
                  מתכון שיבוץ אוטומטי (1-In, 1-Out)
                </p>
                {previews.map((p, i) => (
                  <SlotPreviewCard key={i} preview={p} />
                ))}
              </section>
            ) : (
              <p className="text-xs text-muted">אין מתכון שיבוץ לשלב הזה — אפשר להוסיף בעריכה.</p>
            )}
            {node.progressions.length ? (
              <p className="text-[11px] text-muted">
                היסטוריה: {node.progressions.map((p) => `${p.fromTitle} (${p.at.slice(0, 10)})`).join(' ← ')}
              </p>
            ) : null}

            <div className="space-y-2 pt-1">
              {status === 'locked' || status === 'queued' ? (
                <Button variant="accent" className="w-full gap-2" onClick={() => onModeChange('confirm')}>
                  <Plus className="size-4" strokeWidth={2.25} />
                  הפעל שלב זה עכשיו והחלף באימון
                </Button>
              ) : isActive && writable && !node.slotsAppliedAt ? (
                <Button variant="accent" className="w-full gap-2" onClick={() => onModeChange('confirm')}>
                  <ArrowLeftRight className="size-4" strokeWidth={2.25} />
                  שבץ בתוכנית האימונים (החלפה חכמה)
                </Button>
              ) : null}
              <div className="grid grid-cols-3 gap-2">
                <Button variant="surface" className="gap-1.5" onClick={onEdit}>
                  <Pencil className="size-3.5" strokeWidth={2} />
                  עריכה
                </Button>
                <Button variant="surface" aria-label="הזז שלב למעלה" onClick={() => onMove(-1)}>
                  <ArrowUp className="size-4" />
                </Button>
                <Button variant="surface" aria-label="הזז שלב למטה" onClick={() => onMove(1)}>
                  <ArrowDown className="size-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            {!branchInFocus && focusRival ? (
              <p className="rounded-xl bg-blue-50 p-2.5 text-xs text-blue-900 ring-1 ring-blue-100">
                <span className="font-bold">החלפת פוקוס: </span>
                {focusRival} יעבור לבתור (1 מסלול משיכה + 1 מסלול דחיפה בפוקוס).
              </p>
            ) : null}
            {overLimit ? (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-900 ring-1 ring-amber-200">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
                <p>
                  <span className="font-bold">
                    פוקוס פעיל: {focusCount + 1}/{SKILL_FOCUS_LIMIT} מסלולים.{' '}
                  </span>
                  מומלץ 2 מסלולים בלבד (1 משיכה + 1 דחיפה) כדי למנוע עומס יתר. מומלץ להעביר מסלול אחר לבתור.
                </p>
              </div>
            ) : null}
            {!isActive && otherActive ? (
              <p className="rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-800 ring-1 ring-emerald-200">
                השלב הפעיל הנוכחי ({otherActive.node.title}) יסומן כנשלט ✓
                {lowerOpen.length ? ` · וגם ${lowerOpen.length} שלבים קודמים` : ''}.
              </p>
            ) : !isActive && lowerOpen.length ? (
              <p className="rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-800 ring-1 ring-emerald-200">
                {lowerOpen.length} שלבים קודמים יסומנו כנשלטו ✓.
              </p>
            ) : null}
            {previews.length ? (
              previews.map((p, i) => <SlotPreviewCard key={i} preview={p} />)
            ) : (
              <p className="text-xs text-muted">לשלב הזה אין מתכון שיבוץ — התוכנית לא תשתנה.</p>
            )}
            <div className="space-y-2 pt-1">
              <Button
                variant="accent"
                className="w-full"
                disabled={busy}
                aria-busy={busy}
                onClick={() => {
                  setBusy(true)
                  onConfirm()
                }}
              >
                {writable ? 'אשר ועדכן תוכנית אימונים' : isActive ? 'סמן כמשובץ' : 'הפעל שלב'}
              </Button>
              {!isActive && writable ? (
                <Button
                  variant="ghost"
                  className="w-full"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true)
                    onActivateOnly()
                  }}
                >
                  הפעל בלי לשנות את התוכנית
                </Button>
              ) : null}
              <Button variant="ghost" className="w-full" onClick={() => onModeChange('details')}>
                חזרה לפרטי השלב
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
