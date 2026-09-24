import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import type { Intensity } from '../../lib/types'
import { INTENSITY_LABELS } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { IconButton } from '../ui/IconButton'

const SUGGESTED_SPORTS = [
  'חדר כושר',
  'קליסטניקס',
  'טניס',
  'שחייה',
  'ריצה',
  'אופניים',
]

const inputClass =
  'w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary'

function localDateInput(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function ActivityLogCard() {
  const { activityLogs, addActivityLog, deleteActivityLog } = useAppData()
  const [sport, setSport] = useState('')
  const [duration, setDuration] = useState('')
  const [intensity, setIntensity] = useState<Intensity | ''>('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(localDateInput())

  const sportOptions = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const name of [
      ...activityLogs.map((a) => a.sport),
      ...SUGGESTED_SPORTS,
    ]) {
      const key = name.trim().toLocaleLowerCase('he')
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(name.trim())
    }
    return out
  }, [activityLogs])

  const recent = useMemo(
    () =>
      [...activityLogs]
        .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
        .slice(0, 8),
    [activityLogs],
  )

  return (
    <Card title="יומן פעילות וענפי ספורט">
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!sport.trim()) return
          const now = new Date()
          const [y, m, d] = date.split('-').map(Number)
          const loggedAt = new Date(
            y,
            (m ?? 1) - 1,
            d ?? 1,
            now.getHours(),
            now.getMinutes(),
          ).toISOString()
          addActivityLog({
            sport,
            durationMin: Math.max(0, Number(duration) || 0),
            intensity: intensity || null,
            notes: notes.trim() || undefined,
            loggedAt,
          })
          setDuration('')
          setIntensity('')
          setNotes('')
        }}
      >
        <input
          list="sport-options"
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          placeholder="ענף (בחר או הקלד ענף חדש)"
          className={inputClass}
          required
        />
        <datalist id="sport-options">
          {sportOptions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <div className="flex flex-wrap gap-1.5">
          {sportOptions.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSport(s)}
              className={[
                'rounded-lg px-2 py-1 text-xs transition',
                sport === s
                  ? 'bg-primary text-white'
                  : 'bg-surface text-muted hover:text-text',
              ].join(' ')}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input
            inputMode="numeric"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="דקות"
            className={inputClass}
          />
          <select
            value={intensity}
            onChange={(e) => setIntensity(e.target.value as Intensity | '')}
            className={inputClass}
          >
            <option value="">עצימות</option>
            {(Object.keys(INTENSITY_LABELS) as Intensity[]).map((k) => (
              <option key={k} value={k}>
                {INTENSITY_LABELS[k]}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="הערות (אופציונלי)"
          className={inputClass}
        />
        <Button type="submit" className="w-full" variant="accent">
          תעד פעילות
        </Button>
      </form>

      {recent.length > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-line pt-3">
          {recent.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-lg bg-surface px-2.5 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">
                  {a.sport}
                </p>
                <p className="truncate text-[11px] text-muted">
                  {new Date(a.loggedAt).toLocaleDateString('he-IL')}
                  {a.durationMin ? ` · ${a.durationMin} דק׳` : ''}
                  {a.intensity ? ` · ${INTENSITY_LABELS[a.intensity]}` : ''}
                  {a.notes ? ` · ${a.notes}` : ''}
                </p>
              </div>
              <IconButton
                label="מחק פעילות"
                tone="danger"
                onClick={() => deleteActivityLog(a.id)}
              >
                <Trash2 className="size-3.5" strokeWidth={1.75} />
              </IconButton>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  )
}
