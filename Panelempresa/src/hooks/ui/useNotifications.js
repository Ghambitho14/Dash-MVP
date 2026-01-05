import { useEffect, useRef } from 'react';

/**
 * Hook para manejar notificaciones del navegador
 */
export function useNotifications() {
	const permissionRef = useRef(null);

	// Solicitar permisos al montar
	useEffect(() => {
		if ('Notification' in window && Notification.permission === 'default') {
			Notification.requestPermission().then(permission => {
				permissionRef.current = permission;
			});
		} else if ('Notification' in window) {
			permissionRef.current = Notification.permission;
		}
	}, []);

	/**
	 * Muestra una notificación del navegador
	 */
	const showNotification = (title, options = {}) => {
		// Solo mostrar si el navegador soporta notificaciones
		if (!('Notification' in window)) {
			return;
		}

		// Si no hay permiso, intentar solicitarlo
		if (Notification.permission === 'default') {
			Notification.requestPermission().then(permission => {
				permissionRef.current = permission;
				if (permission === 'granted') {
					createNotification(title, options);
				}
			});
			return;
		}

		// Si hay permiso, mostrar notificación
		if (Notification.permission === 'granted') {
			createNotification(title, options);
		}
	};

	/**
	 * Crea la notificación
	 */
	const createNotification = (title, options = {}) => {
		// Verificar si la pestaña está activa
		const isTabActive = !document.hidden;

		// Si la pestaña está activa y el usuario está viendo la conversación,
		// no mostrar notificación (opcional, se puede cambiar)
		// Por ahora, siempre mostrar si hay permiso

		const notification = new Notification(title, {
			icon: '/favicon.ico',
			badge: '/favicon.ico',
			tag: options.tag || 'support-message',
			requireInteraction: false,
			silent: false,
			...options,
		});

		// Cerrar automáticamente después de 5 segundos
		setTimeout(() => {
			notification.close();
		}, 5000);

		// Hacer clic en la notificación para enfocar la ventana
		notification.onclick = () => {
			window.focus();
			notification.close();
		};

		return notification;
	};

	return {
		showNotification,
		hasPermission: permissionRef.current === 'granted',
	};
}

