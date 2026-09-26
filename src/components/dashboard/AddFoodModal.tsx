import { useState } from 'react'
import { Check, Pencil, Plus, Settings2, Trash2, X } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import type { SavedMeal } from '../../lib/types'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Modal } from '../ui/Modal'

type AddFoodModalProps = {
  open: boolean
  onClose: () => void
}

type MacroForm = {
  name: string
  calories: string
  protein: string
  carbs: string
  fats: string
}

const EMPTY_FORM: MacroForm = {
  name: '',
  calories: '',
  protein: '',
  carbs: '',
  fats: '',
}

const MACRO_FIELDS = [
  ['calories', 'קלוריות', 'numeric'],
  ['protein', 'חלבון', 'decimal'],
  ['carbs', 'פחמימות', 'decimal'],
  ['fats', 'שומנים', 'decimal'],
] as const

const inputClass = 'field'

function toForm(meal: SavedMeal): MacroForm {
  return {
    name: meal.name,
    calories: String(meal.calories),
    protein: String(meal.protein),
    carbs: String(meal.carbs),
    fats: String(meal.fats),
  }
}

function toMacros(form: MacroForm): Omit<SavedMeal, 'id'> {
  return {
    name: form.name.trim(),
    calories: Number(form.calories) || 0,
    protein: Number(form.protein) || 0,
    carbs: Number(form.carbs) || 0,
    fats: Number(form.fats) || 0,
  }
}

function MacroFields({
  form,
  onChange,
  namePlaceholder,
}: {
  form: MacroForm
  onChange: (patch: Partial<MacroForm>) => void
  namePlaceholder: string
}) {
  return (
    <>
      <input
        value={form.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder={namePlaceholder}
        className={inputClass}
        required
      />
      <div className="grid grid-cols-2 gap-2">
        {MACRO_FIELDS.map(([key, label, mode]) => (
          <label key={key} className="block text-xs text-muted">
            {label}
            <input
              inputMode={mode}
              value={form[key]}
              onChange={(e) => onChange({ [key]: e.target.value })}
              placeholder="0"
              className={`mt-1 ${inputClass}`}
            />
          </label>
        ))}
      </div>
    </>
  )
}

export function AddFoodModal({ open, onClose }: AddFoodModalProps) {
  const {
    addFood,
    savedMeals,
    logSavedMeal,
    addSavedMeal,
    updateSavedMeal,
    deleteSavedMeal,
  } = useAppData()
  const [form, setForm] = useState<MacroForm>(EMPTY_FORM)
  const [saveAsPreset, setSaveAsPreset] = useState(false)
  const [manage, setManage] = useState(false)
  /** null = closed, 'new' = creating, otherwise the preset id being edited */
  const [editorTarget, setEditorTarget] = useState<string | null>(null)
  const [editorForm, setEditorForm] = useState<MacroForm>(EMPTY_FORM)
  const [notice, setNotice] = useState<string | null>(null)

  function flash(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 2000)
  }

  function close() {
    setForm(EMPTY_FORM)
    setSaveAsPreset(false)
    setManage(false)
    setEditorTarget(null)
    setNotice(null)
    onClose()
  }

  function openEditor(meal?: SavedMeal) {
    setEditorTarget(meal ? meal.id : 'new')
    setEditorForm(meal ? toForm(meal) : EMPTY_FORM)
  }

  function saveEditor() {
    const payload = toMacros(editorForm)
    if (!payload.name) return
    if (editorTarget === 'new') addSavedMeal(payload)
    else if (editorTarget) updateSavedMeal(editorTarget, payload)
    setEditorTarget(null)
    flash(editorTarget === 'new' ? 'התבנית נוספה' : 'התבנית עודכנה')
  }

  function presetExists(name: string) {
    return savedMeals.some((m) => m.name.trim() === name)
  }

  function saveManualAsPreset() {
    const payload = toMacros(form)
    if (!payload.name) return
    const existing = savedMeals.find((m) => m.name.trim() === payload.name)
    if (existing) updateSavedMeal(existing.id, payload)
    else addSavedMeal(payload)
    flash(existing ? 'התבנית הקיימת עודכנה' : 'נשמר כתבנית קבועה')
  }

  return (
    <Modal open={open} title="הוספת מזון / ארוחה" onClose={close} wide>
      <div className="space-y-4">
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted">ארוחות קבועות</p>
            <div className="flex items-center gap-1">
              <IconButton
                label="תבנית חדשה"
                tone="accent"
                onClick={() => openEditor()}
              >
                <Plus className="size-4" strokeWidth={1.75} />
              </IconButton>
              {savedMeals.length > 0 ? (
                <IconButton
                  label={manage ? 'סיום ניהול' : 'ניהול תבניות'}
                  tone="accent"
                  className={manage ? 'bg-cyan-400/10 text-cyan-300' : ''}
                  onClick={() => setManage((v) => !v)}
                >
                  <Settings2 className="size-4" strokeWidth={1.75} />
                </IconButton>
              ) : null}
            </div>
          </div>

          {editorTarget ? (
            <form
              className="mb-3 space-y-2 rounded-2xl border border-cyan-400/40 bg-slate-950/50 p-4"
              onSubmit={(e) => {
                e.preventDefault()
                saveEditor()
              }}
            >
              <p className="text-xs font-semibold text-text">
                {editorTarget === 'new' ? 'תבנית חדשה' : 'עריכת תבנית'}
              </p>
              <MacroFields
                form={editorForm}
                onChange={(patch) => setEditorForm((p) => ({ ...p, ...patch }))}
                namePlaceholder="למשל: ארוחת ערב, ארוחת בוטנים, נשנוש ביניים"
              />
              <div className="flex gap-2">
                <Button type="submit" variant="accent" className="flex-1">
                  <Check className="size-3.5" strokeWidth={2} />
                  שמור תבנית
                </Button>
                <Button variant="surface" onClick={() => setEditorTarget(null)}>
                  <X className="size-3.5" strokeWidth={2} />
                  ביטול
                </Button>
              </div>
            </form>
          ) : null}

          {savedMeals.length === 0 ? (
            <p className="text-sm text-muted">
              אין תבניות עדיין. הוסף תבנית חדשה או שמור ארוחה ידנית כתבנית.
            </p>
          ) : manage ? (
            <ul className="space-y-2">
              {savedMeals.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 rounded-2xl border border-slate-800/60 bg-slate-950/40 px-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text">
                      {m.name}
                    </p>
                    <p className="text-xs text-muted">
                      {m.calories} קק״ל · ח {m.protein} · פ {m.carbs} · ש{' '}
                      {m.fats}
                    </p>
                  </div>
                  <IconButton
                    label="ערוך תבנית"
                    tone="accent"
                    onClick={() => openEditor(m)}
                  >
                    <Pencil className="size-3.5" strokeWidth={1.75} />
                  </IconButton>
                  <IconButton
                    label="מחק תבנית"
                    tone="danger"
                    onClick={() => {
                      if (window.confirm(`למחוק את "${m.name}"?`)) {
                        deleteSavedMeal(m.id)
                        if (editorTarget === m.id) setEditorTarget(null)
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                  </IconButton>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-wrap gap-2">
              {savedMeals.map((m) => (
                <div
                  key={m.id}
                  className="flex min-h-11 items-stretch overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950/40"
                >
                  <button
                    type="button"
                    className="min-h-11 px-3 py-2 text-right transition hover:bg-slate-800/60"
                    title="מילוי השדות לעריכה לפני הוספה"
                    onClick={() => {
                      setForm(toForm(m))
                      setSaveAsPreset(false)
                    }}
                  >
                    <span className="block text-sm font-semibold text-text">
                      {m.name}
                    </span>
                    <span className="block text-[10px] text-muted">
                      {m.calories} קק״ל · ח {m.protein}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`הוסף ${m.name} ישירות ליומן`}
                    title="הוסף ישירות ליומן"
                    className="flex min-w-11 items-center justify-center border-s border-slate-800/60 px-3 text-cyan-300 transition hover:bg-cyan-400 hover:text-slate-950"
                    onClick={() => {
                      logSavedMeal(m.id)
                      close()
                    }}
                  >
                    <Plus className="size-4" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {!manage && savedMeals.length > 0 ? (
            <p className="mt-2 text-[10px] text-muted">
              לחיצה על שם ממלאת את השדות · לחיצה על + מוסיפה ישירות ליומן
            </p>
          ) : null}
          {notice ? (
            <p className="mt-2 text-xs font-medium text-accent">{notice}</p>
          ) : null}
        </section>

        <form
          className="space-y-3 border-t border-slate-800/60 pt-4"
          onSubmit={(e) => {
            e.preventDefault()
            const payload = toMacros(form)
            if (!payload.name) return
            addFood({ ...payload, grams: 1, source: 'manual' })
            if (saveAsPreset) saveManualAsPreset()
            close()
          }}
        >
          <p className="text-xs font-medium text-muted">הוספה ידנית</p>
          <MacroFields
            form={form}
            onChange={(patch) => setForm((p) => ({ ...p, ...patch }))}
            namePlaceholder="שם המזון / הארוחה"
          />
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={saveAsPreset}
              onChange={(e) => setSaveAsPreset(e.target.checked)}
              className="size-4 accent-primary"
            />
            {presetExists(form.name.trim())
              ? 'עדכן גם את התבנית הקבועה בשם זה'
              : 'שמור גם כתבנית קבועה לשימוש עתידי'}
          </label>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" variant="accent">
              הוסף ליומן
            </Button>
            <Button
              variant="surface"
              disabled={!form.name.trim()}
              onClick={saveManualAsPreset}
            >
              שמור כתבנית בלבד
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
