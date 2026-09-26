import { PageHeader } from '../components/layout/PageHeader'
import { AiExportPanel } from '../components/export/AiExportPanel'
import { ProfileCard } from '../components/export/ProfileCard'

export function ExportPage() {
  return (
    <>
      <PageHeader
        title="ייצוא נתונים"
        subtitle="העתקת פרומפט שבועי לניתוח AI"
      />
      <div className="space-y-5 px-4 py-5">
        <ProfileCard />
        <AiExportPanel />
      </div>
    </>
  )
}
