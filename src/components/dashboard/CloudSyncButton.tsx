import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useAppData } from '../../context/AppDataContext'

export function CloudSyncButton() {
  const { syncNow, stateSyncStatus } = useAppData()
  const [busy, setBusy] = useState(false)
  const syncing = busy || stateSyncStatus === 'syncing'

  return (
    <button
      type="button"
      disabled={syncing}
      onClick={() => {
        setBusy(true)
        void syncNow().finally(() => setBusy(false))
      }}
      className="inline-flex min-h-8 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium text-muted transition hover:text-text disabled:opacity-50"
    >
      <RefreshCw className={`size-3 ${syncing ? 'animate-spin' : ''}`} />
      {syncing ? 'מסנכרן…' : 'סנכרון ענן 🔄'}
    </button>
  )
}
