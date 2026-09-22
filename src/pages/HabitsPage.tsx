import { PageHeader } from '../components/layout/PageHeader'
import { HabitChecklist } from '../components/habits/HabitChecklist'
import { useAppData } from '../context/AppDataContext'

export function HabitsPage() {
  const { habitChecks, toggleHabit } = useAppData()

  return (
    <>
      <PageHeader
        title="הרגלים"
        subtitle="ניידות מפרקים ושליטה בדחפים בבוקר"
      />
      <div className="px-4 py-4">
        <HabitChecklist checks={habitChecks} onToggle={toggleHabit} />
      </div>
    </>
  )
}
