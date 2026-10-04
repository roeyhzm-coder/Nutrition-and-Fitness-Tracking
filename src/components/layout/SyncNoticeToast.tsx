import { useEffect } from 'react'
import { useAppData } from '../../context/AppDataContext'

export function SyncNoticeToast() {
  const { lastSyncNotice, clearSyncNotice } = useAppData()

  useEffect(() => {
    if (!lastSyncNotice) return
    const timer = window.setTimeout(() => clearSyncNotice(), 4200)
    return () => window.clearTimeout(timer)
  }, [lastSyncNotice, clearSyncNotice])

  if (!lastSyncNotice) return null

  return (
    <div
      className={[
        'pointer-events-none fixed inset-x-0 bottom-24 z-[60] mx-auto w-[min(92%,28rem)] rounded-2xl px-4 py-2.5 text-center text-sm font-semibold shadow-lg',
        lastSyncNotice.type === 'error'
          ? 'bg-red-600 text-white'
          : 'bg-emerald-600 text-white',
      ].join(' ')}
    >
      {lastSyncNotice.message}
    </div>
  )
}
