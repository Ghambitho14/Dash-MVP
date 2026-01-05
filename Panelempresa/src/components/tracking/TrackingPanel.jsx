import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { getOrderDriverLocation, subscribeToDriverLocation } from '../../services/locationService';
import { geocodeAddress } from '../../utils/utils';
import { logger } from '../../utils/logger';
import { setupGoogleMapsErrorListener, getGoogleMapsErrorMessage } from '../../utils/googleMapsErrors';
import { MapPin, Package, Navigation, AlertCircle, Bike, Clock, X } from 'lucide-react';
import '../../styles/Components/TrackingPanel.css';

export function TrackingPanel({ orders, onSelectOrder }) {
	const [mapLoaded, setMapLoaded] = useState(false);
	const [loading, setLoading] = useState(false); // Cambiado a false - solo se activa durante geocodificación
	const [error, setError] = useState(null);
	const [selectedDriver, setSelectedDriver] = useState(null);
	const [selectedOrderId, setSelectedOrderId] = useState(null); // Pedido seleccionado para mostrar su ruta
	const [driverLocations, setDriverLocations] = useState(new Map()); // driverId -> location
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [hasCoordinates, setHasCoordinates] = useState(false); // Para rastrear si hay coordenadas disponibles
		const mapRef = useRef(null);
		const mapInstanceRef = useRef(null);
		const markersRef = useRef([]);
		const subscriptionsRef = useRef([]);
		const orderCoordsRef = useRef(new Map()); // Cache de coordenadas por pedido (order.id -> {pickup, delivery})
		const addressCacheRef = useRef(new Map()); // Cache de direcciones geocodificadas (address -> {lat, lon})
		const driverMarkersRef = useRef(new Map()); // driverId -> marker
		const directionsServiceRef = useRef(null); // Servicio de direcciones de Google Maps
		const directionsRendererRef = useRef(null); // UN SOLO DirectionsRenderer reutilizable

	const apiKey = import.meta.env.VITE_API_KEY_MAPS;

	// Filtrar solo pedidos activos (no entregados)
	const activeOrders = orders.filter(order => order.status !== 'Entregado');

	// Agrupar pedidos por repartidor
	const driversWithOrders = useMemo(() => {
		const driversMap = new Map();
		
		activeOrders.forEach(order => {
			if (order.driverId && order.driverName && order.status !== 'Pendiente') {
				const driverLocation = driverLocations.get(order.driverId);
				
				// Solo incluir repartidores que tienen ubicación válida
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

	// Cargar script de Google Maps
	useEffect(() => {
		if (!apiKey) {
			setError('API Key de Google Maps no configurada');
			setLoading(false);
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

		// Cargar script de Google Maps con loading=async (incluir directions para rutas)
		const script = document.createElement('script');
		script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,directions&loading=async`;
		script.async = true;
		script.defer = true;
		script.onload = () => {
			setMapLoaded(true);
		};
		script.onerror = (error) => {
			const errorMessage = getGoogleMapsErrorMessage('ApiProjectMapError') || 
				'Error cargando Google Maps API. Verifica tu clave de API y las restricciones.';
			setError(errorMessage);
			setLoading(false);
			logger.error('Error cargando Google Maps API:', error);
		};
		document.head.appendChild(script);
		
		// Configurar listener para errores de Google Maps
		const cleanup = setupGoogleMapsErrorListener((errorMsg) => {
			setError(errorMsg);
			setLoading(false);
		});
		
		return cleanup;
	}, [apiKey]);

	// Geocodificar direcciones de pedidos
	useEffect(() => {
		if (!mapLoaded || activeOrders.length === 0) {
			setLoading(false);
			return;
		}

		const geocodeOrders = async () => {
			setLoading(true);
			const coordsMap = new Map();

			// Geocodificar direcciones con un pequeño delay entre cada una para evitar rate limiting
			for (const order of activeOrders) {
				const orderId = order.id;
				const pickupAddress = order.pickupAddress || order.localAddress;
				const deliveryAddress = order.deliveryAddress;

				logger.log(`📍 Procesando pedido ${orderId}:`, {
					hasPickupAddress: !!pickupAddress,
					hasDeliveryAddress: !!deliveryAddress,
					pickupAddress: pickupAddress,
					deliveryAddress: deliveryAddress
				});

				const coords = {
					pickup: null,
					delivery: null,
				};

				if (pickupAddress) {
					// Verificar cache de direcciones
					if (addressCacheRef.current.has(pickupAddress)) {
						coords.pickup = addressCacheRef.current.get(pickupAddress);
						logger.log(`📍 Usando coordenadas de pickup desde cache para ${orderId}`);
					} else {
						logger.log(`📍 Geocodificando dirección de pickup para ${orderId}:`, pickupAddress);
						const pickupCoords = await geocodeAddress(pickupAddress);
						if (pickupCoords) {
							coords.pickup = pickupCoords;
							addressCacheRef.current.set(pickupAddress, pickupCoords);
							logger.log(`✅ Coordenadas de pickup obtenidas para ${orderId}:`, pickupCoords);
						} else {
							logger.warn(`⚠️ No se pudieron obtener coordenadas de pickup para ${orderId}:`, pickupAddress);
						}
					}
				}

				if (deliveryAddress) {
					// Verificar cache de direcciones
					if (addressCacheRef.current.has(deliveryAddress)) {
						coords.delivery = addressCacheRef.current.get(deliveryAddress);
						logger.log(`📍 Usando coordenadas de delivery desde cache para ${orderId}:`, coords.delivery);
					} else {
						logger.log(`📍 Geocodificando dirección de delivery para ${orderId}:`, deliveryAddress);
						const deliveryCoords = await geocodeAddress(deliveryAddress);
						if (deliveryCoords) {
							coords.delivery = deliveryCoords;
							addressCacheRef.current.set(deliveryAddress, deliveryCoords);
							logger.log(`✅ Coordenadas de delivery obtenidas para ${orderId}:`, deliveryCoords);
						} else {
							logger.warn(`⚠️ No se pudieron obtener coordenadas de delivery para ${orderId}:`, deliveryAddress);
						}
					}
				} else {
					logger.warn(`⚠️ Pedido ${orderId} no tiene dirección de delivery`);
				}

				coordsMap.set(order.id, coords);
				
				logger.log(`📍 Coordenadas guardadas para pedido ${order.id}:`, {
					hasPickup: !!coords.pickup,
					hasDelivery: !!coords.delivery,
					pickup: coords.pickup,
					delivery: coords.delivery
				});
				
				// Pequeño delay para evitar rate limiting de Google Maps (50ms entre cada geocodificación)
				await new Promise(resolve => setTimeout(resolve, 50));
			}

			// Guardar coordenadas por pedido
			orderCoordsRef.current = coordsMap;
			
			// Verificar si hay al menos una coordenada disponible
			const hasAnyCoords = Array.from(coordsMap.values()).some(coords => coords.pickup || coords.delivery);
			setHasCoordinates(hasAnyCoords);
			
			logger.log(`✅ Geocodificación completada. Total de pedidos procesados: ${coordsMap.size}, Cache de direcciones: ${addressCacheRef.current.size}, Tiene coordenadas: ${hasAnyCoords}`);
			setLoading(false);
		};

		geocodeOrders();
	}, [mapLoaded, activeOrders]);

	// Crear o actualizar marcador del repartidor
	const updateDriverMarker = (driverId, location, order = null) => {
		if (!mapInstanceRef.current || !window.google) {
			logger.warn('📍 No se puede crear marcador: mapa no está listo');
			return;
		}

		const google = window.google;
		const position = { lat: location.latitude, lng: location.longitude };

		logger.log('📍 Actualizando marcador del repartidor:', {
			driverId,
			position,
			hasExistingMarker: driverMarkersRef.current.has(driverId)
		});

		// Si ya existe el marcador, actualizarlo con animación
		if (driverMarkersRef.current.has(driverId)) {
			const marker = driverMarkersRef.current.get(driverId);
			const oldPosition = marker.getPosition();
			
			// Animar el movimiento del marcador
			if (oldPosition && (oldPosition.lat() !== position.lat || oldPosition.lng() !== position.lng)) {
				// Usar animación de Google Maps para movimiento suave
				marker.setPosition(position);
				
				// Agregar efecto visual de actualización (pulso)
				const icon = marker.getIcon();
				if (icon && typeof icon === 'object' && icon.url) {
					// Crear icono con efecto de pulso
					const pulseIcon = {
						...icon,
						url: icon.url.replace('fill="#ef4444"', 'fill="#ff6b6b"') // Cambiar color temporalmente
					};
					marker.setIcon(pulseIcon);
					
					// Volver al color original después de 500ms
					setTimeout(() => {
						marker.setIcon(icon);
					}, 500);
				}
			} else {
				marker.setPosition(position);
			}
			
			logger.log('✅ Marcador del repartidor actualizado con animación');
			return;
		}

		// Crear nuevo marcador con icono de moto
		logger.log('📍 Creando nuevo marcador del repartidor');
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
			title: `Repartidor: ${order?.driverName || 'Sin nombre'}`,
			zIndex: 1000, // Asegurar que esté por encima de otros marcadores
		});

		const driverInfoWindow = new google.maps.InfoWindow({
			content: `
				<div style="padding: 0.5rem;">
					<h3 style="margin: 0 0 0.25rem 0; font-size: 0.875rem; font-weight: 600;">Repartidor</h3>
					<p style="margin: 0; font-size: 0.75rem; color: #6b7280;">${order?.driverName || 'Sin nombre'}</p>
					${order ? `<p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; color: #6b7280;">Pedido: ${order.id}</p>` : ''}
				</div>
			`,
		});

		driverMarker.addListener('click', () => {
			driverInfoWindow.open(mapInstanceRef.current, driverMarker);
			if (order && onSelectOrder) {
				onSelectOrder(order);
			}
		});

		driverMarkersRef.current.set(driverId, driverMarker);
		markersRef.current.push(driverMarker);
		
		logger.log('✅ Marcador del repartidor creado exitosamente:', {
			driverId,
			position,
			markerId: driverMarker
		});
	};

	// Función para limpiar la ruta del mapa (ocultar el renderer)
	const clearRoute = useCallback(() => {
		if (directionsRendererRef.current) {
			directionsRendererRef.current.setDirections({ routes: [] });
			logger.log('🗺️ Ruta limpiada');
		}
	}, []);

	// Función para mostrar la ruta del pedido seleccionado
	const showRouteForOrder = useCallback((order, driverLocation, coords) => {
		// Solo dibujar ruta si este pedido está seleccionado
		if (selectedOrderId !== order.id) {
			logger.log(`🗺️ Saltando ruta para pedido ${order.id} - no está seleccionado (selectedOrderId: ${selectedOrderId})`);
			return;
		}

		if (!mapInstanceRef.current || !directionsServiceRef.current || !directionsRendererRef.current || !window.google) {
			logger.warn('No se puede dibujar ruta: mapa, servicio o renderer no disponible', {
				hasMap: !!mapInstanceRef.current,
				hasService: !!directionsServiceRef.current,
				hasRenderer: !!directionsRendererRef.current,
				hasGoogle: !!window.google
			});
			return;
		}

		if (!coords) {
			logger.warn(`No hay coordenadas para pedido ${order.id}`);
			return;
		}

		const google = window.google;
		const orderId = order.id;

		// Determinar origen y destino según el estado del pedido
		let origin = null;
		let destination = null;
		let routeColor = '#ef4444'; // Rojo por defecto

		if (order.status === 'Asignado' || order.status === 'En camino al retiro') {
			// ETAPA 1: Ruta desde repartidor hasta el local (punto de retiro)
			if (driverLocation && coords.pickup) {
				origin = {
					lat: driverLocation.latitude,
					lng: driverLocation.longitude
				};
				destination = {
					lat: coords.pickup.lat,
					lng: coords.pickup.lon
				};
				routeColor = '#ef4444'; // Rojo para ruta hacia el local
			} else {
				logger.warn(`No se puede dibujar ruta hacia local: faltan datos`, {
					hasDriverLocation: !!driverLocation,
					hasPickup: !!coords.pickup,
					orderId
				});
				return;
			}
		} else if (order.status === 'Producto retirado') {
			// ETAPA 2: Ruta desde el local hasta el punto de entrega
			if (coords.pickup && coords.delivery) {
				origin = {
					lat: coords.pickup.lat,
					lng: coords.pickup.lon
				};
				destination = {
					lat: coords.delivery.lat,
					lng: coords.delivery.lon
				};
				routeColor = '#10b981'; // Verde para ruta de entrega
			} else {
				logger.warn(`No se puede dibujar ruta de entrega: faltan coordenadas`, {
					hasPickup: !!coords.pickup,
					hasDelivery: !!coords.delivery,
					orderId
				});
				return;
			}
		} else {
			logger.log(`No se dibuja ruta para pedido ${orderId}: estado ${order.status} no requiere ruta`);
			return;
		}

		// Actualizar color de la ruta
		directionsRendererRef.current.setOptions({
			polylineOptions: {
				strokeColor: routeColor,
				strokeWeight: 6,
				strokeOpacity: 0.9
			}
		});

		// Calcular y mostrar la ruta (esto reemplaza automáticamente la ruta anterior)
		logger.log(`🗺️ Calculando ruta para pedido ${orderId}`, {
			status: order.status,
			from: origin,
			to: destination,
			color: routeColor
		});

		directionsServiceRef.current.route({
			origin: origin,
			destination: destination,
			travelMode: google.maps.TravelMode.DRIVING
		}, (result, status) => {
			if (status === 'OK' && directionsRendererRef.current) {
				// 🔥 CLAVE: setDirections() reemplaza automáticamente la ruta anterior
				directionsRendererRef.current.setDirections(result);
				logger.log(`✅ Ruta dibujada para pedido ${orderId}`, {
					status: order.status,
					color: routeColor
				});
			} else {
				logger.warn(`❌ Error calculando ruta para pedido ${orderId}:`, status);
			}
		});
	}, [selectedOrderId]);

	// Cargar ubicación del repartidor
	const loadDriverLocation = useCallback(async (order) => {
		// No requerir que el mapa esté listo para cargar la ubicación
		// La ubicación se necesita para el sidebar incluso sin mapa
		if (!order.driverId) {
			logger.warn('📍 No se puede cargar ubicación: pedido sin driverId');
			return;
		}

		try {
			logger.log('📍 Cargando ubicación del repartidor:', {
				driverId: order.driverId,
				orderId: order.id,
				orderDbId: order._dbId
			});
			
			const location = await getOrderDriverLocation(order._dbId);
			if (location && location.latitude && location.longitude) {
				const locationData = {
					latitude: parseFloat(location.latitude),
					longitude: parseFloat(location.longitude),
					updated_at: location.updated_at,
				};

				logger.log('📍 Ubicación del repartidor cargada:', {
					driverId: order.driverId,
					orderId: order.id,
					location: locationData
				});

				// Actualizar estado de ubicación
				setDriverLocations(prev => {
					const newMap = new Map(prev);
					newMap.set(order.driverId, locationData);
					return newMap;
				});

				// Crear o actualizar marcador (solo si el mapa está listo)
				if (mapInstanceRef.current && window.google) {
					updateDriverMarker(order.driverId, locationData, order);
				}

				// Suscribirse a actualizaciones de ubicación
				const unsubscribe = subscribeToDriverLocation(order.driverId, (newLocation) => {
					logger.log('📍 Nueva ubicación recibida via realtime:', {
						driverId: order.driverId,
						orderId: order.id,
						location: newLocation
					});
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

						// Actualizar marcador solo si el mapa está listo
						if (mapInstanceRef.current && window.google) {
							updateDriverMarker(order.driverId, updatedLocation, order);
							// Actualizar ruta solo si este pedido está seleccionado
							if (selectedOrderId === order.id) {
								const coords = orderCoordsRef.current.get(order.id);
								if (coords) {
									showRouteForOrder(order, updatedLocation, coords);
								}
							}
							// Centrar mapa en el repartidor si está seleccionado
							if (selectedDriver === order.driverId) {
								mapInstanceRef.current.setCenter({
									lat: updatedLocation.latitude,
									lng: updatedLocation.longitude
								});
							}
						}
					}
				});

				subscriptionsRef.current.push(unsubscribe);

				// Fallback: polling cada 5 segundos para este repartidor (más frecuente para mejor tracking)
				const pollingInterval = setInterval(async () => {
					try {
						const currentLocation = await getOrderDriverLocation(order._dbId);
						if (currentLocation && currentLocation.latitude && currentLocation.longitude) {
							const locationData = {
								latitude: parseFloat(currentLocation.latitude),
								longitude: parseFloat(currentLocation.longitude),
								updated_at: currentLocation.updated_at,
							};
							
							// Verificar si la ubicación cambió significativamente (más de 10 metros)
							const existingLocation = driverLocations.get(order.driverId);
							if (existingLocation) {
								const distance = Math.sqrt(
									Math.pow(locationData.latitude - existingLocation.latitude, 2) +
									Math.pow(locationData.longitude - existingLocation.longitude, 2)
								) * 111000; // Aproximadamente metros
								
								// Solo actualizar si se movió más de 10 metros
								if (distance < 10) {
									return;
								}
							}
							
							setDriverLocations(prev => {
								const newMap = new Map(prev);
								newMap.set(order.driverId, locationData);
								return newMap;
							});
							// Actualizar marcador solo si el mapa está listo
							if (mapInstanceRef.current && window.google) {
								updateDriverMarker(order.driverId, locationData, order);
								// Actualizar ruta solo si este pedido está seleccionado
								if (selectedOrderId === order.id) {
									const coords = orderCoordsRef.current.get(order.id);
									if (coords) {
										// Actualizar ruta (setDirections reemplaza automáticamente la anterior)
										showRouteForOrder(order, locationData, coords);
									}
								}
							}
						}
					} catch (err) {
						logger.error('Error en polling de ubicación:', err);
					}
				}, 5000); // Reducido a 5 segundos para tracking más frecuente

				// Guardar intervalo para limpiarlo después
				subscriptionsRef.current.push(() => clearInterval(pollingInterval));
			} else {
				logger.warn('📍 No se encontró ubicación para el repartidor:', {
					driverId: order.driverId,
					orderId: order.id
				});
			}
		} catch (err) {
			logger.error('Error cargando ubicación del repartidor:', err);
		}
	}, [onSelectOrder, selectedOrderId]);

	// Cargar ubicaciones de repartidores cuando haya pedidos activos (incluso sin mapa)
	useEffect(() => {
		if (activeOrders.length === 0) return;

		// Cargar ubicación de cada repartidor asignado
		activeOrders.forEach((order) => {
			if (order.driverId && order.status !== 'Pendiente') {
				const existingLocation = driverLocations.get(order.driverId);
				if (!existingLocation) {
					// Solo cargar si no tenemos la ubicación
					logger.log('📍 Cargando ubicación inicial del repartidor para sidebar:', {
						driverId: order.driverId,
						orderId: order.id
					});
					loadDriverLocation(order);
				}
			}
		});
	}, [activeOrders, loadDriverLocation, driverLocations]);

	// Inicializar mapa (crear siempre, incluso sin coordenadas)
	useEffect(() => {
		if (!mapLoaded || !mapRef.current) {
			return;
		}

		const timeoutId = setTimeout(() => {
			if (!window.google || !window.google.maps) {
				logger.error('Google Maps no está disponible');
				return;
			}

			// Crear mapa si no existe (incluso sin coordenadas)
			if (!mapInstanceRef.current) {
				const google = window.google;
				// Centro por defecto (Santiago, Chile - puedes cambiarlo)
				const defaultCenter = { lat: -33.4489, lng: -70.6693 };
				
				logger.log('🗺️ Creando mapa de Google Maps...');
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
				
				// Inicializar Directions Service
				directionsServiceRef.current = new google.maps.DirectionsService();
				
				// Inicializar UN SOLO DirectionsRenderer (se reutiliza para todas las rutas)
				directionsRendererRef.current = new google.maps.DirectionsRenderer({
					map: mapInstanceRef.current,
					suppressMarkers: true, // Ya tenemos nuestros propios marcadores
					polylineOptions: {
						strokeColor: '#ef4444', // Color por defecto (rojo)
						strokeWeight: 6,
						strokeOpacity: 0.9
					}
				});
				
				logger.log('✅ Mapa y DirectionsRenderer creados exitosamente');
			}
		}, 100);

		return () => clearTimeout(timeoutId);
	}, [mapLoaded]);

	// Actualizar mapa con coordenadas y marcadores
	useEffect(() => {
		if (!mapInstanceRef.current || !window.google || activeOrders.length === 0) {
			return;
		}

		// Esperar a que termine la geocodificación
		if (loading) {
			return;
		}

		const timeoutId = setTimeout(() => {
			const google = window.google;
			const bounds = new google.maps.LatLngBounds();
			const allCoords = [];

			// Recopilar todas las coordenadas (pedidos y repartidores)
			activeOrders.forEach((order) => {
				const coords = orderCoordsRef.current.get(order.id);
				if (coords) {
					if (coords.pickup) {
						allCoords.push({ lat: coords.pickup.lat, lng: coords.pickup.lon });
						bounds.extend(new google.maps.LatLng(coords.pickup.lat, coords.pickup.lon));
					}
					if (coords.delivery) {
						allCoords.push({ lat: coords.delivery.lat, lng: coords.delivery.lon });
						bounds.extend(new google.maps.LatLng(coords.delivery.lat, coords.delivery.lon));
					}
				}
				
				// Incluir ubicación del repartidor si existe
				const driverLocation = driverLocations.get(order.driverId);
				if (driverLocation && driverLocation.latitude && driverLocation.longitude) {
					allCoords.push({ lat: driverLocation.latitude, lng: driverLocation.longitude });
					bounds.extend(new google.maps.LatLng(driverLocation.latitude, driverLocation.longitude));
				}
			});

			// Ajustar vista del mapa si hay coordenadas
			if (allCoords.length > 0) {
				if (allCoords.length > 1) {
					mapInstanceRef.current.fitBounds(bounds, { padding: 50 });
				} else {
					mapInstanceRef.current.setCenter(allCoords[0]);
					mapInstanceRef.current.setZoom(15);
				}
				logger.log(`📍 Ajustando mapa a ${allCoords.length} ubicación(es)`);
			} else {
				logger.log('⏳ Esperando coordenadas para ajustar mapa...');
			}

			// Limpiar solo marcadores de pedidos (pickup/delivery), NO los de repartidores ni las rutas
			markersRef.current.forEach(marker => marker.setMap(null));
			markersRef.current = [];
			// NO limpiar driverMarkersRef ni directionsRendererRef aquí, se mantienen y se actualizan cuando cambia la ubicación

			// Verificar si hay coordenadas disponibles
			const ordersWithCoords = activeOrders.filter(order => {
				const coords = orderCoordsRef.current.get(order.id);
				return coords && (coords.pickup || coords.delivery);
			});

			if (ordersWithCoords.length === 0 && activeOrders.length > 0) {
				logger.warn('⚠️ No hay coordenadas disponibles para ningún pedido. La geocodificación puede haber fallado.');
			}

			// Crear marcadores para cada pedido
			activeOrders.forEach((order) => {
				const coords = orderCoordsRef.current.get(order.id);
				if (!coords) {
					logger.log(`⏳ Pedido ${order.id}: Esperando coordenadas...`, {
						hasDeliveryAddress: !!order.deliveryAddress,
						deliveryAddress: order.deliveryAddress,
						hasPickupAddress: !!(order.pickupAddress || order.localAddress),
						allOrderIds: Array.from(orderCoordsRef.current.keys())
					});
					return;
				}

				logger.log(`📍 Creando marcadores para pedido ${order.id}:`, {
					hasPickup: !!coords.pickup,
					hasDelivery: !!coords.delivery,
					pickupCoords: coords.pickup,
					deliveryCoords: coords.delivery
				});

				const map = mapInstanceRef.current;

				// Marcador de pickup (local)
				if (coords.pickup) {
					// Marcador del local más visible y destacado
					const pickupMarker = new google.maps.Marker({
						position: { lat: coords.pickup.lat, lng: coords.pickup.lon },
						map: map,
						icon: {
							url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
								<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
									<defs>
										<filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
											<feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.4"/>
										</filter>
									</defs>
									<g filter="url(#shadow)">
										<circle cx="24" cy="24" r="20" fill="#3b82f6" stroke="#ffffff" stroke-width="3"/>
										<text x="24" y="32" font-size="28" text-anchor="middle" fill="white">🏪</text>
									</g>
								</svg>
							`),
							scaledSize: new google.maps.Size(48, 48),
							anchor: new google.maps.Point(24, 48)
						},
						title: `Local: ${order.local || 'Sin local'}`,
						zIndex: 999, // Asegurar que esté visible
					});

					const pickupInfoWindow = new google.maps.InfoWindow({
						content: `
							<div style="padding: 0.5rem;">
								<h3 style="margin: 0 0 0.25rem 0; font-size: 0.875rem; font-weight: 600;">${order.local || 'Local'}</h3>
								<p style="margin: 0; font-size: 0.75rem; color: #6b7280;">Pedido: ${order.id}</p>
								<p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; color: #6b7280;">Cliente: ${order.clientName || 'Sin cliente'}</p>
							</div>
						`,
					});

					pickupMarker.addListener('click', () => {
						pickupInfoWindow.open(map, pickupMarker);
						if (onSelectOrder) {
							onSelectOrder(order);
						}
					});

					markersRef.current.push(pickupMarker);
				}

				// Marcador de delivery (entrega)
				if (coords.delivery) {
					const deliveryMarker = new google.maps.Marker({
						position: { lat: coords.delivery.lat, lng: coords.delivery.lon },
						map: map,
						icon: {
							path: google.maps.SymbolPath.CIRCLE,
							scale: 8,
							fillColor: '#10b981',
							fillOpacity: 1,
							strokeColor: '#ffffff',
							strokeWeight: 2,
						},
						title: `Entrega: ${order.clientName || 'Sin cliente'}`,
					});

					const deliveryInfoWindow = new google.maps.InfoWindow({
						content: `
							<div style="padding: 0.5rem;">
								<h3 style="margin: 0 0 0.25rem 0; font-size: 0.875rem; font-weight: 600;">Entrega</h3>
								<p style="margin: 0; font-size: 0.75rem; color: #6b7280;">Pedido: ${order.id}</p>
								<p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; color: #6b7280;">Cliente: ${order.clientName || 'Sin cliente'}</p>
								<p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; color: #6b7280;">Estado: ${order.status}</p>
							</div>
						`,
					});

					deliveryMarker.addListener('click', () => {
						deliveryInfoWindow.open(map, deliveryMarker);
						if (onSelectOrder) {
							onSelectOrder(order);
						}
					});

					markersRef.current.push(deliveryMarker);
				}

				// Cargar ubicación del repartidor si el pedido está asignado
				if (order.driverId && order.status !== 'Pendiente') {
					// Verificar si ya tenemos la ubicación en el estado
					const existingLocation = driverLocations.get(order.driverId);
					if (existingLocation) {
						// Si ya tenemos la ubicación, crear el marcador inmediatamente (solo si el mapa está listo)
						logger.log('📍 Usando ubicación existente del repartidor:', {
							driverId: order.driverId,
							location: existingLocation
						});
						if (mapInstanceRef.current && window.google) {
							updateDriverMarker(order.driverId, existingLocation, order);
							// NO dibujar ruta aquí - se dibujará cuando se seleccione el pedido
							// Las rutas solo se dibujan cuando selectedOrderId cambia
						}
					} else {
						// Si no tenemos la ubicación, cargarla (siempre, incluso sin mapa)
						logger.log('📍 Cargando ubicación del repartidor desde Supabase:', {
							driverId: order.driverId,
							orderId: order.id
						});
						loadDriverLocation(order);
					}
				}
				// NO dibujar rutas aquí - se dibujarán cuando se seleccione el pedido
				// Las rutas solo se dibujan cuando selectedOrderId cambia
			});
		}, 100);

		return () => clearTimeout(timeoutId);
	}, [loading, activeOrders, onSelectOrder, driverLocations, loadDriverLocation, selectedOrderId]);

	// Mostrar ruta cuando cambia el pedido seleccionado
	useEffect(() => {
		if (!mapInstanceRef.current || !window.google || !directionsRendererRef.current) return;
		
		// Si hay un pedido seleccionado, mostrar su ruta (setDirections reemplaza automáticamente la anterior)
		if (selectedOrderId) {
			const selectedOrder = activeOrders.find(o => o.id === selectedOrderId);
			if (selectedOrder) {
				const coords = orderCoordsRef.current.get(selectedOrderId);
				const driverLocation = selectedOrder.driverId 
					? driverLocations.get(selectedOrder.driverId) 
					: null;
				
				if (coords && mapInstanceRef.current && window.google) {
					showRouteForOrder(selectedOrder, driverLocation, coords);
				} else {
					// Si no hay coordenadas, limpiar la ruta
					clearRoute();
				}
			}
		} else {
			// Si no hay pedido seleccionado, limpiar la ruta
			clearRoute();
		}
	}, [selectedOrderId, activeOrders, driverLocations, showRouteForOrder, clearRoute]);

	// Centrar mapa en repartidor y seleccionar su primer pedido
	const focusDriver = (driver, orderId = null) => {
		if (!mapInstanceRef.current || !driver.location) return;

		// Si se pasa un orderId específico, usarlo; si no, usar el primer pedido del repartidor
		const orderToSelect = orderId 
			? driver.orders.find(o => o.id === orderId) 
			: driver.orders[0];

		if (orderToSelect) {
			// Seleccionar el nuevo pedido (esto disparará el useEffect que muestra la ruta)
			setSelectedOrderId(orderToSelect.id);
			
			// Obtener coordenadas del pedido seleccionado
			const coords = orderCoordsRef.current.get(orderToSelect.id);
			const driverLocation = driverLocations.get(driver.driverId);
			
			// Centrar mapa en el repartidor o en el punto más relevante
			const position = {
				lat: driver.location.latitude,
				lng: driver.location.longitude,
			};
			
			// Si hay coordenadas, ajustar bounds para mostrar todo
			if (coords) {
				const bounds = new window.google.maps.LatLngBounds();
				bounds.extend(position);
				if (coords.pickup) {
					bounds.extend(new window.google.maps.LatLng(coords.pickup.lat, coords.pickup.lon));
				}
				if (coords.delivery) {
					bounds.extend(new window.google.maps.LatLng(coords.delivery.lat, coords.delivery.lon));
				}
				mapInstanceRef.current.fitBounds(bounds, { padding: 100 });
			} else {
				mapInstanceRef.current.setCenter(position);
				mapInstanceRef.current.setZoom(15);
			}
			
			// Llamar a onSelectOrder si existe
			if (onSelectOrder) {
				onSelectOrder(orderToSelect);
			}
		} else {
			// Si no hay pedidos, solo centrar en el repartidor
			const position = {
				lat: driver.location.latitude,
				lng: driver.location.longitude,
			};
			mapInstanceRef.current.setCenter(position);
			mapInstanceRef.current.setZoom(15);
		}

		// Abrir info window del marcador
		const marker = driverMarkersRef.current.get(driver.driverId);
		if (marker) {
			const infoWindow = new window.google.maps.InfoWindow({
				content: `
					<div style="padding: 0.5rem;">
						<h3 style="margin: 0 0 0.25rem 0; font-size: 0.875rem; font-weight: 600;">${driver.driverName}</h3>
						<p style="margin: 0; font-size: 0.75rem; color: #6b7280;">${driver.orders.length} pedido${driver.orders.length !== 1 ? 's' : ''}</p>
					</div>
				`,
			});
			infoWindow.open(mapInstanceRef.current, marker);
		}

		setSelectedDriver(driver.driverId);
	};

	// Limpiar suscripciones al desmontar
	useEffect(() => {
		return () => {
			subscriptionsRef.current.forEach(unsubscribe => {
				if (unsubscribe) unsubscribe();
			});
			markersRef.current.forEach(marker => marker.setMap(null));
			// Limpiar la ruta
			if (directionsRendererRef.current) {
				directionsRendererRef.current.setMap(null);
			}
		};
	}, []);

	// Mostrar error si no hay API key
	if (!apiKey) {
		return (
			<div className="tracking-panel-error">
				<AlertCircle />
				<h3>API Key de Google Maps no configurada</h3>
				<p>Agrega VITE_API_KEY_MAPS en tu archivo .env</p>
			</div>
		);
	}

	// Mostrar loading solo mientras carga Google Maps API
	if (!mapLoaded) {
		return (
			<div className="tracking-panel-loading">
				<Navigation />
				<p>Cargando mapa...</p>
			</div>
		);
	}

	// Mostrar error
	if (error) {
		return (
			<div className="tracking-panel-error">
				<AlertCircle />
				<h3>{error}</h3>
			</div>
		);
	}

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

				{/* Mapa */}
				<div ref={mapRef} className={`tracking-panel-map ${sidebarOpen && driversWithOrders.length > 0 ? 'with-sidebar' : ''}`} />
			</div>
		</div>
	);
}

