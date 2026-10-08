import { useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import {
  displayDecimal,
  formatKg,
  formatNiceNumber,
  parseInteger,
  parsePositiveDecimal,
} from '../../lib/numericInput'
import {
  calcBmi,
  calcMaleNavyBodyFatPct,
  latestWeighInKg,
  navyBodyFatValidationMessage,
  SEX_LABELS,
  type Sex,
  type UserProfile,
} from '../../lib/types'
import { Button } from '../ui/button'
import { Card } from '../ui/Card'
import { NumericInput } from '../ui/NumericInput'

type NumericKey =
  | 'age'
  | 'heightCm'
  | 'startWeightKg'
  | 'targetWeightKg'
  | 'waistCircumferenceCm'
  | 'neckCircumferenceCm'
type TextKey = 'avoidFoods' | 'allergies' | 'supplements' | 'injuries'

const NUMERIC_FIELDS: ReadonlyArray<[NumericKey, string, number]> = [
  ['age', 'גיל', 0],
  ['heightCm', 'גובה (ס״מ)', 2],
  ['startWeightKg', 'משקל התחלתי (ק״ג)', 2],
  ['targetWeightKg', 'משקל יעד (ק״ג)', 2],
  ['waistCircumferenceCm', 'היקף מותניים (ס״מ)', 2],
  ['neckCircumferenceCm', 'היקף צוואר (ס״מ)', 2],
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
    age: displayDecimal(p.age),
    heightCm: displayDecimal(p.heightCm),
    startWeightKg: displayDecimal(p.startWeightKg),
    targetWeightKg: displayDecimal(targetWeightKg),
    waistCircumferenceCm: displayDecimal(p.waistCircumferenceCm),
    neckCircumferenceCm: displayDecimal(p.neckCircumferenceCm),
    sex: p.sex ?? '',
    avoidFoods: p.avoidFoods,
    allergies: p.allergies,
    supplements: p.supplements,
    injuries: p.injuries,
  }
}

export function ProfileCard() {
  const { profile, setProfile, goal, setGoal, weightLogs, recordBodyMeasurement } =
    useAppData()
  const latestWeight = latestWeighInKg(weightLogs, [], [
    goal.startWeightKg,
    profile.startWeightKg,
  ])
  const [form, setForm] = useState<ProfileForm>(() =>
    toForm(profile, goal.masterTargetWeightKg),
  )
  const [source, setSource] = useState({
    profile,
    target: goal.masterTargetWeightKg,
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (
    source.profile !== profile ||
    source.target !== goal.masterTargetWeightKg
  ) {
    setSource({ profile, target: goal.masterTargetWeightKg })
    setForm(toForm(profile, goal.masterTargetWeightKg))
  }

  const heightCm = parsePositiveDecimal(form.heightCm)
  const waistCm = parsePositiveDecimal(form.waistCircumferenceCm)
  const neckCm = parsePositiveDecimal(form.neckCircumferenceCm)
  const estimatedBodyFatPct = calcMaleNavyBodyFatPct(waistCm, neckCm, heightCm)
  const measurementError = navyBodyFatValidationMessage(
    waistCm,
    neckCm,
    heightCm,
  )

  const bmi = calcBmi(
    latestWeight ?? parsePositiveDecimal(form.startWeightKg),
    heightCm,
  )

  return (
    <Card title="נתונים אישיים ומדדים">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (measurementError) {
            setError(measurementError)
            setSaved(false)
            return
          }
          setError(null)
          setProfile({
            ...profile,
            age: parseInteger(form.age),
            heightCm,
            sex: form.sex || null,
            startWeightKg: parsePositiveDecimal(form.startWeightKg),
            waistCircumferenceCm: waistCm,
            neckCircumferenceCm: neckCm,
            estimatedBodyFatPct,
            avoidFoods: form.avoidFoods.trim(),
            allergies: form.allergies.trim(),
            supplements: form.supplements.trim(),
            injuries: form.injuries.trim(),
          })
          setGoal({
            ...goal,
            masterTargetWeightKg: parsePositiveDecimal(form.targetWeightKg),
          })
          recordBodyMeasurement({
            weightKg:
              latestWeight ?? parsePositiveDecimal(form.startWeightKg),
            waistCircumferenceCm: waistCm,
            neckCircumferenceCm: neckCm,
            bodyFatPercentage: estimatedBodyFatPct,
          })
          setSaved(true)
          window.setTimeout(() => setSaved(false), 2000)
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          {NUMERIC_FIELDS.map(([key, label, decimals]) => (
            <label key={key} className="block text-xs text-muted">
              {label}
              <NumericInput
                decimals={decimals}
                value={form[key]}
                onChange={(next) => {
                  setError(null)
                  setForm((p) => ({ ...p, [key]: next }))
                }}
                placeholder="לא צוין"
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
          <p className="text-xs text-muted">משקל עדכני (מיומן השקילות)</p>
          <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-text">
            {latestWeight != null ? `${formatKg(latestWeight)} ק״ג` : '—'}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs text-muted">BMI מחושב אוטומטית</p>
          <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-text">
            {bmi != null ? bmi.toFixed(1) : '—'}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            לפי משקל עדכני
            {latestWeight != null ? ` (${formatKg(latestWeight)} ק״ג)` : ''} וגובה.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="font-display text-lg font-extrabold tabular-nums text-text">
            אחוז שומן מוערך:{' '}
            {estimatedBodyFatPct != null
              ? `${formatNiceNumber(estimatedBodyFatPct, 2)}%`
              : '—'}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            מחושב בזמן אמת לפי נוסחת חיל הים לגברים (מותניים, צוואר וגובה
            מהפרופיל). לא ניתן לעריכה ידנית.
          </p>
        </div>

        {measurementError || error ? (
          <p className="text-xs text-red-600" role="alert">
            {measurementError || error}
          </p>
        ) : null}

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
