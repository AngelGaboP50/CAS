import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useSolicitudes } from '../hooks/useSolicitudes'
import './DashboardPage.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function getUsuario() {
  try { return JSON.parse(sessionStorage.getItem('usuario') ?? '') } catch { return null }
}

// Busca el salón en la DB por su id o por su nombre/label
// Retorna { nombre, realId } para usar el ID real de la DB en las solicitudes
async function fetchSalonInfo(salon_id_o_nombre: string): Promise<{ nombre: string; realId: string }> {
  try {
    const token = sessionStorage.getItem('token')
    const res = await fetch(`${API_URL}/api/salones`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) return { nombre: `Salón ${salon_id_o_nombre}`, realId: salon_id_o_nombre }
    const data = await res.json()
    const salones: any[] = Array.isArray(data) ? data : (data.salones ?? [])

    // Buscar primero por id exacto
    let salon = salones.find((s) => String(s.id) === String(salon_id_o_nombre))

    // Si no encontró por id, buscar por nombre/label que incluya el número
    // Ej: salon_id_o_nombre='11' debe encontrar { label:'Salón 11', id:1 }
    if (!salon) {
      salon = salones.find(
        (s) =>
          (s.label && (s.label === salon_id_o_nombre || s.label.endsWith(` ${salon_id_o_nombre}`))) ||
          (s.nombre && (s.nombre === salon_id_o_nombre || s.nombre.endsWith(` ${salon_id_o_nombre}`)))
      )
    }

    if (salon) {
      return {
        nombre: salon.nombre ?? salon.label ?? `Salón ${salon_id_o_nombre}`,
        realId: String(salon.id),
      }
    }
    return { nombre: `Salón ${salon_id_o_nombre}`, realId: salon_id_o_nombre }
  } catch {
    return { nombre: `Salón ${salon_id_o_nombre}`, realId: salon_id_o_nombre }
  }
}

export default function QrAccessPage() {
  const { salon_id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const usuario = getUsuario()

  const token = searchParams.get('token')

  // Fase del flujo
  const [fase, setFase] = useState<
    'loading' | 'no-auth' | 'no-role' | 'welcome' | 'qr-check' | 'granted' | 'requires-request' | 'waiting' | 'denied'
  >('loading')

  const [mensaje, setMensaje] = useState('')
  const [nombreSalon, setNombreSalon] = useState('')
  // realSalonId = el id REAL en la base de datos (puede diferir del param de la URL)
  const [realSalonId, setRealSalonId] = useState<string>('1')
  const [timeLeft, setTimeLeft] = useState(3600)
  const [solicitudId, setSolicitudId] = useState<string | null>(null)

  const { crearSolicitud, checkEstadoSolicitud } = useSolicitudes()

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      // 1. Sin sesión → redirigir al login guardando la URL
      if (!usuario) {
        sessionStorage.setItem('returnUrl', window.location.pathname + window.location.search)
        navigate('/login')
        return
      }

      // 2. No es profesor → mostrar pantalla de error limpia (sin alert)
      const esProfesor =
        usuario.tipo === 'profesor' || Number(usuario.rol) === 1
      if (!esProfesor) {
        setFase('no-role')
        return
      }

      // 3. Cargar nombre e ID real del salón
      const salonParam = salon_id || '1'
      const info = await fetchSalonInfo(salonParam)
      setNombreSalon(info.nombre)
      setRealSalonId(info.realId)

      // 4. Si viene sin token de QR (acceso directo por URL sin escanear), mostrar
      //    el modal de bienvenida/solicitud directamente
      if (!token) {
        setFase('welcome')
        return
      }

      // 5. Validar el token QR con el backend
      setFase('qr-check')
      try {
        const jwtToken = sessionStorage.getItem('token')
        const res = await fetch(`${API_URL}/api/hardware/scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwtToken}`
          },
          body: JSON.stringify({ salon_id, token })
        })
        const data = await res.json()

        if (res.ok) {
          if (data.status === 'GRANTED') {
            setFase('granted')
            setMensaje(data.message)
          } else if (data.status === 'REQUIRES_REQUEST') {
            // En vez de pedir solicitud de golpe, mostramos el modal de bienvenida
            setFase('welcome')
          }
        } else {
          setFase('welcome') // Si falla el QR, mostramos el modal de solicitud igual
        }
      } catch {
        setFase('welcome')
      }
    }

    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Timer cuando acceso fue concedido ──────────────────────────────────────
  useEffect(() => {
    if (fase === 'granted') {
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            handleCerrarCerradura()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase])

  // ── Polling cuando la solicitud está en espera ─────────────────────────────
  useEffect(() => {
    let intervalId: number
    if (fase === 'waiting' && solicitudId) {
      intervalId = window.setInterval(async () => {
        try {
          const res = await checkEstadoSolicitud(solicitudId)
          if (res.estado === 'APROBADA') {
            setFase('granted')
            setMensaje('El administrador aprobó tu solicitud. ¡El salón está listo!')
          } else if (res.estado === 'RECHAZADA') {
            setFase('denied')
            setMensaje(
              'El administrador rechazó tu solicitud: ' + (res.respuesta || 'Sin motivo especificado.')
            )
          }
        } catch {
          // Silenciar errores de polling
        }
      }, 3000)
    }
    return () => clearInterval(intervalId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, solicitudId])

  // ── Acciones ───────────────────────────────────────────────────────────────
  const handleEnviarSolicitud = async () => {
    try {
      setFase('loading')
      // Usar realSalonId (el id de la DB) en vez del parámetro de la URL
      const id = await crearSolicitud(
        realSalonId,
        'Solicitud de acceso al salón desde código QR'
      )
      setSolicitudId(id)
      setFase('waiting')
    } catch (e: any) {
      // Mostrar el error real del backend
      const msg = e.message || 'Error al crear la solicitud.'
      setMensaje(msg)
      setFase('denied')
    }
  }

  const handleCerrarCerradura = async () => {
    try {
      const jwtToken = sessionStorage.getItem('token')
      await fetch(`${API_URL}/api/salones/${salon_id}/liberar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwtToken}` }
      })
    } catch {/* silenciar */}
    setFase('denied')
    setMensaje('Has abandonado el salón. El acceso fue cerrado.')
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // ── Renderizado ────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg, #111319)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: "'Inter', sans-serif",
        color: 'var(--color-on-surface, #e2e2eb)',
      }}
    >
      {/* ── Cargando ── */}
      {fase === 'loading' && (
        <div style={{ textAlign: 'center' }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '52px', color: 'var(--color-primary, #92ccff)', display: 'block', marginBottom: '16px' }}
          >
            qr_code_scanner
          </span>
          <p style={{ color: 'var(--color-on-surface-variant, #bfc7d2)', fontSize: '15px' }}>
            Verificando acceso...
          </p>
        </div>
      )}

      {/* ── No tiene el rol correcto ── */}
      {fase === 'no-role' && (
        <Card>
          <IconCircle color="#fbbf24" icon="warning" />
          <h2 style={{ margin: '16px 0 8px', color: '#fbbf24', fontSize: '20px' }}>
            Acceso exclusivo para profesores
          </h2>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', marginBottom: '24px' }}>
            Tu cuenta no tiene el rol de profesor. Por favor inicia sesión con las credenciales correctas.
          </p>
          <ActionBtn
            onClick={() => {
              sessionStorage.removeItem('token')
              sessionStorage.removeItem('usuario')
              navigate('/login')
            }}
            color="var(--color-primary)"
          >
            Iniciar sesión como profesor
          </ActionBtn>
        </Card>
      )}

      {/* ── Modal bienvenida: elegir entre ir al dashboard o solicitar ── */}
      {fase === 'welcome' && (
        <Card>
          <IconCircle color="var(--color-primary, #92ccff)" icon="meeting_room" />

          <div style={{ marginTop: '16px', marginBottom: '6px' }}>
            <span
              style={{
                background: 'rgba(146,204,255,0.12)',
                color: 'var(--color-primary)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                padding: '4px 12px',
                borderRadius: '20px',
              }}
            >
              Código QR detectado
            </span>
          </div>

          <h2 style={{ margin: '12px 0 4px', fontSize: '22px', fontWeight: 700 }}>
            ¡Hola, {usuario?.nombre ?? 'Profesor'}!
          </h2>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', marginBottom: '4px' }}>
            Estás tratando de solicitar el salón:
          </p>
          <div
            style={{
              background: 'rgba(146,204,255,0.08)',
              border: '1px solid rgba(146,204,255,0.25)',
              borderRadius: '10px',
              padding: '14px 20px',
              margin: '8px 0 24px',
              textAlign: 'center',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '28px', color: 'var(--color-primary)', display: 'block', marginBottom: '4px' }}
            >
              door_front
            </span>
            <strong style={{ fontSize: '20px', color: 'var(--color-primary)' }}>{nombreSalon}</strong>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', marginBottom: '20px' }}>
            ¿Qué deseas hacer?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            <ActionBtn onClick={handleEnviarSolicitud} color="var(--color-primary)">
              <span className="material-symbols-outlined" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '6px' }}>
                send
              </span>
              Enviar solicitud al administrador
            </ActionBtn>

            <ActionBtn onClick={() => navigate('/dashboard')} color="transparent" outline>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '6px' }}>
                dashboard
              </span>
              Ir al Dashboard
            </ActionBtn>
          </div>
        </Card>
      )}

      {/* ── Validando QR ── */}
      {fase === 'qr-check' && (
        <div style={{ textAlign: 'center' }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '52px', color: 'var(--color-secondary, #4ae183)', display: 'block', marginBottom: '16px' }}
          >
            lock_open
          </span>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '15px' }}>
            Validando tu código QR...
          </p>
        </div>
      )}

      {/* ── Acceso concedido ── */}
      {fase === 'granted' && (
        <Card>
          <IconCircle color="var(--color-secondary, #4ae183)" icon="check_circle" />
          <h2 style={{ margin: '16px 0 8px', color: 'var(--color-secondary)', fontSize: '22px' }}>
            ¡Acceso Concedido!
          </h2>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', marginBottom: '6px' }}>
            {mensaje || 'Bienvenido al salón.'}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', marginBottom: '20px' }}>
            {nombreSalon}
          </p>

          <div
            style={{
              fontSize: '40px',
              fontWeight: 800,
              letterSpacing: '0.05em',
              color: 'var(--color-secondary)',
              margin: '16px 0 24px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatTime(timeLeft)}
          </div>

          <ActionBtn onClick={handleCerrarCerradura} color="#ff6b7a">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '6px' }}>
              exit_to_app
            </span>
            Abandonar Salón
          </ActionBtn>
        </Card>
      )}

      {/* ── Esperando aprobación ── */}
      {fase === 'waiting' && (
        <Card>
          <IconCircle color="#fbbf24" icon="hourglass_empty" pulse />
          <h2 style={{ margin: '16px 0 8px', color: '#fbbf24', fontSize: '22px' }}>
            Solicitud Enviada
          </h2>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', marginBottom: '8px' }}>
            Tu solicitud para <strong style={{ color: 'var(--color-on-surface)' }}>{nombreSalon}</strong> fue enviada al administrador.
          </p>

          {/* Estado visible */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.3)',
              borderRadius: '10px',
              padding: '12px 16px',
              margin: '12px 0 20px',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: '#fbbf24', fontSize: '22px' }}>
              pending
            </span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#fbbf24' }}>
                Estado: EN ESPERA
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                Verificando cada 3 segundos...
              </p>
            </div>
            <div
              style={{
                marginLeft: 'auto',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#fbbf24',
                animation: 'blink 1.5s ease-in-out infinite',
              }}
            />
          </div>

          <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', marginBottom: '20px', textAlign: 'center' }}>
            No cierres esta pantalla. Se te notificará automáticamente cuando el administrador responda.
          </p>

          <ActionBtn onClick={() => navigate('/dashboard')} color="transparent" outline>
            Cancelar y volver al inicio
          </ActionBtn>
        </Card>
      )}

      {/* ── Acceso denegado / rechazado ── */}
      {fase === 'denied' && (
        <Card>
          <IconCircle color="#ff6b7a" icon="cancel" />
          <h2 style={{ margin: '16px 0 8px', color: '#ff6b7a', fontSize: '22px' }}>
            Acceso Denegado
          </h2>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', marginBottom: '24px' }}>
            {mensaje || 'No tienes acceso a este salón en este momento.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            <ActionBtn onClick={() => navigate('/dashboard')} color="var(--color-primary)">
              Volver al Dashboard
            </ActionBtn>
            <ActionBtn onClick={() => { setFase('welcome'); setMensaje('') }} color="transparent" outline>
              Intentar de nuevo
            </ActionBtn>
          </div>
        </Card>
      )}

      {/* Keyframe para el blink del dot */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.25; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ── Componentes auxiliares ─────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'rgba(30,31,38,0.9)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '36px 28px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
      }}
    >
      {children}
    </div>
  )
}

function IconCircle({
  color,
  icon,
  pulse = false,
}: {
  color: string
  icon: string
  pulse?: boolean
}) {
  return (
    <div
      style={{
        width: '72px',
        height: '72px',
        borderRadius: '50%',
        background: `${color}18`,
        border: `2px solid ${color}44`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: '36px',
          color,
          ...(pulse ? { animation: 'blink 1.5s ease-in-out infinite' } : {}),
        }}
      >
        {icon}
      </span>
    </div>
  )
}

function ActionBtn({
  children,
  onClick,
  color,
  outline = false,
}: {
  children: React.ReactNode
  onClick: () => void
  color: string
  outline?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '14px 20px',
        borderRadius: '10px',
        border: outline ? `1px solid rgba(146,204,255,0.25)` : 'none',
        background: outline ? 'transparent' : color,
        color: outline ? 'var(--color-on-surface-variant)' : (color === 'transparent' ? 'var(--color-on-surface-variant)' : '#fff'),
        fontFamily: "'Inter', sans-serif",
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'opacity 0.2s, transform 0.1s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
      }}
      onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
      onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {children}
    </button>
  )
}
