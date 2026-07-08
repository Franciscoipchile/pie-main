import { createClient } from '@supabase/supabase-js';

// Leemos las credenciales que ya tienes en tu archivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Faltan las variables de entorno de Supabase en el archivo .env");
}

// Inicializamos el cliente real
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');