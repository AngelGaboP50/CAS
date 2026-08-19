// src/guards/ProtectedRoute.tsx
// Protege rutas: redirige al login si no hay sesión activa.
// Roles: 1 = Profesor, 2 = Administrador

import { Navigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'profesor'
}

function getUsuario() {
  try {
    const raw = sessionStorage.getItem('usuario')
    if (!raw) return null
    const user = JSON.parse(raw)
    if (user) {
      if (Number(user.rol) === 1) user.tipo = 'profesor'
      if (Number(user.rol) === 2) user.tipo = 'admin'
      if (user.tipo === 'profesor') user.rol = 1
      if (user.tipo === 'admin') user.rol = 2
    }
    return user
  } catch {
    return null
  }
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const usuario = getUsuario()

  // Sin sesión → login
  if (!usuario) {
    sessionStorage.setItem('returnUrl', window.location.pathname + window.location.search)
    return <Navigate to="/login" replace />
  }

  const esAdmin    = Number(usuario.rol) === 2 || usuario.tipo === 'admin'
  const esProfesor = Number(usuario.rol) === 1 || usuario.tipo === 'profesor'

  // Requiere admin y no lo es → dashboard del profesor
  if (requiredRole === 'admin' && !esAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  // Requiere profesor y es admin → panel admin
  if (requiredRole === 'profesor' && esAdmin) {
    return <Navigate to="/admin" replace />
  }

  // Si no coincide con ningún rol y la ruta requiere uno → login
  if (requiredRole && !esAdmin && !esProfesor) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

