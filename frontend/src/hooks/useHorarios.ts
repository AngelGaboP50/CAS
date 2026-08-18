// src/hooks/useHorarios.ts
// Frontend Mock Mode

import { useState, useCallback } from 'react'

export type DiaSemana = 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO'

export interface Horario {
  id: string
  profesor_id: number
  salon_id: string
  dia_semana: DiaSemana
  hora_inicio: string
  hora_fin: string
  materia: string
  activo: boolean
  created_at: string
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

const INITIAL_HORARIOS: Horario[] = []

export function useHorarios(_profesorId?: number) {
  const [horarios, setHorarios] = useState<Horario[]>(() => {
    const local = sessionStorage.getItem('mock_horarios')
    return local ? JSON.parse(local) : INITIAL_HORARIOS
  })
  const [loading] = useState(false)
  const [error] = useState<string | null>(null)

  const fetchHorarios = useCallback(async () => {
    // No-op en modo mock
  }, [])

  const crearHorario = async (horario: NuevoHorario) => {
    const nuevo: Horario = {
      id: `hor-${Date.now()}`,
      profesor_id: horario.profesor_id,
      salon_id: horario.salon_id,
      dia_semana: horario.dia_semana,
      hora_inicio: horario.hora_inicio,
      hora_fin: horario.hora_fin,
      materia: horario.materia,
      activo: true,
      created_at: new Date().toISOString(),
      salon: { nombre: `Salón ${horario.salon_id}` },
      profesor: { nombre: 'Profesor Seleccionado', correo: 'profesor@uteq.edu.mx' }
    }
    const updated = [...horarios, nuevo]
    setHorarios(updated)
    sessionStorage.setItem('mock_horarios', JSON.stringify(updated))
  }

  const eliminarHorario = async (id: string) => {
    const updated = horarios.filter(h => h.id !== id)
    setHorarios(updated)
    sessionStorage.setItem('mock_horarios', JSON.stringify(updated))
  }

  const editarHorario = async (id: string, datos: Partial<NuevoHorario>) => {
    const updated = horarios.map(h => h.id === id ? { ...h, ...datos } : h)
    setHorarios(updated)
    sessionStorage.setItem('mock_horarios', JSON.stringify(updated))
  }

  const horarioHoy = (): Horario[] => {
    return horarios
  }

  return { horarios, loading, error, fetchHorarios, crearHorario, eliminarHorario, editarHorario, horarioHoy }
}
