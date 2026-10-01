import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

type AccordionProps = {
  title: string
  children: ReactNode
  subtitle?: string
}

export function Accordion({ title, children, subtitle }: AccordionProps) {
  return (
    <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/80">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 text-right">
          <h2 className="font-display text-base font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
          ) : null}
        </div>
        <ChevronDown
          className="size-5 shrink-0 text-muted transition group-open:rotate-180"
          strokeWidth={1.75}
          aria-hidden
        />
      </summary>
      <div className="space-y-5 border-t border-slate-200 p-5">{children}</div>
    </details>
  )
}
