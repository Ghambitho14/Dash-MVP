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
 * Sube una imagen a Supabase Storage para el chat
 */
export async function uploadChatImage(file, chatId, senderId) {
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
		const fileName = `${chatId}_${senderId}_${Date.now()}.${fileExt}`;
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
				logger.error('❌ Bucket no encontrado:', uploadError);
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
				logger.error('❌ Error de permisos:', uploadError);
				throw new Error(
					`No tienes permisos para subir archivos al bucket "${bucketName}". ` +
					`Verifica las políticas de Storage en Supabase para permitir escritura.`
				);
			}

			logger.error('❌ Error subiendo imagen:', uploadError);
			throw uploadError;
		}

		// Obtener URL pública
		const { data: { publicUrl } } = supabase.storage
			.from(bucketName)
			.getPublicUrl(filePath);

		logger.log('✅ Imagen subida exitosamente:', publicUrl);
		return publicUrl;
	} catch (err) {
		logger.error('❌ Error en uploadChatImage:', err);
		throw err;
	}
}

/**
 * Envía un mensaje en el chat de un pedido
 * Renueva automáticamente la expiración del chat (trigger en BD)
 * @param {string} chatId - ID del chat
 * @param {string} senderId - ID del remitente
 * @param {string} senderType - Tipo de remitente ('driver' o 'company_user')
 * @param {string} message - Texto del mensaje (opcional si hay imagen)
 * @param {string} imageUrl - URL de la imagen (opcional)
 */
export async function sendOrderChatMessage(chatId, senderId, senderType, message, imageUrl = null) {
	try {
		if (!chatId || !senderId || !senderType) {
			throw new Error('Datos incompletos para enviar mensaje');
		}

		// Debe haber al menos mensaje o imagen
		if (!message?.trim() && !imageUrl) {
			throw new Error('El mensaje debe contener texto o una imagen');
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
		const messageData = {
			chat_id: chatId,
			sender_id: senderId,
			sender_type: senderType,
		};

		if (message?.trim()) {
			messageData.message = message.trim();
		}

		if (imageUrl) {
			messageData.image_url = imageUrl;
		}

		const { data, error } = await supabase
			.from('order_chat_messages')
			.insert(messageData)
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

