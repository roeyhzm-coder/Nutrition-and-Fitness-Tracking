import { useEffect, useState } from 'react'
import type { ProcessSettings } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { ProgressBar } from '../ui/ProgressBar'

type ProcessProgressCardProps = {
  process: ProcessSettings
  onSave: (settings: ProcessSettings) => void
}

function calcDay(startDate: string, totalDays: number) {
  const start = new Date(startDate)
  const today = new Date()
  start.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const raw =
    Math.floor((today.getTime() - start.getTime()) / 86400000) + 1
  return Math.min(Math.max(raw, 1), Math.max(totalDays, 1))
}

export function ProcessProgressCard({
  process,
  onSave,
}: ProcessProgressCardProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(process)
  const day = calcDay(process.startDate, process.totalDays)

  useEffect(() => {
    if (open) setForm(process)
  }, [open, process])

  return (
    <>
      <Card
        title="התקדמות בתהליך"
        action={
          <button
            type="button"
            className="text-sm font-medium text-primary"
            onClick={() => setOpen(true)}
          >
            עריכה
          </button>
        }
      >
        <p className="font-display text-2xl font-bold text-text">
          יום {day} מתוך {process.totalDays} בתהליך
        </p>
        <p className="mt-1 text-xs text-muted">
          התחלה: {new Date(process.startDate).toLocaleDateString('he-IL')}
        </p>
        <div className="mt-3">
          <ProgressBar value={day} max={process.totalDays} color="accent" />
        </div>
      </Card>

      <Modal open={open} title="הגדרות תהליך" onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            onSave({
              startDate: form.startDate,
              totalDays: Math.max(1, Number(form.totalDays) || 1),
            })
            setOpen(false)
          }}
        >
          <label className="block text-xs text-muted">
            תאריך התחלה
            <input
              type="date"
              value={form.startDate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
              required
            />
          </label>
          <label className="block text-xs text-muted">
            סה״כ ימים בתהליך
            <input
              inputMode="numeric"
              value={form.totalDays}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  totalDays: Number(e.target.value) || 0,
                }))
              }
              className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
              required
            />
          </label>
          <Button type="submit" className="w-full" variant="accent">
            שמור
          </Button>
        </form>
      </Modal>
    </>
  )
}
