import { useMemo, useRef, useState } from 'react'
import { buildAiExportPrompt, buildWeeklyCountRows, parseImportJson } from '../../lib/exportPrompt'
import { buildExportJson, downloadTextFile } from '../../lib/dynamicExport'
import { extractBodyMeasurementsHistory } from '../../lib/bodyMeasurements'
import { localDateKey } from '../../lib/types'
import {
  parseWeekStartDay,
  WEEK_START_STORAGE_KEY,
  type WeekStartDay,
} from '../../lib/weeklyConsistency'
import { useAppData } from '../../context/AppDataContext'
import { useWorkoutSession } from '../../context/WorkoutSessionContext'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { morningExportEntities } from '../../lib/morningExport'
import { skillTreeExportEntities } from '../../lib/skillTreeExport'
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
    consistencyWeekNotes,
    savedMeals,
    recipes,
    workoutPrograms,
    workoutTemplates,
    profile,
    bodyMeasurements,
    importMealsAndRecipes,
    morningRoutine,
    skillTree,
  } = useAppData()
  const { workoutLogs } = useWorkoutSession()
  const [copied, setCopied] = useState(false)
  const [storedWeekStart] = useLocalStorage<WeekStartDay>(
    WEEK_START_STORAGE_KEY,
    0,
  )
  const weekStartsOn = parseWeekStartDay(storedWeekStart)

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
        consistencyWeekNotes,
        weekStartsOn,
        savedMeals,
        recipes,
        workoutPrograms,
        bodyMeasurements,
        morningRoutine,
        skillTree,
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
      consistencyWeekNotes,
      weekStartsOn,
      savedMeals,
      recipes,
      workoutPrograms,
      bodyMeasurements,
      morningRoutine,
      skillTree,
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
      profile: [profile],
      goal: [{ ...goal, phase }],
      macroTargets: [macroTargets],
      weeklyConsistency: buildWeeklyCountRows({
        setLogs,
        phaseStart: goal.startDate,
        target: goal.weeklyWorkoutTarget || 5,
        dayMarks: consistencyDayMarks,
        weekNotes: consistencyWeekNotes,
        weekStartsOn,
      }),
      ...morningExportEntities(morningRoutine, weekStartsOn),
      ...skillTreeExportEntities(skillTree, {
        workoutLogs,
        setLogs,
        weightLogs,
        bodyMeasurements,
        morningRoutine,
        programDays: workoutDays,
      }),
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
      // Copying is not an AI update: the check-in cycle is only reset explicitly
      // from the countdown badge ("עדכנתי עם AI היום").
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
