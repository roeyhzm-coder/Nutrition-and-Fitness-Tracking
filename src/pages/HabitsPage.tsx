import { PageHeader } from '../components/layout/PageHeader'
import { HabitManager } from '../components/habits/HabitManager'

export function HabitsPage() {
  return (
    <>
      <PageHeader
        title="הרגלים"
        subtitle="נהל הרגלים יומיים מותאמים אישית"
      />
      <div className="px-4 py-4">
        <HabitManager />
      </div>
    </>
  )
}
