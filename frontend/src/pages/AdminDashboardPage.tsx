import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './DashboardPage.css' // Reutilizamos los estilos del dashboard normal

function AdminDashboardPage() {
  const navigate = useNavigate()

  const [usuario] = useState(() => {
    const usuarioRaw = sessionStorage.getItem('usuario')
    return usuarioRaw ? JSON.parse(usuarioRaw) : null
  })

  // Estado para las pestañas (Tabs del Sidebar)
  const [activeTab, setActiveTab] = useState<'principal' | 'usuarios' | 'perfil'>('principal')

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
    const { data, error } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false })
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
      // Actualizar
      const { error } = await supabase.from('usuarios')
        .update({ nombre: formName, correo: formEmail, tipo: formType })
        .eq('id', editingId)
      if (!error) fetchUsuarios()
    } else {
      // Crear nuevo en la tabla 'usuarios'
      const { error } = await supabase.from('usuarios')
        .insert([{ nombre: formName, correo: formEmail, tipo: formType }])
      if (!error) fetchUsuarios()
    }
    
    setIsEditing(false)
  }

  const deleteUser = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      const { error } = await supabase.from('usuarios').delete().eq('id', id)
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
    gap: '12px',
    padding: '12px 16px',
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
            <h1 className="dash-brand-title">CAS</h1>
            <p className="dash-brand-sub">Panel de Administración</p>
          </div>
        </div>
        <button className="dash-logout-btn" onClick={handleLogout}>
          <span className="material-symbols-outlined">logout</span>
          Cerrar sesión
        </button>
      </header>

      {/* Layout Principal con Sidebar */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', zIndex: 5, position: 'relative' }}>
        
        {/* SIDEBAR */}
        <aside style={{ 
          width: '260px', 
          borderRight: '1px solid var(--color-outline-variant)', 
          background: 'rgba(30, 31, 38, 0.4)', 
          backdropFilter: 'blur(10px)',
          padding: '30px 20px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px' 
        }}>
          <button 
            style={sidebarItemStyle(activeTab === 'principal')} 
            onClick={() => setActiveTab('principal')}
          >
            <span className="material-symbols-outlined">dashboard</span>
            Principal
          </button>
          
          <button 
            style={sidebarItemStyle(activeTab === 'usuarios')} 
            onClick={() => { setActiveTab('usuarios'); fetchUsuarios(); }}
          >
            <span className="material-symbols-outlined">group</span>
            Usuarios
          </button>
          
          <button 
            style={sidebarItemStyle(activeTab === 'perfil')} 
            onClick={() => setActiveTab('perfil')}
          >
            <span className="material-symbols-outlined">person</span>
            Perfil
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

                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }}>door_open</span>
                  <h3 style={{ fontSize: '20px', margin: 0, fontWeight: 600 }}>Gestión de Salones</h3>
                </div>

                <div className="dash-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
                  {/* Card Salón 1 */}
                  <div className="dash-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span className="material-symbols-outlined dash-card-icon" style={{ color: 'var(--color-primary)', fontSize: '50px' }}>
                        meeting_room
                      </span>
                      <span className="dash-badge" style={{ background: 'rgba(146,204,255,.1)', color: 'var(--color-primary)', border: 'none', margin: 0 }}>
                        ACTIVO
                      </span>
                    </div>
                    <h3 className="dash-card-title" style={{ fontSize: '22px' }}>Salón 1</h3>
                    <p className="dash-card-desc">Control y monitoreo de accesos para el Salón 1. Revisa el historial, estado de la cerradura y gestiona permisos.</p>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                      <button className="dash-logout-btn" style={{ flex: 1, justifyContent: 'center', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                        <span className="material-symbols-outlined">settings</span> Gestionar
                      </button>
                      <button className="dash-logout-btn" style={{ flex: 1, justifyContent: 'center', borderColor: 'var(--color-outline-variant)' }}>
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
                      <button className="dash-logout-btn" style={{ flex: 1, justifyContent: 'center', borderColor: 'var(--color-secondary)', color: 'var(--color-secondary)' }}>
                        <span className="material-symbols-outlined">settings</span> Gestionar
                      </button>
                      <button className="dash-logout-btn" style={{ flex: 1, justifyContent: 'center', borderColor: 'var(--color-outline-variant)' }}>
                        <span className="material-symbols-outlined">history</span> Historial
                      </button>
                    </div>
                  </div>
                </div>
              </>
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

    </div>
  )
}

export default AdminDashboardPage
