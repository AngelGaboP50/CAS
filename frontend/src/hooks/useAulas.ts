// src/hooks/useAulas.ts
// Conectado al backend MySQL con fallback interactivo en modo mock

import { useState, useCallback } from 'react'

export type EstadoAula = 'LIBRE' | 'EN_CLASE' | 'ALERTA' | 'EXCEPCION' | 'NO_DISPONIBLE'

export interface AulaRemote {
  id: string
  label: string
  estado: EstadoAula
  capacidad?: number
  piso?: number
}

const INITIAL_AULAS: AulaRemote[] = [
  { id: '1', label: 'Salón 11', estado: 'NO_DISPONIBLE', capacidad: 30, piso: 1 },
  { id: '2', label: 'Salón 12', estado: 'NO_DISPONIBLE', capacidad: 30, piso: 1 },
  { id: '3', label: 'Salón 13', estado: 'NO_DISPONIBLE', capacidad: 30, piso: 1 },
  { id: '4', label: 'Salón 14', estado: 'NO_DISPONIBLE', capacidad: 30, piso: 1 },
  { id: '5', label: 'Salón 15', estado: 'NO_DISPONIBLE', capacidad: 30, piso: 1 },
  { id: '6', label: 'Salón 16', estado: 'NO_DISPONIBLE', capacidad: 35, piso: 2 },
  { id: '7', label: 'Salón 17', estado: 'NO_DISPONIBLE', capacidad: 35, piso: 2 },
  { id: '8', label: 'S.U.M', estado: 'NO_DISPONIBLE', capacidad: 35, piso: 2 },
  { id: '9', label: 'S.A', estado: 'NO_DISPONIBLE', capacidad: 35, piso: 2 },
]

export function useAulas() {
  const [aulas, setAulas] = useState<AulaRemote[]>(() => {
    const local = sessionStorage.getItem('mock_aulas')
    return local ? JSON.parse(local) : INITIAL_AULAS
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAulas = useCallback(async () => {
    setLoading(true)
    setError(null)
    const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    try {
      const res = await fetch(`${API}/api/salones`)
      if (res.ok) {
        const data = await res.json()
        setAulas(data)
        sessionStorage.setItem('mock_aulas', JSON.stringify(data))
      } else {
        throw new Error('Error al obtener salones del servidor')
      }
    } catch (err: any) {
      console.warn('Usando base de datos local temporal (modo mock/fallback):', err.message)
      // Cargar del storage local
      const local = sessionStorage.getItem('mock_aulas')
      if (local) {
        setAulas(JSON.parse(local))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const updateEstadoAula = async (id: string, nuevoEstado: EstadoAula) => {
    const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const token = sessionStorage.getItem('token')
    
    // Obtener los datos actuales del aula para mantener la capacidad y el piso
    const aulaActual = aulas.find(a => String(a.id) === String(id))
    const nombre = aulaActual ? aulaActual.label : `Salón ${id}`
    const capacidad = aulaActual?.capacidad || 30
    const piso = aulaActual?.piso || 1

    try {
      const res = await fetch(`${API}/api/salones/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          nombre, 
          estado: nuevoEstado, 
          activo: nuevoEstado !== 'NO_DISPONIBLE' ? 1 : 0, 
          capacidad, 
          piso 
        })
      })
      if (!res.ok) throw new Error()
      fetchAulas()
    } catch {
      // Modo mock/fallback
      const updated = aulas.map(a => String(a.id) === String(id) ? { ...a, estado: nuevoEstado } : a)
      setAulas(updated)
      sessionStorage.setItem('mock_aulas', JSON.stringify(updated))
    }
  }

  return { aulas, loading, error, updateEstadoAula, fetchAulas }
}
