import type { ReactNode } from 'react'
import { Button } from './Button'

type ModalProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

export function Modal({ open, title, onClose, children, wide }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="סגור"
        onClick={onClose}
      />
      <div
        className={[
          'relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-3xl border border-slate-800/60 bg-slate-900/90 p-5 shadow-2xl shadow-black/40 backdrop-blur-md',
          wide ? 'max-w-lg' : 'max-w-md',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold tracking-tight text-text">
            {title}
          </h2>
          <Button variant="ghost" onClick={onClose}>
            סגור
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}
