// src/hooks/useSolicitudes.ts
// Hook para gestionar solicitudes de salón de profesores externos

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { notificarAdmins } from './useNotificaciones'

export type EstadoSolicitud = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'CANCELADA'

export interface Solicitud {
  id: string
  profesor_id: number
  salon_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  motivo: string
  estado: EstadoSolicitud
  admin_id: number | null
  respuesta: string | null
  created_at: string
  updated_at: string
  // Joined
  salon?: { nombre: string }
  profesor?: { nombre: string; correo: string }
}

export interface NuevaSolicitud {
  salon_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  motivo: string
}

export function useSolicitudes(profesorId?: number, soloAdmin = false) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSolicitudes = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('solicitudes_salon')
      .select(`
        *,
        salon:salones(nombre),
        profesor:usuarios!profesor_id(nombre, correo)
      `)
      .order('created_at', { ascending: false })

    if (profesorId && !soloAdmin) query = query.eq('profesor_id', profesorId)

    const { data, error: err } = await query

    if (err) {
      setError(err.message)
    } else {
      setSolicitudes((data as Solicitud[]) ?? [])
    }
    setLoading(false)
  }, [profesorId, soloAdmin])

  useEffect(() => {
    fetchSolicitudes()

    const channel = supabase
      .channel('solicitudes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_salon' }, () => {
        fetchSolicitudes()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchSolicitudes])

  const crearSolicitud = async (datos: NuevaSolicitud, profesor: { id: number; nombre: string }) => {
    const { error: err } = await supabase.from('solicitudes_salon').insert([{
      ...datos,
      profesor_id: profesor.id,
      estado: 'PENDIENTE',
    }])
    if (err) throw err

    await notificarAdmins(
      'Nueva solicitud de salón',
      `El profesor ${profesor.nombre} solicitó un salón para el ${datos.fecha} de ${datos.hora_inicio} a ${datos.hora_fin}.`,
      'info'
    )

    await fetchSolicitudes()
  }

  const responderSolicitud = async (
    id: string,
    adminId: number,
    estado: 'APROBADA' | 'RECHAZADA',
    respuesta: string,
    solicitud: Solicitud
  ) => {
    const { error: err } = await supabase
      .from('solicitudes_salon')
      .update({ estado, admin_id: adminId, respuesta })
      .eq('id', id)
    if (err) throw err

    // Notificar al profesor
    const { data: adminData } = await supabase
      .from('usuarios')
      .select('nombre')
      .eq('id', adminId)
      .single()

    const { error: notifErr } = await supabase.from('notificaciones').insert([{
      usuario_id: solicitud.profesor_id,
      titulo: estado === 'APROBADA' ? 'Solicitud Aprobada ✅' : 'Solicitud Rechazada ❌',
      mensaje: `Tu solicitud de salón para el ${solicitud.fecha} fue ${estado === 'APROBADA' ? 'aprobada' : 'rechazada'} por ${adminData?.nombre ?? 'el administrador'}. ${respuesta ? `Motivo: ${respuesta}` : ''}`,
      tipo: estado === 'APROBADA' ? 'info' : 'alerta',
    }])

    if (notifErr) console.error('Error al notificar al profesor:', notifErr)

    await fetchSolicitudes()
  }

  const cancelarSolicitud = async (id: string) => {
    const { error: err } = await supabase
      .from('solicitudes_salon')
      .update({ estado: 'CANCELADA' })
      .eq('id', id)
    if (err) throw err
    await fetchSolicitudes()
  }

  return {
    solicitudes,
    loading,
    error,
    fetchSolicitudes,
    crearSolicitud,
    responderSolicitud,
    cancelarSolicitud,
  }
}
