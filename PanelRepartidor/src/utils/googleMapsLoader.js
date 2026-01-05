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

	if (loadPromise) return loadPromise;

	const libs = uniqueLibraries(libraries);
	const librariesParam = libs.length > 0 ? `&libraries=${encodeURIComponent(libs.join(','))}` : '';

	loadPromise = new Promise((resolve, reject) => {
		const existingScript = document.querySelector('script[data-google-maps-loader="true"]')
			|| document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');

		const onLoad = () => {
			if (window.google && window.google.maps) {
				resolve(window.google);
				return;
			}
			reject(new Error('Google Maps se cargó pero no está disponible'));
		};

		const onError = (err) => {
			reject(err instanceof Error ? err : new Error('Error cargando Google Maps'));
		};

		if (existingScript) {
			existingScript.addEventListener('load', onLoad, { once: true });
			existingScript.addEventListener('error', onError, { once: true });

			// Si ya terminó de cargar antes de enganchar listeners
			if (window.google && window.google.maps) {
				onLoad();
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

