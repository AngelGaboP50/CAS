// src/hooks/useAccesos.ts
// Frontend Mock Mode

import { useState, useCallback } from 'react'

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

const INITIAL_ACCESOS: Acceso[] = []

export function useAccesos(_profesorId?: number, _salonId?: string) {
  const [accesos, setAccesos] = useState<Acceso[]>(() => {
    const local = sessionStorage.getItem('mock_accesos')
    return local ? JSON.parse(local) : INITIAL_ACCESOS
  })
  const [loading] = useState(false)
  const [error] = useState<string | null>(null)

  const fetchAccesos = useCallback(async () => {
    // No-op en modo mock
  }, [])

  const registrarAcceso = async (params: {
    salon_id: string
    profesor_id: number
    tipo: Acceso['tipo']
    metodo: Acceso['metodo']
    autorizado: boolean
    qr_data?: string
    motivo_denegacion?: string
  }) => {
    const nuevo: Acceso = {
      id: `acc-${Date.now()}`,
      salon_id: params.salon_id,
      profesor_id: params.profesor_id,
      tipo: params.tipo,
      metodo: params.metodo,
      qr_data: params.qr_data || null,
      autorizado: params.autorizado,
      motivo_denegacion: params.motivo_denegacion || null,
      created_at: new Date().toISOString(),
      salon: { nombre: `Salón ${params.salon_id}` },
      profesor: { nombre: 'Profesor Local', correo: 'profesor@uteq.edu.mx' }
    }
    const updated = [nuevo, ...accesos]
    setAccesos(updated)
    sessionStorage.setItem('mock_accesos', JSON.stringify(updated))
  }

  const validarAccesoQR = async (
    _profesorId: number,
    _salonId: string
  ): Promise<ResultadoValidacion> => {
    return { autorizado: true, motivo: 'Acceso autorizado (modo mock)', horario_id: 'hor-1', materia: 'Desarrollo Móvil' }
  }

  return { accesos, loading, error, fetchAccesos, registrarAcceso, validarAccesoQR }
}
