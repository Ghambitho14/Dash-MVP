import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

/**
 * Guarda la ubicación actual del repartidor
 */
export async function saveDriverLocation(driverId, latitude, longitude, orderId = null) {
	try {
		const { data, error } = await supabase
			.from('driver_locations')
			.upsert({
				driver_id: driverId,
				latitude,
				longitude,
				order_id: orderId,
				updated_at: new Date().toISOString(),
			}, {
				onConflict: 'driver_id',
			})
			.select()
			.single();

		if (error) throw error;
		return data;
	} catch (err) {
		logger.error('Error guardando ubicación:', err);
		throw err;
	}
}

/**
 * Obtiene la ubicación actual de un repartidor
 */
export async function getDriverLocation(driverId) {
	try {
		const { data, error } = await supabase
			.from('driver_locations')
			.select('*')
			.eq('driver_id', driverId)
			.single();

		if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
		return data;
	} catch (err) {
		logger.error('Error obteniendo ubicación:', err);
		return null;
	}
}

/**
 * Obtiene la ubicación del repartidor asignado a un pedido
 */
export async function getOrderDriverLocation(orderId) {
	try {
		const { data: order } = await supabase
			.from('orders')
			.select('driver_id')
			.eq('id', orderId)
			.single();

		if (!order || !order.driver_id) return null;

		return await getDriverLocation(order.driver_id);
	} catch (err) {
		logger.error('Error obteniendo ubicación del repartidor del pedido:', err);
		return null;
	}
}

