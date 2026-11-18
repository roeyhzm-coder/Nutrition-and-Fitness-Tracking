import { useMemo } from 'react'
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  Lock,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Undo2,
  Zap,
} from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { outgoingLabel, planSlotSwap, type SlotPreview } from '../../lib/skillSlotSwap'
import {
  bumpValue,
  percent,
  progressText,
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

export function ProgressBar({ progress, complete, thin = false }: { progress: number; complete: boolean; thin?: boolean }) {
  const pct = percent(progress)
  return (
    <div
      className={`${thin ? 'h-1.5' : 'h-2'} overflow-hidden rounded-full bg-slate-100`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={[
          'h-full rounded-full transition-all duration-500',
          complete ? 'bg-emerald-500' : 'bg-gradient-to-l from-cyan-400 to-blue-600',
        ].join(' ')}
        style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
      />
    </div>
  )
}

/** Short workout pill: "יום א׳/ג׳ · משיכה 3" → "א׳/ג׳ · משיכה 3". */
function DayPill({ label }: { label: string }) {
  return (
    <span className="inline-flex max-w-[11rem] shrink-0 items-center truncate rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
      {label.replace(/^יום\s+/, '')}
    </span>
  )
}

/** One exercise: stickman · name · day, then [ − ] 5 מתוך 10 חזרות [ + ] and a bar. */
function MeasureRow({
  m,
  onQuick,
  onEdit,
}: {
  m: MeasureEvaluation
  onQuick: (value: SkillValue) => void
  onEdit: () => void
}) {
  return (
    <li className="space-y-1.5">
      <div className="flex items-center gap-2">
        <ExerciseStickmanSvg
          name={m.measure.linkedExercise || m.measure.label}
          kind={exerciseFigureKind(m.measure.linkedExercise || m.measure.label)}
          size="sm"
        />
        <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800" dir="auto">
          {m.measure.label || 'תרגיל'}
        </p>
        {m.feeds[0] ? (
          <DayPill label={/לא בתוכנית/.test(m.feeds[0]) ? '🎯 ראשון באימון' : m.feeds[0]} />
        ) : null}
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
          className={`min-h-9 min-w-0 flex-1 rounded-xl px-2 text-center text-[13px] font-bold tabular-nums ring-1 transition ${
            m.complete ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-white text-slate-900 ring-slate-200 hover:ring-blue-300'
          }`}
          dir="auto"
        >
          {progressText(m.measure, m.current)}
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
    </li>
  )
}

const DOT: Record<SkillTierStatus, string> = {
  mastered: 'bg-emerald-500 text-white',
  active: 'bg-blue-600 text-white ring-blue-100',
  queued: 'border-2 border-amber-300 bg-amber-50 text-amber-700',
  locked: 'border-2 border-dashed border-slate-300 bg-white text-slate-400',
}

/** "🔄 בסיום השלב הקודם יחליף את: X ב-Y" (one line per workout it touches). */
function swapLine(p: SlotPreview): string {
  if (p.alreadyApplied) return `✅ כבר באימון שלך: ${p.incoming.map((e) => e.name).join(' + ')} ב-${p.placeSummary}`
  const out = outgoingLabel(p)
  return out
    ? `🔄 בסיום השלב הקודם יחליף את: ${out} ב-${p.placeSummary}`
    : `🔄 בסיום השלב הקודם יתווסף ל-${p.placeSummary}`
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
  onUndo,
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
  /** Mastered tier back into focus. */
  onUndo: () => void
}) {
  const { workoutDays, morningRoutine } = useAppData()
  const { node, status } = evaluation
  const previews = useMemo(
    () => planSlotSwap(node.slots, workoutDays, morningRoutine),
    [node.slots, workoutDays, morningRoutine],
  )
  const dot = (
    <span
      aria-hidden
      className={`absolute start-0 top-2.5 flex size-7 items-center justify-center rounded-full text-[11px] font-extrabold ring-4 ring-white ${DOT[status]}`}
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

  if (status === 'mastered') {
    return (
      <li className="relative ps-9">
        {dot}
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-2">
          <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-right">
            <span className="block truncate text-[13px] font-bold text-slate-900" dir="auto">
              {node.order}. {node.title}
            </span>
          </button>
          <button
            type="button"
            onClick={onUndo}
            className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full bg-white px-2.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            <Undo2 className="size-3.5" strokeWidth={2.25} />
            בטל השלמת שלב
          </button>
        </div>
      </li>
    )
  }

  if (status !== 'active') {
    return (
      <li className="relative ps-9">
        {dot}
        <div
          className={`space-y-1 rounded-2xl border border-dashed p-2.5 ${status === 'queued' ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-slate-50/80'}`}
        >
          <div className="flex items-center gap-2">
            <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-right">
              <span
                className={`block truncate text-[13px] font-bold ${status === 'locked' ? 'text-slate-600' : 'text-slate-900'}`}
                dir="auto"
              >
                {node.order}. {node.title}
              </span>
            </button>
            <button
              type="button"
              onClick={onActivate}
              aria-label="הפעל שלב זה עכשיו"
              title="הפעל שלב זה עכשיו"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 ring-1 ring-blue-200 transition hover:bg-blue-50"
            >
              <Zap className="size-3.5" strokeWidth={2.25} />
            </button>
          </div>
          {(previews.length ? previews.map(swapLine) : ['🔄 נפתח בסיום השלב הקודם']).map((line) => (
            <p key={line} className="text-[11px] leading-snug text-slate-500">
              {line}
            </p>
          ))}
        </div>
      </li>
    )
  }

  const pending = previews.filter((p) => !p.missingTarget && !p.alreadyApplied)

  return (
    <li className="relative ps-9">
      {dot}
      <article className="space-y-3 rounded-2xl border border-blue-200 bg-white p-3 shadow-sm shadow-blue-100">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-right">
            <h4 className="text-sm font-bold leading-snug text-slate-900" dir="auto">
              {node.order}. {node.title}
            </h4>
          </button>
          <span className="shrink-0 text-sm font-extrabold tabular-nums text-blue-700">
            {percent(evaluation.progress)}%
          </span>
          <button
            type="button"
            aria-label="עריכת שלב"
            onClick={onEdit}
            className="flex size-8 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-blue-50 hover:text-blue-600"
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

        {pending.length ? (
          <button
            type="button"
            onClick={onSwap}
            className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 text-[11px] font-bold text-blue-700 transition hover:bg-blue-100"
          >
            <ArrowLeftRight className="size-3.5" strokeWidth={2.25} />
            שבץ באימון (1 יוצא ⬅ 1 נכנס)
          </button>
        ) : null}

        {evaluation.gateReady ? (
          <button
            type="button"
            onClick={onPromote}
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2 text-sm font-extrabold text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-700"
          >
            <Sparkles className="size-4" strokeWidth={2.25} />
            {next ? `100%! עבור לשלב ${next.node.order} והחלף באימון ⚡` : 'סמן את המסלול כנשלט ✓'}
          </button>
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
  onResetTrack,
  onUndoMastery,
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
  /** All tiers back to 0%, Tier 1 in active focus. */
  onResetTrack: () => void
  /** A mastered tier back into focus. */
  onUndoMastery: (nodeId: string) => void
}) {
  const { branch, nodes, focus, activeNode, nextNode } = evaluation
  const inFocus = focus === 'active'
  const allMastered = evaluation.complete
  const currentTier = activeNode ?? nextNode
  const category = trackCategory(branch.id)
  const nextOrder = nodes.reduce((max, n) => Math.max(max, n.node.order), 0) + 1

  const actions = (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={onResetTrack}
        className="inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-xl bg-white px-2.5 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
      >
        <RotateCcw className="size-3.5" strokeWidth={2.25} />
        🔄 אפס התקדמות מסלול (התחל משלב 1)
      </button>
      <button
        type="button"
        onClick={onAddNode}
        className="inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-xl bg-white px-2.5 text-[11px] font-bold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
      >
        <Plus className="size-3.5" strokeWidth={2.5} />
        הוסף שלב המשך (שלב {nextOrder})
      </button>
    </div>
  )

  return (
    <section
      className={[
        'overflow-hidden rounded-3xl border bg-white shadow-sm transition',
        inFocus ? 'border-blue-100 shadow-blue-100/70' : 'border-slate-200 shadow-slate-200/60',
      ].join(' ')}
    >
      <div className="space-y-2.5 p-3.5">
        <div className="flex items-center gap-2.5">
          <span
            className={[
              'flex size-10 shrink-0 items-center justify-center rounded-xl text-white',
              allMastered
                ? 'bg-emerald-500'
                : inFocus
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                  : 'bg-slate-400',
            ].join(' ')}
          >
            <SkillIcon icon={branch.icon} className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 font-display text-[15px] font-bold leading-tight text-slate-900" dir="auto">
              {branch.title}
            </h3>
            {category ? (
              <span
                className={[
                  'mt-0.5 inline-flex max-w-full items-center rounded-full px-2 py-px text-[10px] font-extrabold',
                  category.kind === 'pull' ? 'bg-cyan-50 text-indigo-700' : 'bg-orange-50 text-orange-800',
                ].join(' ')}
              >
                <span className="truncate">{category.badge}</span>
              </span>
            ) : null}
          </div>
          {focus !== 'completed' ? (
            <button
              type="button"
              onClick={onToggleFocus}
              aria-pressed={inFocus}
              title={inFocus ? 'העבר לבתור' : 'העבר לפוקוס פעיל'}
              className={[
                'inline-flex min-h-7 shrink-0 items-center whitespace-nowrap rounded-full px-2 text-[10px] font-bold transition',
                inFocus
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              ].join(' ')}
            >
              {inFocus ? '🎯 בפוקוס' : '⏳ בתור'}
            </button>
          ) : null}
          <button
            type="button"
            aria-label="עריכת מסלול"
            onClick={onEditBranch}
            className="flex size-8 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-blue-50 hover:text-blue-600"
          >
            <Pencil className="size-3.5" strokeWidth={1.75} />
          </button>
        </div>

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
                    ? 'bg-blue-600 text-white'
                    : n.status === 'queued'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-400',
              ].join(' ')}
            >
              {n.status === 'mastered' ? '✓' : n.node.order}
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex min-h-8 w-full items-center gap-1.5 text-right"
        >
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700" dir="auto">
            {currentTier
              ? `שלב ${currentTier.node.order}: ${currentTier.node.title}`
              : `כל ${nodes.length} השלבים נשלטו ✓`}
          </span>
          <span className="shrink-0 text-xs font-extrabold tabular-nums text-slate-900">
            {currentTier ? percent(currentTier.progress) : 100}%
          </span>
          <ChevronDown
            className={`size-4 shrink-0 text-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            strokeWidth={2}
          />
        </button>

        {allMastered && !expanded ? actions : null}
      </div>

      {expanded ? (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-3.5">
          {nodes.length ? (
            <ol className="relative space-y-2.5 before:absolute before:inset-y-4 before:start-3.5 before:w-0.5 before:rounded-full before:bg-slate-200">
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
                    onUndo={() => onUndoMastery(n.node.id)}
                  />
                )
              })}
            </ol>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm text-muted">
              אין עדיין שלבים במסלול הזה.
            </p>
          )}
          {actions}
        </div>
      ) : null}
    </section>
  )
}
