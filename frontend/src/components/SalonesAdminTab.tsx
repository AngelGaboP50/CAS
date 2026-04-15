// src/components/SalonesAdminTab.tsx — archivo NUEVO
// Pestaña completa para gestionar salones desde el panel admin:
// crear, editar nombre/capacidad/piso, cambiar estado, eliminar

import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAulas, type EstadoAula } from '../hooks/useAulas'

const ESTADOS: EstadoAula[] = ['LIBRE', 'EN_CLASE', 'ALERTA', 'EXCEPCION', 'NO_DISPONIBLE']

const ESTADO_COLOR: Record<EstadoAula, string> = {
  LIBRE:         'var(--color-secondary)',
  EN_CLASE:      'var(--color-primary)',
  ALERTA:        '#fbbf24',
  EXCEPCION:     '#ff6b7a',
  NO_DISPONIBLE: 'var(--color-on-surface-variant)',
}

const ESTADO_LABEL: Record<EstadoAula, string> = {
  LIBRE:         'Libre',
  EN_CLASE:      'En clase',
  ALERTA:        'Alerta',
  EXCEPCION:     'Excepción',
  NO_DISPONIBLE: 'No disponible',
}

interface FormSalon {
  nombre: string
  capacidad: string
  piso: string
  estado: EstadoAula
}

const FORM_VACIO: FormSalon = { nombre: '', capacidad: '30', piso: '1', estado: 'LIBRE' }

export default function SalonesAdminTab() {
  const { aulas, loading, fetchAulas } = useAulas()

  const [modalOpen, setModalOpen]   = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm]             = useState<FormSalon>(FORM_VACIO)
  const [guardando, setGuardando]   = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [errorMsg, setErrorMsg]     = useState('')
  const [confirmEliminar, setConfirmEliminar] = useState<string | null>(null)

  const inputStyle: React.CSSProperties = {
    padding: '10px 14px', borderRadius: '8px',
    background: 'var(--color-bg)', border: '1px solid var(--color-outline-variant)',
    color: 'var(--color-on-surface)', outline: 'none',
    fontFamily: 'inherit', fontSize: '14px', width: '100%', boxSizing: 'border-box' as const
  }

  const abrirCrear = () => {
    setEditandoId(null)
    setForm(FORM_VACIO)
    setErrorMsg('')
    setModalOpen(true)
  }

  const abrirEditar = (aula: typeof aulas[0]) => {
    setEditandoId(aula.id)
    setForm({
      nombre:    aula.label.startsWith('Salón') ? aula.label : `Salón ${aula.label}`,
      capacidad: '30',
      piso:      '1',
      estado:    aula.estado,
    })
    setErrorMsg('')
    setModalOpen(true)
  }

  const cerrarModal = () => {
    if (guardando) return
    setModalOpen(false)
    setEditandoId(null)
    setErrorMsg('')
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) { setErrorMsg('El nombre es requerido'); return }
    setGuardando(true)
    setErrorMsg('')

    try {
      if (editandoId) {
        // Actualizar salón existente
        const { error } = await supabase
          .from('salones')
          .update({
            nombre:    form.nombre.trim(),
            estado:    form.estado,
            activo:    form.estado !== 'NO_DISPONIBLE',
            capacidad: parseInt(form.capacidad) || 30,
            piso:      parseInt(form.piso) || 1,
          })
          .eq('id', editandoId)
        if (error) throw error
      } else {
        // Crear nuevo salón
        const { error } = await supabase
          .from('salones')
          .insert([{
            nombre:    form.nombre.trim(),
            estado:    form.estado,
            activo:    form.estado !== 'NO_DISPONIBLE',
            capacidad: parseInt(form.capacidad) || 30,
            piso:      parseInt(form.piso) || 1,
          }])
        if (error) throw error
      }

      await fetchAulas()
      setModalOpen(false)
      setEditandoId(null)
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Error al guardar el salón')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id: string) => {
    setEliminando(id)
    try {
      const { error } = await supabase.from('salones').delete().eq('id', id)
      if (error) throw error
      await fetchAulas()
      setConfirmEliminar(null)
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message)
    } finally {
      setEliminando(null)
    }
  }

  const cambiarEstadoRapido = async (id: string, estadoActual: EstadoAula) => {
    const siguiente = ESTADOS[(ESTADOS.indexOf(estadoActual) + 1) % ESTADOS.length]
    const { error } = await supabase
      .from('salones')
      .update({ estado: siguiente, activo: siguiente !== 'NO_DISPONIBLE' })
      .eq('id', id)
    if (!error) await fetchAulas()
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ fontSize: '22px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }}>meeting_room</span>
          Gestión de Salones
          <span style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', fontWeight: 400 }}>
            ({aulas.length} registrados)
          </span>
        </h3>
        <button className="dash-logout-btn"
          style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', background: 'rgba(146,204,255,.1)' }}
          onClick={abrirCrear}>
          <span className="material-symbols-outlined">add</span>
          Nuevo Salón
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-on-surface-variant)' }}>
          <div className="hor-spinner" style={{ margin: '0 auto 16px' }} />
          <p>Cargando salones...</p>
        </div>
      ) : aulas.length === 0 ? (
        <div className="dash-card" style={{ textAlign: 'center', padding: '60px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '56px', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '16px' }}>
            meeting_room
          </span>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '20px' }}>
            No hay salones registrados todavía.
          </p>
          <button className="dash-logout-btn"
            style={{ margin: '0 auto', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
            onClick={abrirCrear}>
            <span className="material-symbols-outlined">add</span> Crear primer salón
          </button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '580px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-outline-variant)', background: 'rgba(255,255,255,.02)' }}>
                {['Nombre', 'Estado', 'Capacidad', 'Piso', 'Acciones'].map(h => (
                  <th key={h} style={{
                    padding: '13px 16px', textAlign: 'left',
                    color: 'var(--color-on-surface-variant)', fontWeight: 500, fontSize: '13px'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aulas.map(aula => (
                <tr key={aula.id}
                  style={{ borderBottom: '1px solid rgba(63,72,80,.4)', transition: 'background .15s' }}
                  onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>

                  <td style={{ padding: '14px 16px', fontWeight: 500 }}>
                    {aula.label.startsWith('Salón') ? aula.label : `Salón ${aula.label}`}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <button
                      onClick={() => cambiarEstadoRapido(aula.id, aula.estado)}
                      title="Clic para cambiar estado"
                      style={{
                        padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                        cursor: 'pointer', border: '1px solid',
                        background: `${ESTADO_COLOR[aula.estado]}22`,
                        color: ESTADO_COLOR[aula.estado],
                        borderColor: `${ESTADO_COLOR[aula.estado]}55`,
                        fontFamily: 'inherit', transition: 'filter .15s'
                      }}
                      onMouseOver={e => (e.currentTarget.style.filter = 'brightness(1.2)')}
                      onMouseOut={e => (e.currentTarget.style.filter = 'none')}
                    >
                      {ESTADO_LABEL[aula.estado]}
                    </button>
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>
                    — personas
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>
                    Piso —
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {/* Editar */}
                      <button
                        onClick={() => abrirEditar(aula)}
                        title="Editar salón"
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                        onMouseOver={e => { e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.background = 'rgba(146,204,255,.1)' }}
                        onMouseOut={e => { e.currentTarget.style.color = 'var(--color-on-surface-variant)'; e.currentTarget.style.background = 'transparent' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
                      </button>

                      {/* Eliminar */}
                      {confirmEliminar === aula.id ? (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#ff6b7a' }}>¿Eliminar?</span>
                          <button
                            onClick={() => eliminar(aula.id)}
                            disabled={eliminando === aula.id}
                            style={{ background: 'rgba(255,107,122,.15)', border: '1px solid #ff6b7a', color: '#ff6b7a', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit' }}>
                            {eliminando === aula.id ? '...' : 'Sí'}
                          </button>
                          <button
                            onClick={() => setConfirmEliminar(null)}
                            style={{ background: 'transparent', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface-variant)', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit' }}>
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmEliminar(aula.id)}
                          title="Eliminar salón"
                          style={{ background: 'transparent', border: 'none', color: '#ff6b7a', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                          onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,107,122,.1)')}
                          onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear / editar */}
      {modalOpen && (
        <div className="hor-overlay" onClick={e => e.target === e.currentTarget && cerrarModal()}>
          <div className="hor-modal">
            <div className="hor-modal-header">
              <div className="hor-modal-title-row">
                <span className="material-symbols-outlined hor-modal-icon">meeting_room</span>
                <h2 className="hor-modal-title">{editandoId ? 'Editar Salón' : 'Nuevo Salón'}</h2>
              </div>
              <button className="hor-close-btn" onClick={cerrarModal} disabled={guardando}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {errorMsg && (
              <div className="hor-error-banner">
                <span className="material-symbols-outlined">error</span> {errorMsg}
              </div>
            )}

            <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Nombre */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                  Nombre del salón <span style={{ color: '#ff6b7a' }}>*</span>
                </label>
                <input
                  type="text" required style={inputStyle}
                  placeholder="Ej. Salón A1, Laboratorio 3, Aula Magna..."
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  disabled={guardando}
                />
              </div>

              {/* Capacidad + Piso */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>Capacidad (personas)</label>
                  <input
                    type="number" min="1" max="500" style={inputStyle}
                    value={form.capacidad}
                    onChange={e => setForm(f => ({ ...f, capacidad: e.target.value }))}
                    disabled={guardando}
                  />
                </div>
                <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>Piso</label>
                  <input
                    type="number" min="1" max="20" style={inputStyle}
                    value={form.piso}
                    onChange={e => setForm(f => ({ ...f, piso: e.target.value }))}
                    disabled={guardando}
                  />
                </div>
              </div>

              {/* Estado inicial */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>Estado inicial</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {ESTADOS.map(est => (
                    <button
                      key={est} type="button"
                      onClick={() => setForm(f => ({ ...f, estado: est }))}
                      disabled={guardando}
                      style={{
                        padding: '6px 14px', borderRadius: '16px', fontSize: '12px', fontWeight: 600,
                        cursor: 'pointer', border: '1px solid', fontFamily: 'inherit', transition: 'all .15s',
                        background: form.estado === est ? `${ESTADO_COLOR[est]}22` : 'transparent',
                        color: form.estado === est ? ESTADO_COLOR[est] : 'var(--color-on-surface-variant)',
                        borderColor: form.estado === est ? `${ESTADO_COLOR[est]}88` : 'var(--color-outline-variant)',
                      }}>
                      {ESTADO_LABEL[est]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="hor-cancel-btn" onClick={cerrarModal} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="dash-logout-btn" disabled={guardando}
                  style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', background: 'rgba(146,204,255,.1)' }}>
                  {guardando
                    ? <><div className="hor-btn-spinner" />{editandoId ? 'Guardando...' : 'Creando...'}</>
                    : <><span className="material-symbols-outlined">save</span>{editandoId ? 'Guardar cambios' : 'Crear salón'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
