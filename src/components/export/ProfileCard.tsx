import { useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import type { UserProfile } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

type NumericKey = 'age' | 'heightCm' | 'startWeightKg' | 'estimatedBodyFatPct'
type TextKey = 'avoidFoods' | 'allergies' | 'supplements' | 'injuries'

const NUMERIC_FIELDS: ReadonlyArray<[NumericKey, string]> = [
  ['age', 'גיל'],
  ['heightCm', 'גובה (ס״מ)'],
  ['startWeightKg', 'משקל התחלתי (ק״ג)'],
  ['estimatedBodyFatPct', 'אחוז שומן מוערך (%)'],
]

const TEXT_FIELDS: ReadonlyArray<[TextKey, string, string]> = [
  ['avoidFoods', 'מאכלים שנמנעים מהם', 'למשל: בשר אדום, מטוגן'],
  ['allergies', 'אלרגיות / רגישויות מזון', 'למשל: לקטוז, אגוזים'],
  ['supplements', 'תוספי תזונה בשימוש שוטף', 'למשל: קריאטין 5ג׳, אבקת חלבון'],
  ['injuries', 'רגישויות מפרקיות / פציעות עבר', 'למשל: כתף ימין, ברך שמאל'],
]

type ProfileForm = Record<NumericKey | TextKey, string>

const inputClass = 'mt-1 field'

function toForm(p: UserProfile): ProfileForm {
  return {
    age: p.age != null ? String(p.age) : '',
    heightCm: p.heightCm != null ? String(p.heightCm) : '',
    startWeightKg: p.startWeightKg != null ? String(p.startWeightKg) : '',
    estimatedBodyFatPct:
      p.estimatedBodyFatPct != null ? String(p.estimatedBodyFatPct) : '',
    avoidFoods: p.avoidFoods,
    allergies: p.allergies,
    supplements: p.supplements,
    injuries: p.injuries,
  }
}

function parseNum(raw: string): number | null {
  if (!raw.trim()) return null
  const n = Number(raw.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

export function ProfileCard() {
  const { profile, setProfile } = useAppData()
  const [form, setForm] = useState<ProfileForm>(() => toForm(profile))
  const [source, setSource] = useState(profile)
  const [saved, setSaved] = useState(false)

  if (source !== profile) {
    setSource(profile)
    setForm(toForm(profile))
  }

  return (
    <Card title="פרופיל אישי">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          setProfile({
            age: parseNum(form.age),
            heightCm: parseNum(form.heightCm),
            startWeightKg: parseNum(form.startWeightKg),
            estimatedBodyFatPct: parseNum(form.estimatedBodyFatPct),
            avoidFoods: form.avoidFoods.trim(),
            allergies: form.allergies.trim(),
            supplements: form.supplements.trim(),
            injuries: form.injuries.trim(),
          })
          setSaved(true)
          window.setTimeout(() => setSaved(false), 2000)
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          {NUMERIC_FIELDS.map(([key, label]) => (
            <label key={key} className="block text-xs text-muted">
              {label}
              <input
                inputMode="decimal"
                value={form[key]}
                onChange={(e) =>
                  setForm((p) => ({ ...p, [key]: e.target.value }))
                }
                placeholder="לא צוין"
                className={inputClass}
              />
            </label>
          ))}
        </div>
        <p className="text-[10px] text-muted">
          משקל עדכני ואחוז שומן נשלפים אוטומטית מיומן השקילות. משקל התחלתי
          ריק = השקילה הראשונה ביומן.
        </p>
        {TEXT_FIELDS.map(([key, label, placeholder]) => (
          <label key={key} className="block text-xs text-muted">
            {label}
            <textarea
              rows={2}
              value={form[key]}
              onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
              placeholder={placeholder}
              className={`${inputClass} resize-y`}
            />
          </label>
        ))}
        <Button type="submit" className="w-full" variant="accent">
          {saved ? 'נשמר ✓' : 'שמור פרופיל'}
        </Button>
      </form>
    </Card>
  )
}
