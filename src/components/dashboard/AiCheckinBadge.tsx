import { Link, useNavigate } from 'react-router-dom'
import { Ruler } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { useTodayKey } from '../../hooks/useTodayKey'
import { latestDateKey } from '../../lib/aiCheckin'
import { AiReviewBadge } from '../ai/AiReviewBadge'

const AI_PRESETS = [7, 14, 21, 28, 56] as const
const BODY_PRESETS = [14, 30, 60] as const

function aiLabel(remaining: number): string {
  if (remaining <= 0) return 'הגיע הזמן לעדכון AI'
  if (remaining === 1) return 'עדכון AI מחר'
  return `עדכון AI בעוד ${remaining} ימים`
}

function bodyLabel(remaining: number): string {
  if (remaining <= 0) return 'הגיע הזמן למדוד אחוזי שומן'
  if (remaining === 1) return 'מדדי שומן מחר'
  return `מדדי שומן בעוד ${remaining} ימים`
}

/**
 * Dashboard countdowns: AI plan review + body-fat / circumference reminder.
 * Both cycles live in the synced profile (interval + anchor, LWW stamps).
 * The measurement reminder also restarts on its own from the newest entry in
 * the monthly body log, so logging a measurement resets it automatically.
 */
export function AiCheckinBadge() {
  const { goal, profile, setProfile, bodyLogHistory } = useAppData()
  const navigate = useNavigate()
  const today = useTodayKey()
  const aiAnchor = profile.lastAiExportAt ?? goal.startDate
  const lastMeasured =
    [...bodyLogHistory].reverse().find((e) => e.date <= today)?.date ?? null
  const bodyAnchor = latestDateKey(profile.bodyCheckAnchorAt, lastMeasured) ?? goal.startDate

  return (
    <div className="flex items-center gap-2 px-4 pt-2">
      <AiReviewBadge
        title="תזכורת עדכון AI — תוכנית ראשית"
        cycle={{ intervalDays: profile.aiCheckinIntervalDays, anchorDate: aiAnchor }}
        presets={AI_PRESETS}
        label={aiLabel}
        showEditIcon
        hint="נשמר בפרופיל ומסונכרן לענן."
        onSave={({ intervalDays, anchorDate }) =>
          setProfile({
            ...profile,
            aiCheckinIntervalDays: intervalDays,
            lastAiExportAt: anchorDate,
            aiCheckinUpdatedAt: new Date().toISOString(),
          })
        }
        footer={
          <Link to="/profile#export" className="block text-center text-[11px] font-medium text-blue-700">
            מעבר לייצוא הנתונים ל-AI
          </Link>
        }
      />
      <AiReviewBadge
        title="תזכורת מדדים ואחוזי שומן"
        cycle={{ intervalDays: profile.bodyCheckIntervalDays, anchorDate: bodyAnchor }}
        presets={BODY_PRESETS}
        label={bodyLabel}
        icon={<Ruler className="size-3 shrink-0" />}
        showEditIcon
        onDueClick={() => navigate('/profile#body-fat')}
        resetLabel="מדדתי היום — התחל מחזור חדש"
        dueMessage="הגיע הזמן למדוד אחוזי שומן והיקפים — הזן את המדידה בפרופיל."
        anchorLabel="תאריך המדידה האחרונה"
        hint="מתאפס אוטומטית בכל מדידה חדשה בפרופיל ומדדים."
        onSave={({ intervalDays, anchorDate }) =>
          setProfile({
            ...profile,
            bodyCheckIntervalDays: intervalDays,
            bodyCheckAnchorAt: anchorDate,
            bodyCheckUpdatedAt: new Date().toISOString(),
          })
        }
        footer={
          <Link to="/profile#body-fat" className="block text-center text-[11px] font-medium text-blue-700">
            מעבר להזנת מדדים
          </Link>
        }
      />
    </div>
  )
}
