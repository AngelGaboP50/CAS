// src/hooks/useAccesos.ts
// Hook para cargar y crear registros de acceso desde Supabase

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

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
  // Joined
  salon?: { nombre: string }
  profesor?: { nombre: string; correo: string }
}

export interface ResultadoValidacion {
  autorizado: boolean
  motivo: string
  horario_id: string | null
  materia: string | null
}

export function useAccesos(profesorId?: number, salonId?: string) {
  const [accesos, setAccesos] = useState<Acceso[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAccesos = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('accesos')
      .select(`
        *,
        salon:salones(nombre),
        profesor:usuarios(nombre, correo)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (profesorId) query = query.eq('profesor_id', profesorId)
    if (salonId)    query = query.eq('salon_id', salonId)

    const { data, error: err } = await query

    if (err) {
      setError(err.message)
    } else {
      setAccesos((data as Acceso[]) ?? [])
    }
    setLoading(false)
  }, [profesorId, salonId])

  useEffect(() => {
    fetchAccesos()

    // Tiempo real
    const channel = supabase
      .channel('accesos_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'accesos' }, () => {
        fetchAccesos()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchAccesos])

  // Registrar un nuevo acceso en la BD
  const registrarAcceso = async (params: {
    salon_id: string
    profesor_id: number
    tipo: Acceso['tipo']
    metodo: Acceso['metodo']
    autorizado: boolean
    qr_data?: string
    motivo_denegacion?: string
  }) => {
    const { error: err } = await supabase.from('accesos').insert([params])
    if (err) throw err
    await fetchAccesos()
  }

  // Llamar la función SQL que valida horario vs hora actual
  const validarAccesoQR = async (
    profesorId: number,
    salonId: string
  ): Promise<ResultadoValidacion> => {
    const { data, error: err } = await supabase.rpc('validar_acceso_qr', {
      p_profesor_id: profesorId,
      p_salon_id: salonId,
    })

    if (err) throw err

    const resultado = data?.[0]
    return {
      autorizado:  resultado?.autorizado  ?? false,
      motivo:      resultado?.motivo      ?? 'Error al validar',
      horario_id:  resultado?.horario_id  ?? null,
      materia:     resultado?.materia     ?? null,
    }
  }

  return { accesos, loading, error, fetchAccesos, registrarAcceso, validarAccesoQR }
}
