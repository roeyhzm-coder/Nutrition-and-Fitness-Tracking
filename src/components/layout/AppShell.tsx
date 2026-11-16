import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { ActiveWorkoutTracker } from '../workouts/ActiveWorkoutTracker'
import { SyncNoticeToast } from './SyncNoticeToast'

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col bg-transparent" dir="rtl">
      <div className="flex-1 pb-[calc(10rem+env(safe-area-inset-bottom,0px))]">
        <Outlet />
      </div>
      <BottomNav />
      <ActiveWorkoutTracker />
      <SyncNoticeToast />
    </div>
  )
}
