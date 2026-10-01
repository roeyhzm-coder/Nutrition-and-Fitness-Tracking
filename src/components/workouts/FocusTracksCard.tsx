import { useEffect, useMemo, useState } from 'react'
import { Archive, Check, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import {
  FOCUS_DURATION_MONTH_PRESETS,
  addCalendarMonths,
  focusTrackPeriodStatus,
  resolveFocusTimeframe,
} from '../../lib/focusTracks'
import { currentWeekDates, weekDayCells } from '../../lib/routines'
import type { FocusTrack, FocusTrackTimeframe } from '../../lib/types'
import { localDateKey } from '../../lib/types'
import { Button } from '../ui/button'
import { Card } from '../ui/Card'
import { IconButton } from '../ui/IconButton'
import { Modal } from '../ui/Modal'
import { NumericInput } from '../ui/NumericInput'
import { ProgressBar } from '../ui/ProgressBar'

type TrackDraft = {
  name: string
  weeklyTargetDays: number
  estimatedCalories: number
  timeframe: FocusTrackTimeframe
  durationMonths: number
  startsOn: string
}

function emptyDraft(): TrackDraft {
  const today = localDateKey()
  return {
    name: '',
    weeklyTargetDays: 5,
    estimatedCalories: 150,
    timeframe: 'forever',
    durationMonths: 6,
    startsOn: today,
  }
}

function draftFromTrack(track: FocusTrack | null): TrackDraft {
  const base = emptyDraft()
  if (!track) return base
  return {
    name: track.name,
    weeklyTargetDays: track.weeklyTargetDays,
    estimatedCalories: track.estimatedCalories,
    timeframe: track.timeframe,
    durationMonths: track.durationMonths ?? 6,
    startsOn: track.startsOn,
  }
}

function CompactTrackCard({
  track,
  weekDates,
  onToggle,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: {
  track: FocusTrack
  weekDates: string[]
  onToggle: (date: string) => void
  onEdit: () => void
  onArchive: () => void
  onRestore?: () => void
  onDelete: () => void
}) {
  const today = localDateKey()
  const days = weekDayCells()
  const done = weekDates.filter((day) => track.completedDates.includes(day)).length
  const todayDone = track.completedDates.includes(today)
  const period = focusTrackPeriodStatus(track)
  const pct =
    track.weeklyTargetDays <= 0
      ? 0
      : Math.min(100, Math.round((done / track.weeklyTargetDays) * 100))

  if (track.archivedAt) {
    return (
      <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-muted">{track.name}</p>
            <p className="text-[11px] text-muted">בארכיון</p>
          </div>
          {onRestore ? (
            <IconButton label="שחזר" tone="accent" onClick={onRestore}>
              <RotateCcw className="size-3.5" strokeWidth={1.75} />
            </IconButton>
          ) : null}
          <IconButton label="מחק" tone="danger" onClick={onDelete}>
            <Trash2 className="size-3.5" strokeWidth={1.75} />
          </IconButton>
        </div>
      </article>
    )
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text">{track.name}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-lg bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700">
              {track.estimatedCalories} קק״ל
            </span>
            <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
              {track.weeklyTargetDays} ימים בשבוע
            </span>
            {period.kind === 'forever' ? (
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-text">
                לתמיד
              </span>
            ) : period.kind === 'completed' ? (
              <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                היעד הושלם
              </span>
            ) : (
              <span className="rounded-lg bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                {period.months} חודשים · נותרו {period.remainingDays} ימים
              </span>
            )}
          </div>
        </div>
        <IconButton label="ערוך" tone="accent" onClick={onEdit}>
          <Pencil className="size-3.5" strokeWidth={1.75} />
        </IconButton>
        <IconButton label="ארכיון" onClick={onArchive}>
          <Archive className="size-3.5" strokeWidth={1.75} />
        </IconButton>
        <IconButton label="מחק" tone="danger" onClick={onDelete}>
          <Trash2 className="size-3.5" strokeWidth={1.75} />
        </IconButton>
      </div>

      <button
        type="button"
        onClick={() => onToggle(today)}
        className={[
          'mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold transition',
          todayDone
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
            : 'border border-slate-200 bg-slate-50 text-text hover:border-emerald-400 hover:bg-emerald-50',
        ].join(' ')}
      >
        {todayDone ? (
          <>
            <Check className="size-4" strokeWidth={2.5} />
            בוצע היום · +{track.estimatedCalories} קק״ל
          </>
        ) : (
          `סמן ביצוע להיום · +${track.estimatedCalories} קק״ל`
        )}
      </button>

      <ul className="mt-3 grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const marked = track.completedDates.includes(day.date)
          const isFuture = day.date > today
          return (
            <li key={day.date}>
              <button
                type="button"
                disabled={isFuture}
                onClick={() => onToggle(day.date)}
                className={[
                  'flex w-full flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-semibold transition',
                  isFuture
                    ? 'cursor-not-allowed text-muted/50'
                    : marked
                      ? 'bg-emerald-600 text-white'
                      : day.date === today
                        ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                        : 'bg-slate-50 text-muted hover:bg-slate-100',
                ].join(' ')}
              >
                <span>{day.label}</span>
                <span>{marked ? '✓' : ''}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[11px]">
          <span>
            {done}/{track.weeklyTargetDays} השבוע
          </span>
          <span className={pct >= 100 ? 'font-semibold text-emerald-600' : 'text-muted'}>
            {pct}%
          </span>
        </div>
        <ProgressBar
          value={done}
          max={track.weeklyTargetDays}
          color={pct >= 100 ? 'green' : 'accent'}
        />
      </div>
    </article>
  )
}

export function FocusTracksCard() {
  const {
    focusTracks,
    addFocusTrack,
    updateFocusTrack,
    deleteFocusTrack,
    toggleFocusTrackDate,
  } = useAppData()
  const weekDates = useMemo(() => currentWeekDates(), [])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FocusTrack | null>(null)
  const [draft, setDraft] = useState<TrackDraft>(emptyDraft)

  useEffect(() => {
    if (open) setDraft(draftFromTrack(editing))
  }, [open, editing])

  const active = focusTracks.filter((t) => !t.archivedAt)
  const archived = focusTracks.filter((t) => t.archivedAt)

  function save() {
    const name = draft.name.trim()
    if (!name) return
    const timeframe = resolveFocusTimeframe({
      timeframe: draft.timeframe,
      startsOn: draft.startsOn,
      durationMonths: draft.durationMonths,
    })
    const payload = {
      name,
      weeklyTargetDays: draft.weeklyTargetDays,
      estimatedCalories: draft.estimatedCalories,
      ...timeframe,
    }
    if (editing) updateFocusTrack(editing.id, payload)
    else addFocusTrack(payload)
    setOpen(false)
    setEditing(null)
  }

  return (
    <Card
      title="מסלולי מיקוד"
      action={
        <Button
          variant="accent"
          className="px-3 text-xs"
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
        >
          <Plus className="size-3.5" strokeWidth={2} />
          מסלול אימון חדש
        </Button>
      }
    >
      {active.length === 0 ? (
        <p className="text-sm text-muted">
          אין מסלולים פעילים. הוסף שפגאט, שחייה, מתח או כל מסלול אחר.
        </p>
      ) : (
        <ul className="space-y-3">
          {active.map((track) => (
            <li key={track.id}>
              <CompactTrackCard
                track={track}
                weekDates={weekDates}
                onToggle={(date) => toggleFocusTrackDate(track.id, date)}
                onEdit={() => {
                  setEditing(track)
                  setOpen(true)
                }}
                onArchive={() =>
                  updateFocusTrack(track.id, { archivedAt: new Date().toISOString() })
                }
                onDelete={() => {
                  if (window.confirm(`למחוק את המסלול "${track.name}"?`)) {
                    deleteFocusTrack(track.id)
                  }
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 ? (
        <div className="mt-4 space-y-2 border-t border-slate-200 pt-3">
          <p className="text-xs font-semibold text-muted">ארכיון מסלולים</p>
          {archived.map((track) => (
            <CompactTrackCard
              key={track.id}
              track={track}
              weekDates={weekDates}
              onToggle={(date) => toggleFocusTrackDate(track.id, date)}
              onEdit={() => {
                setEditing(track)
                setOpen(true)
              }}
              onArchive={() =>
                updateFocusTrack(track.id, { archivedAt: new Date().toISOString() })
              }
              onRestore={() => updateFocusTrack(track.id, { archivedAt: null })}
              onDelete={() => {
                if (window.confirm(`למחוק את המסלול "${track.name}"?`)) {
                  deleteFocusTrack(track.id)
                }
              }}
            />
          ))}
        </div>
      ) : null}

      <Modal
        open={open}
        title={editing ? 'עריכת מסלול' : 'מסלול אימון חדש'}
        onClose={() => {
          setOpen(false)
          setEditing(null)
        }}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <label className="block text-xs text-muted">
            שם המסלול
            <input
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              placeholder="למשל: שחייה / מתח / שפגאט"
              className="field mt-1"
              required
            />
          </label>
          <div>
            <p className="text-xs text-muted">
              יעד שבועי · {draft.weeklyTargetDays} ימים
            </p>
            <div className="mt-2 grid grid-cols-7 gap-1.5">
              {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDraft((p) => ({ ...p, weeklyTargetDays: n }))}
                  className={[
                    'min-h-11 rounded-2xl text-sm font-bold',
                    draft.weeklyTargetDays === n
                      ? 'bg-cyan-600 text-white'
                      : 'border border-slate-200 bg-slate-50',
                  ].join(' ')}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-xs text-muted">
            קלוריות מוערכות לביצוע
            <NumericInput
              decimals={0}
              min={0}
              value={String(draft.estimatedCalories)}
              onChange={(raw) => {
                const n = Number(raw)
                if (!raw || !Number.isFinite(n)) return
                setDraft((p) => ({
                  ...p,
                  estimatedCalories: Math.max(0, Math.round(n)),
                }))
              }}
              className="field mt-1"
            />
          </label>
          <div>
            <p className="text-xs text-muted">תקופת יעד</p>
            <div className="mt-2 grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setDraft((p) => ({ ...p, timeframe: 'forever' }))}
                className={[
                  'min-h-11 rounded-2xl text-sm font-semibold',
                  draft.timeframe === 'forever'
                    ? 'bg-violet-600 text-white'
                    : 'border border-slate-200 bg-slate-50',
                ].join(' ')}
              >
                לתמיד
              </button>
              <button
                type="button"
                onClick={() => setDraft((p) => ({ ...p, timeframe: 'period' }))}
                className={[
                  'min-h-11 rounded-2xl text-sm font-semibold',
                  draft.timeframe === 'period'
                    ? 'bg-violet-600 text-white'
                    : 'border border-slate-200 bg-slate-50',
                ].join(' ')}
              >
                לתקופה מוגדרת (בחודשים)
              </button>
            </div>
          </div>
          {draft.timeframe === 'period' ? (
            <div className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-3">
              <label className="block text-xs text-muted">
                תאריך התחלה
                <input
                  type="date"
                  value={draft.startsOn}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, startsOn: e.target.value }))
                  }
                  className="field mt-1"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {FOCUS_DURATION_MONTH_PRESETS.map((months) => (
                  <button
                    key={months}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, durationMonths: months }))}
                    className={[
                      'min-h-11 rounded-2xl px-3 text-sm font-semibold',
                      draft.durationMonths === months
                        ? 'bg-violet-600 text-white'
                        : 'border border-violet-200 bg-white',
                    ].join(' ')}
                  >
                    {months} חודשים
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted">
                סיום משוער:{' '}
                {addCalendarMonths(draft.startsOn, draft.durationMonths)}
              </p>
            </div>
          ) : null}
          <Button type="submit" variant="accent" className="w-full">
            {editing ? 'שמור שינויים' : 'הוסף מסלול'}
          </Button>
        </form>
      </Modal>
    </Card>
  )
}
