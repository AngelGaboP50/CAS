// src/hooks/useNotificaciones.ts
// Frontend Mock Mode

import { useState } from 'react';

export interface Notificacion {
  id: string;
  usuario_id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  enlace_url: string | null;
  created_at: string;
}

const INITIAL_NOTIFICATIONS: Notificacion[] = [];

export function useNotificaciones(_usuarioId: number | undefined) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>(INITIAL_NOTIFICATIONS);
  const noLeidas = notificaciones.filter(n => !n.leida).length;

  const marcarComoLeidas = async () => {
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
  };

  return { notificaciones, noLeidas, marcarComoLeidas };
}

export const notificarAdmins = async (_titulo: string, _mensaje: string, _tipo: string = 'info') => {
  // Stub
};
