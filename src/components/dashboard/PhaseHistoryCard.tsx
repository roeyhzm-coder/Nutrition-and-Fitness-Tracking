import { Trash2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { PHASE_LABELS } from '../../lib/types'
import { Card } from '../ui/Card'
import { IconButton } from '../ui/IconButton'

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString('he-IL')
}

export function PhaseHistoryCard() {
  const { phaseHistory, deletePhaseHistory } = useAppData()

  if (phaseHistory.length === 0) return null

  return (
    <Card title={`היסטוריית שלבים · ${phaseHistory.length}`}>
      <ul className="space-y-2">
        {[...phaseHistory].reverse().map((h) => {
          const delta =
            h.startWeightKg != null && h.endWeightKg != null
              ? h.endWeightKg - h.startWeightKg
              : null
          return (
            <li
              key={h.id}
              className="flex items-start gap-2 rounded-xl border border-line bg-surface px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text">
                  {PHASE_LABELS[h.phase]} · {h.actualDays} ימים
                  <span className="font-normal text-muted">
                    {' '}
                    (מתוכנן {h.plannedDays})
                  </span>
                </p>
                <p className="text-xs text-muted">
                  {fmtDate(h.startDate)} – {fmtDate(h.endDate)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  משקל: {h.startWeightKg ?? '—'} → {h.endWeightKg ?? '—'} ק״ג
                  {delta != null
                    ? ` (${delta > 0 ? '+' : ''}${delta.toFixed(1)})`
                    : ''}
                  {' · '}
                  ממוצע {h.avgCalories ?? '—'} קק״ל
                </p>
              </div>
              <IconButton
                label="מחק מההיסטוריה"
                tone="danger"
                onClick={() => {
                  if (window.confirm('למחוק את השלב מההיסטוריה?')) {
                    deletePhaseHistory(h.id)
                  }
                }}
              >
                <Trash2 className="size-3.5" strokeWidth={1.75} />
              </IconButton>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
