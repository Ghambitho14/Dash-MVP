import { logger } from '../utils/logger';

/**
 * Servicio de rutas usando OSRM (Open Source Routing Machine)
 * Gratuito y sin API key
 */

/**
 * Obtiene la ruta entre dos puntos usando OSRM
 * @param {number} lat1 - Latitud del origen
 * @param {number} lon1 - Longitud del origen
 * @param {number} lat2 - Latitud del destino
 * @param {number} lon2 - Longitud del destino
 * @returns {Promise<{distance: number, duration: number, geometry: Array} | null>} Información de la ruta
 */
export async function getRoute(lat1, lon1, lat2, lon2) {
	try {
		// Usar OSRM Demo Server (gratuito, sin API key)
		// Para producción, se recomienda usar tu propio servidor OSRM
		const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;

		const response = await fetch(url, {
			headers: {
				'User-Agent': 'DeliveryApp/1.0'
			}
		});

		if (!response.ok) {
			logger.warn('⚠️ Error obteniendo ruta OSRM:', response.status);
			return null;
		}

		const data = await response.json();

		if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
			const route = data.routes[0];
			return {
				distance: route.distance / 1000, // Convertir a kilómetros
				duration: route.duration / 60, // Convertir a minutos
				geometry: route.geometry // GeoJSON para dibujar en el mapa
			};
		}

		logger.warn('⚠️ No se pudo calcular la ruta');
		return null;
	} catch (error) {
		logger.error('❌ Error obteniendo ruta:', error);
		return null;
	}
}

