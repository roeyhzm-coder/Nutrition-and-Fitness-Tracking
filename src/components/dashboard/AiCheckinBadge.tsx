import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppData } from '../../context/AppDataContext'
import {
  aiCheckinLabel,
  daysUntilAiCheckin,
  LAST_AI_EXPORT_KEY,
} from '../../lib/aiCheckin'
import { useLocalStorage } from '../../hooks/useLocalStorage'

export function AiCheckinBadge() {
  const { goal } = useAppData()
  const [lastAiExportAt] = useLocalStorage<string | null>(
    LAST_AI_EXPORT_KEY,
    null,
  )
  const remaining = daysUntilAiCheckin(lastAiExportAt, goal.startDate)
  const due = remaining <= 0

  return (
    <div className="px-4 pt-2">
      <Link
        to="/profile#export"
        className={[
          'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none transition',
          due
            ? 'border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100'
            : 'border-slate-200 bg-white text-muted hover:border-slate-300 hover:text-text',
        ].join(' ')}
      >
        <Sparkles className="size-3 shrink-0" />
        <span className="truncate">{aiCheckinLabel(remaining)}</span>
      </Link>
    </div>
  )
}
