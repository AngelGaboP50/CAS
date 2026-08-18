import { useState, useCallback } from 'react'

export type EstadoAula = 'LIBRE' | 'EN_CLASE' | 'ALERTA' | 'EXCEPCION' | 'NO_DISPONIBLE'

export interface AulaRemote {
  id: string
  label: string
  estado: EstadoAula
}

export function useAulas() {
  const [aulas, setAulas] = useState<AulaRemote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAulas = useCallback(async () => {
    // TODO: Implementar llamada al nuevo backend
    setLoading(true)
    setAulas([])
    setLoading(false)
  }, [])

  const updateEstadoAula = async (id: string, nuevoEstado: EstadoAula) => {
    // TODO: Implementar llamada al nuevo backend
    console.log('Update estado aula:', id, nuevoEstado)
  }

  return { aulas, loading, error, updateEstadoAula, fetchAulas }
}
