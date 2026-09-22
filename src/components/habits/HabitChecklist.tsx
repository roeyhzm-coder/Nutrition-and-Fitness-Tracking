import { HABIT_GROUPS } from '../../data/habits'
import { todayKey } from '../../lib/types'
import { Card } from '../ui/Card'

type HabitChecklistProps = {
  checks: Record<string, string[]>
  onToggle: (itemId: string) => void
}

export function HabitChecklist({ checks, onToggle }: HabitChecklistProps) {
  const today = todayKey()
  const done = new Set(checks[today] ?? [])

  return (
    <div className="space-y-4">
      {HABIT_GROUPS.map((group) => {
        const completed = group.items.filter((i) => done.has(i.id)).length
        return (
          <Card
            key={group.id}
            title={group.title}
            action={
              <span className="text-xs text-muted">
                {completed}/{group.items.length}
              </span>
            }
          >
            <p className="mb-3 text-sm text-muted">{group.description}</p>
            <ul className="space-y-2">
              {group.items.map((item) => {
                const checked = done.has(item.id)
                return (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface px-3 py-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(item.id)}
                        className="mt-0.5 size-4 accent-accent"
                      />
                      <span
                        className={[
                          'text-sm',
                          checked ? 'text-muted line-through' : 'text-text',
                        ].join(' ')}
                      >
                        {item.label}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </Card>
        )
      })}
    </div>
  )
}
