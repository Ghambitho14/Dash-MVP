import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getOrderDriverLocation, subscribeToDriverLocation } from '../../services/locationService';
import { geocodeAddress } from '../../utils/utils';
import { getRoute } from '../../services/routingService';
import { logger } from '../../utils/logger';
import { MapPin, Package, Navigation, AlertCircle, Bike, Clock, X } from 'lucide-react';
import '../../styles/Components/TrackingPanel.css';

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

export function TrackingPanel({ orders, onSelectOrder }) {
	const [loading, setLoading] = useState(false);
	const [selectedDriver, setSelectedDriver] = useState(null);
	const [selectedOrderId, setSelectedOrderId] = useState(null);
	const [driverLocations, setDriverLocations] = useState(new Map());
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [hasCoordinates, setHasCoordinates] = useState(false);
	const orderCoordsRef = useRef(new Map());
	const addressCacheRef = useRef(new Map());
	const subscriptionsRef = useRef([]);
	const routeGeometryRef = useRef(null);

	// Filtrar solo pedidos activos
	const activeOrders = orders.filter(order => order.status !== 'Entregado');

	// Agrupar pedidos por repartidor
	const driversWithOrders = useMemo(() => {
		const driversMap = new Map();
		
		activeOrders.forEach(order => {
			if (order.driverId && order.driverName && order.status !== 'Pendiente') {
				const driverLocation = driverLocations.get(order.driverId);
				
				if (driverLocation && driverLocation.latitude && driverLocation.longitude) {
					if (!driversMap.has(order.driverId)) {
						driversMap.set(order.driverId, {
							driverId: order.driverId,
							driverName: order.driverName,
							orders: [],
							location: driverLocation,
						});
					}
					driversMap.get(order.driverId).orders.push(order);
				}
			}
		});
		
		return Array.from(driversMap.values());
	}, [activeOrders, driverLocations]);

	// Geocodificar direcciones de pedidos
	useEffect(() => {
		if (activeOrders.length === 0) {
			setLoading(false);
			return;
		}

		const geocodeOrders = async () => {
			setLoading(true);
			const coordsMap = new Map();
			const timeoutId = setTimeout(() => {
				logger.warn('Geocoding timeout, mostrando mapa con coordenadas disponibles');
				setLoading(false);
			}, 30000); // Timeout de 30 segundos

			try {
				for (const order of activeOrders) {
					const orderId = order.id;
					const pickupAddress = order.pickupAddress || order.localAddress;
					const deliveryAddress = order.deliveryAddress;

					const coords = {
						pickup: null,
						delivery: null,
					};

					if (pickupAddress) {
						if (addressCacheRef.current.has(pickupAddress)) {
							coords.pickup = addressCacheRef.current.get(pickupAddress);
						} else {
							try {
								const pickupCoords = await geocodeAddress(pickupAddress);
								if (pickupCoords) {
									coords.pickup = pickupCoords;
									addressCacheRef.current.set(pickupAddress, pickupCoords);
								}
							} catch (err) {
								logger.error('Error geocodificando pickup:', err);
							}
						}
					}

					if (deliveryAddress) {
						if (addressCacheRef.current.has(deliveryAddress)) {
							coords.delivery = addressCacheRef.current.get(deliveryAddress);
						} else {
							try {
								const deliveryCoords = await geocodeAddress(deliveryAddress);
								if (deliveryCoords) {
									coords.delivery = deliveryCoords;
									addressCacheRef.current.set(deliveryAddress, deliveryCoords);
								}
							} catch (err) {
								logger.error('Error geocodificando delivery:', err);
							}
						}
					}

					coordsMap.set(order.id, coords);
					
					// Delay para respetar rate limiting de Nominatim (1 req/seg)
					await new Promise(resolve => setTimeout(resolve, 1000));
				}

				clearTimeout(timeoutId);
				orderCoordsRef.current = coordsMap;
				
				const hasAnyCoords = Array.from(coordsMap.values()).some(coords => coords.pickup || coords.delivery);
				setHasCoordinates(hasAnyCoords);
				
				setLoading(false);
			} catch (err) {
				clearTimeout(timeoutId);
				logger.error('Error en geocoding:', err);
				setLoading(false);
			}
		};

		geocodeOrders();
	}, [activeOrders]);

	// Cargar ubicación del repartidor
	const loadDriverLocation = useCallback(async (order) => {
		if (!order.driverId) return;

		try {
			const location = await getOrderDriverLocation(order._dbId);
			if (location && location.latitude && location.longitude) {
				const locationData = {
					latitude: parseFloat(location.latitude),
					longitude: parseFloat(location.longitude),
					updated_at: location.updated_at,
				};

				setDriverLocations(prev => {
					const newMap = new Map(prev);
					newMap.set(order.driverId, locationData);
					return newMap;
				});

				// Suscribirse a actualizaciones
				const unsubscribe = subscribeToDriverLocation(order.driverId, (newLocation) => {
					if (newLocation && newLocation.latitude && newLocation.longitude) {
						const updatedLocation = {
							latitude: parseFloat(newLocation.latitude),
							longitude: parseFloat(newLocation.longitude),
							updated_at: newLocation.updated_at,
						};
						
						setDriverLocations(prev => {
							const newMap = new Map(prev);
							newMap.set(order.driverId, updatedLocation);
							return newMap;
						});

						// Recalcular ruta si este pedido está seleccionado
						if (selectedOrderId === order.id) {
							const coords = orderCoordsRef.current.get(order.id);
							if (coords) {
								calculateRouteForOrder(order, updatedLocation, coords);
							}
						}
					}
				});

				subscriptionsRef.current.push(unsubscribe);

				// Polling cada 5 segundos
				const pollingInterval = setInterval(async () => {
					try {
						const currentLocation = await getOrderDriverLocation(order._dbId);
						if (currentLocation && currentLocation.latitude && currentLocation.longitude) {
							const locationData = {
								latitude: parseFloat(currentLocation.latitude),
								longitude: parseFloat(currentLocation.longitude),
								updated_at: currentLocation.updated_at,
							};
							
							setDriverLocations(prev => {
								const newMap = new Map(prev);
								newMap.set(order.driverId, locationData);
								return newMap;
							});
						}
					} catch (err) {
						logger.error('Error en polling de ubicación:', err);
					}
				}, 5000);

				subscriptionsRef.current.push(() => clearInterval(pollingInterval));
			}
		} catch (err) {
			logger.error('Error cargando ubicación del repartidor:', err);
		}
	}, [selectedOrderId]);

	// Calcular ruta para un pedido
	const calculateRouteForOrder = useCallback(async (order, driverLocation, coords) => {
		if (!coords) return;

		let origin = null;
		let destination = null;

		if (order.status === 'Asignado' || order.status === 'En camino al retiro') {
			if (driverLocation && coords.pickup) {
				origin = { lat: driverLocation.latitude, lon: driverLocation.longitude };
				destination = { lat: coords.pickup.lat, lon: coords.pickup.lon };
			}
		} else if (order.status === 'Producto retirado') {
			if (coords.pickup && coords.delivery) {
				origin = { lat: coords.pickup.lat, lon: coords.pickup.lon };
				destination = { lat: coords.delivery.lat, lon: coords.delivery.lon };
			}
		}

		if (origin && destination) {
			const route = await getRoute(origin.lat, origin.lon, destination.lat, destination.lon);
			if (route && route.geometry) {
				routeGeometryRef.current = route.geometry;
			}
		}
	}, []);

	// Cargar ubicaciones de repartidores
	useEffect(() => {
		if (activeOrders.length === 0) return;

		activeOrders.forEach((order) => {
			if (order.driverId && order.status !== 'Pendiente') {
				const existingLocation = driverLocations.get(order.driverId);
				if (!existingLocation) {
					loadDriverLocation(order);
				}
			}
		});
	}, [activeOrders, loadDriverLocation, driverLocations]);

	// Calcular ruta cuando cambia el pedido seleccionado
	useEffect(() => {
		if (!selectedOrderId) {
			routeGeometryRef.current = null;
			return;
		}

		const selectedOrder = activeOrders.find(o => o.id === selectedOrderId);
		if (selectedOrder) {
			const coords = orderCoordsRef.current.get(selectedOrderId);
			const driverLocation = selectedOrder.driverId 
				? driverLocations.get(selectedOrder.driverId) 
				: null;
			
			if (coords) {
				calculateRouteForOrder(selectedOrder, driverLocation, coords);
			}
		}
	}, [selectedOrderId, activeOrders, driverLocations, calculateRouteForOrder]);

	// Limpiar suscripciones
	useEffect(() => {
		return () => {
			subscriptionsRef.current.forEach(unsubscribe => {
				if (unsubscribe) unsubscribe();
			});
		};
	}, []);

	// Centrar en repartidor
	const focusDriver = (driver, orderId = null) => {
		const orderToSelect = orderId 
			? driver.orders.find(o => o.id === orderId) 
			: driver.orders[0];

		if (orderToSelect) {
			setSelectedOrderId(orderToSelect.id);
			if (onSelectOrder) {
				onSelectOrder(orderToSelect);
			}
		}
		setSelectedDriver(driver.driverId);
	};

	// Calcular bounds para el mapa
	const allBounds = [];
	activeOrders.forEach((order) => {
		const coords = orderCoordsRef.current.get(order.id);
		if (coords) {
			if (coords.pickup) allBounds.push([coords.pickup.lat, coords.pickup.lon]);
			if (coords.delivery) allBounds.push([coords.delivery.lat, coords.delivery.lon]);
		}
		const driverLocation = driverLocations.get(order.driverId);
		if (driverLocation) {
			allBounds.push([driverLocation.latitude, driverLocation.longitude]);
		}
	});

	const defaultCenter = [-33.4489, -70.6693];
	const center = allBounds.length > 0 ? allBounds[0] : defaultCenter;

	// Crear iconos personalizados
	const createPickupIcon = () => L.divIcon({
		className: 'custom-marker pickup-marker',
		html: '<div style="background: #3b82f6; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 14px;">🏪</div>',
		iconSize: [24, 24],
		iconAnchor: [12, 24],
	});

	const createDeliveryIcon = () => L.divIcon({
		className: 'custom-marker delivery-marker',
		html: '<div style="background: #10b981; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
		iconSize: [16, 16],
		iconAnchor: [8, 8],
	});

	const createDriverIcon = () => L.divIcon({
		className: 'custom-marker driver-marker',
		html: '<div style="background: #ef4444; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 20px;">🏍️</div>',
		iconSize: [40, 40],
		iconAnchor: [20, 40],
	});

	// Mostrar mensaje si no hay pedidos activos
	if (activeOrders.length === 0) {
		return (
			<div className="tracking-panel-empty">
				<Package />
				<h3>No hay pedidos activos</h3>
				<p>Los pedidos activos aparecerán en el mapa</p>
			</div>
		);
	}

	// Mostrar loading solo si realmente está cargando Y no hay coordenadas aún
	if (loading && !hasCoordinates && orderCoordsRef.current.size === 0) {
		return (
			<div className="tracking-panel-loading">
				<Navigation />
				<p>Cargando mapa...</p>
			</div>
		);
	}

	return (
		<div className="tracking-panel">
			<div className="tracking-panel-header">
				<div className="tracking-panel-legend">
					<div className="tracking-legend-item">
						<div className="tracking-legend-marker tracking-legend-pickup"></div>
						<span>Local (Retiro)</span>
					</div>
					<div className="tracking-legend-item">
						<div className="tracking-legend-marker tracking-legend-delivery"></div>
						<span>Entrega</span>
					</div>
					<div className="tracking-legend-item">
						<div className="tracking-legend-marker tracking-legend-driver"></div>
						<span>Repartidor</span>
					</div>
				</div>
				<div className="tracking-panel-stats">
					<span>{activeOrders.length} pedido{activeOrders.length !== 1 ? 's' : ''} activo{activeOrders.length !== 1 ? 's' : ''}</span>
					{driversWithOrders.length > 0 && (
						<span className="tracking-panel-drivers-count">
							• {driversWithOrders.length} repartidor{driversWithOrders.length !== 1 ? 'es' : ''}
						</span>
					)}
				</div>
			</div>
			<div className="tracking-panel-content">
				{/* Panel lateral de repartidores */}
				{sidebarOpen && driversWithOrders.length > 0 && (
					<div className="tracking-sidebar">
						<div className="tracking-sidebar-header">
							<div className="tracking-sidebar-header-content">
								<h3>Repartidores Conectados</h3>
								<p className="tracking-sidebar-header-subtitle">
									{driversWithOrders.filter(d => d.location).length} con ubicación
								</p>
							</div>
							<button 
								className="tracking-sidebar-close"
								onClick={() => setSidebarOpen(false)}
								aria-label="Cerrar panel"
							>
								<X size={18} />
							</button>
						</div>
						<div className="tracking-sidebar-content">
							{driversWithOrders.map((driver) => (
								<div
									key={driver.driverId}
									className={`tracking-driver-card ${selectedDriver === driver.driverId ? 'selected' : ''}`}
									onClick={() => focusDriver(driver)}
								>
									<div className="tracking-driver-header">
										<div className="tracking-driver-icon">
											<Bike size={20} />
										</div>
										<div className="tracking-driver-info">
											<h4 className="tracking-driver-name">{driver.driverName}</h4>
											<p className="tracking-driver-orders">
												{driver.orders.length} pedido{driver.orders.length !== 1 ? 's' : ''}
											</p>
										</div>
										{driver.location && (
											<div className="tracking-driver-status">
												<div className="tracking-driver-status-dot"></div>
											</div>
										)}
									</div>
									{driver.orders.length > 0 && (
										<div className="tracking-driver-orders-list">
											{driver.orders.map((order) => (
												<div 
													key={order.id} 
													className={`tracking-driver-order-item ${selectedOrderId === order.id ? 'selected' : ''}`}
													onClick={(e) => {
														e.stopPropagation();
														focusDriver(driver, order.id);
													}}
													style={{ cursor: 'pointer' }}
												>
													<span className="tracking-driver-order-id">{order.id}</span>
													<span className="tracking-driver-order-status">{order.status}</span>
												</div>
											))}
										</div>
									)}
									{driver.location && (
										<div className="tracking-driver-location">
											<MapPin size={14} />
											<div className="tracking-driver-location-info">
												<span className="tracking-driver-location-status">En ruta</span>
												<span className="tracking-driver-location-coords">
													{driver.location.latitude.toFixed(6)}, {driver.location.longitude.toFixed(6)}
												</span>
											</div>
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				)}

				{/* Botón para abrir panel lateral */}
				{!sidebarOpen && driversWithOrders.length > 0 && (
					<button 
						className="tracking-sidebar-toggle"
						onClick={() => setSidebarOpen(true)}
						aria-label="Abrir panel de repartidores"
					>
						<Bike size={20} />
						<span>{driversWithOrders.length}</span>
					</button>
				)}

				{/* Mapa con Leaflet */}
				<MapContainer
					center={center}
					zoom={allBounds.length > 1 ? 12 : 15}
					style={{ height: '100%', width: '100%', zIndex: 0 }}
					scrollWheelZoom={true}
					className={`tracking-panel-map ${sidebarOpen && driversWithOrders.length > 0 ? 'with-sidebar' : ''}`}
				>
					<TileLayer
						attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
						url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					/>
					
					{/* Ajustar bounds */}
					{allBounds.length > 1 && <MapBounds bounds={allBounds} />}

					{/* Ruta del pedido seleccionado */}
					{routeGeometryRef.current && routeGeometryRef.current.coordinates && (() => {
						const selectedOrder = activeOrders.find(o => o.id === selectedOrderId);
						const routeColor = selectedOrder?.status === 'Producto retirado' ? '#10b981' : '#ef4444';
						return (
							<Polyline
								positions={routeGeometryRef.current.coordinates.map(coord => [coord[1], coord[0]])}
								color={routeColor}
								weight={6}
								opacity={0.9}
							/>
						);
					})()}

					{/* Marcadores de pedidos */}
					{activeOrders.map((order) => {
						const coords = orderCoordsRef.current.get(order.id);
						if (!coords) return null;

						return (
							<div key={order.id}>
								{/* Marcador de pickup */}
								{coords.pickup && (
									<Marker 
										position={[coords.pickup.lat, coords.pickup.lon]} 
										icon={createPickupIcon()}
										eventHandlers={{
											click: () => {
												setSelectedOrderId(order.id);
												if (onSelectOrder) onSelectOrder(order);
											}
										}}
									>
										<Popup>
											<strong>{order.local || 'Local'}</strong><br/>
											Pedido: {order.id}<br/>
											Cliente: {order.clientName || 'Sin cliente'}
										</Popup>
									</Marker>
								)}

								{/* Marcador de delivery */}
								{coords.delivery && (
									<Marker 
										position={[coords.delivery.lat, coords.delivery.lon]} 
										icon={createDeliveryIcon()}
										eventHandlers={{
											click: () => {
												setSelectedOrderId(order.id);
												if (onSelectOrder) onSelectOrder(order);
											}
										}}
									>
										<Popup>
											<strong>Entrega</strong><br/>
											Pedido: {order.id}<br/>
											Cliente: {order.clientName || 'Sin cliente'}<br/>
											Estado: {order.status}
										</Popup>
									</Marker>
								)}

								{/* Marcador del repartidor */}
								{order.driverId && order.status !== 'Pendiente' && (() => {
									const driverLocation = driverLocations.get(order.driverId);
									if (!driverLocation) return null;
									
									return (
										<Marker 
											position={[driverLocation.latitude, driverLocation.longitude]} 
											icon={createDriverIcon()}
											eventHandlers={{
												click: () => {
													setSelectedOrderId(order.id);
													setSelectedDriver(order.driverId);
													if (onSelectOrder) onSelectOrder(order);
												}
											}}
										>
											<Popup>
												<strong>{order.driverName || 'Repartidor'}</strong><br/>
												{order.id}
											</Popup>
										</Marker>
									);
								})()}
							</div>
						);
					})}
				</MapContainer>
			</div>
		</div>
	);
}
