import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronDown,
  Lock,
  LockOpen,
  Minus,
  Pencil,
  Plus,
  Scale,
  Sparkles,
  Sunrise,
  Trophy,
} from 'lucide-react'
import {
  bumpValue,
  formatSkillValue,
  percent,
  type BranchEvaluation,
  type MeasureEvaluation,
  type NodeEvaluation,
  type SkillValue,
} from '../../lib/skillTree'
import { SkillIcon } from './SkillIcon'
import { ExerciseStickmanSvg, exerciseFigureKind } from '../ExerciseStickmanSvg'
import type { SkillNode } from '../../lib/skillTree'

/** Figure for a milestone: its linked exercise first, then its title. */
function nodeFigure(node: SkillNode) {
  if (node.measures.length && node.measures.every((m) => m.sourceType === 'body_metric')) {
    return 'physique' as const
  }
  for (const m of node.measures) {
    if (m.sourceType === 'body_metric') continue
    const kind = exerciseFigureKind(m.linkedExercise)
    if (kind !== 'generic') return kind
  }
  return exerciseFigureKind(node.title)
}

function shortDate(key: string | null) {
  if (!key) return ''
  const [, m, d] = key.split('-')
  return `${Number(d)}.${Number(m)}`
}

function sourceHint(m: MeasureEvaluation): string {
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

function FeedChip({ label }: { label: string }) {
  const morning = label.startsWith('שגרת בוקר')
  const body = label === 'מדדי גוף'
  const Icon = morning ? Sunrise : body ? Scale : CalendarDays
  return (
    <span
      className={[
        'inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
        morning
          ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
          : body
            ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
            : 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
      ].join(' ')}
    >
      <Icon className="size-3 shrink-0" strokeWidth={2} />
      <span className="truncate">{label}</span>
    </span>
  )
}

function Bar({ progress, complete, thin = false }: { progress: number; complete: boolean; thin?: boolean }) {
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
      <Bar progress={m.progress} complete={m.complete} thin />
      <p className="text-[10px] text-muted">
        {sourceHint(m)}
        {m.baseline.amount != null ? ` · בסיס ${formatSkillValue(m.measure, m.baseline)}` : ''}
      </p>
    </li>
  )
}

function NodeItem({
  evaluation,
  isFirst,
  isLast,
  onEdit,
  onMove,
  onQuick,
  onEditValue,
  onAdvance,
}: {
  evaluation: NodeEvaluation
  isFirst: boolean
  isLast: boolean
  onEdit: () => void
  onMove: (dir: -1 | 1) => void
  onQuick: (measureId: string, value: SkillValue) => void
  onEditValue: () => void
  onAdvance: () => void
}) {
  const { node, complete } = evaluation
  const parked = !node.isActiveInCurrentBlock
  const pct = percent(evaluation.progress)

  return (
    <li className="relative ps-9">
      <span
        aria-hidden
        className={[
          'absolute start-0 top-3 flex size-7 items-center justify-center rounded-full text-[10px] font-extrabold ring-4 ring-white',
          complete
            ? 'bg-gradient-to-b from-emerald-400 to-teal-500 text-white shadow-sm shadow-emerald-500/30'
            : parked
              ? 'border-2 border-dashed border-slate-300 bg-white text-slate-400'
              : 'bg-blue-600 text-white shadow-sm shadow-blue-600/25',
        ].join(' ')}
      >
        {complete ? <Check className="size-4" strokeWidth={3} /> : node.order}
      </span>
      <article
        className={[
          'space-y-2.5 rounded-2xl border p-3',
          complete
            ? 'border-emerald-200 bg-emerald-50/50'
            : parked
              ? 'border-dashed border-slate-200 bg-slate-50/70'
              : 'border-slate-200 bg-white',
        ].join(' ')}
      >
        <div className="flex items-start gap-2">
          <ExerciseStickmanSvg name={node.title} kind={nodeFigure(node)} size="sm" className="mt-0.5" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {complete ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm shadow-emerald-500/30">
                  הושלם ✓
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-slate-700">
                  {pct}%
                </span>
              )}
              {parked ? (
                <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  בתור לבלוק עתידי
                </span>
              ) : null}
            </div>
            <h4 className="text-sm font-bold leading-snug text-slate-900">{node.title}</h4>
            {node.note ? <p className="text-[11px] leading-snug text-muted">{node.note}</p> : null}
            <div className="flex flex-wrap gap-1">
              {evaluation.feeds.map((f) => (
                <FeedChip key={f} label={f} />
              ))}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-center">
            <button
              type="button"
              aria-label="עריכת אבן דרך"
              onClick={onEdit}
              className="flex size-9 items-center justify-center rounded-xl text-muted transition hover:bg-blue-50 hover:text-blue-600"
            >
              <Pencil className="size-3.5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              aria-label="הזז למעלה"
              disabled={isFirst}
              onClick={() => onMove(-1)}
              className="flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-slate-100 disabled:opacity-25"
            >
              <ArrowUp className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="הזז למטה"
              disabled={isLast}
              onClick={() => onMove(1)}
              className="flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-slate-100 disabled:opacity-25"
            >
              <ArrowDown className="size-3.5" />
            </button>
          </div>
        </div>

        <ul className="space-y-3">
          {evaluation.measures.map((m) => (
            <MeasureRow
              key={m.measure.id}
              m={m}
              onQuick={(value) => onQuick(m.measure.id, value)}
              onEdit={onEditValue}
            />
          ))}
        </ul>

        {complete ? (
          <div className="space-y-2 rounded-xl bg-gradient-to-l from-emerald-500 to-teal-500 p-3 text-white shadow-sm shadow-emerald-500/25">
            <p className="flex items-center gap-1.5 text-xs font-bold">
              <Sparkles className="size-3.5" strokeWidth={2.25} />
              {node.nextProgressionStep ? `הצעד הבא: ${node.nextProgressionStep}` : 'היעד הושג — הגדר את השלב הבא'}
            </p>
            <button
              type="button"
              onClick={onAdvance}
              className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-white text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
            >
              קדם תרגיל לשלב הבא
            </button>
          </div>
        ) : node.nextProgressionStep ? (
          <p className="text-[11px] text-muted">
            ב-100%: <span className="font-semibold text-slate-600">{node.nextProgressionStep}</span>
          </p>
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
  blockLabel,
  expanded,
  onToggle,
  onEditBranch,
  onAddNode,
  onEditNode,
  onMoveNode,
  onQuick,
  onAdvanceNode,
  onCompleteBranch,
}: {
  evaluation: BranchEvaluation
  blockLabel: string
  expanded: boolean
  onToggle: () => void
  onEditBranch: () => void
  onAddNode: () => void
  onEditNode: (nodeId: string) => void
  onMoveNode: (nodeId: string, dir: -1 | 1) => void
  onQuick: (nodeId: string, measureId: string, value: SkillValue) => void
  onAdvanceNode: (nodeId: string) => void
  onCompleteBranch: () => void
}) {
  const { branch, nodes, complete } = evaluation
  const pct = percent(evaluation.progress)
  const done = branch.status === 'completed'
  const queued = branch.status === 'queued_next_block'

  return (
    <section
      className={[
        'overflow-hidden rounded-3xl border bg-white shadow-sm transition',
        complete || done
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
            complete || done
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
            <h3 className="font-display text-base font-bold leading-snug text-slate-900">
              {branch.title}
            </h3>
            <button
              type="button"
              aria-label="עריכת יעד-על"
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
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-blue-600 text-white',
              ].join(' ')}
            >
              {done ? 'הושלם' : queued ? 'בלוקים הבאים' : `בפוקוס ב${blockLabel}`}
            </span>
            <span className="text-[11px] font-semibold text-slate-600">
              {evaluation.completedCount}/{evaluation.countedNodes} הושלמו
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="mb-1.5 flex items-end justify-between">
          <span className="text-[11px] font-semibold text-muted">התקדמות</span>
          <span
            className={`font-display text-2xl font-extrabold leading-none tabular-nums ${complete ? 'text-emerald-600' : 'text-slate-900'}`}
          >
            {pct}%
          </span>
        </div>
        <Bar progress={evaluation.progress} complete={complete} />
      </div>

      {complete && !done ? (
        <div className="mx-4 mb-3 space-y-2 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-500 p-3 text-white">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <Trophy className="size-4" strokeWidth={2.25} />
            כל אבני הדרך הושלמו!
          </p>
          <button
            type="button"
            onClick={onCompleteBranch}
            className="flex min-h-10 w-full items-center justify-center rounded-lg bg-white px-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
          >
            סמן כהושלם ופתח את היעד הבא
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex min-h-11 w-full items-center justify-center gap-1.5 border-t border-slate-100 text-xs font-semibold text-blue-700 transition hover:bg-blue-50/50"
      >
        {expanded ? 'הסתר אבני דרך' : `הצג ${nodes.length} אבני דרך`}
        <ChevronDown
          className={`size-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>

      {expanded ? (
        <div className="border-t border-slate-100 bg-slate-50/60 p-4">
          {nodes.length ? (
            <ol className="relative space-y-3 before:absolute before:inset-y-4 before:start-3.5 before:w-0.5 before:rounded-full before:bg-gradient-to-b before:from-blue-200 before:to-slate-200">
              {nodes.map((n, i) => (
                <NodeItem
                  key={n.node.id}
                  evaluation={n}
                  isFirst={i === 0}
                  isLast={i === nodes.length - 1}
                  onEdit={() => onEditNode(n.node.id)}
                  onEditValue={() => onEditNode(n.node.id)}
                  onMove={(dir) => onMoveNode(n.node.id, dir)}
                  onQuick={(measureId, value) => onQuick(n.node.id, measureId, value)}
                  onAdvance={() => onAdvanceNode(n.node.id)}
                />
              ))}
            </ol>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm text-muted">
              אין עדיין אבני דרך ביעד הזה.
            </p>
          )}
          <button
            type="button"
            onClick={onAddNode}
            className="mt-3 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-blue-200 bg-white text-xs font-bold text-blue-700 transition hover:bg-blue-50"
          >
            <Plus className="size-3.5" strokeWidth={2.5} />
            אבן דרך
          </button>
          {branch.nextUnlockTitle ? (
            <div
              className={[
                'mt-3 flex items-start gap-2 rounded-2xl p-3 text-xs',
                complete || done
                  ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                  : 'bg-slate-900 text-white',
              ].join(' ')}
            >
              {complete || done ? (
                <LockOpen className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
              ) : (
                <Lock className="mt-0.5 size-4 shrink-0 text-amber-300" strokeWidth={2} />
              )}
              <p className="leading-snug">
                <span className="font-bold">{complete || done ? 'נפתח: ' : 'נפתח ב-100%: '}</span>
                {branch.nextUnlockTitle}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
