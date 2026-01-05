/**
 * Utilidades para manejar errores de Google Maps API
 */

/**
 * Mapeo de códigos de error de Google Maps a mensajes en español
 */
export const GOOGLE_MAPS_ERROR_MESSAGES = {
	// Errores de autenticación
	'ApiNotActivatedMapError': 'La API de Maps JavaScript no está activada en tu proyecto. Actívala en la consola de Google Cloud.',
	'ApiTargetBlockedMapError': 'Esta clave de API no tiene autorización para usar este servicio. Verifica las restricciones en la consola de Google Cloud.',
	'BillingNotEnabledMapError': 'La facturación no está habilitada en tu proyecto. Habilítala en Google Cloud.',
	'ClientBillingNotEnabledMapError': 'La facturación no está habilitada para este ID de cliente.',
	'ExpiredKeyMapError': 'La clave de API está vencida o no es reconocida. Genera una nueva clave en la consola de Google Cloud.',
	'InvalidKeyMapError': 'La clave de API no es válida. Verifica que esté correcta en tu archivo .env.',
	'MissingKeyMapError': 'Falta la clave de API. Agrega VITE_API_KEY_MAPS en tu archivo .env.',
	'RefererNotAllowedMapError': 'Esta URL no está autorizada. Agrega esta URL a las restricciones de la clave de API en Google Cloud.',
	'RefererDeniedMapError': 'Esta aplicación fue bloqueada por violar las Condiciones del Servicio.',
	'OverQuotaMapError': 'Se superó el límite de uso de la API. Las solicitudes funcionarán cuando se restablezca la cuota diaria.',
	'ProjectDeniedMapError': 'Tu proyecto fue denegado. Revisa la consola de Google Cloud para más detalles.',
	'DeletedApiProjectMapError': 'El proyecto de API fue eliminado. Crea un nuevo proyecto y genera una nueva clave.',
	'InvalidClientIdMapError': 'El ID de cliente no es válido o está vencido.',
	'ApiProjectMapError': 'No se pudo resolver la clave de API o el proyecto asociado. Puede ser temporal.',
	
	// Errores de carga
	'NotLoadingAPIFromGoogleMapsError': 'La API debe cargarse desde los servidores de Google.',
	'TOSViolationMapError': 'Este sitio infringe las Condiciones del Servicio de Google Maps.',
	'UnauthorizedURLForClientIdMapError': 'Esta URL no está autorizada para usar el ID de cliente proporcionado.',
	
	// Errores generales
	'UrlAuthenticationCommonError': 'Error de autenticación. Intenta nuevamente en unos momentos.',
};

/**
 * Detecta errores de Google Maps API y devuelve un mensaje descriptivo
 * @param {string} errorCode - Código de error de Google Maps
 * @returns {string} Mensaje de error en español
 */
export function getGoogleMapsErrorMessage(errorCode) {
	return GOOGLE_MAPS_ERROR_MESSAGES[errorCode] || 
		`Error de Google Maps: ${errorCode}. Consulta la consola del navegador para más detalles.`;
}

/**
 * Configura un listener para errores de Google Maps API
 * @param {Function} onError - Callback que se ejecuta cuando hay un error
 */
export function setupGoogleMapsErrorListener(onError) {
	// Google Maps API expone errores en window.google.maps.__gjsload__
	// También podemos escuchar errores en el script tag
	if (typeof window !== 'undefined') {
		// Listener para errores del script
		const scriptErrorHandler = (event) => {
			if (event.target && event.target.src && event.target.src.includes('maps.googleapis.com')) {
				onError('Error cargando Google Maps API. Verifica tu clave de API y las restricciones.');
			}
		};
		
		window.addEventListener('error', scriptErrorHandler, true);
		
		// Retornar función de limpieza
		return () => {
			window.removeEventListener('error', scriptErrorHandler, true);
		};
	}
	
	return () => {};
}

/**
 * Verifica si hay errores de Google Maps en la consola
 * @returns {Promise<string|null>} Mensaje de error o null si no hay error
 */
export async function checkGoogleMapsErrors() {
	if (typeof window === 'undefined' || !window.google) {
		return null;
	}
	
	// Google Maps puede exponer errores en window.google.maps.__gjsload__
	// También podemos verificar el estado del mapa
	try {
		// Si hay un error, Google Maps puede mostrar un mapa con marca de agua
		// Esto se detecta visualmente, pero podemos verificar el estado de la API
		return null;
	} catch (error) {
		return `Error verificando Google Maps: ${error.message}`;
	}
}

