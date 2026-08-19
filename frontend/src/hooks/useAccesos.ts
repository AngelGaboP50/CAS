// src/hooks/useAccesos.ts

import { useState, useCallback, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface Acceso {
  id: string
  salon_id: string
  profesor_id: number | null
  tipo: 'ENTRADA' | 'SALIDA' | 'DENEGADO' | 'EXCEPCION'
  metodo: 'QR' | 'MANUAL' | 'SISTEMA'
  qr_data: string | null
  autorizado: boolean
  motivo_denegacion: string | null
  created_at: string
  salon?: { nombre: string }
  profesor?: { nombre: string; correo: string }
}

export interface ResultadoValidacion {
  autorizado: boolean
  motivo: string
  horario_id: string | null
  materia: string | null
}

export function useAccesos(_profesorId?: number, _salonId?: string) {
  const [accesos, setAccesos] = useState<Acceso[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getToken = () => {
    try {
      const u = JSON.parse(sessionStorage.getItem('usuario') || '{}')
      return u.token
    } catch {
      return null
    }
  }

  const fetchAccesos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = getToken()
      if (!token) throw new Error('No autenticado')
        
      const res = await fetch(`${API}/api/accesos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!res.ok) throw new Error('Error al obtener el historial')
      const data = await res.json()
      setAccesos(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccesos()
  }, [fetchAccesos])

  const registrarAcceso = async (params: {
    salon_id: string
    profesor_id: number
    tipo: Acceso['tipo']
    metodo: Acceso['metodo']
    autorizado: boolean
    qr_data?: string
    motivo_denegacion?: string
  }) => {
    try {
      const token = getToken()
      const res = await fetch(`${API}/api/accesos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(params)
      })
      if (!res.ok) throw new Error('Error al registrar acceso')
      await fetchAccesos() // Recargar tabla
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    }
  }

  const validarAccesoQR = async (
    _profesorId: number,
    _salonId: string
  ): Promise<ResultadoValidacion> => {
    // Por ahora esto es solo un mock para la simulación
    // En el futuro, llamará a una API que cruce el Horario con el Salón
    return { autorizado: true, motivo: 'Acceso autorizado', horario_id: 'hor-1', materia: 'Desarrollo Móvil' }
  }

  return { accesos, loading, error, fetchAccesos, registrarAcceso, validarAccesoQR }
}
