import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

/**
 * Carga el historial de estados de pedidos para calcular tiempos
 */
export async function loadOrderStatusHistory(orderIds) {
	try {
		if (!orderIds || orderIds.length === 0) return [];

		const { data, error } = await supabase
			.from('order_status_history')
			.select('*')
			.in('order_id', orderIds)
			.order('created_at', { ascending: true });

		if (error) throw error;
		return data || [];
	} catch (err) {
		logger.error('Error cargando historial de estados:', err);
		return [];
	}
}

/**
 * Carga información de repartidores activos
 */
export async function loadActiveDrivers(companyId) {
	try {
		const { data, error } = await supabase
			.from('drivers')
			.select('id, name, active')
			.eq('company_id', companyId)
			.eq('active', true);

		if (error) throw error;
		return data || [];
	} catch (err) {
		logger.error('Error cargando repartidores activos:', err);
		return [];
	}
}

/**
 * Carga pedidos con información completa para métricas
 */
export async function loadOrdersForMetrics(companyId, localId = null) {
	try {
		let query = supabase
			.from('orders')
			.select(`
				*,
				clients(name, phone),
				locals(name),
				drivers(name, phone)
			`)
			.eq('company_id', companyId)
			.order('created_at', { ascending: false });

		if (localId) {
			query = query.eq('local_id', localId);
		}

		const { data, error } = await query;
		if (error) throw error;
		return data || [];
	} catch (err) {
		logger.error('Error cargando pedidos para métricas:', err);
		return [];
	}
}

