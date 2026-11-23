import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Flag, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { useWorkoutSession } from '../../context/WorkoutSessionContext'
import {
  benchmarkDelta,
  blockTimeline,
  buildBenchmarkCandidates,
  calibrate,
  calibrationPatch,
  formatDateHe,
  formatLoad,
  nextBlockLabel,
  planExercisesNamed,
  type BenchmarkCandidate,
  type BenchmarkDelta,
} from '../../lib/blockCycle'
import type { BenchmarkLoad, BenchmarkRow, BlockReport } from '../../lib/blockReport'
import { parseDecimal } from '../../lib/numericInput'
import { activateTier, liveNodes, masterTier, setBlockSettings, type SkillSlotRecipe } from '../../lib/skillTree'
import { focusSkillItems } from '../../lib/skillWorkout'
import { localDateKey, uid } from '../../lib/types'
import { useSkillStageActions, useSkillTreeEvaluation } from '../skills/useSkillTree'
import { Button } from '../ui/button'
import { Modal } from '../ui/Modal'
import { NumericInput } from '../ui/NumericInput'

type TestInput = { weight: string; reps: string; apply: boolean }

function TrendBadge({ delta }: { delta: BenchmarkDelta }) {
  if (delta.trend === 'none') {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">אין נתונים</span>
  }
  const tone =
    delta.trend === 'up'
      ? 'bg-emerald-50 text-emerald-700'
      : delta.trend === 'down'
        ? 'bg-rose-50 text-rose-700'
        : 'bg-slate-100 text-slate-600'
  const Icon = delta.trend === 'up' ? TrendingUp : delta.trend === 'down' ? TrendingDown : Minus
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}>
      <Icon className="size-3" strokeWidth={2.5} />
      <span dir="rtl">{delta.parts.join(' · ')}</span>
    </span>
  )
}

function testedPeak(c: BenchmarkCandidate, input: TestInput | undefined): { peak: BenchmarkLoad | null; tested: boolean } {
  const reps = parseDecimal(input?.reps ?? '')
  if (reps != null && reps > 0) {
    const weight = parseDecimal(input?.weight ?? '')
    return {
      peak: { weightKg: c.kind === 'loaded' && weight != null && weight > 0 ? weight : null, reps: Math.round(reps) },
      tested: true,
    }
  }
  return { peak: c.peak, tested: false }
}

/** End of block: baseline vs peak per exercise, fresh test inputs, next-block calibration, archive + new block. */
export function BlockAssessmentModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean
  onClose: () => void
  onDone: (message: string) => void
}) {
  const { skillTree, updateSkillTree, workoutDays, setLogs, updateExercise, bodyLogHistory, latestBody } = useAppData()
  const { workoutLogs } = useWorkoutSession()
  const { evaluations } = useSkillTreeEvaluation()
  const { writeRecipes } = useSkillStageActions()
  const timeline = blockTimeline(skillTree)

  const candidates = useMemo(
    () =>
      buildBenchmarkCandidates({
        days: workoutDays,
        workoutLogs,
        setLogs,
        since: skillTree.blockStartDate,
        extraExercises: focusSkillItems(skillTree, 'both').map((i) => i.exercise),
      }),
    [workoutDays, workoutLogs, setLogs, skillTree],
  )
  const ready = evaluations.filter((e) => e.focus === 'active' && e.activeNode?.gateReady)

  const [tests, setTests] = useState<Record<string, TestInput>>({})
  const [advance, setAdvance] = useState<Record<string, boolean>>({})
  const [nextLabel, setNextLabel] = useState('')
  const [nextTitle, setNextTitle] = useState('')
  const [nextStart, setNextStart] = useState('')
  const [nextWeeks, setNextWeeks] = useState('')
  const [note, setNote] = useState('')
  const [showUnlogged, setShowUnlogged] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  useEffect(() => {
    if (!open) return
    setTests({})
    setAdvance({})
    setNextLabel(nextBlockLabel(skillTree.blockLabel))
    setNextTitle(skillTree.blockTitle)
    setNextStart(localDateKey())
    setNextWeeks(String(skillTree.blockWeeks))
    setNote('')
    setShowUnlogged(false)
    setSaving(false)
    savingRef.current = false
    // Reset only when the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const rows = candidates.map((c) => {
    const input = tests[c.exerciseName]
    const { peak, tested } = testedPeak(c, input)
    const delta = benchmarkDelta(c.kind, c.baseline, peak)
    const cal = calibrate(c.kind, peak, delta)
    const inPlan = planExercisesNamed(workoutDays, c.exerciseName).length > 0
    const canApply = !!cal && cal.delta > 0 && inPlan
    return { c, input, peak, tested, delta, cal, canApply, apply: canApply && (input?.apply ?? true) }
  })
  const logged = rows.filter((r) => r.c.peak || r.tested)
  const unlogged = rows.filter((r) => !r.c.peak && !r.tested)

  function patchTest(name: string, patch: Partial<TestInput>) {
    setTests((prev) => {
      const current: TestInput = prev[name] ?? { weight: '', reps: '', apply: true }
      return { ...prev, [name]: { ...current, ...patch } }
    })
  }

  const validStart = /^\d{4}-\d{2}-\d{2}$/.test(nextStart)
  const applyCount = rows.filter((r) => r.apply).length

  function save() {
    if (savingRef.current || !validStart) return
    savingRef.current = true
    setSaving(true)
    const closedAt = new Date().toISOString()

    // 1. Skill Tree: advance every chosen stage at 100% (one batched plan swap).
    const advances = ready.filter((e) => advance[e.branch.id] ?? true)
    const recipes: SkillSlotRecipe[] = []
    const advanceLabels: string[] = []
    const moves: { nodeId: string; nextId: string | null }[] = []
    for (const e of advances) {
      const current = e.activeNode!.node
      const next = liveNodes(skillTree, current.branchId).find(
        (n) => n.order > current.order && n.tierStatus !== 'mastered',
      )
      if (next) recipes.push(...next.slots)
      moves.push({ nodeId: current.id, nextId: next?.id ?? null })
      advanceLabels.push(
        next
          ? `${e.branch.title}: שלב ${current.order} ➔ שלב ${next.order} (${next.title})`
          : `${e.branch.title}: נשלט במלואו`,
      )
    }
    if (recipes.length) writeRecipes(recipes)

    // 2. Next-block working targets written into the plan (functional updates).
    for (const r of rows) {
      if (!r.apply || !r.cal) continue
      for (const { dayId, exercise } of planExercisesNamed(workoutDays, r.c.exerciseName)) {
        const patch = calibrationPatch(exercise, r.cal)
        if (patch) updateExercise(dayId, exercise.id, patch)
      }
    }

    // 3. Archive the report and open the new block.
    const fatAtStart =
      [...bodyLogHistory].reverse().find((e) => e.bodyFatPct != null && e.date <= skillTree.blockStartDate)
        ?.bodyFatPct ??
      bodyLogHistory.find((e) => e.bodyFatPct != null)?.bodyFatPct ??
      null
    const reportRows: BenchmarkRow[] = rows
      .filter((r) => r.c.peak || r.tested)
      .map((r) => ({
        exerciseName: r.c.exerciseName,
        kind: r.c.kind,
        baseline: r.c.baseline,
        peak: r.peak,
        tested: r.tested,
        nextTarget: r.cal?.target ?? '',
        applied: r.apply,
      }))
    const report: BlockReport = {
      id: `br-${uid()}`,
      blockLabel: skillTree.blockLabel,
      blockTitle: skillTree.blockTitle,
      startDate: skillTree.blockStartDate,
      endDate: timeline.endDate,
      weeks: skillTree.blockWeeks,
      closedAt,
      rows: reportRows,
      skillAdvances: advanceLabels,
      bodyFatStart: fatAtStart,
      bodyFatEnd: latestBody.bodyFatPct,
      waistEnd: latestBody.waistCm,
      note: note.trim(),
      updatedAt: closedAt,
    }
    const weeks = Math.min(52, Math.max(1, Math.round(parseDecimal(nextWeeks) ?? skillTree.blockWeeks)))
    updateSkillTree((prev) => {
      let next = prev
      for (const m of moves) {
        next = m.nextId ? activateTier(next, m.nextId, { slotsApplied: true }) : masterTier(next, m.nodeId)
      }
      next = { ...next, blockReports: { ...next.blockReports, [report.id]: report } }
      return setBlockSettings(next, {
        blockLabel: nextLabel.trim() || nextBlockLabel(prev.blockLabel),
        blockTitle: nextTitle.trim(),
        blockStartDate: nextStart,
        blockWeeks: weeks,
        deloadWeeks: prev.deloadWeeks.filter((w) => w <= weeks),
        benchmarkWeek: weeks,
      })
    })
    onDone(
      `🏁 ${report.blockLabel} נסגר ונשמר בארכיון · ${applyCount} יעדים עודכנו בתוכנית${
        advanceLabels.length ? ` · ${advanceLabels.length} שלבים קודמו` : ''
      } · ${nextLabel.trim() || nextBlockLabel(skillTree.blockLabel)} התחיל.`,
    )
  }

  function renderRow(r: (typeof rows)[number]) {
    const { c, input } = r
    const isHold = c.kind === 'hold'
    return (
      <li key={c.exerciseName} className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 text-sm font-bold leading-snug text-slate-900" dir="auto">
            {c.exerciseName}
          </p>
          <TrendBadge delta={r.delta} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-slate-50 px-2.5 py-1.5">
            <p className="text-[10px] text-muted">בסיס תחילת בלוק</p>
            <p className="font-semibold tabular-nums text-slate-800">{formatLoad(c.baseline, c.kind)}</p>
          </div>
          <div className="rounded-xl bg-blue-50 px-2.5 py-1.5">
            <p className="text-[10px] text-blue-700">{r.tested ? 'שיא (מבדק עכשיו)' : 'שיא בבלוק'}</p>
            <p className="font-semibold tabular-nums text-slate-900">{formatLoad(r.peak, c.kind)}</p>
          </div>
        </div>
        <div className={`grid gap-2 ${c.kind === 'loaded' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {c.kind === 'loaded' ? (
            <label className="block text-[11px] text-muted">
              מבדק: משקל (ק"ג)
              <NumericInput
                value={input?.weight ?? ''}
                onChange={(weight) => patchTest(c.exerciseName, { weight })}
                placeholder={c.peak?.weightKg != null ? String(c.peak.weightKg) : '0'}
                className="mt-1 field h-10"
              />
            </label>
          ) : null}
          <label className="block text-[11px] text-muted">
            {isHold ? 'מבדק: החזקה (שניות)' : 'מבדק: חזרות'}
            <NumericInput
              decimals={0}
              value={input?.reps ?? ''}
              onChange={(reps) => patchTest(c.exerciseName, { reps })}
              placeholder={c.peak ? String(c.peak.reps) : '—'}
              className="mt-1 field h-10"
            />
          </label>
        </div>
        {r.cal ? (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50/70 px-2.5 py-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-emerald-800">יעד פתיחה לבלוק הבא</p>
              <p className="text-sm font-bold tabular-nums text-emerald-900">{r.cal.target}</p>
              <p className="text-[10px] text-emerald-700">{r.cal.reason}</p>
            </div>
            {r.canApply ? (
              <label className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-emerald-900">
                <input
                  type="checkbox"
                  className="size-4 accent-emerald-600"
                  checked={r.apply}
                  onChange={(e) => patchTest(c.exerciseName, { apply: e.target.checked })}
                />
                עדכן בתוכנית
              </label>
            ) : null}
          </div>
        ) : null}
      </li>
    )
  }

  return (
    <Modal open={open} title="🏁 סיום בלוק ומבדקי חוזק" onClose={onClose} wide>
      <div className="space-y-4" dir="rtl">
        <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
          <span className="font-bold text-slate-800">{timeline.name}</span> · {formatDateHe(timeline.startDate)} ➔{' '}
          {formatDateHe(timeline.endDate)}. הבסיס = הסט הטוב ביותר באימון הראשון בבלוק, השיא = הסט הטוב ביותר
          בבלוק. הזן תוצאת מבדק חדשה כדי לעדכן את השיא.
        </p>

        <section className="space-y-2">
          <h3 className="text-sm font-extrabold text-slate-900">1. השוואת כוח: לפני ואחרי</h3>
          {logged.length ? (
            <ul className="space-y-2">{logged.map(renderRow)}</ul>
          ) : (
            <p className="text-xs text-muted">אין עדיין סטים מתועדים בבלוק — אפשר להזין מבדקים למטה.</p>
          )}
          {unlogged.length ? (
            <div>
              <button
                type="button"
                onClick={() => setShowUnlogged((v) => !v)}
                aria-expanded={showUnlogged}
                className="flex w-full items-center justify-between rounded-xl px-1 py-2 text-xs font-bold text-slate-600"
              >
                תרגילים ללא תיעוד בבלוק ({unlogged.length}) — הזנת מבדק
                <ChevronDown className={`size-4 transition ${showUnlogged ? 'rotate-180' : ''}`} />
              </button>
              {showUnlogged ? <ul className="space-y-2">{unlogged.map(renderRow)}</ul> : null}
            </div>
          ) : null}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-extrabold text-slate-900">2. התאמת עומסים לבלוק הבא</h3>
          <p className="text-xs text-muted">
            שיפור ➔ +2.5 ק"ג בתרגילי משקל, +1-2 חזרות בתרגילי משקל גוף, +5 שניות בהחזקות. ללא שיפור ➔ חזרה על
            השיא. {applyCount} יעדים יעודכנו בתוכנית.
          </p>
          {ready.length ? (
            <ul className="space-y-1.5">
              {ready.map((e) => (
                <li key={e.branch.id}>
                  <label className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                    <input
                      type="checkbox"
                      className="size-4 accent-amber-600"
                      checked={advance[e.branch.id] ?? true}
                      onChange={(ev) => setAdvance((prev) => ({ ...prev, [e.branch.id]: ev.target.checked }))}
                    />
                    🌳 {e.branch.title} · שלב {e.activeNode?.node.order} ב-100% — קדם לשלב הבא
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted">אין שלבי עץ מיומנויות ב-100% כרגע.</p>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-extrabold text-slate-900">3. הבלוק הבא</h3>
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
            <label className="block text-xs text-muted">
              שם
              <input value={nextLabel} maxLength={60} onChange={(e) => setNextLabel(e.target.value)} className="field mt-1" />
            </label>
            <label className="block text-xs text-muted">
              נושא
              <input value={nextTitle} maxLength={120} onChange={(e) => setNextTitle(e.target.value)} className="field mt-1" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-muted">
              תאריך התחלה
              <input type="date" value={nextStart} onChange={(e) => setNextStart(e.target.value)} className="field mt-1" />
            </label>
            <label className="block text-xs text-muted">
              שבועות
              <NumericInput decimals={0} value={nextWeeks} onChange={setNextWeeks} />
            </label>
          </div>
          <label className="block text-xs text-muted">
            הערה לדו"ח (אופציונלי)
            <textarea
              rows={2}
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              className="field mt-1 resize-y"
              placeholder="איך הרגיש הבלוק, פציעות, מה לשנות…"
            />
          </label>
        </section>

        <Button type="button" variant="accent" className="w-full" disabled={saving || !validStart} onClick={save}>
          <Flag className="size-4" strokeWidth={2} />
          {saving ? 'שומר…' : 'שמור מבדקים, עדכן משקלים ופתח בלוק חדש'}
        </Button>
      </div>
    </Modal>
  )
}
