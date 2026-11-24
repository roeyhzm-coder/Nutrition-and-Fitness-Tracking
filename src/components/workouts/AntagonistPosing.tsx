import { useEffect, useId, useState } from 'react'
import { RotateCcw, Zap } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import {
  ANTAGONIST_CUE_MAX_LENGTH,
  ANTAGONIST_LABEL,
  resolveAntagonist,
  type ResolvedAntagonist,
} from '../../lib/antagonistPosing'

/** Effective antagonist setting for an exercise name + its persisted setters. */
export function useAntagonist(name: string): ResolvedAntagonist & {
  setShow: (show: boolean) => void
  setCue: (cue: string) => void
} {
  const { antagonistPosing, setAntagonistPref } = useAppData()
  const resolved = resolveAntagonist(antagonistPosing, name)
  return {
    ...resolved,
    setShow: (show) => setAntagonistPref(name, { show_antagonist_posing: show }),
    setCue: (cue) => setAntagonistPref(name, { antagonist_cue: cue }),
  }
}

type ToggleProps = { name: string; className?: string }

/**
 * Mini pill switch for an exercise card header. OFF it is a muted ⚡ + tiny
 * track; ON it is amber. 32px tall hit area, zero layout shift between states.
 */
export function AntagonistToggle({ name, className = '' }: ToggleProps) {
  const { show, setShow } = useAntagonist(name)
  if (!name.trim()) return null
  const label = show ? `הסתר ${ANTAGONIST_LABEL}` : `הצג ${ANTAGONIST_LABEL}`
  return (
    <button
      type="button"
      role="switch"
      aria-checked={show}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation()
        setShow(!show)
      }}
      className={[
        'inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-1.5 transition active:scale-[0.96]',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500',
        show ? 'text-amber-600' : 'text-slate-400 hover:text-slate-500',
        className,
      ].join(' ')}
    >
      <Zap
        className="size-3.5"
        strokeWidth={2}
        fill={show ? 'currentColor' : 'none'}
        aria-hidden
      />
      <span
        aria-hidden
        className={[
          'relative h-3.5 w-6 rounded-full transition-colors',
          show ? 'bg-amber-500' : 'bg-slate-200',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 size-2.5 rounded-full bg-white shadow-sm transition-[inset-inline-start]',
            show ? 'start-3' : 'start-0.5',
          ].join(' ')}
        />
      </span>
    </button>
  )
}

/** Accent strip under the title / sets metadata; renders nothing when OFF. */
export function AntagonistStrip({ name, className = '' }: ToggleProps) {
  const { show, cue } = useAntagonist(name)
  if (!show || !name.trim()) return null
  return (
    <p
      dir="rtl"
      className={[
        'flex items-start gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] leading-snug text-amber-900 ring-1 ring-amber-200/80',
        className,
      ].join(' ')}
    >
      <Zap
        className="mt-px size-3 shrink-0 text-amber-600"
        strokeWidth={2}
        fill="currentColor"
        aria-hidden
      />
      <span className="min-w-0 break-words">
        <span className="font-bold">{ANTAGONIST_LABEL}:</span> {cue}
      </span>
    </p>
  )
}

/**
 * Edit-exercise modal block: switch + custom cue (pre-filled with the current
 * cue). Saves instantly by exercise name — no dependency on the form submit.
 */
export function AntagonistEditorFields({ name }: { name: string }) {
  const trimmed = name.trim()
  const { cue, recommendedCue, isCustom, setCue } = useAntagonist(trimmed)
  const [draft, setDraft] = useState(cue)
  const inputId = useId()

  // Re-sync when the exercise name (→ recommendation) or a remote edit changes the cue.
  useEffect(() => {
    setDraft(cue)
  }, [cue])

  if (!trimmed) return null

  function commit() {
    const next = draft.replace(/\s+/g, ' ').trim()
    if (next === cue) return
    setCue(next || recommendedCue)
    if (!next) setDraft(recommendedCue)
  }

  return (
    <div dir="rtl" className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900">
          <Zap className="size-3.5 text-amber-600" strokeWidth={2} fill="currentColor" aria-hidden />
          הצג פוזינג נגדי בתרגיל זה
        </span>
        <AntagonistToggle name={trimmed} />
      </div>
      <label htmlFor={inputId} className="sr-only">
        טקסט הפוזינג הנגדי
      </label>
      <div className="mt-1.5 flex items-center gap-1.5">
        <input
          id={inputId}
          value={draft}
          maxLength={ANTAGONIST_CUE_MAX_LENGTH}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
          }}
          dir="rtl"
          placeholder={recommendedCue}
          className="field min-w-0 flex-1 text-xs"
        />
        {isCustom ? (
          <button
            type="button"
            onClick={() => {
              setCue('')
              setDraft(recommendedCue)
            }}
            aria-label="חזרה להמלצה האוטומטית"
            title="חזרה להמלצה האוטומטית"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-amber-700 transition hover:bg-amber-100"
          >
            <RotateCcw className="size-3.5" strokeWidth={2} />
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-[10px] text-amber-800/80">
        {isCustom ? 'טקסט מותאם אישית' : 'המלצה אוטומטית לפי התרגיל'} · נשמר מיד לכל האימונים
      </p>
    </div>
  )
}
