// src/pages/HistorialAccesosPage.tsx
// Historial de accesos: profesores ven el suyo, admins ven todos

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccesos, type Acceso } from '../hooks/useAccesos'
import './DashboardPage.css'

function getUsuario() {
  try { return JSON.parse(sessionStorage.getItem('usuario') ?? '') } catch { return null }
}

const TIPO_ICON: Record<Acceso['tipo'], string> = {
  ENTRADA:   'login',
  SALIDA:    'logout',
  DENEGADO:  'block',
  EXCEPCION: 'warning',
}
const TIPO_COLOR: Record<Acceso['tipo'], string> = {
  ENTRADA:   'var(--color-secondary)',
  SALIDA:    'var(--color-primary)',
  DENEGADO:  '#ff6b7a',
  EXCEPCION: '#fbbf24',
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default function HistorialAccesosPage() {
  const navigate = useNavigate()
  const usuario = getUsuario()
  const esAdmin = usuario?.tipo === 'admin'

  // Admins ven todos, profesores solo los suyos
  const { accesos, loading } = useAccesos(esAdmin ? undefined : usuario?.id)

  const [filtroTipo, setFiltroTipo] = useState<Acceso['tipo'] | 'TODOS'>('TODOS')
  const [busqueda, setBusqueda] = useState('')

  const accesosFiltrados = useMemo(() => {
    return accesos.filter(a => {
      const cumpleTipo = filtroTipo === 'TODOS' || a.tipo === filtroTipo
      const cumpleBusqueda = !busqueda ||
        a.salon?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        a.profesor?.nombre?.toLowerCase().includes(busqueda.toLowerCase())
      return cumpleTipo && cumpleBusqueda
    })
  }, [accesos, filtroTipo, busqueda])

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
          <button className="dash-logout-btn" onClick={() => navigate(esAdmin ? '/admin' : '/dashboard')}>
            <span className="material-symbols-outlined">arrow_back</span> Volver
          </button>
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-welcome">
          <div className="dash-welcome-icon">
            <span className="material-symbols-outlined">history</span>
          </div>
          <div>
            <h2 className="dash-welcome-title">Historial de Accesos</h2>
            <p className="dash-welcome-sub">
              {esAdmin ? 'Registro completo de todos los accesos al edificio.' : 'Tus registros de entrada y salida a los salones.'}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'center' }}>
          {(['TODOS', 'ENTRADA', 'SALIDA', 'DENEGADO', 'EXCEPCION'] as const).map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)}
              style={{
                padding: '7px 16px', borderRadius: '20px', border: '1px solid', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit',
                borderColor: filtroTipo === t ? 'var(--color-primary)' : 'var(--color-outline-variant)',
                background: filtroTipo === t ? 'rgba(146,204,255,.15)' : 'transparent',
                color: filtroTipo === t ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
              }}>
              {t === 'TODOS' ? 'Todos' : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}

          {esAdmin && (
            <input
              type="text"
              placeholder="Buscar por salón o profesor..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{
                marginLeft: 'auto', padding: '8px 14px', borderRadius: '8px',
                background: 'var(--color-bg)', border: '1px solid var(--color-outline-variant)',
                color: 'var(--color-on-surface)', outline: 'none', fontFamily: 'inherit', fontSize: '14px', minWidth: '240px'
              }}
            />
          )}
        </div>

        {/* Tabla */}
        <div className="dash-card" style={{ padding: '0', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-on-surface-variant)' }}>
              <div className="hor-spinner" style={{ margin: '0 auto 16px' }} />
              <p>Cargando historial...</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-outline-variant)', background: 'rgba(255,255,255,.02)' }}>
                    <th style={{ padding: '14px 18px', textAlign: 'left', color: 'var(--color-on-surface-variant)', fontWeight: 500, fontSize: '13px' }}>Tipo</th>
                    {esAdmin && <th style={{ padding: '14px 18px', textAlign: 'left', color: 'var(--color-on-surface-variant)', fontWeight: 500, fontSize: '13px' }}>Profesor</th>}
                    <th style={{ padding: '14px 18px', textAlign: 'left', color: 'var(--color-on-surface-variant)', fontWeight: 500, fontSize: '13px' }}>Salón</th>
                    <th style={{ padding: '14px 18px', textAlign: 'left', color: 'var(--color-on-surface-variant)', fontWeight: 500, fontSize: '13px' }}>Método</th>
                    <th style={{ padding: '14px 18px', textAlign: 'left', color: 'var(--color-on-surface-variant)', fontWeight: 500, fontSize: '13px' }}>Fecha y Hora</th>
                    <th style={{ padding: '14px 18px', textAlign: 'left', color: 'var(--color-on-surface-variant)', fontWeight: 500, fontSize: '13px' }}>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {accesosFiltrados.map(acceso => (
                    <tr key={acceso.id} style={{ borderBottom: '1px solid rgba(63,72,80,.4)', transition: 'background .15s' }}
                      onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                      onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="material-symbols-outlined" style={{ color: TIPO_COLOR[acceso.tipo], fontSize: '20px' }}>
                            {TIPO_ICON[acceso.tipo]}
                          </span>
                          <span style={{ color: TIPO_COLOR[acceso.tipo], fontWeight: 500, fontSize: '13px' }}>
                            {acceso.tipo}
                          </span>
                        </div>
                      </td>

                      {esAdmin && (
                        <td style={{ padding: '14px 18px', fontSize: '14px' }}>
                          {acceso.profesor?.nombre ?? '—'}
                        </td>
                      )}

                      <td style={{ padding: '14px 18px', fontSize: '14px' }}>
                        {acceso.salon?.nombre ?? '—'}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '10px', fontSize: '12px',
                          background: acceso.metodo === 'QR' ? 'rgba(146,204,255,.1)' : 'rgba(255,255,255,.06)',
                          color: acceso.metodo === 'QR' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                        }}>
                          {acceso.metodo}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                        {formatFecha(acceso.created_at)}
                      </td>

                      <td style={{ padding: '14px 18px', fontSize: '13px', color: 'var(--color-on-surface-variant)', maxWidth: '200px' }}>
                        {acceso.motivo_denegacion ?? (acceso.autorizado ? 'Acceso permitido' : '—')}
                      </td>
                    </tr>
                  ))}

                  {accesosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={esAdmin ? 6 : 5} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
                        No hay registros de acceso.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <footer className="dash-footer">
        <p>© 2026 IDGS15 Equipo 6. TODOS LOS DERECHOS RESERVADOS.</p>
      </footer>
    </div>
  )
}
