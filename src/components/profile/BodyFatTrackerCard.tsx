import { useMemo } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { BODY_LOG_FIELDS, bodyLogDeltas, formatMeasure, formatSigned } from '../../lib/bodyLog'
import { Card } from '../ui/Card'
import { BodyLogForm, BodyLogHistoryButton, deltaTone, formatDayHe } from './BodyLogHistory'

const RECENT = 3

/** "מעקב אחוזי שומן והיקפים חודשי": trend, monthly entry form, latest readings + full history table. */
export function BodyFatTrackerCard() {
  const { bodyLogHistory, latestBody } = useAppData()
  const deltas = useMemo(() => bodyLogDeltas(bodyLogHistory), [bodyLogHistory])
  const recent = useMemo(() => [...bodyLogHistory].reverse().slice(0, RECENT), [bodyLogHistory])
  const trend =
    latestBody.baselineFatPct != null && latestBody.bodyFatPct != null
      ? Math.round((latestBody.bodyFatPct - latestBody.baselineFatPct) * 100) / 100
      : null

  return (
    <Card title="מעקב אחוזי שומן והיקפים חודשי">
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5">
        <p className="font-display text-lg font-extrabold tabular-nums text-text" dir="ltr">
          {latestBody.baselineFatPct != null && latestBody.bodyFatPct != null
            ? `${formatMeasure(latestBody.baselineFatPct, '%')} ➔ ${formatMeasure(latestBody.bodyFatPct, '%')}`
            : formatMeasure(latestBody.bodyFatPct, '%')}
        </p>
        {trend != null ? (
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${deltaTone(trend, true)}`} dir="ltr">
            {formatSigned(trend, '%')}
          </span>
        ) : null}
        <p className="w-full text-[11px] text-muted">
          מגמת שומן מתחילת הבלוק
          {latestBody.waistCm != null ? ` · מותן אחרון: ${formatMeasure(latestBody.waistCm, 'ס"מ')}` : ''}
        </p>
      </div>

      <div className="mb-4">
        <BodyLogForm />
      </div>

      {recent.length ? (
        <>
          <p className="mb-1.5 text-xs font-semibold text-muted">מדידות אחרונות</p>
          <ol className="mb-3 space-y-2" aria-label="מדידות אחרונות">
            {recent.map((entry) => {
              const row = deltas.get(entry.id) ?? {}
              return (
                <li key={entry.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-sm font-bold tabular-nums text-text">
                    {formatDayHe(entry.date)}
                    {entry.note ? <span className="ms-2 text-xs font-normal text-muted">{entry.note}</span> : null}
                  </p>
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {BODY_LOG_FIELDS.map((f) => {
                      const d = row[f.key]
                      if (!d) return null
                      return (
                        <li key={f.key} className="rounded-xl bg-slate-50 px-2 py-1 text-[11px]">
                          <span className="text-muted">{f.short} </span>
                          <span className="font-bold tabular-nums text-text">{formatMeasure(d.value, f.unit)}</span>
                          {d.vsPrevious != null ? (
                            <span
                              className={`ms-1 rounded-full px-1.5 font-bold tabular-nums ${deltaTone(d.vsPrevious, f.lowerIsBetter)}`}
                              dir="ltr"
                            >
                              {formatSigned(d.vsPrevious, f.unit)}
                            </span>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                </li>
              )
            })}
          </ol>
        </>
      ) : (
        <p className="mb-3 text-sm text-muted">אין מדידות עדיין.</p>
      )}

      <BodyLogHistoryButton />
    </Card>
  )
}
