import { useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';
import toast from 'react-hot-toast';
import { useNotifications } from './useNotifications';

/**
 * Hook para escuchar mensajes nuevos de chat y mostrar notificaciones
 * Escucha todos los chats de pedidos activos del repartidor
 */
export function useChatNotifications(orders, currentDriver) {
	const { showNotification } = useNotifications();
	const channelsRef = useRef([]);
	const processedMessagesRef = useRef(new Set());

	useEffect(() => {
		if (!orders?.length || !currentDriver) {
			// Limpiar canales si no hay pedidos o driver
			channelsRef.current.forEach(channel => {
				supabase.removeChannel(channel);
			});
			channelsRef.current = [];
			return;
		}

		const driverId = currentDriver.id;

		// Filtrar pedidos activos del repartidor
		const activeOrders = orders.filter(order => 
			order.driverId === driverId && order.status !== 'Entregado'
		);

		if (activeOrders.length === 0) {
			return;
		}

		// Obtener IDs de pedidos
		const orderDbIds = activeOrders
			.map(order => order._dbId || order.id?.replace('ORD-', ''))
			.filter(Boolean);

		if (orderDbIds.length === 0) {
			return;
		}

		// Obtener chats activos para estos pedidos
		const loadChats = async () => {
			try {
				const { data: chats, error } = await supabase
					.from('order_chats')
					.select('id, order_id')
					.in('order_id', orderDbIds)
					.gt('expires_at', new Date().toISOString());

				if (error) {
					logger.error('❌ Error cargando chats:', error);
					return;
				}

				if (!chats || chats.length === 0) {
					return;
				}

				// Suscribirse a mensajes nuevos de cada chat
				chats.forEach(chat => {
					const channel = supabase
						.channel(`chat-notifications-${chat.id}-${Date.now()}`)
						.on(
							'postgres_changes',
							{
								event: 'INSERT',
								schema: 'public',
								table: 'order_chat_messages',
								filter: `chat_id=eq.${chat.id}`,
							},
							(payload) => {
								const newMessage = payload.new;
								
								// Evitar procesar el mismo mensaje dos veces
								if (processedMessagesRef.current.has(newMessage.id)) {
									return;
								}
								processedMessagesRef.current.add(newMessage.id);

								// Solo notificar si el mensaje no es del driver actual
								if (newMessage.sender_id !== driverId && newMessage.sender_type !== 'driver') {
									// Encontrar el pedido relacionado
									const relatedOrder = activeOrders.find(
										order => (order._dbId || order.id?.replace('ORD-', '')) === chat.order_id
									);

									if (relatedOrder) {
										const orderId = relatedOrder.id;
										const messagePreview = newMessage.message?.substring(0, 50) || 'Nuevo mensaje';
										
										// Mostrar notificación toast
										toast.success(`Nuevo mensaje - Pedido ${orderId}`, {
											description: messagePreview,
											duration: 5000,
											icon: '💬',
										});

										// Mostrar notificación del navegador
										showNotification(`Nuevo mensaje - Pedido ${orderId}`, {
											body: messagePreview,
											icon: '/favicon.ico',
											tag: `chat-${chat.id}`,
										});
									}
								}
							}
						)
						.subscribe((status) => {
							if (status === 'SUBSCRIBED') {
								logger.log(`✅ Suscrito a notificaciones de chat ${chat.id}`);
							}
						});

					channelsRef.current.push(channel);
				});

			} catch (err) {
				logger.error('❌ Error en useChatNotifications:', err);
			}
		};

		loadChats();

		// Limpiar al desmontar o cuando cambien las dependencias
		return () => {
			channelsRef.current.forEach(channel => {
				supabase.removeChannel(channel);
			});
			channelsRef.current = [];
			processedMessagesRef.current.clear();
		};
	}, [orders, currentDriver, showNotification]);
}

