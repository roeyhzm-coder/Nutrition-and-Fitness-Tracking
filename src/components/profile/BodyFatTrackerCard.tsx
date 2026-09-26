import { useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { todayKey } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function BodyFatTrackerCard() {
  const { weightLogs, addBodyFat } = useAppData()
  const [date, setDate] = useState(todayKey())
  const [fat, setFat] = useState('')
  const [saved, setSaved] = useState(false)

  const history = [...weightLogs]
    .filter((e) => e.bodyFatPct != null)
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))

  return (
    <Card title="מעקב אחוזי שומן תקופתי">
      <form
        className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault()
          const value = Number(fat.replace(',', '.'))
          if (!Number.isFinite(value) || value <= 0 || value >= 100) return
          addBodyFat({ bodyFatPct: value, loggedAt: date })
          setFat('')
          setSaved(true)
          window.setTimeout(() => setSaved(false), 2000)
        }}
      >
        <label className="block text-xs text-muted">
          תאריך
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 field"
            required
          />
        </label>
        <label className="block text-xs text-muted">
          אחוז שומן
          <input
            inputMode="decimal"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            placeholder="%"
            className="mt-1 field"
            required
          />
        </label>
        <div className="flex items-end">
          <Button type="submit" variant="accent" className="w-full min-w-24 sm:w-auto">
            {saved ? 'נשמר ✓' : 'שמור'}
          </Button>
        </div>
      </form>

      {history.length === 0 ? (
        <p className="text-sm text-muted">אין מדידות אחוזי שומן עדיין.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[240px] text-right text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-muted">
                <th className="px-2 py-2 font-medium">תאריך</th>
                <th className="px-2 py-2 font-medium">שומן %</th>
                <th className="px-2 py-2 font-medium">משקל באותו יום</th>
              </tr>
            </thead>
            <tbody>
              {history.map((e) => (
                <tr key={e.id} className="border-b border-slate-200">
                  <td className="px-2 py-3 text-muted">
                    {new Date(e.loggedAt).toLocaleDateString('he-IL')}
                  </td>
                  <td className="px-2 py-3 font-display font-bold tabular-nums text-text">
                    {e.bodyFatPct}%
                  </td>
                  <td className="px-2 py-2 text-muted">
                    {e.weightKg > 0 ? `${e.weightKg} ק״ג` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
