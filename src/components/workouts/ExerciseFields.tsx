import type { Dispatch, SetStateAction } from 'react'
import { CirclePlay, Dumbbell, Timer } from 'lucide-react'
import type { Exercise } from '../../lib/types'
import { resizeFormDefaultSets, type ExerciseForm } from '../../lib/exerciseForm'
import { NumericInput } from '../ui/NumericInput'

const inputClass = 'field'

type ExerciseFormFieldsProps = {
  form: ExerciseForm
  setForm: Dispatch<SetStateAction<ExerciseForm>>
}

export function ExerciseFormFields({ form, setForm }: ExerciseFormFieldsProps) {
  const bind = (key: Exclude<keyof ExerciseForm, 'defaultSets'>) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) =>
      setForm((p) => ({ ...p, [key]: e.target.value })),
  })

  return (
    <>
      <input {...bind('name')} placeholder="שם התרגיל" className={inputClass} required />
      <p className="text-[11px] text-muted">
        ברירות מחדל — ממלאות אוטומטית את הסטים באימון הפעיל (ניתן גם לשמור מהאימון עצמו)
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-muted">
          סטים (ברירת מחדל)
          <NumericInput
            decimals={0}
            value={form.sets}
            onChange={(sets) =>
              setForm((p) => ({
                ...p,
                sets,
                defaultSets: resizeFormDefaultSets(
                  p.defaultSets,
                  Math.max(1, Number(sets) || 1),
                ),
              }))
            }
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="block text-xs text-muted">
          חזרות (תווית / טווח)
          <input {...bind('reps')} placeholder="8-12 / 30 שניות" className={`mt-1 ${inputClass}`} />
        </label>
        <label className="block text-xs text-muted">
          משקל (תווית)
          <input {...bind('weight')} placeholder='משקל גוף / 10 ק"ג' className={`mt-1 ${inputClass}`} />
        </label>
        <label className="block text-xs text-muted">
          זמן מנוחה
          <input {...bind('rest')} placeholder="2-3 דקות / 60 שניות" className={`mt-1 ${inputClass}`} />
        </label>
      </div>
      <div>
        <p className="mb-1.5 text-xs text-muted">משקל וחזרות לפי סט</p>
        <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5 text-[11px] text-muted">
          <span className="text-center">#</span>
          <span className="text-center">משקל (ק״ג)</span>
          <span className="text-center">חזרות</span>
        </div>
        <ul className="mt-1 space-y-1">
          {form.defaultSets.map((row, i) => (
            <li
              key={i}
              className="grid h-11 grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5"
            >
              <span className="text-center text-sm font-semibold text-muted">{i + 1}</span>
              <NumericInput
                value={row.weightKg}
                onChange={(weightKg) =>
                  setForm((p) => ({
                    ...p,
                    defaultSets: p.defaultSets.map((s, j) =>
                      j === i ? { ...s, weightKg } : s,
                    ),
                  }))
                }
                placeholder="10"
                className={inputClass}
              />
              <NumericInput
                value={row.reps}
                onChange={(reps) =>
                  setForm((p) => ({
                    ...p,
                    defaultSets: p.defaultSets.map((s, j) =>
                      j === i ? { ...s, reps } : s,
                    ),
                  }))
                }
                placeholder="8"
                className={inputClass}
              />
            </li>
          ))}
        </ul>
      </div>
      <textarea
        {...bind('notes')}
        placeholder="הערות (אופציונלי)"
        rows={2}
        className={`${inputClass} resize-y`}
      />
      <input
        {...bind('mediaUrl')}
        type="url"
        dir="ltr"
        placeholder="קישור לסרטון הדגמה (אופציונלי)"
        className={inputClass}
      />
      <input
        {...bind('imageUrl')}
        dir="ltr"
        placeholder="קישור לתמונה (אופציונלי)"
        className={inputClass}
      />
    </>
  )
}

export function ExerciseDetails({ exercise }: { exercise: Exercise }) {
  return (
    <>
      <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-text">
          {exercise.sets} סטים
        </span>
        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-text">
          {exercise.reps}
        </span>
        {exercise.rest ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2 py-0.5 font-medium text-blue-600">
            <Timer className="size-3" strokeWidth={2} />
            מנוחה {exercise.rest}
          </span>
        ) : null}
        {exercise.weight ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-muted">
            <Dumbbell className="size-3" strokeWidth={2} />
            {exercise.weight}
          </span>
        ) : null}
      </div>
      {exercise.notes ? (
        <p className="mt-1 text-xs text-muted">{exercise.notes}</p>
      ) : null}
    </>
  )
}

export function ExerciseMedia({ exercise }: { exercise: Exercise }) {
  const { imageUrl, mediaUrl, name } = exercise
  const href = mediaUrl ?? imageUrl
  if (!href) return null

  if (!imageUrl) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="צפה בהדגמה"
        title="צפה בהדגמה"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl text-muted transition hover:bg-blue-50 hover:text-blue-600"
      >
        <CirclePlay className="size-3.5" strokeWidth={1.75} />
      </a>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={mediaUrl ? 'צפה בהדגמה' : name}
      className="relative block size-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
    >
      <img
        src={imageUrl}
        alt={name}
        loading="lazy"
        className="size-full object-cover"
      />
      {mediaUrl ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white transition hover:bg-black/10">
          <CirclePlay className="size-6" strokeWidth={1.75} />
        </span>
      ) : null}
    </a>
  )
}
