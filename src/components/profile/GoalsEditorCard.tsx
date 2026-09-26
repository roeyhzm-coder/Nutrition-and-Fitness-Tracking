import { useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { PHASE_LABELS, type MacroTargets } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

type Form = MacroTargets & { weeklyWorkoutTarget: string }

export function GoalsEditorCard() {
  const { macroTargets, setMacroTargets, goal, setGoal, phase } = useAppData()
  const [form, setForm] = useState<Form>({
    ...macroTargets,
    weeklyWorkoutTarget: String(goal.weeklyWorkoutTarget || 5),
  })
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
    setForm({
      ...macroTargets,
      weeklyWorkoutTarget: String(goal.weeklyWorkoutTarget || 5),
    })
  }

  function field(key: keyof MacroTargets, label: string) {
    return (
      <label className="block text-xs text-muted">
        {label}
        <input
          inputMode="numeric"
          value={form[key]}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              [key]: Number(e.target.value) || 0,
            }))
          }
          className="mt-1 field"
        />
      </label>
    )
  }

  return (
    <Card title={`עריכת יעדים · ${PHASE_LABELS[phase]}`}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          setMacroTargets({
            calories: form.calories,
            protein: form.protein,
            carbs: form.carbs,
            fats: form.fats,
          })
          const weekly = Math.max(1, Number(form.weeklyWorkoutTarget) || 5)
          setGoal({ ...goal, weeklyWorkoutTarget: weekly })
          setSaved(true)
          window.setTimeout(() => setSaved(false), 2000)
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          {field('calories', 'קלוריות יומיות')}
          {field('protein', 'חלבון (ג׳)')}
          {field('carbs', 'פחמימות (ג׳)')}
          {field('fats', 'שומן (ג׳)')}
        </div>
        <label className="block text-xs text-muted">
          יעד אימונים שבועי
          <input
            inputMode="numeric"
            value={form.weeklyWorkoutTarget}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                weeklyWorkoutTarget: e.target.value,
              }))
            }
            className="mt-1 field"
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
