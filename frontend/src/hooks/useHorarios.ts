// src/hooks/useHorarios.ts
// Hook para gestionar horarios estructurados en la BD

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export type DiaSemana = 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO'

export interface Horario {
  id: string
  profesor_id: number
  salon_id: string
  dia_semana: DiaSemana
  hora_inicio: string   // "HH:MM"
  hora_fin: string      // "HH:MM"
  materia: string
  activo: boolean
  created_at: string
  // Joined
  salon?: { nombre: string }
  profesor?: { nombre: string; correo: string }
}

export interface NuevoHorario {
  profesor_id: number
  salon_id: string
  dia_semana: DiaSemana
  hora_inicio: string
  hora_fin: string
  materia: string
}

export function useHorarios(profesorId?: number) {
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHorarios = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('horarios')
      .select(`
        *,
        salon:salones(nombre),
        profesor:usuarios(nombre, correo)
      `)
      .eq('activo', true)
      .order('dia_semana')
      .order('hora_inicio')

    if (profesorId) query = query.eq('profesor_id', profesorId)

    const { data, error: err } = await query

    if (err) {
      setError(err.message)
    } else {
      setHorarios((data as Horario[]) ?? [])
    }
    setLoading(false)
  }, [profesorId])

  useEffect(() => {
    fetchHorarios()

    const channel = supabase
      .channel('horarios_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'horarios' }, () => {
        fetchHorarios()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchHorarios])

  const crearHorario = async (horario: NuevoHorario) => {
    const { error: err } = await supabase.from('horarios').insert([horario])
    if (err) throw err
    await fetchHorarios()
  }

  const eliminarHorario = async (id: string) => {
    const { error: err } = await supabase
      .from('horarios')
      .update({ activo: false })
      .eq('id', id)
    if (err) throw err
    await fetchHorarios()
  }

  const editarHorario = async (id: string, datos: Partial<NuevoHorario>) => {
    const { error: err } = await supabase
      .from('horarios')
      .update(datos)
      .eq('id', id)
    if (err) throw err
    await fetchHorarios()
  }

  // Horario del día actual del profesor
  const horarioHoy = (): Horario[] => {
    const dias: Record<number, DiaSemana> = {
      1: 'LUNES', 2: 'MARTES', 3: 'MIERCOLES',
      4: 'JUEVES', 5: 'VIERNES', 6: 'SABADO',
    }
    const hoy = dias[new Date().getDay()] as DiaSemana | undefined
    if (!hoy) return []
    return horarios.filter(h => h.dia_semana === hoy)
  }

  return { horarios, loading, error, fetchHorarios, crearHorario, eliminarHorario, editarHorario, horarioHoy }
}
