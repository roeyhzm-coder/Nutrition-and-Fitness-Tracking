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
      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-800 transition hover:bg-blue-100 disabled:opacity-60"
    >
      <RefreshCw className={`size-3.5 ${syncing ? 'animate-spin' : ''}`} />
      {syncing ? 'מסנכרן…' : '🔄 סנכרן עכשיו מול הענן'}
    </button>
  )
}
