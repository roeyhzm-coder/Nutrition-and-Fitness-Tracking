import { Link } from 'react-router-dom'
import { useAppData } from '../../context/AppDataContext'
import { AiReviewBadge } from '../ai/AiReviewBadge'

const DAY_PILLS = [7, 14, 21, 28, 56] as const

/** Main plan AI check-in countdown (anchor + interval live in the synced profile). */
export function AiCheckinBadge() {
  const { goal, profile, setProfile } = useAppData()
  const anchorDate = profile.lastAiExportAt ?? goal.startDate

  return (
    <div className="px-4 pt-2">
      <AiReviewBadge
        title="תזכורת עדכון AI — תוכנית ראשית"
        cycle={{ intervalDays: profile.aiCheckinIntervalDays, anchorDate }}
        presets={DAY_PILLS}
        hint="נשמר בפרופיל ומסונכרן לענן."
        onSave={({ intervalDays, anchorDate: nextAnchor }) =>
          setProfile({
            ...profile,
            aiCheckinIntervalDays: intervalDays,
            lastAiExportAt: nextAnchor,
            aiCheckinUpdatedAt: new Date().toISOString(),
          })
        }
        footer={
          <Link
            to="/profile#export"
            className="block text-center text-[11px] font-medium text-blue-700"
          >
            מעבר לייצוא הנתונים ל-AI
          </Link>
        }
      />
    </div>
  )
}
