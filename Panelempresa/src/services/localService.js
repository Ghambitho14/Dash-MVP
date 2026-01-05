import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

/**
 * Carga locales desde Supabase
 */
export async function loadLocals(companyId) {
	try {
		const { data, error } = await supabase
			.from('locals')
			.select('id, name, address, company_id, created_at, updated_at')
			.eq('company_id', companyId)
			.order('name');

		if (error) throw error;
		return data || [];
	} catch (err) {
		logger.error('Error cargando locales:', err);
		throw err;
	}
}

/**
 * Crea nuevos locales
 */
export async function createLocals(localsData, companyId) {
	try {
		const localsToInsert = localsData.map(local => ({
			company_id: companyId,
			name: local.name,
			address: local.address,
		}));

		const { error } = await supabase
			.from('locals')
			.insert(localsToInsert);

		if (error) throw error;
		return true;
	} catch (err) {
		logger.error('Error creando locales:', err);
		throw err;
	}
}

/**
 * Actualiza un local existente
 */
export async function updateLocal(localId, localData) {
	try {
		const { error } = await supabase
			.from('locals')
			.update({
				name: localData.name,
				address: localData.address,
			})
			.eq('id', localId);

		if (error) throw error;
		return true;
	} catch (err) {
		logger.error('Error actualizando local:', err);
		throw err;
	}
}

/**
 * Guarda configuración de locales (actualiza existentes y crea nuevos)
 */
export async function saveLocalConfigs(configs, companyId) {
	try {
		const existingLocals = configs.filter(l => l.id);
		const newLocals = configs.filter(l => !l.id);

		// Actualizar locales existentes
		for (const local of existingLocals) {
			const updatedLocal = configs.find(l => l.id === local.id);
			if (updatedLocal && (updatedLocal.name !== local.name || updatedLocal.address !== local.address)) {
				await updateLocal(local.id, updatedLocal);
			}
		}

		// Crear nuevos locales
		if (newLocals.length > 0) {
			await createLocals(newLocals, companyId);
		}

		// Recargar todos los locales
		return await loadLocals(companyId);
	} catch (err) {
		logger.error('Error guardando locales:', err);
		throw err;
	}
}

