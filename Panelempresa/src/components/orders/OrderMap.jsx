import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getOrderDriverLocation, subscribeToDriverLocation } from '../../services/locationService';
import { MapPin, Navigation, Package, Clock } from 'lucide-react';
import { geocodeAddress, calculateDistance } from '../../utils/utils';
import { getRoute } from '../../services/routingService';
import { logger } from '../../utils/logger';
import '../../styles/Components/OrderMap.css';

// Fix para iconos de Leaflet en producción
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
	iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
	shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Componente para ajustar el mapa cuando cambian las coordenadas
function MapBounds({ bounds }) {
	const map = useMap();
	
	useEffect(() => {
		if (bounds && bounds.length > 0) {
			map.fitBounds(bounds, { padding: [50, 50] });
		}
	}, [map, bounds]);
	
	return null;
}

export function OrderMap({ order, pickupAddress, deliveryAddress }) {
	const [driverLocation, setDriverLocation] = useState(null);
	const [pickupCoords, setPickupCoords] = useState(null);
	const [deliveryCoords, setDeliveryCoords] = useState(null);
	const [routeGeometry, setRouteGeometry] = useState(null);
	const [estimatedTime, setEstimatedTime] = useState(null);
	const [loading, setLoading] = useState(true);
	const unsubscribeRef = useRef(null);

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

	// Calcular ruta entre pickup y delivery
	useEffect(() => {
		const calculateRoute = async () => {
			if (pickupCoords && deliveryCoords) {
				const route = await getRoute(
					pickupCoords.lat,
					pickupCoords.lon,
					deliveryCoords.lat,
					deliveryCoords.lon
				);
				if (route) {
					setRouteGeometry(route.geometry);
					setEstimatedTime(Math.ceil(route.duration));
				}
			}
		};

		calculateRoute();
	}, [pickupCoords, deliveryCoords]);

	// Calcular tiempo estimado desde repartidor
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

		// Fallback: polling cada 10 segundos
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

	// Calcular bounds para el mapa
	const bounds = [];
	if (pickupCoords) bounds.push([pickupCoords.lat, pickupCoords.lon]);
	if (deliveryCoords) bounds.push([deliveryCoords.lat, deliveryCoords.lon]);
	if (driverLocation) bounds.push([driverLocation.lat, driverLocation.lng]);

	// Centro por defecto (Santiago, Chile)
	const defaultCenter = [-33.4489, -70.6693];
	const center = bounds.length > 0 
		? bounds[0] 
		: defaultCenter;

	// Crear iconos personalizados
	const pickupIcon = L.divIcon({
		className: 'custom-marker pickup-marker',
		html: '<div style="background: #10b981; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
		iconSize: [20, 20],
		iconAnchor: [10, 10],
	});

	const deliveryIcon = L.divIcon({
		className: 'custom-marker delivery-marker',
		html: '<div style="background: #f97316; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
		iconSize: [20, 20],
		iconAnchor: [10, 10],
	});

	const driverIcon = L.divIcon({
		className: 'custom-marker driver-marker',
		html: `
			<div style="
				background: #3b82f6; 
				width: 40px; 
				height: 40px; 
				border-radius: 50%; 
				border: 3px solid white; 
				box-shadow: 0 2px 8px rgba(0,0,0,0.3);
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 20px;
			">🏍️</div>
		`,
		iconSize: [40, 40],
		iconAnchor: [20, 40],
	});

	// Mostrar loading mientras carga
	if (loading) {
		return (
			<div className="order-map-loading">
				<p>Cargando mapa...</p>
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

			{/* Mapa con Leaflet */}
			<MapContainer
				center={center}
				zoom={bounds.length > 1 ? 13 : 15}
				style={{ height: '100%', width: '100%', zIndex: 0 }}
				scrollWheelZoom={true}
			>
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				
				{/* Ajustar bounds cuando hay múltiples puntos */}
				{bounds.length > 1 && <MapBounds bounds={bounds} />}

				{/* Ruta entre pickup y delivery */}
				{routeGeometry && routeGeometry.coordinates && (
					<Polyline
						positions={routeGeometry.coordinates.map(coord => [coord[1], coord[0]])}
						color="#10b981"
						weight={5}
						opacity={0.8}
					/>
				)}

				{/* Marcador de retiro */}
				{pickupCoords && (
					<Marker position={[pickupCoords.lat, pickupCoords.lon]} icon={pickupIcon}>
						<Popup>
							<strong>Punto de Retiro</strong><br/>
							{pickupAddress}
						</Popup>
					</Marker>
				)}

				{/* Marcador de entrega */}
				{deliveryCoords && (
					<Marker position={[deliveryCoords.lat, deliveryCoords.lon]} icon={deliveryIcon}>
						<Popup>
							<strong>Punto de Entrega</strong><br/>
							{deliveryAddress}
						</Popup>
					</Marker>
				)}

				{/* Marcador del repartidor */}
				{driverLocation && (
					<Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
						<Popup>
							<strong>Repartidor</strong><br/>
							{order.driverName || 'En camino'}<br/>
							{estimatedTime ? `Llega en ${estimatedTime} minutos` : 'Ubicación en tiempo real'}
						</Popup>
					</Marker>
				)}
			</MapContainer>
		</div>
	);
}
