import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { DashboardPage } from './pages/DashboardPage'
import { PlaceholderPage } from './pages/PlaceholderPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route
            path="training"
            element={
              <PlaceholderPage
                title="Training"
                subtitle="Workouts, sets, and session history"
              />
            }
          />
          <Route
            path="nutrition"
            element={
              <PlaceholderPage
                title="Nutrition"
                subtitle="Meals, macros, and daily targets"
              />
            }
          />
          <Route
            path="plans"
            element={
              <PlaceholderPage
                title="Plans"
                subtitle="Active and upcoming training & nutrition plans"
              />
            }
          />
          <Route
            path="progress"
            element={
              <PlaceholderPage
                title="Progress"
                subtitle="Trends, body metrics, and adherence"
              />
            }
          />
          <Route
            path="settings"
            element={
              <PlaceholderPage
                title="Settings"
                subtitle="Profile, preferences, and units"
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
