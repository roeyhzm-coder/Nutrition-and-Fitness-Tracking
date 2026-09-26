import { useState } from 'react'
import { Briefcase, Moon, PersonStanding } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import {
  ACTIVITY_LEVEL_LABELS,
  WORK_STYLE_LABELS,
  type ActivityLevel,
  type WorkStyle,
} from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

const ACTIVITY_LEVELS = Object.keys(ACTIVITY_LEVEL_LABELS) as ActivityLevel[]
const WORK_STYLES = Object.keys(WORK_STYLE_LABELS) as WorkStyle[]

type Form = {
  activityLevel: ActivityLevel | ''
  avgSleepHours: string
  workStyle: WorkStyle | ''
}

export function LifestyleCard() {
  const { profile, setProfile } = useAppData()
  const [form, setForm] = useState<Form>({
    activityLevel: profile.activityLevel ?? '',
    avgSleepHours:
      profile.avgSleepHours != null ? String(profile.avgSleepHours) : '',
    workStyle: profile.workStyle ?? '',
  })
  const [source, setSource] = useState(profile)
  const [saved, setSaved] = useState(false)

  if (source !== profile) {
    setSource(profile)
    setForm({
      activityLevel: profile.activityLevel ?? '',
      avgSleepHours:
        profile.avgSleepHours != null ? String(profile.avgSleepHours) : '',
      workStyle: profile.workStyle ?? '',
    })
  }

  return (
    <Card title="פעילות יומית ואורח חיים">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          const sleepRaw = form.avgSleepHours.replace(',', '.')
          const sleep = sleepRaw === '' ? null : Number(sleepRaw)
          setProfile({
            ...profile,
            activityLevel: form.activityLevel || null,
            avgSleepHours:
              sleep != null && Number.isFinite(sleep) && sleep >= 0
                ? Math.min(sleep, 24)
                : null,
            workStyle: form.workStyle || null,
          })
          setSaved(true)
          window.setTimeout(() => setSaved(false), 2000)
        }}
      >
        <label className="block text-xs text-muted">
          <span className="flex items-center gap-1">
            <PersonStanding className="size-3.5 text-blue-600" strokeWidth={1.75} />
            רמת פעילות יומית
          </span>
          <select
            value={form.activityLevel}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                activityLevel: e.target.value as ActivityLevel | '',
              }))
            }
            className="mt-1 field"
          >
            <option value="">לא צוין</option>
            {ACTIVITY_LEVELS.map((key) => (
              <option key={key} value={key}>
                {ACTIVITY_LEVEL_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-muted">
          <span className="flex items-center gap-1">
            <Moon className="size-3.5 text-blue-600" strokeWidth={1.75} />
            שעות שינה ממוצעות
          </span>
          <input
            inputMode="decimal"
            value={form.avgSleepHours}
            onChange={(e) =>
              setForm((p) => ({ ...p, avgSleepHours: e.target.value }))
            }
            placeholder="למשל 7.5"
            className="mt-1 field"
          />
        </label>
        <label className="block text-xs text-muted">
          <span className="flex items-center gap-1">
            <Briefcase className="size-3.5 text-blue-600" strokeWidth={1.75} />
            עבודה בישיבה / תנועה
          </span>
          <select
            value={form.workStyle}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                workStyle: e.target.value as WorkStyle | '',
              }))
            }
            className="mt-1 field"
          >
            <option value="">לא צוין</option>
            {WORK_STYLES.map((key) => (
              <option key={key} value={key}>
                {WORK_STYLE_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" className="w-full" variant="surface">
          {saved ? 'נשמר ✓' : 'שמור אורח חיים'}
        </Button>
      </form>
    </Card>
  )
}
