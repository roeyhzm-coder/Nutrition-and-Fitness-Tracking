import { useMemo } from 'react'
import {
  ArrowLeftRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  Lock,
  Minus,
  Pencil,
  Plus,
  Repeat2,
  Sparkles,
  Sunrise,
  Target,
  Zap,
} from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { incomingLabel, outgoingLabel, planSlotSwap, type SlotPreview } from '../../lib/skillSlotSwap'
import {
  bumpValue,
  formatSkillValue,
  percent,
  SKILL_TIER_LABELS,
  trackCategory,
  type BranchEvaluation,
  type MeasureEvaluation,
  type NodeEvaluation,
  type SkillNode,
  type SkillTierStatus,
  type SkillValue,
} from '../../lib/skillTree'
import { ExerciseStickmanSvg, exerciseFigureKind } from '../ExerciseStickmanSvg'
import { SkillIcon } from './SkillIcon'

function shortDate(key: string | null) {
  if (!key) return ''
  const [, m, d] = key.split('-')
  return `${Number(d)}.${Number(m)}`
}

/** Figure for a tier: the exercise it puts in the plan, then its measures, then the title. */
export function tierFigure(node: SkillNode) {
  const candidates = [
    ...node.slots.flatMap((s) => s.exercises.map((e) => e.name)),
    ...node.measures.map((m) => m.linkedExercise),
    node.title,
  ]
  for (const name of candidates) {
    const kind = exerciseFigureKind(name)
    if (kind !== 'generic') return kind
  }
  return 'generic' as const
}

export function sourceHint(m: MeasureEvaluation): string {
  switch (m.currentSource) {
    case 'log':
      return `מהיומן · ${shortDate(m.currentDate)}`
    case 'manual':
      return `עדכון ידני · ${shortDate(m.currentDate)}`
    case 'body':
      return `מדידה אחרונה · ${shortDate(m.currentDate)}`
    case 'baseline':
      return m.measure.sourceType === 'workout_exercise'
        ? m.evidenceCount
          ? `${m.evidenceCount} אימונים בבלוק · עוד לא מעל הבסיס`
          : 'בסיס · ממתין לאימון ראשון'
        : 'בסיס'
    default:
      return m.measure.sourceType === 'morning_routine' && m.evidenceCount
        ? `${m.evidenceCount} שגרות בבלוק · הזן זמן`
        : 'אין נתון — הזן ערך'
  }
}

export function FeedChip({ label }: { label: string }) {
  const morning = label.startsWith('שגרת בוקר')
  const Icon = morning ? Sunrise : CalendarDays
  return (
    <span
      className={[
        'inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
        morning
          ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
          : 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
      ].join(' ')}
    >
      <Icon className="size-3 shrink-0" strokeWidth={2} />
      <span className="truncate">{label}</span>
    </span>
  )
}

export function ProgressBar({ progress, complete, thin = false }: { progress: number; complete: boolean; thin?: boolean }) {
  const pct = percent(progress)
  return (
    <div
      className={`${thin ? 'h-1.5' : 'h-2.5'} overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/70`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={[
          'h-full rounded-full transition-all duration-500',
          complete
            ? 'bg-gradient-to-l from-emerald-400 to-teal-500'
            : 'bg-gradient-to-l from-cyan-400 to-blue-600',
        ].join(' ')}
        style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
      />
    </div>
  )
}

function MeasureRow({
  m,
  onQuick,
  onEdit,
}: {
  m: MeasureEvaluation
  onQuick: (value: SkillValue) => void
  onEdit: () => void
}) {
  const pct = percent(m.progress)
  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 truncate text-[11px] font-semibold text-slate-600">
          {m.measure.label || 'מדד'}
        </p>
        <span
          className={`shrink-0 text-[11px] font-extrabold tabular-nums ${m.complete ? 'text-emerald-600' : 'text-blue-700'}`}
        >
          {pct}%
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="הורד ערך"
          onClick={() => onQuick(bumpValue(m.measure, m.current, -1))}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
        >
          <Minus className="size-3.5" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={onEdit}
          aria-label="עדכון ערך נוכחי"
          className="flex min-h-9 min-w-0 flex-1 flex-wrap items-center justify-center gap-x-1.5 rounded-xl bg-white px-2 py-1 text-sm ring-1 ring-slate-200 transition hover:ring-blue-300"
        >
          <span className="font-bold tabular-nums text-slate-900" dir="auto">
            {formatSkillValue(m.measure, m.current)}
          </span>
          <span className="text-muted" aria-hidden>
            ←
          </span>
          <span className="font-semibold tabular-nums text-muted" dir="auto">
            {formatSkillValue(m.measure, m.measure.target)}
          </span>
        </button>
        <button
          type="button"
          aria-label="העלה ערך"
          onClick={() => onQuick(bumpValue(m.measure, m.current, 1))}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-700 active:scale-95"
        >
          <Plus className="size-3.5" strokeWidth={2.5} />
        </button>
      </div>
      <ProgressBar progress={m.progress} complete={m.complete} thin />
      <p className="text-[10px] text-muted">
        בסיס {formatSkillValue(m.measure, m.baseline)} · {sourceHint(m)}
      </p>
    </li>
  )
}

const TIER_STYLE: Record<SkillTierStatus, { dot: string; card: string; pill: string }> = {
  mastered: {
    dot: 'bg-gradient-to-b from-emerald-400 to-teal-500 text-white shadow-sm shadow-emerald-500/30',
    card: 'border-emerald-200 bg-emerald-50/60',
    pill: 'bg-emerald-500 text-white',
  },
  active: {
    dot: 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 ring-blue-100',
    card: 'border-blue-200 bg-white shadow-sm shadow-blue-100',
    pill: 'bg-blue-600 text-white',
  },
  queued: {
    dot: 'border-2 border-amber-300 bg-amber-50 text-amber-700',
    card: 'border-dashed border-amber-200 bg-amber-50/40',
    pill: 'bg-amber-100 text-amber-800',
  },
  locked: {
    dot: 'border-2 border-dashed border-slate-300 bg-white text-slate-400',
    card: 'border-dashed border-slate-200 bg-slate-50/80',
    pill: 'bg-slate-200/80 text-slate-600',
  },
}

/** "מתכון שיבוץ אוטומטי (1-In, 1-Out)" — where the tier lands and what it swaps out. */
function SwapRecipe({ previews }: { previews: SlotPreview[] }) {
  if (!previews.length) return null
  return (
    <div className="space-y-1.5 rounded-xl bg-white p-2.5 ring-1 ring-slate-200">
      <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700">
        <ArrowLeftRight className="size-3.5 text-blue-600" strokeWidth={2.25} />
        מתכון שיבוץ אוטומטי (1-In, 1-Out)
      </p>
      {previews.map((p, i) => {
        const out = outgoingLabel(p)
        return (
          <dl key={i} className="space-y-0.5 text-[11px] leading-snug">
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-bold text-slate-500">באיזה אימון ישתבץ:</dt>
              <dd className="font-semibold text-slate-800">{p.placeSummary}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-bold text-rose-700">יחליף את התרגיל:</dt>
              <dd className="text-slate-800">{out || '— (מתווסף כסיומת בסוף האימון)'}</dd>
              <dt className="font-bold text-emerald-700">⬅ ויכניס במקומו:</dt>
              <dd className="font-semibold text-slate-900">{incomingLabel(p)}</dd>
            </div>
          </dl>
        )
      })}
    </div>
  )
}

function TierItem({
  evaluation,
  next,
  onOpen,
  onEdit,
  onQuick,
  onSwap,
  onActivate,
  onPromote,
}: {
  evaluation: NodeEvaluation
  /** The tier that follows (for the mastery callout). */
  next: NodeEvaluation | null
  onOpen: () => void
  onEdit: () => void
  onQuick: (measureId: string, value: SkillValue) => void
  /** Active tier not in the plan yet: open the swap confirmation. */
  onSwap: () => void
  /** Future tier: manual override (confirmation modal). */
  onActivate: () => void
  /** Mastery reached: swap in the next tier right away. */
  onPromote: () => void
}) {
  const { workoutDays, morningRoutine } = useAppData()
  const { node, status } = evaluation
  const style = TIER_STYLE[status]
  const pct = percent(evaluation.progress)
  const previews = useMemo(
    () => planSlotSwap(node.slots, workoutDays, morningRoutine),
    [node.slots, workoutDays, morningRoutine],
  )
  const nextPreviews = useMemo(
    () => (next && evaluation.gateReady ? planSlotSwap(next.node.slots, workoutDays, morningRoutine) : []),
    [next, evaluation.gateReady, workoutDays, morningRoutine],
  )
  const dot = (
    <span
      aria-hidden
      className={`absolute start-0 top-3 flex size-7 items-center justify-center rounded-full text-[11px] font-extrabold ring-4 ring-white ${style.dot}`}
    >
      {status === 'mastered' ? (
        <Check className="size-4" strokeWidth={3} />
      ) : status === 'locked' ? (
        <Lock className="size-3.5" strokeWidth={2.25} />
      ) : (
        node.order
      )}
    </span>
  )
  const header = (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-extrabold text-slate-500">שלב {node.order}</span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.pill}`}>
        {SKILL_TIER_LABELS[status]}
      </span>
      {status !== 'locked' && evaluation.measures.length ? (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-slate-700">
          {pct}%
        </span>
      ) : null}
    </span>
  )

  // Mastered: compact, clickable.
  if (status === 'mastered') {
    return (
      <li className="relative ps-9">
        {dot}
        <button
          type="button"
          onClick={onOpen}
          className={`flex w-full items-center gap-2.5 rounded-2xl border p-2.5 text-right transition hover:ring-2 hover:ring-emerald-200 ${style.card}`}
        >
          <ExerciseStickmanSvg name={node.title} kind={tierFigure(node)} size="sm" />
          <span className="min-w-0 flex-1 space-y-1">
            {header}
            <span className="block text-[13px] font-bold leading-snug text-slate-900">{node.title}</span>
          </span>
          <ChevronLeft className="size-4 shrink-0 text-slate-400" strokeWidth={2} />
        </button>
      </li>
    )
  }

  // Queued / locked: blueprint with the automatic swap recipe + manual override.
  if (status !== 'active') {
    return (
      <li className="relative ps-9">
        {dot}
        <article className={`space-y-2 rounded-2xl border p-2.5 ${style.card}`}>
          <button type="button" onClick={onOpen} className="flex w-full items-center gap-2.5 text-right">
            <ExerciseStickmanSvg
              name={node.title}
              kind={tierFigure(node)}
              size="sm"
              className={status === 'locked' ? 'opacity-60' : ''}
            />
            <span className="min-w-0 flex-1 space-y-1">
              {header}
              <span
                className={`block text-[13px] font-bold leading-snug ${status === 'locked' ? 'text-slate-600' : 'text-slate-900'}`}
              >
                {node.title}
              </span>
            </span>
            <ChevronLeft className="size-4 shrink-0 text-slate-400" strokeWidth={2} />
          </button>
          <SwapRecipe previews={previews} />
          <button
            type="button"
            onClick={onActivate}
            className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white text-[11px] font-bold text-blue-700 transition hover:bg-blue-50"
          >
            <Zap className="size-3.5" strokeWidth={2.25} />
            הפעל שלב זה עכשיו והחלף באימון
          </button>
        </article>
      </li>
    )
  }

  const connected = previews.length > 0 && previews.every((p) => p.alreadyApplied)
  const connectedPlaces = [...new Set(previews.map((p) => p.placeSummary))]

  return (
    <li className="relative ps-9">
      {dot}
      <article className={`space-y-2.5 rounded-2xl border p-3 ${style.card}`}>
        <div className="flex items-start gap-2">
          <ExerciseStickmanSvg name={node.title} kind={tierFigure(node)} size="sm" className="mt-0.5" />
          <div className="min-w-0 flex-1 space-y-1">
            {header}
            <button type="button" onClick={onOpen} className="block text-right">
              <h4 className="text-sm font-bold leading-snug text-slate-900">{node.title}</h4>
            </button>
            {node.note ? <p className="text-[11px] leading-snug text-muted">{node.note}</p> : null}
          </div>
          <button
            type="button"
            aria-label="עריכת שלב"
            onClick={onEdit}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-blue-50 hover:text-blue-600"
          >
            <Pencil className="size-3.5" strokeWidth={1.75} />
          </button>
        </div>

        {connected ? (
          <div className="rounded-xl bg-gradient-to-l from-emerald-50 to-blue-50 p-2.5 ring-1 ring-emerald-200">
            <p className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800">
              <Repeat2 className="size-4 shrink-0" strokeWidth={2.25} />
              🔄 מחובר אוטומטית לאימון שלך כרגע
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {connectedPlaces.map((f) => (
                <FeedChip key={f} label={f} />
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-slate-600">
              אינך צריך להוסיף כלום — בצע את האימון הרגיל שלך והמדדים כאן יתעדכנו אוטומטית.
            </p>
          </div>
        ) : previews.length ? (
          <div className="space-y-2">
            <SwapRecipe previews={previews} />
            <button
              type="button"
              onClick={onSwap}
              className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-700"
            >
              <ArrowLeftRight className="size-3.5" strokeWidth={2.25} />
              שבץ באימון עכשיו (1 יוצא ⬅ 1 נכנס)
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {evaluation.feeds.map((f) => (
              <FeedChip key={f} label={f} />
            ))}
          </div>
        )}

        {evaluation.measures.length ? (
          <ul className="space-y-3">
            {evaluation.measures.map((m) => (
              <MeasureRow
                key={m.measure.id}
                m={m}
                onQuick={(value) => onQuick(m.measure.id, value)}
                onEdit={onEdit}
              />
            ))}
          </ul>
        ) : null}

        {evaluation.gateReady ? (
          <div className="space-y-2.5 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-500 p-3 text-white shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-300">
            <p className="flex items-start gap-1.5 text-sm font-extrabold leading-snug">
              <Sparkles className="mt-0.5 size-4 shrink-0" strokeWidth={2.25} />
              {next ? '🎉 שלטת בשלב זה ב-100%! מוכן לעלות לשלב הבא?' : '🏆 שלטת בשלב האחרון במסלול!'}
            </p>
            {next ? (
              <div className="space-y-1.5 rounded-xl bg-white/95 p-2.5 text-[11px] leading-snug text-slate-800">
                <p className="font-bold text-slate-900">
                  שלב {next.node.order}: {next.node.title}
                </p>
                {nextPreviews.map((p, i) => (
                  <dl key={i} className="space-y-0.5 border-t border-slate-100 pt-1.5 first:border-0 first:pt-0">
                    <div className="flex flex-wrap gap-x-1">
                      <dt className="font-bold text-slate-500">אימון מתעדכן:</dt>
                      <dd className="font-semibold">{p.placeSummary}</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-1">
                      <dt className="font-bold text-rose-700">יוצא מהאימון (הושלם ✓):</dt>
                      <dd>{outgoingLabel(p) || '— (מתווסף בסוף האימון)'}</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-1">
                      <dt className="font-bold text-emerald-700">נכנס במקומו (שלב הבא 🚀):</dt>
                      <dd className="font-semibold text-slate-900">{incomingLabel(p)}</dd>
                    </div>
                  </dl>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              onClick={onPromote}
              className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-white px-2 text-sm font-extrabold text-emerald-700 shadow-sm transition hover:bg-emerald-50 active:scale-[0.99]"
            >
              {next ? 'אשר קידום והחלף תרגיל באימון אוטומטית ⚡' : 'סמן את המסלול כנשלט ✓'}
            </button>
          </div>
        ) : null}
        {node.progressions.length ? (
          <p className="text-[10px] text-muted">
            שלבים קודמים: {node.progressions.map((p) => p.fromTitle).join(' ← ')}
          </p>
        ) : null}
      </article>
    </li>
  )
}

export function SkillBranchCard({
  evaluation,
  expanded,
  onToggle,
  onEditBranch,
  onAddNode,
  onOpenNode,
  onEditNode,
  onQuick,
  onSwapNode,
  onActivateNode,
  onPromote,
  onToggleFocus,
}: {
  evaluation: BranchEvaluation
  expanded: boolean
  onToggle: () => void
  onEditBranch: () => void
  onAddNode: () => void
  onOpenNode: (nodeId: string) => void
  onEditNode: (nodeId: string) => void
  onQuick: (nodeId: string, measureId: string, value: SkillValue) => void
  onSwapNode: (nodeId: string) => void
  /** Manual override: open the 1-in-1-out confirmation for this tier. */
  onActivateNode: (nodeId: string) => void
  /** Mastery gate: swap in the next tier automatically. */
  onPromote: (nodeId: string) => void
  /** בפוקוס פעיל ↔ בתור. */
  onToggleFocus: () => void
}) {
  const { branch, nodes, focus, activeNode, nextNode } = evaluation
  const pct = percent(evaluation.progress)
  const done = focus === 'completed'
  const queued = focus === 'queued'
  const currentTier = activeNode ?? nextNode

  const category = trackCategory(branch.id)
  return (
    <section
      className={[
        'overflow-hidden rounded-3xl border bg-white shadow-sm transition',
        done
          ? 'border-emerald-200 shadow-emerald-100'
          : queued
            ? 'border-slate-200 shadow-slate-200/60'
            : 'border-blue-100 shadow-blue-100/70',
      ].join(' ')}
    >
      <div className="flex items-start gap-3 p-4">
        <span
          className={[
            'flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm',
            done
              ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/30'
              : queued
                ? 'bg-slate-400 shadow-slate-400/20'
                : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-600/30',
          ].join(' ')}
        >
          <SkillIcon icon={branch.icon} className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <h3 className="font-display text-base font-bold leading-snug text-slate-900" dir="auto">
              {branch.title}
            </h3>
            <button
              type="button"
              aria-label="עריכת מסלול"
              onClick={onEditBranch}
              className="-me-1 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-blue-50 hover:text-blue-600"
            >
              <Pencil className="size-4" strokeWidth={1.75} />
            </button>
          </div>
          {category ? (
            <span
              className={[
                'mt-1 inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ring-1 ring-inset',
                category.kind === 'pull'
                  ? 'bg-cyan-50 text-indigo-700 ring-indigo-200'
                  : 'bg-orange-50 text-orange-800 ring-orange-200',
              ].join(' ')}
            >
              <span aria-hidden>{category.kind === 'pull' ? '⬇' : '⬆'}</span>
              <span className="truncate">{category.badge}</span>
            </span>
          ) : null}
          {branch.subtitle ? (
            <p className="mt-0.5 text-xs leading-snug text-muted">{branch.subtitle}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={[
                'rounded-full px-2 py-0.5 text-[10px] font-bold',
                done
                  ? 'bg-emerald-100 text-emerald-700'
                  : queued
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-blue-600 text-white',
              ].join(' ')}
            >
              {done ? 'נשלט במלואו ✓' : queued ? 'בתור ⏳' : 'בפוקוס פעיל 🎯'}
            </span>
            <span className="text-[11px] font-semibold text-slate-600">
              {evaluation.masteredCount}/{evaluation.tierCount} שלבים נשלטו
              {currentTier ? ` · ${activeNode ? 'עכשיו' : 'הבא בתור'}: שלב ${currentTier.node.order}` : ''}
            </span>
          </div>
          {!done ? (
            <button
              type="button"
              onClick={onToggleFocus}
              aria-pressed={!queued}
              className={[
                'mt-2 inline-flex min-h-8 items-center gap-1 rounded-full px-3 text-[11px] font-bold transition',
                queued
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25 hover:bg-blue-700'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              ].join(' ')}
            >
              {queued ? '🎯 העבר לפוקוס פעיל' : '⏳ העבר לבתור'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 px-4 pb-3">
        <ol className="flex items-center gap-1" aria-label="שלבי המסלול">
          {nodes.map((n) => (
            <li
              key={n.node.id}
              title={`שלב ${n.node.order}: ${n.node.title}`}
              className={[
                'flex h-6 min-w-0 flex-1 items-center justify-center rounded-md text-[10px] font-extrabold',
                n.status === 'mastered'
                  ? 'bg-emerald-500 text-white'
                  : n.status === 'active'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                    : n.status === 'queued'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-400',
              ].join(' ')}
            >
              {n.status === 'mastered' ? '✓' : n.status === 'locked' ? '🔒' : n.node.order}
            </li>
          ))}
        </ol>
        <div className="flex items-end justify-between">
          <span className="min-w-0 truncate text-[11px] font-semibold text-muted">
            {currentTier ? (
              <>
                <Target className="me-1 inline size-3" strokeWidth={2.25} />
                {currentTier.node.title}
              </>
            ) : (
              'כל השלבים נשלטו'
            )}
          </span>
          <span
            className={`font-display text-2xl font-extrabold leading-none tabular-nums ${done ? 'text-emerald-600' : 'text-slate-900'}`}
          >
            {pct}%
          </span>
        </div>
        <ProgressBar progress={evaluation.progress} complete={done} />
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex min-h-11 w-full items-center justify-center gap-1.5 border-t border-slate-100 text-xs font-semibold text-blue-700 transition hover:bg-blue-50/50"
      >
        {expanded ? 'הסתר את עץ השלבים' : `הצג ${nodes.length} שלבים (Tier 1 → ${nodes.length})`}
        <ChevronDown
          className={`size-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>

      {expanded ? (
        <div className="border-t border-slate-100 bg-slate-50/60 p-4">
          {nodes.length ? (
            <ol className="relative space-y-3 before:absolute before:inset-y-4 before:start-3.5 before:w-0.5 before:rounded-full before:bg-gradient-to-b before:from-emerald-200 before:via-blue-200 before:to-slate-200">
              {nodes.map((n) => {
                const next =
                  nodes.find((x) => x.node.order > n.node.order && x.status !== 'mastered') ?? null
                return (
                  <TierItem
                    key={n.node.id}
                    evaluation={n}
                    next={next}
                    onOpen={() => onOpenNode(n.node.id)}
                    onEdit={() => onEditNode(n.node.id)}
                    onQuick={(measureId, value) => onQuick(n.node.id, measureId, value)}
                    onSwap={() => onSwapNode(n.node.id)}
                    onActivate={() => onActivateNode(n.node.id)}
                    onPromote={() => onPromote(n.node.id)}
                  />
                )
              })}
            </ol>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm text-muted">
              אין עדיין שלבים במסלול הזה.
            </p>
          )}
          <button
            type="button"
            onClick={onAddNode}
            className="mt-3 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-blue-200 bg-white text-xs font-bold text-blue-700 transition hover:bg-blue-50"
          >
            <Plus className="size-3.5" strokeWidth={2.5} />
            שלב חדש
          </button>
        </div>
      ) : null}
    </section>
  )
}
