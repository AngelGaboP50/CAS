// src/pages/SolicitudesPage.tsx
// Profesores: ven sus solicitudes. Admins: ven todas y pueden aprobar/rechazar.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSolicitudes, type EstadoSolicitud } from '../hooks/useSolicitudes'
import './DashboardPage.css'

function getUsuario() {
  try { return JSON.parse(sessionStorage.getItem('usuario') ?? '') } catch { return null }
}

const ESTADO_COLOR: Record<EstadoSolicitud, string> = {
  PENDIENTE:  '#fbbf24',
  APROBADA:   'var(--color-secondary)',
  RECHAZADA:  '#ff6b7a',
  CANCELADA:  'var(--color-on-surface-variant)',
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function SolicitudesPage() {
  const navigate = useNavigate()
  const usuario = getUsuario()
  const esAdmin = usuario?.tipo === 'admin'

  const { solicitudes, loading, cancelarSolicitud, responderSolicitud } =
    useSolicitudes(esAdmin ? undefined : usuario?.id, esAdmin)

  const [modalRespuesta, setModalRespuesta] = useState<string | null>(null)
  const [respuesta, setRespuesta] = useState('')
  const [accionPendiente, setAccionPendiente] = useState<'APROBADA' | 'RECHAZADA' | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const confirmarRespuesta = async () => {
    if (!modalRespuesta || !accionPendiente || !usuario) return
    const solicitud = solicitudes.find(s => s.id === modalRespuesta)
    if (!solicitud) return

    setProcesando(true)
    setErrorMsg('')
    try {
      await responderSolicitud(modalRespuesta, usuario.id, accionPendiente, respuesta, solicitud)
      setModalRespuesta(null)
      setRespuesta('')
      setAccionPendiente(null)
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Error al responder')
    } finally {
      setProcesando(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '10px 14px', borderRadius: '8px',
    background: 'var(--color-bg)', border: '1px solid var(--color-outline-variant)',
    color: 'var(--color-on-surface)', outline: 'none',
    fontFamily: 'inherit', fontSize: '14px', width: '100%', boxSizing: 'border-box'
  }

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
            <span className="material-symbols-outlined">pending_actions</span>
          </div>
          <div>
            <h2 className="dash-welcome-title">
              {esAdmin ? 'Gestión de Solicitudes' : 'Mis Solicitudes'}
            </h2>
            <p className="dash-welcome-sub">
              {esAdmin
                ? 'Aprueba o rechaza solicitudes de uso temporal de salones.'
                : 'Estado de tus solicitudes de salones enviadas al administrador.'}
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-on-surface-variant)' }}>
            <div className="hor-spinner" style={{ margin: '0 auto 16px' }} />
            <p>Cargando solicitudes...</p>
          </div>
        ) : solicitudes.length === 0 ? (
          <div className="dash-card" style={{ textAlign: 'center', padding: '60px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-on-surface-variant)', marginBottom: '16px', display: 'block' }}>inbox</span>
            <p style={{ color: 'var(--color-on-surface-variant)' }}>No hay solicitudes registradas.</p>
            {!esAdmin && (
              <button className="dash-logout-btn" style={{ margin: '20px auto 0', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                onClick={() => navigate('/salones')}>
                <span className="material-symbols-outlined">add</span> Solicitar un salón
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {solicitudes.map(sol => (
              <div className="dash-card" key={sol.id} style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '22px' }}>meeting_room</span>
                      <span style={{ fontWeight: 600, fontSize: '16px' }}>
                        {sol.salon?.nombre ?? sol.salon_id}
                      </span>
                      {esAdmin && (
                        <span style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                          — {sol.profesor?.nombre}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                      <span><span className="material-symbols-outlined" style={{ fontSize: '15px', verticalAlign: 'middle' }}>calendar_today</span> {formatFecha(sol.fecha)}</span>
                      <span><span className="material-symbols-outlined" style={{ fontSize: '15px', verticalAlign: 'middle' }}>schedule</span> {sol.hora_inicio} – {sol.hora_fin}</span>
                      <span><span className="material-symbols-outlined" style={{ fontSize: '15px', verticalAlign: 'middle' }}>send</span> Enviada {formatFecha(sol.created_at)}</span>
                    </div>

                    <p style={{ marginTop: '10px', fontSize: '14px', color: 'var(--color-on-surface)' }}>
                      <strong>Motivo:</strong> {sol.motivo}
                    </p>

                    {sol.respuesta && (
                      <p style={{ marginTop: '6px', fontSize: '13px', color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>
                        <strong>Respuesta admin:</strong> {sol.respuesta}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                    <span style={{
                      padding: '5px 14px', borderRadius: '14px', fontSize: '12px', fontWeight: 600,
                      background: `${ESTADO_COLOR[sol.estado]}22`,
                      color: ESTADO_COLOR[sol.estado],
                      border: `1px solid ${ESTADO_COLOR[sol.estado]}55`,
                    }}>
                      {sol.estado}
                    </span>

                    {/* Acciones para admins */}
                    {esAdmin && sol.estado === 'PENDIENTE' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="dash-logout-btn"
                          style={{ borderColor: 'var(--color-secondary)', color: 'var(--color-secondary)', fontSize: '13px', padding: '6px 14px' }}
                          onClick={() => { setModalRespuesta(sol.id); setAccionPendiente('APROBADA'); setRespuesta('') }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span> Aprobar
                        </button>
                        <button className="dash-logout-btn"
                          style={{ borderColor: '#ff6b7a', color: '#ff6b7a', fontSize: '13px', padding: '6px 14px' }}
                          onClick={() => { setModalRespuesta(sol.id); setAccionPendiente('RECHAZADA'); setRespuesta('') }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span> Rechazar
                        </button>
                      </div>
                    )}

                    {/* Cancelar para profesor */}
                    {!esAdmin && sol.estado === 'PENDIENTE' && (
                      <button className="dash-logout-btn"
                        style={{ borderColor: 'var(--color-outline-variant)', fontSize: '13px' }}
                        onClick={() => cancelarSolicitud(sol.id)}>
                        Cancelar solicitud
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="dash-footer">
        <p>© 2026 IDGS15 Equipo 6. TODOS LOS DERECHOS RESERVADOS.</p>
      </footer>

      {/* Modal de respuesta admin */}
      {modalRespuesta && accionPendiente && (
        <div className="hor-overlay" onClick={e => e.target === e.currentTarget && setModalRespuesta(null)}>
          <div className="hor-modal">
            <div className="hor-modal-header">
              <div className="hor-modal-title-row">
                <span className="material-symbols-outlined hor-modal-icon"
                  style={{ color: accionPendiente === 'APROBADA' ? 'var(--color-secondary)' : '#ff6b7a' }}>
                  {accionPendiente === 'APROBADA' ? 'check_circle' : 'cancel'}
                </span>
                <h2 className="hor-modal-title">
                  {accionPendiente === 'APROBADA' ? 'Aprobar solicitud' : 'Rechazar solicitud'}
                </h2>
              </div>
              <button className="hor-close-btn" onClick={() => setModalRespuesta(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {errorMsg && (
              <div className="hor-error-banner">
                <span className="material-symbols-outlined">error</span> {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>
                Mensaje para el profesor (opcional)
              </label>
              <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }}
                placeholder="Ej: Aprobado, recuerda dejar el salón en orden."
                value={respuesta}
                onChange={e => setRespuesta(e.target.value)} />

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button className="hor-cancel-btn" onClick={() => setModalRespuesta(null)} disabled={procesando}>
                  Cancelar
                </button>
                <button className="dash-logout-btn" disabled={procesando}
                  style={{
                    borderColor: accionPendiente === 'APROBADA' ? 'var(--color-secondary)' : '#ff6b7a',
                    color:       accionPendiente === 'APROBADA' ? 'var(--color-secondary)' : '#ff6b7a',
                    background:  accionPendiente === 'APROBADA' ? 'rgba(74,225,131,.1)' : 'rgba(255,107,122,.1)',
                  }}
                  onClick={confirmarRespuesta}>
                  {procesando
                    ? <><div className="hor-btn-spinner" />Procesando...</>
                    : <><span className="material-symbols-outlined">send</span>Confirmar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
