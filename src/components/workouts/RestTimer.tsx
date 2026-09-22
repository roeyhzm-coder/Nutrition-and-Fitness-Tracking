import { useRestTimer } from '../../hooks/useRestTimer'
import { Button } from '../ui/Button'

export function RestTimer({ defaultSeconds = 90 }: { defaultSeconds?: number }) {
  const timer = useRestTimer(defaultSeconds)

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted">טיימר מנוחה</p>
          <p className="font-display text-3xl font-bold tabular-nums text-text">
            {timer.format}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {[60, 90, 120].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => timer.chooseDuration(s)}
              className={[
                'rounded-lg px-2.5 py-1 text-xs font-medium',
                timer.duration === s
                  ? 'bg-primary/20 text-primary'
                  : 'bg-card text-muted',
              ].join(' ')}
            >
              {s} שנ׳
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {!timer.running ? (
          <Button
            className="flex-1"
            onClick={() => timer.start(timer.duration)}
          >
            התחל
          </Button>
        ) : (
          <Button className="flex-1" variant="surface" onClick={timer.pause}>
            השהה
          </Button>
        )}
        <Button variant="ghost" onClick={timer.reset}>
          איפוס
        </Button>
      </div>
    </div>
  )
}
