import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export type EstadoAula = 'LIBRE' | 'EN_CLASE' | 'ALERTA' | 'EXCEPCION' | 'NO_DISPONIBLE'

export interface AulaRemote {
  id: string
  label: string
  estado: EstadoAula
}

export function useAulas() {
  const [aulas, setAulas] = useState<AulaRemote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAulas = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('salones')
      .select('id, nombre, activo') // Según tu esquema
      .order('nombre', { ascending: true })

    if (error) {
      console.warn('Error fetching salones:', error.message)
      setError(error.message)
    } else if (data) {
      // Mapeamos a la interfaz que espera el componente (AulaRemote)
      const mappedData: AulaRemote[] = data.map(s => ({
        id: s.id,
        label: s.nombre,
        // Traducimos el booleano 'activo' a nuestros estados del mapa. 
        estado: s.activo ? 'LIBRE' : 'NO_DISPONIBLE'
      }))
      setAulas(mappedData)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAulas()

    const subscription = supabase
      .channel('salones_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salones' }, () => {
        // Al detectar un cambio en la tabla salones, actualizamos
        fetchAulas();
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [fetchAulas])

  const updateEstadoAula = async (id: string, nuevoEstado: EstadoAula) => {
    // Si queremos "desactivar" un salón, ponemos activo = false, para el resto activo = true.
    const isActivo = nuevoEstado !== 'NO_DISPONIBLE';
    
    // NOTA: Como en tu tabla "salones" no hay un campo "estado" explícito, 
    // solo estamos actualizando el campo "activo". 
    const { error } = await supabase
      .from('salones')
      .update({ activo: isActivo })
      .eq('id', id)
      
    if (error) {
      console.error('Error updating salon:', error.message)
      throw error
    }
  }

  return { aulas, loading, error, updateEstadoAula, fetchAulas }
}
