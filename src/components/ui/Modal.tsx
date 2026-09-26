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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="סגור"
        onClick={onClose}
      />
      <div
        className={[
          'relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/80',
          wide ? 'max-w-lg' : 'max-w-md',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">
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
