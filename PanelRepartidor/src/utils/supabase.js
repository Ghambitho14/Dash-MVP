import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_PROJECT_URL;
const supabaseAnonKey = import.meta.env.VITE_ANNON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error('Faltan las variables de entorno de Supabase');
}

// Singleton pattern para evitar múltiples instancias durante hot reload
let supabaseInstance = null;

if (import.meta.hot) {
	// En desarrollo, usar singleton para evitar múltiples instancias
	if (!import.meta.hot.data.supabase) {
		import.meta.hot.data.supabase = createClient(supabaseUrl, supabaseAnonKey, {
			auth: {
				persistSession: false,
				autoRefreshToken: false,
				detectSessionInUrl: false,
			},
		});
	}
	supabaseInstance = import.meta.hot.data.supabase;
} else {
	// En producción, crear normalmente
	supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false,
		},
	});
}

export const supabase = supabaseInstance;

