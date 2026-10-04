import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../../context/AppDataContext'
import {
  aiCheckinLabel,
  daysUntilAiCheckin,
  LAST_AI_EXPORT_KEY,
  latestDateKey,
  writeLastAiExportAt,
} from '../../lib/aiCheckin'
import { parseInteger } from '../../lib/numericInput'
import { localDateKey } from '../../lib/types'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { Button } from '../ui/button'
import { Modal } from '../ui/Modal'
import { NumericInput } from '../ui/NumericInput'

const DAY_PILLS = [7, 14, 21, 28, 56] as const

export function AiCheckinBadge() {
  const { goal, profile, setProfile } = useAppData()
  const [lastAiExportAt, setLastAiExportAt] = useLocalStorage<string | null>(
    LAST_AI_EXPORT_KEY,
    null,
  )
  const [open, setOpen] = useState(false)
  const remaining = daysUntilAiCheckin(
    latestDateKey(lastAiExportAt, profile.lastAiExportAt),
    goal.startDate,
    localDateKey(),
    profile.aiCheckinIntervalDays,
  )
  const [draft, setDraft] = useState(String(Math.max(0, remaining)))
  const due = remaining <= 0

  function openEditor() {
    setDraft(String(Math.max(0, remaining)))
    setOpen(true)
  }

  function save() {
    const days = Math.min(365, Math.max(0, parseInteger(draft) ?? remaining))
    const interval = Math.max(1, days || profile.aiCheckinIntervalDays)
    const today = localDateKey()
    const lastExport = days <= 0 ? shiftDate(today, -interval) : today
    writeLastAiExportAt(lastExport)
    setLastAiExportAt(lastExport)
    setProfile({
      ...profile,
      aiCheckinIntervalDays: interval,
      lastAiExportAt: lastExport,
    })
    setOpen(false)
  }

  return (
    <div className="px-4 pt-2">
      <button
        type="button"
        onClick={openEditor}
        className={[
          'inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none transition',
          due
            ? 'border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100'
            : 'border-slate-200 bg-white text-muted hover:border-slate-300 hover:text-text',
        ].join(' ')}
      >
        <Sparkles className="size-3 shrink-0" />
        <span className="truncate">{aiCheckinLabel(remaining)}</span>
      </button>

      <Modal open={open} title="תזכורת עדכון AI" onClose={() => setOpen(false)}>
        <label className="block text-xs text-muted">
          ימים עד העדכון הבא
          <NumericInput
            decimals={0}
            value={draft}
            onChange={setDraft}
            className="mt-1"
          />
        </label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {DAY_PILLS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setDraft(String(days))}
              className={[
                'min-h-8 rounded-full px-3 text-xs font-semibold tabular-nums transition',
                Number(draft) === days
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-muted hover:bg-slate-200',
              ].join(' ')}
            >
              {days}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted">
          הערך נשמר בפרופיל ובענן, ומוצג מיד בתג בדשבורד.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button className="w-full" variant="accent" onClick={save}>
            שמור
          </Button>
          <Link
            to="/profile#export"
            onClick={() => setOpen(false)}
            className="text-center text-[11px] font-medium text-blue-700"
          >
            מעבר לייצוא הפרומפט
          </Link>
        </div>
      </Modal>
    </div>
  )
}

function shiftDate(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00`)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}
