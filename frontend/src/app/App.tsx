import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { DashboardPage } from '../pages/DashboardPage'
import { PackagesPage } from '../pages/PackagesPage'
import { SettingsPage } from '../pages/SettingsPage'

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/documents" element={<Navigate to="/documents/week" replace />} />
        <Route path="/documents/:period" element={<PackagesPage kind="documents" />} />
        <Route path="/workflow" element={<PackagesPage kind="workflow" />} />
        <Route path="/transmittal" element={<PackagesPage kind="transmittal" />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
