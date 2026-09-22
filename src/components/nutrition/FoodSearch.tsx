import { useEffect, useState } from 'react'
import { searchOpenFoodFacts, type FoodProduct } from '../../lib/openFoodFacts'
import type { FoodLogEntry } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

type FoodSearchProps = {
  onAdd: (entry: Omit<FoodLogEntry, 'id' | 'loggedAt'>) => void
}

export function FoodSearch({ onAdd }: FoodSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [grams, setGrams] = useState<Record<string, string>>({})

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setError(null)
      return
    }

    const controller = new AbortController()
    const handle = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const products = await searchOpenFoodFacts(
          query.trim(),
          controller.signal,
        )
        setResults(products)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('לא ניתן לחפש כרגע. נסה שוב.')
        }
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => {
      controller.abort()
      window.clearTimeout(handle)
    }
  }, [query])

  function addProduct(product: FoodProduct) {
    const g = Number(grams[product.code] ?? '100')
    if (!Number.isFinite(g) || g <= 0) return
    const factor = g / 100
    onAdd({
      name: product.brand
        ? `${product.name} (${product.brand})`
        : product.name,
      grams: g,
      calories: Math.round((product.caloriesPer100g ?? 0) * factor),
      protein: Math.round((product.proteinPer100g ?? 0) * factor * 10) / 10,
      carbs: Math.round((product.carbsPer100g ?? 0) * factor * 10) / 10,
      fats: Math.round((product.fatsPer100g ?? 0) * factor * 10) / 10,
      source: 'openfoodfacts',
    })
  }

  return (
    <Card title="חיפוש מזון — Open Food Facts">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="חפש מוצר… למשל חלבון מי גבינה"
        className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
      />
      {loading ? (
        <p className="mt-3 text-sm text-muted">מחפש…</p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
        {results.map((p) => (
          <li
            key={p.code}
            className="rounded-xl border border-line bg-surface p-3"
          >
            <div className="flex gap-3">
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt=""
                  className="size-12 rounded-lg object-cover"
                />
              ) : (
                <div className="size-12 rounded-lg bg-card" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">
                  {p.name}
                </p>
                <p className="text-xs text-muted">
                  {p.brand ?? 'ללא מותג'} ·{' '}
                  {p.caloriesPer100g != null
                    ? `${Math.round(p.caloriesPer100g)} קק״ל/100ג׳`
                    : 'ללא נתונים'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    inputMode="decimal"
                    value={grams[p.code] ?? '100'}
                    onChange={(e) =>
                      setGrams((prev) => ({ ...prev, [p.code]: e.target.value }))
                    }
                    className="w-20 rounded-lg border border-line bg-card px-2 py-1.5 text-xs text-text outline-none"
                    aria-label="גרמים"
                  />
                  <span className="text-xs text-muted">גרם</span>
                  <Button
                    className="ms-auto"
                    variant="accent"
                    onClick={() => addProduct(p)}
                  >
                    הוסף
                  </Button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
