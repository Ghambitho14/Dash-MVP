import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bike, Navigation, AlertCircle } from 'lucide-react';
import '../style/AdminTrackingMap.css';

// Fix para iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
	iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
	shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Componente para ajustar bounds del mapa
function MapBounds({ bounds }) {
	const map = useMap();
	
	useEffect(() => {
		if (bounds && bounds.length > 0) {
			map.fitBounds(bounds, { padding: [50, 50] });
		}
	}, [map, bounds]);
	
	return null;
}

export function AdminTrackingMap({ locations, loading: locationsLoading, error: locationsError }) {
	const markersRef = useRef(new Map()); // driverId -> marker

	// Filtrar y validar ubicaciones
	const validLocations = useMemo(() => {
		if (!locations || locations.length === 0) return [];
		
		return locations.filter((location) => {
			const driver = location.drivers;
			if (!driver || !location.latitude || !location.longitude) return false;
			
			const lat = Number(location.latitude);
			const lng = Number(location.longitude);
			
			// Validar coordenadas
			return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
		});
	}, [locations]);

	// Calcular bounds y centro
	const { bounds, center } = useMemo(() => {
		if (validLocations.length === 0) {
			return {
				bounds: [],
				center: [-33.4489, -70.6693] // Santiago, Chile por defecto
			};
		}

		const allBounds = validLocations.map(loc => [
			Number(loc.latitude),
			Number(loc.longitude)
		]);

		return {
			bounds: allBounds,
			center: allBounds[0]
		};
	}, [validLocations]);

	// Crear icono de repartidor
	const createDriverIcon = () => L.divIcon({
		className: 'custom-marker driver-marker',
		html: '<div style="background: #ef4444; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 20px;">🏍️</div>',
		iconSize: [40, 40],
		iconAnchor: [20, 40],
	});

	// Mostrar error
	if (locationsError) {
		return (
			<div className="admin-tracking-map-error">
				<AlertCircle />
				<h3>{locationsError}</h3>
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
	if (!validLocations || validLocations.length === 0) {
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
					<span>{validLocations.length} repartidor{validLocations.length !== 1 ? 'es' : ''} activo{validLocations.length !== 1 ? 's' : ''}</span>
				</div>
			</div>
			<div className="admin-tracking-map-content">
				<MapContainer
					center={center}
					zoom={bounds.length > 1 ? 12 : 15}
					style={{ height: '100%', width: '100%', zIndex: 0 }}
					scrollWheelZoom={true}
					className="admin-tracking-map"
				>
					<TileLayer
						attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
						url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					/>
					
					{/* Ajustar bounds */}
					{bounds.length > 1 && <MapBounds bounds={bounds} />}

					{/* Marcadores de repartidores */}
					{validLocations.map((location) => {
						const driver = location.drivers;
						const lat = Number(location.latitude);
						const lng = Number(location.longitude);

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

						return (
							<Marker
								key={location.driver_id}
								position={[lat, lng]}
								icon={createDriverIcon()}
							>
								<Popup>
									<div style={{ padding: '0.5rem', minWidth: '200px' }}>
										<h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600 }}>
											{driver.name || 'Sin nombre'}
										</h3>
										<p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
											<strong>Usuario:</strong> {driver.username || 'N/A'}<br/>
											<strong>Teléfono:</strong> {driver.phone || 'N/A'}<br/>
											{driver.companies && driver.companies.name ? (
												<><strong>Empresa:</strong> {driver.companies.name}<br/></>
											) : null}
											<strong>Ubicación:</strong> {lat.toFixed(6)}, {lng.toFixed(6)}<br/>
											{location.updated_at ? (
												<>
													<strong>Última actualización:</strong>{' '}
													<span style={{ color: isRecent ? '#10b981' : '#f59e0b' }}>
														{minutesAgo === 0 
															? 'Hace menos de un minuto' 
															: minutesAgo === 1 
															? 'Hace 1 minuto' 
															: `Hace ${minutesAgo} minutos`}
													</span>
												</>
											) : null}
										</p>
									</div>
								</Popup>
							</Marker>
						);
					})}
				</MapContainer>
			</div>
		</div>
	);
}
