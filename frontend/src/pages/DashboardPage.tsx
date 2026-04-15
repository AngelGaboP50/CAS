// src/pages/DashboardPage.tsx
// Horarios: solo lectura para el profesor. El administrador es quien asigna los horarios.

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scanner } from '@yudiel/react-qr-scanner'
import { supabase } from '../supabaseClient'
import { useNotificaciones, notificarAdmins } from '../hooks/useNotificaciones'
import { useAccesos } from '../hooks/useAccesos'
import { useAulas } from '../hooks/useAulas'
import { useHorarios } from '../hooks/useHorarios'
import './DashboardPage.css'

const BUCKET = 'files'
const HORARIOS_FOLDER = 'imagenes'

interface ResultadoQR {
  autorizado: boolean
  motivo: string
  salon: string
  materia: string | null
}

const DIAS_LABEL: Record<string, string> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
}

function DashboardPage() {
  const navigate = useNavigate()

  const usuarioRaw = sessionStorage.getItem('usuario')
  const usuario = useMemo(() => usuarioRaw ? JSON.parse(usuarioRaw) : null, [usuarioRaw])
  const userId = usuario?.id

  // ── Horario modal state ──
  const [modalOpen, setModalOpen] = useState(false)
  const [horarioUrl, setHorarioUrl] = useState<string | null>(null)
  const [loadingHorario, setLoadingHorario] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  // Vista: 'imagen' | 'tabla'
  const [vistaHorario, setVistaHorario] = useState<'imagen' | 'tabla'>('tabla')

  // ── QR modal state ──
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [qrResultado, setQrResultado] = useState<ResultadoQR | null>(null)
  const [validandoQr, setValidandoQr] = useState(false)

  // ── Reloj ──
  const [currentDate, setCurrentDate] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeStr = currentDate.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
  const dateStr = currentDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // ── Notificaciones ──
  const { noLeidas } = useNotificaciones(userId)

  // ── Hooks de datos ──
  const { registrarAcceso, validarAccesoQR } = useAccesos()
  const { aulas } = useAulas()

  // ── Horarios estructurados del profesor (asignados por el admin) ──
  const { horarios, loading: loadingHorarios, horarioHoy } = useHorarios(userId)

  useEffect(() => {
    if (!usuario) {
      navigate('/login', { replace: true })
    } else if (usuario.tipo === 'admin') {
      navigate('/admin', { replace: true })
    }
  }, [usuario, navigate])

  // ── Cargar imagen de horario (solo lectura, subida por el admin) ──
  const fetchHorario = useCallback(async () => {
    if (!userId) return
    setLoadingHorario(true)
    setErrorMsg(null)
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(`${HORARIOS_FOLDER}/${userId}`, { limit: 5 })
      if (error) throw error
      const archivo = data?.find(f => f.name.startsWith('horario.'))
      if (archivo) {
        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(`${HORARIOS_FOLDER}/${userId}/${archivo.name}`)
        setHorarioUrl(`${urlData.publicUrl}?t=${Date.now()}`)
      } else {
        setHorarioUrl(null)
      }
    } catch {
      setErrorMsg('No se pudo cargar el horario. Intenta de nuevo.')
    } finally {
      setLoadingHorario(false)
    }
  }, [userId])

  useEffect(() => { if (modalOpen) fetchHorario() }, [modalOpen, fetchHorario])

  const handleLogout = () => {
    sessionStorage.removeItem('usuario')
    navigate('/login', { replace: true })
  }

  // ── LÓGICA QR REAL: parsea el QR → valida horario ──
  const handleQRScan = async (rawValue: string) => {
    if (validandoQr || !usuario) return
    setValidandoQr(true)

    try {
      if (!rawValue.startsWith('SALON:')) {
        setQrResultado({
          autorizado: false,
          motivo: 'Código QR no válido para este sistema.',
          salon: 'Desconocido',
          materia: null,
        })
        return
      }

      const salonId = rawValue.replace('SALON:', '').trim()

      const { data: salonData } = await supabase
        .from('salones')
        .select('nombre')
        .eq('id', salonId)
        .single()

      const nombreSalon = salonData?.nombre ?? salonId

      const resultado = await validarAccesoQR(usuario.id, salonId)

      setQrResultado({
        autorizado: resultado.autorizado,
        motivo: resultado.motivo,
        salon: nombreSalon,
        materia: resultado.materia,
      })

      await registrarAcceso({
        salon_id: salonId,
        profesor_id: usuario.id,
        tipo: resultado.autorizado ? 'ENTRADA' : 'DENEGADO',
        metodo: 'QR',
        autorizado: resultado.autorizado,
        qr_data: rawValue,
        motivo_denegacion: resultado.autorizado ? undefined : resultado.motivo,
      })

      if (resultado.autorizado) {
        await supabase.from('salones').update({ estado: 'EN_CLASE', activo: true }).eq('id', salonId)
      }

      if (!resultado.autorizado) {
        await notificarAdmins(
          'Acceso Denegado',
          `El profesor ${usuario.nombre} intentó acceder al ${nombreSalon} y fue denegado: ${resultado.motivo}`,
          'alerta'
        )
      }
    } catch (err: any) {
      setQrResultado({
        autorizado: false,
        motivo: `Error del sistema: ${err.message}`,
        salon: 'Desconocido',
        materia: null,
      })
    } finally {
      setValidandoQr(false)
    }
  }

  const salonesLibres = aulas.filter(a => a.estado === 'LIBRE').length
  const hoy = horarioHoy()

  if (!usuario) return null

  return (
    <div className="dash-root">
      <div className="dash-glow dash-glow-1" />
      <div className="dash-glow dash-glow-2" />

      {/* Header */}
      <header className="dash-header">
        <div className="dash-brand">
          <div className="dash-brand-bar" />
          <h1 className="dash-brand-title" style={{ fontSize: '18px' }}>Control de Acceso</h1>
        </div>
        <div className="dash-live-info">
          <div className="live-indicator"><span className="live-dot" /><span>En vivo</span></div>
          <span className="live-time">{timeStr}</span>
          <span className="live-date">{dateStr}</span>
        </div>
        <div className="dash-header-actions">
          <button className="dash-icon-btn" title="Notificaciones" onClick={() => navigate('/notificaciones')}>
            <span className="material-symbols-outlined">notifications</span>
            {noLeidas > 0 && <span className="notif-badge">{noLeidas}</span>}
          </button>
          <button className="dash-logout-btn" onClick={handleLogout} style={{ marginLeft: '12px' }}>
            <span className="material-symbols-outlined">logout</span>Cerrar sesión
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="dash-main">
        <div className="dash-welcome">
          <div className="dash-welcome-icon"><span className="material-symbols-outlined">waving_hand</span></div>
          <div>
            <h2 className="dash-welcome-title">Bienvenido, {usuario.nombre}</h2>
            <p className="dash-welcome-sub">
              <span className="dash-badge">Profesor</span>
              {usuario.correo}
            </p>
          </div>
        </div>

        <div className="dash-cards">
          {/* Salones */}
          <div className="dash-card dash-card--clickable" onClick={() => navigate('/salones')}>
            <span className="material-symbols-outlined dash-card-icon">meeting_room</span>
            <h3 className="dash-card-title">Salones</h3>
            <p className="dash-card-desc">Consulta los salones disponibles y su estado actual.</p>
            <span className="dash-card-tag dash-card-tag--active">
              {salonesLibres} libre{salonesLibres !== 1 ? 's' : ''} ahora
            </span>
          </div>

          {/* Mis Horarios — solo lectura */}
          <div
            className="dash-card dash-card--clickable"
            onClick={() => { setErrorMsg(null); setModalOpen(true) }}
            id="card-mis-horarios"
          >
            <span className="material-symbols-outlined dash-card-icon">calendar_month</span>
            <h3 className="dash-card-title">Mis Horarios</h3>
            <p className="dash-card-desc">Consulta los horarios asignados por el administrador.</p>
            <span className={`dash-card-tag${hoy.length > 0 ? ' dash-card-tag--active' : ''}`}>
              {hoy.length > 0 ? `${hoy.length} clase${hoy.length > 1 ? 's' : ''} hoy` : 'Ver horario'}
            </span>
          </div>

          {/* Accesos */}
          <div className="dash-card dash-card--clickable" onClick={() => navigate('/mis-accesos')}>
            <span className="material-symbols-outlined dash-card-icon">lock</span>
            <h3 className="dash-card-title">Mis Accesos</h3>
            <p className="dash-card-desc">Revisa el historial de tus accesos registrados.</p>
            <span className="dash-card-tag dash-card-tag--active">Ver historial</span>
          </div>

          {/* Escanear QR */}
          <div className="dash-card dash-card--clickable" onClick={() => { setQrResultado(null); setQrModalOpen(true) }} id="card-nfc">
            <span className="material-symbols-outlined dash-card-icon">qr_code_scanner</span>
            <h3 className="dash-card-title">Escanear QR</h3>
            <p className="dash-card-desc">Escanea el código del salón para registrar tu acceso.</p>
            <span className="dash-card-tag">Abrir cámara</span>
          </div>

          {/* Mis Solicitudes */}
          <div className="dash-card dash-card--clickable" onClick={() => navigate('/solicitudes')}>
            <span className="material-symbols-outlined dash-card-icon">pending_actions</span>
            <h3 className="dash-card-title">Mis Solicitudes</h3>
            <p className="dash-card-desc">Solicita el uso de salones disponibles temporalmente.</p>
            <span className="dash-card-tag dash-card-tag--active">Ver solicitudes</span>
          </div>
        </div>
      </main>

      <footer className="dash-footer">
        <p>© 2026 IDGS15 Equipo 6. TODOS LOS DERECHOS RESERVADOS.</p>
      </footer>

      {/* ── Modal Horario (solo lectura) ── */}
      {modalOpen && (
        <div className="hor-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="hor-modal" style={{ maxWidth: '720px', width: '95%' }}>
            <div className="hor-modal-header">
              <div className="hor-modal-title-row">
                <span className="material-symbols-outlined hor-modal-icon">calendar_month</span>
                <h2 className="hor-modal-title">Mis Horarios</h2>
              </div>
              <button className="hor-close-btn" onClick={() => setModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Selector de vista */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                onClick={() => setVistaHorario('tabla')}
                style={{
                  padding: '8px 18px', borderRadius: '8px', border: '1px solid var(--color-outline-variant)',
                  background: vistaHorario === 'tabla' ? 'rgba(146,204,255,.15)' : 'transparent',
                  color: vistaHorario === 'tabla' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: vistaHorario === 'tabla' ? 600 : 400,
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>table_view</span>
                Horario semanal
              </button>
              <button
                onClick={() => { setVistaHorario('imagen'); fetchHorario() }}
                style={{
                  padding: '8px 18px', borderRadius: '8px', border: '1px solid var(--color-outline-variant)',
                  background: vistaHorario === 'imagen' ? 'rgba(146,204,255,.15)' : 'transparent',
                  color: vistaHorario === 'imagen' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: vistaHorario === 'imagen' ? 600 : 400,
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>image</span>
                Imagen de horario
              </button>
            </div>

            {errorMsg && (
              <div className="hor-error-banner">
                <span className="material-symbols-outlined">error</span>{errorMsg}
              </div>
            )}

            {/* Vista: tabla de horarios estructurados */}
            {vistaHorario === 'tabla' && (
              loadingHorarios ? (
                <div className="hor-loading-area">
                  <div className="hor-spinner" />
                  <p className="hor-loading-text">Cargando horario...</p>
                </div>
              ) : horarios.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
                        {['Día', 'Salón', 'Horario', 'Materia'].map(h => (
                          <th key={h} style={{ padding: '12px', color: 'var(--color-on-surface-variant)', fontWeight: 500, textAlign: 'left', fontSize: '13px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {horarios.map(h => (
                        <tr key={h.id} style={{ borderBottom: '1px solid rgba(63,72,80,.4)' }}>
                          <td style={{ padding: '12px', fontSize: '14px', fontWeight: 500 }}>{DIAS_LABEL[h.dia_semana] ?? h.dia_semana}</td>
                          <td style={{ padding: '12px', fontSize: '14px' }}>{h.salon?.nombre ?? h.salon_id}</td>
                          <td style={{ padding: '12px', fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>{h.hora_inicio} – {h.hora_fin}</td>
                          <td style={{ padding: '12px', fontSize: '14px' }}>{h.materia}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--color-on-surface-variant)', textAlign: 'center' }}>
                    Los horarios son asignados por el administrador. Si hay algún error, comunícate con él.
                  </p>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '12px' }}>event_busy</span>
                  <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '8px' }}>No tienes horarios asignados aún.</p>
                  <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>El administrador asignará tus horarios próximamente.</p>
                </div>
              )
            )}

            {/* Vista: imagen de horario */}
            {vistaHorario === 'imagen' && (
              loadingHorario ? (
                <div className="hor-loading-area">
                  <div className="hor-spinner" />
                  <p className="hor-loading-text">Cargando imagen...</p>
                </div>
              ) : horarioUrl ? (
                <div className="hor-preview-area">
                  <img src={horarioUrl} alt="Mi horario" className="hor-preview-img" />
                  <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--color-on-surface-variant)', textAlign: 'center' }}>
                    Imagen de horario asignada por el administrador.
                  </p>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '12px' }}>image_not_supported</span>
                  <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '8px' }}>No hay imagen de horario disponible.</p>
                  <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>El administrador puede subir una imagen de tu horario.</p>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ── Modal QR con validación real ── */}
      {qrModalOpen && (
        <div className="hor-overlay" onClick={e => e.target === e.currentTarget && setQrModalOpen(false)}>
          <div className="hor-modal">
            <div className="hor-modal-header">
              <div className="hor-modal-title-row">
                <span className="material-symbols-outlined hor-modal-icon">qr_code_scanner</span>
                <h2 className="hor-modal-title">Escanear Código QR</h2>
              </div>
              <button className="hor-close-btn" onClick={() => setQrModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="nfc-modal-body">
              {qrResultado ? (
                <div className="nfc-success-area">
                  <span className="material-symbols-outlined nfc-success-icon"
                    style={{ color: qrResultado.autorizado ? 'var(--color-secondary)' : '#ff6b7a' }}>
                    {qrResultado.autorizado ? 'check_circle' : 'cancel'}
                  </span>
                  <h3 className="nfc-success-title" style={{ color: qrResultado.autorizado ? 'var(--color-secondary)' : '#ff6b7a' }}>
                    {qrResultado.autorizado ? '¡Acceso Permitido!' : 'Acceso Denegado'}
                  </h3>
                  <p style={{ fontWeight: 600, marginBottom: '6px' }}>Salón: {qrResultado.salon}</p>
                  {qrResultado.materia && <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '6px' }}>Materia: {qrResultado.materia}</p>}
                  <p className="nfc-success-data">{qrResultado.motivo}</p>
                  <button className="nfc-scan-again-btn" onClick={() => setQrResultado(null)}>
                    Escanear otro código
                  </button>
                </div>
              ) : validandoQr ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="hor-spinner" style={{ margin: '0 auto 16px' }} />
                  <p style={{ color: 'var(--color-on-surface-variant)' }}>Validando acceso...</p>
                </div>
              ) : (
                <div className="nfc-scanner-container">
                  <p className="nfc-scanner-hint">Apunta tu cámara hacia el código QR del salón</p>
                  <div className="nfc-scanner-wrapper">
                    <Scanner
                      onScan={result => { if (result?.[0]?.rawValue) handleQRScan(result[0].rawValue) }}
                      onError={err => console.error(err)}
                    />
                  </div>
                  <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--color-on-surface-variant)', textAlign: 'center' }}>
                    El código QR de cada salón valida tu horario automáticamente.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage
