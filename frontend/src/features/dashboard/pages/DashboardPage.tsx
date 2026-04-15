import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scanner } from '@yudiel/react-qr-scanner'
import { supabase } from '../../../core/config/supabaseClient'
import { useNotificaciones, notificarAdmins } from '../../notificaciones/hooks/useNotificaciones'
import '../../../shared/styles/DashboardPage.css'

const BUCKET = 'files'
const HORARIOS_FOLDER = 'imagenes'

function DashboardPage() {
  const navigate = useNavigate()

  const usuarioRaw = sessionStorage.getItem('usuario')
  const usuario = useMemo(() => usuarioRaw ? JSON.parse(usuarioRaw) : null, [usuarioRaw])
  const userId = usuario?.id

  // ── Horario modal state ──────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [horarioUrl, setHorarioUrl] = useState<string | null>(null)
  const [loadingHorario, setLoadingHorario] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── NFC / QR modal state ─────────────────────────────────────────
  const [nfcModalOpen, setNfcModalOpen] = useState(false)
  const [qrData, setQrData] = useState<string | null>(null)

  // ── Reloj en vivo ────────────────────────────────────────────────
  const [currentDate, setCurrentDate] = useState(new Date())

  // ── Notificaciones ───────────────────────────────────────────────
  const { noLeidas, marcarComoLeidas } = useNotificaciones(usuario?.id);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeStr = currentDate.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
  const dateStr = currentDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  useEffect(() => {
    if (!usuario) {
      navigate('/login', { replace: true })
    } else if (usuario.tipo === 'admin') {
      navigate('/admin', { replace: true })
    }
  }, [usuario, navigate])

  // ── Cargar horario existente desde Supabase ──────────────────────
  const fetchHorario = useCallback(async () => {
    if (!userId) return
    setLoadingHorario(true)
    setErrorMsg(null)
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(`${HORARIOS_FOLDER}/${userId}`, { limit: 5 })

      if (error) throw error

      // Buscar archivo con nombre "horario.*"
      const archivo = data?.find(f => f.name.startsWith('horario.'))
      if (archivo) {
        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(`${HORARIOS_FOLDER}/${userId}/${archivo.name}`)
        // Agregar timestamp para evitar caché
        setHorarioUrl(`${urlData.publicUrl}?t=${Date.now()}`)
      } else {
        setHorarioUrl(null)
      }
    } catch (err: any) {
      setErrorMsg('No se pudo cargar el horario. Intenta de nuevo.')
      console.error(err)
    } finally {
      setLoadingHorario(false)
    }
  }, [userId])

  // Cargar al abrir el modal
  useEffect(() => {
    if (modalOpen) fetchHorario()
  }, [modalOpen, fetchHorario])

  const handleLogout = () => {
    sessionStorage.removeItem('usuario')
    navigate('/login', { replace: true })
  }

  // ── Modal helpers ────────────────────────────────────────────────
  const openModal = () => {
    setDeleteConfirm(false)
    setErrorMsg(null)
    setModalOpen(true)
  }
  const closeModal = () => {
    if (uploading || deleting) return
    setDeleteConfirm(false)
    setErrorMsg(null)
    setModalOpen(false)
  }

  // ── Subir horario a Supabase Storage ────────────────────────────
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
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${HORARIOS_FOLDER}/${usuario.id}/horario.${ext}`

      // upsert: sobreescribe si ya existe (no debería llegar aquí con uno cargado,
      // pero como salvaguarda lo dejamos en upsert)
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })

      if (error) throw error

      await fetchHorario()
      
      // Notificamos a los administradores del cambio
      await notificarAdmins(
        'Horario Actualizado',
        `El profesor ${usuario.nombre} ha subido su archivo de horario.`,
        'info'
      )
    } catch (err: any) {
      setErrorMsg('Error al subir el archivo. Verifica los permisos del bucket.')
      console.error(err)
    } finally {
      setUploading(false)
      // Limpiar el input para poder seleccionar el mismo archivo otra vez
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }

  // ── Eliminar horario de Supabase Storage ────────────────────────
  const handleDeleteHorario = async () => {
    if (!horarioUrl) return
    setDeleting(true)
    setErrorMsg(null)

    try {
      // Listar y borrar todos los archivos dentro de la carpeta del usuario
      const { data, error: listErr } = await supabase.storage
        .from(BUCKET)
        .list(`${HORARIOS_FOLDER}/${usuario.id}`)

      if (listErr) throw listErr

      const paths = (data ?? []).map(
        f => `${HORARIOS_FOLDER}/${usuario.id}/${f.name}`
      )
      if (paths.length > 0) {
        const { error: removeErr } = await supabase.storage
          .from(BUCKET)
          .remove(paths)
        if (removeErr) throw removeErr
      }

      setHorarioUrl(null)
      setDeleteConfirm(false)
      
      // Notificamos a los administradores del cambio
      await notificarAdmins(
        'Horario Eliminado',
        `El profesor ${usuario.nombre} ha eliminado su archivo de horario.`,
        'alerta'
      )
    } catch (err: any) {
      setErrorMsg('Error al eliminar el horario. Intenta de nuevo.')
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  if (!usuario) return null

  return (
    <div className="dash-root">
      <div className="dash-glow dash-glow-1" />
      <div className="dash-glow dash-glow-2" />

      {/* Header */}
      <header className="dash-header">
        <div className="dash-brand">
          <div className="dash-brand-bar" />
          <div>
            <h1 className="dash-brand-title" style={{ fontSize: '18px' }}>Control de Acceso</h1>
          </div>
        </div>

        <div className="dash-live-info">
          <div className="live-indicator">
            <span className="live-dot" />
            <span>En vivo</span>
          </div>
          <span className="live-time">{timeStr}</span>
          <span className="live-date">{dateStr}</span>
        </div>

        <div className="dash-header-actions">
          <button className="dash-icon-btn" title="Notificaciones" onClick={marcarComoLeidas}>
            <span className="material-symbols-outlined">notifications</span>
            {noLeidas > 0 && <span className="notif-badge">{noLeidas}</span>}
          </button>
          <button className="dash-logout-btn" onClick={handleLogout} style={{ marginLeft: '12px' }}>
            <span className="material-symbols-outlined">logout</span>
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="dash-main">
        {/* Bienvenida */}
        <div className="dash-welcome">
          <div className="dash-welcome-icon">
            <span className="material-symbols-outlined">waving_hand</span>
          </div>
          <div>
            <h2 className="dash-welcome-title">Bienvenido, {usuario.nombre}</h2>
            <p className="dash-welcome-sub">
              <span className="dash-badge">{usuario.tipo === 'admin' ? 'Administrador' : 'Profesor'}</span>
              {usuario.correo}
            </p>
          </div>
        </div>

        {/* Tarjetas */}
        <div className="dash-cards">
          <div className="dash-card">
            <span className="material-symbols-outlined dash-card-icon">meeting_room</span>
            <h3 className="dash-card-title">Salones</h3>
            <p className="dash-card-desc">Consulta los salones disponibles y su estado actual.</p>
            <span className="dash-card-tag">Próximamente</span>
          </div>

          <div className="dash-card dash-card--clickable" onClick={openModal} id="card-mis-horarios">
            <span className="material-symbols-outlined dash-card-icon">calendar_month</span>
            <h3 className="dash-card-title">Mis Horarios</h3>
            <p className="dash-card-desc">Visualiza tus horarios asignados por salón y día.</p>
            <span className={`dash-card-tag${horarioUrl ? ' dash-card-tag--active' : ''}`}>
              {horarioUrl ? 'Ver horario' : 'Subir horario'}
            </span>
          </div>

          <div className="dash-card">
            <span className="material-symbols-outlined dash-card-icon">lock</span>
            <h3 className="dash-card-title">Accesos</h3>
            <p className="dash-card-desc">Revisa el historial de accesos registrados.</p>
            <span className="dash-card-tag">Próximamente</span>
          </div>

          <div className="dash-card dash-card--clickable" onClick={() => { setQrData(null); setNfcModalOpen(true); }} id="card-nfc">
            <span className="material-symbols-outlined dash-card-icon">nfc</span>
            <h3 className="dash-card-title">Tarjeta NFC</h3>
            <p className="dash-card-desc">Gestiona tu tarjeta NFC vinculada a tu cuenta.</p>
            <span className="dash-card-tag">Escanear QR</span>
          </div>
        </div>
      </main>

      <footer className="dash-footer">
        <p>© 2026 IDGS15 Equipo 6. TODOS LOS DERECHOS RESERVADOS.</p>
      </footer>

      {/* ── Modal de Horario ── */}
      {modalOpen && (
        <div
          className="hor-overlay"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
          id="modal-horario"
        >
          <div className="hor-modal">
            {/* Header */}
            <div className="hor-modal-header">
              <div className="hor-modal-title-row">
                <span className="material-symbols-outlined hor-modal-icon">calendar_month</span>
                <h2 className="hor-modal-title">Mis Horarios</h2>
              </div>
              <button className="hor-close-btn" onClick={closeModal} id="btn-cerrar-modal-horario" disabled={uploading || deleting}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="hor-error-banner">
                <span className="material-symbols-outlined">error</span>
                {errorMsg}
              </div>
            )}

            {/* Body */}
            {loadingHorario ? (
              /* ── Cargando ── */
              <div className="hor-loading-area">
                <div className="hor-spinner" />
                <p className="hor-loading-text">Cargando horario...</p>
              </div>
            ) : horarioUrl ? (
              /* ── Vista de horario cargado ── */
              <div className="hor-preview-area">
                <img src={horarioUrl} alt="Mi horario" className="hor-preview-img" id="img-horario-preview" />

                {!deleteConfirm ? (
                  <div className="hor-actions">
                    <p className="hor-hint">Para subir un nuevo horario, primero elimina el actual.</p>
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
                        id="btn-cancelar-eliminar"
                        disabled={deleting}
                      >
                        Cancelar
                      </button>
                      <button
                        className="hor-confirm-delete-btn"
                        onClick={handleDeleteHorario}
                        id="btn-confirmar-eliminar"
                        disabled={deleting}
                      >
                        {deleting ? (
                          <><div className="hor-btn-spinner" />Eliminando...</>
                        ) : (
                          <><span className="material-symbols-outlined">delete_forever</span>Sí, eliminar</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── Área de subida ── */
              <div className="hor-upload-area">
                <div
                  className={`hor-drop-zone${dragOver ? ' hor-drop-zone--active' : ''}${uploading ? ' hor-drop-zone--uploading' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragOver(true) }}
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
                  onChange={handleInputChange}
                  id="input-file-horario"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal de NFC / QR ── */}
      {nfcModalOpen && (
        <div
          className="hor-overlay"
          onClick={(e) => e.target === e.currentTarget && setNfcModalOpen(false)}
          id="modal-nfc"
        >
          <div className="hor-modal">
            {/* Header */}
            <div className="hor-modal-header">
              <div className="hor-modal-title-row">
                <span className="material-symbols-outlined hor-modal-icon">qr_code_scanner</span>
                <h2 className="hor-modal-title">Escanear Código QR</h2>
              </div>
              <button className="hor-close-btn" onClick={() => setNfcModalOpen(false)} id="btn-cerrar-modal-nfc">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="nfc-modal-body">
              {qrData ? (
                <div className="nfc-success-area">
                  <span className="material-symbols-outlined nfc-success-icon">check_circle</span>
                  <h3 className="nfc-success-title">¡Código Escaneado!</h3>
                  <p className="nfc-success-data">{qrData}</p>
                  <button className="nfc-scan-again-btn" onClick={() => setQrData(null)}>
                    Escanear otro código
                  </button>
                </div>
              ) : (
                <div className="nfc-scanner-container">
                  <p className="nfc-scanner-hint">Apunta tu cámara hacia el código QR</p>
                  <div className="nfc-scanner-wrapper">
                    <Scanner
                      onScan={(result) => {
                        if (result && result.length > 0) {
                          setQrData(result[0].rawValue)
                          // Notificar al admin sobre el escaneo como prueba
                          notificarAdmins(
                            'Código QR Escaneado',
                            `El profesor ${usuario?.nombre} ha escaneado un código QR de acceso.`,
                            'excepcion'
                          )
                        }
                      }}
                      onError={(error) => console.log(error)}
                    />
                  </div>
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
