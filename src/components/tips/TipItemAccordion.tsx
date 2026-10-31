import { ChevronDown } from 'lucide-react'
import type { TipItem } from '../../lib/fitnessTips'
import { TipActionsMenu, type TipMenuAction } from './TipActionsMenu'
import { TipBody } from './TipBody'

type TipItemAccordionProps = {
  item: TipItem
  isOpen: boolean
  onToggle: () => void
  actions: TipMenuAction[]
}

/**
 * Level-2 accordion: a tip shows only its title until tapped. The "⋯" menu is a
 * sibling of the toggle button (never nested inside it), so opening the menu
 * doesn't toggle the tip.
 */
export function TipItemAccordion({ item, isOpen, onToggle, actions }: TipItemAccordionProps) {
  const hasBody = item.body.trim().length > 0
  const expanded = hasBody && isOpen
  const panelId = `tip-item-panel-${item.id}`
  const headerId = `tip-item-header-${item.id}`

  return (
    <article
      className={[
        'rounded-xl border bg-white transition-colors',
        expanded ? 'border-blue-200/80 shadow-sm shadow-blue-100/50' : 'border-slate-200/80',
      ].join(' ')}
    >
      <div className="flex items-center gap-1 pe-1">
        {hasBody ? (
          <button
            type="button"
            id={headerId}
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2 text-right transition hover:bg-slate-50/80"
          >
            <span
              className={`size-1.5 shrink-0 rounded-full transition-colors ${expanded ? 'bg-blue-600' : 'bg-slate-300'}`}
              aria-hidden
            />
            <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900">
              {item.title}
            </h3>
            <ChevronDown
              className={`size-4 shrink-0 text-muted transition-transform duration-300 motion-reduce:transition-none ${expanded ? 'rotate-180 text-blue-600' : ''}`}
              strokeWidth={2}
            />
          </button>
        ) : (
          <div id={headerId} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 px-3 py-2">
            <span className="size-1.5 shrink-0 rounded-full bg-slate-200" aria-hidden />
            <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900">
              {item.title}
            </h3>
          </div>
        )}
        <TipActionsMenu label={`פעולות לדגש ${item.title}`} actions={actions} />
      </div>

      {hasBody ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
          inert={!expanded}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className={`border-t border-slate-100 px-3 pb-3 pt-2 transition-opacity duration-300 motion-reduce:transition-none ${expanded ? 'opacity-100' : 'opacity-0'}`}
            >
              <TipBody body={item.body} />
            </div>
          </div>
        </div>
      ) : null}
    </article>
  )
}
