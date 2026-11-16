import { useMemo, useState } from 'react'
import { GitBranch, Plus, Settings2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useTodayKey } from '../../hooks/useTodayKey'
import { dayAllExercises } from '../../lib/types'
import {
  advanceNode,
  blockWeekInfo,
  deleteBranch,
  deleteNode,
  liveBranches,
  matchesLink,
  moveNode,
  newBranch,
  newNode,
  percent,
  setBlockSettings,
  setMeasureManual,
  upsertBranch,
  upsertNode,
  type BranchEvaluation,
  type SkillBranch,
  type SkillNode,
} from '../../lib/skillTree'
import { SkillBranchCard } from './SkillBranchCard'
import {
  SkillAdvanceModal,
  SkillBlockSettingsModal,
  SkillBranchModal,
  SkillNodeModal,
  type SkillAdvanceSubmit,
} from './SkillEditModals'
import { useLinkableExerciseNames, useSkillTreeEvaluation } from './useSkillTree'

type Filter = 'all' | 'active' | 'completed' | 'queued'

function matchesFilter(e: BranchEvaluation, filter: Filter) {
  switch (filter) {
    case 'all':
      return true
    case 'active':
      return e.branch.status === 'active_focus'
    case 'completed':
      return e.branch.status === 'completed' || e.complete
    case 'queued':
      return e.branch.status === 'queued_next_block'
  }
}

function BlockWeeksStrip({
  week,
  total,
  deload,
  benchmark,
}: {
  week: number
  total: number
  deload: number[]
  benchmark: number
}) {
  return (
    <ol className="flex gap-1" aria-label="שבועות הבלוק">
      {Array.from({ length: total }, (_, i) => i + 1).map((w) => {
        const isDeload = deload.includes(w)
        const isBench = w === benchmark
        const past = w < week
        const current = w === week
        return (
          <li
            key={w}
            title={`שבוע ${w}${isDeload ? ' · דילואד' : isBench ? ' · מבחנים' : ''}`}
            className={[
              'flex h-6 min-w-0 flex-1 items-center justify-center rounded-md text-[9px] font-bold tabular-nums',
              current
                ? 'bg-white text-blue-700 shadow-sm'
                : past
                  ? 'bg-white/45 text-blue-900'
                  : isDeload
                    ? 'bg-white/10 text-white/70 ring-1 ring-inset ring-white/30'
                    : isBench
                      ? 'bg-amber-300/90 text-amber-950'
                      : 'bg-white/15 text-white/80',
            ].join(' ')}
          >
            {isBench ? '★' : isDeload ? 'D' : w}
          </li>
        )
      })}
    </ol>
  )
}

export function SkillTreePanel() {
  const { skillTree, updateSkillTree, activeProgram, updateExercise } = useAppData()
  const { evaluations } = useSkillTreeEvaluation()
  const exerciseNames = useLinkableExerciseNames()
  const today = useTodayKey()
  const week = blockWeekInfo(skillTree, today)

  const [filter, setFilter] = useState<Filter>('all')
  const [expandedRaw, setExpanded] = useLocalStorage<string[]>('tn.skillTree.expanded.v1', [
    'st-muscle-up',
  ])
  const expanded = Array.isArray(expandedRaw) ? expandedRaw : []

  const [branchDraft, setBranchDraft] = useState<{ branch: SkillBranch; isNew: boolean } | null>(null)
  const [nodeDraft, setNodeDraft] = useState<{ node: SkillNode; isNew: boolean } | null>(null)
  const [advanceId, setAdvanceId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const visible = evaluations.filter((e) => matchesFilter(e, filter))
  const counts = useMemo(
    () => ({
      all: evaluations.length,
      active: evaluations.filter((e) => matchesFilter(e, 'active')).length,
      completed: evaluations.filter((e) => matchesFilter(e, 'completed')).length,
      queued: evaluations.filter((e) => matchesFilter(e, 'queued')).length,
    }),
    [evaluations],
  )
  const focus = evaluations.filter((e) => e.branch.status === 'active_focus')
  const overall = focus.length
    ? focus.reduce((sum, e) => sum + e.progress, 0) / focus.length
    : 0
  const nodesDone = focus.reduce((sum, e) => sum + e.completedCount, 0)
  const nodesTotal = focus.reduce((sum, e) => sum + e.countedNodes, 0)

  const advanceEvaluation =
    evaluations.flatMap((e) => e.nodes).find((n) => n.node.id === advanceId) ?? null

  function toggle(id: string) {
    setExpanded(expanded.includes(id) ? expanded.filter((x) => x !== id) : [...expanded, id])
  }

  function submitAdvance(input: SkillAdvanceSubmit) {
    if (!advanceId) return
    updateSkillTree((prev) => advanceNode(prev, advanceId, input))
    const rename = input.renameExercise
    if (rename && activeProgram) {
      // Update every matching exercise in the active program (all weekdays).
      for (const day of activeProgram.days) {
        for (const ex of dayAllExercises(day)) {
          if (!matchesLink(ex.name, rename.from)) continue
          updateExercise(day.id, ex.id, {
            name: rename.to,
            ...(rename.reps ? { reps: rename.reps } : {}),
          })
        }
      }
    }
    setAdvanceId(null)
  }

  function completeBranch(e: BranchEvaluation) {
    updateSkillTree((prev) => {
      let next = upsertBranch(prev, { ...e.branch, status: 'completed' })
      const title = e.branch.nextUnlockTitle.trim()
      const exists = liveBranches(next).some((b) => b.title.trim() === title)
      if (title && !exists) {
        next = upsertBranch(next, {
          ...newBranch(next, title),
          icon: e.branch.icon,
          status: 'queued_next_block',
          subtitle: `נפתח אחרי: ${e.branch.title}`,
        })
      }
      return next
    })
  }

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'הכל' },
    { id: 'active', label: `בפוקוס ב${skillTree.blockLabel}` },
    { id: 'completed', label: 'הושלמו' },
    { id: 'queued', label: 'בלוקים הבאים' },
  ]

  return (
    <div className="space-y-4" dir="rtl">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-4 text-white shadow-lg shadow-blue-700/25">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-100">
              <GitBranch className="size-3.5" strokeWidth={2.25} />
              {week.label}
            </p>
            <h2 className="mt-1 font-display text-lg font-bold leading-tight">עץ מיומנויות ואבני דרך</h2>
            <p className="mt-0.5 text-xs text-blue-100/90">
              {nodesDone}/{nodesTotal} אבני דרך הושלמו · מתעדכן אוטומטית מהאימונים, שגרת הבוקר ומדדי הגוף
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="font-display text-3xl font-extrabold leading-none tabular-nums">
              {percent(overall)}%
            </span>
            <button
              type="button"
              aria-label="הגדרות בלוק"
              onClick={() => setSettingsOpen(true)}
              className="flex size-9 items-center justify-center rounded-xl bg-white/15 text-white transition hover:bg-white/25"
            >
              <Settings2 className="size-4" strokeWidth={2} />
            </button>
          </div>
        </div>
        <div className="mt-3">
          <BlockWeeksStrip
            week={week.started ? week.week : 0}
            total={skillTree.blockWeeks}
            deload={skillTree.deloadWeeks}
            benchmark={skillTree.benchmarkWeek}
          />
          <p className="mt-1.5 text-[10px] text-blue-100/80">
            D = דילואד (שבועות {skillTree.deloadWeeks.join(', ') || '—'}) · ★ = שבוע מבחנים (
            {skillTree.benchmarkWeek})
          </p>
        </div>
      </section>

      <div className="no-scrollbar -mx-4 overflow-x-auto overscroll-x-contain px-4" role="tablist" aria-label="סינון יעדים">
        <div className="flex w-max gap-1.5">
          {filters.map((f) => {
            const active = f.id === filter
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.id)}
                className={[
                  'inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-xs font-bold transition',
                  active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                ].join(' ')}
              >
                {f.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] tabular-nums ${active ? 'bg-white/20' : 'bg-slate-100'}`}
                >
                  {counts[f.id]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {visible.length ? (
        <div className="space-y-3">
          {visible.map((e) => (
            <SkillBranchCard
              key={e.branch.id}
              evaluation={e}
              blockLabel={skillTree.blockLabel}
              expanded={expanded.includes(e.branch.id)}
              onToggle={() => toggle(e.branch.id)}
              onEditBranch={() => setBranchDraft({ branch: e.branch, isNew: false })}
              onAddNode={() =>
                setNodeDraft({ node: newNode(skillTree, e.branch.id), isNew: true })
              }
              onEditNode={(nodeId) => {
                const node = skillTree.nodes[nodeId]
                if (node) setNodeDraft({ node, isNew: false })
              }}
              onMoveNode={(nodeId, dir) => updateSkillTree((prev) => moveNode(prev, nodeId, dir))}
              onQuick={(nodeId, measureId, value) =>
                updateSkillTree((prev) => setMeasureManual(prev, nodeId, measureId, value))
              }
              onAdvanceNode={setAdvanceId}
              onCompleteBranch={() => completeBranch(e)}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-muted">
          אין יעדים בסינון הזה.
        </p>
      )}

      <button
        type="button"
        onClick={() => setBranchDraft({ branch: newBranch(skillTree), isNew: true })}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 bg-white text-sm font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
      >
        <Plus className="size-4" strokeWidth={2.5} />
        יעד-על חדש
      </button>

      <SkillBranchModal
        open={!!branchDraft}
        branch={branchDraft?.branch ?? null}
        isNew={branchDraft?.isNew ?? false}
        onClose={() => setBranchDraft(null)}
        onSave={(branch) => {
          updateSkillTree((prev) => upsertBranch(prev, branch))
          if (branchDraft?.isNew) setExpanded([...expanded, branch.id])
          setBranchDraft(null)
        }}
        onDelete={(id) => {
          updateSkillTree((prev) => deleteBranch(prev, id))
          setBranchDraft(null)
        }}
      />
      <SkillNodeModal
        open={!!nodeDraft}
        node={nodeDraft?.node ?? null}
        isNew={nodeDraft?.isNew ?? false}
        exerciseNames={exerciseNames}
        onClose={() => setNodeDraft(null)}
        onSave={(node) => {
          updateSkillTree((prev) => upsertNode(prev, node))
          setNodeDraft(null)
        }}
        onDelete={(id) => {
          updateSkillTree((prev) => deleteNode(prev, id))
          setNodeDraft(null)
        }}
      />
      <SkillAdvanceModal
        open={!!advanceEvaluation}
        evaluation={advanceEvaluation}
        onClose={() => setAdvanceId(null)}
        onSubmit={submitAdvance}
      />
      <SkillBlockSettingsModal
        open={settingsOpen}
        state={skillTree}
        onClose={() => setSettingsOpen(false)}
        onSave={(patch) => {
          updateSkillTree((prev) => setBlockSettings(prev, patch))
          setSettingsOpen(false)
        }}
      />
    </div>
  )
}
