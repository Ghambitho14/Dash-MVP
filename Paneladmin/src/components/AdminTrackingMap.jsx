import { useEffect, useState, useRef, useCallback } from 'react';
import { Bike, Navigation, AlertCircle, MapPin } from 'lucide-react';
import '../style/AdminTrackingMap.css';

export function AdminTrackingMap({ locations, loading: locationsLoading, error: locationsError }) {
	const [mapLoaded, setMapLoaded] = useState(false);
	const [error, setError] = useState(null);
	const mapRef = useRef(null);
	const mapInstanceRef = useRef(null);
	const markersRef = useRef(new Map()); // driverId -> marker
	const subscriptionsRef = useRef([]);

	const apiKey = import.meta.env.VITE_API_KEY_MAPS;

	// Cargar script de Google Maps
	useEffect(() => {
		if (!apiKey) {
			setError('API Key de Google Maps no configurada');
			return;
		}

		// Verificar si ya está cargado
		if (window.google && window.google.maps) {
			setMapLoaded(true);
			return;
		}

		// Verificar si el script ya existe
		const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
		if (existingScript) {
			existingScript.addEventListener('load', () => {
				setMapLoaded(true);
			});
			if (window.google && window.google.maps) {
				setMapLoaded(true);
			}
			return;
		}

		// Cargar script de Google Maps
		const script = document.createElement('script');
		script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
		script.async = true;
		script.defer = true;
		script.onload = () => {
			setMapLoaded(true);
		};
		script.onerror = (error) => {
			setError('Error cargando Google Maps API. Verifica tu clave de API.');
			console.error('Error cargando Google Maps API:', error);
		};
		document.head.appendChild(script);
	}, [apiKey]);

	// Inicializar mapa
	useEffect(() => {
		if (!mapLoaded || !mapRef.current) {
			return;
		}

		const timeoutId = setTimeout(() => {
			if (!window.google || !window.google.maps) {
				console.error('Google Maps no está disponible');
				return;
			}

			// Crear mapa si no existe
			if (!mapInstanceRef.current) {
				const google = window.google;
				// Centro por defecto (Santiago, Chile)
				const defaultCenter = { lat: -33.4489, lng: -70.6693 };
				
				console.log('🗺️ Creando mapa de Google Maps...');
				mapInstanceRef.current = new google.maps.Map(mapRef.current, {
					zoom: 12,
					center: defaultCenter,
					mapTypeControl: false,
					fullscreenControl: true,
					streetViewControl: false,
					styles: [
						{
							featureType: 'poi',
							elementType: 'labels',
							stylers: [{ visibility: 'off' }]
						}
					]
				});
				
				console.log('✅ Mapa creado exitosamente');
			}
		}, 100);

		return () => clearTimeout(timeoutId);
	}, [mapLoaded]);

	// Actualizar marcadores cuando cambian las ubicaciones
	useEffect(() => {
		if (!mapInstanceRef.current || !window.google || locationsLoading || !locations || locations.length === 0) {
			return;
		}

		const timeoutId = setTimeout(() => {
			const google = window.google;
			const bounds = new google.maps.LatLngBounds();
			let hasValidLocations = false;

			// Limpiar marcadores anteriores
			markersRef.current.forEach((marker) => {
				if (marker) marker.setMap(null);
			});
			markersRef.current.clear();

			// Crear marcadores para cada repartidor
			locations.forEach((location) => {
				const driver = location.drivers;
				if (!driver || !location.latitude || !location.longitude) return;

				const lat = Number(location.latitude);
				const lng = Number(location.longitude);

				// Validar coordenadas
				if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
					return;
				}

				hasValidLocations = true;
				const position = { lat, lng };
				bounds.extend(new google.maps.LatLng(lat, lng));

				// Crear marcador con icono de moto
				const driverMarker = new google.maps.Marker({
					position: position,
					map: mapInstanceRef.current,
					icon: {
						url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
							<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
								<defs>
									<filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
										<feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
									</filter>
								</defs>
								<g filter="url(#shadow)">
									<circle cx="20" cy="20" r="18" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
									<text x="20" y="28" font-size="24" text-anchor="middle">🏍️</text>
								</g>
							</svg>
						`),
						scaledSize: new google.maps.Size(40, 40),
						anchor: new google.maps.Point(20, 40)
					},
					title: `Repartidor: ${driver.name || 'Sin nombre'}`,
					zIndex: 1000,
				});

				// Calcular tiempo desde última actualización
				let minutesAgo = 0;
				let isRecent = false;
				if (location.updated_at) {
					try {
						const lastUpdate = new Date(location.updated_at);
						if (!isNaN(lastUpdate.getTime())) {
							minutesAgo = Math.floor((Date.now() - lastUpdate.getTime()) / 60000);
							isRecent = minutesAgo < 5;
						}
					} catch (err) {
						console.error('Error parseando fecha:', err);
					}
				}

				// Crear info window
				const driverInfoWindow = new google.maps.InfoWindow({
					content: `
						<div style="padding: 0.75rem; min-width: 200px;">
							<h3 style="margin: 0 0 0.5rem 0; font-size: 1rem; font-weight: 600;">${driver.name || 'Sin nombre'}</h3>
							<p style="margin: 0.25rem 0; font-size: 0.875rem; color: #6b7280;">
								<strong>Usuario:</strong> ${driver.username || 'N/A'}<br/>
								<strong>Teléfono:</strong> ${driver.phone || 'N/A'}<br/>
								${driver.companies && driver.companies.name ? `<strong>Empresa:</strong> ${driver.companies.name}<br/>` : ''}
								<strong>Ubicación:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}<br/>
								${location.updated_at ? `<strong>Última actualización:</strong> <span style="color: ${isRecent ? '#10b981' : '#f59e0b'}">${minutesAgo === 0 ? 'Hace menos de un minuto' : minutesAgo === 1 ? 'Hace 1 minuto' : `Hace ${minutesAgo} minutos`}</span>` : ''}
							</p>
						</div>
					`,
				});

				driverMarker.addListener('click', () => {
					driverInfoWindow.open(mapInstanceRef.current, driverMarker);
				});

				markersRef.current.set(location.driver_id, driverMarker);
			});

			// Ajustar vista del mapa si hay ubicaciones válidas
			if (hasValidLocations) {
				if (markersRef.current.size > 1) {
					mapInstanceRef.current.fitBounds(bounds, { padding: 50 });
				} else {
					const firstLocation = locations.find(loc => loc.latitude && loc.longitude);
					if (firstLocation) {
						mapInstanceRef.current.setCenter({
							lat: Number(firstLocation.latitude),
							lng: Number(firstLocation.longitude)
						});
						mapInstanceRef.current.setZoom(15);
					}
				}
			}
		}, 100);

		return () => clearTimeout(timeoutId);
	}, [mapLoaded, locations, locationsLoading]);

	// Limpiar marcadores al desmontar
	useEffect(() => {
		return () => {
			markersRef.current.forEach((marker) => {
				if (marker) marker.setMap(null);
			});
			markersRef.current.clear();
		};
	}, []);

	// Mostrar error si no hay API key
	if (!apiKey) {
		return (
			<div className="admin-tracking-map-error">
				<AlertCircle />
				<h3>API Key de Google Maps no configurada</h3>
				<p>Agrega VITE_API_KEY_MAPS en tu archivo .env</p>
			</div>
		);
	}

	// Mostrar loading mientras carga Google Maps API
	if (!mapLoaded) {
		return (
			<div className="admin-tracking-map-loading">
				<Navigation />
				<p>Cargando mapa...</p>
			</div>
		);
	}

	// Mostrar error
	if (error || locationsError) {
		return (
			<div className="admin-tracking-map-error">
				<AlertCircle />
				<h3>{error || locationsError}</h3>
			</div>
		);
	}

	// Mostrar loading mientras cargan ubicaciones
	if (locationsLoading) {
		return (
			<div className="admin-tracking-map-loading">
				<Navigation />
				<p>Cargando ubicaciones...</p>
			</div>
		);
	}

	// Mostrar mensaje si no hay ubicaciones
	if (!locations || locations.length === 0) {
		return (
			<div className="admin-tracking-map-empty">
				<Bike />
				<h3>No hay repartidores con ubicación disponible</h3>
				<p>Los repartidores aparecerán en el mapa cuando compartan su ubicación</p>
			</div>
		);
	}

	return (
		<div className="admin-tracking-map-container">
			<div className="admin-tracking-map-header">
				<div className="admin-tracking-map-legend">
					<div className="admin-tracking-legend-item">
						<div className="admin-tracking-legend-marker admin-tracking-legend-driver"></div>
						<span>Repartidor</span>
					</div>
				</div>
				<div className="admin-tracking-map-stats">
					<span>{locations.length} repartidor{locations.length !== 1 ? 'es' : ''} activo{locations.length !== 1 ? 's' : ''}</span>
				</div>
			</div>
			<div className="admin-tracking-map-content">
				<div ref={mapRef} className="admin-tracking-map" />
			</div>
		</div>
	);
}

