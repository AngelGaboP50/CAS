// src/guards/ProtectedRoute.tsx
// Protege rutas: redirige al login si no hay sesión activa.
// También valida el rol: si se requiere 'admin' y el usuario es 'profesor', redirige.

import { Navigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'profesor'
}

function getUsuario() {
  try {
    const raw = sessionStorage.getItem('usuario')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const usuario = getUsuario()

  // Sin sesión → login
  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  // Requiere admin y no lo es → dashboard del profesor
  if (requiredRole === 'admin' && usuario.tipo !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  // Requiere profesor y es admin → panel admin
  if (requiredRole === 'profesor' && usuario.tipo === 'admin') {
    return <Navigate to="/admin" replace />
  }

  return <>{children}</>
}

