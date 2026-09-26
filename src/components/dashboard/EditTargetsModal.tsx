import { useEffect, useState } from 'react'
import type { MacroTargets } from '../../lib/types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

type EditTargetsModalProps = {
  open: boolean
  targets: MacroTargets
  onClose: () => void
  onSave: (targets: MacroTargets) => void
  title?: string
}

export function EditTargetsModal({
  open,
  targets,
  onClose,
  onSave,
  title = 'עריכת יעדים יומיים',
}: EditTargetsModalProps) {
  const [form, setForm] = useState(targets)

  useEffect(() => {
    if (open) setForm(targets)
  }, [open, targets])

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
    <Modal open={open} title={title} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(form)
          onClose()
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          {field('calories', 'קלוריות')}
          {field('protein', 'חלבון (ג׳)')}
          {field('carbs', 'פחמימות (ג׳)')}
          {field('fats', 'שומנים (ג׳)')}
        </div>
        <Button type="submit" className="w-full" variant="accent">
          שמור יעדים
        </Button>
      </form>
    </Modal>
  )
}
