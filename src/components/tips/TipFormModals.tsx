import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/button'
import { TipBody } from './TipBody'
import {
  CATEGORY_TITLE_MAX,
  TIP_BODY_MAX,
  TIP_TITLE_MAX,
  type TipCategory,
  type TipItem,
} from '../../lib/fitnessTips'

export type TipDraftTarget = {
  categoryId: string
  item: TipItem | null
}

type TipItemModalProps = {
  target: TipDraftTarget | null
  categories: TipCategory[]
  onClose: () => void
  onSave: (categoryId: string, input: { id?: string; title: string; body: string }) => void
}

export function TipItemModal({ target, categories, onClose, onSave }: TipItemModalProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    if (!target) return
    setTitle(target.item?.title ?? '')
    setBody(target.item?.body ?? '')
    setCategoryId(target.categoryId)
    setPreview(false)
  }, [target])

  const canSave = title.trim().length > 0 && categoryId.length > 0

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    onSave(categoryId, { id: target?.item?.id, title: title.trim(), body: body.trimEnd() })
  }

  return (
    <Modal
      open={target != null}
      title={target?.item ? 'עריכת דגש' : 'דגש חדש'}
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted">כותרת</span>
          <input
            className="field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TIP_TITLE_MAX}
            placeholder="למשל: סופרסט חזה–גב"
            autoFocus
            required
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted">קטגוריה</span>
          <select
            className="field"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted">פירוט ודגשים</span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold">
              {(['כתיבה', 'תצוגה'] as const).map((label, i) => {
                const active = preview === (i === 1)
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setPreview(i === 1)}
                    aria-pressed={active}
                    className={[
                      'rounded-md px-2.5 py-1 transition',
                      active ? 'bg-white text-text shadow-sm' : 'text-muted hover:text-text',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
          {preview ? (
            <div className="min-h-32 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              {body.trim() ? (
                <TipBody body={body} />
              ) : (
                <p className="text-xs text-muted">אין עדיין פירוט.</p>
              )}
            </div>
          ) : (
            <textarea
              className="field min-h-32 resize-y leading-relaxed"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={TIP_BODY_MAX}
              rows={6}
              placeholder={'- נקודה ראשונה\n- נקודה שנייה עם **הדגשה**'}
            />
          )}
          <p className="text-[11px] leading-relaxed text-muted">
            שורה שמתחילה ב־<code className="font-mono">-</code> הופכת לנקודה ·{' '}
            <code className="font-mono">**טקסט**</code> מודגש
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="submit" variant="accent" className="flex-1" disabled={!canSave}>
            שמור
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            ביטול
          </Button>
        </div>
      </form>
    </Modal>
  )
}

const CATEGORY_SUGGESTIONS = [
  'פוזינג אקטיבי',
  'דגשים לרגליים',
  'דגשים לכתפיים וידיים',
  'בטן וליבה',
  'קרדיו והתאוששות',
  'מתיחות אחרי אימון',
]

type CategoryModalProps = {
  /** `null` closed, `''` new category, otherwise the category being renamed. */
  category: TipCategory | '' | null
  /** All current categories, for duplicate-name checks and suggestions. */
  categories: TipCategory[]
  onClose: () => void
  onSave: (title: string) => void
}

const normalize = (title: string) => title.trim().toLowerCase()

export function CategoryModal({ category, categories, onClose, onSave }: CategoryModalProps) {
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (category != null) setTitle(category === '' ? '' : category.title)
  }, [category])

  const editingId = category ? category.id : null
  const taken = new Set(
    categories.filter((c) => c.id !== editingId).map((c) => normalize(c.title)),
  )
  const trimmed = title.trim()
  const duplicate = trimmed.length > 0 && taken.has(normalize(trimmed))
  const unchanged = category ? trimmed === category.title : false
  const suggestions = category
    ? []
    : CATEGORY_SUGGESTIONS.filter((s) => !taken.has(normalize(s)))

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!trimmed || duplicate) return
    if (unchanged) onClose()
    else onSave(trimmed)
  }

  return (
    <Modal
      open={category != null}
      title={category ? 'שינוי שם קטגוריה' : 'קטגוריה חדשה'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
        <div className="space-y-1.5">
          <input
            className="field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={CATEGORY_TITLE_MAX}
            placeholder="למשל: פוזינג אקטיבי"
            aria-label="שם הקטגוריה"
            aria-invalid={duplicate}
            autoFocus
            required
          />
          {duplicate ? (
            <p role="alert" className="text-[11px] font-medium text-danger">
              כבר קיימת קטגוריה בשם הזה
            </p>
          ) : null}
        </div>

        {suggestions.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted">הצעות מהירות</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTitle(s)}
                  aria-pressed={trimmed === s}
                  className={[
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                    trimmed === s
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/60',
                  ].join(' ')}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button
            type="submit"
            variant="accent"
            className="flex-1"
            disabled={!trimmed || duplicate}
          >
            {category ? 'שמור' : 'צור קטגוריה'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            ביטול
          </Button>
        </div>
      </form>
    </Modal>
  )
}
