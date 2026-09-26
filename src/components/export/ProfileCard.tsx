import { useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import {
  calcBmi,
  SEX_LABELS,
  type Sex,
  type UserProfile,
} from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

type NumericKey = 'age' | 'heightCm' | 'startWeightKg' | 'targetWeightKg'
type TextKey = 'avoidFoods' | 'allergies' | 'supplements' | 'injuries'

const NUMERIC_FIELDS: ReadonlyArray<[NumericKey, string]> = [
  ['age', 'גיל'],
  ['heightCm', 'גובה (ס״מ)'],
  ['startWeightKg', 'משקל התחלתי (ק״ג)'],
  ['targetWeightKg', 'משקל יעד (ק״ג)'],
]

const TEXT_FIELDS: ReadonlyArray<[TextKey, string, string]> = [
  ['avoidFoods', 'מאכלים שנמנעים מהם', 'למשל: בשר אדום, מטוגן'],
  ['allergies', 'אלרגיות / רגישויות מזון', 'למשל: לקטוז, אגוזים'],
  ['supplements', 'תוספי תזונה בשימוש שוטף', 'למשל: קריאטין 5ג׳, אבקת חלבון'],
  ['injuries', 'רגישויות מפרקיות / פציעות עבר', 'למשל: כתף ימין, ברך שמאל'],
]

type ProfileForm = Record<NumericKey | TextKey, string> & { sex: Sex | '' }

const inputClass = 'mt-1 field'

function toForm(
  p: UserProfile,
  targetWeightKg: number | null,
): ProfileForm {
  return {
    age: p.age != null ? String(p.age) : '',
    heightCm: p.heightCm != null ? String(p.heightCm) : '',
    startWeightKg: p.startWeightKg != null ? String(p.startWeightKg) : '',
    targetWeightKg: targetWeightKg != null ? String(targetWeightKg) : '',
    sex: p.sex ?? '',
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
  const { profile, setProfile, goal, setGoal, weightLogs } = useAppData()
  const latestWeight = [...weightLogs]
    .reverse()
    .find((e) => e.weightKg > 0)?.weightKg
  const [form, setForm] = useState<ProfileForm>(() =>
    toForm(profile, goal.targetWeightKg),
  )
  const [source, setSource] = useState({ profile, target: goal.targetWeightKg })
  const [saved, setSaved] = useState(false)

  if (source.profile !== profile || source.target !== goal.targetWeightKg) {
    setSource({ profile, target: goal.targetWeightKg })
    setForm(toForm(profile, goal.targetWeightKg))
  }

  const bmi = calcBmi(latestWeight ?? profile.startWeightKg, parseNum(form.heightCm))

  return (
    <Card title="נתונים אישיים ומדדים">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          setProfile({
            ...profile,
            age: parseNum(form.age),
            heightCm: parseNum(form.heightCm),
            sex: form.sex || null,
            startWeightKg: parseNum(form.startWeightKg),
            avoidFoods: form.avoidFoods.trim(),
            allergies: form.allergies.trim(),
            supplements: form.supplements.trim(),
            injuries: form.injuries.trim(),
          })
          setGoal({
            ...goal,
            targetWeightKg: parseNum(form.targetWeightKg),
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

        <label className="block text-xs text-muted">
          מין
          <select
            value={form.sex}
            onChange={(e) =>
              setForm((p) => ({ ...p, sex: e.target.value as Sex | '' }))
            }
            className={inputClass}
          >
            <option value="">לא צוין</option>
            {(Object.keys(SEX_LABELS) as Sex[]).map((key) => (
              <option key={key} value={key}>
                {SEX_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs text-muted">BMI מחושב אוטומטית</p>
          <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-text">
            {bmi != null ? bmi.toFixed(1) : '—'}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            לפי משקל עדכני
            {latestWeight != null ? ` (${latestWeight} ק״ג)` : ''} וגובה.
          </p>
        </div>

        <p className="text-[10px] text-muted">
          מדדים נשמרים מיידית ב-localStorage וב-Supabase. משקל עדכני נשלף
          מיומן השקילות.
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
          {saved ? 'נשמר ✓' : 'שמור נתונים אישיים'}
        </Button>
      </form>
    </Card>
  )
}
