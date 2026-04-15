// src/pages/AdminDashboardPage.tsx — REEMPLAZA el archivo actual completo
// Agrega: tab de Solicitudes, tab de Historial, gestión de Horarios, notificaciones navegables

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './DashboardPage.css'
import { InteractiveMap } from '../components/InteractiveMap'
import { useAulas, type EstadoAula } from '../hooks/useAulas'
import { useNotificaciones } from '../hooks/useNotificaciones'
import { useSolicitudes } from '../hooks/useSolicitudes'
import { useAccesos } from '../hooks/useAccesos'
import { useHorarios, type DiaSemana } from '../hooks/useHorarios'
import SalonesAdminTab from '../components/SalonesAdminTab'

type Tab = 'principal' | 'usuarios' | 'salones' | 'solicitudes' | 'historial' | 'horarios' | 'perfil'

const ADMIN_COLOR = '#ff4d4f'
const ADMIN_GLOW = 'rgba(255, 77, 79, 0.4)'
const ADMIN_BG = 'rgba(255, 77, 79, 0.15)'

function getUsuario() {
  try { return JSON.parse(sessionStorage.getItem('usuario') ?? '') } catch { return null }
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [usuario] = useState(getUsuario)

  const { noLeidas } = useNotificaciones(usuario?.id)
  const [currentDate, setCurrentDate] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setCurrentDate(new Date()), 1000); return () => clearInterval(t) }, [])
  const timeStr = currentDate.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
  const dateStr = currentDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const [activeTab, setActiveTab] = useState<Tab>('principal')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // ── Usuarios ──
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formType, setFormType] = useState('profesor')
  const [formPassword, setFormPassword] = useState('')

  // ── Salones ──
  const { aulas, updateEstadoAula } = useAulas()

  // ── Solicitudes ──
  const { solicitudes, loadingS, responderSolicitud } = (() => {
    const { solicitudes, loading: loadingS, responderSolicitud } = useSolicitudes(undefined, true)
    return { solicitudes, loadingS, responderSolicitud }
  })()
  const [modalSol, setModalSol] = useState<string | null>(null)
  const [accionSol, setAccionSol] = useState<'APROBADA' | 'RECHAZADA'>('APROBADA')
  const [respuestaSol, setRespuestaSol] = useState('')
  const [procesandoSol, setProcesandoSol] = useState(false)

  // ── Historial ──
  const { accesos, loading: loadingAccesos } = useAccesos()

  // ── Horarios ──
  const { horarios, loading: loadingHorarios, crearHorario, eliminarHorario } = useHorarios()
  const [modalHorario, setModalHorario] = useState(false)
  const [hForm, setHForm] = useState({ profesor_id: '', salon_id: '', dia_semana: 'LUNES' as DiaSemana, hora_inicio: '', hora_fin: '', materia: '' })
  const [creandoH, setCreandoH] = useState(false)
  const [errorH, setErrorH] = useState('')

  useEffect(() => {
    if (!usuario) { navigate('/login', { replace: true }); return }
    if (usuario.tipo !== 'admin') { navigate('/dashboard', { replace: true }); return }
    fetchUsuarios()
  }, [usuario, navigate])

  const fetchUsuarios = async () => {
    setLoadingUsuarios(true)
    const { data, error } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false })
    if (!error && data) setUsuarios(data)
    setLoadingUsuarios(false)
  }

  const handleLogout = () => { sessionStorage.removeItem('usuario'); navigate('/login', { replace: true }) }

  const handleUpdateEstado = async (id: string, estadoActual: EstadoAula) => {
    const estados: EstadoAula[] = ['LIBRE', 'EN_CLASE', 'ALERTA', 'EXCEPCION', 'NO_DISPONIBLE']
    const next = estados[(estados.indexOf(estadoActual) + 1) % estados.length]
    try { await updateEstadoAula(id, next) } catch { alert('Error al actualizar estado') }
  }

  const openAddForm = () => { setIsEditing(true); setEditingId(null); setFormName(''); setFormEmail(''); setFormType('profesor'); setFormPassword('') }
  const openEditForm = (u: any) => { setIsEditing(true); setEditingId(u.id); setFormName(u.nombre); setFormEmail(u.correo); setFormType(u.tipo ?? 'profesor'); setFormPassword('') }
  const cancelEdit = () => { setIsEditing(false); setEditingId(null) }

  const saveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      await supabase.from('usuarios').update({ nombre: formName, correo: formEmail, tipo: formType }).eq('id', editingId)
    } else {
      // Crear en Supabase Auth + tabla usuarios
      if (!formPassword) { alert('Debes ingresar una contraseña para el nuevo usuario'); return }
      const { data: authData, error: authErr } = await supabase.auth.admin
        ? await (supabase.auth as any).admin.createUser({ email: formEmail, password: formPassword, email_confirm: true })
        : { data: null, error: new Error('No tienes permisos de admin de Auth') }

      if (authErr) {
        // Fallback: insertar solo en tabla pública (el usuario deberá usar "olvidé contraseña")
        await supabase.from('usuarios').insert([{ nombre: formName, correo: formEmail, tipo: formType }])
      } else {
        await supabase.from('usuarios').insert([{ nombre: formName, correo: formEmail, tipo: formType }])
      }
    }
    setIsEditing(false)
    fetchUsuarios()
  }

  const deleteUser = async (id: string) => {
    if (window.confirm('¿Eliminar este usuario?')) {
      await supabase.from('usuarios').delete().eq('id', id)
      fetchUsuarios()
    }
  }

  const confirmarSolicitud = async () => {
    if (!modalSol) return
    const sol = solicitudes.find(s => s.id === modalSol)
    if (!sol) return
    setProcesandoSol(true)
    try {
      await responderSolicitud(modalSol, usuario.id, accionSol, respuestaSol, sol)
      setModalSol(null); setRespuestaSol('')
    } finally { setProcesandoSol(false) }
  }

  const guardarHorario = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorH(''); setCreandoH(true)
    try {
      await crearHorario({ ...hForm, profesor_id: parseInt(hForm.profesor_id) })
      setModalHorario(false)
      setHForm({ profesor_id: '', salon_id: '', dia_semana: 'LUNES', hora_inicio: '', hora_fin: '', materia: '' })
    } catch (err: any) {
      setErrorH(err.message ?? 'Error al crear horario')
    } finally { setCreandoH(false) }
  }

  const inputStyle: React.CSSProperties = {
    padding: '10px 14px', borderRadius: '8px', background: 'var(--color-bg)',
    border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)',
    outline: 'none', fontFamily: 'inherit', fontSize: '14px'
  }

  const sidebarItemStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center',
    justifyContent: isSidebarOpen ? 'flex-start' : 'center',
    gap: isSidebarOpen ? '12px' : '0',
    padding: isSidebarOpen ? '12px 16px' : '12px 0',
    borderRadius: '12px', cursor: 'pointer',
    color: active ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
    background: active ? 'rgba(146, 204, 255, 0.1)' : 'transparent',
    border: 'none', width: '100%', textAlign: 'left',
    fontSize: '15px', fontWeight: active ? 600 : 400, transition: 'all 0.2s',
  })

  if (!usuario || usuario.tipo !== 'admin') return null

  const pendientes = solicitudes.filter(s => s.estado === 'PENDIENTE').length

  return (
    <div className="dash-root">
      <div className="dash-glow dash-glow-1" />
      <div className="dash-glow dash-glow-2" />

      <header className="dash-header" style={{ position: 'relative', zIndex: 10 }}>
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
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', zIndex: 5, position: 'relative' }}>

        {/* SIDEBAR */}
        <aside style={{
          width: isSidebarOpen ? '260px' : '80px',
          borderRight: '1px solid var(--color-outline-variant)',
          background: 'rgba(30, 31, 38, 0.4)', backdropFilter: 'blur(10px)',
          padding: isSidebarOpen ? '30px 20px' : '30px 10px',
          display: 'flex', flexDirection: 'column', gap: '8px', transition: 'all 0.3s ease'
        }}>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: isSidebarOpen ? 'flex-end' : 'center', marginBottom: '16px', padding: '0 8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{isSidebarOpen ? 'menu_open' : 'menu'}</span>
          </button>

          {([
            { id: 'salones', icon: 'meeting_room', label: 'Salones' },
            { id: 'usuarios', icon: 'group', label: 'Usuarios' },
            { id: 'horarios', icon: 'schedule', label: 'Horarios' },
            { id: 'solicitudes', icon: 'pending_actions', label: `Solicitudes${pendientes > 0 ? ` (${pendientes})` : ''}` },
            { id: 'historial', icon: 'history', label: 'Historial' },
            { id: 'perfil', icon: 'person', label: 'Perfil' },
          ] as const).map(item => (
            <button key={item.id} style={sidebarItemStyle(activeTab === item.id)}
              onClick={() => { setActiveTab(item.id); if (item.id === 'usuarios') fetchUsuarios() }}
              title={item.label}>
              <span className="material-symbols-outlined">{item.icon}</span>
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          <button style={sidebarItemStyle(false)} onClick={handleLogout} title="Cerrar sesión"
            onMouseOver={e => { e.currentTarget.style.color = '#ff6b7a'; e.currentTarget.style.background = 'rgba(255,107,122,.08)' }}
            onMouseOut={e => { e.currentTarget.style.color = 'var(--color-on-surface-variant)'; e.currentTarget.style.background = 'transparent' }}>
            <span className="material-symbols-outlined">logout</span>
            {isSidebarOpen && <span>Cerrar sesión</span>}
          </button>
        </aside>

        {/* CONTENIDO */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '40px' }} className="dash-main-scroll">
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

            {/* ── PRINCIPAL ── */}
            {activeTab === 'principal' && (
              <>
                <div className="dash-welcome" style={{ borderColor: ADMIN_GLOW, margin: '0 0 40px 0' }}>
                  <div className="dash-welcome-icon" style={{ borderColor: ADMIN_GLOW, background: ADMIN_BG }}>
                    <span className="material-symbols-outlined" style={{ color: ADMIN_COLOR }}>admin_panel_settings</span>
                  </div>
                  <div>
                    <h2 className="dash-welcome-title">Bienvenido, {usuario.nombre}</h2>
                    <p className="dash-welcome-sub">
                      <span className="dash-badge" style={{ backgroundColor: ADMIN_BG, color: ADMIN_COLOR, borderColor: ADMIN_COLOR }}>ADMINISTRADOR</span>
                      {usuario.correo}
                    </p>
                  </div>
                </div>

                <InteractiveMap />

                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }}>door_open</span>
                  <h3 style={{ fontSize: '20px', margin: 0, fontWeight: 600 }}>Control de Salones</h3>
                </div>

                <div className="dash-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
                  {aulas.length === 0 ? (
                    <p style={{ color: 'var(--color-on-surface-variant)', gridColumn: '1 / -1' }}>No hay salones registrados.</p>
                  ) : aulas.map(aula => (
                    <div className="dash-card" key={aula.id}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span className="material-symbols-outlined dash-card-icon" style={{
                          fontSize: '50px',
                          color: aula.estado === 'LIBRE' ? 'var(--color-secondary)' : aula.estado === 'EN_CLASE' ? 'var(--color-primary)' : aula.estado === 'NO_DISPONIBLE' ? 'var(--color-on-surface-variant)' : '#ff6b7a'
                        }}>
                          meeting_room
                        </span>
                        <span className="dash-badge" style={{
                          background: aula.estado === 'LIBRE' ? 'rgba(74,225,131,.15)' : aula.estado === 'EN_CLASE' ? 'rgba(146,204,255,.1)' : aula.estado === 'NO_DISPONIBLE' ? 'rgba(255,255,255,.05)' : 'rgba(255,107,122,.1)',
                          color: aula.estado === 'LIBRE' ? 'var(--color-secondary)' : aula.estado === 'EN_CLASE' ? 'var(--color-primary)' : aula.estado === 'NO_DISPONIBLE' ? 'var(--color-on-surface-variant)' : '#ff6b7a',
                          border: 'none', margin: 0
                        }}>
                          {aula.estado.replace('_', ' ')}
                        </span>
                      </div>
                      <h3 className="dash-card-title" style={{ fontSize: '22px' }}>{aula.label.startsWith('Salón') ? aula.label : `Salón ${aula.label}`}</h3>
                      <p className="dash-card-desc">Controla este espacio y revisa actividad reciente.</p>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                        <button className="dash-logout-btn" style={{ flex: 1, justifyContent: 'center', borderColor: 'var(--color-outline-variant)' }}
                          onClick={() => handleUpdateEstado(aula.id, aula.estado)}>
                          <span className="material-symbols-outlined">swap_horiz</span> Cambiar
                        </button>
                        <button className="dash-logout-btn" style={{ flex: 1, justifyContent: 'center', borderColor: 'var(--color-outline-variant)' }}
                          onClick={() => setActiveTab('historial')}>
                          <span className="material-symbols-outlined">history</span> Historial
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── USUARIOS ── */}
            {activeTab === 'salones' && (
              <SalonesAdminTab />
            )}
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
                  <form onSubmit={saveUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--color-surface-container-high)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-outline-variant)' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>{editingId ? 'Editar Usuario' : 'Crear Usuario'}</h4>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>Nombre</label>
                        <input type="text" value={formName} onChange={e => setFormName(e.target.value)} required style={inputStyle} placeholder="Juan Pérez" />
                      </div>
                      <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>Correo</label>
                        <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} required style={inputStyle} placeholder="usuario@uteq.edu.mx" />
                      </div>
                      <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>Rol</label>
                        <select value={formType} onChange={e => setFormType(e.target.value)} style={inputStyle}>
                          <option value="admin">Admin</option>
                          <option value="profesor">Profesor</option>
                        </select>
                      </div>
                      {!editingId && (
                        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>Contraseña inicial</label>
                          <input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} style={inputStyle} placeholder="Mín. 6 caracteres" />
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={cancelEdit} className="dash-logout-btn" style={{ borderColor: 'var(--color-outline-variant)' }}>Cancelar</button>
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
                            {['Nombre', 'Correo', 'Tipo', 'Acciones'].map(h => (
                              <th key={h} style={{ padding: '12px', color: 'var(--color-on-surface-variant)', fontWeight: 500, textAlign: h === 'Acciones' ? 'right' : 'left' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {usuarios.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid rgba(63,72,80,.4)' }}>
                              <td style={{ padding: '16px 12px' }}>{u.nombre}</td>
                              <td style={{ padding: '16px 12px', color: 'var(--color-on-surface-variant)' }}>{u.correo}</td>
                              <td style={{ padding: '16px 12px' }}>
                                <span className="dash-badge" style={{ background: u.tipo === 'admin' ? ADMIN_BG : 'rgba(146,204,255,.1)', color: u.tipo === 'admin' ? ADMIN_COLOR : 'var(--color-primary)', border: `1px solid ${u.tipo === 'admin' ? ADMIN_COLOR : 'rgba(146,204,255,.3)'}` }}>
                                  {(u.tipo ?? 'indefinido').toUpperCase()}
                                </span>
                              </td>
                              <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                                <button onClick={() => openEditForm(u)} style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer', marginRight: '16px' }}
                                  onMouseOver={e => e.currentTarget.style.color = 'var(--color-primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--color-on-surface-variant)'}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
                                </button>
                                <button onClick={() => deleteUser(u.id)} style={{ background: 'transparent', border: 'none', color: '#ff6b7a', cursor: 'pointer' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                          {usuarios.length === 0 && (
                            <tr><td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>No hay usuarios.</td></tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── HORARIOS ── */}
            {activeTab === 'horarios' && (
              <div className="dash-card" style={{ padding: '30px', margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                  <h3 className="dash-card-title" style={{ fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '28px' }}>schedule</span>
                    Gestión de Horarios
                  </h3>
                  <button className="dash-logout-btn" onClick={() => { setModalHorario(true); setErrorH('') }} style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                    <span className="material-symbols-outlined">add</span> Nuevo Horario
                  </button>
                </div>

                {loadingHorarios ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}><div className="hor-spinner" style={{ margin: '0 auto 16px' }} /><p style={{ color: 'var(--color-on-surface-variant)' }}>Cargando horarios...</p></div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
                          {['Profesor', 'Salón', 'Día', 'Horario', 'Materia', ''].map(h => (
                            <th key={h} style={{ padding: '12px', color: 'var(--color-on-surface-variant)', fontWeight: 500, textAlign: 'left', fontSize: '13px' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {horarios.map(h => (
                          <tr key={h.id} style={{ borderBottom: '1px solid rgba(63,72,80,.4)' }}>
                            <td style={{ padding: '14px 12px', fontSize: '14px' }}>{h.profesor?.nombre ?? h.profesor_id}</td>
                            <td style={{ padding: '14px 12px', fontSize: '14px' }}>{h.salon?.nombre ?? h.salon_id}</td>
                            <td style={{ padding: '14px 12px', fontSize: '14px' }}>{h.dia_semana}</td>
                            <td style={{ padding: '14px 12px', fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>{h.hora_inicio} – {h.hora_fin}</td>
                            <td style={{ padding: '14px 12px', fontSize: '14px' }}>{h.materia}</td>
                            <td style={{ padding: '14px 12px' }}>
                              <button onClick={() => eliminarHorario(h.id)} style={{ background: 'transparent', border: 'none', color: '#ff6b7a', cursor: 'pointer' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                        {horarios.length === 0 && <tr><td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>No hay horarios registrados.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── SOLICITUDES ── */}
            {activeTab === 'solicitudes' && (
              <div>
                <h3 style={{ fontSize: '22px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }}>pending_actions</span>
                  Solicitudes de Salón
                  {pendientes > 0 && <span className="notif-badge" style={{ position: 'static', fontSize: '13px', padding: '2px 8px' }}>{pendientes} pendiente{pendientes > 1 ? 's' : ''}</span>}
                </h3>
                {solicitudes.length === 0 ? (
                  <div className="dash-card" style={{ textAlign: 'center', padding: '60px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '16px' }}>inbox</span>
                    <p style={{ color: 'var(--color-on-surface-variant)' }}>No hay solicitudes.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {solicitudes.map(sol => (
                      <div className="dash-card" key={sol.id} style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                          <div>
                            <p style={{ fontWeight: 600, marginBottom: '6px' }}>{sol.profesor?.nombre} — {sol.salon?.nombre}</p>
                            <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', marginBottom: '4px' }}>
                              {sol.fecha} · {sol.hora_inicio} – {sol.hora_fin}
                            </p>
                            <p style={{ fontSize: '14px' }}>Motivo: {sol.motivo}</p>
                            {sol.respuesta && <p style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--color-on-surface-variant)' }}>Respuesta: {sol.respuesta}</p>}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                            <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: sol.estado === 'PENDIENTE' ? 'rgba(251,191,36,.15)' : sol.estado === 'APROBADA' ? 'rgba(74,225,131,.15)' : 'rgba(255,107,122,.15)', color: sol.estado === 'PENDIENTE' ? '#fbbf24' : sol.estado === 'APROBADA' ? 'var(--color-secondary)' : '#ff6b7a' }}>
                              {sol.estado}
                            </span>
                            {sol.estado === 'PENDIENTE' && (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="dash-logout-btn" style={{ fontSize: '13px', padding: '6px 14px', borderColor: 'var(--color-secondary)', color: 'var(--color-secondary)' }}
                                  onClick={() => { setModalSol(sol.id); setAccionSol('APROBADA'); setRespuestaSol('') }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span> Aprobar
                                </button>
                                <button className="dash-logout-btn" style={{ fontSize: '13px', padding: '6px 14px', borderColor: '#ff6b7a', color: '#ff6b7a' }}
                                  onClick={() => { setModalSol(sol.id); setAccionSol('RECHAZADA'); setRespuestaSol('') }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span> Rechazar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── HISTORIAL ── */}
            {activeTab === 'historial' && (
              <div className="dash-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--color-outline-variant)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }}>history</span>
                  <h3 style={{ margin: 0, fontSize: '20px' }}>Historial de Accesos</h3>
                </div>
                {loadingAccesos ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}><div className="hor-spinner" style={{ margin: '0 auto 12px' }} /><p style={{ color: 'var(--color-on-surface-variant)' }}>Cargando...</p></div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-outline-variant)', background: 'rgba(255,255,255,.02)' }}>
                          {['Tipo', 'Profesor', 'Salón', 'Método', 'Fecha'].map(h => (
                            <th key={h} style={{ padding: '14px 18px', textAlign: 'left', color: 'var(--color-on-surface-variant)', fontWeight: 500, fontSize: '13px' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {accesos.map(a => (
                          <tr key={a.id} style={{ borderBottom: '1px solid rgba(63,72,80,.4)' }}>
                            <td style={{ padding: '14px 18px' }}>
                              <span style={{ color: a.tipo === 'ENTRADA' ? 'var(--color-secondary)' : a.tipo === 'DENEGADO' ? '#ff6b7a' : a.tipo === 'EXCEPCION' ? '#fbbf24' : 'var(--color-primary)', fontWeight: 500, fontSize: '13px' }}>
                                {a.tipo}
                              </span>
                            </td>
                            <td style={{ padding: '14px 18px', fontSize: '14px' }}>{a.profesor?.nombre ?? '—'}</td>
                            <td style={{ padding: '14px 18px', fontSize: '14px' }}>{a.salon?.nombre ?? '—'}</td>
                            <td style={{ padding: '14px 18px', fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>{a.metodo}</td>
                            <td style={{ padding: '14px 18px', fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>{formatFecha(a.created_at)}</td>
                          </tr>
                        ))}
                        {accesos.length === 0 && <tr><td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>Sin registros.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── PERFIL ── */}
            {activeTab === 'perfil' && (
              <div className="dash-card" style={{ padding: '40px', maxWidth: '600px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', borderBottom: '1px solid var(--color-outline-variant)', paddingBottom: '30px', marginBottom: '30px' }}>
                  <div className="dash-welcome-icon" style={{ borderColor: ADMIN_GLOW, background: ADMIN_BG, width: '90px', height: '90px' }}>
                    <span className="material-symbols-outlined" style={{ color: ADMIN_COLOR, fontSize: '48px' }}>admin_panel_settings</span>
                  </div>
                  <div>
                    <h2 style={{ margin: '0 0 10px 0', fontSize: '28px' }}>{usuario.nombre}</h2>
                    <span className="dash-badge" style={{ backgroundColor: ADMIN_BG, color: ADMIN_COLOR, borderColor: ADMIN_COLOR }}>ADMINISTRADOR</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {[{ icon: 'mail', label: 'Correo Institucional', value: usuario.correo }, { icon: 'badge', label: 'Rol en el Sistema', value: usuario.tipo }].map(f => (
                    <div key={f.label}>
                      <label style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{f.icon}</span>{f.label}
                      </label>
                      <p style={{ margin: 0, fontSize: '16px', background: 'var(--color-surface-container-high)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-outline-variant)', textTransform: 'capitalize' }}>
                        {f.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Modal Responder Solicitud */}
      {modalSol && (
        <div className="hor-overlay" onClick={e => e.target === e.currentTarget && setModalSol(null)}>
          <div className="hor-modal">
            <div className="hor-modal-header">
              <div className="hor-modal-title-row">
                <span className="material-symbols-outlined hor-modal-icon" style={{ color: accionSol === 'APROBADA' ? 'var(--color-secondary)' : '#ff6b7a' }}>
                  {accionSol === 'APROBADA' ? 'check_circle' : 'cancel'}
                </span>
                <h2 className="hor-modal-title">{accionSol === 'APROBADA' ? 'Aprobar' : 'Rechazar'} solicitud</h2>
              </div>
              <button className="hor-close-btn" onClick={() => setModalSol(null)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>Mensaje para el profesor (opcional)</label>
              <textarea rows={3} style={{ ...inputStyle, resize: 'vertical', width: '100%', boxSizing: 'border-box' }} placeholder="Escribe una respuesta..." value={respuestaSol} onChange={e => setRespuestaSol(e.target.value)} />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button className="hor-cancel-btn" onClick={() => setModalSol(null)} disabled={procesandoSol}>Cancelar</button>
                <button className="dash-logout-btn" disabled={procesandoSol} onClick={confirmarSolicitud}
                  style={{ borderColor: accionSol === 'APROBADA' ? 'var(--color-secondary)' : '#ff6b7a', color: accionSol === 'APROBADA' ? 'var(--color-secondary)' : '#ff6b7a', background: accionSol === 'APROBADA' ? 'rgba(74,225,131,.1)' : 'rgba(255,107,122,.1)' }}>
                  {procesandoSol ? <><div className="hor-btn-spinner" />Procesando...</> : <><span className="material-symbols-outlined">send</span>Confirmar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Horario */}
      {modalHorario && (
        <div className="hor-overlay" onClick={e => e.target === e.currentTarget && setModalHorario(false)}>
          <div className="hor-modal">
            <div className="hor-modal-header">
              <div className="hor-modal-title-row">
                <span className="material-symbols-outlined hor-modal-icon">schedule</span>
                <h2 className="hor-modal-title">Nuevo Horario</h2>
              </div>
              <button className="hor-close-btn" onClick={() => setModalHorario(false)}><span className="material-symbols-outlined">close</span></button>
            </div>
            {errorH && <div className="hor-error-banner"><span className="material-symbols-outlined">error</span>{errorH}</div>}
            <form onSubmit={guardarHorario} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>ID del Profesor</label>
                  <select style={inputStyle} required value={hForm.profesor_id} onChange={e => setHForm(f => ({ ...f, profesor_id: e.target.value }))}>
                    <option value="">Seleccionar...</option>
                    {usuarios.filter(u => u.tipo === 'profesor').map(u => (
                      <option key={u.id} value={u.id}>{u.nombre}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>Salón</label>
                  <select style={inputStyle} required value={hForm.salon_id} onChange={e => setHForm(f => ({ ...f, salon_id: e.target.value }))}>
                    <option value="">Seleccionar...</option>
                    {aulas.map(a => (
                      <option key={a.id} value={a.id}>{a.label.startsWith('Salón') ? a.label : `Salón ${a.label}`}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 130px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>Día</label>
                  <select style={inputStyle} value={hForm.dia_semana} onChange={e => setHForm(f => ({ ...f, dia_semana: e.target.value as DiaSemana }))}>
                    {(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'] as DiaSemana[]).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>Inicio</label>
                  <input type="time" required style={inputStyle} value={hForm.hora_inicio} onChange={e => setHForm(f => ({ ...f, hora_inicio: e.target.value }))} />
                </div>
                <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>Fin</label>
                  <input type="time" required style={inputStyle} value={hForm.hora_fin} onChange={e => setHForm(f => ({ ...f, hora_fin: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>Materia</label>
                <input type="text" required style={inputStyle} placeholder="Ej. Programación Web" value={hForm.materia} onChange={e => setHForm(f => ({ ...f, materia: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="hor-cancel-btn" onClick={() => setModalHorario(false)} disabled={creandoH}>Cancelar</button>
                <button type="submit" className="dash-logout-btn" disabled={creandoH} style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', background: 'rgba(146,204,255,.1)' }}>
                  {creandoH ? <><div className="hor-btn-spinner" />Guardando...</> : <><span className="material-symbols-outlined">save</span>Guardar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
