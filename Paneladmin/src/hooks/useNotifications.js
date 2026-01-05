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
		if (!('Notification' in window)) {
			return;
		}

		if (Notification.permission === 'default') {
			Notification.requestPermission().then(permission => {
				permissionRef.current = permission;
				if (permission === 'granted') {
					createNotification(title, options);
				}
			});
			return;
		}

		if (Notification.permission === 'granted') {
			createNotification(title, options);
		}
	};

	const createNotification = (title, options = {}) => {
		const notification = new Notification(title, {
			icon: '/favicon.ico',
			badge: '/favicon.ico',
			tag: options.tag || 'support-message',
			requireInteraction: false,
			silent: false,
			...options,
		});

		setTimeout(() => {
			notification.close();
		}, 5000);

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

