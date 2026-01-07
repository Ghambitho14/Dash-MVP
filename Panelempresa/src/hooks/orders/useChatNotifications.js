import { useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { logger } from '../../utils/logger';
import { getCompanyId, getDbId } from '../../utils/utils';
import toast from 'react-hot-toast';
import { useNotifications } from '../ui/useNotifications';

/**
 * Hook para escuchar mensajes nuevos de chat y mostrar notificaciones
 * Versión simplificada desde cero
 */
export function useChatNotifications(orders, currentUser) {
	const { showNotification } = useNotifications();
	const channelRef = useRef(null);
	const processedMessagesRef = useRef(new Set());

	useEffect(() => {
		if (!orders?.length || !currentUser) {
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
				channelRef.current = null;
			}
			return;
		}

		const companyId = getCompanyId(currentUser);
		const userId = getDbId(currentUser);

		if (!companyId || !userId) {
			logger.warn('⚠️ No se puede inicializar notificaciones: falta companyId o userId');
			return;
		}

		// Filtrar pedidos con repartidor asignado
		const ordersWithDriver = orders.filter(
			order => order.driverId && order.status !== 'Entregado'
		);

		if (ordersWithDriver.length === 0) {
			return;
		}

		// Obtener IDs de pedidos
		const orderDbIds = ordersWithDriver
			.map(order => order._dbId || order.id?.replace('ORD-', ''))
			.filter(Boolean)
			.map(id => parseInt(id, 10))
			.filter(id => !isNaN(id));

		if (orderDbIds.length === 0) {
			return;
		}

		logger.log('🔔 Inicializando notificaciones para pedidos:', orderDbIds);

		// Suscribirse a TODOS los mensajes nuevos (sin filtro de chat_id)
		// Luego verificamos si pertenecen a nuestros pedidos
		const channel = supabase
			.channel(`chat-notifications-${companyId}-${Date.now()}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'order_chat_messages',
				},
				async (payload) => {
					const newMessage = payload.new;
					
					// Evitar procesar el mismo mensaje dos veces
					if (processedMessagesRef.current.has(newMessage.id)) {
						return;
					}
					processedMessagesRef.current.add(newMessage.id);

					// Solo procesar mensajes del repartidor (no de la empresa)
					if (newMessage.sender_type !== 'driver') {
						return;
					}

					// Verificar que el mensaje pertenece a uno de nuestros pedidos
					try {
						const { data: chat, error: chatError } = await supabase
							.from('order_chats')
							.select('order_id')
							.eq('id', newMessage.chat_id)
							.single();

						if (chatError || !chat) {
							return;
						}

						// Verificar si el pedido está en nuestra lista
						const orderDbId = parseInt(chat.order_id, 10);
						if (!orderDbIds.includes(orderDbId)) {
							return;
						}

						// Encontrar el pedido relacionado para obtener el ID formateado
						const relatedOrder = ordersWithDriver.find(order => {
							const orderId = order._dbId || parseInt(order.id?.replace('ORD-', ''), 10);
							return orderId === orderDbId;
						});

						if (!relatedOrder) {
							return;
						}

						const orderId = relatedOrder.id;
						const messagePreview = newMessage.message?.substring(0, 50) || 'Nuevo mensaje';
						
						logger.log('✅ Nuevo mensaje del repartidor - Pedido:', orderId);

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
							tag: `chat-${newMessage.chat_id}`,
						});

					} catch (err) {
						logger.error('❌ Error procesando mensaje:', err);
					}
				}
			)
			.subscribe((status) => {
				if (status === 'SUBSCRIBED') {
					logger.log('✅ Suscrito a notificaciones de chat');
				} else if (status === 'CHANNEL_ERROR') {
					logger.error('❌ Error en canal de notificaciones');
				}
			});

		channelRef.current = channel;

		// Limpiar al desmontar
		return () => {
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
				channelRef.current = null;
			}
			processedMessagesRef.current.clear();
		};
	}, [orders, currentUser, showNotification]);
}
