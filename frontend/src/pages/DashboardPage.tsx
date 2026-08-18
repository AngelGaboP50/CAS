// src/pages/DashboardPage.tsx
// Vista Home del profesor dentro del AppShell.
// Solo renderiza el contenido interno; el layout (sidebar, topbar) lo provee AppShell.

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scanner } from '@yudiel/react-qr-scanner'

import { notificarAdmins } from '../hooks/useNotificaciones'
import { useAccesos } from '../hooks/useAccesos'
import { useAulas } from '../hooks/useAulas'
import { useHorarios } from '../hooks/useHorarios'
import './DashboardPage.css'

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
  const [horarioEstado, setHorarioEstado] = useState<'pendiente' | 'autorizado' | 'rechazado' | null>(null)
  const [loadingHorario, setLoadingHorario] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [vistaHorario, setVistaHorario] = useState<'imagen' | 'tabla'>('tabla')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── QR modal state ──
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [qrResultado, setQrResultado] = useState<ResultadoQR | null>(null)
  const [validandoQr, setValidandoQr] = useState(false)

  // ── Hooks de datos ──
  const { registrarAcceso, validarAccesoQR } = useAccesos()
  const { aulas } = useAulas()
  const { horarios, loading: loadingHorarios, horarioHoy } = useHorarios(userId)

  // ── Cargar imagen de horario ──
  const fetchHorario = useCallback(async () => {
    if (!userId) return
    setLoadingHorario(true)
    setErrorMsg(null)
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const res = await fetch(`${API}/api/horarios/mi-horario?usuario_id=${userId}`)
      const data = await res.json()
      if (data.horario) {
        const fullUrl = data.horario.imagen_url.startsWith('http')
          ? data.horario.imagen_url
          : `${API}${data.horario.imagen_url}`
        setHorarioUrl(fullUrl)
        setHorarioEstado(data.horario.estado)
      } else {
        setHorarioUrl(null)
        setHorarioEstado(null)
      }
    } catch {
      setErrorMsg('No se pudo cargar el horario. Intenta de nuevo.')
    } finally {
      setLoadingHorario(false)
    }
  }, [userId])

  useEffect(() => {
    fetchHorario()
  }, [fetchHorario])

  // ── Subir imagen de horario ──
  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Solo se permiten imágenes PNG o JPG.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('El archivo no puede superar los 10 MB.')
      return
    }
    setErrorMsg(null)
    setUploading(true)
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const formData = new FormData()
      formData.append('imagen', file)
      formData.append('usuario_id', String(usuario.id))

      const res = await fetch(`${API}/api/horarios/upload`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al subir el horario')
      }

      await fetchHorario()
      await notificarAdmins(
        'Horario Pendiente de Revisión',
        `El profesor ${usuario.nombre} ha subido su horario y está esperando autorización.`,
        'info'
      )
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al subir el archivo.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }

  // ── Eliminar imagen de horario ──
  const handleDeleteHorario = async () => {
    if (!userId) return
    setDeleting(true)
    setErrorMsg(null)
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const resGet = await fetch(`${API}/api/horarios/mi-horario?usuario_id=${userId}`)
      const dataGet = await resGet.json()
      if (dataGet.horario?.id) {
        await fetch(`${API}/api/horarios/${dataGet.horario.id}`, { method: 'DELETE' })
      }
      setHorarioUrl(null)
      setHorarioEstado(null)
      setDeleteConfirm(false)
      await notificarAdmins(
        'Horario Eliminado',
        `El profesor ${usuario.nombre} ha eliminado su archivo de horario.`,
        'alerta'
      )
    } catch {
      setErrorMsg('Error al eliminar el horario. Intenta de nuevo.')
    } finally {
      setDeleting(false)
    }
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

      // TODO: API
      const nombreSalon = salonId

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
        // TODO: API actualizar
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
    <>
      {/* Bienvenida */}
      <div className="dash-welcome" style={{ marginBottom: '32px' }}>
        <div className="dash-welcome-icon"><span className="material-symbols-outlined">waving_hand</span></div>
        <div>
          <h2 className="dash-welcome-title">Bienvenido, {usuario.nombre}</h2>
          <p className="dash-welcome-sub">
            <span className="dash-badge">Profesor</span>
            {usuario.correo}
          </p>
        </div>
      </div>

      {/* Cards de acceso rápido */}
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

          {/* Mis Horarios */}
          <div
            className="dash-card dash-card--clickable"
            onClick={() => { setErrorMsg(null); setDeleteConfirm(false); setModalOpen(true) }}
            id="card-mis-horarios"
          >
            <span className="material-symbols-outlined dash-card-icon">calendar_month</span>
            <h3 className="dash-card-title">Mis Horarios</h3>
            <p className="dash-card-desc">Consulta los horarios asignados por el administrador.</p>
            <span className={`dash-card-tag${
              horarioEstado === 'pendiente' ? ' dash-card-tag--pending' :
              horarioEstado === 'autorizado' ? ' dash-card-tag--active' :
              horarioEstado === 'rechazado' ? ' dash-card-tag--rejected' :
              hoy.length > 0 ? ' dash-card-tag--active' : ''
            }`}>
              {horarioEstado === 'pendiente' ? '⏳ Pendiente de aprobación' :
               horarioEstado === 'autorizado' ? '✅ Autorizado' :
               horarioEstado === 'rechazado' ? '❌ Rechazado' :
               hoy.length > 0 ? `${hoy.length} clase${hoy.length > 1 ? 's' : ''} hoy` : 'Ver horario'}
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
                  {/* Badge de estado */}
                  <div className="hor-status-row">
                    {horarioEstado === 'pendiente' && (
                      <span className="hor-status-badge hor-status-badge--pending">
                        <span className="material-symbols-outlined">pending</span>
                        Pendiente de aprobación
                      </span>
                    )}
                    {horarioEstado === 'autorizado' && (
                      <span className="hor-status-badge hor-status-badge--authorized">
                        <span className="material-symbols-outlined">check_circle</span>
                        Autorizado
                      </span>
                    )}
                    {horarioEstado === 'rechazado' && (
                      <span className="hor-status-badge hor-status-badge--rejected">
                        <span className="material-symbols-outlined">cancel</span>
                        Rechazado
                      </span>
                    )}
                  </div>

                  <img src={horarioUrl} alt="Mi horario" className="hor-preview-img" />

                  {/* Aviso según estado */}
                  {horarioEstado === 'pendiente' && (
                    <div className="hor-pending-notice">
                      <span className="material-symbols-outlined">info</span>
                      <span>Tu horario está siendo revisado por el administrador. Recibirás una notificación cuando sea autorizado.</span>
                    </div>
                  )}
                  {horarioEstado === 'rechazado' && (
                    <div className="hor-rejected-notice">
                      <span className="material-symbols-outlined">error</span>
                      <span>Tu horario fue rechazado. Elimínalo y sube uno nuevo.</span>
                    </div>
                  )}

                  {/* Acciones */}
                  {!deleteConfirm ? (
                    <div className="hor-actions">
                      <p className="hor-hint">
                        {horarioEstado === 'pendiente'
                          ? 'En revisión. Puedes reemplazarlo subiendo uno nuevo.'
                          : 'Para subir un nuevo horario, primero elimina el actual.'}
                      </p>
                      <button
                        className="hor-delete-btn"
                        onClick={() => setDeleteConfirm(true)}
                        id="btn-eliminar-horario"
                      >
                        <span className="material-symbols-outlined">delete</span>
                        Eliminar horario
                      </button>
                    </div>
                  ) : (
                    <div className="hor-confirm-area">
                      <p className="hor-confirm-text">¿Estás seguro de que deseas eliminar tu horario? Esta acción no se puede deshacer.</p>
                      <div className="hor-confirm-btns">
                        <button
                          className="hor-cancel-btn"
                          onClick={() => setDeleteConfirm(false)}
                          disabled={deleting}
                        >
                          Cancelar
                        </button>
                        <button
                          className="hor-confirm-delete-btn"
                          onClick={handleDeleteHorario}
                          disabled={deleting}
                        >
                          {deleting
                            ? <><div className="hor-btn-spinner" />Eliminando...</>
                            : <><span className="material-symbols-outlined">delete_forever</span>Sí, eliminar</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Sin horario: zona de subida ── */
                <div className="hor-upload-area">
                  <div
                    className={`hor-drop-zone${dragOver ? ' hor-drop-zone--active' : ''}${uploading ? ' hor-drop-zone--uploading' : ''}`}
                    onDragOver={e => { e.preventDefault(); if (!uploading) setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    id="drop-zone-horario"
                  >
                    {uploading ? (
                      <>
                        <div className="hor-spinner" />
                        <p className="hor-drop-title">Subiendo horario...</p>
                        <p className="hor-drop-sub">Por favor espera</p>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined hor-upload-icon">upload_file</span>
                        <p className="hor-drop-title">Arrastra tu horario aquí</p>
                        <p className="hor-drop-sub">o haz clic para seleccionar un archivo</p>
                        <span className="hor-format-tag">PNG · JPG · JPEG · máx. 10 MB</span>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
                    id="input-file-horario"
                  />
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
    </>
  )
}

export default DashboardPage
