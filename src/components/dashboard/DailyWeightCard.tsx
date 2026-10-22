import { useState } from 'react'
import { CircleCheck, Scale } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { formatKg, parsePositiveDecimal } from '../../lib/numericInput'
import { localDateKey } from '../../lib/types'
import { sortWeightEntriesDesc, weightEntryOn } from '../../lib/weightLog'
import { Button } from '../ui/button'
import { Card } from '../ui/Card'
import { NumericInput } from '../ui/NumericInput'

export function DailyWeightCard() {
  const { weightLogs, addWeight, updateWeight } = useAppData()
  const today = localDateKey()
  const latest = sortWeightEntriesDesc(weightLogs).find((e) => e.weightKg > 0)
  const todayEntry = weightEntryOn(weightLogs, today)
  const [date, setDate] = useState(today)
  const [weight, setWeight] = useState('')
  const [saved, setSaved] = useState(false)
  // Saving for today when today is already logged updates that weigh-in.
  const updatingToday = date === today && !!todayEntry

  return (
    <Card
      title="שקילה יומית"
      action={
        <span className="flex items-center gap-1 text-xs text-muted">
          <Scale className="size-3.5 text-blue-600" strokeWidth={1.75} />
          {latest ? `${formatKg(latest.weightKg)} ק״ג` : 'אין מדידה'}
        </span>
      }
    >
      {todayEntry ? (
        <p
          role="status"
          className="mb-3 flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-800"
        >
          <CircleCheck className="size-5 shrink-0 text-emerald-600" strokeWidth={2.25} />
          <span>
            ✓ שקילה להיום הוזנה בהצלחה (
            <span className="tabular-nums">{formatKg(todayEntry.weightKg)}</span> ק״ג)
          </span>
        </p>
      ) : (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-muted">
          <span className="size-1.5 rounded-full bg-slate-400" aria-hidden />
          טרם הוזנה שקילה להיום
        </p>
      )}
      <form
        className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault()
          const w = parsePositiveDecimal(weight)
          if (w == null) return
          if (updatingToday && todayEntry) updateWeight(todayEntry.id, { weightKg: w })
          else addWeight({ weightKg: w, loggedAt: date })
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
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 field"
            required
          />
        </label>
        <label className="block text-xs text-muted">
          {updatingToday ? 'משקל מעודכן להיום (ק״ג)' : 'משקל (ק״ג)'}
          <NumericInput
            value={weight}
            onChange={setWeight}
            placeholder={
              updatingToday && todayEntry
                ? formatKg(todayEntry.weightKg)
                : latest
                  ? formatKg(latest.weightKg)
                  : '70.00'
            }
            required
          />
        </label>
        <div className="flex items-end">
          <Button
            type="submit"
            variant={updatingToday ? 'surface' : 'accent'}
            className="w-full min-w-24 sm:w-auto"
          >
            {saved ? 'נשמר ✓' : updatingToday ? 'עדכן שקילה של היום' : 'שמור שקילה'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
