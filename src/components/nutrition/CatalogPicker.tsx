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

  const matches = useMemo(() => filterCatalog(items, query), [items, query])
  const showList = open && query.trim().length > 0

  function pick(item: CatalogFood) {
    onSelect(item)
    setQuery('')
    setOpen(false)
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
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120)
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && matches[0]) {
            e.preventDefault()
            pick(matches[0])
          }
        }}
        className="field ps-10"
      />
      {showList ? (
        <ul
          role="listbox"
          className="mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-200/80"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">לא נמצאו פריטים במאגר</li>
          ) : (
            matches.map((item) => (
              <li key={item.id} role="option">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(item)}
                  className="flex w-full flex-col items-stretch gap-0.5 px-3 py-2 text-right hover:bg-slate-50"
                >
                  <span className="text-sm font-semibold text-text">
                    {catalogDisplayName(item)}
                  </span>
                  <span className="text-[11px] text-muted">
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
