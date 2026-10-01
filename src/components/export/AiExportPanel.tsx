import { useMemo, useState } from 'react'
import { buildAiExportPrompt } from '../../lib/exportPrompt'
import { useAppData } from '../../context/AppDataContext'
import { useWorkoutSession } from '../../context/WorkoutSessionContext'
import { Button } from '../ui/Button'
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
    profile,
    activityLogs,
    lifestyleLogs,
    phaseHistory,
    activeProgram,
  } = useAppData()
  const { workoutLogs } = useWorkoutSession()
  const [copied, setCopied] = useState(false)

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
    ],
  )

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card title="ייצוא נתונים">
      <p className="mb-3 text-sm text-muted">
        פרומפט מובנה ללא כפילויות: מדדים, מטרת על, שלד 6 השלבים, שלב פעיל,
        היסטוריית ביצוע, התקדמות כוח בבלוק, ממוצעים שבועיים והנחיית כיול דינמי.
      </p>
      <Button className="w-full" variant="accent" onClick={copy}>
        {copied ? 'הועתק ✓' : 'העתק ייצוא נתונים'}
      </Button>
      <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-muted">
        {prompt}
      </pre>
    </Card>
  )
}
