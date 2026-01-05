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
	const [timeRemaining, setTimeRemaining] = useState(null);
	const [showPickupCodeModal, setShowPickupCodeModal] = useState(false);
	const [showChat, setShowChat] = useState(false);
	const activeOrder = orders.length > 0 ? orders[0] : null;
	const action = activeOrder ? getPrimaryAction(activeOrder) : null;
	const isAssigned = activeOrder?.status === 'Asignado';
	const isEnCamino = activeOrder?.status === 'En camino' || activeOrder?.status === 'En camino al retiro';

	useEffect(() => {
		if (activeOrder && activeOrder.status === 'Asignado') {
			const timer = setInterval(() => {
				const now = new Date();
				const updatedAt = new Date(activeOrder.updatedAt);
				const elapsed = Math.floor((now.getTime() - updatedAt.getTime()) / 1000);
				const remaining = Math.max(0, 60 - elapsed);
				setTimeRemaining(remaining);
			}, 1000);
			return () => clearInterval(timer);
		} else {
			setTimeRemaining(null);
		}
	}, [activeOrder]);

	const formatTime = (seconds) => {
		if (seconds === null || seconds === undefined) return '0:00';
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	const openInGoogleMaps = (address) => {
		const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
		window.open(url, '_blank');
	};

	const callCustomer = (phone) => {
		if (phone) {
			window.location.href = `tel:${phone}`;
		}
	};

	// Voy en camino (cambiar de Asignado a En camino)
	const handleVoyEnCamino = () => {
		if (!onUpdateStatus || !activeOrder) return;

		const check = validateOrderForTransition(activeOrder, 'En camino al retiro');
		if (!check.ok) {
			toast.error(check.reason);
			return;
		}

		onUpdateStatus(activeOrder.id, 'En camino al retiro');
		toast.success('¡En camino!', {
			description: 'El cliente ha sido notificado',
			duration: 3000,
		});
	};

	// Retirar producto (con código) - solo cuando está "En camino"
	const handleRetireProduct = () => {
		if (!onUpdateStatus || !action || !activeOrder) {
			toast.error('No se puede retirar el producto en este momento');
			return;
		}

		const check = validateOrderForTransition(activeOrder, action.toStatus);
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
		onUpdateStatus(activeOrder.id, action.toStatus);
	};

	// Confirmar código de retiro
	const handlePickupCodeConfirm = (code) => {
		if (!activeOrder || !onUpdateStatus) return false;

		const expected = String(activeOrder.pickupCode ?? '').replace(/\D/g, '').padStart(6, '0');
		const entered = String(code ?? '').replace(/\D/g, '').padStart(6, '0');

		if (entered !== expected) {
			return false;
		}

		const actionNow = getPrimaryAction(activeOrder);
		if (!actionNow) {
			return false;
		}

		onUpdateStatus(activeOrder.id, actionNow.toStatus);
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

	if (!activeOrder) {
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
				<h1 className="my-orders-view-title">Mi Pedido Activo</h1>
				<p className="my-orders-view-subtitle">Sigue el progreso de tu entrega</p>
			</div>

			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				className="my-orders-view-active-order-card"
			>
				{/* Timer */}
				{timeRemaining !== null && (
					<div className="my-orders-view-timer-container">
						<Clock className="my-orders-view-timer-icon" />
						<span className="my-orders-view-timer-text">Tiempo restante:</span>
						<motion.span 
							className={`my-orders-view-timer-value ${timeRemaining < 300 ? 'my-orders-view-timer-value-warning' : ''}`}
							animate={{ scale: timeRemaining < 300 ? [1, 1.1, 1] : 1 }}
							transition={{ repeat: timeRemaining < 300 ? Infinity : 0, duration: 1 }}
						>
							{formatTime(timeRemaining)}
						</motion.span>
					</div>
				)}

				<div className="my-orders-view-active-order-header">
					<div>
						<span className="my-orders-view-active-order-badge">En Curso</span>
						<h3 className="my-orders-view-active-order-title">{activeOrder.local || activeOrder.id}</h3>
					</div>
					<span className="my-orders-view-active-order-payment">${formatPrice(activeOrder.suggestedPrice)}</span>
				</div>

				{/* Progress Steps */}
				<div className="my-orders-view-active-order-progress">
					<div className="my-orders-view-progress-step">
						<div className="my-orders-view-progress-dot my-orders-view-progress-dot-complete"></div>
						<span className="my-orders-view-progress-label">Recogido</span>
					</div>
					<div className="my-orders-view-progress-line"></div>
					<div className="my-orders-view-progress-step">
						<div className="my-orders-view-progress-dot my-orders-view-progress-dot-active"></div>
						<span className="my-orders-view-progress-label">En camino</span>
					</div>
					<div className="my-orders-view-progress-line"></div>
					<div className="my-orders-view-progress-step">
						<div className="my-orders-view-progress-dot"></div>
						<span className="my-orders-view-progress-label">Entregado</span>
					</div>
				</div>

				<div className="my-orders-view-section-title">Información del Cliente</div>
				<div className="my-orders-view-active-order-details">
					<div className="my-orders-view-order-detail">
						<UserIcon className="my-orders-view-order-icon" />
						<span>{activeOrder.clientName || 'Cliente'}</span>
					</div>
					
					<div className="my-orders-view-location-wrapper">
						<div className="my-orders-view-order-detail">
							<MapPin className="my-orders-view-order-icon" />
							<span>{activeOrder.deliveryAddress}</span>
						</div>
						<motion.button
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => openInGoogleMaps(activeOrder.deliveryAddress)}
							className="my-orders-view-map-button"
						>
							<ExternalLink className="my-orders-view-map-icon" />
						</motion.button>
					</div>

					{activeOrder.clientPhone && (
						<div className="my-orders-view-order-detail">
							<Phone className="my-orders-view-order-icon" />
							<span>{activeOrder.clientPhone}</span>
						</div>
					)}
				</div>

				<div className="my-orders-view-active-order-actions">
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => openInGoogleMaps(activeOrder.deliveryAddress)}
						className="my-orders-view-navigation-button"
					>
						<Navigation style={{width: '1.25rem', height: '1.25rem'}} />
						Navegar
					</motion.button>
					{activeOrder.clientPhone && (
						<motion.button
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							onClick={() => callCustomer(activeOrder.clientPhone)}
							className="my-orders-view-call-button"
						>
							<Phone style={{width: '1.25rem', height: '1.25rem'}} />
							Llamar
						</motion.button>
					)}
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => setShowChat(true)}
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
						onClick={handleVoyEnCamino}
						className="my-orders-view-en-camino-button"
					>
						<Navigation style={{width: '1.25rem', height: '1.25rem'}} />
						Voy en Camino
					</motion.button>
				) : isEnCamino ? (
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={handleRetireProduct}
						className="my-orders-view-retire-button"
					>
						<Package style={{width: '1.25rem', height: '1.25rem'}} />
						Retirar Producto
					</motion.button>
				) : activeOrder?.status === 'Producto retirado' ? (
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => {
							if (onUpdateStatus && activeOrder) {
								onUpdateStatus(activeOrder.id, 'Entregado');
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

			{/* Modal de código de retiro */}
			{showPickupCodeModal && activeOrder && (
				<PickupCodeModal
					onClose={() => setShowPickupCodeModal(false)}
					onConfirm={handlePickupCodeConfirm}
					orderId={activeOrder.id}
				/>
			)}

			{/* Modal de Chat con Empresa */}
			{showChat && activeOrder && currentDriver && (
				<Modal onClose={() => setShowChat(false)} maxWidth="md">
					<OrderChat
						order={activeOrder}
						currentDriver={currentDriver}
						onClose={() => setShowChat(false)}
					/>
				</Modal>
			)}

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

		</div>
	);
}

