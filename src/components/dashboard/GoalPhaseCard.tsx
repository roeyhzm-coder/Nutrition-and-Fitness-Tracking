import { useEffect, useState } from 'react'
import { Flag, Pencil } from 'lucide-react'
import {
  calcProcessDay,
  PHASE_ACTIVE_CLASS,
  PHASE_LABELS,
  PHASES,
  type GoalSettings,
  type Phase,
} from '../../lib/types'
import {
  displayDecimal,
  formatKg,
  formatPct,
  parseDecimal,
  parseInteger,
} from '../../lib/numericInput'
import { relativeWeekNumber } from '../../lib/weeklyConsistency'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { IconButton } from '../ui/IconButton'
import { Modal } from '../ui/Modal'
import { NumericInput } from '../ui/NumericInput'
import { ProgressBar } from '../ui/ProgressBar'

type GoalPhaseCardProps = {
  phase: Phase
  onPhaseChange: (phase: Phase) => void
  goal: GoalSettings
  onSaveGoal: (goal: GoalSettings) => void
  currentWeight?: number | null
  onFinishPhase: () => void
}

type GoalForm = {
  startDate: string
  totalDays: string
  targetWeightKg: string
  targetBodyFatPct: string
  phaseName: string
  phaseNumber: string
  totalPhases: string
  startWeightKg: string
  masterStartDate: string
  masterTotalDays: string
  masterTargetWeightKg: string
  masterTargetBodyFatPct: string
  masterName: string
}

function toForm(goal: GoalSettings): GoalForm {
  return {
    startDate: goal.startDate,
    totalDays: displayDecimal(goal.totalDays),
    targetWeightKg: displayDecimal(goal.targetWeightKg),
    targetBodyFatPct: displayDecimal(goal.targetBodyFatPct),
    phaseName: goal.phaseName,
    phaseNumber: displayDecimal(goal.phaseNumber),
    totalPhases: displayDecimal(goal.totalPhases),
    startWeightKg: displayDecimal(goal.startWeightKg),
    masterStartDate: goal.masterStartDate,
    masterTotalDays: displayDecimal(goal.masterTotalDays),
    masterTargetWeightKg: displayDecimal(goal.masterTargetWeightKg),
    masterTargetBodyFatPct: displayDecimal(goal.masterTargetBodyFatPct),
    masterName: goal.masterName,
  }
}

export function GoalPhaseCard({
  phase,
  onPhaseChange,
  goal,
  onSaveGoal,
  currentWeight,
  onFinishPhase,
}: GoalPhaseCardProps) {
  const [open, setOpen] = useState<'short' | 'master' | null>(null)
  const [form, setForm] = useState<GoalForm>(() => toForm(goal))
  const shortDay = calcProcessDay(goal.startDate, goal.totalDays)
  const masterDay = calcProcessDay(goal.masterStartDate, goal.masterTotalDays)
  const relativeWeek = relativeWeekNumber(goal.startDate)
  const phaseWeeks = Math.max(1, Math.round(goal.totalDays / 7))

  useEffect(() => {
    if (open) setForm(toForm(goal))
  }, [open, goal])

  function save() {
    onSaveGoal({
      startDate: form.startDate,
      totalDays: Math.max(1, parseInteger(form.totalDays) ?? 1),
      targetWeightKg: parseDecimal(form.targetWeightKg),
      targetBodyFatPct: parseDecimal(form.targetBodyFatPct),
      weeklyWorkoutTarget: goal.weeklyWorkoutTarget,
      masterStartDate: form.masterStartDate,
      masterTotalDays: Math.max(1, parseInteger(form.masterTotalDays) ?? 1),
      masterTargetWeightKg: parseDecimal(form.masterTargetWeightKg),
      masterTargetBodyFatPct: parseDecimal(form.masterTargetBodyFatPct),
      masterName: form.masterName.trim() || 'גוף אל יווני',
      phaseName: form.phaseName.trim() || 'מסה מבוססת הרגלים',
      phaseNumber: Math.max(1, parseInteger(form.phaseNumber) ?? 1),
      totalPhases: Math.max(1, parseInteger(form.totalPhases) ?? 6),
      startWeightKg: parseDecimal(form.startWeightKg),
    })
    setOpen(null)
  }

  return (
    <>
      <Card
        title="מטרת על ותהליך"
        className="border-blue-100 bg-gradient-to-b from-blue-50 to-white"
      >
        <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-50 p-1.5">
          {PHASES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPhaseChange(p)}
              className={[
                'min-h-11 rounded-xl px-3 py-2 text-sm font-bold transition',
                phase === p
                  ? PHASE_ACTIVE_CLASS[p]
                  : 'text-muted hover:bg-slate-100 hover:text-text',
              ].join(' ')}
            >
              {PHASE_LABELS[p]}
            </button>
          ))}
        </div>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text">
                שלב {goal.phaseNumber} מתוך {goal.totalPhases} ·{' '}
                {PHASE_LABELS[phase]}
              </p>
              <p className="text-xs font-medium text-accent">{goal.phaseName}</p>
            </div>
            <IconButton
              label="עריכת שלב"
              tone="accent"
              onClick={() => setOpen('short')}
            >
              <Pencil className="size-4" strokeWidth={1.75} />
            </IconButton>
          </div>
          <p className="font-display text-3xl font-extrabold tabular-nums text-text">
            יום {shortDay} מתוך {goal.totalDays}
          </p>
          <p className="mt-1 text-xs text-muted">
            שבוע {relativeWeek} מתוך {phaseWeeks} · התחלה{' '}
            {new Date(goal.startDate).toLocaleDateString('he-IL')}
          </p>
          <div className="mt-3">
            <ProgressBar value={shortDay} max={goal.totalDays} color="primary" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white px-3 py-2.5 text-sm">
              <p className="text-xs text-muted">משקל יעד לשלב</p>
              <p className="mt-1 font-display text-lg font-bold tabular-nums text-text">
                {goal.targetWeightKg != null
                  ? `${formatKg(goal.targetWeightKg)} ק״ג`
                  : '—'}
              </p>
              <p className="text-[11px] text-muted">
                מ-{formatKg(goal.startWeightKg)} · נוכחי:{' '}
                {currentWeight != null ? formatKg(currentWeight) : '—'}
              </p>
            </div>
            <div className="rounded-2xl bg-white px-3 py-2.5 text-sm">
              <p className="text-xs text-muted">תקרת שומן</p>
              <p className="mt-1 font-display text-lg font-bold tabular-nums text-text">
                {goal.targetBodyFatPct != null
                  ? `${formatPct(goal.targetBodyFatPct)}%`
                  : '—'}
              </p>
            </div>
          </div>
          <Button
            className="mt-3 w-full"
            variant="surface"
            onClick={onFinishPhase}
          >
            <Flag className="size-4" strokeWidth={1.75} />
            סיום שלב נוכחי והגדרת שלב חדש
          </Button>
        </section>

        <section className="mt-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text">מטרת על ארוכת טווח</p>
              <p className="text-xs font-medium text-accent">{goal.masterName}</p>
            </div>
            <IconButton
              label="עריכת מטרת על"
              tone="accent"
              onClick={() => setOpen('master')}
            >
              <Pencil className="size-4" strokeWidth={1.75} />
            </IconButton>
          </div>
          <p className="font-display text-2xl font-extrabold tabular-nums text-text">
            יום {masterDay} מתוך {goal.masterTotalDays}
          </p>
          <p className="mt-1 text-xs text-muted">
            יעד: {formatKg(goal.masterTargetWeightKg ?? 80)} ק״ג ו-
            {formatPct(goal.masterTargetBodyFatPct ?? 9)}% שומן
          </p>
          <div className="mt-3">
            <ProgressBar
              value={masterDay}
              max={goal.masterTotalDays}
              color="accent"
            />
          </div>
        </section>
      </Card>

      <Modal
        open={open === 'short'}
        title="עריכת שלב נוכחי"
        onClose={() => setOpen(null)}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <label className="block text-xs text-muted">
            שם השלב
            <input
              value={form.phaseName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, phaseName: e.target.value }))
              }
              className="mt-1 field"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-muted">
              מספר שלב
              <NumericInput
                decimals={0}
                value={form.phaseNumber}
                onChange={(phaseNumber) =>
                  setForm((prev) => ({ ...prev, phaseNumber }))
                }
              />
            </label>
            <label className="block text-xs text-muted">
              סה״כ שלבים
              <NumericInput
                decimals={0}
                value={form.totalPhases}
                onChange={(totalPhases) =>
                  setForm((prev) => ({ ...prev, totalPhases }))
                }
              />
            </label>
          </div>
          <label className="block text-xs text-muted">
            תאריך תחילת שלב
            <input
              type="date"
              value={form.startDate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="mt-1 field"
              required
            />
          </label>
          <label className="block text-xs text-muted">
            סה״כ ימי שלב
            <NumericInput
              decimals={0}
              value={form.totalDays}
              onChange={(totalDays) =>
                setForm((prev) => ({ ...prev, totalDays }))
              }
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-muted">
              משקל התחלה
              <NumericInput
                value={form.startWeightKg}
                onChange={(startWeightKg) =>
                  setForm((prev) => ({ ...prev, startWeightKg }))
                }
              />
            </label>
            <label className="block text-xs text-muted">
              משקל יעד
              <NumericInput
                value={form.targetWeightKg}
                onChange={(targetWeightKg) =>
                  setForm((prev) => ({ ...prev, targetWeightKg }))
                }
              />
            </label>
          </div>
          <label className="block text-xs text-muted">
            אחוזי שומן יעד (מקסימום)
            <NumericInput
              value={form.targetBodyFatPct}
              onChange={(targetBodyFatPct) =>
                setForm((prev) => ({ ...prev, targetBodyFatPct }))
              }
            />
          </label>
          <Button type="submit" className="w-full" variant="accent">
            שמור
          </Button>
        </form>
      </Modal>

      <Modal
        open={open === 'master'}
        title={`עריכת מטרת על · ${form.masterName || 'גוף אל יווני'}`}
        onClose={() => setOpen(null)}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <label className="block text-xs text-muted">
            שם מטרת העל
            <input
              value={form.masterName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, masterName: e.target.value }))
              }
              className="mt-1 field"
            />
          </label>
          <label className="block text-xs text-muted">
            תאריך התחלת מטרת על
            <input
              type="date"
              value={form.masterStartDate}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  masterStartDate: e.target.value,
                }))
              }
              className="mt-1 field"
              required
            />
          </label>
          <label className="block text-xs text-muted">
            סה״כ ימים
            <NumericInput
              decimals={0}
              value={form.masterTotalDays}
              onChange={(masterTotalDays) =>
                setForm((prev) => ({ ...prev, masterTotalDays }))
              }
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-muted">
              משקל יעד (ק״ג)
              <NumericInput
                value={form.masterTargetWeightKg}
                onChange={(masterTargetWeightKg) =>
                  setForm((prev) => ({ ...prev, masterTargetWeightKg }))
                }
              />
            </label>
            <label className="block text-xs text-muted">
              שומן יעד (%)
              <NumericInput
                value={form.masterTargetBodyFatPct}
                onChange={(masterTargetBodyFatPct) =>
                  setForm((prev) => ({ ...prev, masterTargetBodyFatPct }))
                }
              />
            </label>
          </div>
          <Button type="submit" className="w-full" variant="accent">
            שמור
          </Button>
        </form>
      </Modal>
    </>
  )
}
