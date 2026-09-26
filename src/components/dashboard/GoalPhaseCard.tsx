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
import { relativeWeekNumber } from '../../lib/weeklyConsistency'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { IconButton } from '../ui/IconButton'
import { Modal } from '../ui/Modal'
import { ProgressBar } from '../ui/ProgressBar'

type GoalPhaseCardProps = {
  phase: Phase
  onPhaseChange: (phase: Phase) => void
  goal: GoalSettings
  onSaveGoal: (goal: GoalSettings) => void
  currentWeight?: number | null
  currentBodyFat?: number | null
  onFinishPhase: () => void
}

export function GoalPhaseCard({
  phase,
  onPhaseChange,
  goal,
  onSaveGoal,
  currentWeight,
  currentBodyFat,
  onFinishPhase,
}: GoalPhaseCardProps) {
  const [open, setOpen] = useState<'short' | 'master' | null>(null)
  const [form, setForm] = useState(goal)
  const shortDay = calcProcessDay(goal.startDate, goal.totalDays)
  const masterDay = calcProcessDay(goal.masterStartDate, goal.masterTotalDays)
  const relativeWeek = relativeWeekNumber(goal.startDate)

  useEffect(() => {
    if (open) setForm(goal)
  }, [open, goal])

  function save() {
    onSaveGoal({
      startDate: form.startDate,
      totalDays: Math.max(1, Number(form.totalDays) || 1),
      targetWeightKg:
        form.targetWeightKg == null || Number.isNaN(Number(form.targetWeightKg))
          ? null
          : Number(form.targetWeightKg),
      targetBodyFatPct:
        form.targetBodyFatPct == null ||
        Number.isNaN(Number(form.targetBodyFatPct))
          ? null
          : Number(form.targetBodyFatPct),
      masterStartDate: form.masterStartDate,
      masterTotalDays: Math.max(1, Number(form.masterTotalDays) || 1),
      masterTargetWeightKg:
        form.masterTargetWeightKg == null ||
        Number.isNaN(Number(form.masterTargetWeightKg))
          ? null
          : Number(form.masterTargetWeightKg),
      masterTargetBodyFatPct:
        form.masterTargetBodyFatPct == null ||
        Number.isNaN(Number(form.masterTargetBodyFatPct))
          ? null
          : Number(form.masterTargetBodyFatPct),
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
            <p className="text-sm font-semibold text-text">
              שלב קצר · {PHASE_LABELS[phase]}
            </p>
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
            שבוע יחסי {relativeWeek} · התחלה{' '}
            {new Date(goal.startDate).toLocaleDateString('he-IL')}
          </p>
          <div className="mt-3">
            <ProgressBar value={shortDay} max={goal.totalDays} color="primary" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
              <p className="text-xs text-muted">משקל יעד לשלב</p>
              <p className="mt-1 font-display text-lg font-bold tabular-nums text-text">
                {goal.targetWeightKg != null ? `${goal.targetWeightKg} ק״ג` : '—'}
              </p>
              <p className="text-[11px] text-muted">
                נוכחי: {currentWeight != null ? `${currentWeight}` : '—'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
              <p className="text-xs text-muted">שומן יעד לשלב</p>
              <p className="mt-1 font-display text-lg font-bold tabular-nums text-text">
                {goal.targetBodyFatPct != null
                  ? `${goal.targetBodyFatPct}%`
                  : '—'}
              </p>
              <p className="text-[11px] text-muted">
                נוכחי: {currentBodyFat != null ? `${currentBodyFat}%` : '—'}
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
              <p className="text-xs font-medium text-accent">גוף אל יווני</p>
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
            יעד קבוע: {goal.masterTargetWeightKg ?? 80} ק״ג ·{' '}
            {goal.masterTargetBodyFatPct ?? 9}% שומן
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
            <input
              inputMode="numeric"
              value={form.totalDays}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  totalDays: Number(e.target.value) || 0,
                }))
              }
              className="mt-1 field"
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-muted">
              משקל יעד
              <input
                inputMode="decimal"
                value={form.targetWeightKg ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    targetWeightKg:
                      e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
                className="mt-1 field"
              />
            </label>
            <label className="block text-xs text-muted">
              אחוזי שומן יעד
              <input
                inputMode="decimal"
                value={form.targetBodyFatPct ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    targetBodyFatPct:
                      e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
                className="mt-1 field"
              />
            </label>
          </div>
          <Button type="submit" className="w-full" variant="accent">
            שמור
          </Button>
        </form>
      </Modal>

      <Modal
        open={open === 'master'}
        title="עריכת מטרת על · גוף אל יווני"
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
            סה״כ ימים (ברירת מחדל 1200)
            <input
              inputMode="numeric"
              value={form.masterTotalDays}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  masterTotalDays: Number(e.target.value) || 0,
                }))
              }
              className="mt-1 field"
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-muted">
              משקל יעד (80 ק״ג)
              <input
                inputMode="decimal"
                value={form.masterTargetWeightKg ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    masterTargetWeightKg:
                      e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
                className="mt-1 field"
              />
            </label>
            <label className="block text-xs text-muted">
              שומן יעד (9%)
              <input
                inputMode="decimal"
                value={form.masterTargetBodyFatPct ?? 9}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    masterTargetBodyFatPct:
                      e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
                className="mt-1 field"
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
