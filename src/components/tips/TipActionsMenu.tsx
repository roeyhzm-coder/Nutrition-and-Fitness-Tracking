import type { LucideIcon } from 'lucide-react'
import { MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

export type TipMenuAction = {
  label: string
  icon: LucideIcon
  onSelect: () => void
  disabled?: boolean
  destructive?: boolean
}

type TipActionsMenuProps = {
  label: string
  actions: TipMenuAction[]
  className?: string
}

/** "⋯" menu rendered in a portal, so it is never clipped by a collapsing accordion panel. */
export function TipActionsMenu({ label, actions, className = '' }: TipActionsMenuProps) {
  const regular = actions.filter((a) => !a.destructive)
  const destructive = actions.filter((a) => a.destructive)

  return (
    <DropdownMenu dir="rtl" modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-slate-100 hover:text-text data-[state=open]:bg-slate-100 data-[state=open]:text-text ${className}`}
        >
          <MoreHorizontal className="size-4" strokeWidth={2} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-44">
        {regular.map(({ label: text, icon: Icon, onSelect, disabled }) => (
          <DropdownMenuItem key={text} disabled={disabled} onSelect={onSelect}>
            <Icon strokeWidth={2} />
            {text}
          </DropdownMenuItem>
        ))}
        {destructive.length > 0 && regular.length > 0 ? <DropdownMenuSeparator /> : null}
        {destructive.map(({ label: text, icon: Icon, onSelect, disabled }) => (
          <DropdownMenuItem
            key={text}
            variant="destructive"
            disabled={disabled}
            onSelect={onSelect}
          >
            <Icon strokeWidth={2} />
            {text}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
