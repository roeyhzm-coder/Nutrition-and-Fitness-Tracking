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
    process,
    workoutDays,
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
        process,
        workoutDays,
      }),
    [
      setLogs,
      weightLogs,
      foodLogs,
      habits,
      habitChecks,
      macroTargets,
      process,
      workoutDays,
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
    <Card title="ייצוא לניתוח AI">
      <p className="mb-3 text-sm text-muted">
        פרומפט שבועי בעברית שכולל משקל, אחוזי שומן, ממוצעי תזונה, אימונים
        ואחוז השלמת הרגלים.
      </p>
      <Button className="w-full" variant="accent" onClick={copy}>
        {copied ? 'הועתק ✓' : 'העתק פרומפט שבועי'}
      </Button>
      <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-surface p-3 text-xs leading-relaxed text-muted">
        {prompt}
      </pre>
    </Card>
  )
}
