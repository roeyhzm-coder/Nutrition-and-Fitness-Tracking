import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { ProfileCard } from '../components/export/ProfileCard'
import { BodyFatTrackerCard } from '../components/profile/BodyFatTrackerCard'
import { GoalsEditorCard } from '../components/profile/GoalsEditorCard'
import { LifestyleCard } from '../components/dashboard/LifestyleCard'
import { AiExportPanel } from '../components/export/AiExportPanel'

export function ProfilePage() {
  const { hash } = useLocation()

  useEffect(() => {
    if (!hash) return
    document
      .getElementById(hash.slice(1))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  return (
    <>
      <PageHeader
        title="פרופיל ומדדים"
        subtitle="נתונים אישיים, יעדים, אורח חיים וייצוא"
      />
      <div className="space-y-5 px-4 py-5">
        <section id="metrics">
          <ProfileCard />
        </section>
        <section id="body-fat">
          <BodyFatTrackerCard />
        </section>
        <section id="goals">
          <GoalsEditorCard />
        </section>
        <section id="lifestyle">
          <LifestyleCard />
        </section>
        <section id="export">
          <AiExportPanel />
        </section>
      </div>
    </>
  )
}
