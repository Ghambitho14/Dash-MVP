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
 * Sube una imagen a Supabase Storage para el chat de soporte
 */
export async function uploadSupportChatImage(file, chatId, senderId) {
	try {
		if (!file || !chatId || !senderId) {
			throw new Error('Datos incompletos para subir imagen');
		}

		// Validar tipo de archivo
		if (!file.type.startsWith('image/')) {
			throw new Error('El archivo debe ser una imagen');
		}

		// Validar tamaño (máximo 5MB)
		if (file.size > 5 * 1024 * 1024) {
			throw new Error('La imagen debe ser menor a 5MB');
		}

		// Generar nombre único para el archivo
		const fileExt = file.name.split('.').pop();
		const fileName = `support_${chatId}_${senderId}_${Date.now()}.${fileExt}`;
		const filePath = `chat_images/${fileName}`;

		const bucketName = 'avatars';

		// Intentar subir a Supabase Storage
		const { data, error: uploadError } = await supabase.storage
			.from(bucketName)
			.upload(filePath, file, {
				cacheControl: '3600',
				upsert: false,
			});

		if (uploadError) {
			// Si el error es "Bucket not found", mostrar mensaje claro
			if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
				console.error('❌ Bucket no encontrado:', uploadError);
				const errorMessage = `El bucket "${bucketName}" no existe en Supabase Storage.\n\n` +
					`Por favor, crea el bucket manualmente:\n` +
					`1. Ve a tu panel de Supabase (https://supabase.com/dashboard)\n` +
					`2. Selecciona tu proyecto\n` +
					`3. Ve a "Storage" en el menú lateral\n` +
					`4. Haz clic en "New bucket"\n` +
					`5. Nombre: "${bucketName}"\n` +
					`6. Marca como "Public bucket"\n` +
					`7. Configura las políticas de acceso según necesites`;
				throw new Error(errorMessage);
			}

			// Si es error de permisos
			if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('permission') || uploadError.statusCode === 403) {
				console.error('❌ Error de permisos:', uploadError);
				throw new Error(
					`No tienes permisos para subir archivos al bucket "${bucketName}". ` +
					`Verifica las políticas de Storage en Supabase para permitir escritura.`
				);
			}

			console.error('❌ Error subiendo imagen:', uploadError);
			throw uploadError;
		}

		// Obtener URL pública
		const { data: { publicUrl } } = supabase.storage
			.from(bucketName)
			.getPublicUrl(filePath);

		console.log('✅ Imagen subida exitosamente:', publicUrl);
		return publicUrl;
	} catch (err) {
		console.error('❌ Error en uploadSupportChatImage:', err);
		throw err;
	}
}

/**
 * Envía un mensaje de soporte desde el admin
 * @param {string} chatId - ID del chat
 * @param {string} senderId - ID del admin
 * @param {string} message - Texto del mensaje (opcional si hay imagen)
 * @param {string} imageUrl - URL de la imagen (opcional)
 */
export async function sendSupportChatMessage(chatId, senderId, message, imageUrl = null) {
	try {
		if (!chatId || !senderId) {
			throw new Error('Datos incompletos para enviar mensaje');
		}

		// Debe haber al menos mensaje o imagen
		if (!message?.trim() && !imageUrl) {
			throw new Error('El mensaje debe contener texto o una imagen');
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
		const messageData = {
			chat_id: chatId,
			sender_id: senderId,
			sender_type: 'superadmin',
		};

		if (message?.trim()) {
			messageData.message = message.trim();
		}

		if (imageUrl) {
			messageData.image_url = imageUrl;
		}

		const { data, error } = await supabase
			.from('support_chat_messages')
			.insert(messageData)
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

