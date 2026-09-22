import { PageHeader } from '../components/layout/PageHeader'
import { AiExportPanel } from '../components/export/AiExportPanel'
import { useAppData } from '../context/AppDataContext'

export function ExportPage() {
  const { setLogs, weightLogs, foodLogs } = useAppData()

  return (
    <>
      <PageHeader
        title="ייצוא נתונים"
        subtitle="העתקת פרומפט שבועי לניתוח AI"
      />
      <div className="px-4 py-4">
        <AiExportPanel
          setLogs={setLogs}
          weightLogs={weightLogs}
          foodLogs={foodLogs}
        />
      </div>
    </>
  )
}
