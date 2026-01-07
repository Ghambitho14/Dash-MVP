import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { logger } from '../../utils/logger';

/**
 * Hook para verificar si un pedido tiene mensajes no leídos del repartidor
 */
export function useOrderUnreadMessages(order, currentUser) {
	const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

	useEffect(() => {
		if (!order || !currentUser || !order.driverId || order.status === 'Entregado') {
			setHasUnreadMessages(false);
			return;
		}

		const checkUnreadMessages = async () => {
			try {
				const orderDbId = order._dbId || parseInt(order.id?.replace('ORD-', ''), 10);
				if (!orderDbId || isNaN(orderDbId)) {
					setHasUnreadMessages(false);
					return;
				}

				// Obtener el chat del pedido
				const { data: chat, error: chatError } = await supabase
					.from('order_chats')
					.select('id')
					.eq('order_id', orderDbId)
					.gt('expires_at', new Date().toISOString())
					.single();

				if (chatError || !chat) {
					setHasUnreadMessages(false);
					return;
				}

				// Verificar mensajes no leídos del repartidor
				const { data: unreadMessages, error: unreadError } = await supabase
					.from('order_chat_messages')
					.select('id')
					.eq('chat_id', chat.id)
					.eq('sender_type', 'driver')
					.is('read_at', null)
					.limit(1);

				if (!unreadError && unreadMessages && unreadMessages.length > 0) {
					setHasUnreadMessages(true);
				} else {
					setHasUnreadMessages(false);
				}
			} catch (err) {
				logger.error('❌ Error verificando mensajes no leídos:', err);
				setHasUnreadMessages(false);
			}
		};

		checkUnreadMessages();

		// Verificar cada 3 segundos
		const interval = setInterval(checkUnreadMessages, 3000);

		// Escuchar mensajes nuevos en tiempo real
		const channel = supabase
			.channel(`order-unread-${order.id}-${Date.now()}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'order_chat_messages',
				},
				async (payload) => {
					const newMessage = payload.new;
					if (newMessage.sender_type === 'driver') {
						// Verificar si pertenece a este pedido
						try {
							const { data: chat } = await supabase
								.from('order_chats')
								.select('order_id')
								.eq('id', newMessage.chat_id)
								.single();

							if (chat) {
								const orderDbId = order._dbId || parseInt(order.id?.replace('ORD-', ''), 10);
								if (chat.order_id === orderDbId) {
									setHasUnreadMessages(true);
								}
							}
						} catch (err) {
							// Ignorar errores
						}
					}
				}
			)
			.subscribe();

		return () => {
			clearInterval(interval);
			supabase.removeChannel(channel);
		};
	}, [order, currentUser]);

	return hasUnreadMessages;
}

