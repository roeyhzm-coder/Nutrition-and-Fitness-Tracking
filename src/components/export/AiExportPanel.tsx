import { useMemo, useState } from 'react'
import { buildAiExportPrompt } from '../../lib/exportPrompt'
import { useAppData } from '../../context/AppDataContext'
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
  } = useAppData()
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
        פרומפט מובנה בעברית: מדדי גוף, מטרת על ושלב נוכחי, פילוח ענפי ספורט,
        אורח חיים, מאקרו מול יעדים ומגבלות תזונה ובריאות.
      </p>
      <Button className="w-full" variant="accent" onClick={copy}>
        {copied ? 'הועתק ✓' : 'העתק ייצוא נתונים'}
      </Button>
      <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-surface p-3 text-xs leading-relaxed text-muted">
        {prompt}
      </pre>
    </Card>
  )
}
