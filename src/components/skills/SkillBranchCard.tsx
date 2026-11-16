import {
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
} from 'lucide-react'
import {
  bumpValue,
  formatSkillValue,
  percent,
  SKILL_SLOT_TARGET_LABELS,
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

const TIER_STYLE: Record<
  SkillTierStatus,
  { dot: string; card: string; pill: string; pillText: string }
> = {
  mastered: {
    dot: 'bg-gradient-to-b from-emerald-400 to-teal-500 text-white shadow-sm shadow-emerald-500/30',
    card: 'border-emerald-200 bg-emerald-50/60',
    pill: 'bg-emerald-500 text-white',
    pillText: 'הושלם / נשלט ✓',
  },
  active: {
    dot: 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 ring-blue-100',
    card: 'border-blue-200 bg-white shadow-sm shadow-blue-100',
    pill: 'bg-blue-600 text-white',
    pillText: 'בפוקוס פעיל כרגע 🎯',
  },
  queued: {
    dot: 'border-2 border-amber-300 bg-amber-50 text-amber-700',
    card: 'border-dashed border-amber-200 bg-amber-50/40',
    pill: 'bg-amber-100 text-amber-800',
    pillText: 'בתור לבלוק הבא ⏳',
  },
  locked: {
    dot: 'border-2 border-dashed border-slate-300 bg-white text-slate-400',
    card: 'border-dashed border-slate-200 bg-slate-50/80',
    pill: 'bg-slate-200/80 text-slate-600',
    pillText: 'נעול - שלב הבא 🔒',
  },
}

function TierItem({
  evaluation,
  nextTitle,
  onOpen,
  onEdit,
  onQuick,
  onSwap,
  onAdvance,
}: {
  evaluation: NodeEvaluation
  nextTitle: string | null
  onOpen: () => void
  onEdit: () => void
  onQuick: (measureId: string, value: SkillValue) => void
  onSwap: () => void
  onAdvance: () => void
}) {
  const { node, status } = evaluation
  const style = TIER_STYLE[status]
  const pct = percent(evaluation.progress)
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

  // Mastered / queued / locked tiers: compact and clickable (blueprint).
  if (status !== 'active') {
    return (
      <li className="relative ps-9">
        {dot}
        <button
          type="button"
          onClick={onOpen}
          className={`flex w-full items-center gap-2.5 rounded-2xl border p-2.5 text-right transition hover:ring-2 hover:ring-blue-200 ${style.card}`}
        >
          <ExerciseStickmanSvg
            name={node.title}
            kind={tierFigure(node)}
            size="sm"
            className={status === 'locked' ? 'opacity-60' : ''}
          />
          <span className="min-w-0 flex-1 space-y-1">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-extrabold text-slate-500">שלב {node.order}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.pill}`}>
                {style.pillText}
              </span>
              {status === 'queued' && evaluation.measures.length ? (
                <span className="text-[10px] font-bold tabular-nums text-amber-700">{pct}%</span>
              ) : null}
            </span>
            <span
              className={`block text-[13px] font-bold leading-snug ${status === 'locked' ? 'text-slate-500' : 'text-slate-900'}`}
            >
              {node.title}
            </span>
          </span>
          <ChevronLeft className="size-4 shrink-0 text-slate-400" strokeWidth={2} />
        </button>
      </li>
    )
  }

  const applied = !!node.slotsAppliedAt
  const slotTargets = [...new Set(node.slots.map((s) => SKILL_SLOT_TARGET_LABELS[s.target]))]

  return (
    <li className="relative ps-9">
      {dot}
      <article className={`space-y-2.5 rounded-2xl border p-3 ${style.card}`}>
        <div className="flex items-start gap-2">
          <ExerciseStickmanSvg name={node.title} kind={tierFigure(node)} size="sm" className="mt-0.5" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-extrabold text-slate-500">שלב {node.order}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.pill}`}>
                {style.pillText}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-slate-700">
                {pct}%
              </span>
            </div>
            <button type="button" onClick={onOpen} className="block text-right">
              <h4 className="text-sm font-bold leading-snug text-slate-900">{node.title}</h4>
            </button>
            {node.note ? <p className="text-[11px] leading-snug text-muted">{node.note}</p> : null}
            <div className="flex flex-wrap gap-1">
              {evaluation.feeds.map((f) => (
                <FeedChip key={f} label={f} />
              ))}
            </div>
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

        {node.slots.length ? (
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200/80">
            <Repeat2 className="size-4 shrink-0 text-blue-600" strokeWidth={2} />
            <p className="min-w-0 flex-1 text-[11px] leading-snug text-slate-600">
              {applied ? 'משובץ בתוכנית: ' : 'מתכון שיבוץ: '}
              <span className="font-semibold text-slate-800">{slotTargets.join(' · ')}</span>
            </p>
            {applied ? (
              <span className="shrink-0 text-[10px] font-bold text-emerald-700">✓ באימון</span>
            ) : (
              <button
                type="button"
                onClick={onSwap}
                className="min-h-9 shrink-0 rounded-lg bg-blue-600 px-2.5 text-[11px] font-bold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-700"
              >
                שבץ בתוכנית האימונים (החלפה חכמה)
              </button>
            )}
          </div>
        ) : null}

        {evaluation.gateReady ? (
          <div className="space-y-2 rounded-xl bg-gradient-to-l from-emerald-500 to-teal-500 p-3 text-white shadow-sm shadow-emerald-500/25">
            <p className="flex items-start gap-1.5 text-xs font-bold leading-snug">
              <Sparkles className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.25} />
              {nextTitle
                ? `שלטת בשלב זה! 🎯 מוכן לעבור לשלב הבא: ${nextTitle}`
                : 'שלטת בשלב האחרון במסלול! 🏆'}
            </p>
            <button
              type="button"
              onClick={onAdvance}
              className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-white text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
            >
              {nextTitle ? 'פתח את השלב הבא ושבץ באימון' : 'סמן את המסלול כנשלט'}
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
  onAdvance,
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
  /** Mastery gate: master the active tier and open the next one. */
  onAdvance: (nodeId: string) => void
}) {
  const { branch, nodes, focus, activeNode, nextNode } = evaluation
  const pct = percent(evaluation.progress)
  const done = focus === 'completed'
  const queued = focus === 'queued'
  const currentTier = activeNode ?? nextNode

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
            </span>
          </div>
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
                {activeNode ? 'עכשיו' : 'הבא בתור'}: שלב {currentTier.node.order}
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
                const next = nodes.find(
                  (x) => x.node.order > n.node.order && x.status !== 'mastered',
                )
                return (
                  <TierItem
                    key={n.node.id}
                    evaluation={n}
                    nextTitle={next?.node.title ?? null}
                    onOpen={() => onOpenNode(n.node.id)}
                    onEdit={() => onEditNode(n.node.id)}
                    onQuick={(measureId, value) => onQuick(n.node.id, measureId, value)}
                    onSwap={() => onSwapNode(n.node.id)}
                    onAdvance={() => onAdvance(n.node.id)}
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
