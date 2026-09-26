import { useState } from 'react'
import { Footprints, HeartPulse, Moon } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import type { LifestyleEntry } from '../../lib/types'
import { todayKey } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

type Form = { steps: string; sleepHours: string; recovery: string }

function toForm(entry: LifestyleEntry | undefined): Form {
  return {
    steps: entry?.steps != null ? String(entry.steps) : '',
    sleepHours: entry?.sleepHours != null ? String(entry.sleepHours) : '',
    recovery: entry?.recovery != null ? String(entry.recovery) : '',
  }
}

function parse(raw: string, max?: number): number | null {
  if (!raw.trim()) return null
  const n = Number(raw.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return null
  return max != null ? Math.min(n, max) : n
}

const inputClass = 'mt-1 field'

export function LifestyleCard() {
  const { lifestyleLogs, setLifestyleEntry } = useAppData()
  const today = todayKey()
  const entry = lifestyleLogs[today]
  const [form, setForm] = useState<Form>(() => toForm(entry))
  const [source, setSource] = useState(entry)
  const [saved, setSaved] = useState(false)

  if (source !== entry) {
    setSource(entry)
    setForm(toForm(entry))
  }

  const fields = [
    ['steps', 'צעדים', Footprints, 'numeric'],
    ['sleepHours', 'שעות שינה', Moon, 'decimal'],
    ['recovery', 'התאוששות 1–10', HeartPulse, 'numeric'],
  ] as const

  return (
    <Card title="פעילות יומית ואורח חיים">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          const steps = parse(form.steps)
          setLifestyleEntry(today, {
            steps: steps != null ? Math.round(steps) : null,
            sleepHours: parse(form.sleepHours, 24),
            recovery: parse(form.recovery, 10),
          })
          setSaved(true)
          window.setTimeout(() => setSaved(false), 2000)
        }}
      >
        <div className="grid grid-cols-3 gap-2">
          {fields.map(([key, label, Icon, mode]) => (
            <label key={key} className="block text-xs text-muted">
              <span className="flex items-center gap-1">
                <Icon className="size-3.5 text-blue-600" strokeWidth={1.75} />
                {label}
              </span>
              <input
                inputMode={mode}
                value={form[key]}
                onChange={(e) =>
                  setForm((p) => ({ ...p, [key]: e.target.value }))
                }
                placeholder="—"
                className={inputClass}
              />
            </label>
          ))}
        </div>
        <Button type="submit" className="w-full" variant="surface">
          {saved ? 'נשמר ✓' : 'שמור להיום'}
        </Button>
      </form>
    </Card>
  )
}
