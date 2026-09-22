import { useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { todayKey } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'

export function HabitManager() {
  const { habits, habitChecks, addHabit, updateHabit, deleteHabit, toggleHabit } =
    useAppData()
  const [newLabel, setNewLabel] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')

  const today = todayKey()
  const done = new Set(habitChecks[today] ?? [])
  const completed = habits.filter((h) => done.has(h.id)).length

  return (
    <>
      <Card
        title="הרגלים יומיים"
        action={
          <span className="text-xs text-muted">
            {habits.length === 0 ? 'אין הרגלים' : `${completed}/${habits.length}`}
          </span>
        }
      >
        <form
          className="mb-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            addHabit(newLabel)
            setNewLabel('')
          }}
        >
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="הוסף הרגל חדש…"
            className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
          />
          <Button type="submit" variant="accent">
            הוסף
          </Button>
        </form>

        {habits.length === 0 ? (
          <p className="text-sm text-muted">
            עדיין אין הרגלים. הוסף הרגלים מותאמים אישית ובדוק אותם מדי יום.
          </p>
        ) : (
          <ul className="space-y-2">
            {habits.map((habit) => {
              const checked = done.has(habit.id)
              return (
                <li key={habit.id}>
                  <div className="flex items-start gap-3 rounded-xl border border-line bg-surface px-3 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleHabit(habit.id)}
                      className="mt-0.5 size-4 accent-accent"
                    />
                    <span
                      className={[
                        'min-w-0 flex-1 text-sm',
                        checked ? 'text-muted line-through' : 'text-text',
                      ].join(' ')}
                    >
                      {habit.label}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-primary"
                      onClick={() => {
                        setEditingId(habit.id)
                        setEditLabel(habit.label)
                      }}
                    >
                      ערוך
                    </button>
                    <button
                      type="button"
                      className="text-xs text-danger"
                      onClick={() => deleteHabit(habit.id)}
                    >
                      מחק
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Modal
        open={!!editingId}
        title="עריכת הרגל"
        onClose={() => setEditingId(null)}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (editingId && editLabel.trim()) {
              updateHabit(editingId, editLabel)
              setEditingId(null)
            }
          }}
        >
          <input
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
            required
          />
          <Button type="submit" className="w-full" variant="accent">
            שמור
          </Button>
        </form>
      </Modal>
    </>
  )
}
