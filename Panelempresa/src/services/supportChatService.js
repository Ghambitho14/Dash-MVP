import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

/**
 * ============================================
 * SERVICIO DE CHAT DE SOPORTE
 * Chat entre empresa y superadmin (soporte)
 * ============================================
 */

/**
 * Crea o obtiene el chat de soporte para una empresa
 */
export async function getOrCreateSupportChat(companyId, userId) {
	try {
		// Verificar si existe un chat activo (no expirado) para esta empresa
		const { data: existing, error: searchError } = await supabase
			.from('support_chats')
			.select('*')
			.eq('company_id', companyId)
			.gt('expires_at', new Date().toISOString()) // Solo chats no expirados
			.single();

		if (existing && !searchError) {
			logger.log('✅ Chat de soporte existente encontrado:', existing.id);
			return existing;
		}

		// Si hay error y NO es "no rows", lanzar el error
		if (searchError && searchError.code !== 'PGRST116') {
			throw searchError;
		}

		// Si el chat expiró o no existe, crear uno nuevo
		const { data, error } = await supabase
			.from('support_chats')
			.insert({
				company_id: companyId,
				company_user_id: userId,
				expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días desde ahora
			})
			.select()
			.single();

		if (error) {
			// Si el error es por duplicado (unique constraint), intentar obtener el existente
			if (error.code === '23505') {
				const { data: existingChat, error: fetchError } = await supabase
					.from('support_chats')
					.select('*')
					.eq('company_id', companyId)
					.single();
				
				if (existingChat && !fetchError) {
					logger.log('✅ Chat de soporte obtenido después de intento de duplicado:', existingChat.id);
					return existingChat;
				}
			}
			throw error;
		}

		logger.log('✅ Nuevo chat de soporte creado:', data.id);
		return data;
	} catch (err) {
		logger.error('❌ Error obteniendo/creando chat de soporte:', err);
		throw err;
	}
}

/**
 * Obtiene todos los mensajes de un chat de soporte
 */
export async function getSupportChatMessages(chatId) {
	try {
		if (!chatId) {
			logger.warn('⚠️ getSupportChatMessages: chatId no proporcionado');
			return [];
		}

		const { data, error } = await supabase
			.from('support_chat_messages')
			.select('*')
			.eq('chat_id', chatId)
			.order('created_at', { ascending: true });

		if (error) {
			logger.error('❌ Error en getSupportChatMessages:', error);
			throw error;
		}

		return data || [];
	} catch (err) {
		logger.error('❌ Error en getSupportChatMessages:', err);
		throw err;
	}
}

/**
 * Envía un mensaje en el chat de soporte
 * Renueva automáticamente la expiración del chat (trigger en BD)
 */
export async function sendSupportChatMessage(chatId, senderId, senderType, message) {
	try {
		if (!chatId || !senderId || !senderType || !message?.trim()) {
			throw new Error('Datos incompletos para enviar mensaje');
		}

		// Verificar que el chat existe y no ha expirado
		const { data: chat, error: chatError } = await supabase
			.from('support_chats')
			.select('expires_at')
			.eq('id', chatId)
			.single();

		if (chatError || !chat) {
			throw new Error('Chat no encontrado');
		}

		// Si el chat expiró, crear uno nuevo basado en la empresa
		if (new Date(chat.expires_at) < new Date()) {
			logger.warn('⚠️ Chat de soporte expirado, se necesita crear uno nuevo');
			throw new Error('Chat expirado. Por favor, recarga la página para iniciar un nuevo chat.');
		}

		// Insertar mensaje (el trigger renovará automáticamente expires_at)
		const { data, error } = await supabase
			.from('support_chat_messages')
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

		logger.log('✅ Mensaje de soporte enviado y guardado:', data.id);
		return data;
	} catch (err) {
		logger.error('❌ Error en sendSupportChatMessage:', err);
		throw err;
	}
}

/**
 * Marca mensajes como leídos
 */
export async function markSupportChatMessagesAsRead(chatId, userId, senderType) {
	try {
		if (!chatId || !userId || !senderType) return;

		await supabase
			.from('support_chat_messages')
			.update({ read_at: new Date().toISOString() })
			.eq('chat_id', chatId)
			.eq('sender_type', senderType)
			.neq('sender_id', userId) // No marcar como leídos los propios mensajes
			.is('read_at', null);

		logger.log('✅ Mensajes de soporte marcados como leídos');
	} catch (err) {
		logger.error('❌ Error marcando mensajes como leídos:', err);
	}
}

/**
 * Obtiene el chat de soporte por company_id
 */
export async function getSupportChatByCompanyId(companyId) {
	try {
		const { data, error } = await supabase
			.from('support_chats')
			.select('*')
			.eq('company_id', companyId)
			.gt('expires_at', new Date().toISOString())
			.order('created_at', { ascending: false })
			.limit(1)
			.single();

		if (error && error.code !== 'PGRST116') {
			throw error;
		}

		return data || null;
	} catch (err) {
		logger.error('❌ Error obteniendo chat de soporte:', err);
		throw err;
	}
}

