import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

/**
 * ============================================
 * SERVICIO DE CHAT ENTRE EMPRESA Y REPARTIDOR
 * Chat vinculado a pedidos específicos
 * Expiración automática de 24 horas
 * ============================================
 */

/**
 * Crea o obtiene el chat de un pedido
 * Se crea automáticamente cuando el repartidor acepta el pedido
 */
export async function getOrCreateOrderChat(orderId, companyId, driverId) {
	try {
		// Verificar si existe un chat activo (no expirado) para este pedido
		const { data: existing, error: searchError } = await supabase
			.from('order_chats')
			.select('*')
			.eq('order_id', orderId)
			.gt('expires_at', new Date().toISOString()) // Solo chats no expirados
			.single();

		if (existing && !searchError) {
			logger.log('✅ Chat de pedido existente encontrado:', existing.id);
			return existing;
		}

		// Si hay error y NO es "no rows", lanzar el error
		if (searchError && searchError.code !== 'PGRST116') {
			throw searchError;
		}

		// Si el chat expiró o no existe, crear uno nuevo
		const { data, error } = await supabase
			.from('order_chats')
			.insert({
				order_id: orderId,
				company_id: companyId,
				driver_id: driverId,
				expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas desde ahora
			})
			.select()
			.single();

		if (error) {
			// Si el error es por duplicado (unique constraint), intentar obtener el existente
			if (error.code === '23505') {
				const { data: existingChat, error: fetchError } = await supabase
					.from('order_chats')
					.select('*')
					.eq('order_id', orderId)
					.single();
				
				if (existingChat && !fetchError) {
					logger.log('✅ Chat de pedido obtenido después de intento de duplicado:', existingChat.id);
					return existingChat;
				}
			}
			throw error;
		}

		logger.log('✅ Nuevo chat de pedido creado:', data.id);
		return data;
	} catch (err) {
		logger.error('❌ Error obteniendo/creando chat de pedido:', err);
		throw err;
	}
}

/**
 * Obtiene todos los mensajes de un chat
 * Solo retorna mensajes si el chat no ha expirado
 */
export async function getOrderChatMessages(chatId) {
	try {
		if (!chatId) {
			logger.warn('⚠️ getOrderChatMessages: chatId no proporcionado');
			return [];
		}

		// Verificar que el chat existe y no ha expirado
		const { data: chat, error: chatError } = await supabase
			.from('order_chats')
			.select('expires_at')
			.eq('id', chatId)
			.single();

		if (chatError || !chat) {
			logger.warn('⚠️ Chat no encontrado o expirado:', chatId);
			return [];
		}

		// Verificar si el chat expiró
		if (new Date(chat.expires_at) < new Date()) {
			logger.warn('⚠️ Chat expirado, no se pueden cargar mensajes:', chatId);
			return [];
		}

		// Obtener mensajes
		const { data, error } = await supabase
			.from('order_chat_messages')
			.select('*')
			.eq('chat_id', chatId)
			.order('created_at', { ascending: true }); // Orden cronológico

		if (error) {
			logger.error('❌ Error obteniendo mensajes:', error);
			throw error;
		}

		logger.log(`✅ ${data?.length || 0} mensajes cargados para chat ${chatId}`);
		return data || [];
	} catch (err) {
		logger.error('❌ Error en getOrderChatMessages:', err);
		throw err;
	}
}

/**
 * Envía un mensaje en el chat de un pedido
 * Renueva automáticamente la expiración del chat (trigger en BD)
 */
export async function sendOrderChatMessage(chatId, senderId, senderType, message) {
	try {
		if (!chatId || !senderId || !senderType || !message?.trim()) {
			throw new Error('Datos incompletos para enviar mensaje');
		}

		// Verificar que el chat existe y no ha expirado
		const { data: chat, error: chatError } = await supabase
			.from('order_chats')
			.select('expires_at')
			.eq('id', chatId)
			.single();

		if (chatError || !chat) {
			throw new Error('Chat no encontrado');
		}

		// Si el chat expiró, crear uno nuevo basado en el pedido
		if (new Date(chat.expires_at) < new Date()) {
			logger.warn('⚠️ Chat expirado, se necesita crear uno nuevo');
			throw new Error('Chat expirado. Por favor, recarga la página para iniciar un nuevo chat.');
		}

		// Insertar mensaje (el trigger renovará automáticamente expires_at)
		const { data, error } = await supabase
			.from('order_chat_messages')
			.insert({
				chat_id: chatId,
				sender_id: senderId,
				sender_type: senderType,
				message: message.trim(),
			})
			.select()
			.single();

		if (error) {
			logger.error('❌ Error insertando mensaje:', error);
			throw error;
		}

		logger.log('✅ Mensaje enviado y guardado:', data.id);
		return data;
	} catch (err) {
		logger.error('❌ Error en sendOrderChatMessage:', err);
		throw err;
	}
}

/**
 * Marca mensajes como leídos
 */
export async function markOrderChatMessagesAsRead(chatId, userId, senderType) {
	try {
		if (!chatId || !userId) return true;

		const { error } = await supabase
			.from('order_chat_messages')
			.update({ read_at: new Date().toISOString() })
			.eq('chat_id', chatId)
			.neq('sender_id', userId)
			.neq('sender_type', senderType)
			.is('read_at', null);

		if (error) {
			logger.error('❌ Error marcando mensajes como leídos:', error);
			throw error;
		}

		return true;
	} catch (err) {
		logger.error('❌ Error en markOrderChatMessagesAsRead:', err);
		throw err;
	}
}

/**
 * Obtiene el chat de un pedido (si existe y no ha expirado)
 */
export async function getOrderChatByOrderId(orderId) {
	try {
		const { data, error } = await supabase
			.from('order_chats')
			.select('*')
			.eq('order_id', orderId)
			.gt('expires_at', new Date().toISOString()) // Solo chats no expirados
			.single();

		if (error && error.code !== 'PGRST116') {
			throw error;
		}

		return data || null;
	} catch (err) {
		logger.error('❌ Error obteniendo chat por order_id:', err);
		throw err;
	}
}

