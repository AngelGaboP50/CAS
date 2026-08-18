// src/hooks/useSolicitudes.ts
// Frontend Mock Mode

import { useState, useCallback } from 'react'

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

const INITIAL_SOLICITUDES: Solicitud[] = []

export function useSolicitudes(_profesorId?: number, _soloAdmin = false) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>(() => {
    const local = sessionStorage.getItem('mock_solicitudes')
    return local ? JSON.parse(local) : INITIAL_SOLICITUDES
  })
  const [loading] = useState(false)
  const [error] = useState<string | null>(null)

  const fetchSolicitudes = useCallback(async () => {
    // No-op en modo mock
  }, [])

  const crearSolicitud = async (datos: NuevaSolicitud, profesor: { id: number; nombre: string; correo?: string }) => {
    const nueva: Solicitud = {
      id: `sol-${Date.now()}`,
      profesor_id: profesor.id,
      salon_id: datos.salon_id,
      fecha: datos.fecha,
      hora_inicio: datos.hora_inicio,
      hora_fin: datos.hora_fin,
      motivo: datos.motivo,
      estado: 'PENDIENTE',
      admin_id: null,
      respuesta: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      salon: { nombre: `Salón ${datos.salon_id}` },
      profesor: { nombre: profesor.nombre, correo: profesor.correo || 'profesor@uteq.edu.mx' }
    }
    const updated = [nueva, ...solicitudes]
    setSolicitudes(updated)
    sessionStorage.setItem('mock_solicitudes', JSON.stringify(updated))
  }

  const responderSolicitud = async (
    id: string,
    adminId: number,
    estado: 'APROBADA' | 'RECHAZADA',
    respuesta: string,
    _solicitud: Solicitud
  ) => {
    const updated = solicitudes.map(s => {
      if (s.id === id) {
        return {
          ...s,
          estado,
          admin_id: adminId,
          respuesta,
          updated_at: new Date().toISOString()
        }
      }
      return s
    })
    setSolicitudes(updated)
    sessionStorage.setItem('mock_solicitudes', JSON.stringify(updated))
  }

  const cancelarSolicitud = async (id: string) => {
    const updated = solicitudes.map(s => {
      if (s.id === id) {
        return {
          ...s,
          estado: 'CANCELADA' as const,
          updated_at: new Date().toISOString()
        }
      }
      return s
    })
    setSolicitudes(updated)
    sessionStorage.setItem('mock_solicitudes', JSON.stringify(updated))
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
