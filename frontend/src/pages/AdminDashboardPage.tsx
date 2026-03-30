import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './DashboardPage.css' // Reutilizamos los estilos del dashboard normal

function AdminDashboardPage() {
  const navigate = useNavigate()

  const usuarioRaw = sessionStorage.getItem('usuario')
  const usuario = usuarioRaw ? JSON.parse(usuarioRaw) : null

  useEffect(() => {
    if (!usuario) {
      navigate('/login', { replace: true })
      return
    }
    if (usuario.tipo !== 'admin') {
      // Si no es admin lo mandamos al dashboard normal
      navigate('/dashboard', { replace: true })
    }
  }, [usuario, navigate])

  const handleLogout = () => {
    sessionStorage.removeItem('usuario')
    navigate('/login', { replace: true })
  }

  if (!usuario || (usuario && usuario.tipo !== 'admin')) return null

  return (
    <div className="dash-root">
      <div className="dash-glow dash-glow-1" style={{ background: 'rgba(74,225,131,.08)' }} />
      <div className="dash-glow dash-glow-2" style={{ background: 'rgba(146,204,255,.08)' }} />

      {/* Header */}
      <header className="dash-header">
        <div className="dash-brand">
          <div className="dash-brand-bar" />
          <div>
            <h1 className="dash-brand-title">CAS</h1>
            <p className="dash-brand-sub">Panel de Administración</p>
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
        <div className="dash-welcome" style={{ borderColor: 'rgba(74,225,131,.4)' }}>
          <div className="dash-welcome-icon" style={{ borderColor: 'rgba(74,225,131,.4)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)' }}>admin_panel_settings</span>
          </div>
          <div>
            <h2 className="dash-welcome-title">Bienvenido, {usuario.nombre}</h2>
            <p className="dash-welcome-sub">
              <span className="dash-badge" style={{ backgroundColor: 'rgba(74,225,131,0.2)', color: 'var(--color-secondary)', borderColor: 'var(--color-secondary)' }}>
                ADMINISTRADOR
              </span>
              {usuario.correo}
            </p>
          </div>
        </div>

        {/* Tarjetas de Salones */}
        <div className="dash-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
          
          {/* Card Salón 1 */}
          <div className="dash-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span className="material-symbols-outlined dash-card-icon" style={{ color: 'var(--color-primary)', fontSize: '50px' }}>
                meeting_room
              </span>
              <span className="dash-badge" style={{ background: 'rgba(146,204,255,.15)', color: 'var(--color-primary)', border: 'none', margin: 0 }}>
                ACTIVO
              </span>
            </div>
            <h3 className="dash-card-title" style={{ fontSize: '22px' }}>Salón 1</h3>
            <p className="dash-card-desc">Control y monitoreo de accesos para el Salón 1. Revisa el historial, estado de la cerradura y gestiona permisos.</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button 
                className="dash-logout-btn" 
                style={{ flex: 1, justifyContent: 'center', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
              >
                <span className="material-symbols-outlined">settings</span> Gestionar
              </button>
              <button 
                className="dash-logout-btn" 
                style={{ flex: 1, justifyContent: 'center', borderColor: 'var(--color-outline-variant)' }}
              >
                <span className="material-symbols-outlined">history</span> Historial
              </button>
            </div>
          </div>

          {/* Card Salón 2 */}
          <div className="dash-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span className="material-symbols-outlined dash-card-icon" style={{ color: 'var(--color-secondary)', fontSize: '50px' }}>
                meeting_room
              </span>
              <span className="dash-badge" style={{ background: 'rgba(74,225,131,.15)', color: 'var(--color-secondary)', border: 'none', margin: 0 }}>
                ACTIVO
              </span>
            </div>
            <h3 className="dash-card-title" style={{ fontSize: '22px' }}>Salón 2</h3>
            <p className="dash-card-desc">Control y monitoreo de accesos para el Salón 2. Revisa el historial, estado de la cerradura y gestiona permisos.</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button 
                className="dash-logout-btn" 
                style={{ flex: 1, justifyContent: 'center', borderColor: 'var(--color-secondary)', color: 'var(--color-secondary)' }}
              >
                <span className="material-symbols-outlined">settings</span> Gestionar
              </button>
              <button 
                className="dash-logout-btn" 
                style={{ flex: 1, justifyContent: 'center', borderColor: 'var(--color-outline-variant)' }}
              >
                <span className="material-symbols-outlined">history</span> Historial
              </button>
            </div>
          </div>

        </div>
      </main>

      <footer className="dash-footer">
        <p>© 2026 IDGS15 Equipo 6. TODOS LOS DERECHOS RESERVADOS.</p>
      </footer>
    </div>
  )
}

export default AdminDashboardPage
