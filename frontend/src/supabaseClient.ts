import { createClient } from '@supabase/supabase-js'

// Variables temporales durante migración a backend propio
// TODO: eliminar este archivo cuando todas las páginas migren al nuevo API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string ?? ''

export const supabase = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey)
  : ({} as ReturnType<typeof createClient>)