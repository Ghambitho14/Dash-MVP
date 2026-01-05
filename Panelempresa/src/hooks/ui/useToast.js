import { useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * Hook personalizado para manejar notificaciones toast
 */
export function useToast() {
	const showSuccess = useCallback((message) => {
		toast.success(message, {
			duration: 3000,
			position: 'top-right',
			style: {
				background: '#f0fdf4',
				color: '#166534',
				border: '1px solid #86efac',
			},
		});
	}, []);

	const showError = useCallback((message) => {
		toast.error(message, {
			duration: 4000,
			position: 'top-right',
			style: {
				background: '#fef2f2',
				color: '#991b1b',
				border: '1px solid #fecaca',
			},
		});
	}, []);

	const showInfo = useCallback((message) => {
		toast(message, {
			duration: 3000,
			position: 'top-right',
			icon: 'ℹ️',
			style: {
				background: '#eff6ff',
				color: '#1e40af',
				border: '1px solid #bfdbfe',
			},
		});
	}, []);

	const showWarning = useCallback((message) => {
		toast(message, {
			duration: 3000,
			position: 'top-right',
			icon: '⚠️',
			style: {
				background: '#fffbeb',
				color: '#92400e',
				border: '1px solid #fde68a',
			},
		});
	}, []);

	return {
		showSuccess,
		showError,
		showInfo,
		showWarning,
	};
}

