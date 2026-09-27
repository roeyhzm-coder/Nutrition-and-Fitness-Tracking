import { useEffect, useState } from 'react'
import { displayDecimal, parseDecimal, parseInteger } from '../../lib/numericInput'
import type { MacroTargets } from '../../lib/types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { NumericInput } from '../ui/NumericInput'

type EditTargetsModalProps = {
  open: boolean
  targets: MacroTargets
  onClose: () => void
  onSave: (targets: MacroTargets) => void
  title?: string
}

type Form = Record<keyof MacroTargets, string>

function toForm(targets: MacroTargets): Form {
  return {
    calories: displayDecimal(targets.calories),
    protein: displayDecimal(targets.protein),
    carbs: displayDecimal(targets.carbs),
    fats: displayDecimal(targets.fats),
  }
}

export function EditTargetsModal({
  open,
  targets,
  onClose,
  onSave,
  title = 'עריכת יעדים יומיים',
}: EditTargetsModalProps) {
  const [form, setForm] = useState<Form>(() => toForm(targets))

  useEffect(() => {
    if (open) setForm(toForm(targets))
  }, [open, targets])

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
    <Modal open={open} title={title} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          onSave({
            calories: parseInteger(form.calories) ?? 0,
            protein: parseDecimal(form.protein) ?? 0,
            carbs: parseDecimal(form.carbs) ?? 0,
            fats: parseDecimal(form.fats) ?? 0,
          })
          onClose()
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          {field('calories', 'קלוריות', 0)}
          {field('protein', 'חלבון (ג׳)', 2)}
          {field('carbs', 'פחמימות (ג׳)', 2)}
          {field('fats', 'שומנים (ג׳)', 2)}
        </div>
        <Button type="submit" className="w-full" variant="accent">
          שמור יעדים
        </Button>
      </form>
    </Modal>
  )
}
