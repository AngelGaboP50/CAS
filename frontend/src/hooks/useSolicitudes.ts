import { useState, useCallback, useEffect } from 'react'

export type EstadoSolicitud = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'CANCELADA'

export interface Solicitud {
  id: string
  profesor_id: number
  salon_id: string
  fecha?: string
  hora_inicio?: string
  hora_fin?: string
  motivo: string
  estado: EstadoSolicitud
  admin_id: number | null
  respuesta: string | null
  created_at: string
  updated_at: string
  salon_nombre?: string
  profesor_nombre?: string
  profesor_correo?: string
}

export interface NuevaSolicitud {
  salon_id: string
  motivo: string
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Hook flexible: acepta parámetros opcionales (para compatibilidad con AdminDashboardPage)
// _profesorId e _isAdmin son ignorados actualmente (el backend filtra por token)
export function useSolicitudes(_profesorId?: number, _isAdmin?: boolean) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSolicitudes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = sessionStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/solicitudes`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Error al obtener solicitudes')
      }
      const data = await res.json()
      setSolicitudes(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-fetch al montar (útil para el panel admin)
  useEffect(() => {
    fetchSolicitudes()
  }, [fetchSolicitudes])

  const crearSolicitud = async (salon_id: string, motivo: string) => {
    const token = sessionStorage.getItem('token')
    if (!token) throw new Error('No hay sesión activa. Inicia sesión de nuevo.')

    const res = await fetch(`${API_URL}/api/solicitudes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ salon_id: Number(salon_id), motivo })
    })

    if (!res.ok) {
      // Mostrar el error real del backend en vez de uno genérico
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || `Error ${res.status} al crear solicitud`)
    }

    const data = await res.json()
    // Refrescar la lista en background (sin bloquear el retorno)
    fetchSolicitudes().catch(console.error)
    return String(data.id)
  }

  const responderSolicitud = async (
    id: string,
    estado: 'APROBADA' | 'RECHAZADA',
    respuesta: string,
    solicitud: Solicitud
  ) => {
    const token = sessionStorage.getItem('token')
    const res = await fetch(`${API_URL}/api/solicitudes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ estado, respuesta })
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || 'Error al responder solicitud')
    }

    await fetchSolicitudes()

    // Si fue aprobada, intentar abrir el hardware
    if (estado === 'APROBADA') {
      try {
        await fetch(`${API_URL}/api/hardware/force_open`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ salon_id: solicitud.salon_id })
        })
      } catch (err) {
        console.error('Error al intentar abrir el hardware:', err)
      }
    }
  }

  const checkEstadoSolicitud = async (id: string) => {
    const token = sessionStorage.getItem('token')
    const res = await fetch(`${API_URL}/api/solicitudes/${id}/estado`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('No se pudo verificar el estado')
    return res.json() // { estado, respuesta }
  }

  return {
    solicitudes,
    loading,
    error,
    fetchSolicitudes,
    crearSolicitud,
    responderSolicitud,
    checkEstadoSolicitud
  }
}
