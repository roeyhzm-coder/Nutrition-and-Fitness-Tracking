import { useMemo, useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { summarizePhase } from '../../lib/phaseHistory'
import type { MacroTargets, Phase } from '../../lib/types'
import { calcProcessDay, PHASE_LABELS, PHASES } from '../../lib/types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

type FinishPhaseModalProps = {
  open: boolean
  onClose: () => void
}

type Form = {
  phase: Phase
  totalDays: string
  targetWeightKg: string
  targetBodyFatPct: string
} & Record<keyof MacroTargets, string>

const MACRO_FIELDS: ReadonlyArray<[keyof MacroTargets, string]> = [
  ['calories', 'קלוריות'],
  ['protein', 'חלבון (ג׳)'],
  ['carbs', 'פחמימה (ג׳)'],
  ['fats', 'שומן (ג׳)'],
]

const DURATION_PRESETS = [60, 84, 120]

const inputClass = 'mt-1 field'

function fmt(value: number | null, unit: string) {
  return value != null ? `${value}${unit}` : 'לא צוין'
}

function parseOptional(raw: string) {
  if (!raw.trim()) return null
  const n = Number(raw.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

export function FinishPhaseModal({ open, onClose }: FinishPhaseModalProps) {
  const {
    phase,
    goal,
    macroTargets,
    macroPresets,
    weightLogs,
    foodLogs,
    finishPhase,
  } = useAppData()

  const summary = useMemo(
    () => summarizePhase({ phase, goal, macroTargets, weightLogs, foodLogs }),
    [phase, goal, macroTargets, weightLogs, foodLogs],
  )

  const initialForm = (next: Phase): Form => {
    const m = macroPresets[next]
    return {
      phase: next,
      totalDays: String(goal.totalDays || 84),
      targetWeightKg: '',
      targetBodyFatPct: '',
      calories: String(m.calories),
      protein: String(m.protein),
      carbs: String(m.carbs),
      fats: String(m.fats),
    }
  }

  const [form, setForm] = useState<Form>(() =>
    initialForm(phase === 'bulk' ? 'cut' : 'bulk'),
  )
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setForm(initialForm(phase === 'bulk' ? 'cut' : 'bulk'))
  }

  function selectPhase(next: Phase) {
    const m = macroPresets[next]
    setForm((p) => ({
      ...p,
      phase: next,
      calories: String(m.calories),
      protein: String(m.protein),
      carbs: String(m.carbs),
      fats: String(m.fats),
    }))
  }

  const weightChange =
    summary.startWeightKg != null && summary.endWeightKg != null
      ? summary.endWeightKg - summary.startWeightKg
      : null

  return (
    <Modal
      open={open}
      title="סיום שלב נוכחי והגדרת שלב חדש"
      onClose={onClose}
      wide
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          finishPhase({
            phase: form.phase,
            totalDays: Number(form.totalDays) || 84,
            targetWeightKg: parseOptional(form.targetWeightKg),
            targetBodyFatPct: parseOptional(form.targetBodyFatPct),
            macros: {
              calories: Number(form.calories) || 0,
              protein: Number(form.protein) || 0,
              carbs: Number(form.carbs) || 0,
              fats: Number(form.fats) || 0,
            },
          })
          onClose()
        }}
      >
        <section className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4">
          <p className="mb-2 text-xs font-semibold text-muted">
            סיכום השלב שמסתיים (יישמר להיסטוריה)
          </p>
          <p className="font-display text-lg font-bold text-text">
            {PHASE_LABELS[summary.phase]}
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <dt className="text-muted">תאריכים</dt>
            <dd className="text-text">
              {new Date(summary.startDate).toLocaleDateString('he-IL')} –{' '}
              {new Date(summary.endDate).toLocaleDateString('he-IL')}
            </dd>
            <dt className="text-muted">ימים בפועל</dt>
            <dd className="text-text">
              {summary.actualDays} (מתוכנן {summary.plannedDays})
            </dd>
            <dt className="text-muted">משקל התחלה → סיום</dt>
            <dd className="text-text">
              {fmt(summary.startWeightKg, ' ק״ג')} →{' '}
              {fmt(summary.endWeightKg, ' ק״ג')}
              {weightChange != null
                ? ` (${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)})`
                : ''}
            </dd>
            <dt className="text-muted">ממוצע קלוריות</dt>
            <dd className="text-text">{fmt(summary.avgCalories, ' קק״ל')}</dd>
          </dl>
        </section>

        <section className="space-y-3">
          <p className="text-xs font-semibold text-muted">השלב החדש</p>
          <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-950/50 p-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => selectPhase(p)}
                className={[
                  'min-h-11 rounded-xl px-3 py-2 text-sm font-bold transition',
                  form.phase === p
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                    : 'text-muted hover:bg-slate-800/60 hover:text-text',
                ].join(' ')}
              >
                {PHASE_LABELS[p]}
              </button>
            ))}
          </div>

          <label className="block text-xs text-muted">
            משך השלב (ימים)
            <input
              inputMode="numeric"
              value={form.totalDays}
              onChange={(e) =>
                setForm((p) => ({ ...p, totalDays: e.target.value }))
              }
              className={inputClass}
              required
            />
          </label>
          <div className="flex gap-1.5">
            {DURATION_PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setForm((p) => ({ ...p, totalDays: String(d) }))}
                className={[
                  'min-h-11 rounded-2xl px-3 text-xs transition',
                  form.totalDays === String(d)
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800/80 text-muted hover:text-text',
                ].join(' ')}
              >
                {d} ימים
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-muted">
              משקל יעד (ק״ג)
              <input
                inputMode="decimal"
                value={form.targetWeightKg}
                onChange={(e) =>
                  setForm((p) => ({ ...p, targetWeightKg: e.target.value }))
                }
                placeholder="לא צוין"
                className={inputClass}
              />
            </label>
            <label className="block text-xs text-muted">
              אחוז שומן יעד
              <input
                inputMode="decimal"
                value={form.targetBodyFatPct}
                onChange={(e) =>
                  setForm((p) => ({ ...p, targetBodyFatPct: e.target.value }))
                }
                placeholder="לא צוין"
                className={inputClass}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {MACRO_FIELDS.map(([key, label]) => (
              <label key={key} className="block text-xs text-muted">
                {label}
                <input
                  inputMode="numeric"
                  value={form[key]}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, [key]: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
            ))}
          </div>
        </section>

        <p className="text-[11px] text-muted">
          אישור יאפס את מונה השלב ל-יום 1 מתוך {Number(form.totalDays) || 84},
          ישמור על רצף מטרת העל (יום{' '}
          {calcProcessDay(goal.masterStartDate, goal.masterTotalDays)} מתוך{' '}
          {goal.masterTotalDays}) ויעדכן את יעדי המאקרו.
        </p>

        <Button type="submit" className="w-full" variant="accent">
          אישור ומעבר לשלב {PHASE_LABELS[form.phase]}
        </Button>
      </form>
    </Modal>
  )
}
