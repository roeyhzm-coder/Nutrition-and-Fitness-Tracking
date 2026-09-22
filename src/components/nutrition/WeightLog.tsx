import { useState } from 'react'
import type { WeightEntry } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

type WeightLogProps = {
  entries: WeightEntry[]
  onAdd: (weightKg: number, note?: string) => void
}

export function WeightLog({ entries, onAdd }: WeightLogProps) {
  const [weight, setWeight] = useState('')
  const [note, setNote] = useState('')
  const latest = entries.at(-1)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const w = Number(weight)
    if (!Number.isFinite(w) || w <= 0) return
    onAdd(w, note.trim() || undefined)
    setWeight('')
    setNote('')
  }

  return (
    <Card title="מעקב שקילה יומי">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-muted">
            משקל (ק״ג)
            <input
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
              placeholder={latest ? String(latest.weightKg) : '75.0'}
              required
            />
          </label>
          <label className="block text-xs text-muted">
            הערה (אופציונלי)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
              placeholder="בוקר / אחרי אימון"
            />
          </label>
        </div>
        <Button type="submit" className="w-full">
          שמור שקילה
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
                className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm"
              >
                <span className="text-muted">
                  {new Date(e.loggedAt).toLocaleDateString('he-IL')}
                  {e.note ? ` · ${e.note}` : ''}
                </span>
                <span className="font-semibold text-text">{e.weightKg} ק״ג</span>
              </li>
            ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">אין שקילות עדיין.</p>
      )}
    </Card>
  )
}
