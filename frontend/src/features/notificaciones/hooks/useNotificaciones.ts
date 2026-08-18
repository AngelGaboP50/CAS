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

export function useNotificaciones(usuarioId: number | undefined) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);

  // Función para marcar todas como leídas
  const marcarComoLeidas = async () => {
    if (!usuarioId) return;
    
    // Actualización optimista
    setNoLeidas(0);
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
    // TODO: Implementar llamada al nuevo backend
  };

  return { notificaciones, noLeidas, marcarComoLeidas };
}

// === FUNCIÓN AUXILIAR PARA ENVIAR NOTIFICACIONES A LOS ADMINS ===
export const notificarAdmins = async (titulo: string, mensaje: string, tipo: string = 'info') => {
  // TODO: Implementar llamada al nuevo backend
  console.log('Notificar admins:', titulo, mensaje, tipo);
};
