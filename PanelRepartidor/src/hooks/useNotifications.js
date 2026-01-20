import { useEffect, useRef } from 'react';
import { getCapacitorModules } from '../utils/utils';
import { logger } from '../utils/logger';

/**
 * Hook para manejar notificaciones push nativas (Android nativo)
 * Solo notificaciones del sistema, sin toasts ni notificaciones dentro de la app
 */
export function useNotifications() {
	const permissionRef = useRef(null);
	const isNativeRef = useRef(false);
	const LocalNotificationsRef = useRef(null);

	// Inicializar Capacitor Local Notifications si está disponible
	useEffect(() => {
		const initCapacitorNotifications = async () => {
			const capacitorModules = await getCapacitorModules();
			
			if (capacitorModules && capacitorModules.Capacitor?.isNativePlatform()) {
				try {
					const localNotificationsModule = '@capacitor/local-notifications';
					const localNotificationsImport = await import(/* @vite-ignore */ localNotificationsModule);
					LocalNotificationsRef.current = localNotificationsImport.LocalNotifications;
					isNativeRef.current = true;
					
					// Solicitar permisos en Android
					const permissionStatus = await LocalNotificationsRef.current.requestPermissions();
					if (permissionStatus.display === 'granted') {
						permissionRef.current = 'granted';
						logger.log('✅ Permisos de notificaciones concedidos en Android');
					} else {
						permissionRef.current = 'denied';
						logger.warn('⚠️ Permisos de notificaciones denegados en Android');
					}
				} catch (err) {
					logger.warn('⚠️ No se pudo cargar Capacitor Local Notifications:', err);
					isNativeRef.current = false;
				}
			}
		};

		initCapacitorNotifications();
	}, []);

	/**
	 * Muestra una notificación push nativa (solo Android)
	 * Similar a las notificaciones de WhatsApp
	 */
	const showNotification = async (title, options = {}) => {
		// Verificar si estamos en Android nativo
		const capacitorModules = await getCapacitorModules();
		const isNative = capacitorModules?.Capacitor?.isNativePlatform();
		
		if (!isNative) {
			logger.warn('⚠️ Notificaciones push solo disponibles en Android nativo');
			return;
		}

		try {
			// Cargar LocalNotifications si no está cargado
			let LocalNotifications = LocalNotificationsRef.current;
			if (!LocalNotifications) {
				logger.log('📦 Cargando LocalNotifications...');
				const localNotificationsModule = '@capacitor/local-notifications';
				const localNotificationsImport = await import(/* @vite-ignore */ localNotificationsModule);
				LocalNotifications = localNotificationsImport.LocalNotifications;
				LocalNotificationsRef.current = LocalNotifications;
				isNativeRef.current = true;
			}

			// Verificar permisos
			let hasPermission = false;
			try {
				if (LocalNotifications.checkPermissions) {
					const permissionStatus = await LocalNotifications.checkPermissions();
					hasPermission = permissionStatus.display === 'granted';
				} else {
					const requestResult = await LocalNotifications.requestPermissions();
					hasPermission = requestResult.display === 'granted';
				}
			} catch (err) {
				logger.warn('⚠️ Error verificando permisos, solicitando...', err);
			}

			// Si no tiene permisos, solicitarlos
			if (!hasPermission) {
				const requestResult = await LocalNotifications.requestPermissions();
				hasPermission = requestResult.display === 'granted';
				
				if (!hasPermission) {
					logger.warn('⚠️ Permisos de notificaciones no concedidos');
					return;
				}
			}

			// Preparar el cuerpo de la notificación
			const bodyText = options.body || '';
			const androidBody = bodyText.length > 200 ? bodyText.substring(0, 200) + '...' : bodyText;

			// Crear notificación push nativa de Android (como WhatsApp)
			// Usar timestamp como ID para evitar colisiones
			const notificationId = Date.now();
			
			const notificationConfig = {
				notifications: [
					{
						title: title,
						body: androidBody,
						id: notificationId,
						sound: 'default',
						smallIcon: 'ic_launcher',
						iconColor: '#f59e0b',
						ongoing: false,
						autoCancel: true,
						vibrate: true,
						priority: 1, // Alta prioridad - aparece como notificación push importante
						visibility: 1, // Public - visible en la pantalla de bloqueo
						channelId: 'order_notifications', // Canal específico para pedidos (alta prioridad)
					},
				],
			};

			logger.log('📤 Enviando notificación push:', {
				title,
				body: androidBody.substring(0, 50) + '...',
				id: notificationId,
			});

			await LocalNotifications.schedule(notificationConfig);
			logger.log(`✅ Notificación push nativa enviada: ${title} (ID: ${notificationId})`);
		} catch (err) {
			logger.error('❌ Error mostrando notificación push nativa:', err);
		}
	};

	return {
		showNotification,
		hasPermission: permissionRef.current === 'granted',
	};
}

