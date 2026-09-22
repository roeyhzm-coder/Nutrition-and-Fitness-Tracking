import { useMemo, useState } from 'react'
import { buildAiExportPrompt } from '../../lib/exportPrompt'
import type { FoodLogEntry, SetLog, WeightEntry } from '../../lib/types'
import { DEFAULT_MACRO_TARGETS } from '../../data/habits'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

type AiExportPanelProps = {
  setLogs: SetLog[]
  weightLogs: WeightEntry[]
  foodLogs: FoodLogEntry[]
}

export function AiExportPanel({
  setLogs,
  weightLogs,
  foodLogs,
}: AiExportPanelProps) {
  const [copied, setCopied] = useState(false)

  const prompt = useMemo(
    () =>
      buildAiExportPrompt({
        setLogs,
        weightLogs,
        foodLogs,
        calorieTarget: DEFAULT_MACRO_TARGETS.calories,
      }),
    [setLogs, weightLogs, foodLogs],
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
        כפתור אחד מרכז את נתוני השבוע (הרמות, ממוצע קלוריות ומשקל) לפרומפט
        בעברית להדבקה בצ׳אט AI.
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
