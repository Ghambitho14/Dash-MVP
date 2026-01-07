import { supabase } from '../utils/supabase';

/**
 * ============================================
 * SERVICIO DE CHAT DE SOPORTE - PANEL ADMIN
 * Chat entre empresa y superadmin (soporte)
 * ============================================
 */

/**
 * Obtiene todos los chats de soporte activos (empresas y repartidores)
 */
export async function getActiveSupportChats() {
	try {
		const { data, error } = await supabase
			.from('support_chats')
			.select(`
				*,
				companies(id, name),
				drivers(id, name)
			`)
			.gt('expires_at', new Date().toISOString())
			.order('created_at', { ascending: false });

		if (error) {
			console.error('❌ Error obteniendo chats de soporte:', error);
			throw error;
		}

		return data || [];
	} catch (err) {
		console.error('❌ Error en getActiveSupportChats:', err);
		throw err;
	}
}

/**
 * Obtiene los mensajes de un chat de soporte
 */
export async function getSupportChatMessages(chatId) {
	try {
		if (!chatId) {
			console.warn('⚠️ getSupportChatMessages: chatId no proporcionado');
			return [];
		}

		const { data, error } = await supabase
			.from('support_chat_messages')
			.select('*')
			.eq('chat_id', chatId)
			.order('created_at', { ascending: true });

		if (error) {
			console.error('❌ Error en getSupportChatMessages:', error);
			throw error;
		}

		return data || [];
	} catch (err) {
		console.error('❌ Error en getSupportChatMessages:', err);
		throw err;
	}
}

/**
 * Envía un mensaje de soporte desde el admin
 */
export async function sendSupportChatMessage(chatId, senderId, message) {
	try {
		if (!chatId || !senderId || !message?.trim()) {
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

		// Si el chat expiró, no permitir enviar mensajes
		if (new Date(chat.expires_at) < new Date()) {
			console.warn('⚠️ Chat de soporte expirado');
			throw new Error('Chat expirado. La empresa debe iniciar un nuevo chat.');
		}

		// Insertar mensaje (el trigger renovará automáticamente expires_at)
		const { data, error } = await supabase
			.from('support_chat_messages')
			.insert({
				chat_id: chatId,
				sender_id: senderId,
				sender_type: 'superadmin',
				message: message.trim(),
			})
			.select()
			.single();

		if (error) {
			console.error('❌ Error insertando mensaje de soporte:', error);
			throw error;
		}

		console.log('✅ Mensaje de soporte enviado y guardado:', data.id);
		return data;
	} catch (err) {
		console.error('❌ Error en sendSupportChatMessage:', err);
		throw err;
	}
}

/**
 * Marca mensajes como leídos
 */
export async function markSupportChatMessagesAsRead(chatId, adminId) {
	try {
		if (!chatId || !adminId) return;

		await supabase
			.from('support_chat_messages')
			.update({ read_at: new Date().toISOString() })
			.eq('chat_id', chatId)
			.in('sender_type', ['company_user', 'driver']) // Marcar mensajes de empresas y repartidores
			.neq('sender_id', adminId) // No marcar como leídos los propios mensajes
			.is('read_at', null);

		console.log('✅ Mensajes de soporte marcados como leídos');
	} catch (err) {
		console.error('❌ Error marcando mensajes como leídos:', err);
	}
}

/**
 * Obtiene el número de mensajes no leídos de todas las empresas
 */
export async function getUnreadSupportMessagesCount() {
	try {
		// Obtener todos los chats activos
		const { data: chats, error: chatsError } = await supabase
			.from('support_chats')
			.select('id')
			.gt('expires_at', new Date().toISOString());

		if (chatsError || !chats || chats.length === 0) {
			return 0;
		}

		const chatIds = chats.map(chat => chat.id);

		// Contar mensajes no leídos de empresas y repartidores
		const { data: unreadMessages, error: unreadError, count } = await supabase
			.from('support_chat_messages')
			.select('id', { count: 'exact', head: true })
			.in('chat_id', chatIds)
			.in('sender_type', ['company_user', 'driver'])
			.is('read_at', null);

		if (unreadError) {
			console.error('❌ Error contando mensajes no leídos:', unreadError);
			return 0;
		}

		return count || 0;
	} catch (err) {
		console.error('❌ Error en getUnreadSupportMessagesCount:', err);
		return 0;
	}
}

