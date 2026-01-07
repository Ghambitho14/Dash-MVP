import { useState, useEffect, useCallback, useRef } from 'react';
import {
	getOrCreateSupportChat,
	getSupportChatMessages,
	sendSupportChatMessage as sendMessageService,
	markSupportChatMessagesAsRead,
} from '../services/supportChatService';
import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

/**
 * Hook para gestionar chat de soporte (Repartidor -> Superadmin)
 */
export function useSupportChat(currentDriver) {
	const [chat, setChat] = useState(null);
	const [messages, setMessages] = useState([]);
	const [loading, setLoading] = useState(false);
	const [sending, setSending] = useState(false);
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

	// Inicializar chat de soporte
	useEffect(() => {
		if (!currentDriver) {
			setChat(null);
			setMessages([]);
			return;
		}

		const initializeChat = async () => {
			setLoading(true);
			try {
				const driverId = currentDriver.id;

				if (!driverId) {
					logger.warn('⚠️ Datos incompletos para inicializar chat de soporte: driverId no proporcionado');
					return;
				}

				const existingChat = await getOrCreateSupportChat(driverId);
				setChat(existingChat);
				await loadMessages(existingChat.id);
			} catch (err) {
				logger.error('❌ Error inicializando chat de soporte:', err);
			} finally {
				setLoading(false);
			}
		};

		initializeChat();
	}, [currentDriver]);

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
			const loadedMessages = await getSupportChatMessages(chatId);
			
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
				await markSupportChatMessagesAsRead(chatId, currentDriver.id, 'driver');
			}
		} catch (err) {
			logger.error('❌ Error cargando mensajes de soporte:', err);
		} finally {
			if (showLoading) {
				setLoading(false);
			}
		}
	}, [currentDriver]);

	// Enviar mensaje
	const sendMessage = useCallback(async (messageText) => {
		if (!chat || !messageText.trim() || !currentDriver) return;

		const messageTextTrimmed = messageText.trim();
		const senderId = currentDriver.id;
		const senderType = 'driver';

		// Optimistic update
		const tempMessage = {
			id: `temp-${Date.now()}`,
			chat_id: chat.id,
			sender_id: senderId,
			sender_type: senderType,
			message: messageTextTrimmed,
			created_at: new Date().toISOString(),
			read_at: null,
			_isTemporary: true,
		};

		setMessages(prev => [...prev, tempMessage]);
		scrollToBottom();
		setSending(true);

		try {
			const newMessage = await sendMessageService(
				chat.id,
				senderId,
				senderType,
				messageTextTrimmed
			);
			
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
			// Revertir optimistic update
			setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
			logger.error('❌ Error enviando mensaje de soporte:', err);
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
		const driverId = currentDriver.id;

		// Crear canal de Realtime
		const channel = supabase
			.channel(`support-chat-driver-${chatId}-${Date.now()}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'support_chat_messages',
					filter: `chat_id=eq.${chatId}`,
				},
				(payload) => {
					const newMessage = payload.new;
					logger.log('📨 Nuevo mensaje de soporte recibido en tiempo real:', {
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
					if (newMessage.sender_id !== driverId && newMessage.sender_type !== 'driver') {
						markSupportChatMessagesAsRead(chatId, driverId, 'driver').catch(err => {
							logger.error('❌ Error marcando mensaje de soporte como leído:', err);
						});
					}
				}
			)
			.subscribe((status) => {
				if (status === 'SUBSCRIBED') {
					logger.log('✅ Suscrito a mensajes del chat de soporte en tiempo real');
				} else if (status === 'CHANNEL_ERROR') {
					logger.error('❌ Error en canal de suscripción de soporte');
				}
			});

		channelRef.current = channel;

		// Fallback: recargar mensajes cada 5 segundos
		const fallbackInterval = setInterval(() => {
			if (chatId) {
				loadMessages(chatId, false).catch(err => {
					logger.error('❌ Error en fallback de mensajes de soporte:', err);
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
		messagesEndRef,
		sendMessage,
	};
}

