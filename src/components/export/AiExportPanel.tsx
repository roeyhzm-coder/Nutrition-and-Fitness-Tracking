import { useMemo, useRef, useState } from 'react'
import { LAST_AI_EXPORT_KEY } from '../../lib/aiCheckin'
import { buildAiExportPrompt, parseImportJson } from '../../lib/exportPrompt'
import { buildExportJson, downloadTextFile } from '../../lib/dynamicExport'
import { extractBodyMeasurementsHistory } from '../../lib/bodyMeasurements'
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
    workoutTemplates,
    profile,
    setProfile,
    bodyMeasurements,
    importMealsAndRecipes,
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
        bodyMeasurements,
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
      bodyMeasurements,
    ],
  )

  const fileRef = useRef<HTMLInputElement>(null)
  const [importNotice, setImportNotice] = useState<string | null>(null)

  function exportJsonFile() {
    const json = buildExportJson({
      generatedAt: new Date().toISOString(),
      workoutLogs,
      workoutTemplates,
      workoutPrograms,
      routines,
      focusTracks,
      activityLogs,
      setLogs,
      foodLogs,
      weightLogs,
      habits,
      habitChecks,
      lifestyleLogs,
      bodyMeasurements,
    })
    downloadTextFile(
      `body-and-training-export-${localDateKey()}.json`,
      json,
      'application/json',
    )
  }

  function importJsonFile(file: File) {
    void file.text().then((raw) => {
      try {
        const parsed = parseImportJson(raw)
        const history =
          parsed.bodyMeasurements.length > 0
            ? parsed.bodyMeasurements
            : extractBodyMeasurementsHistory(JSON.parse(raw))
        importMealsAndRecipes(parsed.savedMeals, parsed.recipes, history)
        setImportNotice(
          `יובאו מדידות היסטוריה (${history.length}) · ${parsed.savedMeals.length} ארוחות · ${parsed.recipes.length} מתכונים`,
        )
      } catch {
        setImportNotice('JSON לא תקין. בדוק את הקובץ ונסה שוב.')
      }
    })
  }

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
      <Button className="mt-2 w-full" variant="surface" onClick={exportJsonFile}>
        ייצוא JSON
      </Button>
      <Button
        className="mt-2 w-full"
        variant="surface"
        onClick={() => fileRef.current?.click()}
      >
        ייבוא JSON
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) importJsonFile(file)
          e.target.value = ''
        }}
      />
      {importNotice ? (
        <p className="mt-2 text-xs text-muted">{importNotice}</p>
      ) : null}
      <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-muted">
        {prompt}
      </pre>
    </Card>
  )
}
