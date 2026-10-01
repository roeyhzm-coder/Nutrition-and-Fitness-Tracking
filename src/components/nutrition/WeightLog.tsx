import { useState } from 'react'
import { formatKg, formatPct, parseDecimal, parsePositiveDecimal } from '../../lib/numericInput'
import type { WeightEntry } from '../../lib/types'
import { Button } from '../ui/button'
import { Card } from '../ui/Card'
import { NumericInput } from '../ui/NumericInput'

type WeightLogProps = {
  entries: WeightEntry[]
  onAdd: (input: {
    weightKg: number
    bodyFatPct?: number | null
    note?: string
  }) => void
}

export function WeightLog({ entries, onAdd }: WeightLogProps) {
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [note, setNote] = useState('')
  const latest = entries.at(-1)

  return (
    <Card title="מעקב שקילה ואחוזי שומן">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const w = parsePositiveDecimal(weight)
          if (w == null) return
          onAdd({
            weightKg: w,
            bodyFatPct: parseDecimal(bodyFat),
            note: note.trim() || undefined,
          })
          setWeight('')
          setBodyFat('')
          setNote('')
        }}
        className="space-y-3"
      >
        <div className="grid grid-cols-3 gap-2">
          <label className="block text-xs text-muted">
            משקל (ק״ג)
            <NumericInput
              value={weight}
              onChange={setWeight}
              placeholder={latest ? formatKg(latest.weightKg) : '70.00'}
              required
            />
          </label>
          <label className="block text-xs text-muted">
            אחוזי שומן
            <NumericInput
              value={bodyFat}
              onChange={setBodyFat}
              placeholder="14.00"
            />
          </label>
          <label className="block text-xs text-muted">
            הערה
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 field"
              placeholder="בוקר"
            />
          </label>
        </div>
        <Button type="submit" className="w-full">
          שמור מדידה
        </Button>
      </form>

      {entries.length > 0 ? (
        <ul className="mt-4 max-h-40 space-y-2 overflow-y-auto">
          {[...entries]
            .reverse()
            .slice(0, 7)
            .map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 text-sm"
              >
                <span className="text-muted">
                  {new Date(e.loggedAt).toLocaleDateString('he-IL')}
                  {e.note ? ` · ${e.note}` : ''}
                </span>
                <span className="font-display font-bold tabular-nums text-text">
                  {formatKg(e.weightKg)} ק״ג
                  {e.bodyFatPct != null ? ` · ${formatPct(e.bodyFatPct)}%` : ''}
                </span>
              </li>
            ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">אין שקילות עדיין.</p>
      )}
    </Card>
  )
}
