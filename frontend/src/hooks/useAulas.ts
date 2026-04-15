// src/hooks/useAulas.ts — REEMPLAZA el archivo actual completo
// Cambio: lee la columna 'estado' de la BD (en lugar de derivarla de 'activo')
// y expone fetchAulas para que los componentes puedan forzar recarga.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export type EstadoAula = 'LIBRE' | 'EN_CLASE' | 'ALERTA' | 'EXCEPCION' | 'NO_DISPONIBLE'

export interface AulaRemote {
  id: string
  label: string
  estado: EstadoAula
}

export function useAulas() {
  const [aulas, setAulas]     = useState<AulaRemote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchAulas = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('salones')
      .select('id, nombre, activo, estado')   // lee 'estado' si existe
      .order('nombre', { ascending: true })

    if (err) {
      setError(err.message)
    } else if (data) {
      const mappedData: AulaRemote[] = data.map(s => ({
        id:    s.id,
        label: s.nombre,
        // Usa la columna 'estado' si existe; si no, deriva del booleano 'activo'
        estado: (s.estado as EstadoAula) ?? (s.activo ? 'LIBRE' : 'NO_DISPONIBLE'),
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
        fetchAulas()
      })
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [fetchAulas])

  const updateEstadoAula = async (id: string, nuevoEstado: EstadoAula) => {
    const { error: err } = await supabase
      .from('salones')
      .update({
        estado: nuevoEstado,
        activo: nuevoEstado !== 'NO_DISPONIBLE',
      })
      .eq('id', id)

    if (err) throw err
    await fetchAulas()
  }

  return { aulas, loading, error, updateEstadoAula, fetchAulas }
}
