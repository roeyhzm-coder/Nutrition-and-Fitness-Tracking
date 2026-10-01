import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { IconButton } from '../ui/IconButton'

type DayActionsMenuProps = {
  onReplace: () => void
  onRest: () => void
  onReset: () => void
  isRest?: boolean
}

export function DayActionsMenu({
  onReplace,
  onRest,
  onReset,
  isRest = false,
}: DayActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function run(action: () => void) {
    setOpen(false)
    action()
  }

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        label="פעולות ליום"
        tone="default"
        className="size-9"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal className="size-4" strokeWidth={1.75} />
      </IconButton>
      {open ? (
        <div
          role="menu"
          className="absolute end-0 z-30 mt-1 min-w-[13.5rem] overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-200/80"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center px-3 py-2.5 text-right text-sm font-medium text-text hover:bg-slate-50"
            onClick={() => run(onReplace)}
          >
            החלף אימון
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={isRest}
            className="flex w-full items-center px-3 py-2.5 text-right text-sm font-medium text-text hover:bg-slate-50 disabled:opacity-40"
            onClick={() => run(onRest)}
          >
            קבע כיום מנוחה
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center px-3 py-2.5 text-right text-sm font-medium text-text hover:bg-slate-50"
            onClick={() => run(onReset)}
          >
            אפס לשגרת ברירת המחדל
          </button>
        </div>
      ) : null}
    </div>
  )
}
