import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useSolicitudes } from '../hooks/useSolicitudes'
import './DashboardPage.css'

function getUsuario() {
  try { return JSON.parse(sessionStorage.getItem('usuario') ?? '') } catch { return null }
}

export default function QrAccessPage() {
  const { salon_id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const usuario = getUsuario()
  
  const token = searchParams.get('token')
  const [loading, setLoading] = useState(true)
  const [estadoSolicitud, setEstadoSolicitud] = useState<string | null>(null) // 'PENDING', 'GRANTED', 'REQUIRES_REQUEST', 'DENIED'
  const [mensaje, setMensaje] = useState<string>('')
  const [timeLeft, setTimeLeft] = useState(3600) // 1 hora en segundos
  
  const { crearSolicitud } = useSolicitudes()

  useEffect(() => {
    // 1. Verificar si está logueado
    if (!usuario) {
      sessionStorage.setItem('returnUrl', window.location.pathname + window.location.search)
      navigate('/login')
      return
    }

    // 2. Verificar que sea profesor
    if (usuario.tipo !== 'profesor') {
      alert('Solo los profesores pueden acceder por este medio.')
      navigate('/dashboard')
      return
    }

    // 3. Validar con el backend el token
    async function validarQR() {
      if (!salon_id || !token) {
        setEstadoSolicitud('DENIED')
        setMensaje('Código QR inválido. Faltan parámetros.')
        setLoading(false)
        return
      }

      try {
        const jwtToken = sessionStorage.getItem('token')
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
        const res = await fetch(`${API_URL}/api/hardware/scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
          },
          body: JSON.stringify({ salon_id, token })
        })

        const data = await res.json()

        if (res.ok) {
          if (data.status === 'GRANTED') {
            setEstadoSolicitud('GRANTED')
            setMensaje(data.message)
          } else if (data.status === 'REQUIRES_REQUEST') {
            setEstadoSolicitud('REQUIRES_REQUEST')
            setMensaje(data.message)
          }
        } else {
          setEstadoSolicitud('DENIED')
          setMensaje(data.error || 'Error al validar el QR.')
        }
      } catch (error) {
        console.error(error)
        setEstadoSolicitud('DENIED')
        setMensaje('Error de conexión con el servidor.')
      } finally {
        setLoading(false)
      }
    }

    validarQR()
  }, [])

  // Timer si fue concedido
  useEffect(() => {
    if (estadoSolicitud === 'GRANTED') {
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
  }, [estadoSolicitud])

  const handleSolicitarAcceso = async () => {
    try {
      setLoading(true)
      // Lógica existente para crear una solicitud manual
      await crearSolicitud(salon_id || '', 'Olvido de llave / Fuera de horario')
      alert('Solicitud enviada al Administrador.')
      navigate('/solicitudes')
    } catch (e: any) {
      alert(e.message || 'Error al crear solicitud')
      setLoading(false)
    }
  }

  const handleCerrarCerradura = async () => {
    // Aquí podrías hacer otra llamada a la API para cerrar formalmente el salón
    setEstadoSolicitud('DENIED')
    setMensaje('Tu tiempo ha expirado o has cerrado la sesión del salón.')
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="dash-root" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }}>qr_code_scanner</span>
          <p style={{ marginTop: '16px' }}>Validando código QR...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dash-root" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="dash-card" style={{ textAlign: 'center', padding: '40px', maxWidth: '400px', width: '100%' }}>
        
        {estadoSolicitud === 'GRANTED' && (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-secondary)' }}>meeting_room</span>
            <h2 style={{ marginTop: '20px', color: 'var(--color-secondary)' }}>¡Acceso Concedido!</h2>
            <p>{mensaje}</p>

            <div style={{ margin: '40px 0', fontSize: '36px', fontWeight: 'bold' }}>
              {formatTime(timeLeft)}
            </div>

            <button onClick={handleCerrarCerradura} style={{ 
              background: '#ff6b7a', color: 'white', padding: '12px 24px', 
              borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', width: '100%' 
            }}>
              <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '8px' }}>lock</span> 
              Finalizar Clase
            </button>
          </>
        )}

        {estadoSolicitud === 'REQUIRES_REQUEST' && (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#fbbf24' }}>schedule</span>
            <h2 style={{ marginTop: '20px', color: '#fbbf24' }}>Fuera de Horario</h2>
            <p>{mensaje}</p>
            <p style={{ marginTop: '10px', fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>
              Si necesitas entrar a este salón, debes solicitar permiso a un administrador.
            </p>

            <button onClick={handleSolicitarAcceso} style={{ 
              background: 'var(--color-primary)', color: 'white', padding: '12px 24px', marginTop: '20px',
              borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', width: '100%' 
            }}>
              <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '8px' }}>send</span> 
              Solicitar Acceso al Admin
            </button>
            <button className="dash-logout-btn" style={{ marginTop: '10px' }} onClick={() => navigate('/dashboard')}>
              Cancelar
            </button>
          </>
        )}

        {estadoSolicitud === 'DENIED' && (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#ff6b7a' }}>cancel</span>
            <h2 style={{ marginTop: '20px', color: '#ff6b7a' }}>Acceso denegado</h2>
            <p>{mensaje}</p>
            <button className="dash-logout-btn" style={{ marginTop: '20px' }} onClick={() => navigate('/dashboard')}>
              Volver al inicio
            </button>
          </>
        )}
      </div>
    </div>
  )
}
