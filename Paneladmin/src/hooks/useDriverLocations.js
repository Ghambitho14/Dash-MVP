import { useState, useEffect, useRef } from 'react';
import { getAllDriverLocations } from '../services/locationService';
import { supabase } from '../utils/supabase';

/**
 * Hook para trackear ubicaciones de todos los repartidores en tiempo real
 */
export function useDriverLocations() {
	const [locations, setLocations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const mountedRef = useRef(true);
	const channelRef = useRef(null);
	const intervalRef = useRef(null);

	// Cargar ubicaciones
	const loadLocations = async (showLoading = false) => {
		if (!mountedRef.current) return;
		
		try {
			if (showLoading) {
				setLoading(true);
			}
			setError(null);
			const data = await getAllDriverLocations();
			
			if (mountedRef.current) {
				setLocations(data || []);
				console.log(`📍 Ubicaciones cargadas: ${(data || []).length} repartidores`);
			}
		} catch (err) {
			console.error('Error cargando ubicaciones:', err);
			if (mountedRef.current) {
				setError(err.message || 'Error al cargar ubicaciones');
				setLocations([]); // Limpiar ubicaciones en caso de error
			}
		} finally {
			if (mountedRef.current && showLoading) {
				setLoading(false);
			}
		}
	};

	// Suscribirse a cambios en tiempo real y cargar ubicaciones
	useEffect(() => {
		mountedRef.current = true;
		
		// Cargar ubicaciones iniciales (con loading)
		loadLocations(true);

		// Suscribirse a cambios en driver_locations
		const channel = supabase
			.channel('driver_locations_tracking')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'driver_locations',
				},
				(payload) => {
					console.log('📍 Cambio en ubicación detectado:', payload);
					
					// Solo recargar si el componente sigue montado (sin mostrar loading)
					if (mountedRef.current) {
						loadLocations(false);
					}
				}
			)
			.subscribe((status) => {
				console.log('📍 Estado de suscripción de ubicaciones:', status);
				if (status === 'SUBSCRIBED') {
					console.log('✅ Suscrito correctamente a cambios de ubicación');
					if (mountedRef.current) {
						setError(null);
					}
				} else if (status === 'CHANNEL_ERROR') {
					console.error('❌ Error en suscripción de ubicaciones');
					if (mountedRef.current) {
						setError('Error en suscripción en tiempo real');
					}
				} else if (status === 'CLOSED') {
					console.warn('⚠️ Canal de suscripción cerrado, reintentando...');
					// El canal se cerró, intentar reconectar después de un breve delay
					if (mountedRef.current) {
						setTimeout(() => {
							if (mountedRef.current) {
								loadLocations(false);
							}
						}, 2000);
					}
				}
			});

		channelRef.current = channel;

		// Fallback: recargar cada 15 segundos por si falla realtime (sin mostrar loading)
		const fallbackInterval = setInterval(() => {
			if (mountedRef.current) {
				loadLocations(false);
			}
		}, 15000);

		intervalRef.current = fallbackInterval;

		return () => {
			mountedRef.current = false;
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
			}
		};
	}, []);

	return {
		locations,
		loading,
		error,
		reload: () => loadLocations(true),
	};
}

