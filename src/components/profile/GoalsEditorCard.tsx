import { useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { displayDecimal, parseDecimal, parseInteger } from '../../lib/numericInput'
import { PHASE_LABELS, type MacroTargets } from '../../lib/types'
import { Button } from '../ui/button'
import { Card } from '../ui/Card'
import { NumericInput } from '../ui/NumericInput'
import { NutritionPhasePicker } from './NutritionPhasePicker'

type Form = Record<keyof MacroTargets, string> & {
  weeklyWorkoutTarget: string
  aiCheckinIntervalDays: string
}

function toForm(
  macros: MacroTargets,
  weekly: number,
  intervalDays: number,
): Form {
  return {
    calories: displayDecimal(macros.calories),
    protein: displayDecimal(macros.protein),
    carbs: displayDecimal(macros.carbs),
    fats: displayDecimal(macros.fats),
    weeklyWorkoutTarget: displayDecimal(weekly || 5),
    aiCheckinIntervalDays: displayDecimal(intervalDays || 28),
  }
}

const INTERVAL_PILLS = [7, 14, 28, 56] as const

export function GoalsEditorCard() {
  const {
    macroTargets,
    setMacroTargets,
    goal,
    setGoal,
    phase,
    profile,
    setProfile,
  } = useAppData()
  const [form, setForm] = useState<Form>(() =>
    toForm(macroTargets, goal.weeklyWorkoutTarget, profile.aiCheckinIntervalDays),
  )
  const [source, setSource] = useState({
    macros: macroTargets,
    weekly: goal.weeklyWorkoutTarget,
    interval: profile.aiCheckinIntervalDays,
    phase,
  })
  const [saved, setSaved] = useState(false)

  if (
    source.macros !== macroTargets ||
    source.weekly !== goal.weeklyWorkoutTarget ||
    source.interval !== profile.aiCheckinIntervalDays ||
    source.phase !== phase
  ) {
    setSource({
      macros: macroTargets,
      weekly: goal.weeklyWorkoutTarget,
      interval: profile.aiCheckinIntervalDays,
      phase,
    })
    setForm(
      toForm(
        macroTargets,
        goal.weeklyWorkoutTarget,
        profile.aiCheckinIntervalDays,
      ),
    )
  }

  function field(key: keyof MacroTargets, label: string, decimals = 2) {
    return (
      <label className="block text-xs text-muted">
        {label}
        <NumericInput
          decimals={decimals}
          value={form[key]}
          onChange={(next) => setForm((prev) => ({ ...prev, [key]: next }))}
        />
      </label>
    )
  }

  return (
    <Card title={`הגדרת יעדים אישיים · ${PHASE_LABELS[phase]}`}>
      <div className="mb-4">
        <NutritionPhasePicker />
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          setMacroTargets({
            calories: parseDecimal(form.calories) ?? 0,
            protein: parseDecimal(form.protein) ?? 0,
            carbs: parseDecimal(form.carbs) ?? 0,
            fats: parseDecimal(form.fats) ?? 0,
          })
          const weekly = Math.max(1, parseInteger(form.weeklyWorkoutTarget) ?? 5)
          const interval = Math.min(
            365,
            Math.max(1, parseInteger(form.aiCheckinIntervalDays) ?? 28),
          )
          setGoal({ ...goal, weeklyWorkoutTarget: weekly })
          setProfile({ ...profile, aiCheckinIntervalDays: interval })
          setSaved(true)
          window.setTimeout(() => setSaved(false), 2000)
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          {field('calories', 'קלוריות יומיות', 2)}
          {field('protein', 'חלבון (ג׳)', 2)}
          {field('carbs', 'פחמימות (ג׳)', 2)}
          {field('fats', 'שומן (ג׳)', 2)}
        </div>
        <label className="block text-xs text-muted">
          יעד אימונים שבועי
          <NumericInput
            decimals={0}
            value={form.weeklyWorkoutTarget}
            onChange={(weeklyWorkoutTarget) =>
              setForm((prev) => ({ ...prev, weeklyWorkoutTarget }))
            }
          />
        </label>
        <label className="block text-xs text-muted">
          ימי תזכורת לייעוץ AI
          <NumericInput
            decimals={0}
            value={form.aiCheckinIntervalDays}
            onChange={(aiCheckinIntervalDays) =>
              setForm((prev) => ({ ...prev, aiCheckinIntervalDays }))
            }
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {INTERVAL_PILLS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  aiCheckinIntervalDays: String(days),
                }))
              }
              className={[
                'min-h-8 rounded-full px-3 text-xs font-semibold tabular-nums transition',
                Number(form.aiCheckinIntervalDays) === days
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-muted hover:bg-slate-200',
              ].join(' ')}
            >
              {days}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted">
          יעדי המאקרו נשמרים לשלב {PHASE_LABELS[phase]} הפעיל. יעד האימונים
          משמש את מעקב העקביות בדשבורד. תזכורת ה-AI בדשבורד משתמשת במרווח
          שנשמר כאן.
        </p>
        <Button type="submit" className="w-full" variant="accent">
          {saved ? 'נשמר ✓' : 'שמור יעדים'}
        </Button>
      </form>
    </Card>
  )
}
