import { useState } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { RestTimer } from '../components/workouts/RestTimer'
import { SetLogger } from '../components/workouts/SetLogger'
import { KeyLiftsProgress } from '../components/workouts/KeyLiftsProgress'
import { Card } from '../components/ui/Card'
import { useAppData } from '../context/AppDataContext'
import { WORKOUT_DAYS } from '../data/workouts'

export function WorkoutsPage() {
  const { setLogs, addSetLog } = useAppData()
  const [dayId, setDayId] = useState(WORKOUT_DAYS[0].id)
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)

  const day = WORKOUT_DAYS.find((d) => d.id === dayId) ?? WORKOUT_DAYS[0]
  const activeExercise =
    day.exercises.find((e) => e.id === activeExerciseId) ?? null

  const recentForDay = [...setLogs]
    .filter((s) => s.dayId === day.id)
    .reverse()
    .slice(0, 8)

  return (
    <>
      <PageHeader
        title="אימונים"
        subtitle="שגרת 5 ימים · משקולות + קליסתניקס"
      />
      <div className="space-y-4 px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {WORKOUT_DAYS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setDayId(d.id)
                setActiveExerciseId(null)
              }}
              className={[
                'shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition',
                d.id === day.id
                  ? 'bg-primary text-white'
                  : 'bg-card text-muted border border-line',
              ].join(' ')}
            >
              יום {d.dayNumber}
            </button>
          ))}
        </div>

        <Card title={day.title}>
          <p className="mb-3 text-sm text-muted">{day.focus}</p>
          <ul className="space-y-2">
            {day.exercises.map((ex) => (
              <li key={`${day.id}-${ex.id}`}>
                <button
                  type="button"
                  onClick={() =>
                    setActiveExerciseId(
                      activeExerciseId === ex.id ? null : ex.id,
                    )
                  }
                  className={[
                    'w-full rounded-xl border px-3 py-3 text-right transition',
                    activeExerciseId === ex.id
                      ? 'border-primary bg-primary/10'
                      : 'border-line bg-surface',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-text">
                        {ex.name}
                        {ex.isKeyLift ? (
                          <span className="ms-2 text-[10px] font-bold text-accent">
                            KEY
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {ex.sets} סטים · {ex.reps}
                        {ex.notes ? ` · ${ex.notes}` : ''}
                      </p>
                    </div>
                    <span className="text-xs text-primary">רישום</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {activeExercise ? (
          <SetLogger
            exercise={activeExercise}
            dayId={day.id}
            onLog={addSetLog}
          />
        ) : null}

        <RestTimer />

        <KeyLiftsProgress logs={setLogs} />

        <Card title="סטים אחרונים ביום זה">
          {recentForDay.length === 0 ? (
            <p className="text-sm text-muted">עדיין אין רישומים ליום זה.</p>
          ) : (
            <ul className="space-y-2">
              {recentForDay.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm"
                >
                  <span className="text-muted">{s.exerciseName}</span>
                  <span className="font-semibold text-text">
                    {s.weightKg} ק״ג × {s.reps} · RPE {s.rpe}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
