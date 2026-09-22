import { PageHeader } from '../components/layout/PageHeader'
import { AiExportPanel } from '../components/export/AiExportPanel'

export function ExportPage() {
  return (
    <>
      <PageHeader
        title="ייצוא נתונים"
        subtitle="העתקת פרומפט שבועי לניתוח AI"
      />
      <div className="px-4 py-4">
        <AiExportPanel />
      </div>
    </>
  )
}
