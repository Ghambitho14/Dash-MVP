import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { geocodeAddress } from '../../utils/utils';
import { logger } from '../../utils/logger';
import '../../styles/Components/SimpleMap.css';

// Fix para iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
	iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
	shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export function SimpleMap({ address, label }) {
	const [coords, setCoords] = useState(null);
	const [loading, setLoading] = useState(true);

	// Geocodificar dirección
	useEffect(() => {
		const loadAddress = async () => {
			if (!address) {
				setLoading(false);
				return;
			}

			setLoading(true);
			const addressCoords = await geocodeAddress(address);
			setCoords(addressCoords);
			setLoading(false);
		};

		loadAddress();
	}, [address]);

	// Crear icono personalizado
	const createIcon = () => L.divIcon({
		className: 'custom-marker simple-marker',
		html: '<div style="background: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
		iconSize: [16, 16],
		iconAnchor: [8, 8],
	});

	const defaultCenter = [-33.4489, -70.6693];
	const center = coords ? [coords.lat, coords.lon] : defaultCenter;

	if (loading) {
		return (
			<div className="simple-map-container">
				{label && <p className="simple-map-label">{label}</p>}
				<div className="simple-map-loading">
					<p>Cargando mapa...</p>
				</div>
			</div>
		);
	}

	if (!coords) {
		return (
			<div className="simple-map-container">
				{label && <p className="simple-map-label">{label}</p>}
				<div className="simple-map-error">
					<p>No se pudo cargar la ubicación</p>
				</div>
			</div>
		);
	}

	return (
		<div className="simple-map-container">
			{label && <p className="simple-map-label">{label}</p>}
			<MapContainer
				center={center}
				zoom={15}
				style={{ height: '200px', width: '100%', zIndex: 0 }}
				scrollWheelZoom={true}
				className="simple-map"
			>
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				<Marker position={[coords.lat, coords.lon]} icon={createIcon()}>
					<Popup>
						{label || address}
					</Popup>
				</Marker>
			</MapContainer>
		</div>
	);
}
