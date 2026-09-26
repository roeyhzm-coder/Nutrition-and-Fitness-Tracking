import { useState } from 'react'
import { Scale } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { todayKey } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function DailyWeightCard() {
  const { weightLogs, addWeight } = useAppData()
  const latest = weightLogs.at(-1)
  const [date, setDate] = useState(todayKey())
  const [weight, setWeight] = useState('')
  const [saved, setSaved] = useState(false)

  return (
    <Card
      title="שקילה יומית"
      action={
        <span className="flex items-center gap-1 text-xs text-muted">
          <Scale className="size-3.5 text-blue-600" strokeWidth={1.75} />
          {latest ? `${latest.weightKg} ק״ג` : 'אין מדידה'}
        </span>
      }
    >
      <form
        className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault()
          const w = Number(weight.replace(',', '.'))
          if (!Number.isFinite(w) || w <= 0) return
          addWeight({ weightKg: w, loggedAt: date })
          setWeight('')
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
          משקל (ק״ג)
          <input
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={latest ? String(latest.weightKg) : '75.0'}
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
    </Card>
  )
}
