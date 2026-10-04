import { useMemo, useState } from 'react'
import { LAST_AI_EXPORT_KEY } from '../../lib/aiCheckin'
import { buildAiExportPrompt } from '../../lib/exportPrompt'
import { localDateKey } from '../../lib/types'
import { useAppData } from '../../context/AppDataContext'
import { useWorkoutSession } from '../../context/WorkoutSessionContext'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { Button } from '../ui/button'
import { Card } from '../ui/Card'

export function AiExportPanel() {
  const {
    setLogs,
    weightLogs,
    foodLogs,
    habits,
    habitChecks,
    macroTargets,
    goal,
    phase,
    workoutDays,
    activityLogs,
    lifestyleLogs,
    phaseHistory,
    activeProgram,
    routines,
    focusTracks,
    consistencyDayMarks,
    savedMeals,
    recipes,
    workoutPrograms,
    profile,
    setProfile,
  } = useAppData()
  const { workoutLogs } = useWorkoutSession()
  const [copied, setCopied] = useState(false)
  const [, setLastAiExportAt] = useLocalStorage<string | null>(
    LAST_AI_EXPORT_KEY,
    null,
  )

  const prompt = useMemo(
    () =>
      buildAiExportPrompt({
        setLogs,
        weightLogs,
        foodLogs,
        habits,
        habitChecks,
        macroTargets,
        goal,
        phase,
        workoutDays,
        profile,
        activityLogs,
        lifestyleLogs,
        phaseHistory,
        workoutLogs,
        activeProgramId: activeProgram?.id ?? '',
        activeProgramName: activeProgram?.name ?? '',
        routines,
        focusTracks,
        consistencyDayMarks,
        savedMeals,
        recipes,
        workoutPrograms,
      }),
    [
      setLogs,
      weightLogs,
      foodLogs,
      habits,
      habitChecks,
      macroTargets,
      goal,
      phase,
      workoutDays,
      profile,
      activityLogs,
      lifestyleLogs,
      phaseHistory,
      workoutLogs,
      activeProgram?.id,
      activeProgram?.name,
      routines,
      focusTracks,
      consistencyDayMarks,
      savedMeals,
      recipes,
      workoutPrograms,
    ],
  )

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt)
      const today = localDateKey()
      setLastAiExportAt(today)
      setProfile({ ...profile, lastAiExportAt: today })
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card title="ייצוא נתונים">
      <p className="mb-3 text-sm text-muted">
        פרומפט ממוקד לניתוח AI: מדדי גוף, עקביות, התקדמות כוח, אימונים אחרונים
        וממוצעים נעים — בלי תבניות, תוכניות גולמיות או מזהים פנימיים.
      </p>
      <Button className="w-full" variant="accent" onClick={copy}>
        {copied ? 'הועתק ✓' : 'העתק פרומפט AI'}
      </Button>
      <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-muted">
        {prompt}
      </pre>
    </Card>
  )
}
