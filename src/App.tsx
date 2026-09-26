import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { AppDataProvider } from './context/AppDataContext'
import { WorkoutSessionProvider } from './context/WorkoutSessionContext'
import { DashboardPage } from './pages/DashboardPage'
import { WorkoutsPage } from './pages/WorkoutsPage'
import { NutritionPage } from './pages/NutritionPage'
import { ProfilePage } from './pages/ProfilePage'

export default function App() {
  return (
    <AppDataProvider>
      <WorkoutSessionProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="workouts" element={<WorkoutsPage />} />
              <Route path="nutrition" element={<NutritionPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="habits" element={<Navigate to="/profile" replace />} />
              <Route path="export" element={<Navigate to="/profile" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </WorkoutSessionProvider>
    </AppDataProvider>
  )
}
