import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

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

  useEffect(() => {
    if (!usuarioId) return;

    // 1. Cargar notificaciones iniciales
    const fetchNotificaciones = async () => {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al cargar notificaciones:', error);
      } else if (data) {
        setNotificaciones(data);
        setNoLeidas(data.filter(n => !n.leida).length);
      }
    };

    fetchNotificaciones();

    // 2. Suscribirse a cambios en tiempo real (Realtime)
    const channel = supabase
      .channel(`notificaciones_usuario_${usuarioId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${usuarioId}`
        },
        () => {
          // Cuando hay un cambio, volvemos a cargar todo
          fetchNotificaciones();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [usuarioId]);

  // Función para marcar todas como leídas
  const marcarComoLeidas = async () => {
    if (!usuarioId) return;
    
    // Actualización optimista
    setNoLeidas(0);
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));

    const { error } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('usuario_id', usuarioId)
      .eq('leida', false);

    if (error) {
      console.error('Error al marcar notificaciones como leídas:', error);
    }
  };

  return { notificaciones, noLeidas, marcarComoLeidas };
}

// === FUNCIÓN AUXILIAR PARA ENVIAR NOTIFICACIONES A LOS ADMINS ===
export const notificarAdmins = async (titulo: string, mensaje: string, tipo: string = 'info') => {
  // 1. Obtener los IDs de todos los administradores
  const { data: admins } = await supabase
    .from('usuarios')
    .select('id')
    .eq('tipo', 'admin');

  if (!admins || admins.length === 0) return;

  // 2. Preparar el arreglo de inserciones (una para cada admin)
  const nuevasNotificaciones = admins.map(admin => ({
    usuario_id: admin.id,
    titulo,
    mensaje,
    tipo
  }));

  // 3. Insertar las notificaciones en la tabla
  const { error } = await supabase
    .from('notificaciones')
    .insert(nuevasNotificaciones);

  if (error) {
    console.error('Error al notificar admins:', error);
  }
};
