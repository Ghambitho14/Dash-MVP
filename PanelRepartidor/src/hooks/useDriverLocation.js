import { useState, useEffect } from 'react';
import { getCurrentLocation } from '../utils/utils';
import { logger } from '../utils/logger';

/**
 * Hook para obtener y mantener la ubicación GPS del repartidor
 */
export function useDriverLocation(enabled = true) {
	const [location, setLocation] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!enabled) return;

		setLoading(true);
		getCurrentLocation()
			.then((loc) => {
				if (loc) {
					setLocation(loc);
					setError(null);
				} else {
					// No establecer error si el usuario canceló los permisos
					setError(null);
				}
			})
			.catch((err) => {
				// Manejar errores de forma más detallada
				const errorMessage = err?.message || 'Error desconocido';
				// Si el usuario canceló el diálogo de permisos, no es un error crítico
				if (!errorMessage.includes('cancelled') && !errorMessage.includes('PHASE_CLIENT_ALREADY_HIDDEN')) {
					setError(errorMessage);
					logger.error('Error obteniendo ubicación:', err);
				} else {
					logger.warn('⚠️ Usuario canceló el diálogo de permisos de ubicación');
					setError(null);
				}
			})
			.finally(() => {
				setLoading(false);
			});

		// Actualizar ubicación cada 30 segundos
		const interval = setInterval(() => {
			getCurrentLocation()
				.then((loc) => {
					if (loc) {
						setLocation(loc);
					}
				})
				.catch((err) => {
					const errorMessage = err?.message || '';
					// Solo registrar errores que no sean cancelaciones
					if (!errorMessage.includes('cancelled') && !errorMessage.includes('PHASE_CLIENT_ALREADY_HIDDEN')) {
						logger.error('Error actualizando ubicación:', err);
					}
				});
		}, 30000);

		return () => clearInterval(interval);
	}, [enabled]);

	return { location, loading, error };
}

