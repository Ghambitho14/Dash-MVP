import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { MapPin, Navigation, Clock, User as UserIcon, ExternalLink, Package } from 'lucide-react';
import { getStatusColor, getStatusIcon, formatRelativeTime, formatPrice, geocodeAddress } from '../../utils/utils';
import { PickupCodeModal } from './PickupCodeModal';
import { getPrimaryAction, validateOrderForTransition } from '../../constants/orderStatus';
import toast from 'react-hot-toast';
import { ensureGoogleMapsLoaded } from '../../utils/googleMapsLoader';
import { logger } from '../../utils/logger';
import '../../styles/Components/OrderCard.css';

export function OrderCard({ order, onClick, onDelete, onAcceptOrder, onUpdateStatus, currentTime }) {
	const statusColor = getStatusColor(order.status);
	const StatusIcon = getStatusIcon(order.status);
	const isPending = order.status === 'Pendiente';
	const isAssigned = order.status === 'Asignado';
	const isEnCamino = order.status === 'En camino' || order.status === 'En camino al retiro';
	const [timeRemaining, setTimeRemaining] = useState(null);
	const [showPickupCodeModal, setShowPickupCodeModal] = useState(false);
	const [mapLoaded, setMapLoaded] = useState(false);
	const mapRef = useRef(null);
	const mapInstanceRef = useRef(null);
	const directionsRendererRef = useRef(null);
	const action = getPrimaryAction(order);

	// Calcular tiempo restante si el pedido está "Asignado"
	useEffect(() => {
		if (order.status === 'Asignado') {
			const updateTimer = () => {
				const now = new Date();
				const updatedAt = new Date(order.updatedAt);
				const elapsed = Math.floor((now.getTime() - updatedAt.getTime()) / 1000); // segundos transcurridos
				const remaining = Math.max(0, 60 - elapsed); // 60 segundos = 1 minuto
				setTimeRemaining(remaining);
			};

			updateTimer();
			const interval = setInterval(updateTimer, 1000);

			return () => clearInterval(interval);
		} else {
			setTimeRemaining(null);
		}
	}, [order.status, order.updatedAt]);

	const handleDelete = (e) => {
		e.stopPropagation();
		if (onDelete) {
			onDelete(order.id);
		}
	};

	const openInGoogleMaps = (address) => {
		const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
		window.open(url, '_blank');
	};

	// Aceptar pedido directamente
	const handleAcceptOrder = async (e) => {
		e.stopPropagation();
		if (!onAcceptOrder) return;

		try {
			// Confetti celebration
			confetti({
				particleCount: 100,
				spread: 70,
				origin: { y: 0.6 },
				colors: ['#035ce8', '#2b73ee', '#528af4', '#10b981'],
			});

			await onAcceptOrder(order.id);
			toast.success('¡Pedido Aceptado!', {
				description: `${order.local || order.id} - ${order.clientName || 'Cliente'}`,
				duration: 3000,
			});
		} catch (err) {
			toast.error('Error al aceptar pedido: ' + err.message);
		}
	};

	// Voy en camino (cambiar de Asignado a En camino al retiro)
	const handleVoyEnCamino = (e) => {
		e.stopPropagation();
		
		if (!onUpdateStatus) return;

		const check = validateOrderForTransition(order, 'En camino al retiro');
		if (!check.ok) {
			toast.error(check.reason);
			return;
		}

		onUpdateStatus(order.id, 'En camino al retiro');
		toast.success('¡En camino!', {
			description: 'El cliente ha sido notificado',
			duration: 3000,
		});
	};

	// Retirar producto (con código) - solo cuando está "En camino"
	const handleRetireProduct = (e) => {
		e.stopPropagation();
		
		if (!onUpdateStatus || !action) {
			toast.error('No se puede retirar el producto en este momento');
			return;
		}

		const check = validateOrderForTransition(order, action.toStatus);
		if (!check.ok) {
			toast.error(check.reason);
			return;
		}

		// Siempre requiere código para retirar producto
		if (action.requiresPickupCode) {
			setShowPickupCodeModal(true);
			return;
		}

		// Si no requiere código, actualizar directamente
		if (onUpdateStatus) {
			onUpdateStatus(order.id, action.toStatus);
		}
	};

	// Confirmar código de retiro
	const handlePickupCodeConfirm = (code) => {
		const expected = String(order.pickupCode ?? '').replace(/\D/g, '').padStart(6, '0');
		const entered = String(code ?? '').replace(/\D/g, '').padStart(6, '0');

		if (entered !== expected) {
			return false;
		}

		const actionNow = getPrimaryAction(order);
		if (!actionNow || !onUpdateStatus) {
			return false;
		}

		onUpdateStatus(order.id, actionNow.toStatus);
		setShowPickupCodeModal(false);
		
		// Confetti celebration
		confetti({
			particleCount: 150,
			spread: 100,
			origin: { y: 0.5 },
			colors: ['#10b981', '#059669', '#34d399'],
		});

		toast.success('¡Producto Retirado!', {
			description: 'Puedes continuar con la entrega',
			duration: 3000,
		});

		return true;
	};

	// Inicializar mapa con ruta
	useEffect(() => {
		if (!order.localAddress || !order.deliveryAddress) return;
		if (!mapRef.current) return;

		const initMap = async () => {
			try {
				const apiKey = import.meta.env.VITE_API_KEY_MAPS;
				if (!apiKey) {
					logger.warn('VITE_API_KEY_MAPS no configurada');
					return;
				}

				// Cargar Google Maps con librerías necesarias
				await ensureGoogleMapsLoaded({ 
					apiKey, 
					libraries: ['places', 'directions'] 
				});

				if (!window.google || !window.google.maps) {
					logger.warn('Google Maps no está disponible');
					return;
				}

				// Esperar a que DirectionsService esté disponible
				let retries = 0;
				const maxRetries = 20;
				const retryDelay = 100;
				while (retries < maxRetries) {
					if (window.google.maps.DirectionsService) {
						break;
					}
					await new Promise(resolve => setTimeout(resolve, retryDelay));
					retries++;
				}

				// Geocodificar ambas direcciones
				const [localCoords, deliveryCoords] = await Promise.all([
					geocodeAddress(order.localAddress),
					geocodeAddress(order.deliveryAddress)
				]);

				if (!localCoords || !deliveryCoords) {
					logger.warn('No se pudieron geocodificar las direcciones');
					return;
				}

				// Crear mapa centrado entre ambas ubicaciones
				const center = {
					lat: (localCoords.lat + deliveryCoords.lat) / 2,
					lng: (localCoords.lon + deliveryCoords.lon) / 2
				};

				const map = new window.google.maps.Map(mapRef.current, {
					zoom: 13,
					center: center,
					mapTypeControl: false,
					fullscreenControl: false,
					streetViewControl: false,
					zoomControl: true,
					styles: [
						{
							featureType: 'poi',
							elementType: 'labels',
							stylers: [{ visibility: 'off' }]
						}
					]
				});

				mapInstanceRef.current = map;

				// Agregar marcadores usando Marker tradicional
				// (Aunque está deprecado, sigue funcionando y es más compatible)
				const localMarker = new window.google.maps.Marker({
					position: { lat: localCoords.lat, lng: localCoords.lon },
					map: map,
					label: {
						text: 'A',
						color: 'white',
						fontSize: '14px',
						fontWeight: 'bold'
					},
					icon: {
						url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
						scaledSize: new window.google.maps.Size(40, 40)
					},
					title: `Local: ${order.localAddress}`
				});

				const deliveryMarker = new window.google.maps.Marker({
					position: { lat: deliveryCoords.lat, lng: deliveryCoords.lon },
					map: map,
					label: {
						text: 'B',
						color: 'white',
						fontSize: '14px',
						fontWeight: 'bold'
					},
					icon: {
						url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
						scaledSize: new window.google.maps.Size(40, 40)
					},
					title: `Entrega: ${order.deliveryAddress}`
				});

				// Crear servicio de direcciones
				const directionsService = new window.google.maps.DirectionsService();
				const directionsRenderer = new window.google.maps.DirectionsRenderer({
					map: map,
					suppressMarkers: true, // Usamos nuestros propios marcadores
					polylineOptions: {
						strokeColor: '#FF6B35', // Color naranja similar a la imagen
						strokeWeight: 5,
						strokeOpacity: 0.8
					}
				});

				directionsRendererRef.current = directionsRenderer;

				// Calcular y mostrar ruta
				directionsService.route(
					{
						origin: { lat: localCoords.lat, lng: localCoords.lon },
						destination: { lat: deliveryCoords.lat, lng: deliveryCoords.lon },
						travelMode: window.google.maps.TravelMode.DRIVING
					},
					(result, status) => {
						if (status === 'OK' && result) {
							directionsRenderer.setDirections(result);
							// Ajustar zoom para mostrar toda la ruta usando los bounds de la ruta
							const bounds = result.routes[0].bounds;
							map.fitBounds(bounds);
						} else {
							logger.warn('Error al calcular ruta:', status);
							// Si falla, solo mostrar los marcadores
							const bounds = new window.google.maps.LatLngBounds();
							bounds.extend(new window.google.maps.LatLng(localCoords.lat, localCoords.lon));
							bounds.extend(new window.google.maps.LatLng(deliveryCoords.lat, deliveryCoords.lon));
							map.fitBounds(bounds);
						}
					}
				);

				setMapLoaded(true);
			} catch (error) {
				logger.error('Error inicializando mapa:', error);
			}
		};

		initMap();

		// Cleanup
		return () => {
			if (directionsRendererRef.current) {
				directionsRendererRef.current.setMap(null);
			}
			if (mapInstanceRef.current) {
				mapInstanceRef.current = null;
			}
		};
	}, [order.localAddress, order.deliveryAddress]);

	return (
		<motion.div
			initial={{ opacity: 0, x: -20 }}
			animate={{ opacity: 1, x: 0 }}
			whileHover={{ scale: 1.02 }}
			className="order-card-new"
		>
			{/* Header con restaurante y precio */}
			<div className="order-card-header">
				<h3 className="order-card-restaurant">{order.local || order.id}</h3>
				<span className="order-card-payment">${formatPrice(order.suggestedPrice)}</span>
			</div>

			{/* Detalles del pedido */}
			<div className="order-card-details">
				{/* Cliente */}
				<div className="order-card-detail">
					<UserIcon className="order-card-icon" />
					<span className="order-card-detail-text">{order.clientName || 'Cliente'}</span>
				</div>

				{/* Dirección del local */}
				{order.localAddress && (
					<div className="order-card-location-wrapper">
						<div className="order-card-detail">
							<Package className="order-card-icon" />
							<span className="order-card-detail-text">
								<strong>Local:</strong> {order.localAddress}
							</span>
						</div>
						<motion.button
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.95 }}
							onClick={(e) => {
								e.stopPropagation();
								openInGoogleMaps(order.localAddress);
							}}
							className="order-card-map-button"
							title="Abrir local en Google Maps"
						>
							<ExternalLink className="order-card-map-icon" />
						</motion.button>
					</div>
				)}

				{/* Dirección de entrega */}
				<div className="order-card-location-wrapper">
					<div className="order-card-detail">
						<MapPin className="order-card-icon" />
						<span className="order-card-detail-text">
							<strong>Entrega:</strong> {order.deliveryAddress}
						</span>
					</div>
					<motion.button
						whileHover={{ scale: 1.1 }}
						whileTap={{ scale: 0.95 }}
						onClick={(e) => {
							e.stopPropagation();
							openInGoogleMaps(order.deliveryAddress);
						}}
						className="order-card-map-button"
						title="Abrir en Google Maps"
					>
						<ExternalLink className="order-card-map-icon" />
					</motion.button>
				</div>

				{/* Métricas */}
				<div className="order-card-metrics">
					{order.distance !== null && order.distance !== undefined && (
						<div className="order-card-metric">
							<Navigation className="order-card-metric-icon" />
							<span>{order.distance.toFixed(1)} km</span>
						</div>
					)}
					<div className="order-card-metric">
						<Clock className="order-card-metric-icon" />
						<span>{formatRelativeTime(order.createdAt, currentTime)}</span>
					</div>
				</div>
			</div>

			{/* Mapa embebido con ruta */}
			{order.localAddress && order.deliveryAddress && (
				<div className="order-card-map-container">
					<div 
						ref={mapRef} 
						className="order-card-map"
						style={{ width: '100%', height: '100%', minHeight: '180px' }}
					/>
					{!mapLoaded && (
						<div className="order-card-map-loading">
							<Navigation className="order-card-map-loading-icon" />
							<span>Cargando ruta...</span>
						</div>
					)}
				</div>
			)}

			{/* Botón de acción */}
			{isPending ? (
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={handleAcceptOrder}
					className="order-card-accept-button"
				>
					Aceptar Pedido
				</motion.button>
			) : isAssigned ? (
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={handleVoyEnCamino}
					className="order-card-en-camino-button"
				>
					<Navigation style={{ width: '1.25rem', height: '1.25rem' }} />
					Voy en Camino
				</motion.button>
			) : isEnCamino ? (
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={handleRetireProduct}
					className="order-card-retire-button"
				>
					<Package style={{ width: '1.25rem', height: '1.25rem' }} />
					Retirar Producto
				</motion.button>
			) : null}

			{/* Modal de código de retiro */}
			{showPickupCodeModal && (
				<PickupCodeModal
					onClose={() => setShowPickupCodeModal(false)}
					onConfirm={handlePickupCodeConfirm}
					orderId={order.id}
				/>
			)}
		</motion.div>
	);
}

