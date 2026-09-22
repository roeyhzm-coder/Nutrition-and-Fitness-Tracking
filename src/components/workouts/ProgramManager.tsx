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
      <div className="flex items-center gap-2 rounded-xl border border-line bg-card p-2">
        <label className="sr-only" htmlFor="program-select">
          תוכנית אימונים
        </label>
        <select
          id="program-select"
          value={activeProgramId}
          onChange={(e) => setActiveProgramId(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-text outline-none focus:border-primary"
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
                className="rounded-xl border border-line bg-surface p-3"
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
            className="flex gap-2 border-t border-line pt-3"
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
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
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
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
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
