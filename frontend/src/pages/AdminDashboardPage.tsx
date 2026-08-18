// src/pages/AdminDashboardPage.tsx — REEMPLAZA el archivo actual completo
// Agrega: tab de Solicitudes, tab de Historial, gestión de Horarios, notificaciones navegables

import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

import './DashboardPage.css'
import { InteractiveMap } from '../components/InteractiveMap'
import { useAulas } from '../hooks/useAulas'
import { useNotificaciones } from '../hooks/useNotificaciones'
import { useSolicitudes } from '../hooks/useSolicitudes'
import { useAccesos } from '../hooks/useAccesos'
import SalonesAdminTab from '../components/SalonesAdminTab'

type Tab = 'principal' | 'usuarios' | 'salones' | 'solicitudes' | 'historial' | 'horarios' | 'perfil'

const ADMIN_COLOR = '#ff4d4f'
const ADMIN_GLOW = 'rgba(255, 77, 79, 0.4)'
const ADMIN_BG = 'rgba(255, 77, 79, 0.15)'

function getUsuario() {
  try {
    const raw = sessionStorage.getItem('usuario')
    if (!raw) return null
    const user = JSON.parse(raw)
    if (user) {
      if (user.rol === 1) user.tipo = 'profesor'
      if (user.rol === 2) user.tipo = 'admin'
      if (user.tipo === 'profesor') user.rol = 1
      if (user.tipo === 'admin') user.rol = 2
    }
    return user
  } catch {
    return null
  }
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [usuario] = useState(getUsuario)

  const { noLeidas } = useNotificaciones(usuario?.id)
  const [currentDate, setCurrentDate] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setCurrentDate(new Date()), 1000); return () => clearInterval(t) }, [])
  const timeStr = currentDate.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
  const dateStr = currentDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const [activeTab, setActiveTab] = useState<Tab>(location.state?.tab || 'principal')
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
  const { updateEstadoAula } = useAulas()

  // ── Solicitudes ──
  const solHook = useSolicitudes(undefined, true)
  const solicitudes = solHook.solicitudes
  const loadingS = solHook.loading
  const responderSolicitud = solHook.responderSolicitud
  const errorSol = solHook.error
  const [modalSol, setModalSol] = useState<string | null>(null)
  const [accionSol, setAccionSol] = useState<'APROBADA' | 'RECHAZADA'>('APROBADA')
  const [respuestaSol, setRespuestaSol] = useState('')
  const [procesandoSol, setProcesandoSol] = useState(false)

  // ── Historial ──
  const { accesos, loading: loadingAccesos, registrarAcceso } = useAccesos()

  // ── Horarios de profesores ──
  type EstadoHorario = 'pendiente' | 'autorizado' | 'rechazado'
  const [horarioFilter, setHorarioFilter] = useState<EstadoHorario | 'todos'>('pendiente')
  const [previewImgUrl, setPreviewImgUrl] = useState<string | null>(null)
  const [loadingHorarios, setLoadingHorarios] = useState(false)
  const [modalAsignarOpen, setModalAsignarOpen] = useState(false)
  const [asignarProfesorId, setAsignarProfesorId] = useState('')
  const [asignarFile, setAsignarFile] = useState<File | null>(null)
  const [asignando, setAsignando] = useState(false)
  const [asignarError, setAsignarError] = useState<string | null>(null)

  const [horariosData, setHorariosData] = useState<Array<{
    id: string; profesorId?: number; profesorNombre: string; profesorCorreo: string
    imagenUrl: string; estado: EstadoHorario; fecha: string; subidoPor?: string
  }>>([])

  const fetchHorarios = useCallback(async () => {
    setLoadingHorarios(true)
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const res = await fetch(`${API}/api/horarios`)
      if (res.ok) {
        const data = await res.json()
        const formatted = data.map((h: any) => ({
          id: String(h.id),
          profesorId: h.profesor_id,
          profesorNombre: h.profesor_nombre || 'Profesor',
          profesorCorreo: h.profesor_correo || '',
          imagenUrl: h.imagen_url.startsWith('http') ? h.imagen_url : `${API}${h.imagen_url}`,
          estado: h.estado as EstadoHorario,
          fecha: h.fecha_subida,
          subidoPor: h.subido_por
        }))
        setHorariosData(formatted)
      }
    } catch (err) {
      console.error('Error al cargar horarios:', err)
    } finally {
      setLoadingHorarios(false)
    }
  }, [])

  useEffect(() => {
    fetchHorarios()
  }, [fetchHorarios])

  const handleAutorizarHorario = async (id: string) => {
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const res = await fetch(`${API}/api/horarios/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'autorizado', admin_id: usuario?.id })
      })
      if (res.ok) {
        await fetchHorarios()
      }
    } catch (err) {
      console.error('Error al autorizar horario:', err)
    }
  }

  const handleRechazarHorario = async (id: string) => {
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const res = await fetch(`${API}/api/horarios/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'rechazado', admin_id: usuario?.id })
      })
      if (res.ok) {
        await fetchHorarios()
      }
    } catch (err) {
      console.error('Error al rechazar horario:', err)
    }
  }

  const handleAsignarHorarioSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!asignarProfesorId || !asignarFile) {
      setAsignarError('Por favor selecciona un profesor y una imagen.')
      return
    }
    setAsignando(true)
    setAsignarError(null)
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const formData = new FormData()
      formData.append('imagen', asignarFile)
      formData.append('profesor_id', asignarProfesorId)
      if (usuario?.id) {
        formData.append('admin_id', String(usuario.id))
      }

      const res = await fetch(`${API}/api/horarios/admin-asignar`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al asignar horario')

      setModalAsignarOpen(false)
      setAsignarFile(null)
      setAsignarProfesorId('')
      await fetchHorarios()
    } catch (err: any) {
      setAsignarError(err.message || 'Error al asignar horario')
    } finally {
      setAsignando(false)
    }
  }

  const horariosFiltrados = horariosData.filter(h => horarioFilter === 'todos' ? true : h.estado === horarioFilter)
  const horariosPendientesCount = horariosData.filter(h => h.estado === 'pendiente').length

  useEffect(() => {
    if (!usuario) { navigate('/login', { replace: true }); return }
    // rol 2 = Administrador
    if (usuario.rol !== 2) { navigate('/dashboard', { replace: true }); return }
    fetchUsuarios()
  }, [usuario, navigate])

  const fetchUsuarios = async () => {
    setLoadingUsuarios(true)
    try {
      const token = sessionStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/usuarios`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUsuarios(data)
      } else {
        throw new Error('Fallback to mock')
      }
    } catch {
      const localUsersRaw = sessionStorage.getItem('mock_usuarios')
      if (localUsersRaw) {
        setUsuarios(JSON.parse(localUsersRaw))
      } else {
        const mockUsers = [
          { id: '1', nombre: 'Administrador Local', correo: 'admin@uteq.edu.mx', rol: 2, tipo: 'admin', activo: 1, creado_en: new Date().toISOString() },
          { id: '101', nombre: 'Dr. Héctor Gómez', correo: 'hector.gomez@uteq.edu.mx', rol: 1, tipo: 'profesor', activo: 1, creado_en: new Date().toISOString() },
          { id: '102', nombre: 'Ing. Laura Martínez', correo: 'laura.martinez@uteq.edu.mx', rol: 1, tipo: 'profesor', activo: 1, creado_en: new Date().toISOString() },
          { id: '103', nombre: 'M.C. Carlos Pérez', correo: 'carlos.perez@uteq.edu.mx', rol: 1, tipo: 'profesor', activo: 1, creado_en: new Date().toISOString() }
        ]
        sessionStorage.setItem('mock_usuarios', JSON.stringify(mockUsers))
        setUsuarios(mockUsers)
      }
    } finally {
      setLoadingUsuarios(false)
    }
  }

  const handleLogout = () => { sessionStorage.removeItem('usuario'); navigate('/login', { replace: true }) }

  const openAddForm = () => { setIsEditing(true); setEditingId(null); setFormName(''); setFormEmail(''); setFormType('profesor'); setFormPassword('') }
  const openEditForm = (u: any) => { 
    setIsEditing(true); 
    setEditingId(u.id); 
    setFormName(u.nombre); 
    setFormEmail(u.correo); 
    // Mapear rol numérico a texto si es necesario
    const tipo = u.rol === 2 || u.tipo === 'admin' ? 'admin' : 'profesor';
    setFormType(tipo); 
    setFormPassword('') 
  }
  const cancelEdit = () => { setIsEditing(false); setEditingId(null) }

  const saveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = sessionStorage.getItem('token')
    const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const rolNum = formType === 'admin' ? 2 : 1
    try {
      if (editingId) {
        const res = await fetch(`${API}/api/usuarios/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ nombre: formName, correo: formEmail, rol: rolNum, activo: 1 })
        })
        if (!res.ok) throw new Error()
      } else {
        if (!formPassword) { alert('Debes ingresar una contraseña para el nuevo usuario'); return }
        const res = await fetch(`${API}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ nombre: formName, correo: formEmail, password: formPassword, rol: rolNum })
        })
        if (!res.ok) throw new Error()
      }
    } catch { 
      // Fallback a almacenamiento mock local
      const localUsersRaw = sessionStorage.getItem('mock_usuarios')
      let currentMockUsers = localUsersRaw ? JSON.parse(localUsersRaw) : []
      if (editingId) {
        currentMockUsers = currentMockUsers.map((u: any) => u.id === editingId ? { ...u, nombre: formName, correo: formEmail, rol: rolNum, tipo: formType } : u)
      } else {
        const nuevo = {
          id: `usr-${Date.now()}`,
          nombre: formName,
          correo: formEmail,
          rol: rolNum,
          tipo: formType,
          activo: 1,
          creado_en: new Date().toISOString()
        }
        currentMockUsers.push(nuevo)
      }
      sessionStorage.setItem('mock_usuarios', JSON.stringify(currentMockUsers))
    }
    setIsEditing(false)
    fetchUsuarios()
  }

  const deleteUser = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas desactivar este usuario?')) {
      const token = sessionStorage.getItem('token')
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      try {
        const res = await fetch(`${API}/api/usuarios/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error()
      } catch {
        // Fallback mock local
        const localUsersRaw = sessionStorage.getItem('mock_usuarios')
        if (localUsersRaw) {
          const currentMockUsers = JSON.parse(localUsersRaw)
          const updated = currentMockUsers.map((u: any) => u.id === id ? { ...u, activo: 0 } : u)
          sessionStorage.setItem('mock_usuarios', JSON.stringify(updated))
        }
      }
      fetchUsuarios()
    }
  }

  // Reactivar usuario (solo mock local, ya que la API PUT soporta editar activo)
  const reactivarUser = async (usuarioObj: any) => {
    if (window.confirm('¿Estás seguro de que deseas reactivar este usuario?')) {
      const token = sessionStorage.getItem('token')
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const rolNum = usuarioObj.rol === 2 || usuarioObj.tipo === 'admin' ? 2 : 1
      try {
        const res = await fetch(`${API}/api/usuarios/${usuarioObj.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ nombre: usuarioObj.nombre, correo: usuarioObj.correo, rol: rolNum, activo: 1 })
        })
        if (!res.ok) throw new Error()
      } catch {
        // Fallback mock
        const localUsersRaw = sessionStorage.getItem('mock_usuarios')
        if (localUsersRaw) {
          const currentMockUsers = JSON.parse(localUsersRaw)
          const updated = currentMockUsers.map((u: any) => u.id === usuarioObj.id ? { ...u, activo: 1 } : u)
          sessionStorage.setItem('mock_usuarios', JSON.stringify(updated))
        }
      }
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
      if (accionSol === 'APROBADA') {
        try { await updateEstadoAula(sol.salon_id, 'EN_CLASE') } catch (e) { console.error('Error al actualizar salón', e) }
        await registrarAcceso({
          salon_id: sol.salon_id,
          profesor_id: sol.profesor_id,
          tipo: 'EXCEPCION',
          metodo: 'SISTEMA',
          autorizado: true
        }).catch(console.error)
      } else {
        await registrarAcceso({
          salon_id: sol.salon_id,
          profesor_id: sol.profesor_id,
          tipo: 'DENEGADO',
          metodo: 'SISTEMA',
          autorizado: false,
          motivo_denegacion: respuestaSol || 'Rechazado por un administrador'
        }).catch(console.error)
      }
      setModalSol(null); setRespuestaSol('')
    } finally { setProcesandoSol(false) }
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
            { id: 'principal', icon: 'home', label: 'Inicio' },
            { id: 'salones', icon: 'meeting_room', label: 'Salones' },
            { id: 'usuarios', icon: 'group', label: 'Usuarios' },
            { id: 'solicitudes', icon: 'pending_actions', label: `Solicitudes${pendientes > 0 ? ` (${pendientes})` : ''}` },
            { id: 'horarios', icon: 'calendar_month', label: `Horarios${horariosPendientesCount > 0 ? ` (${horariosPendientesCount})` : ''}` },
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

          {/* Acceso directo: Demo Simulación */}
          <button
            style={sidebarItemStyle(false)}
            onClick={() => navigate('/simulacion')}
            title="Demo Simulación"
            onMouseOver={e => { e.currentTarget.style.color = '#a78bfa'; e.currentTarget.style.background = 'rgba(167,139,250,.1)' }}
            onMouseOut={e => { e.currentTarget.style.color = 'var(--color-on-surface-variant)'; e.currentTarget.style.background = 'transparent' }}
          >
            <span className="material-symbols-outlined">sensors</span>
            {isSidebarOpen && <span>Demo Simulación</span>}
          </button>

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
              </>
            )}

            {/* ── HORARIOS ── */}
            {activeTab === 'horarios' && (
              <div className="dash-card" style={{ padding: '30px', margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 className="dash-card-title" style={{ fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 6px 0' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '28px' }}>calendar_month</span>
                      Horarios de Profesores
                    </h3>
                    <span style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                      {horariosPendientesCount} pendiente{horariosPendientesCount !== 1 ? 's' : ''} de autorización
                    </span>
                  </div>
                  <button
                    className="admin-btn-authorize"
                    onClick={() => { setModalAsignarOpen(true); setAsignarError(null); }}
                    style={{ padding: '10px 20px', borderRadius: '12px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>upload_file</span>
                    Subir Horario a Profesor
                  </button>
                </div>

                {/* Filtros */}
                <div className="admin-hor-tabs">
                  {([['pendiente','pending','Pendientes'], ['autorizado','check_circle','Autorizados'], ['rechazado','cancel','Rechazados'], ['todos','list','Todos']] as const).map(([val, icon, label]) => (
                    <button key={val} className={`admin-hor-tab${horarioFilter === val ? ' admin-hor-tab--active' : ''}`} onClick={() => setHorarioFilter(val as any)}>
                      <span className="material-symbols-outlined">{icon}</span>
                      {label}
                      {val === 'pendiente' && horariosPendientesCount > 0 && <span className="admin-hor-tab-count">{horariosPendientesCount}</span>}
                    </button>
                  ))}
                </div>

                {loadingHorarios ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="hor-spinner" style={{ margin: '0 auto 12px' }} />
                    <p style={{ color: 'var(--color-on-surface-variant)' }}>Cargando horarios...</p>
                  </div>
                ) : horariosFiltrados.length === 0 ? (
                  <div className="admin-horarios-empty">
                    <span className="material-symbols-outlined">calendar_month</span>
                    <p>No hay horarios {horarioFilter !== 'todos' ? `con estado "${horarioFilter}"` : ''}.</p>
                  </div>
                ) : (
                  <div className="admin-horarios-list">
                    {horariosFiltrados.map(h => (
                      <div key={h.id} className="admin-horario-card">
                        <div
                          className="admin-horario-thumb-container"
                          onClick={() => setPreviewImgUrl(h.imagenUrl)}
                          title="Clic para ampliar horario"
                        >
                          <img src={h.imagenUrl} alt={`Horario ${h.profesorNombre}`} className="admin-horario-thumb" />
                          <div className="admin-horario-thumb-overlay">
                            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>zoom_in</span>
                          </div>
                        </div>

                        <div className="admin-horario-info">
                          <p className="admin-horario-name">{h.profesorNombre}</p>
                          <p className="admin-horario-meta">
                            <span>{h.profesorCorreo}</span>
                            <span>•</span>
                            <span>{new Date(h.fecha).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                            {h.subidoPor === 'admin' && (
                              <>
                                <span>•</span>
                                <span style={{ color: 'var(--color-primary)', fontSize: '11px', fontWeight: 600 }}>Asignado por Admin</span>
                              </>
                            )}
                          </p>
                          <div className="admin-horario-badges">
                            <span className={`admin-status-chip admin-status-chip--${h.estado}`}>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                                {h.estado === 'pendiente' ? 'pending' : h.estado === 'autorizado' ? 'check_circle' : 'cancel'}
                              </span>
                              {h.estado.charAt(0).toUpperCase() + h.estado.slice(1)}
                            </span>
                          </div>
                        </div>

                        <div className="admin-horario-actions">
                          {h.estado === 'pendiente' ? (
                            <>
                              <button className="admin-btn-authorize" onClick={() => handleAutorizarHorario(h.id)}>
                                <span className="material-symbols-outlined">check_circle</span>Autorizar
                              </button>
                              <button className="admin-btn-reject" onClick={() => handleRechazarHorario(h.id)}>
                                <span className="material-symbols-outlined">cancel</span>Rechazar
                              </button>
                              <button className="admin-btn-view" onClick={() => setPreviewImgUrl(h.imagenUrl)}>
                                <span className="material-symbols-outlined">visibility</span>Ver
                              </button>
                            </>
                          ) : (
                            <button className="admin-btn-view" onClick={() => setPreviewImgUrl(h.imagenUrl)}>
                              <span className="material-symbols-outlined">visibility</span>Ver Horario
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── SALONES ── */}
            {activeTab === 'salones' && (
              <SalonesAdminTab />
            )}
            {/* ── USUARIOS ── */}
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
                            {['Nombre', 'Correo', 'Tipo', 'Estado', 'Acciones'].map(h => (
                              <th key={h} style={{ padding: '12px', color: 'var(--color-on-surface-variant)', fontWeight: 500, textAlign: h === 'Acciones' ? 'right' : 'left' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {usuarios.map(u => {
                            const isUserActive = u.activo !== 0 && u.activo !== false;
                            return (
                              <tr key={u.id} style={{ borderBottom: '1px solid rgba(63,72,80,.4)', opacity: isUserActive ? 1 : 0.6 }}>
                                <td style={{ padding: '16px 12px' }}>{u.nombre}</td>
                                <td style={{ padding: '16px 12px', color: 'var(--color-on-surface-variant)' }}>{u.correo}</td>
                                <td style={{ padding: '16px 12px' }}>
                                  <span className="dash-badge" style={{ background: (u.rol === 2 || u.tipo === 'admin') ? ADMIN_BG : 'rgba(146,204,255,.1)', color: (u.rol === 2 || u.tipo === 'admin') ? ADMIN_COLOR : 'var(--color-primary)', border: `1px solid ${(u.rol === 2 || u.tipo === 'admin') ? ADMIN_COLOR : 'rgba(146,204,255,.3)'}` }}>
                                    {(u.rol === 2 || u.tipo === 'admin' ? 'admin' : 'profesor').toUpperCase()}
                                  </span>
                                </td>
                                <td style={{ padding: '16px 12px' }}>
                                  <span className="dash-badge" style={{
                                    background: isUserActive ? 'rgba(74,225,131,.15)' : 'rgba(255,107,122,.1)',
                                    color: isUserActive ? 'var(--color-secondary)' : '#ff6b7a',
                                    border: `1px solid ${isUserActive ? 'rgba(74,225,131,.3)' : 'rgba(255,107,122,.3)'}`
                                  }}>
                                    {isUserActive ? 'ACTIVO' : 'INACTIVO'}
                                  </span>
                                </td>
                                <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                                  <button onClick={() => openEditForm(u)} style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer', marginRight: '16px' }}
                                    onMouseOver={e => e.currentTarget.style.color = 'var(--color-primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--color-on-surface-variant)'}
                                    title="Editar usuario">
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
                                  </button>
                                  {isUserActive ? (
                                    <button onClick={() => deleteUser(u.id)} style={{ background: 'transparent', border: 'none', color: '#ff6b7a', cursor: 'pointer' }}
                                      title="Desactivar usuario">
                                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>block</span>
                                    </button>
                                  ) : (
                                    <button onClick={() => reactivarUser(u)} style={{ background: 'transparent', border: 'none', color: 'var(--color-secondary)', cursor: 'pointer' }}
                                      title="Reactivar usuario">
                                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check_circle</span>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {usuarios.length === 0 && (
                            <tr><td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>No hay usuarios.</td></tr>
                          )}
                        </tbody>
                      </table>
                    )}
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
                {errorSol && <div className="hor-error-banner" style={{marginBottom: '16px'}}>{errorSol}</div>}
                
                {loadingS ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}><div className="hor-spinner" style={{ margin: '0 auto 12px' }} /><p style={{ color: 'var(--color-on-surface-variant)' }}>Cargando solicitudes...</p></div>
                ) : solicitudes.length === 0 ? (
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

      {/* Modal Asignar Horario a Profesor */}
      {modalAsignarOpen && (
        <div className="hor-overlay" onClick={e => e.target === e.currentTarget && setModalAsignarOpen(false)}>
          <div className="hor-modal">
            <div className="hor-modal-header">
              <div className="hor-modal-title-row">
                <span className="material-symbols-outlined hor-modal-icon" style={{ color: 'var(--color-secondary)' }}>
                  upload_file
                </span>
                <h2 className="hor-modal-title">Subir Horario a Profesor</h2>
              </div>
              <button className="hor-close-btn" onClick={() => setModalAsignarOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAsignarHorarioSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {asignarError && (
                <div className="hor-error-banner">
                  <span className="material-symbols-outlined">error</span>{asignarError}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>Profesor</label>
                <select
                  value={asignarProfesorId}
                  onChange={e => setAsignarProfesorId(e.target.value)}
                  required
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                >
                  <option value="">-- Selecciona un profesor --</option>
                  {usuarios.filter(u => u.rol === 1 || u.tipo === 'profesor').map(u => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} ({u.correo})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>Archivo de Horario (JPG o PNG)</label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  required
                  onChange={e => setAsignarFile(e.target.files?.[0] || null)}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" className="hor-cancel-btn" onClick={() => setModalAsignarOpen(false)} disabled={asignando}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="dash-logout-btn"
                  disabled={asignando}
                  style={{ borderColor: 'var(--color-secondary)', color: 'var(--color-secondary)', background: 'rgba(74,225,131,.1)' }}
                >
                  {asignando ? (
                    <><div className="hor-btn-spinner" />Subiendo...</>
                  ) : (
                    <><span className="material-symbols-outlined">upload</span>Asignar y Autorizar</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview image modal */}
      {previewImgUrl && (
        <div className="admin-preview-overlay" onClick={() => setPreviewImgUrl(null)}>
          <button className="admin-preview-close" onClick={() => setPreviewImgUrl(null)}>
            <span className="material-symbols-outlined">close</span>
          </button>
          <img src={previewImgUrl} alt="Vista previa" className="admin-preview-img" onClick={e => e.stopPropagation()} />
        </div>
      )}

    </div>
  )
}
