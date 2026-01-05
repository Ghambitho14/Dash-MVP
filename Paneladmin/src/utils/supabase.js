import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_PROJECT_URL;
const supabaseAnonKey = import.meta.env.VITE_ANNON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error('Faltan las variables de entorno de Supabase');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

