import { useState, useEffect, useCallback } from 'react';
import { loadOrders, createOrder, deleteOrder } from '../../services/orderService';
import { createClient as createClientService } from '../../services/clientService';
import { generatePickupCode, getCompanyId, getDbId } from '../../utils/utils';
import { supabase } from '../../utils/supabase';
import { logger } from '../../utils/logger';

/**
 * Hook para gestionar pedidos
 */
export function useOrders(currentUser) {
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(false);

	const fetchOrders = useCallback(async () => {
		if (!currentUser) return;

		setLoading(true);
		try {
			const companyId = getCompanyId(currentUser);
			const localId = currentUser.role === 'local' ? currentUser.localId : null;
			const loadedOrders = await loadOrders(companyId, localId);
			setOrders(loadedOrders);
		} catch (err) {
			logger.error('Error cargando pedidos:', err);
		} finally {
			setLoading(false);
		}
	}, [currentUser]);

	// Cargar pedidos cuando cambia el usuario
	useEffect(() => {
		if (currentUser) {
			fetchOrders();
		}
	}, [currentUser, fetchOrders]);

	// ✅ REALTIME: escuchar cambios en orders para la company del usuario + fallback 60s
	useEffect(() => {
		if (!currentUser) return;

		const companyId = getCompanyId(currentUser);
		if (!companyId) return;

		// Carga inicial (por si entras y no hay datos aún)
		fetchOrders();

		const channel = supabase
			.channel(`orders-company-${companyId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'orders',
					filter: `company_id=eq.${companyId}`,
				},
				() => {
					fetchOrders();
				}
			)
			.subscribe();

		// Fallback profesional (por si realtime cae / reconexión / lag)
		const fallback = setInterval(() => {
			fetchOrders();
		}, 60000); // Cada 60 segundos como fallback

		return () => {
			clearInterval(fallback);
			supabase.removeChannel(channel);
		};
	}, [currentUser, fetchOrders]);

	const handleCreateOrder = useCallback(async (orderData, clients, localConfigs) => {
		if (!currentUser) return;

		try {
			// Buscar local por nombre
			const local = localConfigs.find(l => l.name === orderData.local);
			if (!local) {
				throw new Error('Local no encontrado');
			}

			// Buscar cliente por ID o nombre
			let client = null;
			if (orderData.selectedClientId) {
				client = clients.find(c => c.id === orderData.selectedClientId || c._dbId?.toString() === orderData.selectedClientId);
			}
			if (!client && orderData.clientName) {
				client = clients.find(c => c.name === orderData.clientName);
			}
			if (!client) {
				// Permitir crear pedidos sin cliente previamente registrado.
				// Creamos un cliente mínimo (para cumplir client_id NOT NULL en DB) usando la dirección de entrega.
				const companyId = getCompanyId(currentUser);
				const clientName = orderData.clientName?.trim() || 'Cliente no registrado';

				client = await createClientService({
					name: clientName,
					phone: 'Sin teléfono',
					address: orderData.deliveryAddress,
				}, companyId, local.id);
			}

			const pickupCode = generatePickupCode();

			const newOrder = await createOrder({
				clientId: getDbId(client),
				localId: local.id,
				pickupAddress: orderData.pickupAddress,
				deliveryAddress: orderData.deliveryAddress,
				suggestedPrice: orderData.suggestedPrice,
				notes: orderData.notes,
				pickupCode,
			}, getCompanyId(currentUser), getDbId(currentUser));

			setOrders(prev => [newOrder, ...prev]);
			return newOrder;
		} catch (err) {
			logger.error('Error creando pedido:', err);
			throw err;
		}
	}, [currentUser]);

	const handleDeleteOrder = useCallback(async (orderId) => {
		try {
			const order = orders.find(o => o.id === orderId);
			if (!order) return;

			await deleteOrder(order._dbId);
			setOrders(prev => prev.filter(o => o.id !== orderId));
			return true;
		} catch (err) {
			logger.error('Error eliminando pedido:', err);
			throw err;
		}
	}, [orders]);

	return {
		orders,
		setOrders,
		loading,
		createOrder: handleCreateOrder,
		deleteOrder: handleDeleteOrder,
		reloadOrders: fetchOrders,
	};
}

