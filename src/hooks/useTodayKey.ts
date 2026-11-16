import { useEffect, useState } from 'react'
import { localDateKey } from '../lib/types'

/**
 * Today's local YYYY-MM-DD that updates on its own when the date rolls over.
 * A PWA can stay alive in memory for days, so day counters must not freeze.
 */
export function useTodayKey(): string {
  const [today, setToday] = useState(localDateKey)

  useEffect(() => {
    const refresh = () => setToday((prev) => {
      const next = localDateKey()
      return next === prev ? prev : next
    })
    const timer = window.setInterval(refresh, 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  return today
}
