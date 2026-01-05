import { supabase } from '../utils/supabase';
import { verifyPassword } from '../utils/passwordUtils';
import { logger } from '../utils/logger';

/**
 * Autentica un usuario empresarial
 */
export async function authenticateUser(username, password) {
	try {
		// Buscar usuario en Supabase
		// Nota: Usamos select('*') aquí porque necesitamos acceder a 'password' para verificación,
		// y Supabase no permite seleccionar 'password' explícitamente por seguridad.
		// Este es un caso especial justificado para autenticación.
		// Nota: La tabla company_users no tiene columna 'active', por lo que no filtramos por ella.
		const { data, error: queryError } = await supabase
			.from('company_users')
			.select('*')
			.eq('username', username)
			.single();

		if (queryError || !data) {
			throw new Error('Usuario o contraseña incorrectos');
		}

		// Verificar contraseña usando bcrypt
		const isPasswordValid = await verifyPassword(password, data.password);
		if (!isPasswordValid) {
			throw new Error('Usuario o contraseña incorrectos');
		}

		// Cargar datos de la empresa si existe company_id
		let companyData = null;
		if (data.company_id) {
			const { data: company, error: companyError } = await supabase
				.from('companies')
				.select('id, name')
				.eq('id', data.company_id)
				.single();
			
			if (!companyError) {
				companyData = company;
			}
		}

		// Cargar datos del local si existe local_id
		let localData = null;
		if (data.local_id) {
			const { data: local, error: localError } = await supabase
				.from('locals')
				.select('id, name')
				.eq('id', data.local_id)
				.single();
			
			if (!localError) {
				localData = local;
			}
		}

		// Formatear usuario para la app (sin incluir password por seguridad)
		return {
			id: data.id,
			username: data.username,
			name: data.name,
			role: data.role,
			companyId: data.company_id,
			company_id: data.company_id, // Compatibilidad
			companyName: companyData?.name || '',
			local: data.role === 'local' ? localData?.name : null,
			localId: data.local_id,
			_dbId: data.id,
		};
	} catch (err) {
		logger.error('Error en autenticación:', err);
		throw err;
	}
}

