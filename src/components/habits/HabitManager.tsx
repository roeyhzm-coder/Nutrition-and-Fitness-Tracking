import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { todayKey } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { IconButton } from '../ui/IconButton'
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
            className="field min-w-0 flex-1"
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
                  <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleHabit(habit.id)}
                      className="mt-1 size-5 accent-blue-600"
                    />
                    <button
                      type="button"
                      className={[
                        'min-h-11 min-w-0 flex-1 text-right text-sm',
                        checked ? 'text-muted line-through' : 'text-text',
                      ].join(' ')}
                      onClick={() => {
                        setEditingId(habit.id)
                        setEditLabel(habit.label)
                      }}
                    >
                      {habit.label}
                    </button>
                    <IconButton
                      label="ערוך הרגל"
                      tone="accent"
                      onClick={() => {
                        setEditingId(habit.id)
                        setEditLabel(habit.label)
                      }}
                    >
                      <Pencil className="size-3.5" strokeWidth={1.75} />
                    </IconButton>
                    <IconButton
                      label="מחק הרגל"
                      tone="danger"
                      onClick={() => deleteHabit(habit.id)}
                    >
                      <Trash2 className="size-3.5" strokeWidth={1.75} />
                    </IconButton>
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
            className="field"
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
