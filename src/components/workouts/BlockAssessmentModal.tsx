import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Flag, Minus, Target, TrendingDown, TrendingUp } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { useWorkoutSession } from '../../context/WorkoutSessionContext'
import {
  BASELINE_SOURCE_LABELS,
  benchmarkDelta,
  blockTimeline,
  calibrate,
  calibrationPatch,
  formatDateHe,
  formatLoad,
  liveBlockCandidates,
  nextBlockLabel,
  planExercisesNamed,
  startCalibrationPatch,
  type BenchmarkCandidate,
  type BenchmarkDelta,
} from '../../lib/blockCycle'
import {
  baselineForBlock,
  baselineIdFor,
  type BaselineRow,
  type BenchmarkLoad,
  type BenchmarkRow,
  type BlockBaseline,
  type BlockReport,
} from '../../lib/blockReport'
import { parseDecimal } from '../../lib/numericInput'
import { activateTier, liveNodes, masterTier, setBlockSettings, type SkillSlotRecipe } from '../../lib/skillTree'
import { focusSkillItems } from '../../lib/skillWorkout'
import { localDateKey, uid } from '../../lib/types'
import { useSkillStageActions, useSkillTreeEvaluation } from '../skills/useSkillTree'
import { Button } from '../ui/button'
import { Modal } from '../ui/Modal'
import { NumericInput } from '../ui/NumericInput'

export type BenchmarkMode = 'start' | 'end'

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

/** A typed test result (reps / seconds required, weight only for loaded work). */
function typedLoad(c: BenchmarkCandidate, input: TestInput | undefined): BenchmarkLoad | null {
  const reps = parseDecimal(input?.reps ?? '')
  if (reps == null || !(reps > 0)) return null
  const weight = parseDecimal(input?.weight ?? '')
  return { weightKg: c.kind === 'loaded' && weight != null && weight > 0 ? weight : null, reps: Math.round(reps) }
}

/**
 * Unified strength benchmark lifecycle ("מבדקי חוזק — פתיחה / סיום בלוק").
 * - start: record the official start-of-block baseline (optionally calibrating
 *   the plan's working weights to the tested numbers).
 * - end: baseline vs peak per exercise, next-block calibration, archive the
 *   report, and hand the peaks over as the next block's baseline.
 */
export function BlockAssessmentModal({
  open,
  mode = 'end',
  onClose,
  onDone,
}: {
  open: boolean
  mode?: BenchmarkMode
  onClose: () => void
  onDone: (message: string) => void
}) {
  const { skillTree, updateSkillTree, workoutDays, setLogs, updateExercise, bodyLogHistory, latestBody } = useAppData()
  const { workoutLogs } = useWorkoutSession()
  const { evaluations } = useSkillTreeEvaluation()
  const { writeRecipes } = useSkillStageActions()
  const timeline = blockTimeline(skillTree)
  const isStart = mode === 'start'
  const currentBaseline = baselineForBlock(skillTree.blockBaselines, skillTree.blockStartDate)

  const candidates = useMemo(
    () =>
      liveBlockCandidates(skillTree, {
        days: workoutDays,
        workoutLogs,
        setLogs,
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
    // Start mode: pre-fill with the recorded baseline (a handover from the
    // previous block shows up here ready to confirm — zero re-entry).
    const prefill: Record<string, TestInput> = {}
    if (isStart && currentBaseline) {
      for (const r of currentBaseline.rows) {
        prefill[r.exerciseName] = {
          weight: r.load.weightKg != null ? String(r.load.weightKg) : '',
          reps: String(r.load.reps),
          apply: false,
        }
      }
    }
    setTests(prefill)
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
  }, [open, mode])

  const rows = candidates.map((c) => {
    const input = tests[c.exerciseName]
    const typed = typedLoad(c, input)
    // End: a typed result is the fresh peak test. Start: it is the new baseline.
    const peak = isStart ? c.peak : (typed ?? c.peak)
    const tested = !isStart && typed != null
    const baseline = isStart ? (typed ?? c.baseline) : c.baseline
    const delta = benchmarkDelta(c.kind, baseline, peak)
    const cal = isStart ? null : calibrate(c.kind, peak, delta, c.exerciseName)
    const planned = planExercisesNamed(workoutDays, c.exerciseName)
    const inPlan = planned.length > 0
    const canApply = isStart
      ? c.kind === 'loaded' && typed?.weightKg != null && inPlan
      : !!cal && cal.delta > 0 && inPlan
    const apply = canApply && (input?.apply ?? !isStart)
    return { c, input, typed, peak, tested, baseline, delta, cal, canApply, apply }
  })
  const logged = rows.filter((r) => r.c.peak || r.tested || r.c.baselineSource === 'test' || r.c.baselineSource === 'handover')
  const unlogged = rows.filter((r) => !logged.includes(r))
  // Start mode lists every block exercise up front (nothing is "unlogged" at a test).
  const mainRows = isStart ? rows : logged
  const extraRows = isStart ? [] : unlogged

  function patchTest(name: string, patch: Partial<TestInput>) {
    setTests((prev) => {
      const current: TestInput = prev[name] ?? { weight: '', reps: '', apply: !isStart }
      return { ...prev, [name]: { ...current, ...patch } }
    })
  }

  const validStart = /^\d{4}-\d{2}-\d{2}$/.test(nextStart)
  const applyCount = rows.filter((r) => r.apply).length
  const typedCount = rows.filter((r) => r.typed).length

  function saveStart() {
    if (savingRef.current || !typedCount) return
    savingRef.current = true
    setSaving(true)
    const at = new Date().toISOString()
    const typedRows: BaselineRow[] = rows
      .filter((r) => r.typed)
      .map((r) => ({ exerciseName: r.c.exerciseName, kind: r.c.kind, load: r.typed!, source: 'test' }))
    const typedNames = new Set(typedRows.map((r) => r.exerciseName))
    const kept = (currentBaseline?.rows ?? []).filter((r) => !typedNames.has(r.exerciseName))
    const record: BlockBaseline = {
      id: baselineIdFor(skillTree.blockStartDate),
      blockLabel: skillTree.blockLabel,
      startDate: skillTree.blockStartDate,
      rows: [...kept, ...typedRows],
      recordedAt: at,
      updatedAt: at,
    }
    // Optional: calibrate the plan's working weights to the tested numbers.
    for (const r of rows) {
      if (!r.apply || r.typed?.weightKg == null) continue
      for (const { dayId, exercise } of planExercisesNamed(workoutDays, r.c.exerciseName)) {
        const patch = startCalibrationPatch(exercise, r.typed.weightKg)
        if (patch) updateExercise(dayId, exercise.id, patch)
      }
    }
    updateSkillTree((prev) => ({ ...prev, blockBaselines: { ...prev.blockBaselines, [record.id]: record } }))
    onDone(
      `🎯 בסיס פתיחה של ${skillTree.blockLabel} נשמר · ${typedRows.length} תרגילים${
        applyCount ? ` · ${applyCount} משקלי עבודה כוילו בתוכנית` : ''
      }`,
    )
  }

  function saveEnd() {
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

    // 3. Archive the report, hand the peaks over as the next block's baseline, open the new block.
    const fatAtStart =
      [...bodyLogHistory].reverse().find((e) => e.bodyFatPct != null && e.date <= skillTree.blockStartDate)
        ?.bodyFatPct ??
      bodyLogHistory.find((e) => e.bodyFatPct != null)?.bodyFatPct ??
      null
    const measured = rows.filter((r) => r.peak || r.tested)
    const reportRows: BenchmarkRow[] = measured.map((r) => ({
      exerciseName: r.c.exerciseName,
      kind: r.c.kind,
      baseline: r.baseline,
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
    const label = nextLabel.trim() || nextBlockLabel(skillTree.blockLabel)
    const handover: BlockBaseline = {
      id: baselineIdFor(nextStart),
      blockLabel: label,
      startDate: nextStart,
      rows: measured
        .filter((r) => r.peak)
        .map((r) => ({ exerciseName: r.c.exerciseName, kind: r.c.kind, load: r.peak!, source: 'handover' })),
      recordedAt: closedAt,
      updatedAt: closedAt,
    }
    const weeks = Math.min(52, Math.max(1, Math.round(parseDecimal(nextWeeks) ?? skillTree.blockWeeks)))
    updateSkillTree((prev) => {
      let next = prev
      for (const m of moves) {
        next = m.nextId ? activateTier(next, m.nextId, { slotsApplied: true }) : masterTier(next, m.nodeId)
      }
      next = {
        ...next,
        blockReports: { ...next.blockReports, [report.id]: report },
        ...(handover.rows.length ? { blockBaselines: { ...next.blockBaselines, [handover.id]: handover } } : {}),
      }
      return setBlockSettings(next, {
        blockLabel: label,
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
      } · ${label} התחיל עם ${handover.rows.length} ערכי בסיס פתיחה מהשיאים.`,
    )
  }

  function renderRow(r: (typeof rows)[number]) {
    const { c, input } = r
    const isHold = c.kind === 'hold'
    const baselineLabel = isStart
      ? r.typed
        ? 'בסיס פתיחה (מבדק עכשיו)'
        : `בסיס נוכחי${c.baselineSource ? ` · ${BASELINE_SOURCE_LABELS[c.baselineSource]}` : ''}`
      : `בסיס פתיחה${c.baselineSource ? ` · ${BASELINE_SOURCE_LABELS[c.baselineSource]}` : ''}`
    const placeholderLoad = isStart ? (c.baseline ?? c.peak) : c.peak
    return (
      <li key={c.exerciseName} className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 text-sm font-bold leading-snug text-slate-900" dir="auto">
            {c.exerciseName}
          </p>
          {isStart ? null : <TrendBadge delta={r.delta} />}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className={`rounded-xl px-2.5 py-1.5 ${isStart && r.typed ? 'bg-indigo-50' : 'bg-slate-50'}`}>
            <p className="text-[10px] text-muted">{baselineLabel}</p>
            <p className="font-semibold tabular-nums text-slate-800">{formatLoad(r.baseline, c.kind)}</p>
          </div>
          <div className="rounded-xl bg-blue-50 px-2.5 py-1.5">
            <p className="text-[10px] text-blue-700">{r.tested ? 'שיא (מבדק סיום עכשיו)' : 'שיא בבלוק עד היום'}</p>
            <p className="font-semibold tabular-nums text-slate-900">{formatLoad(r.peak, c.kind)}</p>
          </div>
        </div>
        <div className={`grid gap-2 ${c.kind === 'loaded' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {c.kind === 'loaded' ? (
            <label className="block text-[11px] text-muted">
              {isStart ? 'משקל עבודה מקסימלי (ק"ג)' : 'מבדק: משקל (ק"ג)'}
              <NumericInput
                value={input?.weight ?? ''}
                onChange={(weight) => patchTest(c.exerciseName, { weight })}
                placeholder={placeholderLoad?.weightKg != null ? String(placeholderLoad.weightKg) : '0'}
                className="mt-1 field h-10"
              />
            </label>
          ) : null}
          <label className="block text-[11px] text-muted">
            {isHold ? 'החזקה (שניות)' : 'חזרות'}
            <NumericInput
              decimals={0}
              value={input?.reps ?? ''}
              onChange={(reps) => patchTest(c.exerciseName, { reps })}
              placeholder={placeholderLoad ? String(placeholderLoad.reps) : '—'}
              className="mt-1 field h-10"
            />
          </label>
        </div>
        {isStart ? (
          r.canApply ? (
            <label className="flex items-center gap-2 rounded-xl bg-indigo-50/70 px-2.5 py-2 text-[11px] font-semibold text-indigo-900">
              <input
                type="checkbox"
                className="size-4 accent-indigo-600"
                checked={r.apply}
                onChange={(e) => patchTest(c.exerciseName, { apply: e.target.checked })}
              />
              כייל את משקל העבודה בתוכנית ל-{r.typed?.weightKg} ק"ג (הסט הכבד; שאר הסטים זזים בהתאם)
            </label>
          ) : null
        ) : r.cal ? (
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

  const title = isStart ? '🎯 מבדק פתיחת בלוק (כיול משקלים)' : '🏁 סיום בלוק ומבדקי חוזק'

  return (
    <Modal open={open} title={title} onClose={onClose} wide>
      <div className="space-y-4" dir="rtl">
        <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
          <span className="font-bold text-slate-800">{timeline.name}</span> · {formatDateHe(timeline.startDate)} ➔{' '}
          {formatDateHe(timeline.endDate)}.{' '}
          {isStart
            ? currentBaseline
              ? `בסיס פתיחה רשמי נרשם ב-${formatDateHe(currentBaseline.recordedAt.slice(0, 10))} — אפשר לעדכן. הזן את משקל העבודה המקסימלי × חזרות / שניות החזקה שבדקת עכשיו.`
              : 'טרם נרשם בסיס פתיחה לבלוק הזה. הזן את משקל העבודה המקסימלי × חזרות / שניות החזקה שבדקת עכשיו — זה יהיה הבסיס הרשמי לכל השוואה.'
            : 'הבסיס = מבדק הפתיחה (או שיאי הבלוק הקודם; אחרת הסט הטוב באימון הראשון), השיא = הסט הטוב ביותר בבלוק. הזן תוצאת מבדק חדשה כדי לעדכן את השיא. בשמירה, השיאים הופכים אוטומטית לבסיס הפתיחה של הבלוק הבא.'}
        </p>

        <section className="space-y-2">
          <h3 className="text-sm font-extrabold text-slate-900">
            {isStart ? '1. מבדקי פתיחה' : '1. השוואת כוח: בסיס פתיחה מול שיא'}
          </h3>
          {mainRows.length ? (
            <ul className="space-y-2">{mainRows.map(renderRow)}</ul>
          ) : (
            <p className="text-xs text-muted">אין עדיין סטים מתועדים בבלוק — אפשר להזין מבדקים למטה.</p>
          )}
          {extraRows.length ? (
            <div>
              <button
                type="button"
                onClick={() => setShowUnlogged((v) => !v)}
                aria-expanded={showUnlogged}
                className="flex w-full items-center justify-between rounded-xl px-1 py-2 text-xs font-bold text-slate-600"
              >
                תרגילים ללא תיעוד בבלוק ({extraRows.length}) — הזנת מבדק
                <ChevronDown className={`size-4 transition ${showUnlogged ? 'rotate-180' : ''}`} />
              </button>
              {showUnlogged ? <ul className="space-y-2">{extraRows.map(renderRow)}</ul> : null}
            </div>
          ) : null}
        </section>

        {isStart ? (
          <Button type="button" variant="accent" className="w-full" disabled={saving || !typedCount} onClick={saveStart}>
            <Target className="size-4" strokeWidth={2} />
            {saving ? 'שומר…' : `שמור בסיס פתיחה (${typedCount} תרגילים)`}
          </Button>
        ) : (
          <>
            <section className="space-y-2">
              <h3 className="text-sm font-extrabold text-slate-900">2. התאמת עומסים לבלוק הבא</h3>
              <p className="text-xs text-muted">
                שיפור ➔ חגורה (מתח / מקבילים) +2.5 ק"ג · משקולות יד +1-2 ק"ג (או +1-2 חזרות) · משקל גוף +1-2 חזרות
                · החזקות +5 שניות. לעולם לא פחות מהשיא. {applyCount} יעדים יעודכנו בתוכנית.
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

            <Button type="button" variant="accent" className="w-full" disabled={saving || !validStart} onClick={saveEnd}>
              <Flag className="size-4" strokeWidth={2} />
              {saving ? 'שומר…' : 'שמור מבדקים ופתח בלוק חדש'}
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}
