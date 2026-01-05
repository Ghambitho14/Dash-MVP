import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

/**
 * Obtiene la ubicación actual de un repartidor
 */
export async function getDriverLocation(driverId) {
	try {
		const { data, error } = await supabase
			.from('driver_locations')
			.select('driver_id, latitude, longitude, updated_at')
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
		const { data: order, error: orderError } = await supabase
			.from('orders')
			.select('driver_id')
			.eq('id', orderId)
			.single();

		if (orderError) throw orderError;

		if (!order || !order.driver_id) return null;

		return await getDriverLocation(order.driver_id);
	} catch (err) {
		logger.error('Error obteniendo ubicación del repartidor del pedido:', err);
		return null;
	}
}

/**
 * Suscribe a cambios en tiempo real de la ubicación de un repartidor
 */
export function subscribeToDriverLocation(driverId, callback, options = {}) {
	if (!driverId) {
		logger.error('subscribeToDriverLocation: driverId es requerido');
		return () => {};
	}

	const {
		enablePollingFallback = true,
		pollingIntervalMs = 10000,
	} = options;

	logger.log(`📍 Suscribiéndose a ubicación del repartidor: ${driverId}`);

	const channel = supabase
		.channel(`driver_location:${driverId}`)
		.on(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'driver_locations',
				filter: `driver_id=eq.${driverId}`,
			},
			(payload) => {
				logger.log('📍 Cambio recibido en driver_locations:', {
					event: payload.eventType,
					driverId: driverId,
					hasNew: !!payload.new,
					newData: payload.new
				});

				if (payload.new && payload.new.latitude && payload.new.longitude) {
					callback(payload.new);
				} else if (payload.new) {
					logger.warn('📍 Payload recibido pero sin coordenadas válidas:', payload.new);
				} else {
					logger.warn('📍 Payload recibido sin campo "new":', payload);
				}
			}
		)
		.subscribe((status) => {
			logger.log(`📍 Estado de suscripción para driver ${driverId}:`, status);
			
			if (status === 'SUBSCRIBED') {
				logger.log(`✅ Suscripción activa para driver ${driverId}`);
			} else if (status === 'CHANNEL_ERROR') {
				logger.error(`❌ Error en canal de suscripción para driver ${driverId}`);
			} else if (status === 'TIMED_OUT') {
				logger.warn(`⏱️ Timeout en suscripción para driver ${driverId}`);
			} else if (status === 'CLOSED') {
				logger.log(`🔒 Canal cerrado para driver ${driverId}`);
			}
		});

	// Fallback: polling cada 10 segundos si la suscripción no funciona
	let pollingInterval = null;
	const startPolling = () => {
		logger.log(`🔄 Iniciando polling de ubicación para driver ${driverId}`);
		pollingInterval = setInterval(async () => {
			try {
				const location = await getDriverLocation(driverId);
				if (location && location.latitude && location.longitude) {
					callback(location);
				}
			} catch (err) {
				logger.error('Error en polling de ubicación:', err);
			}
		}, pollingIntervalMs);
	};

	// Iniciar polling como fallback (se puede desactivar pasando enablePollingFallback=false)
	if (enablePollingFallback) {
		startPolling();
	}

	return () => {
		logger.log(`🔌 Desuscribiéndose de ubicación del repartidor: ${driverId}`);
		if (pollingInterval) {
			clearInterval(pollingInterval);
		}
		supabase.removeChannel(channel);
	};
}

