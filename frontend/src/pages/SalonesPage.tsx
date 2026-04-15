// src/pages/SalonesPage.tsx
// Vista del PROFESOR: consulta de disponibilidad de salones en tiempo real

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAulas, type EstadoAula } from '../hooks/useAulas'
import { useSolicitudes } from '../hooks/useSolicitudes'
import './DashboardPage.css'

const ESTADO_LABEL: Record<EstadoAula, string> = {
  LIBRE:         'Libre',
  EN_CLASE:      'En clase',
  ALERTA:        'Alerta',
  EXCEPCION:     'Excepción',
  NO_DISPONIBLE: 'No disponible',
}

const ESTADO_COLOR: Record<EstadoAula, string> = {
  LIBRE:         'var(--color-secondary)',
  EN_CLASE:      'var(--color-primary)',
  ALERTA:        '#fbbf24',
  EXCEPCION:     '#ff6b7a',
  NO_DISPONIBLE: 'var(--color-on-surface-variant)',
}

function getUsuario() {
  try { return JSON.parse(sessionStorage.getItem('usuario') ?? '') } catch { return null }
}

export default function SalonesPage() {
  const navigate = useNavigate()
  const usuario = getUsuario()
  const { aulas, loading } = useAulas()
  const { crearSolicitud } = useSolicitudes(usuario?.id)

  const [filtro, setFiltro] = useState<EstadoAula | 'TODOS'>('TODOS')
  const [modalSolicitud, setModalSolicitud] = useState<{ salonId: string; nombre: string } | null>(null)
  const [form, setForm] = useState({ fecha: '', hora_inicio: '', hora_fin: '', motivo: '' })
  const [enviando, setEnviando] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const aulasFiltradas = useMemo(() =>
    filtro === 'TODOS' ? aulas : aulas.filter(a => a.estado === filtro),
    [aulas, filtro]
  )

  const handleSolicitar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalSolicitud || !usuario) return

    setEnviando(true)
    setErrorMsg('')
    try {
      await crearSolicitud(
        { salon_id: modalSolicitud.salonId, ...form },
        { id: usuario.id, nombre: usuario.nombre }
      )
      setSuccessMsg('Solicitud enviada correctamente. El administrador revisará tu petición.')
      setModalSolicitud(null)
      setForm({ fecha: '', hora_inicio: '', hora_fin: '', motivo: '' })
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Error al enviar la solicitud')
    } finally {
      setEnviando(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '10px 14px', borderRadius: '8px',
    background: 'var(--color-bg)', border: '1px solid var(--color-outline-variant)',
    color: 'var(--color-on-surface)', outline: 'none',
    fontFamily: 'inherit', fontSize: '14px', width: '100%', boxSizing: 'border-box'
  }

  return (
    <div className="dash-root">
      <div className="dash-glow dash-glow-1" />
      <div className="dash-glow dash-glow-2" />

      <header className="dash-header">
        <div className="dash-brand">
          <div className="dash-brand-bar" />
          <h1 className="dash-brand-title" style={{ fontSize: '18px' }}>Control de Acceso</h1>
        </div>
        <div className="dash-header-actions">
          <button className="dash-logout-btn" onClick={() => navigate('/dashboard')}>
            <span className="material-symbols-outlined">arrow_back</span> Volver
          </button>
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-welcome">
          <div className="dash-welcome-icon">
            <span className="material-symbols-outlined">meeting_room</span>
          </div>
          <div>
            <h2 className="dash-welcome-title">Disponibilidad de Salones</h2>
            <p className="dash-welcome-sub">Consulta el estado en tiempo real y solicita espacios disponibles.</p>
          </div>
        </div>

        {successMsg && (
          <div style={{ background: 'rgba(74,225,131,.15)', border: '1px solid rgba(74,225,131,.4)', borderRadius: '10px', padding: '14px 18px', color: 'var(--color-secondary)', marginBottom: '24px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span className="material-symbols-outlined">check_circle</span>
            {successMsg}
            <button onClick={() => setSuccessMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '28px' }}>
          {(['TODOS', 'LIBRE', 'EN_CLASE', 'NO_DISPONIBLE'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              style={{
                padding: '8px 18px', borderRadius: '20px', border: '1px solid',
                cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit',
                transition: 'all .2s',
                borderColor: filtro === f ? 'var(--color-primary)' : 'var(--color-outline-variant)',
                background: filtro === f ? 'rgba(146,204,255,.15)' : 'transparent',
                color: filtro === f ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
              }}
            >
              {f === 'TODOS' ? 'Todos' : ESTADO_LABEL[f as EstadoAula]}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-on-surface-variant)' }}>
            <div className="hor-spinner" style={{ margin: '0 auto 16px' }} />
            <p>Cargando salones...</p>
          </div>
        ) : (
          <div className="dash-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {aulasFiltradas.map(aula => (
              <div className="dash-card" key={aula.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '42px', color: ESTADO_COLOR[aula.estado] }}>
                    {aula.estado === 'LIBRE' ? 'door_open' : aula.estado === 'EN_CLASE' ? 'groups' : 'meeting_room'}
                  </span>
                  <span style={{
                    padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                    background: `${ESTADO_COLOR[aula.estado]}22`,
                    color: ESTADO_COLOR[aula.estado],
                    border: `1px solid ${ESTADO_COLOR[aula.estado]}55`,
                  }}>
                    {ESTADO_LABEL[aula.estado]}
                  </span>
                </div>

                <h3 className="dash-card-title">{aula.label.startsWith('Salón') ? aula.label : `Salón ${aula.label}`}</h3>
                <p className="dash-card-desc" style={{ marginBottom: '20px' }}>
                  Estado actualizado en tiempo real. {aula.estado === 'LIBRE' ? 'Puedes solicitar este espacio.' : 'Este salón no está disponible en este momento.'}
                </p>

                {aula.estado === 'LIBRE' && (
                  <button
                    className="dash-logout-btn"
                    style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--color-secondary)', color: 'var(--color-secondary)' }}
                    onClick={() => {
                      setModalSolicitud({ salonId: aula.id, nombre: aula.label })
                      setErrorMsg('')
                    }}
                  >
                    <span className="material-symbols-outlined">add_circle</span>
                    Solicitar uso temporal
                  </button>
                )}
              </div>
            ))}

            {aulasFiltradas.length === 0 && (
              <p style={{ color: 'var(--color-on-surface-variant)', gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>
                No hay salones con el filtro seleccionado.
              </p>
            )}
          </div>
        )}
      </main>

      <footer className="dash-footer">
        <p>© 2026 IDGS15 Equipo 6. TODOS LOS DERECHOS RESERVADOS.</p>
      </footer>

      {/* Modal Solicitud */}
      {modalSolicitud && (
        <div className="hor-overlay" onClick={e => e.target === e.currentTarget && setModalSolicitud(null)}>
          <div className="hor-modal">
            <div className="hor-modal-header">
              <div className="hor-modal-title-row">
                <span className="material-symbols-outlined hor-modal-icon">add_circle</span>
                <h2 className="hor-modal-title">Solicitar Salón {modalSolicitud.nombre}</h2>
              </div>
              <button className="hor-close-btn" onClick={() => setModalSolicitud(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {errorMsg && (
              <div className="hor-error-banner">
                <span className="material-symbols-outlined">error</span> {errorMsg}
              </div>
            )}

            <form onSubmit={handleSolicitar} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 0 8px' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>Fecha</label>
                  <input type="date" required style={inputStyle}
                    min={new Date().toISOString().split('T')[0]}
                    value={form.fecha}
                    onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
                </div>
                <div style={{ flex: '1 1 110px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>Hora inicio</label>
                  <input type="time" required style={inputStyle}
                    value={form.hora_inicio}
                    onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} />
                </div>
                <div style={{ flex: '1 1 110px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>Hora fin</label>
                  <input type="time" required style={inputStyle}
                    value={form.hora_fin}
                    onChange={e => setForm(f => ({ ...f, hora_fin: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>Motivo de uso</label>
                <textarea required rows={3} style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="Describe el motivo del uso del salón..."
                  value={form.motivo}
                  onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="hor-cancel-btn" onClick={() => setModalSolicitud(null)} disabled={enviando}>
                  Cancelar
                </button>
                <button type="submit" className="dash-logout-btn"
                  style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', background: 'rgba(146,204,255,.1)' }}
                  disabled={enviando}>
                  {enviando ? <><div className="hor-btn-spinner" />Enviando...</> : <><span className="material-symbols-outlined">send</span>Enviar solicitud</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
