import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

/**
 * Formatea un pedido de la base de datos al formato de la aplicación
 */
export function formatOrder(order) {
	return {
		id: `ORD-${order.id}`,
		clientName: order.clients?.name || '',
		clientPhone: order.clients?.phone || '',
		pickupAddress: order.pickup_address,
		deliveryAddress: order.delivery_address,
		local: order.locals?.name || '',
		localAddress: order.locals?.address || order.pickup_address || '',
		suggestedPrice: parseFloat(order.suggested_price),
		notes: order.notes || '',
		status: order.status,
		pickupCode: order.pickup_code,
		driverName: order.drivers?.name || null,
		driverId: order.driver_id,
		creatorName: order.company_users?.name || null,
		createdAt: new Date(order.created_at),
		updatedAt: new Date(order.updated_at),
		_dbId: order.id,
		_dbClientId: order.client_id,
		_dbLocalId: order.local_id,
		_dbUserId: order.user_id,
	};
}

/**
 * Carga pedidos desde Supabase
 */
export async function loadOrders(companyId, localId = null) {
	try {
		let query = supabase
			.from('orders')
			.select(`
				*,
				clients(name, phone, address),
				locals(name, address),
				company_users(name, username),
				drivers(name, phone)
			`)
			.eq('company_id', companyId)
			.order('created_at', { ascending: false });

		if (localId) {
			query = query.eq('local_id', localId);
		}

		const { data, error } = await query;
		if (error) throw error;

		return (data || []).map(formatOrder);
	} catch (err) {
		logger.error('Error cargando pedidos:', err);
		throw err;
	}
}

/**
 * Crea un nuevo pedido
 */
export async function createOrder(orderData, companyId, userId) {
	try {
		const { data, error } = await supabase
			.from('orders')
			.insert({
				company_id: companyId,
				client_id: orderData.clientId,
				local_id: orderData.localId,
				user_id: userId,
				pickup_address: orderData.pickupAddress,
				delivery_address: orderData.deliveryAddress,
				suggested_price: orderData.suggestedPrice,
				notes: orderData.notes || null,
				status: 'Pendiente',
				pickup_code: orderData.pickupCode,
			})
			.select(`
				*,
				clients(name, phone, address),
				locals(name, address),
				company_users(name, username),
				drivers(name, phone)
			`)
			.single();

		if (error) throw error;
		return formatOrder(data);
	} catch (err) {
		logger.error('Error creando pedido:', err);
		throw err;
	}
}

/**
 * Elimina un pedido
 */
export async function deleteOrder(orderDbId) {
	try {
		const { error } = await supabase
			.from('orders')
			.delete()
			.eq('id', orderDbId);

		if (error) throw error;
		return true;
	} catch (err) {
		logger.error('Error eliminando pedido:', err);
		throw err;
	}
}

