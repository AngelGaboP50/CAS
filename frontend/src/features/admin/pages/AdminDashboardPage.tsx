import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import '../../../shared/styles/DashboardPage.css' // Reutilizamos los estilos del dashboard normal
import { InteractiveMap } from '../../salones/components/InteractiveMap'
import { useAulas, type EstadoAula } from '../../salones/hooks/useAulas'
import { useNotificaciones } from '../../notificaciones/hooks/useNotificaciones'

function AdminDashboardPage() {
  const navigate = useNavigate()

  const [usuario] = useState(() => {
    const usuarioRaw = sessionStorage.getItem('usuario')
    return usuarioRaw ? JSON.parse(usuarioRaw) : null
  })

  // Hook de Notificaciones
  const { noLeidas, marcarComoLeidas } = useNotificaciones(usuario?.id)

  // Reloj en vivo
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeStr = currentDate.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
  const dateStr = currentDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Estado para las pestañas (Tabs del Sidebar)
  const [activeTab, setActiveTab] = useState<'principal' | 'usuarios' | 'horarios' | 'perfil'>('principal')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Estado para usuarios
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  
  // Estado para el CRUD
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formType, setFormType] = useState('profesor')

  // Colores rojos SOLO para la bienvenida del administrador
  const adminThemeColor = '#ff4d4f'
  const adminThemeGlow = 'rgba(255, 77, 79, 0.4)'
  const adminThemeBg = 'rgba(255, 77, 79, 0.15)'

  // Hook para Aulas (Control de Salones)
  const { aulas, updateEstadoAula } = useAulas()

  // ── Estado para la sección de Horarios ─────────────────────────────
  type EstadoHorario = 'pendiente' | 'autorizado' | 'rechazado'
  const [horarioFilter, setHorarioFilter] = useState<EstadoHorario | 'todos'>('pendiente')
  const [previewImg, setPreviewImg] = useState<string | null>(null)
  const [horariosData, setHorariosData] = useState<Array<{
    id: string
    profesorNombre: string
    profesorCorreo: string
    imagenUrl: string
    estado: EstadoHorario
    fecha: string
  }>>([
    {
      id: '1',
      profesorNombre: 'Ana López',
      profesorCorreo: 'ana.lopez@ejemplo.edu.mx',
      imagenUrl: 'https://placehold.co/400x300/1e1f26/92ccff?text=Horario+Ana',
      estado: 'pendiente',
      fecha: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: '2',
      profesorNombre: 'Carlos Mendoza',
      profesorCorreo: 'c.mendoza@ejemplo.edu.mx',
      imagenUrl: 'https://placehold.co/400x300/1e1f26/92ccff?text=Horario+Carlos',
      estado: 'pendiente',
      fecha: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: '3',
      profesorNombre: 'Marta Ramírez',
      profesorCorreo: 'm.ramirez@ejemplo.edu.mx',
      imagenUrl: 'https://placehold.co/400x300/1e1f26/4ae183?text=Horario+Marta',
      estado: 'autorizado',
      fecha: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
  ])

  const handleAutorizarHorario = (id: string) => {
    setHorariosData(prev =>
      prev.map(h => h.id === id ? { ...h, estado: 'autorizado' as EstadoHorario } : h)
    )
  }

  const handleRechazarHorario = (id: string) => {
    setHorariosData(prev =>
      prev.map(h => h.id === id ? { ...h, estado: 'rechazado' as EstadoHorario } : h)
    )
  }

  const horariosFiltrados = horariosData.filter(h =>
    horarioFilter === 'todos' ? true : h.estado === horarioFilter
  )

  const pendientesCount = horariosData.filter(h => h.estado === 'pendiente').length

  const handleUpdateEstado = async (id: string, estadoActual: EstadoAula) => {
    const estadosPermitidos: EstadoAula[] = ['LIBRE', 'EN_CLASE', 'ALERTA', 'EXCEPCION', 'NO_DISPONIBLE'];
    const currentIndex = estadosPermitidos.indexOf(estadoActual);
    const nextEstado = estadosPermitidos[(currentIndex + 1) % estadosPermitidos.length];
    
    try {
      await updateEstadoAula(id, nextEstado);
    } catch (err) {
      alert('Error al actualizar el estado del salón');
    }
  }

  useEffect(() => {
    if (!usuario) {
      navigate('/login', { replace: true })
      return
    }
    if (usuario.tipo !== 'admin') {
      // Si no es admin lo mandamos al dashboard normal
      navigate('/dashboard', { replace: true })
      return
    }
    fetchUsuarios()
  }, [usuario, navigate])

  const fetchUsuarios = async () => {
    setLoadingUsuarios(true)
    // TODO: Llamada a API
    const data: any[] = []
    const error = null
    if (!error && data) {
      setUsuarios(data)
    }
    setLoadingUsuarios(false)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('usuario')
    navigate('/login', { replace: true })
  }

  const openAddForm = () => {
    setIsEditing(true)
    setEditingId(null)
    setFormName('')
    setFormEmail('')
    setFormType('profesor')
  }

  const openEditForm = (user: any) => {
    setIsEditing(true)
    setEditingId(user.id)
    setFormName(user.nombre)
    setFormEmail(user.correo)
    setFormType(user.tipo || 'profesor')
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditingId(null)
  }

  const saveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingId) {
      // TODO: API Actualizar
      const error = null
      if (!error) fetchUsuarios()
    } else {
      // TODO: API Crear
      const error = null
      if (!error) fetchUsuarios()
    }
    
    setIsEditing(false)
  }

  const deleteUser = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      // TODO: API Borrar
      const error = null
      if (!error) fetchUsuarios()
    }
  }

  // Estilos base
  const inputStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'var(--color-bg)',
    border: '1px solid var(--color-outline-variant)',
    color: 'var(--color-on-surface)',
    outline: 'none',
    fontFamily: 'inherit',
    fontSize: '14px'
  }

  const sidebarItemStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: isSidebarOpen ? 'flex-start' : 'center',
    gap: isSidebarOpen ? '12px' : '0',
    padding: isSidebarOpen ? '12px 16px' : '12px 0',
    borderRadius: '12px',
    cursor: 'pointer',
    color: isActive ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
    background: isActive ? 'rgba(146, 204, 255, 0.1)' : 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    fontSize: '15px',
    fontWeight: isActive ? 600 : 400,
    transition: 'all 0.2s',
  })

  if (!usuario || (usuario && usuario.tipo !== 'admin')) return null

  return (
    <div className="dash-root">
      {/* Restaurar colores por defecto de DashboardPage.css para el fondo */}
      <div className="dash-glow dash-glow-1" />
      <div className="dash-glow dash-glow-2" />

      {/* Header original */}
      <header className="dash-header" style={{ position: 'relative', zIndex: 10 }}>
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
        </div>
      </header>

      {/* Layout Principal con Sidebar */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', zIndex: 5, position: 'relative' }}>
        
        {/* SIDEBAR */}
        <aside style={{ 
          width: isSidebarOpen ? '260px' : '80px', 
          borderRight: '1px solid var(--color-outline-variant)', 
          background: 'rgba(30, 31, 38, 0.4)', 
          backdropFilter: 'blur(10px)',
          padding: isSidebarOpen ? '30px 20px' : '30px 10px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          transition: 'all 0.3s ease'
        }}>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            style={{
              background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', 
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: isSidebarOpen ? 'flex-end' : 'center',
              marginBottom: '16px', padding: '0 8px'
            }}
            title={isSidebarOpen ? "Contraer menú" : "Expandir menú"}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px', transition: 'color 0.2s' }}>
              {isSidebarOpen ? 'menu_open' : 'menu'}
            </span>
          </button>

          <button 
            style={sidebarItemStyle(activeTab === 'principal')} 
            onClick={() => setActiveTab('principal')}
            title="Principal"
          >
            <span className="material-symbols-outlined">dashboard</span>
            {isSidebarOpen && <span>Principal</span>}
          </button>
          
          <button 
            style={sidebarItemStyle(activeTab === 'usuarios')} 
            onClick={() => { setActiveTab('usuarios'); fetchUsuarios(); }}
            title="Usuarios"
          >
            <span className="material-symbols-outlined">group</span>
            {isSidebarOpen && <span>Usuarios</span>}
          </button>
          
          <button 
            style={{
              ...sidebarItemStyle(activeTab === 'horarios'),
              position: 'relative'
            }} 
            onClick={() => setActiveTab('horarios')}
            title="Horarios"
          >
            <span className="material-symbols-outlined">pending_actions</span>
            {isSidebarOpen && <span>Horarios</span>}
            {pendientesCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '6px',
                right: isSidebarOpen ? '12px' : '6px',
                background: '#fbd38d',
                color: '#111319',
                fontSize: '10px',
                fontWeight: 700,
                minWidth: '16px',
                height: '16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                boxShadow: '0 0 0 2px var(--color-bg)'
              }}>{pendientesCount}</span>
            )}
          </button>
          
          <button 
            style={sidebarItemStyle(activeTab === 'perfil')} 
            onClick={() => setActiveTab('perfil')}
            title="Perfil"
          >
            <span className="material-symbols-outlined">person</span>
            {isSidebarOpen && <span>Perfil</span>}
          </button>

          <div style={{ flex: 1 }} /> {/* Espaciador de flexibilidad para empujar al fondo */}

          <button 
            style={{
              ...sidebarItemStyle(false),
            }}
            onClick={handleLogout}
            title="Cerrar sesión"
            onMouseOver={e => {
              e.currentTarget.style.color = '#ff6b7a';
              e.currentTarget.style.background = 'rgba(255, 107, 122, 0.08)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.color = 'var(--color-on-surface-variant)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span className="material-symbols-outlined">logout</span>
            {isSidebarOpen && <span>Cerrar sesión</span>}
          </button>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '40px' }} className="dash-main-scroll">
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            
            {/* ── PESTAÑA PRINCIPAL (Salones) ── */}
            {activeTab === 'principal' && (
              <>
                {/* Este es el único recuadro en ROJO */}
                <div className="dash-welcome" style={{ borderColor: adminThemeGlow, margin: '0 0 40px 0' }}>
                  <div className="dash-welcome-icon" style={{ borderColor: adminThemeGlow, background: adminThemeBg }}>
                    <span className="material-symbols-outlined" style={{ color: adminThemeColor }}>admin_panel_settings</span>
                  </div>
                  <div>
                    <h2 className="dash-welcome-title">Bienvenido, {usuario.nombre}</h2>
                    <p className="dash-welcome-sub">
                      <span className="dash-badge" style={{ backgroundColor: adminThemeBg, color: adminThemeColor, borderColor: adminThemeColor }}>
                        ADMINISTRADOR
                      </span>
                      {usuario.correo}
                    </p>
                  </div>
                </div>

                <InteractiveMap />
              </>
            )}

            {/* ── PESTAÑA HORARIOS ── */}
            {activeTab === 'horarios' && (
              <div className="dash-card" style={{ padding: '30px', margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                  <h3 className="dash-card-title" style={{ fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '28px' }}>pending_actions</span>
                    Horarios de Profesores
                  </h3>
                  <span style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                    {pendientesCount} pendiente{pendientesCount !== 1 ? 's' : ''} de autorización
                  </span>
                </div>

                {/* Filtro de tabs */}
                <div className="admin-hor-tabs">
                  <button
                    className={`admin-hor-tab${horarioFilter === 'pendiente' ? ' admin-hor-tab--active' : ''}`}
                    onClick={() => setHorarioFilter('pendiente')}
                  >
                    <span className="material-symbols-outlined">pending</span>
                    Pendientes
                    {pendientesCount > 0 && (
                      <span className="admin-hor-tab-count">{pendientesCount}</span>
                    )}
                  </button>
                  <button
                    className={`admin-hor-tab${horarioFilter === 'autorizado' ? ' admin-hor-tab--active' : ''}`}
                    onClick={() => setHorarioFilter('autorizado')}
                  >
                    <span className="material-symbols-outlined">check_circle</span>
                    Autorizados
                  </button>
                  <button
                    className={`admin-hor-tab${horarioFilter === 'rechazado' ? ' admin-hor-tab--active' : ''}`}
                    onClick={() => setHorarioFilter('rechazado')}
                  >
                    <span className="material-symbols-outlined">cancel</span>
                    Rechazados
                  </button>
                  <button
                    className={`admin-hor-tab${horarioFilter === 'todos' ? ' admin-hor-tab--active' : ''}`}
                    onClick={() => setHorarioFilter('todos')}
                  >
                    <span className="material-symbols-outlined">list</span>
                    Todos
                  </button>
                </div>

                {/* Lista de solicitudes */}
                {horariosFiltrados.length === 0 ? (
                  <div className="admin-horarios-empty">
                    <span className="material-symbols-outlined">calendar_month</span>
                    <p>No hay solicitudes {horarioFilter !== 'todos' ? `con estado "${horarioFilter}"` : ''}.</p>
                  </div>
                ) : (
                  <div className="admin-horarios-list">
                    {horariosFiltrados.map(h => (
                      <div key={h.id} className="admin-horario-card">
                        {/* Miniatura */}
                        <img
                          src={h.imagenUrl}
                          alt={`Horario de ${h.profesorNombre}`}
                          className="admin-horario-thumb"
                          onClick={() => setPreviewImg(h.imagenUrl)}
                          title="Clic para ampliar"
                        />

                        {/* Info del profesor */}
                        <div className="admin-horario-info">
                          <p className="admin-horario-name">{h.profesorNombre}</p>
                          <p className="admin-horario-meta">
                            {h.profesorCorreo} &nbsp;·&nbsp;
                            {new Date(h.fecha).toLocaleString('es-MX', {
                              day: 'numeric', month: 'short',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                          <div style={{ marginTop: '8px' }}>
                            <span className={`admin-status-chip admin-status-chip--${h.estado}`}>
                              {h.estado === 'pendiente' && <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>pending</span>}
                              {h.estado === 'autorizado' && <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>check_circle</span>}
                              {h.estado === 'rechazado' && <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>cancel</span>}
                              {h.estado.charAt(0).toUpperCase() + h.estado.slice(1)}
                            </span>
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="admin-horario-actions">
                          {h.estado === 'pendiente' && (
                            <>
                              <button
                                className="admin-btn-authorize"
                                onClick={() => handleAutorizarHorario(h.id)}
                                title="Autorizar horario"
                              >
                                <span className="material-symbols-outlined">check_circle</span>
                                Autorizar
                              </button>
                              <button
                                className="admin-btn-reject"
                                onClick={() => handleRechazarHorario(h.id)}
                                title="Rechazar horario"
                              >
                                <span className="material-symbols-outlined">cancel</span>
                                Rechazar
                              </button>
                            </>
                          )}
                          {h.estado !== 'pendiente' && (
                            <button
                              className="admin-btn-authorize"
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--color-outline-variant)',
                                color: 'var(--color-on-surface-variant)'
                              }}
                              onClick={() => setPreviewImg(h.imagenUrl)}
                              title="Ver horario"
                            >
                              <span className="material-symbols-outlined">visibility</span>
                              Ver
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── PESTAÑA USUARIOS ── */}
            {activeTab === 'usuarios' && (
              <div className="dash-card" style={{ padding: '30px', margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                  <h3 className="dash-card-title" style={{ fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '28px' }}>group</span>
                    Gestión de Usuarios
                  </h3>
                  {!isEditing && (
                    <button className="dash-logout-btn" onClick={openAddForm} style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                      <span className="material-symbols-outlined">person_add</span> Nuevo Usuario
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <form onSubmit={saveUser} style={{ 
                    display: 'flex', flexDirection: 'column', gap: '16px', 
                    background: 'var(--color-surface-container-high)', 
                    padding: '24px', borderRadius: '12px', 
                    border: `1px solid var(--color-outline-variant)` 
                  }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '18px', color: 'var(--color-on-surface)' }}>
                      {editingId ? 'Editar Usuario' : 'Crear Usuario'}
                    </h4>
                    
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>Nombre</label>
                        <input type="text" value={formName} onChange={e => setFormName(e.target.value)} required style={inputStyle} placeholder="Ej. Juan Pérez" />
                      </div>
                      
                      <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>Correo</label>
                        <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} required style={inputStyle} placeholder="usuario@ejemplo.com" />
                      </div>

                      <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>Tipo (Rol)</label>
                        <select value={formType} onChange={e => setFormType(e.target.value)} style={inputStyle}>
                          <option value="admin">Admin</option>
                          <option value="profesor">Profesor</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={cancelEdit} className="dash-logout-btn" style={{ borderColor: 'var(--color-outline-variant)' }}>
                        Cancelar
                      </button>
                      <button type="submit" className="dash-logout-btn" style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', background: 'rgba(146,204,255,.1)' }}>
                        <span className="material-symbols-outlined">save</span> Guardar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    {loadingUsuarios ? (
                      <p style={{ color: 'var(--color-on-surface-variant)', textAlign: 'center', padding: '20px' }}>Cargando usuarios...</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
                            <th style={{ padding: '12px', color: 'var(--color-on-surface-variant)', fontWeight: 500 }}>Nombre</th>
                            <th style={{ padding: '12px', color: 'var(--color-on-surface-variant)', fontWeight: 500 }}>Correo</th>
                            <th style={{ padding: '12px', color: 'var(--color-on-surface-variant)', fontWeight: 500 }}>Tipo</th>
                            <th style={{ padding: '12px', color: 'var(--color-on-surface-variant)', fontWeight: 500, textAlign: 'right' }}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usuarios.map((u: any) => (
                            <tr key={u.id} style={{ borderBottom: '1px solid rgba(63, 72, 80, 0.4)' }}>
                              <td style={{ padding: '16px 12px' }}>{u.nombre}</td>
                              <td style={{ padding: '16px 12px', color: 'var(--color-on-surface-variant)' }}>{u.correo}</td>
                              <td style={{ padding: '16px 12px' }}>
                                <span className="dash-badge" style={{ 
                                  background: u.tipo === 'admin' ? adminThemeBg : 'rgba(146,204,255,.1)', 
                                  color: u.tipo === 'admin' ? adminThemeColor : 'var(--color-primary)',
                                  border: `1px solid ${u.tipo === 'admin' ? adminThemeColor : 'rgba(146,204,255,.3)'}`
                                }}>
                                  {u.tipo ? u.tipo.toUpperCase() : 'INDEFINIDO'}
                                </span>
                              </td>
                              <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                                <button 
                                  onClick={() => openEditForm(u)} 
                                  style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer', marginRight: '16px', transition: 'color 0.2s' }}
                                  title="Editar usuario"
                                  onMouseOver={e => e.currentTarget.style.color = 'var(--color-primary)'}
                                  onMouseOut={e => e.currentTarget.style.color = 'var(--color-on-surface-variant)'}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
                                </button>
                                <button 
                                  onClick={() => deleteUser(u.id)} 
                                  style={{ background: 'transparent', border: 'none', color: '#ff6b7a', cursor: 'pointer', transition: 'filter 0.2s' }}
                                  title="Eliminar usuario"
                                  onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.3)'}
                                  onMouseOut={e => e.currentTarget.style.filter = 'none'}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                          {usuarios.length === 0 && (
                            <tr>
                              <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
                                No hay usuarios registrados.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── PESTAÑA PERFIL ── */}
            {activeTab === 'perfil' && (
              <div className="dash-card" style={{ padding: '40px', maxWidth: '600px', margin: '0 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', borderBottom: '1px solid var(--color-outline-variant)', paddingBottom: '30px', marginBottom: '30px' }}>
                  <div className="dash-welcome-icon" style={{ borderColor: adminThemeGlow, background: adminThemeBg, width: '90px', height: '90px' }}>
                    <span className="material-symbols-outlined" style={{ color: adminThemeColor, fontSize: '48px' }}>admin_panel_settings</span>
                  </div>
                  <div>
                    <h2 style={{ margin: '0 0 10px 0', fontSize: '28px' }}>{usuario.nombre}</h2>
                    <span className="dash-badge" style={{ backgroundColor: adminThemeBg, color: adminThemeColor, borderColor: adminThemeColor }}>
                      ADMINISTRADOR
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <label style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>mail</span>
                      Correo Institucional
                    </label>
                    <p style={{ margin: 0, fontSize: '16px', color: 'var(--color-on-surface)', background: 'var(--color-surface-container-high)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-outline-variant)' }}>
                      {usuario.correo}
                    </p>
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>badge</span>
                      Rol en el Sistema
                    </label>
                    <p style={{ margin: 0, fontSize: '16px', color: 'var(--color-on-surface)', background: 'var(--color-surface-container-high)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-outline-variant)', textTransform: 'capitalize' }}>
                      {usuario.tipo}
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ── Preview Modal (Horario imagen grande) ── */}
      {previewImg && (
        <div
          className="admin-preview-overlay"
          onClick={() => setPreviewImg(null)}
        >
          <button
            className="admin-preview-close"
            onClick={() => setPreviewImg(null)}
            title="Cerrar vista previa"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <img
            src={previewImg}
            alt="Vista previa del horario"
            className="admin-preview-img"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

export default AdminDashboardPage
