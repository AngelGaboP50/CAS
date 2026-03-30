import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './DashboardPage.css'

function DashboardPage() {
  const navigate = useNavigate()

  const usuarioRaw = sessionStorage.getItem('usuario')
  const usuario = usuarioRaw ? JSON.parse(usuarioRaw) : null

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

          <div className="dash-card">
            <span className="material-symbols-outlined dash-card-icon">calendar_month</span>
            <h3 className="dash-card-title">Mis Horarios</h3>
            <p className="dash-card-desc">Visualiza tus horarios asignados por salón y día.</p>
            <span className="dash-card-tag">Próximamente</span>
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
    </div>
  )
}

export default DashboardPage
