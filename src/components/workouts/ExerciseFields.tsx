import type { Dispatch, SetStateAction } from 'react'
import { CirclePlay, Dumbbell, Timer } from 'lucide-react'
import type { Exercise } from '../../lib/types'
import type { ExerciseForm } from '../../lib/exerciseForm'

const inputClass =
  'w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary'

type ExerciseFormFieldsProps = {
  form: ExerciseForm
  setForm: Dispatch<SetStateAction<ExerciseForm>>
}

export function ExerciseFormFields({ form, setForm }: ExerciseFormFieldsProps) {
  const bind = (key: keyof ExerciseForm) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) =>
      setForm((p) => ({ ...p, [key]: e.target.value })),
  })

  return (
    <>
      <input {...bind('name')} placeholder="שם התרגיל" className={inputClass} required />
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-muted">
          סטים
          <input {...bind('sets')} inputMode="numeric" className={`mt-1 ${inputClass}`} />
        </label>
        <label className="block text-xs text-muted">
          חזרות
          <input {...bind('reps')} placeholder="8-12 / 30 שניות" className={`mt-1 ${inputClass}`} />
        </label>
        <label className="block text-xs text-muted">
          זמן מנוחה
          <input {...bind('rest')} placeholder="2-3 דקות / 60 שניות" className={`mt-1 ${inputClass}`} />
        </label>
        <label className="block text-xs text-muted">
          משקל
          <input {...bind('weight')} placeholder='משקל גוף / 10 ק"ג' className={`mt-1 ${inputClass}`} />
        </label>
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
        <span className="rounded-md bg-line/50 px-1.5 py-0.5 text-text">
          {exercise.sets} סטים
        </span>
        <span className="rounded-md bg-line/50 px-1.5 py-0.5 text-text">
          {exercise.reps}
        </span>
        {exercise.rest ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
            <Timer className="size-3" strokeWidth={2} />
            מנוחה {exercise.rest}
          </span>
        ) : null}
        {exercise.weight ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-line/50 px-1.5 py-0.5 text-muted">
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
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-primary/10 hover:text-primary"
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
      className="relative block size-16 shrink-0 overflow-hidden rounded-lg border border-line bg-surface"
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
