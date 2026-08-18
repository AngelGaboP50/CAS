// src/components/AppShell.tsx
// Layout shell con Sidebar + Topbar para la vista del Profesor.
// Usa <Outlet /> de React Router para renderizar la página activa a la derecha.

import { useState, useEffect, useMemo } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useNotificaciones } from '../hooks/useNotificaciones'
import './AppShell.css'

interface NavItem {
  key: string
  label: string
  icon: string
  path: string
  badge?: number
}

function getUsuario() {
  try {
    const raw = sessionStorage.getItem('usuario')
    if (!raw) return null
    const user = JSON.parse(raw)
    if (user.rol === 1) user.tipo = 'profesor'
    if (user.rol === 2) user.tipo = 'admin'
    return user
  } catch { return null }
}

export default function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const usuario = useMemo(getUsuario, [])

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())

  const { noLeidas } = useNotificaciones(usuario?.id)

  // Reloj
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeStr = currentDate.toLocaleTimeString('es-MX', {
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  })
  const dateStr = currentDate.toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const navItems: NavItem[] = [
    { key: '/dashboard',    label: 'Inicio',          icon: 'home',            path: '/dashboard' },
    { key: '/salones',      label: 'Salones',          icon: 'meeting_room',    path: '/salones' },
    { key: '/mis-accesos',  label: 'Mis Accesos',      icon: 'lock',            path: '/mis-accesos' },
    { key: '/solicitudes',  label: 'Mis Solicitudes',  icon: 'pending_actions', path: '/solicitudes' },
    { key: '/notificaciones', label: 'Notificaciones', icon: 'notifications',   path: '/notificaciones', badge: noLeidas },
  ]

  const handleLogout = () => {
    sessionStorage.removeItem('usuario')
    navigate('/login', { replace: true })
  }

  const handleNav = (path: string) => {
    navigate(path)
    setSidebarOpen(false)
  }

  const currentItem = navItems.find(n => location.pathname.startsWith(n.key)) ?? navItems[0]

  if (!usuario) return null

  return (
    <div className="shell-root">
      {/* Glows decorativos */}
      <div className="shell-glow shell-glow-1" />
      <div className="shell-glow shell-glow-2" />

      {/* ── Overlay mobile ── */}
      <div
        className={`shell-overlay${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside className={`shell-sidebar${sidebarOpen ? ' open' : ''}`}>
        {/* Branding */}
        <div className="shell-brand">
          <div className="shell-brand-bar" />
          <div>
            <p className="shell-brand-name">Control de Acceso</p>
            <p className="shell-brand-sub">CAS · IDGS15</p>
          </div>
        </div>

        {/* Navegación */}
        <nav className="shell-nav">
          <span className="shell-nav-label">Menú</span>

          {navItems.map(item => (
            <button
              key={item.key}
              className={`shell-nav-item${location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path)) ? ' active' : ''}`}
              onClick={() => handleNav(item.path)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
              {item.badge && item.badge > 0
                ? <span className="shell-nav-badge">{item.badge}</span>
                : null
              }
            </button>
          ))}
        </nav>

        {/* Perfil */}
        <div className="shell-profile">
          <div className="shell-avatar">
            <span className="material-symbols-outlined">person</span>
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p className="shell-profile-name">{usuario.nombre}</p>
            <p className="shell-profile-role">Profesor</p>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="shell-main">
        {/* Topbar */}
        <header className="shell-topbar">
          {/* Hamburger (mobile) */}
          <button className="shell-hamburger" onClick={() => setSidebarOpen(v => !v)}>
            <span className="material-symbols-outlined">menu</span>
          </button>

          {/* Título de sección activa */}
          <h1 className="shell-section-title">{currentItem.label}</h1>

          {/* Reloj en vivo */}
          <div className="shell-live">
            <span className="shell-live-dot-wrap">
              <span className="shell-live-dot" />
              En vivo
            </span>
            <span>{timeStr}</span>
            <span style={{ opacity: .7 }}>{dateStr}</span>
          </div>

          {/* Acciones */}
          <div className="shell-topbar-actions">
            <button
              className="shell-icon-btn"
              title="Notificaciones"
              onClick={() => handleNav('/notificaciones')}
            >
              <span className="material-symbols-outlined">notifications</span>
              {noLeidas > 0 && <span className="shell-topbar-badge">{noLeidas}</span>}
            </button>

            <button className="shell-logout-btn" onClick={handleLogout}>
              <span className="material-symbols-outlined">logout</span>
              Cerrar sesión
            </button>
          </div>
        </header>

        {/* Contenido de la página */}
        <main className="shell-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
