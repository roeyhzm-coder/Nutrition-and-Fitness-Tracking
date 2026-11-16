import { useEffect, useState } from 'react'
import { RotateCcw, Trash2 } from 'lucide-react'
import {
  MORNING_ILLUSTRATIONS,
  type MorningExercise,
  type MorningIllustrationKind,
  type MorningRoutineDef,
} from '../../lib/morningRoutine'
import { Button } from '../ui/button'
import { Modal } from '../ui/Modal'
import { MorningIllustration } from './MorningIllustration'

type ExerciseDraft = Omit<MorningExercise, 'id'>

function TextField({
  label,
  value,
  onChange,
  maxLength,
  dir,
  placeholder,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  maxLength: number
  dir?: 'ltr' | 'rtl' | 'auto'
  placeholder?: string
}) {
  return (
    <label className="block text-xs text-muted">
      {label}
      <input
        type="text"
        dir={dir}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="field mt-1"
      />
    </label>
  )
}

function TextArea({
  label,
  value,
  onChange,
  maxLength,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  maxLength: number
}) {
  return (
    <label className="block text-xs text-muted">
      {label}
      <textarea
        rows={2}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="field mt-1 resize-none leading-relaxed"
      />
    </label>
  )
}

/** Edit (or add) one exercise of a routine. `exercise: null` = closed. */
export function MorningExerciseModal({
  exercise,
  isNew,
  canDelete,
  onClose,
  onSave,
  onDelete,
}: {
  exercise: MorningExercise | null
  isNew: boolean
  canDelete: boolean
  onClose: () => void
  onSave: (draft: ExerciseDraft) => void
  onDelete: () => void
}) {
  const [draft, setDraft] = useState<ExerciseDraft | null>(null)

  useEffect(() => {
    if (!exercise) {
      setDraft(null)
      return
    }
    const { id: _id, ...rest } = exercise
    void _id
    setDraft(rest)
  }, [exercise])

  if (!exercise || !draft) return null
  const set = <K extends keyof ExerciseDraft>(key: K, value: ExerciseDraft[K]) =>
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))
  const valid = draft.nameHe.trim().length > 0

  return (
    <Modal open title={isNew ? 'תרגיל חדש' : `עריכת ${exercise.nameHe}`} onClose={onClose}>
      <form
        className="space-y-3"
        dir="rtl"
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          onSave({
            ...draft,
            nameHe: draft.nameHe.trim(),
            nameEn: draft.nameEn.trim(),
            badge: draft.badge.trim(),
            target: draft.target.trim(),
            description: draft.description.trim(),
            tip: draft.tip.trim(),
          })
        }}
      >
        <TextField label="שם התרגיל" value={draft.nameHe} onChange={(v) => set('nameHe', v)} maxLength={80} />
        <TextField label="שם באנגלית" value={draft.nameEn} onChange={(v) => set('nameEn', v)} maxLength={80} dir="ltr" />
        <div className="grid grid-cols-2 gap-2">
          <TextField label="יעד / משך" value={draft.target} onChange={(v) => set('target', v)} maxLength={30} dir="auto" placeholder="1:30" />
          <TextField label="תגית (אופציונלי)" value={draft.badge} onChange={(v) => set('badge', v)} maxLength={30} placeholder="כל בוקר" />
        </div>
        <TextArea label="תיאור" value={draft.description} onChange={(v) => set('description', v)} maxLength={300} />
        <TextArea label="דגש / טיפ (אופציונלי)" value={draft.tip} onChange={(v) => set('tip', v)} maxLength={300} />
        <fieldset>
          <legend className="mb-1.5 text-xs text-muted">איור</legend>
          <div className="grid grid-cols-4 gap-1.5">
            {MORNING_ILLUSTRATIONS.map((option) => {
              const active = draft.illustration === option.kind
              return (
                <button
                  key={option.kind}
                  type="button"
                  aria-label={option.label}
                  aria-pressed={active}
                  onClick={() => set('illustration', option.kind as MorningIllustrationKind)}
                  className={[
                    'flex aspect-square items-center justify-center rounded-xl bg-stone-100 transition',
                    active ? 'ring-2 ring-blue-500' : 'hover:bg-stone-200',
                  ].join(' ')}
                >
                  <MorningIllustration kind={option.kind} className="size-11" />
                </button>
              )
            })}
          </div>
        </fieldset>
        <Button type="submit" className="w-full" variant="accent" disabled={!valid}>
          שמור תרגיל
        </Button>
        {canDelete ? (
          <Button type="button" className="w-full gap-2 text-rose-600" variant="ghost" onClick={onDelete}>
            <Trash2 className="size-4" strokeWidth={2} />
            מחק תרגיל
          </Button>
        ) : null}
      </form>
    </Modal>
  )
}

/** Edit routine-level text, or restore the built-in definition. */
export function MorningRoutineMetaModal({
  routine,
  open,
  onClose,
  onSave,
  onReset,
}: {
  routine: MorningRoutineDef
  open: boolean
  onClose: () => void
  onSave: (patch: Pick<MorningRoutineDef, 'title' | 'meta' | 'footerNote'>) => void
  onReset: () => void
}) {
  const [title, setTitle] = useState(routine.title)
  const [meta, setMeta] = useState(routine.meta)
  const [footerNote, setFooterNote] = useState(routine.footerNote)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(routine.title)
    setMeta(routine.meta)
    setFooterNote(routine.footerNote)
    setConfirmReset(false)
  }, [open, routine])

  return (
    <Modal open={open} title={`עריכת שגרה ${routine.id}`} onClose={onClose}>
      <form
        className="space-y-3"
        dir="rtl"
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          onSave({ title: title.trim(), meta: meta.trim(), footerNote: footerNote.trim() })
        }}
      >
        <TextField label="כותרת" value={title} onChange={setTitle} maxLength={80} />
        <TextField label="שורת מידע" value={meta} onChange={setMeta} maxLength={80} placeholder="5 תרגילים · כ-6 דקות" />
        <TextArea label="הערת סיום (אופציונלי)" value={footerNote} onChange={setFooterNote} maxLength={300} />
        <Button type="submit" className="w-full" variant="accent" disabled={!title.trim()}>
          שמור
        </Button>
        <Button
          type="button"
          className="w-full gap-2"
          variant="ghost"
          onClick={() => {
            if (!confirmReset) {
              setConfirmReset(true)
              return
            }
            onReset()
          }}
        >
          <RotateCcw className="size-4" strokeWidth={2} />
          {confirmReset ? 'לחץ שוב לאישור — שחזור כל התרגילים' : 'שחזר שגרה מקורית'}
        </Button>
      </form>
    </Modal>
  )
}
