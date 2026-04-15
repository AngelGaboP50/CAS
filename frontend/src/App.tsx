// src/App.tsx — REEMPLAZA el archivo actual completo
// Agrega rutas protegidas con ProtectedRoute

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import DashboardPage from './pages/DashboardPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import SalonesPage from './pages/SalonesPage'
import HistorialAccesosPage from './pages/HistorialAccesosPage'
import SolicitudesPage from './pages/SolicitudesPage'
import NotificacionesPage from './pages/NotificacionesPage'
import ProtectedRoute from './guards/ProtectedRoute'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Profesor */}
        <Route path="/dashboard" element={
          <ProtectedRoute requiredRole="profesor">
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/salones" element={
          <ProtectedRoute requiredRole="profesor">
            <SalonesPage />
          </ProtectedRoute>
        } />
        <Route path="/mis-accesos" element={
          <ProtectedRoute requiredRole="profesor">
            <HistorialAccesosPage />
          </ProtectedRoute>
        } />
        <Route path="/solicitudes" element={
          <ProtectedRoute requiredRole="profesor">
            <SolicitudesPage />
          </ProtectedRoute>
        } />
        <Route path="/notificaciones" element={
          <ProtectedRoute>
            <NotificacionesPage />
          </ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboardPage />
          </ProtectedRoute>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
