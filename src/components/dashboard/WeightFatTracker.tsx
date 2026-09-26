import type { WeightEntry } from '../../lib/types'
import { Card } from '../ui/Card'

type WeightTrackerProps = {
  entries: WeightEntry[]
}

export function WeightFatTracker({ entries }: WeightTrackerProps) {
  const weights = [...entries]
    .filter((e) => e.weightKg > 0)
    .reverse()
    .slice(0, 14)

  return (
    <Card title="מעקב משקל">
      {weights.length === 0 ? (
        <p className="text-sm text-muted">אין מדידות משקל עדיין.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[240px] text-right text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-muted">
                <th className="px-2 py-2 font-medium">תאריך</th>
                <th className="px-2 py-2 font-medium">משקל</th>
                <th className="px-2 py-2 font-medium">הערה</th>
              </tr>
            </thead>
            <tbody>
              {weights.map((e) => (
                <tr key={e.id} className="border-b border-slate-200">
                  <td className="px-2 py-3 text-muted">
                    {new Date(e.loggedAt).toLocaleDateString('he-IL')}
                  </td>
                  <td className="px-2 py-3 font-display font-bold tabular-nums text-text">
                    {e.weightKg} ק״ג
                  </td>
                  <td className="px-2 py-2 text-muted">{e.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
