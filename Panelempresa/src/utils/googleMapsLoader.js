let loadPromise = null;

function uniqueLibraries(libraries) {
	if (!Array.isArray(libraries)) return [];
	return Array.from(new Set(libraries.filter(Boolean).map(String)));
}

export function ensureGoogleMapsLoaded({ apiKey, libraries = [] } = {}) {
	if (typeof window === 'undefined') {
		return Promise.reject(new Error('Google Maps solo está disponible en el navegador'));
	}

	if (window.google && window.google.maps) {
		return Promise.resolve(window.google);
	}

	// Obtener API key desde variable de entorno si no se proporciona
	if (!apiKey) {
		apiKey = import.meta.env.VITE_API_KEY_MAPS;
	}

	if (!apiKey) {
		return Promise.reject(new Error('API Key de Google Maps no configurada'));
	}

	// Si hay una promesa pendiente, reutilizarla
	if (loadPromise) return loadPromise;

	const libs = uniqueLibraries(libraries);
	const librariesParam = libs.length > 0 ? `&libraries=${encodeURIComponent(libs.join(','))}` : '';

	loadPromise = new Promise((resolve, reject) => {
		const existingScript = document.querySelector('script[data-google-maps-loader="true"]')
			|| document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');

		// Función para verificar que Google Maps esté completamente cargado
		const checkGoogleMapsReady = () => {
			if (window.google && window.google.maps && typeof window.google.maps.Map === 'function') {
				return true;
			}
			return false;
		};

		// Función para esperar a que Google Maps esté listo
		const waitForGoogleMaps = (maxAttempts = 50, attempt = 0) => {
			if (checkGoogleMapsReady()) {
				resolve(window.google);
				return;
			}

			if (attempt >= maxAttempts) {
				loadPromise = null;
				reject(new Error('Google Maps se cargó pero Map no está disponible después de múltiples intentos'));
				return;
			}

			setTimeout(() => waitForGoogleMaps(maxAttempts, attempt + 1), 100);
		};

		const onLoad = () => {
			// Esperar a que Map esté disponible
			waitForGoogleMaps();
		};

		const onError = (err) => {
			// Resetear loadPromise para permitir reintentos
			loadPromise = null;
			reject(err instanceof Error ? err : new Error('Error cargando Google Maps'));
		};

		if (existingScript) {
			// Si ya está cargado, verificar inmediatamente
			if (checkGoogleMapsReady()) {
				resolve(window.google);
				return;
			}

			existingScript.addEventListener('load', onLoad, { once: true });
			existingScript.addEventListener('error', onError, { once: true });

			// Si el script ya terminó de cargar, intentar verificar
			if (existingScript.readyState === 'complete' || existingScript.readyState === 'loaded') {
				waitForGoogleMaps();
			}
			return;
		}

		const script = document.createElement('script');
		script.dataset.googleMapsLoader = 'true';
		script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}${librariesParam}&loading=async`;
		script.async = true;
		script.defer = true;
		script.addEventListener('load', onLoad, { once: true });
		script.addEventListener('error', onError, { once: true });
		document.head.appendChild(script);
	});

	return loadPromise;
}


