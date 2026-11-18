import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ChevronDown, GitBranch, Info, Plus, Settings2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useTodayKey } from '../../hooks/useTodayKey'
import { planSlotSwap } from '../../lib/skillSlotSwap'
import {
  activateTier,
  blockWeekInfo,
  deleteBranch,
  deleteNode,
  markSlotsApplied,
  moveNode,
  newBranch,
  newNode,
  queueBranch,
  setBlockSettings,
  setMeasureManual,
  SKILL_FOCUS_LIMIT,
  addStage,
  soloFocusInCategory,
  trackCategory,
  upsertBranch,
  upsertNode,
  type BranchEvaluation,
  type SkillBranch,
  type SkillNode,
} from '../../lib/skillTree'
import { SkillBranchCard } from './SkillBranchCard'
import { SkillBlockSettingsModal, SkillBranchModal, SkillNodeModal } from './SkillEditModals'
import { SkillTierModal, type TierModalMode } from './SkillTierModal'
import { useLinkableExerciseNames, useSkillStageActions, useSkillTreeEvaluation } from './useSkillTree'

type Filter = 'all' | 'active' | 'pull' | 'push' | 'queued' | 'completed'

function matchesFilter(e: BranchEvaluation, filter: Filter) {
  if (filter === 'pull' || filter === 'push') return trackCategory(e.branch.id)?.kind === filter
  return filter === 'all' || e.focus === filter
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

function FocusMeter({ count, pull, push }: { count: number; pull: number; push: number }) {
  const warn = count > SKILL_FOCUS_LIMIT || pull > 1 || push > 1
  return (
    <p className={`flex items-center gap-1.5 text-xs font-bold ${warn ? 'text-amber-200' : 'text-white'}`}>
      {warn ? <AlertTriangle className="size-3.5 shrink-0" strokeWidth={2.25} /> : null}
      פוקוס פעיל: {count}/{SKILL_FOCUS_LIMIT} מסלולים ({pull} משיכה · {push} דחיפה)
    </p>
  )
}

function HowItWorks() {
  const [openRaw, setOpen] = useLocalStorage<boolean>('tn.skillTree.howItWorks.open.v2', false)
  const open = openRaw === true
  return (
    <section className="rounded-2xl border border-blue-100 bg-blue-50/70 text-blue-950">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-2 px-3 text-right text-sm font-extrabold"
      >
        <Info className="size-4 shrink-0 text-blue-600" strokeWidth={2.25} />
        <span className="flex-1">איך העץ עובד?</span>
        <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={2} />
      </button>
      {open ? (
        <p className="px-3 pb-3 text-xs leading-relaxed text-blue-900/90">
          השלב שבפוקוס פעיל מחובר אוטומטית לתרגילים הקיימים באימון שלך. ברגע שתגיע ל-100% שליטה בשלב,
          האפליקציה תחליף עבורך אוטומטית את התרגיל הישן בתרגיל של השלב הבא באותו יום אימון{' '}
          <span className="font-bold">(1 יוצא ⬅ 1 נכנס, ללא הארכת האימון!)</span>.
        </p>
      ) : null}
    </section>
  )
}

export function SkillTreePanel() {
  const {
    skillTree,
    updateSkillTree,
    workoutDays,
    morningRoutine,
  } = useAppData()
  const { evaluations } = useSkillTreeEvaluation()
  const { writeSlots, advanceStage, resetTrack, undoMastery } = useSkillStageActions()
  const exerciseNames = useLinkableExerciseNames()
  const today = useTodayKey()
  const week = blockWeekInfo(skillTree, today)

  const [filter, setFilter] = useState<Filter>('active')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    },
    [],
  )
  function showToast(message: string) {
    setToast(message)
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 5000)
  }
  const [expandedRaw, setExpanded] = useLocalStorage<string[]>('tn.skillTree.expanded.v2', [
    'sk-muscle-up',
  ])
  const expanded = Array.isArray(expandedRaw) ? expandedRaw : []

  const [branchDraft, setBranchDraft] = useState<{ branch: SkillBranch; isNew: boolean } | null>(null)
  const [nodeDraft, setNodeDraft] = useState<{ node: SkillNode; isNew: boolean } | null>(null)
  const [tierModal, setTierModal] = useState<{ nodeId: string; mode: TierModalMode } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const visible = evaluations.filter((e) => matchesFilter(e, filter))
  const counts = useMemo(
    () => ({
      all: evaluations.length,
      active: evaluations.filter((e) => e.focus === 'active').length,
      queued: evaluations.filter((e) => e.focus === 'queued').length,
      completed: evaluations.filter((e) => e.focus === 'completed').length,
      pull: evaluations.filter((e) => trackCategory(e.branch.id)?.kind === 'pull').length,
      push: evaluations.filter((e) => trackCategory(e.branch.id)?.kind === 'push').length,
      activePull: evaluations.filter((e) => e.focus === 'active' && trackCategory(e.branch.id)?.kind === 'pull').length,
      activePush: evaluations.filter((e) => e.focus === 'active' && trackCategory(e.branch.id)?.kind === 'push').length,
    }),
    [evaluations],
  )

  const modalBranch = tierModal
    ? (evaluations.find((e) => e.nodes.some((n) => n.node.id === tierModal.nodeId)) ?? null)
    : null
  const modalNode = modalBranch?.nodes.find((n) => n.node.id === tierModal?.nodeId) ?? null

  function toggle(id: string) {
    setExpanded(expanded.includes(id) ? expanded.filter((x) => x !== id) : [...expanded, id])
  }

  /** Same-category track already in focus (it moves to the queue when `branchId` joins). */
  function focusRival(branchId: string): BranchEvaluation | null {
    const kind = trackCategory(branchId)?.kind
    if (!kind || skillTree.branches[branchId]?.status === 'active_focus') return null
    return (
      evaluations.find(
        (e) => e.branch.id !== branchId && e.focus === 'active' && trackCategory(e.branch.id)?.kind === kind,
      ) ?? null
    )
  }

  /** Activate a tier; a track joining focus swaps out the focused track of its category. */
  function activateWithFocus(nodeId: string, slotsApplied: boolean): string | null {
    const node = skillTree.nodes[nodeId]
    if (!node) return null
    const rival = focusRival(node.branchId)
    updateSkillTree((prev) => soloFocusInCategory(activateTier(prev, nodeId, { slotsApplied }), node.branchId))
    return rival ? `${rival.branch.title} עבר לבתור.` : null
  }

  function confirmTier(apply: boolean) {
    if (!tierModal) return
    const node = skillTree.nodes[tierModal.nodeId]
    if (!node) return
    const message = apply ? writeSlots(node) : null
    let swapped: string | null = null
    if (node.tierStatus === 'active') {
      updateSkillTree((prev) => markSlotsApplied(prev, node.id))
    } else {
      swapped = activateWithFocus(node.id, apply)
    }
    const text = [message, swapped].filter(Boolean).join(' ')
    if (text) showToast(text)
    setTierModal(null)
  }

  /** Mastery gate passed: swap the next tier in right away (1 out, 1 in) and advance. */
  function promote(nodeId: string) {
    const message = advanceStage(nodeId)
    if (message) showToast(message)
  }

  /** Track card toggle: בפוקוס פעיל ↔ בתור. */
  function toggleFocus(e: BranchEvaluation) {
    if (e.focus === 'active') {
      updateSkillTree((prev) => queueBranch(prev, e.branch.id))
      return
    }
    const target = e.nodes.find((n) => n.status !== 'mastered')
    if (!target) return
    const previews = planSlotSwap(target.node.slots, workoutDays, morningRoutine)
    if (previews.some((p) => !p.missingTarget && !p.alreadyApplied)) {
      setTierModal({ nodeId: target.node.id, mode: 'confirm' })
      return
    }
    const swapped = activateWithFocus(
      target.node.id,
      previews.length > 0 && previews.every((p) => p.alreadyApplied),
    )
    showToast(`${e.branch.title} בפוקוס פעיל 🎯${swapped ? ` · ${swapped}` : ''}`)
  }

  const filters: { id: Filter; label: string }[] = [
    { id: 'active', label: 'בפוקוס פעיל' },
    { id: 'pull', label: 'משיכה' },
    { id: 'push', label: 'דחיפה / רגליים' },
    { id: 'all', label: 'הכל' },
    { id: 'queued', label: 'בתור' },
    { id: 'completed', label: 'נשלטו' },
  ]

  return (
    <div className="space-y-4" dir="rtl">
      <section className="space-y-2.5 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-4 py-3 text-white shadow-lg shadow-blue-700/25">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-1.5 font-display text-lg font-bold leading-tight">
            <GitBranch className="size-4" strokeWidth={2.25} />
            עץ מיומנויות
          </h2>
          <button
            type="button"
            aria-label="הגדרות בלוק"
            onClick={() => setSettingsOpen(true)}
            className="flex size-8 items-center justify-center rounded-xl bg-white/15 text-white transition hover:bg-white/25"
          >
            <Settings2 className="size-4" strokeWidth={2} />
          </button>
        </div>
        <BlockWeeksStrip
          week={week.started ? week.week : 0}
          total={skillTree.blockWeeks}
          deload={skillTree.deloadWeeks}
          benchmark={skillTree.benchmarkWeek}
        />
        <FocusMeter count={counts.active} pull={counts.activePull} push={counts.activePush} />
      </section>

      <HowItWorks />

      <div className="no-scrollbar -mx-4 overflow-x-auto overscroll-x-contain px-4" role="tablist" aria-label="סינון מסלולים">
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
              expanded={expanded.includes(e.branch.id)}
              onToggle={() => toggle(e.branch.id)}
              onEditBranch={() => setBranchDraft({ branch: e.branch, isNew: false })}
              onAddNode={() => setNodeDraft({ node: newNode(skillTree, e.branch.id), isNew: true })}
              onOpenNode={(nodeId) => setTierModal({ nodeId, mode: 'details' })}
              onEditNode={(nodeId) => {
                const node = skillTree.nodes[nodeId]
                if (node) setNodeDraft({ node, isNew: false })
              }}
              onQuick={(nodeId, measureId, value) =>
                updateSkillTree((prev) => setMeasureManual(prev, nodeId, measureId, value))
              }
              onSwapNode={(nodeId) => setTierModal({ nodeId, mode: 'confirm' })}
              onActivateNode={(nodeId) => setTierModal({ nodeId, mode: 'confirm' })}
              onPromote={promote}
              onToggleFocus={() => toggleFocus(e)}
              onResetTrack={() => showToast(resetTrack(e.branch.id))}
              onUndoMastery={(nodeId) => {
                const message = undoMastery(nodeId)
                if (message) showToast(message)
              }}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-muted">
          אין מסלולים בסינון הזה.
        </p>
      )}

      <button
        type="button"
        onClick={() => setBranchDraft({ branch: newBranch(skillTree), isNew: true })}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 bg-white text-sm font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
      >
        <Plus className="size-4" strokeWidth={2.5} />
        מסלול סקיל חדש
      </button>

      {toast ? (
        <p
          role="status"
          className="fixed inset-x-3 bottom-28 z-[60] mx-auto max-w-md rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold leading-snug text-white shadow-lg shadow-emerald-700/30"
        >
          {toast}
        </p>
      ) : null}

      <SkillTierModal
        open={!!modalNode}
        mode={tierModal?.mode ?? 'details'}
        evaluation={modalNode}
        branch={modalBranch}
        focusCount={counts.active}
        focusRival={modalBranch ? (focusRival(modalBranch.branch.id)?.branch.title ?? null) : null}
        onClose={() => setTierModal(null)}
        onModeChange={(mode) => {
          if (tierModal) setTierModal({ ...tierModal, mode })
        }}
        onEdit={() => {
          const node = tierModal ? skillTree.nodes[tierModal.nodeId] : null
          setTierModal(null)
          if (node) setNodeDraft({ node, isNew: false })
        }}
        onMove={(dir) => {
          if (tierModal) updateSkillTree((prev) => moveNode(prev, tierModal.nodeId, dir))
        }}
        onConfirm={() => confirmTier(true)}
        onActivateOnly={() => confirmTier(false)}
      />
      <SkillBranchModal
        open={!!branchDraft}
        branch={branchDraft?.branch ?? null}
        isNew={branchDraft?.isNew ?? false}
        onClose={() => setBranchDraft(null)}
        onSave={(branch) => {
          // The chosen status always wins; joining focus keeps 1 pull + 1 push.
          updateSkillTree((prev) => {
            const next = upsertBranch(prev, branch)
            return branch.status === 'active_focus' ? soloFocusInCategory(next, branch.id) : next
          })
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
          updateSkillTree((prev) =>
            nodeDraft?.isNew ? soloFocusInCategory(addStage(prev, node), node.branchId) : upsertNode(prev, node),
          )
          setNodeDraft(null)
        }}
        onDelete={(id) => {
          updateSkillTree((prev) => deleteNode(prev, id))
          setNodeDraft(null)
        }}
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
