import { useEffect, useState } from 'react'
import {
  calcProcessDay,
  PHASE_LABELS,
  type GoalSettings,
  type Phase,
} from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { ProgressBar } from '../ui/ProgressBar'

type GoalPhaseCardProps = {
  phase: Phase
  onPhaseChange: (phase: Phase) => void
  goal: GoalSettings
  onSaveGoal: (goal: GoalSettings) => void
  currentWeight?: number | null
  currentBodyFat?: number | null
}

export function GoalPhaseCard({
  phase,
  onPhaseChange,
  goal,
  onSaveGoal,
  currentWeight,
  currentBodyFat,
}: GoalPhaseCardProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(goal)
  const day = calcProcessDay(goal.startDate, goal.totalDays)

  useEffect(() => {
    if (open) setForm(goal)
  }, [open, goal])

  return (
    <>
      <Card
        title="מטרת על ותהליך"
        action={
          <button
            type="button"
            className="text-sm font-medium text-primary"
            onClick={() => setOpen(true)}
          >
            עריכה
          </button>
        }
        className="border-primary/30 bg-gradient-to-b from-primary/10 to-card"
      >
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-surface p-1">
          {(['bulk', 'cut'] as Phase[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPhaseChange(p)}
              className={[
                'rounded-lg px-3 py-2 text-sm font-bold transition',
                phase === p
                  ? p === 'bulk'
                    ? 'bg-primary text-white'
                    : 'bg-accent text-bg'
                  : 'text-muted hover:text-text',
              ].join(' ')}
            >
              {PHASE_LABELS[p]}
            </button>
          ))}
        </div>

        <p className="font-display text-2xl font-bold text-text">
          יום {day} מתוך {goal.totalDays}
        </p>
        <p className="mt-1 text-xs text-muted">
          שלב נוכחי: {PHASE_LABELS[phase]} · התחלה{' '}
          {new Date(goal.startDate).toLocaleDateString('he-IL')}
        </p>
        <div className="mt-3">
          <ProgressBar value={day} max={goal.totalDays} color="accent" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-line bg-surface px-3 py-3">
            <p className="text-xs text-muted">משקל יעד</p>
            <p className="mt-1 font-display text-lg font-bold text-text">
              {goal.targetWeightKg != null ? `${goal.targetWeightKg} ק״ג` : '—'}
            </p>
            <p className="mt-1 text-xs text-muted">
              נוכחי: {currentWeight != null ? `${currentWeight} ק״ג` : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface px-3 py-3">
            <p className="text-xs text-muted">אחוזי שומן יעד</p>
            <p className="mt-1 font-display text-lg font-bold text-text">
              {goal.targetBodyFatPct != null
                ? `${goal.targetBodyFatPct}%`
                : '—'}
            </p>
            <p className="mt-1 text-xs text-muted">
              נוכחי: {currentBodyFat != null ? `${currentBodyFat}%` : '—'}
            </p>
          </div>
        </div>
      </Card>

      <Modal open={open} title="עריכת מטרת על" onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
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
            })
            setOpen(false)
          }}
        >
          <label className="block text-xs text-muted">
            תאריך התחלה
            <input
              type="date"
              value={form.startDate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
              required
            />
          </label>
          <label className="block text-xs text-muted">
            סה״כ ימים בתהליך
            <input
              inputMode="numeric"
              value={form.totalDays}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  totalDays: Number(e.target.value) || 0,
                }))
              }
              className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-muted">
              משקל יעד (ק״ג)
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
                className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
                placeholder="לדוגמה 78"
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
                className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
                placeholder="לדוגמה 12"
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
