import { Clock, CheckCircle, Truck, Package, CheckCircle2 } from 'lucide-react';
import { logger } from './logger';
import '../styles/utils/statusUtils.css';

// ============================================
// UTILIDADES DE FECHAS
// ============================================

// Formatear fecha completa
export function formatDate(date) {
	return new Date(date).toLocaleString('es-ES', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

// Formatear tiempo relativo (hace X minutos, etc.)
export function formatRelativeTime(date, currentTime = new Date()) {
	const diff = currentTime.getTime() - new Date(date).getTime();
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (seconds < 60) return `Hace ${seconds} seg`;
	if (minutes < 60) {
		const remainingSeconds = seconds % 60;
		return remainingSeconds === 0 ? `Hace ${minutes} min` : `Hace ${minutes} min ${remainingSeconds} seg`;
	}
	if (hours < 24) {
		const remainingMinutes = minutes % 60;
		return remainingMinutes === 0 ? `Hace ${hours} h` : `Hace ${hours} h ${remainingMinutes} min`;
	}
	if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`;
	
	return new Date(date).toLocaleDateString('es-ES', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	});
}

// Obtener iniciales de un nombre
export function getInitials(name) {
	if (!name) return '??';
	return name
		.split(' ')
		.map(n => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);
}

// ============================================
// UTILIDADES DE PRECIOS
// ============================================

// Formatear precio con formato chileno (punto para miles)
export function formatPrice(price) {
	const rounded = Math.round(price);
	return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ============================================
// UTILIDADES DE ESTADOS
// ============================================

// Obtener color CSS según estado
export function getStatusColor(status) {
	const colors = {
		'Pendiente': 'status-pendiente',
		'Asignado': 'status-asignado',
		'En camino al retiro': 'status-en-camino-al-retiro',
		'En camino': 'status-en-camino-al-retiro', // Alias para compatibilidad
		'Producto retirado': 'status-producto-retirado',
		'Entregado': 'status-entregado',
	};
	return colors[status] || 'status-default';
}

// Obtener icono según estado
export function getStatusIcon(status) {
	const icons = {
		'Pendiente': Clock,
		'Asignado': CheckCircle,
		'En camino al retiro': Truck,
		'En camino': Truck, // Alias para compatibilidad
		'Producto retirado': Package,
		'Entregado': CheckCircle2,
	};
	return icons[status] || Clock;
}

// ============================================
// UTILIDADES DE GEOLOCALIZACIÓN
// ============================================

/**
 * Calcula la distancia entre dos puntos usando la fórmula de Haversine
 * @param {number} lat1 - Latitud del primer punto
 * @param {number} lon1 - Longitud del primer punto
 * @param {number} lat2 - Latitud del segundo punto
 * @param {number} lon2 - Longitud del segundo punto
 * @returns {number} Distancia en kilómetros
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
	const R = 6371; // Radio de la Tierra en kilómetros
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
		Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

/**
 * Geocodifica una dirección usando Nominatim (OpenStreetMap) - GRATUITO
 * @param {string} address - Dirección a geocodificar
 * @returns {Promise<{lat: number, lon: number} | null>} Coordenadas o null si falla
 */
export async function geocodeAddress(address) {
	// Importar dinámicamente para evitar dependencias circulares
	const { geocodeAddress: geocodeWithNominatim } = await import('../services/geocodingService');
	return geocodeWithNominatim(address);
}

/**
 * Verifica si Capacitor está disponible (solo en runtime)
 * @returns {Promise<{Geolocation: any, Capacitor: any} | null>}
 */
export async function getCapacitorModules() {
	// Solo intentar cargar Capacitor si estamos en un entorno que lo soporta
	// Verificar si window.Capacitor existe (se carga automáticamente en apps nativas)
	if (typeof window === 'undefined' || !window.Capacitor) {
		// No estamos en una app nativa, no intentar cargar Capacitor
		return null;
	}
	
	try {
		// Usar import dinámico con string literal para evitar análisis estático
		// Vite ignorará esto si el módulo no está disponible
		const geolocationModule = '@capacitor/geolocation';
		const coreModule = '@capacitor/core';
		
		const [geolocationImport, coreImport] = await Promise.all([
			import(/* @vite-ignore */ geolocationModule),
			import(/* @vite-ignore */ coreModule)
		]);
		
		return {
			Geolocation: geolocationImport.Geolocation,
			Capacitor: coreImport.Capacitor
		};
	} catch (err) {
		// Capacitor no está disponible (estamos en web o módulos no instalados)
		return null;
	}
}

/**
 * Obtiene la ubicación GPS actual del usuario
 * Usa Capacitor Geolocation en móvil, fallback a Web API en navegador
 * @returns {Promise<{lat: number, lon: number} | null>} Coordenadas o null si falla
 */
export async function getCurrentLocation() {
	// Intentar usar Capacitor si está disponible
	const capacitorModules = await getCapacitorModules();
	
	if (capacitorModules) {
		const { Geolocation, Capacitor } = capacitorModules;
		
		try {
			if (Capacitor.isNativePlatform()) {
				// Verificar permisos primero
				const permissionStatus = await Geolocation.checkPermissions();
				
				if (permissionStatus.location !== 'granted') {
					// Solicitar permisos
					const requestResult = await Geolocation.requestPermissions();
					if (requestResult.location !== 'granted') {
						return null;
					}
				}
				
				// Obtener ubicación con Capacitor
				try {
					const position = await Geolocation.getCurrentPosition({
						enableHighAccuracy: true,
						timeout: 10000,
						maximumAge: 0
					});
					
					return {
						lat: position.coords.latitude,
						lon: position.coords.longitude
					};
				} catch (positionErr) {
					// Si el usuario canceló el diálogo de permisos, no es un error crítico
					const errorMessage = positionErr?.message || '';
					if (errorMessage.includes('cancelled') || errorMessage.includes('PHASE_CLIENT_ALREADY_HIDDEN')) {
						logger.warn('⚠️ Usuario canceló el diálogo de permisos de ubicación');
						return null; // Retornar null silenciosamente
					}
					// Para otros errores, continuar con Web API
					logger.warn('⚠️ Error obteniendo ubicación con Capacitor, intentando Web API:', positionErr?.message);
				}
			}
		} catch (err) {
			// Si falla Capacitor completamente, continuar con Web API
			const errorMessage = err?.message || '';
			if (!errorMessage.includes('cancelled') && !errorMessage.includes('PHASE_CLIENT_ALREADY_HIDDEN')) {
				logger.warn('⚠️ Error con Capacitor Geolocation, usando Web API:', err?.message);
			}
		}
	}
	
	// Fallback a Web Geolocation API (navegador)
	return new Promise((resolve) => {
		if (!navigator.geolocation) {
			resolve(null);
			return;
		}

		// Intentar primero con alta precisión, luego con baja precisión si falla
		const tryGetPosition = (useHighAccuracy = true, attempt = 1) => {
			const maxAttempts = useHighAccuracy ? 2 : 1;
			
			navigator.geolocation.getCurrentPosition(
				(position) => {
					resolve({
						lat: position.coords.latitude,
						lon: position.coords.longitude
					});
				},
				(error) => {
					// Si es timeout y aún hay intentos con la misma precisión, reintentar
					if (error.code === 3 && attempt < maxAttempts) {
						logger.warn(`⚠️ Timeout obteniendo ubicación (intento ${attempt}), reintentando...`);
						setTimeout(() => {
							tryGetPosition(useHighAccuracy, attempt + 1);
						}, 3000);
					} else if (error.code === 3 && useHighAccuracy) {
						// Si falla con alta precisión, intentar con baja precisión
						logger.warn('⚠️ Timeout con alta precisión, intentando con baja precisión...');
						setTimeout(() => {
							tryGetPosition(false, 1);
						}, 1000);
					} else {
						// Error silencioso para ubicación GPS (no crítico)
						logger.warn('⚠️ No se pudo obtener ubicación:', error.code === 3 ? 'Timeout' : error.message);
						resolve(null);
					}
				},
				{
					enableHighAccuracy: useHighAccuracy,
					timeout: useHighAccuracy ? 30000 : 15000, // 30s alta precisión, 15s baja precisión
					maximumAge: useHighAccuracy ? 0 : 300000 // Alta precisión: nueva, Baja: hasta 5 minutos
				}
			);
		};
		
		tryGetPosition();
	});
}

