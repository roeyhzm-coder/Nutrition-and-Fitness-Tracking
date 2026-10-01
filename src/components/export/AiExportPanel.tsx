import { useMemo, useState } from 'react'
import { buildAiExportPrompt } from '../../lib/exportPrompt'
import {
  buildExportCsv,
  buildExportJson,
  downloadTextFile,
} from '../../lib/dynamicExport'
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
    workoutPrograms,
    workoutTemplates,
    profile,
    activityLogs,
    lifestyleLogs,
    phaseHistory,
    activeProgram,
    routines,
    focusTracks,
  } = useAppData()
  const { workoutLogs } = useWorkoutSession()
  const [copied, setCopied] = useState(false)

  const exportInput = useMemo(
    () => ({
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
    }),
    [
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
    ],
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

  const stamp = new Date().toISOString().slice(0, 10)

  return (
    <Card title="ייצוא נתונים">
      <p className="mb-3 text-sm text-muted">
        הייצוא סורק דינמית את כל הישויות: אימונים, שגרות, מסלולי מיקוד, לוגים
        ותבניות. כל מסלול, הרגל או סוג אימון חדש נכנס אוטומטית לקובץ עם תאריך,
        סוג פעילות, קלוריות ויעדים.
      </p>
      <div className="flex flex-col gap-2">
        <Button className="w-full" variant="accent" onClick={copy}>
          {copied ? 'הועתק ✓' : 'העתק פרומפט AI'}
        </Button>
        <Button
          className="w-full"
          variant="surface"
          onClick={() =>
            downloadTextFile(
              `training-export-${stamp}.json`,
              buildExportJson(exportInput),
              'application/json;charset=utf-8',
            )
          }
        >
          הורד JSON דינמי
        </Button>
        <Button
          className="w-full"
          variant="surface"
          onClick={() =>
            downloadTextFile(
              `training-export-${stamp}.csv`,
              buildExportCsv(exportInput),
              'text/csv;charset=utf-8',
            )
          }
        >
          הורד CSV דינמי
        </Button>
      </div>
      <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-muted">
        {prompt}
      </pre>
    </Card>
  )
}
