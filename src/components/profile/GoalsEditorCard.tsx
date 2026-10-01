import { useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { displayDecimal, parseDecimal, parseInteger } from '../../lib/numericInput'
import { PHASE_LABELS, type MacroTargets } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { NumericInput } from '../ui/NumericInput'
import { NutritionPhasePicker } from './NutritionPhasePicker'

type Form = Record<keyof MacroTargets, string> & { weeklyWorkoutTarget: string }

function toForm(macros: MacroTargets, weekly: number): Form {
  return {
    calories: displayDecimal(macros.calories),
    protein: displayDecimal(macros.protein),
    carbs: displayDecimal(macros.carbs),
    fats: displayDecimal(macros.fats),
    weeklyWorkoutTarget: displayDecimal(weekly || 5),
  }
}

export function GoalsEditorCard() {
  const { macroTargets, setMacroTargets, goal, setGoal, phase } = useAppData()
  const [form, setForm] = useState<Form>(() =>
    toForm(macroTargets, goal.weeklyWorkoutTarget),
  )
  const [source, setSource] = useState({
    macros: macroTargets,
    weekly: goal.weeklyWorkoutTarget,
    phase,
  })
  const [saved, setSaved] = useState(false)

  if (
    source.macros !== macroTargets ||
    source.weekly !== goal.weeklyWorkoutTarget ||
    source.phase !== phase
  ) {
    setSource({
      macros: macroTargets,
      weekly: goal.weeklyWorkoutTarget,
      phase,
    })
    setForm(toForm(macroTargets, goal.weeklyWorkoutTarget))
  }

  function field(key: keyof MacroTargets, label: string, decimals = 0) {
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
            calories: parseInteger(form.calories) ?? 0,
            protein: parseDecimal(form.protein) ?? 0,
            carbs: parseDecimal(form.carbs) ?? 0,
            fats: parseDecimal(form.fats) ?? 0,
          })
          const weekly = Math.max(1, parseInteger(form.weeklyWorkoutTarget) ?? 5)
          setGoal({ ...goal, weeklyWorkoutTarget: weekly })
          setSaved(true)
          window.setTimeout(() => setSaved(false), 2000)
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          {field('calories', 'קלוריות יומיות', 0)}
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
        <p className="text-[10px] text-muted">
          יעדי המאקרו נשמרים לשלב {PHASE_LABELS[phase]} הפעיל. יעד האימונים
          משמש את מעקב העקביות בדשבורד.
        </p>
        <Button type="submit" className="w-full" variant="accent">
          {saved ? 'נשמר ✓' : 'שמור יעדים'}
        </Button>
      </form>
    </Card>
  )
}
