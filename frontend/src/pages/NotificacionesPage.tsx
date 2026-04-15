// src/pages/NotificacionesPage.tsx
// Panel completo de notificaciones con listado y marcado como leído

import { useNavigate } from 'react-router-dom'
import { useNotificaciones } from '../hooks/useNotificaciones'
import './DashboardPage.css'

function getUsuario() {
  try { return JSON.parse(sessionStorage.getItem('usuario') ?? '') } catch { return null }
}

const TIPO_ICON: Record<string, string> = {
  info:      'info',
  alerta:    'warning',
  excepcion: 'priority_high',
}
const TIPO_COLOR: Record<string, string> = {
  info:      'var(--color-primary)',
  alerta:    '#fbbf24',
  excepcion: '#ff6b7a',
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default function NotificacionesPage() {
  const navigate = useNavigate()
  const usuario = getUsuario()
  const esAdmin = usuario?.tipo === 'admin'
  const { notificaciones, noLeidas, marcarComoLeidas } = useNotificaciones(usuario?.id)

  return (
    <div className="dash-root">
      <div className="dash-glow dash-glow-1" />
      <div className="dash-glow dash-glow-2" />

      <header className="dash-header">
        <div className="dash-brand">
          <div className="dash-brand-bar" />
          <h1 className="dash-brand-title" style={{ fontSize: '18px' }}>Control de Acceso</h1>
        </div>
        <div className="dash-header-actions">
          {noLeidas > 0 && (
            <button className="dash-logout-btn"
              style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
              onClick={marcarComoLeidas}>
              <span className="material-symbols-outlined">done_all</span>
              Marcar todas como leídas
            </button>
          )}
          <button className="dash-logout-btn" onClick={() => navigate(esAdmin ? '/admin' : '/dashboard')}
            style={{ marginLeft: '8px' }}>
            <span className="material-symbols-outlined">arrow_back</span> Volver
          </button>
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-welcome">
          <div className="dash-welcome-icon">
            <span className="material-symbols-outlined">notifications</span>
          </div>
          <div>
            <h2 className="dash-welcome-title">Notificaciones</h2>
            <p className="dash-welcome-sub">
              {noLeidas > 0 ? `Tienes ${noLeidas} notificación${noLeidas > 1 ? 'es' : ''} sin leer.` : 'Todo al día.'}
            </p>
          </div>
        </div>

        {notificaciones.length === 0 ? (
          <div className="dash-card" style={{ textAlign: 'center', padding: '60px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '16px' }}>
              notifications_off
            </span>
            <p style={{ color: 'var(--color-on-surface-variant)' }}>No tienes notificaciones aún.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {notificaciones.map(n => (
              <div key={n.id} className="dash-card"
                onClick={() => {
                  if (n.titulo.includes('solicitud') || n.titulo.includes('Solicitud')) {
                    navigate(esAdmin ? '/admin' : '/solicitudes', { state: { tab: 'solicitudes' } })
                  }
                }}
                style={{
                  padding: '18px 22px',
                  opacity: n.leida ? 0.65 : 1,
                  borderColor: n.leida ? 'var(--color-outline-variant)' : TIPO_COLOR[n.tipo] ?? 'var(--color-primary)',
                  transition: 'opacity .2s',
                  cursor: 'pointer'
                }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <span className="material-symbols-outlined"
                    style={{ color: TIPO_COLOR[n.tipo] ?? 'var(--color-primary)', fontSize: '24px', marginTop: '2px' }}>
                    {TIPO_ICON[n.tipo] ?? 'notifications'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '15px' }}>{n.titulo}</span>
                      <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                        {formatFecha(n.created_at)}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>
                      {n.mensaje}
                    </p>
                  </div>
                  {!n.leida && (
                    <span style={{
                      width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                      background: TIPO_COLOR[n.tipo] ?? 'var(--color-primary)', marginTop: '6px'
                    }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="dash-footer">
        <p>© 2026 IDGS15 Equipo 6. TODOS LOS DERECHOS RESERVADOS.</p>
      </footer>
    </div>
  )
}
