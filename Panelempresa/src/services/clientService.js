import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

/**
 * Formatea un cliente de la base de datos al formato de la aplicación
 */
export function formatClient(client) {
	return {
		...client,
		id: `CLI-${client.id}`,
		local: client.locals?.name || '',
		_dbId: client.id,
		_dbLocalId: client.local_id,
	};
}

/**
 * Carga clientes desde Supabase
 */
export async function loadClients(companyId) {
	try {
		const { data, error } = await supabase
			.from('clients')
			.select('*, locals(name)')
			.eq('company_id', companyId)
			.order('created_at', { ascending: false });

		if (error) throw error;
		return (data || []).map(formatClient);
	} catch (err) {
		logger.error('Error cargando clientes:', err);
		throw err;
	}
}

/**
 * Crea un nuevo cliente
 */
export async function createClient(clientData, companyId, localId) {
	try {
		const { data, error } = await supabase
			.from('clients')
			.insert({
				company_id: companyId,
				name: clientData.name,
				phone: clientData.phone,
				address: clientData.address,
				local_id: localId,
			})
			.select()
			.single();

		if (error) throw error;
		return formatClient(data);
	} catch (err) {
		logger.error('Error creando cliente:', err);
		throw err;
	}
}

/**
 * Actualiza un cliente existente
 */
export async function updateClient(clientDbId, clientData, localId) {
	try {
		const { error } = await supabase
			.from('clients')
			.update({
				name: clientData.name,
				phone: clientData.phone,
				address: clientData.address,
				local_id: localId,
			})
			.eq('id', clientDbId);

		if (error) throw error;
		return true;
	} catch (err) {
		logger.error('Error actualizando cliente:', err);
		throw err;
	}
}

/**
 * Elimina un cliente
 */
export async function deleteClient(clientDbId) {
	try {
		const { error } = await supabase
			.from('clients')
			.delete()
			.eq('id', clientDbId);

		if (error) throw error;
		return true;
	} catch (err) {
		logger.error('Error eliminando cliente:', err);
		throw err;
	}
}

