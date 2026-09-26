import { useState } from 'react'
import { Pencil, Settings2, Trash2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Modal } from '../ui/Modal'

export function ProgramManager() {
  const {
    workoutPrograms,
    activeProgram,
    activeProgramId,
    setActiveProgramId,
    createProgram,
    renameProgram,
    deleteProgram,
  } = useAppData()

  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  return (
    <>
      <div className="flex items-center gap-2 rounded-3xl border border-slate-800/60 bg-slate-900/70 p-2.5 shadow-lg shadow-black/20 backdrop-blur-md">
        <label className="sr-only" htmlFor="program-select">
          תוכנית אימונים
        </label>
        <select
          id="program-select"
          value={activeProgramId}
          onChange={(e) => setActiveProgramId(e.target.value)}
          className="field min-w-0 flex-1 font-semibold"
        >
          {workoutPrograms.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <IconButton label="ניהול תוכניות" tone="accent" onClick={() => setOpen(true)}>
          <Settings2 className="size-4" strokeWidth={1.75} />
        </IconButton>
      </div>

      <Modal open={open} title="מנהל תוכניות אימון" onClose={() => setOpen(false)} wide>
        <div className="space-y-4">
          <p className="text-sm text-muted">
            פעילה כעת:{' '}
            <span className="font-semibold text-text">
              {activeProgram?.name ?? '—'}
            </span>
          </p>

          <ul className="space-y-2">
            {workoutPrograms.map((p) => (
              <li
                key={p.id}
                className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4"
              >
                <div className="flex items-center gap-1">
                  <div className="min-w-0 flex-1 text-right">
                    <p className="font-semibold text-text">
                      {p.name}
                      {p.id === activeProgramId ? (
                        <span className="ms-2 text-xs text-accent">פעילה</span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {p.days.length} ימים · עודכן{' '}
                      {new Date(p.updatedAt).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  <IconButton
                    label="שנה שם"
                    tone="accent"
                    onClick={() => {
                      setRenameId(p.id)
                      setRenameValue(p.name)
                    }}
                  >
                    <Pencil className="size-3.5" strokeWidth={1.75} />
                  </IconButton>
                  <IconButton
                    label="מחק"
                    tone="danger"
                    disabled={workoutPrograms.length <= 1}
                    onClick={() => deleteProgram(p.id)}
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>

          <form
            className="flex gap-2 border-t border-slate-800/60 pt-4"
            onSubmit={(e) => {
              e.preventDefault()
              createProgram(newName || 'תוכנית חדשה', true)
              setNewName('')
            }}
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="שם תוכנית חדשה"
              className="field min-w-0 flex-1"
            />
            <Button type="submit" variant="accent">
              צור
            </Button>
          </form>
        </div>
      </Modal>

      <Modal
        open={!!renameId}
        title="שינוי שם תוכנית"
        onClose={() => setRenameId(null)}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (renameId) renameProgram(renameId, renameValue)
            setRenameId(null)
          }}
        >
          <input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
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
