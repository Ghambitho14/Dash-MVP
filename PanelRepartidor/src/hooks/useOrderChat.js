import { useState, useEffect, useCallback, useRef } from 'react';
import {
	getOrCreateOrderChat,
	getOrderChatMessages,
	sendOrderChatMessage as sendMessageService,
	uploadChatImage,
	markOrderChatMessagesAsRead,
	getOrderChatByOrderId,
} from '../services/orderChatService';
import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

/**
 * Hook para gestionar chat de pedidos - PanelRepartidor
 * Chat entre empresa y repartidor sobre un pedido específico
 */
export function useOrderChat(order, currentDriver) {
	const [chat, setChat] = useState(null);
	const [messages, setMessages] = useState([]);
	const [loading, setLoading] = useState(false);
	const [sending, setSending] = useState(false);
	const [chatExpired, setChatExpired] = useState(false);
	const messagesEndRef = useRef(null);
	const channelRef = useRef(null);

	// Scroll al final de los mensajes
	const scrollToBottom = useCallback(() => {
		if (messagesEndRef.current) {
			setTimeout(() => {
				messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
			}, 100);
		}
	}, []);

	// Inicializar chat cuando hay pedido
	useEffect(() => {
		if (!order || !currentDriver) {
			setChat(null);
			setMessages([]);
			return;
		}

		const initializeChat = async () => {
			setLoading(true);
			try {
				const orderDbId = order._dbId || order.id?.replace('ORD-', '');
				const companyId = order.company_id || order._dbCompanyId;
				const driverId = currentDriver.id;

				if (!orderDbId || !companyId || !driverId) {
					logger.warn('⚠️ Datos incompletos para inicializar chat:', { orderDbId, companyId, driverId });
					return;
				}

				// Intentar obtener chat existente primero
				let existingChat = await getOrderChatByOrderId(orderDbId);
				
				// Si no existe o expiró, crear uno nuevo
				if (!existingChat) {
					existingChat = await getOrCreateOrderChat(orderDbId, companyId, driverId);
				}

				setChat(existingChat);
				await loadMessages(existingChat.id);
			} catch (err) {
				logger.error('❌ Error inicializando chat:', err);
				if (err.message?.includes('expirado')) {
					setChatExpired(true);
				}
			} finally {
				setLoading(false);
			}
		};

		initializeChat();
	}, [order?._dbId, order?.company_id, currentDriver?.id]);

	// Cargar mensajes de un chat
	const loadMessages = useCallback(async (chatId, showLoading = true) => {
		if (!chatId) {
			setMessages([]);
			return;
		}

		if (showLoading) {
			setLoading(true);
		}

		try {
			const loadedMessages = await getOrderChatMessages(chatId);
			
			// Mantener mensajes temporales que aún no se han confirmado
			setMessages(prev => {
				const tempMessages = prev.filter(m => m._isTemporary);
				
				// Combinar mensajes temporales con los cargados, evitando duplicados
				const allMessages = [...tempMessages];
				loadedMessages.forEach(loadedMsg => {
					if (allMessages.some(m => m.id === loadedMsg.id)) {
						return;
					}
					if (tempMessages.some(m => 
						m.message === loadedMsg.message && 
						Math.abs(new Date(m.created_at) - new Date(loadedMsg.created_at)) < 5000
					)) {
						return;
					}
					allMessages.push(loadedMsg);
				});
				
				return allMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
			});
			
			// Marcar mensajes como leídos
			if (currentDriver) {
				await markOrderChatMessagesAsRead(chatId, currentDriver.id, 'driver');
			}
		} catch (err) {
			logger.error('❌ Error cargando mensajes:', err);
			if (err.message?.includes('expirado')) {
				setChatExpired(true);
			}
		} finally {
			if (showLoading) {
				setLoading(false);
			}
		}
	}, [currentDriver]);

	// Enviar mensaje
	const sendMessage = useCallback(async (messageText, imageFile = null) => {
		if (!chat || !currentDriver) return;
		if (!messageText?.trim() && !imageFile) return;

		const messageTextTrimmed = messageText?.trim() || '';
		const senderId = currentDriver.id;
		const senderType = 'driver';

		// Optimistic update
		const tempMessage = {
			id: `temp-${Date.now()}`,
			chat_id: chat.id,
			sender_id: senderId,
			sender_type: senderType,
			message: messageTextTrimmed,
			image_url: imageFile ? URL.createObjectURL(imageFile) : null,
			created_at: new Date().toISOString(),
			read_at: null,
			_isTemporary: true,
		};

		setMessages(prev => [...prev, tempMessage]);
		scrollToBottom();
		setSending(true);

		try {
			let imageUrl = null;

			// Subir imagen si existe
			if (imageFile) {
				imageUrl = await uploadChatImage(imageFile, chat.id, senderId);
			}

			const newMessage = await sendMessageService(
				chat.id,
				senderId,
				senderType,
				messageTextTrimmed,
				imageUrl
			);
			
			// Limpiar URL temporal si se creó
			if (tempMessage.image_url && tempMessage.image_url.startsWith('blob:')) {
				URL.revokeObjectURL(tempMessage.image_url);
			}
			
			// Reemplazar mensaje temporal con el real
			setMessages(prev => {
				const filtered = prev.filter(m => m.id !== tempMessage.id);
				if (!filtered.some(m => m.id === newMessage.id)) {
					const updated = [...filtered, newMessage];
					return updated.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
				}
				return filtered;
			});
			
			setTimeout(() => scrollToBottom(), 100);
		} catch (err) {
			// Limpiar URL temporal si se creó
			if (tempMessage.image_url && tempMessage.image_url.startsWith('blob:')) {
				URL.revokeObjectURL(tempMessage.image_url);
			}
			
			// Revertir optimistic update
			setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
			logger.error('❌ Error enviando mensaje:', err);
			if (err.message?.includes('expirado')) {
				setChatExpired(true);
			}
			throw err;
		} finally {
			setSending(false);
		}
	}, [chat, currentDriver, scrollToBottom]);

	// Suscribirse a nuevos mensajes en tiempo real
	useEffect(() => {
		if (!chat || !currentDriver) {
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
				channelRef.current = null;
			}
			return;
		}

		const chatId = chat.id;
		const userId = currentDriver.id;

		// Crear canal de Realtime
		const channel = supabase
			.channel(`order-chat-${chatId}-${Date.now()}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'order_chat_messages',
					filter: `chat_id=eq.${chatId}`,
				},
				(payload) => {
					const newMessage = payload.new;
					logger.log('📨 Nuevo mensaje recibido en tiempo real:', {
						id: newMessage.id,
						sender_type: newMessage.sender_type,
						preview: newMessage.message?.substring(0, 30)
					});
					
					setMessages(prev => {
						if (prev.some(m => m.id === newMessage.id)) {
							return prev;
						}
						
						const isDuplicate = prev.some(m => 
							!m._isTemporary && 
							m.message === newMessage.message && 
							m.sender_id === newMessage.sender_id &&
							Math.abs(new Date(m.created_at) - new Date(newMessage.created_at)) < 2000
						);
						
						if (isDuplicate) {
							return prev;
						}
						
						const updated = [...prev, newMessage];
						return updated.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
					});
					
					setTimeout(() => scrollToBottom(), 100);
					
					// Marcar como leído si no es nuestro mensaje
					if (newMessage.sender_id !== userId && newMessage.sender_type !== 'driver') {
						markOrderChatMessagesAsRead(chatId, userId, 'driver').catch(err => {
							logger.error('❌ Error marcando mensaje como leído:', err);
						});
					}
				}
			)
			.subscribe((status) => {
				if (status === 'SUBSCRIBED') {
					logger.log('✅ Suscrito a mensajes del chat en tiempo real');
				} else if (status === 'CHANNEL_ERROR') {
					logger.error('❌ Error en canal de suscripción');
				}
			});

		channelRef.current = channel;

		// Fallback: recargar mensajes cada 5 segundos
		const fallbackInterval = setInterval(() => {
			if (chatId) {
				loadMessages(chatId, false).catch(err => {
					logger.error('❌ Error en fallback de mensajes:', err);
				});
			}
		}, 5000);

		return () => {
			clearInterval(fallbackInterval);
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
				channelRef.current = null;
			}
		};
	}, [chat, currentDriver, scrollToBottom, loadMessages]);

	// Scroll cuando cambian los mensajes
	useEffect(() => {
		scrollToBottom();
	}, [messages, scrollToBottom]);

	return {
		chat,
		messages,
		loading,
		sending,
		chatExpired,
		messagesEndRef,
		sendMessage,
	};
}

