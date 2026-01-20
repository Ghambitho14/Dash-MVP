import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from 'lucide-react';
import { geocodeAddress } from '../../utils/utils';
import { getRoute } from '../../services/routingService';
import { logger } from '../../utils/logger';
import '../../styles/Components/OrderMap.css';

// Fix para iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
	iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
	shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Componente para ajustar bounds
function MapBounds({ bounds }) {
	const map = useMap();
	
	useEffect(() => {
		if (bounds && bounds.length > 0) {
			map.fitBounds(bounds, { padding: [20, 20] });
		}
	}, [map, bounds]);
	
	return null;
}

export function OrderMap({ pickupAddress, deliveryAddress }) {
	const [pickupCoords, setPickupCoords] = useState(null);
	const [deliveryCoords, setDeliveryCoords] = useState(null);
	const [routeGeometry, setRouteGeometry] = useState(null);
	const [loading, setLoading] = useState(true);

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

	// Calcular ruta
	useEffect(() => {
		const calculateRoute = async () => {
			if (pickupCoords && deliveryCoords) {
				const route = await getRoute(
					pickupCoords.lat,
					pickupCoords.lon,
					deliveryCoords.lat,
					deliveryCoords.lon
				);
				if (route && route.geometry) {
					setRouteGeometry(route.geometry);
				}
			}
		};

		calculateRoute();
	}, [pickupCoords, deliveryCoords]);

	// Calcular bounds
	const bounds = [];
	if (pickupCoords) bounds.push([pickupCoords.lat, pickupCoords.lon]);
	if (deliveryCoords) bounds.push([deliveryCoords.lat, deliveryCoords.lon]);

	const defaultCenter = [-33.4489, -70.6693];
	const center = bounds.length > 0 ? bounds[0] : defaultCenter;

	// Crear iconos personalizados
	const createPickupIcon = () => L.divIcon({
		className: 'custom-marker pickup-marker',
		html: '<div style="background: #ef4444; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">A</div>',
		iconSize: [32, 32],
		iconAnchor: [16, 32],
	});

	const createDeliveryIcon = () => L.divIcon({
		className: 'custom-marker delivery-marker',
		html: '<div style="background: #ef4444; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">B</div>',
		iconSize: [32, 32],
		iconAnchor: [16, 32],
	});

	if (loading) {
		return (
			<div className="order-card-map-loading">
				<Navigation className="order-card-map-loading-icon" />
				<span>Cargando ruta...</span>
			</div>
		);
	}

	if (!pickupCoords && !deliveryCoords) {
		return null;
	}

	return (
		<MapContainer
			center={center}
			zoom={bounds.length > 1 ? 13 : 15}
			style={{ height: '180px', width: '100%', zIndex: 0 }}
			scrollWheelZoom={false}
			className="order-card-map"
		>
			<TileLayer
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>
			
			{bounds.length > 1 && <MapBounds bounds={bounds} />}

			{/* Ruta */}
			{routeGeometry && routeGeometry.coordinates && (
				<Polyline
					positions={routeGeometry.coordinates.map(coord => [coord[1], coord[0]])}
					color="#FF6B35"
					weight={5}
					opacity={0.8}
				/>
			)}

			{/* Marcador de pickup */}
			{pickupCoords && (
				<Marker position={[pickupCoords.lat, pickupCoords.lon]} icon={createPickupIcon()}>
					<Popup>
						<strong>Local</strong><br/>
						{pickupAddress}
					</Popup>
				</Marker>
			)}

			{/* Marcador de delivery */}
			{deliveryCoords && (
				<Marker position={[deliveryCoords.lat, deliveryCoords.lon]} icon={createDeliveryIcon()}>
					<Popup>
						<strong>Entrega</strong><br/>
						{deliveryAddress}
					</Popup>
				</Marker>
			)}
		</MapContainer>
	);
}

