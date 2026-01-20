import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Navigation, Phone, MapPin, User as UserIcon, ExternalLink, Clock, Package, MessageCircle } from 'lucide-react';
import { formatPrice } from '../../utils/utils';
import { PickupCodeModal } from '../orders/PickupCodeModal';
import { OrderChat } from '../orders/OrderChat';
import { getPrimaryAction, validateOrderForTransition } from '../../constants/orderStatus';
import { Modal } from '../common/Modal';
import toast from 'react-hot-toast';
import '../../styles/Components/MyOrdersView.css';

export function MyOrdersView({ 
	orders, 
	onSelectOrder,
	onUpdateStatus,
	selectedOrder,
	onCloseOrder,
	currentDriver
}) {
	const [selectedOrderId, setSelectedOrderId] = useState(null);
	const [showPickupCodeModal, setShowPickupCodeModal] = useState(false);
	const [showChat, setShowChat] = useState({});
	const [timeRemaining, setTimeRemaining] = useState({});

	// Calcular tiempo restante para cada pedido "Asignado"
	useEffect(() => {
		const timers = {};
		
		orders.forEach((order) => {
			if (order.status === 'Asignado') {
				timers[order.id] = setInterval(() => {
					const now = new Date();
					const updatedAt = new Date(order.updatedAt);
					const elapsed = Math.floor((now.getTime() - updatedAt.getTime()) / 1000);
					const remaining = Math.max(0, 60 - elapsed);
					setTimeRemaining(prev => ({ ...prev, [order.id]: remaining }));
				}, 1000);
			}
		});

		return () => {
			Object.values(timers).forEach(timer => clearInterval(timer));
		};
	}, [orders]);

	const formatTime = (seconds) => {
		if (seconds === null || seconds === undefined) return '0:00';
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	const openInGoogleMaps = (address) => {
		// Usar OpenStreetMap en lugar de Google Maps (gratuito)
		const url = `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`;
		window.open(url, '_blank');
	};

	const callCustomer = (phone) => {
		if (phone) {
			window.location.href = `tel:${phone}`;
		}
	};

	// Voy en camino (cambiar de Asignado a En camino)
	const handleVoyEnCamino = (order) => {
		if (!onUpdateStatus || !order) return;

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
	const handleRetireProduct = (order) => {
		if (!onUpdateStatus || !order) {
			toast.error('No se puede retirar el producto en este momento');
			return;
		}

		const action = getPrimaryAction(order);
		if (!action) {
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
			setSelectedOrderId(order.id);
			setShowPickupCodeModal(true);
			return;
		}

		// Si no requiere código, actualizar directamente
		onUpdateStatus(order.id, action.toStatus);
	};

	// Confirmar código de retiro
	const handlePickupCodeConfirm = (code) => {
		const order = orders.find(o => o.id === selectedOrderId);
		if (!order || !onUpdateStatus) return false;

		const expected = String(order.pickupCode ?? '').replace(/\D/g, '').padStart(6, '0');
		const entered = String(code ?? '').replace(/\D/g, '').padStart(6, '0');

		if (entered !== expected) {
			return false;
		}

		const actionNow = getPrimaryAction(order);
		if (!actionNow) {
			return false;
		}

		onUpdateStatus(order.id, actionNow.toStatus);
		setShowPickupCodeModal(false);
		setSelectedOrderId(null);
		
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

	if (orders.length === 0) {
		return (
			<div className="my-orders-view-container">
				<div className="my-orders-view-header">
					<h1 className="my-orders-view-title">Mi Pedido Activo</h1>
					<p className="my-orders-view-subtitle">Sigue el progreso de tu entrega</p>
				</div>
				<div className="my-orders-view-empty">
					<Package className="my-orders-view-empty-icon" />
					<p className="my-orders-view-empty-title">No tienes pedidos activos</p>
					<p className="my-orders-view-empty-text">Acepta pedidos de la pestaña "Disponibles"</p>
				</div>
			</div>
		);
	}

	return (
		<div className="my-orders-view-container">
			<div className="my-orders-view-header">
				<h1 className="my-orders-view-title">Mis Pedidos Activos</h1>
				<p className="my-orders-view-subtitle">{orders.length} pedido{orders.length !== 1 ? 's' : ''} en curso</p>
			</div>

			{orders.map((order, index) => {
				const action = getPrimaryAction(order);
				const isAssigned = order.status === 'Asignado';
				const isEnCamino = order.status === 'En camino' || order.status === 'En camino al retiro';
				const orderTimeRemaining = timeRemaining[order.id] ?? null;

				return (
					<motion.div
						key={order.id}
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: index * 0.1 }}
						className="my-orders-view-active-order-card"
					>
						{/* Timer */}
						{orderTimeRemaining !== null && (
							<div className="my-orders-view-timer-container">
								<Clock className="my-orders-view-timer-icon" />
								<span className="my-orders-view-timer-text">Tiempo restante:</span>
								<motion.span 
									className={`my-orders-view-timer-value ${orderTimeRemaining < 300 ? 'my-orders-view-timer-value-warning' : ''}`}
									animate={{ scale: orderTimeRemaining < 300 ? [1, 1.1, 1] : 1 }}
									transition={{ repeat: orderTimeRemaining < 300 ? Infinity : 0, duration: 1 }}
								>
									{formatTime(orderTimeRemaining)}
								</motion.span>
							</div>
						)}

						<div className="my-orders-view-active-order-header">
							<div>
								<span className="my-orders-view-active-order-badge">En Curso</span>
								<h3 className="my-orders-view-active-order-title">{order.local || order.id}</h3>
							</div>
							<span className="my-orders-view-active-order-payment">${formatPrice(order.suggestedPrice)}</span>
						</div>

						{/* Progress Steps */}
						<div className="my-orders-view-active-order-progress">
							<div className="my-orders-view-progress-step">
								<div className={`my-orders-view-progress-dot ${order.status !== 'Pendiente' && order.status !== 'Asignado' ? 'my-orders-view-progress-dot-complete' : ''}`}></div>
								<span className="my-orders-view-progress-label">Recogido</span>
							</div>
							<div className="my-orders-view-progress-line"></div>
							<div className="my-orders-view-progress-step">
								<div className={`my-orders-view-progress-dot ${isEnCamino || order.status === 'Producto retirado' ? 'my-orders-view-progress-dot-active' : ''} ${order.status === 'Producto retirado' ? 'my-orders-view-progress-dot-complete' : ''}`}></div>
								<span className="my-orders-view-progress-label">En camino</span>
							</div>
							<div className="my-orders-view-progress-line"></div>
							<div className="my-orders-view-progress-step">
								<div className={`my-orders-view-progress-dot ${order.status === 'Entregado' ? 'my-orders-view-progress-dot-complete' : ''}`}></div>
								<span className="my-orders-view-progress-label">Entregado</span>
							</div>
						</div>

						<div className="my-orders-view-section-title">Información del Cliente</div>
						<div className="my-orders-view-active-order-details">
							<div className="my-orders-view-order-detail">
								<UserIcon className="my-orders-view-order-icon" />
								<span>{order.clientName || 'Cliente'}</span>
							</div>
							
							<div className="my-orders-view-location-wrapper">
								<div className="my-orders-view-order-detail">
									<MapPin className="my-orders-view-order-icon" />
									<span>{order.deliveryAddress}</span>
								</div>
								<motion.button
									whileHover={{ scale: 1.1 }}
									whileTap={{ scale: 0.95 }}
									onClick={() => openInGoogleMaps(order.deliveryAddress)}
									className="my-orders-view-map-button"
								>
									<ExternalLink className="my-orders-view-map-icon" />
								</motion.button>
							</div>

							{order.clientPhone && (
								<div className="my-orders-view-order-detail">
									<Phone className="my-orders-view-order-icon" />
									<span>{order.clientPhone}</span>
								</div>
							)}
						</div>

						<div className="my-orders-view-active-order-actions">
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => openInGoogleMaps(order.deliveryAddress)}
								className="my-orders-view-navigation-button"
							>
								<Navigation style={{width: '1.25rem', height: '1.25rem'}} />
								Navegar
							</motion.button>
							{order.clientPhone && (
								<motion.button
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									onClick={() => callCustomer(order.clientPhone)}
									className="my-orders-view-call-button"
								>
									<Phone style={{width: '1.25rem', height: '1.25rem'}} />
									Llamar
								</motion.button>
							)}
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => setShowChat(prev => ({ ...prev, [order.id]: true }))}
								className="my-orders-view-chat-button"
							>
								<MessageCircle style={{width: '1.25rem', height: '1.25rem'}} />
								Chat con Empresa
							</motion.button>
						</div>

						{isAssigned ? (
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => handleVoyEnCamino(order)}
								className="my-orders-view-en-camino-button"
							>
								<Navigation style={{width: '1.25rem', height: '1.25rem'}} />
								Voy en Camino
							</motion.button>
						) : isEnCamino ? (
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => handleRetireProduct(order)}
								className="my-orders-view-retire-button"
							>
								<Package style={{width: '1.25rem', height: '1.25rem'}} />
								Retirar Producto
							</motion.button>
						) : order.status === 'Producto retirado' ? (
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => {
									if (onUpdateStatus && order) {
										onUpdateStatus(order.id, 'Entregado');
										confetti({
											particleCount: 200,
											spread: 120,
											origin: { y: 0.5 },
											colors: ['#10b981', '#059669', '#34d399'],
										});
										toast.success('¡Pedido Entregado!', {
											description: 'Gracias por tu trabajo',
											duration: 3000,
										});
									}
								}}
								className="my-orders-view-complete-button"
							>
								Entregar Pedido
							</motion.button>
						) : null}
					</motion.div>
				);
			})}

			{/* Modal de código de retiro */}
			{showPickupCodeModal && selectedOrderId && (
				<PickupCodeModal
					onClose={() => {
						setShowPickupCodeModal(false);
						setSelectedOrderId(null);
					}}
					onConfirm={handlePickupCodeConfirm}
					orderId={selectedOrderId}
				/>
			)}

			{/* Modal de Chat con Empresa */}
			{Object.entries(showChat).map(([orderId, isOpen]) => {
				if (!isOpen) return null;
				const order = orders.find(o => o.id === orderId);
				if (!order || !currentDriver) return null;
				
				return (
					<Modal key={orderId} onClose={() => setShowChat(prev => ({ ...prev, [orderId]: false }))} maxWidth="md">
						<OrderChat
							order={order}
							currentDriver={currentDriver}
							onClose={() => setShowChat(prev => ({ ...prev, [orderId]: false }))}
						/>
					</Modal>
				);
			})}

			{orders.length > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="my-orders-view-info-card"
				>
					<p className="my-orders-view-info-text">
						💡 <strong>Consejo:</strong> Verifica el código de entrega con el cliente antes de marcar como completado.
					</p>
				</motion.div>
			)}
		</div>
	);
}

