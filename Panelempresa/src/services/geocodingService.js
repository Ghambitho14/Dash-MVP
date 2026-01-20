import { logger } from '../utils/logger';

/**
 * Servicio de geocodificación usando Nominatim (OpenStreetMap)
 * Gratuito y sin límites estrictos (pero con rate limiting recomendado)
 */

// Cache de direcciones geocodificadas para evitar llamadas repetidas
const geocodeCache = new Map();

/**
 * Geocodifica una dirección usando Nominatim (OpenStreetMap)
 * @param {string} address - Dirección a geocodificar
 * @returns {Promise<{lat: number, lon: number} | null>} Coordenadas o null si falla
 */
export async function geocodeAddress(address) {
	if (!address || !address.trim()) {
		return null;
	}

	// Verificar cache
	const cacheKey = address.trim().toLowerCase();
	if (geocodeCache.has(cacheKey)) {
		logger.log('📍 Usando coordenadas desde cache:', address);
		return geocodeCache.get(cacheKey);
	}

	try {
		// Usar Nominatim API (gratuito, sin API key)
		// Rate limit: 1 request por segundo (recomendado)
		const encodedAddress = encodeURIComponent(address.trim());
		const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`;

		// Esperar 1 segundo antes de hacer la petición para respetar rate limiting
		await new Promise(resolve => setTimeout(resolve, 1000));

		const response = await fetch(url, {
			headers: {
				'User-Agent': 'DeliveryApp/1.0', // Nominatim requiere User-Agent
				'Accept-Language': 'es,en'
			}
		});

		if (!response.ok) {
			logger.warn('⚠️ Error en geocodificación Nominatim:', response.status);
			return null;
		}

		const data = await response.json();

		if (data && data.length > 0) {
			const result = data[0];
			const coords = {
				lat: parseFloat(result.lat),
				lon: parseFloat(result.lon)
			};

			// Guardar en cache
			geocodeCache.set(cacheKey, coords);
			logger.log('✅ Dirección geocodificada:', { address, coords });
			return coords;
		}

		logger.warn('⚠️ No se encontraron resultados para:', address);
		return null;
	} catch (error) {
		logger.error('❌ Error en geocodificación:', error);
		return null;
	}
}

/**
 * Geocodifica múltiples direcciones con delay entre cada una
 * @param {string[]} addresses - Array de direcciones
 * @returns {Promise<Map<string, {lat: number, lon: number} | null>>} Mapa de direcciones a coordenadas
 */
export async function geocodeAddresses(addresses) {
	const results = new Map();
	
	for (const address of addresses) {
		if (address && address.trim()) {
			const coords = await geocodeAddress(address);
			results.set(address, coords);
		}
	}
	
	return results;
}

/**
 * Limpia el cache de geocodificación
 */
export function clearGeocodeCache() {
	geocodeCache.clear();
	logger.log('🗑️ Cache de geocodificación limpiado');
}

