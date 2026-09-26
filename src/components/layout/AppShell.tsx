import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { ActiveWorkoutTracker } from '../workouts/ActiveWorkoutTracker'

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-transparent" dir="rtl">
      <div className="flex-1 pb-32">
        <Outlet />
      </div>
      <BottomNav />
      <ActiveWorkoutTracker />
    </div>
  )
}
