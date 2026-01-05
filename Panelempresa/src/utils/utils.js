import { useState, useEffect } from 'react';
import { Clock, CheckCircle, Truck, Package, CheckCircle2 } from 'lucide-react';
import { logger } from './logger';

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
// UTILIDADES DE ENTIDADES (helpers para IDs)
// ============================================

/**
 * Obtiene el company_id de un usuario/entidad (estandariza companyId vs company_id)
 */
export function getCompanyId(entity) {
	return entity?.companyId ?? entity?.company_id ?? null;
}

/**
 * Obtiene el ID de base de datos de una entidad (estandariza _dbId vs id)
 */
export function getDbId(entity) {
	return entity?._dbId ?? entity?.id ?? null;
}

// Hook para tiempo en tiempo real
export function useCurrentTime() {
	const [currentTime, setCurrentTime] = useState(new Date());
	
	useEffect(() => {
		const interval = setInterval(() => setCurrentTime(new Date()), 1000);
		return () => clearInterval(interval);
	}, []);
	
	return currentTime;
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
// UTILIDADES DE CÓDIGOS
// ============================================

// Generar código de retiro de 6 dígitos
export function generatePickupCode() {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

// ============================================
// UTILIDADES DE ESTADOS
// ============================================


// Obtener icono según estado
export function getStatusIcon(status) {
	const icons = {
		'Pendiente': Clock,
		'Asignado': CheckCircle,
		'En camino al retiro': Truck,
		'Producto retirado': Package,
		'Entregado': CheckCircle2,
	};
	return icons[status] || Clock;
}


// Formatear estado para vista de empresa
export function formatStatusForCompany(status) {
	if (status === 'Producto retirado') {
		return 'Producto retirado, en camino';
	}
	return status;
}

// ============================================
// UTILIDADES DE ROLES
// ============================================

// Verificar si es admin o CEO
export function isAdminOrEmpresarial(role) {
	return role === 'admin' || role === 'empresarial';
}

// Obtener nombre legible del rol
export function getRoleName(role) {
	const names = {
		'empresarial': 'CEO',
		'admin': 'Administrador',
		'local': 'Local',
	};
	return names[role] || role;
}

// ============================================
// UTILIDADES DE LOCALES
// ============================================

// Obtener dirección de un local
export function getLocalAddress(localName, localConfigs) {
	const local = localConfigs.find(l => l.name === localName);
	return local?.address || '';
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
 * Geocodifica una dirección usando Google Maps Geocoding API
 * @param {string} address - Dirección a geocodificar
 * @returns {Promise<{lat: number, lon: number} | null>} Coordenadas o null si falla
 */
export async function geocodeAddress(address) {
	if (!address || !address.trim()) {
		return null;
	}

	const apiKey = import.meta.env.VITE_API_KEY_MAPS;
	if (!apiKey) {
		logger.warn('VITE_API_KEY_MAPS no configurada, no se puede geocodificar');
		return null;
	}

	// Esperar a que Google Maps esté disponible (máximo 3 segundos)
	if (!window.google || !window.google.maps) {
		await new Promise((resolve) => {
			let attempts = 0;
			const maxAttempts = 30; // 3 segundos (30 * 100ms)
			const checkGoogle = setInterval(() => {
				attempts++;
				if (window.google && window.google.maps && window.google.maps.Geocoder) {
					clearInterval(checkGoogle);
					resolve();
				} else if (attempts >= maxAttempts) {
					// Timeout después de 3 segundos
					clearInterval(checkGoogle);
					resolve();
				}
			}, 100);
		});
	}

	if (!window.google || !window.google.maps || !window.google.maps.Geocoder) {
		return null;
	}

	try {
		const geocoder = new window.google.maps.Geocoder();
		
		return new Promise((resolve) => {
			geocoder.geocode({ address: address }, (results, status) => {
				if (status === 'OK' && results && results.length > 0) {
					const location = results[0].geometry.location;
					resolve({
						lat: location.lat(),
						lon: location.lng()
					});
				} else {
					// Error silencioso para geocodificación (no crítico)
					resolve(null);
				}
			});
		});
	} catch (error) {
		// Error silencioso para geocodificación (no crítico)
		return null;
	}
}

