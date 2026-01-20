import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { MapPin, Navigation, Clock, User as UserIcon, ExternalLink, Package } from 'lucide-react';
import { getStatusColor, getStatusIcon, formatRelativeTime, formatPrice, geocodeAddress } from '../../utils/utils';
import { PickupCodeModal } from './PickupCodeModal';
import { getPrimaryAction, validateOrderForTransition } from '../../constants/orderStatus';
import toast from 'react-hot-toast';
import { logger } from '../../utils/logger';
import { OrderMap } from './OrderMap';
import '../../styles/Components/OrderCard.css';

export function OrderCard({ order, onClick, onDelete, onAcceptOrder, onUpdateStatus, currentTime, canAcceptOrder = true }) {
	const statusColor = getStatusColor(order.status);
	const StatusIcon = getStatusIcon(order.status);
	const isPending = order.status === 'Pendiente';
	const isAssigned = order.status === 'Asignado';
	const isEnCamino = order.status === 'En camino' || order.status === 'En camino al retiro';
	const [timeRemaining, setTimeRemaining] = useState(null);
	const [showPickupCodeModal, setShowPickupCodeModal] = useState(false);
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
		// Usar OpenStreetMap en lugar de Google Maps (gratuito)
		const url = `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`;
		window.open(url, '_blank');
	};

	// Aceptar pedido directamente
	const handleAcceptOrder = async (e) => {
		e.stopPropagation();
		if (!onAcceptOrder) return;

		// Validar que puede aceptar pedidos
		if (!canAcceptOrder) {
			toast.error('No puedes aceptar más pedidos. Tienes 2 o más pedidos activos. Completa algunos antes de aceptar nuevos.');
			return;
		}

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
					<OrderMap 
						pickupAddress={order.localAddress}
						deliveryAddress={order.deliveryAddress}
					/>
				</div>
			)}

			{/* Botón de acción */}
			{isPending ? (
				<motion.button
					whileHover={canAcceptOrder ? { scale: 1.02 } : {}}
					whileTap={canAcceptOrder ? { scale: 0.98 } : {}}
					onClick={handleAcceptOrder}
					disabled={!canAcceptOrder}
					className={`order-card-accept-button ${!canAcceptOrder ? 'order-card-accept-button-disabled' : ''}`}
					title={!canAcceptOrder ? 'No puedes aceptar más pedidos. Tienes 2 o más pedidos activos.' : ''}
				>
					{canAcceptOrder ? 'Aceptar Pedido' : 'Límite alcanzado (2+ pedidos activos)'}
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

