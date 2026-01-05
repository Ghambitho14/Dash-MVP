import { useEffect, useState, useRef } from 'react';
import { getOrderDriverLocation, subscribeToDriverLocation } from '../../services/locationService';
import { MapPin, Navigation, Package, Clock } from 'lucide-react';
import { geocodeAddress, calculateDistance } from '../../utils/utils';
import { logger } from '../../utils/logger';
import '../../styles/Components/OrderMap.css';

export function OrderMap({ order, pickupAddress, deliveryAddress }) {
	const [driverLocation, setDriverLocation] = useState(null);
	const [pickupCoords, setPickupCoords] = useState(null);
	const [deliveryCoords, setDeliveryCoords] = useState(null);
	const [estimatedTime, setEstimatedTime] = useState(null);
	const [loading, setLoading] = useState(true);
	const [mapLoaded, setMapLoaded] = useState(false);
	const mapRef = useRef(null);
	const mapInstanceRef = useRef(null);
	const markersRef = useRef([]);
	const directionsServiceRef = useRef(null);
	const directionsRendererRef = useRef(null);
	const unsubscribeRef = useRef(null);

	const apiKey = import.meta.env.VITE_API_KEY_MAPS;

	// Cargar script de Google Maps
	useEffect(() => {
		logger.log('🔑 API Key:', apiKey ? 'Configurada' : 'NO CONFIGURADA');
		
		if (!apiKey) {
			logger.error('❌ VITE_API_KEY_MAPS no está configurada en .env');
			setLoading(false);
			return;
		}

		// Verificar si ya está cargado
		if (window.google && window.google.maps) {
			logger.log('✅ Google Maps ya está cargado');
			setMapLoaded(true);
			return;
		}

		// Verificar si el script ya existe
		const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
		if (existingScript) {
			logger.log('📜 Script de Google Maps ya existe, esperando carga...');
			existingScript.addEventListener('load', () => {
				logger.log('✅ Script cargado desde elemento existente');
				setMapLoaded(true);
			});
			// Si ya está cargado pero no detectamos window.google, esperar un poco
			if (window.google && window.google.maps) {
				setMapLoaded(true);
			}
			return;
		}

		logger.log('📥 Cargando script de Google Maps...');
		// Cargar script de Google Maps con loading=async
		const script = document.createElement('script');
		script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,directions&loading=async`;
		script.async = true;
		script.defer = true;
		script.onload = () => {
			logger.log('✅ Google Maps API cargada correctamente');
			setMapLoaded(true);
		};
		script.onerror = (error) => {
			logger.error('❌ Error cargando Google Maps API:', error);
			setLoading(false);
		};
		document.head.appendChild(script);

		return () => {
			// No limpiar el script, puede ser usado por otros componentes
		};
	}, [apiKey]);

	// Geocodificar direcciones
	useEffect(() => {
		const loadAddresses = async () => {
			if (!pickupAddress && !deliveryAddress) {
				setLoading(false);
				return;
			}

			setLoading(true);
			
			if (pickupAddress) {
				const coords = await geocodeAddress(pickupAddress);
				setPickupCoords(coords);
			}
			
			if (deliveryAddress) {
				const coords = await geocodeAddress(deliveryAddress);
				setDeliveryCoords(coords);
			}
			
			setLoading(false);
		};

		loadAddresses();
	}, [pickupAddress, deliveryAddress]);

	// Calcular tiempo estimado
	useEffect(() => {
		if (driverLocation && pickupCoords) {
			const distance = calculateDistance(
				driverLocation.lat,
				driverLocation.lon,
				pickupCoords.lat,
				pickupCoords.lon
			);
			// Estimación: 1 km = 2 minutos (promedio en ciudad)
			const minutes = Math.ceil(distance * 2);
			setEstimatedTime(minutes);
		} else {
			setEstimatedTime(null);
		}
	}, [driverLocation, pickupCoords]);

	// Obtener ubicación del repartidor
	useEffect(() => {
		if (!order?._dbId || !order?.driverId) {
			return;
		}

		const loadDriverLocation = async () => {
			try {
				const location = await getOrderDriverLocation(order._dbId);
				if (location && location.latitude && location.longitude) {
					logger.log('📍 Ubicación del repartidor cargada:', {
						driverId: order.driverId,
						lat: location.latitude,
						lng: location.longitude
					});
					setDriverLocation({
						lat: parseFloat(location.latitude),
						lng: parseFloat(location.longitude),
					});
				} else {
					logger.warn('📍 No se encontró ubicación para el repartidor:', order.driverId);
				}
			} catch (err) {
				logger.error('Error cargando ubicación del repartidor:', err);
			}
		};

		// Cargar ubicación inicial
		loadDriverLocation();

		// Suscribirse a cambios en tiempo real
		if (order.driverId) {
			unsubscribeRef.current = subscribeToDriverLocation(order.driverId, (newLocation) => {
				logger.log('📍 Nueva ubicación recibida via realtime:', {
					driverId: order.driverId,
					location: newLocation
				});
				if (newLocation && newLocation.latitude && newLocation.longitude) {
					setDriverLocation({
						lat: parseFloat(newLocation.latitude),
						lng: parseFloat(newLocation.longitude),
					});
				}
			});
		}

		// Fallback: polling cada 10 segundos para asegurar actualizaciones
		const pollingInterval = setInterval(() => {
			loadDriverLocation();
		}, 10000);

		return () => {
			if (unsubscribeRef.current) {
				unsubscribeRef.current();
			}
			clearInterval(pollingInterval);
		};
	}, [order?._dbId, order?.driverId]);

	// Inicializar mapa cuando esté listo
	useEffect(() => {
		// Pequeño delay para asegurar que el DOM esté listo (especialmente en modales)
		const timeoutId = setTimeout(() => {
			logger.log('🗺️ Inicializando mapa...', {
				mapLoaded,
				hasGoogle: !!window.google,
				hasRef: !!mapRef.current,
				hasPickup: !!pickupCoords,
				hasDelivery: !!deliveryCoords
			});

			if (!mapLoaded) {
				logger.log('⏳ Esperando carga de Google Maps...');
				return;
			}

			if (!window.google || !window.google.maps) {
				logger.error('❌ window.google no está disponible');
				return;
			}

			if (!mapRef.current) {
				logger.error('❌ mapRef.current no está disponible');
				return;
			}

			if (!pickupCoords && !deliveryCoords) {
				logger.log('⏳ Esperando coordenadas...');
				return;
			}

			logger.log('✅ Todas las condiciones cumplidas, creando mapa...');
		const google = window.google;
		
		// Calcular centro del mapa
		const bounds = new google.maps.LatLngBounds();
		const coords = [];
		
		if (pickupCoords) {
			coords.push({ lat: pickupCoords.lat, lng: pickupCoords.lon });
			bounds.extend(new google.maps.LatLng(pickupCoords.lat, pickupCoords.lon));
		}
		if (deliveryCoords) {
			coords.push({ lat: deliveryCoords.lat, lng: deliveryCoords.lon });
			bounds.extend(new google.maps.LatLng(deliveryCoords.lat, deliveryCoords.lon));
		}
		if (driverLocation) {
			coords.push({ lat: driverLocation.lat, lng: driverLocation.lng });
			bounds.extend(new google.maps.LatLng(driverLocation.lat, driverLocation.lng));
		}

		// Crear mapa
		let map = null;
		try {
			map = new google.maps.Map(mapRef.current, {
				zoom: 13,
				center: coords[0] || { lat: -33.4489, lng: -70.6693 },
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

			logger.log('✅ Mapa creado exitosamente');

			// Ajustar bounds si hay múltiples puntos
			if (coords.length > 1) {
				map.fitBounds(bounds, { padding: 50 });
			}

			mapInstanceRef.current = map;
		} catch (error) {
			logger.error('❌ Error creando mapa:', error);
			return;
		}

		// Verificar que el mapa se creó correctamente
		if (!map || !mapInstanceRef.current) {
			logger.error('❌ No se pudo crear el mapa');
			return;
		}

		// Usar mapInstanceRef para todas las referencias
		const mapInstance = mapInstanceRef.current;

		// Inicializar Directions Service y Renderer
		directionsServiceRef.current = new google.maps.DirectionsService();
		directionsRendererRef.current = new google.maps.DirectionsRenderer({
			map: mapInstance,
			suppressMarkers: true, // Usaremos nuestros propios marcadores
			polylineOptions: {
				strokeColor: '#10b981',
				strokeWeight: 5,
				strokeOpacity: 0.8
			}
		});

		// Dibujar ruta si hay ambas direcciones
		if (pickupCoords && deliveryCoords) {
			directionsServiceRef.current.route(
				{
					origin: { lat: pickupCoords.lat, lng: pickupCoords.lon },
					destination: { lat: deliveryCoords.lat, lng: deliveryCoords.lon },
					travelMode: google.maps.TravelMode.DRIVING
				},
				(result, status) => {
					if (status === 'OK' && directionsRendererRef.current) {
						directionsRendererRef.current.setDirections(result);
					}
				}
			);
		}

		// Limpiar marcadores anteriores
		markersRef.current.forEach(marker => marker.setMap(null));
		markersRef.current = [];

		// Crear marcador de retiro
		if (pickupCoords) {
			const pickupMarker = new google.maps.Marker({
				position: { lat: pickupCoords.lat, lng: pickupCoords.lon },
				map: mapInstance,
				icon: {
					path: google.maps.SymbolPath.CIRCLE,
					scale: 20,
					fillColor: '#10b981',
					fillOpacity: 1,
					strokeColor: '#ffffff',
					strokeWeight: 3
				},
				title: 'Punto de Retiro',
				zIndex: 1000
			});

			const pickupInfoWindow = new google.maps.InfoWindow({
				content: `
					<div style="padding: 0.5rem;">
						<strong>Punto de Retiro</strong><br/>
						${pickupAddress}
					</div>
				`
			});

			pickupMarker.addListener('click', () => {
				pickupInfoWindow.open(mapInstance, pickupMarker);
			});

			markersRef.current.push(pickupMarker);
		}

		// Crear marcador de entrega
		if (deliveryCoords) {
			const deliveryMarker = new google.maps.Marker({
				position: { lat: deliveryCoords.lat, lng: deliveryCoords.lon },
				map: mapInstance,
				icon: {
					path: google.maps.SymbolPath.CIRCLE,
					scale: 20,
					fillColor: '#f97316',
					fillOpacity: 1,
					strokeColor: '#ffffff',
					strokeWeight: 3
				},
				title: 'Punto de Entrega',
				zIndex: 1000
			});

			const deliveryInfoWindow = new google.maps.InfoWindow({
				content: `
					<div style="padding: 0.5rem;">
						<strong>Punto de Entrega</strong><br/>
						${deliveryAddress}
					</div>
				`
			});

			deliveryMarker.addListener('click', () => {
				deliveryInfoWindow.open(mapInstance, deliveryMarker);
			});

			markersRef.current.push(deliveryMarker);
		}

		// Crear marcador del repartidor
		if (driverLocation) {
			const driverMarker = new google.maps.Marker({
				position: { lat: driverLocation.lat, lng: driverLocation.lng },
				map: mapInstance,
				icon: {
					url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
						<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg">
							<defs>
								<filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
									<feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
								</filter>
							</defs>
							<g filter="url(#shadow)">
								<rect x="0" y="0" width="60" height="25" rx="4" fill="#3b82f6"/>
								<text x="30" y="16" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="white" text-anchor="middle">${estimatedTime || 0} MIN</text>
								<text x="30" y="45" font-size="30" text-anchor="middle">🏍️</text>
							</g>
						</svg>
					`),
					scaledSize: new google.maps.Size(60, 60),
					anchor: new google.maps.Point(30, 60)
				},
				title: `Repartidor: ${order.driverName || 'En camino'}`,
				zIndex: 2000
			});

			const driverInfoWindow = new google.maps.InfoWindow({
				content: `
					<div style="padding: 0.5rem;">
						<strong>Repartidor</strong><br/>
						${order.driverName || 'En camino'}<br/>
						${estimatedTime ? `Llega en ${estimatedTime} minutos` : 'Ubicación en tiempo real'}
					</div>
				`
			});

			driverMarker.addListener('click', () => {
				driverInfoWindow.open(mapInstance, driverMarker);
			});

			markersRef.current.push(driverMarker);
		}

		}, 100); // Pequeño delay para asegurar que el DOM esté listo (especialmente en modales)

		return () => clearTimeout(timeoutId);
	}, [mapLoaded, pickupCoords, deliveryCoords, driverLocation, estimatedTime, pickupAddress, deliveryAddress, order.driverName]);

	// Limpiar al desmontar
	useEffect(() => {
		return () => {
			// Limpiar marcadores
			if (markersRef.current) {
				markersRef.current.forEach(marker => {
					if (marker && marker.setMap) {
						marker.setMap(null);
					}
				});
				markersRef.current = [];
			}
			// Limpiar directions renderer
			if (directionsRendererRef.current) {
				directionsRendererRef.current.setMap(null);
			}
		};
	}, []);

	// Mostrar error si no hay API key
	if (!apiKey) {
		return (
			<div className="order-map-error">
				<MapPin />
				<p>API Key de Google Maps no configurada</p>
				<p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#6b7280' }}>
					Agrega VITE_API_KEY_MAPS en tu archivo .env en la raíz del proyecto
				</p>
			</div>
		);
	}

	// Mostrar loading mientras carga
	if (loading || !mapLoaded) {
		return (
			<div className="order-map-loading">
				<p>Cargando mapa...</p>
				{!mapLoaded && (
					<p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
						Cargando Google Maps API...
					</p>
				)}
			</div>
		);
	}

	// Mostrar error si no hay coordenadas
	if (!pickupCoords && !deliveryCoords) {
		return (
			<div className="order-map-error">
				<MapPin />
				<p>No se pudieron cargar las ubicaciones</p>
				<p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#6b7280' }}>
					Verifica que las direcciones sean válidas
				</p>
			</div>
		);
	}

	return (
		<div className="order-map-container">
			{/* Tarjetas de direcciones */}
			<div className="order-map-addresses">
				{pickupAddress && (
					<div className="order-map-address-card order-map-address-pickup">
						<div className="order-map-address-icon">
							<Package />
						</div>
						<div className="order-map-address-text">
							<p className="order-map-address-label">Retiro</p>
							<p className="order-map-address-value">{pickupAddress}</p>
						</div>
					</div>
				)}
				{deliveryAddress && (
					<div className="order-map-address-card order-map-address-delivery">
						<div className="order-map-address-icon">
							<Navigation />
						</div>
						<div className="order-map-address-text">
							<p className="order-map-address-label">Entrega</p>
							<p className="order-map-address-value">{deliveryAddress}</p>
						</div>
					</div>
				)}
				{estimatedTime && (
					<div className="order-map-eta">
						<Clock />
						<span>Repartidor llega en {estimatedTime} min</span>
					</div>
				)}
			</div>

			{/* Mapa de Google Maps */}
			<div ref={mapRef} className="order-map-google" />
		</div>
	);
}

