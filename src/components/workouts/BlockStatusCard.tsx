import { useEffect, useRef, useState } from 'react'
import { CalendarClock, Pencil } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { useTodayKey } from '../../hooks/useTodayKey'
import { blockTimeline, countdownLabel, formatDateHe } from '../../lib/blockCycle'
import { liveBlockReports } from '../../lib/blockReport'
import { setBlockSettings } from '../../lib/skillTree'
import { SkillBlockSettingsModal } from '../skills/SkillEditModals'
import { Button } from '../ui/button'
import { IconButton } from '../ui/IconButton'
import { ProgressBar } from '../ui/ProgressBar'
import { BlockAssessmentModal } from './BlockAssessmentModal'

/** "ניהול בלוק ותאריכי יעד": block name, dates, week, countdown, edit + end-of-block flow. */
export function BlockStatusCard() {
  const { skillTree, updateSkillTree } = useAppData()
  const today = useTodayKey()
  const t = blockTimeline(skillTree, today)
  const lastReport = liveBlockReports(skillTree.blockReports)[0] ?? null
  const [editOpen, setEditOpen] = useState(false)
  const [assessOpen, setAssessOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<number | null>(null)
  useEffect(() => () => {
    if (timer.current != null) window.clearTimeout(timer.current)
  }, [])

  function showToast(message: string) {
    setToast(message)
    if (timer.current != null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 6000)
  }

  const weekTag = t.isDeload ? 'שבוע דילואד' : t.isBenchmark ? 'שבוע מבחנים' : ''

  return (
    <section
      aria-label="ניהול בלוק ותאריכי יעד"
      className="space-y-3 rounded-3xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700">
            <CalendarClock className="size-3.5" strokeWidth={2.25} />
            ניהול בלוק ותאריכי יעד
          </p>
          <h2 className="mt-0.5 font-display text-base font-extrabold leading-snug text-slate-900">{t.name}</h2>
        </div>
        <IconButton label="עריכת בלוק" tone="accent" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" strokeWidth={1.75} />
        </IconButton>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-white px-2 py-2 shadow-sm shadow-slate-200/60">
          <p className="text-[10px] text-muted">התחלה</p>
          <p className="font-display text-sm font-bold tabular-nums text-slate-900">{formatDateHe(t.startDate)}</p>
        </div>
        <div className="rounded-2xl bg-white px-2 py-2 shadow-sm shadow-slate-200/60">
          <p className="text-[10px] text-muted">שבוע</p>
          <p className="font-display text-sm font-bold tabular-nums text-slate-900">
            {t.started ? `${t.week} מתוך ${t.weeks}` : `טרם התחיל`}
          </p>
        </div>
        <div className="rounded-2xl bg-white px-2 py-2 shadow-sm shadow-slate-200/60">
          <p className="text-[10px] text-muted">סיום</p>
          <p className="font-display text-sm font-bold tabular-nums text-slate-900">{formatDateHe(t.endDate)}</p>
        </div>
      </div>

      <ProgressBar value={Math.round(t.progress * 100)} max={100} color={t.due ? 'warn' : 'primary'} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={[
            'inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold',
            t.due ? 'bg-amber-100 text-amber-900' : 'bg-blue-600 text-white',
          ].join(' ')}
        >
          {t.due ? '🏁 ' : '⏳ '}
          {countdownLabel(t)}
        </span>
        {weekTag ? <span className="text-[11px] font-semibold text-slate-500">{weekTag}</span> : null}
      </div>

      <Button
        type="button"
        variant={t.due ? 'accent' : 'surface'}
        className="w-full"
        onClick={() => setAssessOpen(true)}
      >
        🏁 סיום בלוק ומבדקי חוזק
      </Button>

      {lastReport ? (
        <p className="text-[11px] text-muted">
          דו"ח אחרון: {lastReport.blockLabel} נסגר ב-{formatDateHe(lastReport.closedAt.slice(0, 10))} ·{' '}
          {lastReport.rows.length} תרגילים נמדדו
        </p>
      ) : null}

      <SkillBlockSettingsModal
        open={editOpen}
        state={skillTree}
        onClose={() => setEditOpen(false)}
        onSave={(patch) => {
          updateSkillTree((prev) => setBlockSettings(prev, patch))
          setEditOpen(false)
        }}
      />
      <BlockAssessmentModal
        open={assessOpen}
        onClose={() => setAssessOpen(false)}
        onDone={(message) => {
          setAssessOpen(false)
          showToast(message)
        }}
      />
      {toast ? (
        <p
          role="status"
          className="fixed inset-x-3 bottom-28 z-[60] mx-auto max-w-md rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold leading-snug text-white shadow-lg shadow-emerald-700/30"
        >
          {toast}
        </p>
      ) : null}
    </section>
  )
}
