// src/App.tsx
// Rutas de la aplicación. Las rutas del Profesor están anidadas dentro de AppShell
// que provee el sidebar lateral permanente.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './features/auth/pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import SalonesPage from './pages/SalonesPage'
import HistorialAccesosPage from './pages/HistorialAccesosPage'
import SolicitudesPage from './pages/SolicitudesPage'
import NotificacionesPage from './pages/NotificacionesPage'
import SimulacionPuertaPage from './pages/SimulacionPuertaPage'
import QrAccessPage from './pages/QrAccessPage'
import AppShell from './components/AppShell'
import ProtectedRoute from './guards/ProtectedRoute'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Públicas ─────────────────────────────────────────── */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/simulacion/:salon_id?" element={<SimulacionPuertaPage />} />
        <Route path="/qr-access/:salon_id?" element={<QrAccessPage />} />

        {/* ── Profesor: AppShell como layout wrapper ───────────── */}
        <Route
          element={
            <ProtectedRoute requiredRole="profesor">
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard"       element={<DashboardPage />} />
          <Route path="/salones"         element={<SalonesPage />} />
          <Route path="/mis-accesos"     element={<HistorialAccesosPage />} />
          <Route path="/solicitudes"     element={<SolicitudesPage />} />
          <Route path="/notificaciones"  element={<NotificacionesPage />} />
        </Route>

        {/* ── Admin ─────────────────────────────────────────────── */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboardPage />
          </ProtectedRoute>
        } />

        {/* ── Catch-all ─────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
