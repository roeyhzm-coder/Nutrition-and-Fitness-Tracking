import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  catalogDisplayName,
  catalogMacroPreview,
  filterCatalog,
  type CatalogFood,
} from '../../lib/foodCatalog'

type CatalogPickerProps = {
  items: CatalogFood[]
  placeholder?: string
  onSelect: (item: CatalogFood) => void
  autoFocus?: boolean
}

export function CatalogPicker({
  items,
  placeholder = 'חיפוש במאגר…',
  onSelect,
  autoFocus,
}: CatalogPickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const matches = useMemo(() => filterCatalog(items, query, 16), [items, query])
  const showList = open

  function pick(item: CatalogFood) {
    onSelect(item)
    setQuery('')
    setOpen(false)
    setActive(0)
  }

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        strokeWidth={1.75}
        aria-hidden
      />
      <input
        type="search"
        value={query}
        autoFocus={autoFocus}
        dir="rtl"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-expanded={showList}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120)
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((i) => Math.min(i + 1, Math.max(matches.length - 1, 0)))
            return
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => Math.max(i - 1, 0))
            return
          }
          if (e.key === 'Enter' && matches[active]) {
            e.preventDefault()
            pick(matches[active])
          }
        }}
        className="field ps-10"
      />
      {showList ? (
        <ul
          role="listbox"
          className="mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-200/80"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">לא נמצאו פריטים במאגר</li>
          ) : (
            matches.map((item, index) => (
              <li key={item.id} role="option" aria-selected={index === active}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => pick(item)}
                  className={[
                    'flex min-h-11 w-full flex-col items-stretch justify-center gap-0.5 px-3 py-1.5 text-right',
                    index === active ? 'bg-cyan-50' : 'hover:bg-slate-50',
                  ].join(' ')}
                >
                  <span className="truncate text-sm font-semibold text-text">
                    {catalogDisplayName(item)}
                  </span>
                  <span className="truncate text-[11px] text-muted">
                    {item.kind === 'meal' ? 'מתכון · ' : ''}
                    {catalogMacroPreview(item)}
                    {' · '}
                    {item.servingLabel} {item.servingGrams}ג׳
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}
