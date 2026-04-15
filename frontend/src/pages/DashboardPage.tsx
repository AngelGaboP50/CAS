// src/pages/DashboardPage.tsx — REEMPLAZA el archivo actual completo
// Agrega: validación real de QR, links a salones y accesos, mejoras de navegación

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scanner } from '@yudiel/react-qr-scanner'
import { supabase } from '../supabaseClient'
import { useNotificaciones, notificarAdmins } from '../hooks/useNotificaciones'
import { useAccesos } from '../hooks/useAccesos'
import { useAulas } from '../hooks/useAulas'
import './DashboardPage.css'

const BUCKET = 'files'
const HORARIOS_FOLDER = 'imagenes'

interface ResultadoQR {
  autorizado: boolean
  motivo: string
  salon: string
  materia: string | null
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
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (!usuario) {
      navigate('/login', { replace: true })
    } else if (usuario.tipo === 'admin') {
      navigate('/admin', { replace: true })
    }
  }, [usuario, navigate])

  // ── Cargar horario ──
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

  // ── Subir horario ──
  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) { setErrorMsg('Solo se permiten imágenes PNG o JPG.'); return }
    if (file.size > 10 * 1024 * 1024) { setErrorMsg('El archivo no puede superar los 10 MB.'); return }
    setErrorMsg(null); setUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${HORARIOS_FOLDER}/${usuario.id}/horario.${ext}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      await fetchHorario()
      await notificarAdmins('Horario Actualizado', `El profesor ${usuario.nombre} ha subido su archivo de horario.`, 'info')
    } catch {
      setErrorMsg('Error al subir el archivo. Verifica los permisos del bucket.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) handleFileSelect(file)
  }
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]; if (file) handleFileSelect(file)
  }

  // ── Eliminar horario ──
  const handleDeleteHorario = async () => {
    if (!horarioUrl) return
    setDeleting(true); setErrorMsg(null)
    try {
      const { data, error: listErr } = await supabase.storage.from(BUCKET).list(`${HORARIOS_FOLDER}/${usuario.id}`)
      if (listErr) throw listErr
      const paths = (data ?? []).map(f => `${HORARIOS_FOLDER}/${usuario.id}/${f.name}`)
      if (paths.length > 0) {
        const { error: removeErr } = await supabase.storage.from(BUCKET).remove(paths)
        if (removeErr) throw removeErr
      }
      setHorarioUrl(null); setDeleteConfirm(false)
      await notificarAdmins('Horario Eliminado', `El profesor ${usuario.nombre} ha eliminado su archivo de horario.`, 'alerta')
    } catch {
      setErrorMsg('Error al eliminar el horario. Intenta de nuevo.')
    } finally {
      setDeleting(false)
    }
  }

  // ── LÓGICA QR REAL: parsea el QR → valida horario ──
  // El QR del salón debe tener el formato: "SALON:<salon_uuid>"
  const handleQRScan = async (rawValue: string) => {
    if (validandoQr || !usuario) return
    setValidandoQr(true)

    try {
      // El QR de cada cerradura debe tener este formato
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

      // Obtener nombre del salón
      const { data: salonData } = await supabase
        .from('salones')
        .select('nombre')
        .eq('id', salonId)
        .single()

      const nombreSalon = salonData?.nombre ?? salonId

      // Llamar función SQL de validación
      const resultado = await validarAccesoQR(usuario.id, salonId)

      setQrResultado({
        autorizado: resultado.autorizado,
        motivo: resultado.motivo,
        salon: nombreSalon,
        materia: resultado.materia,
      })

      // Registrar el acceso en la BD
      await registrarAcceso({
        salon_id: salonId,
        profesor_id: usuario.id,
        tipo: resultado.autorizado ? 'ENTRADA' : 'DENEGADO',
        metodo: 'QR',
        autorizado: resultado.autorizado,
        qr_data: rawValue,
        motivo_denegacion: resultado.autorizado ? undefined : resultado.motivo,
      })

      // Actualizar estado del salón si fue permitido
      if (resultado.autorizado) {
        await supabase.from('salones').update({ estado: 'EN_CLASE', activo: true }).eq('id', salonId)
      }

      // Notificar al admin si fue denegado
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

          {/* Mis Horarios */}
          <div className="dash-card dash-card--clickable" onClick={() => { setDeleteConfirm(false); setErrorMsg(null); setModalOpen(true) }} id="card-mis-horarios">
            <span className="material-symbols-outlined dash-card-icon">calendar_month</span>
            <h3 className="dash-card-title">Mis Horarios</h3>
            <p className="dash-card-desc">Visualiza tus horarios asignados por salón y día.</p>
            <span className={`dash-card-tag${horarioUrl ? ' dash-card-tag--active' : ''}`}>
              {horarioUrl ? 'Ver horario' : 'Subir horario'}
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

      {/* ── Modal Horario (sin cambios respecto al original) ── */}
      {modalOpen && (
        <div className="hor-overlay" onClick={e => e.target === e.currentTarget && !uploading && !deleting && setModalOpen(false)}>
          <div className="hor-modal">
            <div className="hor-modal-header">
              <div className="hor-modal-title-row">
                <span className="material-symbols-outlined hor-modal-icon">calendar_month</span>
                <h2 className="hor-modal-title">Mis Horarios</h2>
              </div>
              <button className="hor-close-btn" onClick={() => !uploading && !deleting && setModalOpen(false)} disabled={uploading || deleting}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {errorMsg && <div className="hor-error-banner"><span className="material-symbols-outlined">error</span>{errorMsg}</div>}
            {loadingHorario ? (
              <div className="hor-loading-area"><div className="hor-spinner" /><p className="hor-loading-text">Cargando horario...</p></div>
            ) : horarioUrl ? (
              <div className="hor-preview-area">
                <img src={horarioUrl} alt="Mi horario" className="hor-preview-img" />
                {!deleteConfirm ? (
                  <div className="hor-actions">
                    <p className="hor-hint">Para subir un nuevo horario, primero elimina el actual.</p>
                    <button className="hor-delete-btn" onClick={() => setDeleteConfirm(true)}>
                      <span className="material-symbols-outlined">delete</span>Eliminar horario
                    </button>
                  </div>
                ) : (
                  <div className="hor-confirm-area">
                    <p className="hor-confirm-text">¿Estás seguro? Esta acción no se puede deshacer.</p>
                    <div className="hor-confirm-btns">
                      <button className="hor-cancel-btn" onClick={() => setDeleteConfirm(false)} disabled={deleting}>Cancelar</button>
                      <button className="hor-confirm-delete-btn" onClick={handleDeleteHorario} disabled={deleting}>
                        {deleting ? <><div className="hor-btn-spinner" />Eliminando...</> : <><span className="material-symbols-outlined">delete_forever</span>Sí, eliminar</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hor-upload-area">
                <div
                  className={`hor-drop-zone${dragOver ? ' hor-drop-zone--active' : ''}${uploading ? ' hor-drop-zone--uploading' : ''}`}
                  onDragOver={e => { e.preventDefault(); if (!uploading) setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => !uploading && fileInputRef.current?.click()}>
                  {uploading ? (
                    <><div className="hor-spinner" /><p className="hor-drop-title">Subiendo horario...</p><p className="hor-drop-sub">Por favor espera</p></>
                  ) : (
                    <><span className="material-symbols-outlined hor-upload-icon">upload_file</span>
                    <p className="hor-drop-title">Arrastra tu horario aquí</p>
                    <p className="hor-drop-sub">o haz clic para seleccionar un archivo</p>
                    <span className="hor-format-tag">PNG · JPG · JPEG · máx. 10 MB</span></>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={handleInputChange} />
              </div>
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
