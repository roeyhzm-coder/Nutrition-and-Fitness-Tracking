import { useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import {
  customIsraeliFoodDuplicateCount,
  dedupeCustomIsraeliFoods,
  deleteIsraeliFood,
  fetchCustomIsraeliFoods,
  israeliFoodMacros,
  useCustomIsraeliFoods,
  type IsraeliFood,
} from '../../lib/israeliFoods'
import { formatNiceNumber } from '../../lib/numericInput'
import { Button } from '../ui/button'
import { IconButton } from '../ui/IconButton'
import { Modal } from '../ui/Modal'

type ManageCustomFoodsModalProps = {
  open: boolean
  onClose: () => void
  onEdit: (food: IsraeliFood) => void
}

export function ManageCustomFoodsModal({
  open,
  onClose,
  onEdit,
}: ManageCustomFoodsModalProps) {
  const foods = useCustomIsraeliFoods()
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const duplicates = customIsraeliFoodDuplicateCount(foods)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    void fetchCustomIsraeliFoods().finally(() => setLoading(false))
  }, [open])

  async function removeFood(food: IsraeliFood) {
    if (!window.confirm('למחוק את הפריט מהמאגר?')) return
    setBusy(true)
    const result = await deleteIsraeliFood(food.id)
    setBusy(false)
    setMessage(result.error ? result.error : `נמחק "${food.name}"`)
  }

  async function removeDuplicates() {
    if (duplicates < 1) return
    if (!window.confirm('למחוק כפילויות מהפריטים שהוספת למאגר?')) return
    setBusy(true)
    const result = await dedupeCustomIsraeliFoods()
    setBusy(false)
    setMessage(
      result.removed > 0
        ? `נמחקו ${result.removed} כפילויות`
        : 'לא נמצאו כפילויות',
    )
  }

  return (
    <Modal open={open} title="הפריטים שהוספתי למאגר" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-muted">
          כאן מופיעים רק פריטים שהוספת ידנית למאגר. פריטי המערכת לא ניתנים למחיקה.
        </p>
        <Button
          variant="surface"
          className="w-full"
          disabled={busy || duplicates < 1}
          onClick={() => void removeDuplicates()}
        >
          מחק כפילויות בלחיצה אחת
          {duplicates > 0 ? ` (${duplicates})` : ''}
        </Button>
        {loading ? <p className="text-sm text-muted">טוען…</p> : null}
        {message ? <p className="text-xs text-muted">{message}</p> : null}
        {foods.length === 0 && !loading ? (
          <p className="text-sm text-muted">עדיין לא הוספת פריטים למאגר.</p>
        ) : (
          <ul className="max-h-72 overflow-y-auto">
            {foods.map((food) => {
              const macros = israeliFoodMacros(food, 100)
              return (
                <li
                  key={food.id}
                  className="flex min-h-11 items-center gap-1 border-b border-slate-100 py-1 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text">
                      {food.name}
                    </p>
                    <p className="truncate text-[11px] text-muted">
                      {food.brand ?? food.category} ·{' '}
                      {formatNiceNumber(macros.calories, 0)} קק״ל/100ג׳
                    </p>
                  </div>
                  <IconButton
                    label="עריכה"
                    className="size-8"
                    onClick={() => onEdit(food)}
                  >
                    <Pencil className="size-3.5" strokeWidth={1.75} />
                  </IconButton>
                  <IconButton
                    label="מחיקה"
                    tone="danger"
                    className="size-8 text-danger"
                    disabled={busy}
                    onClick={() => void removeFood(food)}
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                  </IconButton>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}
