import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useSolicitudes } from '../hooks/useSolicitudes'
import './DashboardPage.css'

function getUsuario() {
  try { return JSON.parse(sessionStorage.getItem('usuario') ?? '') } catch { return null }
}

export default function QrAccessPage() {
  const { salon_id } = useParams()
  const navigate = useNavigate()
  const usuario = getUsuario()
  const [salonId, setSalonId] = useState<string | null>(salon_id === 'demo' ? null : (salon_id ?? null))
  const [loading, setLoading] = useState(true)
  const [solicitudActivada, setSolicitudActivada] = useState<any>(null)
  const [estadoSolicitud, setEstadoSolicitud] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(3600) // 1 hora en segundos
  const { crearSolicitud } = useSolicitudes()

  useEffect(() => {
    // Verificar si está logueado
    if (!usuario) {
      sessionStorage.setItem('returnUrl', window.location.pathname)
      navigate('/login')
      return
    }

    // Verificar que sea profesor
    if (usuario.tipo !== 'profesor') {
      alert('Solo los profesores pueden solicitar acceso por este medio.')
      navigate('/dashboard')
      return
    }

    async function init() {
      let currentSalonId = salonId
      if (!currentSalonId || currentSalonId === 'demo') {
        const { data } = await supabase.from('salones').select('id').limit(1).single()
        if (data) {
          currentSalonId = data.id
          setSalonId(data.id)
        }
      }

      if (currentSalonId && usuario && usuario.id) {
        try {
          const { data: existing } = await supabase.from('solicitudes_salon')
            .select('*')
            .eq('salon_id', currentSalonId)
            .eq('profesor_id', usuario.id)
            .in('estado', ['PENDIENTE', 'APROBADA'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (existing) {
            setSolicitudActivada(existing)
            setEstadoSolicitud(existing.estado)
          } else {
            const fakeReq = {
              salon_id: currentSalonId,
              fecha: new Date().toISOString().split('T')[0],
              hora_inicio: new Date().toLocaleTimeString('es-MX', { hour12: false, hour: '2-digit', minute:'2-digit' }),
              hora_fin: new Date(Date.now() + 3600*1000).toLocaleTimeString('es-MX', { hour12: false, hour: '2-digit', minute:'2-digit' }),
              motivo: 'Apertura inmediata QR'
            }
            await crearSolicitud(fakeReq, { id: usuario.id, nombre: usuario.nombre })
            
            const { data: created } = await supabase.from('solicitudes_salon')
              .select('*')
              .eq('salon_id', currentSalonId)
              .eq('profesor_id', usuario.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            if (created) {
              setSolicitudActivada(created)
              setEstadoSolicitud(created.estado)
            }
          }
        } catch (e) {
          console.error(e)
        }
      }
      setLoading(false)
    }

    init()
  }, [])

  // Escuchar si el admin aprueba la solicitud
  useEffect(() => {
    if (!solicitudActivada?.id) return

    const canal = supabase
      .channel('req_watch_' + solicitudActivada.id)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'solicitudes_salon', filter: `id=eq.${solicitudActivada.id}` },
        (payload) => {
          setEstadoSolicitud(payload.new.estado)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [solicitudActivada?.id])

  // Timer de 1 hora o tiempo real cuando esté aprobada
  useEffect(() => {
    if (estadoSolicitud === 'APROBADA' && solicitudActivada) {
      const targetTime = new Date(`${solicitudActivada.fecha}T${solicitudActivada.hora_fin}`).getTime()
      let interval: any

      const updateTimer = () => {
        const diffSeconds = Math.floor((targetTime - Date.now()) / 1000)
        if (diffSeconds <= 0) {
          setTimeLeft(0)
          clearInterval(interval)
          handleCerrarCerradura()
          return false
        }
        setTimeLeft(diffSeconds)
        return true
      }

      if (updateTimer()) {
        interval = setInterval(updateTimer, 1000)
      }
      return () => clearInterval(interval)
    }
  }, [estadoSolicitud, solicitudActivada])

  const handleCerrarCerradura = async () => {
    if (!solicitudActivada?.id) return
    await supabase.from('solicitudes_salon').update({ estado: 'CANCELADA' }).eq('id', solicitudActivada.id)
    await supabase.from('salones').update({ estado: 'LIBRE' }).eq('id', solicitudActivada.salon_id)
    setEstadoSolicitud('CANCELADA')
    navigate('/dashboard')
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="dash-root" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Procesando solicitud de acceso...</p>
      </div>
    )
  }

  return (
    <div className="dash-root" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="dash-card" style={{ textAlign: 'center', padding: '40px', maxWidth: '400px', width: '100%' }}>
        {estadoSolicitud === 'PENDIENTE' && (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#fbbf24', animation: 'pulse 2s infinite' }}>hourglass_empty</span>
            <h2 style={{ marginTop: '20px' }}>Esperando aprobación</h2>
            <p style={{ color: 'var(--color-on-surface-variant)' }}>Se ha notificado al administrador. Por favor, espere.</p>
          </>
        )}
        
        {estadoSolicitud === 'APROBADA' && (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-secondary)' }}>meeting_room</span>
            <h2 style={{ marginTop: '20px', color: 'var(--color-secondary)' }}>¡Acceso Concedido!</h2>
            <p>La puerta está abierta.</p>

            <div style={{ margin: '40px 0', fontSize: '36px', fontWeight: 'bold' }}>
              {formatTime(timeLeft)}
            </div>

            <button onClick={handleCerrarCerradura} style={{ 
              background: '#ff6b7a', color: 'white', padding: '12px 24px', 
              borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', width: '100%' 
            }}>
              <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '8px' }}>lock</span> 
              Cerrar Cerradura
            </button>
          </>
        )}

        {(estadoSolicitud === 'RECHAZADA' || estadoSolicitud === 'CANCELADA') && (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#ff6b7a' }}>cancel</span>
            <h2 style={{ marginTop: '20px', color: '#ff6b7a' }}>Acceso denegado o expirado</h2>
            <button className="dash-logout-btn" style={{ marginTop: '20px' }} onClick={() => navigate('/dashboard')}>
              Volver al inicio
            </button>
          </>
        )}
      </div>
    </div>
  )
}
