import { supabase } from '../utils/supabase';
import { hashPassword } from '../utils/passwordUtils';

/**
 * Carga todas las solicitudes de registro de empresas pendientes
 */
export async function loadCompanyRegistrationRequests() {
	try {
		const { data, error } = await supabase
			.from('registration_requests')
			.select('*')
			.eq('status', 'pending')
			.order('created_at', { ascending: false });

		if (error) throw error;
		return data || [];
	} catch (err) {
		console.error('Error cargando solicitudes de empresas:', err);
		throw err;
	}
}

/**
 * Carga todas las solicitudes de registro de repartidores pendientes
 */
export async function loadDriverRegistrationRequests() {
	try {
		const { data, error } = await supabase
			.from('driver_registration_requests')
			.select('*')
			.eq('status', 'pending')
			.order('created_at', { ascending: false });

		if (error) throw error;
		return data || [];
	} catch (err) {
		console.error('Error cargando solicitudes de repartidores:', err);
		throw err;
	}
}

/**
 * Aprueba una solicitud de registro de empresa
 * Crea la empresa y el usuario empresarial
 */
export async function approveCompanyRequest(requestId, adminId, adminNotes = null) {
	try {
		// Obtener la solicitud
		const { data: request, error: requestError } = await supabase
			.from('registration_requests')
			.select('*')
			.eq('id', requestId)
			.eq('status', 'pending')
			.single();

		if (requestError || !request) {
			throw new Error('Solicitud no encontrada o ya procesada');
		}

		// Crear la empresa
		const { data: company, error: companyError } = await supabase
			.from('companies')
			.insert({
				name: request.company_name,
				phone: request.phone || '', // Phone es requerido en companies
				email: request.email || null,
				active: true,
				superadmin_id: adminId, // Asignar al admin que aprueba
			})
			.select()
			.single();

		if (companyError) throw companyError;

		// Crear el usuario empresarial
		const { data: user, error: userError } = await supabase
			.from('company_users')
			.insert({
				company_id: company.id,
				username: request.username,
				password: request.password, // Ya está hasheada
				role: 'empresarial',
				name: request.name,
			})
			.select()
			.single();

		if (userError) {
			// Si falla la creación del usuario, eliminar la empresa
			await supabase.from('companies').delete().eq('id', company.id);
			throw userError;
		}

		// Actualizar la solicitud como aprobada
		const { error: updateError } = await supabase
			.from('registration_requests')
			.update({
				status: 'approved',
				reviewed_by: adminId,
				reviewed_at: new Date().toISOString(),
				admin_notes: adminNotes || null,
			})
			.eq('id', requestId);

		if (updateError) throw updateError;

		return { company, user };
	} catch (err) {
		console.error('Error aprobando solicitud de empresa:', err);
		throw err;
	}
}

/**
 * Rechaza una solicitud de registro de empresa
 */
export async function rejectCompanyRequest(requestId, adminId, adminNotes) {
	try {
		const { error } = await supabase
			.from('registration_requests')
			.update({
				status: 'rejected',
				reviewed_by: adminId,
				reviewed_at: new Date().toISOString(),
				admin_notes: adminNotes || null,
			})
			.eq('id', requestId);

		if (error) throw error;
	} catch (err) {
		console.error('Error rechazando solicitud de empresa:', err);
		throw err;
	}
}

/**
 * Aprueba una solicitud de registro de repartidor
 * Crea el repartidor en la tabla drivers
 */
export async function approveDriverRequest(requestId, adminId, adminNotes = null) {
	try {
		// Obtener la solicitud
		const { data: request, error: requestError } = await supabase
			.from('driver_registration_requests')
			.select('*')
			.eq('id', requestId)
			.eq('status', 'pending')
			.single();

		if (requestError || !request) {
			throw new Error('Solicitud no encontrada o ya procesada');
		}

		// Crear el repartidor
		const { data: driver, error: driverError } = await supabase
			.from('drivers')
			.insert({
				username: request.username,
				password: request.password, // Ya está hasheada
				name: request.name,
				phone: request.phone,
				email: request.email || null,
				active: true,
			})
			.select()
			.single();

		if (driverError) throw driverError;

		// Actualizar la solicitud como aprobada
		const { error: updateError } = await supabase
			.from('driver_registration_requests')
			.update({
				status: 'approved',
				reviewed_by: adminId,
				reviewed_at: new Date().toISOString(),
				admin_notes: adminNotes || null,
			})
			.eq('id', requestId);

		if (updateError) throw updateError;

		return { driver };
	} catch (err) {
		console.error('Error aprobando solicitud de repartidor:', err);
		throw err;
	}
}

/**
 * Rechaza una solicitud de registro de repartidor
 */
export async function rejectDriverRequest(requestId, adminId, adminNotes) {
	try {
		const { error } = await supabase
			.from('driver_registration_requests')
			.update({
				status: 'rejected',
				reviewed_by: adminId,
				reviewed_at: new Date().toISOString(),
				admin_notes: adminNotes || null,
			})
			.eq('id', requestId);

		if (error) throw error;
	} catch (err) {
		console.error('Error rechazando solicitud de repartidor:', err);
		throw err;
	}
}

