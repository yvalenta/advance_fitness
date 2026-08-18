import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from '@/components/layout/DashboardLayout'
import AuthPage from '@/features/auth/pages/AuthPage'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import CalculatorPage from '@/features/calculator/pages/CalculatorPage'

function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/calculator" element={<CalculatorPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  )
}

export default App
