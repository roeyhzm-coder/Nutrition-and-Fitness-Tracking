import { useMemo, useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import {
  parseDecimal,
  parseInteger,
  parsePositiveDecimal,
} from '../../lib/numericInput'
import { summarizePhase } from '../../lib/phaseHistory'
import type { MacroTargets, Phase } from '../../lib/types'
import { calcProcessDay, PHASE_LABELS, PHASES } from '../../lib/types'
import { Button } from '../ui/button'
import { Modal } from '../ui/Modal'
import { NumericInput } from '../ui/NumericInput'

type FinishPhaseModalProps = {
  open: boolean
  onClose: () => void
}

type Form = {
  phase: Phase
  phaseName: string
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
  return parsePositiveDecimal(raw)
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
      phaseName: '',
      totalDays: String(goal.totalDays || 210),
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
            phaseName: form.phaseName.trim() || undefined,
            totalDays: parseInteger(form.totalDays) || 210,
            targetWeightKg: parseOptional(form.targetWeightKg),
            targetBodyFatPct: parseOptional(form.targetBodyFatPct),
            macros: {
              calories: parseDecimal(form.calories) ?? 0,
              protein: parseDecimal(form.protein) ?? 0,
              carbs: parseDecimal(form.carbs) ?? 0,
              fats: parseDecimal(form.fats) ?? 0,
            },
          })
          onClose()
        }}
      >
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
          <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-50 p-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => selectPhase(p)}
                className={[
                  'min-h-11 rounded-xl px-3 py-2 text-sm font-bold transition',
                  form.phase === p
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-muted hover:bg-slate-100 hover:text-text',
                ].join(' ')}
              >
                {PHASE_LABELS[p]}
              </button>
            ))}
          </div>

          <label className="block text-xs text-muted">
            שם השלב החדש
            <input
              value={form.phaseName}
              onChange={(e) =>
                setForm((p) => ({ ...p, phaseName: e.target.value }))
              }
              placeholder={PHASE_LABELS[form.phase]}
              className={inputClass}
            />
          </label>
          <label className="block text-xs text-muted">
            משך השלב (ימים)
            <NumericInput
              decimals={0}
              value={form.totalDays}
              onChange={(totalDays) => setForm((p) => ({ ...p, totalDays }))}
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
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-muted hover:text-text',
                ].join(' ')}
              >
                {d} ימים
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-muted">
              משקל יעד (ק״ג)
              <NumericInput
                value={form.targetWeightKg}
                onChange={(targetWeightKg) =>
                  setForm((p) => ({ ...p, targetWeightKg }))
                }
                placeholder="לא צוין"
                className={inputClass}
              />
            </label>
            <label className="block text-xs text-muted">
              אחוז שומן יעד
              <NumericInput
                value={form.targetBodyFatPct}
                onChange={(targetBodyFatPct) =>
                  setForm((p) => ({ ...p, targetBodyFatPct }))
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
                <NumericInput
                  decimals={2}
                  value={form[key]}
                  onChange={(next) => setForm((p) => ({ ...p, [key]: next }))}
                  className={inputClass}
                />
              </label>
            ))}
          </div>
        </section>

        <p className="text-[11px] text-muted">
          אישור יאפס את מונה השלב ל-יום 1 מתוך {parseInteger(form.totalDays) || 210},
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
