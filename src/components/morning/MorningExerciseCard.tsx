import { Info, Pencil } from 'lucide-react'
import type { MorningExercise } from '../../lib/morningRoutine'
import { MorningIllustration } from './MorningIllustration'

export function MorningExerciseCard({
  exercise,
  index,
  onEdit,
}: {
  exercise: MorningExercise
  index: number
  onEdit: () => void
}) {
  const number = String(index + 1).padStart(2, '0')
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/70">
      <div className="flex gap-3">
        {/* RTL: first child sits on the right. */}
        <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-stone-100">
          <MorningIllustration kind={exercise.illustration} className="size-[4.25rem]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-display text-xs font-extrabold tabular-nums text-blue-600">
                  {number}
                </span>
                {exercise.badge ? (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-100">
                    {exercise.badge}
                  </span>
                ) : null}
              </div>
              <h3 className="mt-0.5 font-display text-[15px] font-bold leading-snug text-text">
                {exercise.nameHe}
              </h3>
              {exercise.nameEn ? (
                <p
                  dir="ltr"
                  className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted"
                >
                  {exercise.nameEn}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {exercise.target ? (
                <span
                  dir="auto"
                  className="whitespace-nowrap rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold tabular-nums text-white"
                >
                  {exercise.target}
                </span>
              ) : null}
              <button
                type="button"
                onClick={onEdit}
                aria-label={`עריכת התרגיל ${exercise.nameHe}`}
                className="flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-slate-100 hover:text-blue-600"
              >
                <Pencil className="size-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>
          {exercise.description ? (
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              {exercise.description}
            </p>
          ) : null}
        </div>
      </div>
      {exercise.tip ? (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-xl bg-blue-50 px-2.5 py-2 text-[11px] leading-relaxed text-blue-800">
          <Info className="mt-px size-3.5 shrink-0" strokeWidth={2} />
          <span>{exercise.tip}</span>
        </p>
      ) : null}
    </li>
  )
}
