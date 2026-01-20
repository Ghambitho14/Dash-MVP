import { useEffect, useRef } from 'react';
import { useNotifications } from './useNotifications';
import { logger } from '../utils/logger';

/**
 * Hook para notificar cuando aparece un nuevo pedido pendiente
 * Solo muestra notificación push nativa del sistema (como WhatsApp)
 * No muestra toasts ni notificaciones dentro de la app
 */
export function useOrderNotifications(orders, currentDriver, isOnline) {
	const { showNotification } = useNotifications();
	const previousOrdersRef = useRef([]);
	const notifiedOrdersRef = useRef(new Set());
	const isInitializedRef = useRef(false);

	useEffect(() => {
		// Si no hay driver, resetear estado
		if (!currentDriver) {
			logger.log('🔔 useOrderNotifications: No hay driver');
			previousOrdersRef.current = [];
			notifiedOrdersRef.current.clear();
			isInitializedRef.current = false;
			return;
		}

		// Si no está en línea, no notificar pero mantener el estado
		if (!isOnline) {
			logger.log('🔔 useOrderNotifications: Repartidor no está en línea');
			// Solo actualizar la referencia si ya se inicializó, para detectar cambios cuando vuelva a estar en línea
			if (isInitializedRef.current && orders) {
				previousOrdersRef.current = orders;
			}
			return;
		}

		// Si no hay pedidos aún, inicializar y salir
		if (!orders || orders.length === 0) {
			if (!isInitializedRef.current) {
				previousOrdersRef.current = [];
				isInitializedRef.current = true;
			}
			return;
		}

		// Marcar como inicializado
		isInitializedRef.current = true;

		// Obtener pedidos pendientes actuales
		const currentPendingOrders = orders.filter(order => order.status === 'Pendiente');
		
		// Obtener pedidos pendientes anteriores
		const previousPendingOrders = previousOrdersRef.current.filter(
			order => order.status === 'Pendiente'
		);

		// Función helper para obtener ID del pedido de forma consistente
		const getOrderId = (order) => {
			if (order._dbId) return String(order._dbId);
			if (order.id) {
				const idStr = String(order.id);
				return idStr.replace('ORD-', '');
			}
			return null;
		};

		// Encontrar pedidos nuevos (que no estaban en la lista anterior)
		const newOrders = currentPendingOrders.filter(currentOrder => {
			const orderId = getOrderId(currentOrder);
			if (!orderId) {
				return false;
			}

			// Verificar si este pedido ya fue notificado
			if (notifiedOrdersRef.current.has(orderId)) {
				return false;
			}

			// Verificar si el pedido no estaba en la lista anterior
			const wasInPrevious = previousPendingOrders.some(prevOrder => {
				const prevOrderId = getOrderId(prevOrder);
				return prevOrderId && prevOrderId === orderId;
			});

			return !wasInPrevious;
		});

		// Notificar cada pedido nuevo con notificación push nativa (como WhatsApp)
		if (newOrders.length > 0) {
			logger.log(`🔔 Detectados ${newOrders.length} pedido(s) nuevo(s) para notificar`);
			
			newOrders.forEach(async (order) => {
				const orderId = getOrderId(order);
				const orderDisplayId = order.id || `ORD-${orderId}`;
				
				// Marcar como notificado inmediatamente para evitar duplicados
				notifiedOrdersRef.current.add(orderId);

				// Información del pedido
				const clientName = order.clientName || 'Cliente';
				const localName = order.local || 'Local';
				const deliveryAddress = order.deliveryAddress || 'Sin dirección';
				const suggestedPrice = order.suggestedPrice ? `$${order.suggestedPrice.toFixed(2)}` : 'Precio a acordar';

				// Mensaje de la notificación push (como WhatsApp)
				const notificationTitle = `📦 Nuevo pedido - ${orderDisplayId}`;
				const notificationBody = `${localName} → ${clientName}\n${deliveryAddress}\n${suggestedPrice}`;

				logger.log(`🔔 Enviando notificación para pedido: ${orderDisplayId}`, {
					orderId,
					orderDisplayId,
					clientName,
					localName,
				});

				// Mostrar solo notificación push nativa (sin toasts)
				try {
					await showNotification(notificationTitle, {
						body: notificationBody,
						tag: `order-${orderId}`,
					});
					logger.log(`✅ Notificación enviada exitosamente para: ${orderDisplayId}`);
				} catch (err) {
					logger.error(`❌ Error enviando notificación para ${orderDisplayId}:`, err);
				}
			});
		}

		// Actualizar referencia de pedidos anteriores (después de procesar notificaciones)
		previousOrdersRef.current = [...orders];

		// Limpiar pedidos notificados que ya no están pendientes (para evitar acumulación)
		const currentPendingIds = new Set(
			currentPendingOrders.map(order => getOrderId(order)).filter(Boolean)
		);
		
		// Remover IDs de pedidos que ya no están pendientes
		notifiedOrdersRef.current.forEach(orderId => {
			if (!currentPendingIds.has(orderId)) {
				notifiedOrdersRef.current.delete(orderId);
			}
		});
	}, [orders, currentDriver, isOnline, showNotification]);
}

