import { useAppData } from '../../context/AppDataContext'
import {
  PHASE_ACTIVE_CLASS,
  PHASE_LABELS,
  PHASES,
} from '../../lib/types'

export function NutritionPhasePicker() {
  const { phase, setPhase } = useAppData()

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted">שלב תזונה</p>
      <div className="mb-3 grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-50 p-1.5">
        {PHASES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPhase(p)}
            className={[
              'min-h-11 rounded-xl px-3 py-2 text-sm font-bold transition',
              phase === p
                ? PHASE_ACTIVE_CLASS[p]
                : 'text-muted hover:bg-slate-100 hover:text-text',
            ].join(' ')}
          >
            {PHASE_LABELS[p]}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">
        מעבר בין מסה, חיטוב ותחזוקה מחליף אוטומטית את יעדי המאקרו השמורים לכל
        שלב, כולל הסטטוס בייצוא הנתונים.
      </p>
    </div>
  )
}
