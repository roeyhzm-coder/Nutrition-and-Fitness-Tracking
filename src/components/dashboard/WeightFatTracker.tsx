import { useState } from 'react'
import type { WeightEntry } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

type WeightFatTrackerProps = {
  entries: WeightEntry[]
  onAdd: (input: {
    weightKg: number
    bodyFatPct?: number | null
    note?: string
  }) => void
}

export function WeightFatTracker({ entries, onAdd }: WeightFatTrackerProps) {
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [note, setNote] = useState('')
  const latest = entries.at(-1)

  return (
    <Card title="מעקב משקל ואחוזי שומן">
      <form
        className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault()
          const w = Number(weight)
          if (!Number.isFinite(w) || w <= 0) return
          const fat = bodyFat === '' ? null : Number(bodyFat)
          onAdd({
            weightKg: w,
            bodyFatPct: fat != null && Number.isFinite(fat) ? fat : null,
            note: note.trim() || undefined,
          })
          setWeight('')
          setBodyFat('')
          setNote('')
        }}
      >
        <input
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder={latest ? String(latest.weightKg) : 'משקל ק״ג'}
          className="field"
          required
        />
        <input
          inputMode="decimal"
          value={bodyFat}
          onChange={(e) => setBodyFat(e.target.value)}
          placeholder="אחוזי שומן %"
          className="field"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="הערה"
          className="field"
        />
        <Button type="submit" variant="accent">
          הוסף
        </Button>
      </form>

      {entries.length === 0 ? (
        <p className="text-sm text-muted">אין מדידות עדיין.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-right text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-muted">
                <th className="px-2 py-2 font-medium">תאריך</th>
                <th className="px-2 py-2 font-medium">משקל</th>
                <th className="px-2 py-2 font-medium">שומן %</th>
                <th className="px-2 py-2 font-medium">הערה</th>
              </tr>
            </thead>
            <tbody>
              {[...entries]
                .reverse()
                .slice(0, 14)
                .map((e) => (
                  <tr key={e.id} className="border-b border-slate-200">
                    <td className="px-2 py-3 text-muted">
                      {new Date(e.loggedAt).toLocaleDateString('he-IL')}
                    </td>
                    <td className="px-2 py-3 font-display font-bold tabular-nums text-text">
                      {e.weightKg} ק״ג
                    </td>
                    <td className="px-2 py-2 text-text">
                      {e.bodyFatPct != null ? `${e.bodyFatPct}%` : '—'}
                    </td>
                    <td className="px-2 py-2 text-muted">{e.note ?? '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
