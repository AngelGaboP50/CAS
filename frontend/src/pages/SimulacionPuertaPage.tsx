import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../supabaseClient'
import './DashboardPage.css' // Reusamos estilos base

export default function SimulacionPuertaPage() {
  const { salon_id } = useParams()
  const [salonIdReal, setSalonIdReal] = useState<string | null>(salon_id === 'demo' ? null : (salon_id ?? null))
  const [salonNombre, setSalonNombre] = useState('Salón Demo')
  const [estadoPuerta, setEstadoPuerta] = useState<'CERRADA' | 'ABIERTA'>('CERRADA')
  const [solicitudActiva, setSolicitudActiva] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState(3600)

  useEffect(() => {
    async function fetchEstado() {
      if (!salonIdReal || salonIdReal === 'demo') {
        const { data } = await supabase.from('salones').select('id, nombre').ilike('nombre', '%3%').limit(1).single()
        if (data) {
          setSalonIdReal(data.id)
          setSalonNombre(data.nombre)
        }
      } else {
        const { data } = await supabase.from('salones').select('nombre').eq('id', salonIdReal).single()
        if (data) setSalonNombre(data.nombre)
      }
    }
    fetchEstado()
  }, [salonIdReal])

  useEffect(() => {
    if (!salonIdReal) return

    async function fetchEstado() {
      const { data } = await supabase
        .from('solicitudes_salon')
        .select('*, profesor:usuarios!profesor_id(nombre)')
        .eq('salon_id', salonIdReal)
        .eq('estado', 'APROBADA')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (data) {
        setEstadoPuerta('ABIERTA')
        setSolicitudActiva(data)
      } else {
        setEstadoPuerta('CERRADA')
        setSolicitudActiva(null)
      }
    }
    
    fetchEstado()

    // Escuchar cambios en la tabla solicitudes_salon para este salón
    const canal = supabase
      .channel('puerta_sim_' + salonIdReal)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitudes_salon', filter: `salon_id=eq.${salonIdReal}` },
        () => { fetchEstado() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [salonIdReal])

  useEffect(() => {
    if (estadoPuerta === 'ABIERTA' && solicitudActiva) {
      const targetTime = new Date(`${solicitudActiva.fecha}T${solicitudActiva.hora_fin}`).getTime()
      let interval: any

      const updateTimer = () => {
        const diffSeconds = Math.floor((targetTime - Date.now()) / 1000)
        if (diffSeconds <= 0) {
          setTimeLeft(0)
          clearInterval(interval)
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
  }, [estadoPuerta, solicitudActiva])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleCerrar = async () => {
    if (!solicitudActiva) return
    await supabase.from('solicitudes_salon').update({ estado: 'CANCELADA' }).eq('id', solicitudActiva.id)
    await supabase.from('salones').update({ estado: 'LIBRE' }).eq('id', salonIdReal)
    setEstadoPuerta('CERRADA')
    setSolicitudActiva(null)
  }

  const urlQr = `https://devnationqro.com/salones?solicitar=${salonIdReal || 'demo'}`

  return (
    <div className="dash-root" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="dash-glow dash-glow-1" />
      <div className="dash-glow dash-glow-2" />
      
      <div className="dash-card" style={{ textAlign: 'center', padding: '60px', width: '100%', maxWidth: '600px', border: estadoPuerta === 'ABIERTA' ? '2px solid var(--color-secondary)' : '2px solid #ff6b7a', transition: 'border 0.3s' }}>
        <h1 style={{ marginBottom: '10px', fontSize: '32px' }}>Puerta: {salonNombre}</h1>
        <h2 style={{ color: estadoPuerta === 'ABIERTA' ? 'var(--color-secondary)' : '#ff6b7a', fontSize: '24px', marginBottom: '40px' }}>
          {estadoPuerta === 'ABIERTA' ? '🔓 ABIERTA' : '🔒 CERRADA'}
        </h2>

        {estadoPuerta === 'CERRADA' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'var(--color-bg)', padding: '20px', borderRadius: '16px', display: 'inline-block' }}>
              <QRCodeSVG value={urlQr} size={256} fgColor="#ffffff" bgColor="transparent" />
            </div>
            <a href={urlQr} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline', fontSize: '14px' }}>
              Abrir vista de profesor en nueva pestaña (PC)
            </a>
          </div>
        )}

        {estadoPuerta === 'ABIERTA' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
            {solicitudActiva && (
              <div style={{ padding: '16px', background: 'rgba(146, 204, 255, 0.1)', borderRadius: '12px', border: '1px solid rgba(146, 204, 255, 0.3)', width: '100%' }}>
                <p style={{ margin: '0 0 8px', fontSize: '18px' }}>Profesor en Aula: <strong>{solicitudActiva.profesor?.nombre || 'Desconocido'}</strong></p>
                <p style={{ margin: 0, fontSize: '16px', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'text-bottom', marginRight: '4px' }}>schedule</span>
                  {solicitudActiva.hora_inicio} a {solicitudActiva.hora_fin}
                </p>
              </div>
            )}
            <div style={{ margin: '10px 0', fontSize: '48px', fontWeight: 'bold', color: 'var(--color-on-surface)' }}>
              {formatTime(timeLeft)}
            </div>
            <button onClick={handleCerrar} className="dash-logout-btn" style={{ borderColor: '#ff6b7a', color: '#ff6b7a', padding: '12px 24px', fontSize: '16px' }}>
              <span className="material-symbols-outlined">lock</span> Terminar Uso del Salón
            </button>
          </div>
        )}

        <p style={{ marginTop: '30px', color: 'var(--color-on-surface-variant)' }}>
          {estadoPuerta === 'CERRADA' ? 'Escanea el código QR para solicitar acceso.' : 'La puerta ha sido abierta temporalmente.'}
        </p>
      </div>
    </div>
  )
}
