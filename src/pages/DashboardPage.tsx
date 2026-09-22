import {
  Activity,
  Flame,
  Target,
  UtensilsCrossed,
} from 'lucide-react'
import { Header } from '../components/layout/Header'
import { StatCard } from '../components/dashboard/StatCard'
import { Panel } from '../components/dashboard/Panel'

const todayTraining = [
  { name: 'Back Squat', detail: '4 × 6 @ 100kg', done: true },
  { name: 'Romanian Deadlift', detail: '3 × 8 @ 80kg', done: true },
  { name: 'Pull-ups', detail: '3 × 8 bodyweight', done: false },
  { name: 'Plank', detail: '3 × 45s', done: false },
]

const todayMeals = [
  { name: 'Breakfast', macros: '42P · 55C · 18F', kcal: 540 },
  { name: 'Lunch', macros: '48P · 60C · 22F', kcal: 620 },
  { name: 'Snack', macros: '20P · 25C · 8F', kcal: 250 },
  { name: 'Dinner', macros: '—', kcal: null },
]

export function DashboardPage() {
  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Overview of today’s training and nutrition targets"
      />

      <div className="flex flex-1 flex-col gap-6 px-8 py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Calories"
            value="1,410"
            hint="of 2,400 kcal target"
            icon={Flame}
          />
          <StatCard
            label="Protein"
            value="110g"
            hint="of 160g daily goal"
            icon={UtensilsCrossed}
          />
          <StatCard
            label="Workouts"
            value="3 / 5"
            hint="sessions this week"
            icon={Activity}
          />
          <StatCard
            label="Adherence"
            value="86%"
            hint="rolling 7-day average"
            icon={Target}
          />
        </div>

        <div className="grid flex-1 gap-6 lg:grid-cols-2">
          <Panel title="Today’s training" action="Open workout">
            <ul className="space-y-3">
              {todayTraining.map((item) => (
                <li
                  key={item.name}
                  className="flex items-center justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{item.name}</p>
                    <p className="text-xs text-ink-muted">{item.detail}</p>
                  </div>
                  <span
                    className={[
                      'text-xs font-medium',
                      item.done ? 'text-accent-deep' : 'text-ink-muted',
                    ].join(' ')}
                  >
                    {item.done ? 'Done' : 'Pending'}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Today’s nutrition" action="Log meal">
            <ul className="space-y-3">
              {todayMeals.map((meal) => (
                <li
                  key={meal.name}
                  className="flex items-center justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{meal.name}</p>
                    <p className="text-xs text-ink-muted">{meal.macros}</p>
                  </div>
                  <span className="text-sm font-medium text-ink">
                    {meal.kcal != null ? `${meal.kcal} kcal` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel title="Weekly snapshot" action="View progress">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Training volume', value: '12,400 kg', note: '+8% vs last week' },
              { label: 'Avg. daily protein', value: '148 g', note: 'On track' },
              { label: 'Rest days used', value: '1 / 2', note: '1 remaining' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg bg-surface px-4 py-4"
              >
                <p className="text-xs text-ink-muted">{item.label}</p>
                <p className="mt-2 font-display text-xl font-bold text-ink">
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-ink-muted">{item.note}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  )
}
