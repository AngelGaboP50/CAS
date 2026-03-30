import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './DashboardPage.css'

function DashboardPage() {
  const navigate = useNavigate()

  const usuarioRaw = sessionStorage.getItem('usuario')
  const usuario = usuarioRaw ? JSON.parse(usuarioRaw) : null

  // ── Horario modal state ──────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [horarioImg, setHorarioImg] = useState<string | null>(() => {
    if (!usuario) return null
    return localStorage.getItem(`horario_${usuario.id}`) ?? null
  })
  const [dragOver, setDragOver] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!usuario) {
      navigate('/login', { replace: true })
    } else if (usuario.tipo === 'admin') {
      navigate('/admin', { replace: true })
    }
  }, [usuario, navigate])

  const handleLogout = () => {
    sessionStorage.removeItem('usuario')
    navigate('/login', { replace: true })
  }

  // ── Horario helpers ──────────────────────────────────────────
  const openModal = () => {
    setDeleteConfirm(false)
    setModalOpen(true)
  }
  const closeModal = () => {
    setDeleteConfirm(false)
    setModalOpen(false)
  }

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setHorarioImg(dataUrl)
      localStorage.setItem(`horario_${usuario.id}`, dataUrl)
    }
    reader.readAsDataURL(file)
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

  const handleDeleteHorario = () => {
    setHorarioImg(null)
    localStorage.removeItem(`horario_${usuario.id}`)
    setDeleteConfirm(false)
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
            <h1 className="dash-brand-title">CAS</h1>
            <p className="dash-brand-sub">Control de Acceso a Salones</p>
          </div>
        </div>
        <button className="dash-logout-btn" onClick={handleLogout}>
          <span className="material-symbols-outlined">logout</span>
          Cerrar sesión
        </button>
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
            {horarioImg
              ? <span className="dash-card-tag dash-card-tag--active">Ver horario</span>
              : <span className="dash-card-tag">Subir horario</span>
            }
          </div>

          <div className="dash-card">
            <span className="material-symbols-outlined dash-card-icon">lock</span>
            <h3 className="dash-card-title">Accesos</h3>
            <p className="dash-card-desc">Revisa el historial de accesos registrados.</p>
            <span className="dash-card-tag">Próximamente</span>
          </div>

          <div className="dash-card">
            <span className="material-symbols-outlined dash-card-icon">nfc</span>
            <h3 className="dash-card-title">Tarjeta NFC</h3>
            <p className="dash-card-desc">Gestiona tu tarjeta NFC vinculada a tu cuenta.</p>
            <span className="dash-card-tag">Próximamente</span>
          </div>
        </div>
      </main>

      <footer className="dash-footer">
        <p>© 2026 IDGS15 Equipo 6. TODOS LOS DERECHOS RESERVADOS.</p>
      </footer>

      {/* ── Modal de Horario ── */}
      {modalOpen && (
        <div className="hor-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()} id="modal-horario">
          <div className="hor-modal">
            {/* Header */}
            <div className="hor-modal-header">
              <div className="hor-modal-title-row">
                <span className="material-symbols-outlined hor-modal-icon">calendar_month</span>
                <h2 className="hor-modal-title">Mis Horarios</h2>
              </div>
              <button className="hor-close-btn" onClick={closeModal} id="btn-cerrar-modal-horario">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Body */}
            {horarioImg ? (
              /* ── Vista de horario cargado ── */
              <div className="hor-preview-area">
                <img src={horarioImg} alt="Mi horario" className="hor-preview-img" id="img-horario-preview" />

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
                      <button className="hor-cancel-btn" onClick={() => setDeleteConfirm(false)} id="btn-cancelar-eliminar">
                        Cancelar
                      </button>
                      <button className="hor-confirm-delete-btn" onClick={handleDeleteHorario} id="btn-confirmar-eliminar">
                        <span className="material-symbols-outlined">delete_forever</span>
                        Sí, eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── Área de subida ── */
              <div className="hor-upload-area">
                <div
                  className={`hor-drop-zone ${dragOver ? 'hor-drop-zone--active' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  id="drop-zone-horario"
                >
                  <span className="material-symbols-outlined hor-upload-icon">upload_file</span>
                  <p className="hor-drop-title">Arrastra tu horario aquí</p>
                  <p className="hor-drop-sub">o haz clic para seleccionar un archivo</p>
                  <span className="hor-format-tag">PNG · JPG · JPEG</span>
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
    </div>
  )
}

export default DashboardPage
