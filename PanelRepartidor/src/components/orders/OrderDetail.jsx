import { useState, useEffect } from 'react';
import { X, MapPin, Navigation, DollarSign, Clock, Package, AlertCircle } from 'lucide-react';
import { getStatusIcon, getNextStatus, formatDate, formatPrice } from '../../utils/utils';
import { PickupCodeModal } from './PickupCodeModal';
import { SimpleMap } from './SimpleMap';
import toast from 'react-hot-toast';
import '../../styles/Components/OrderDetail.css';
import { getPrimaryAction, validateOrderForTransition } from './orderStateMachine.jsx';


export function OrderDetail({ order, onClose, onAcceptOrder, onUpdateStatus, canAcceptOrder = true }) {
	const StatusIcon = getStatusIcon(order.status);
	const action = getPrimaryAction(order);
	const isAssigned = order.status === 'Asignado';
	const [timeRemaining, setTimeRemaining] = useState(null);
	const [showPickupCodeModal, setShowPickupCodeModal] = useState(false);

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

	const handleAccept = () => {
		if (!canAcceptOrder) {
			toast.error('No puedes aceptar más pedidos. Tienes 2 o más pedidos activos. Completa algunos antes de aceptar nuevos.');
			return;
		}
		if (onAcceptOrder) {
			onAcceptOrder(order.id);
		}
	};

	const handleUpdateStatus = () => {
		if (!onUpdateStatus || !action) return;

		const check = validateOrderForTransition(order, action.toStatus);
		if (!check.ok) {
			toast.error(check.reason);
			return;
		}

		if (action.requiresPickupCode) {
			setShowPickupCodeModal(true);
			return;
		}

		onUpdateStatus(order.id, action.toStatus);
		setTimeout(() => {
			onClose();
		}, 300);
	};

	const handlePickupCodeConfirm = (code) => {
		// Normaliza ambos a string de 6 dígitos
		const expected = String(order.pickupCode ?? '').replace(/\D/g, '').padStart(6, '0');
		const entered  = String(code ?? '').replace(/\D/g, '').padStart(6, '0');

		if (entered !== expected) return false;

		const actionNow = getPrimaryAction(order);
		if (!actionNow) return false;

		onUpdateStatus(order.id, actionNow.toStatus);
		setShowPickupCodeModal(false);
		setTimeout(() => onClose(), 300);
		return true;
		};


	return (
		<div className={`order-detail-driver ${isAssigned ? 'order-detail-driver-assigned' : ''}`}>
			{/* Header con Alerta si está asignado */}
			<div className="order-detail-driver-header">
				<div className="order-detail-driver-header-main">
					<div className="order-detail-driver-header-top">
						<div className={`order-detail-driver-header-icon ${isAssigned ? 'order-detail-driver-header-icon-assigned' : 'order-detail-driver-header-icon-available'}`}>
							<StatusIcon />
						</div>
						<div>
							<h2 className="order-detail-driver-header-title">{order.id}</h2>
							<div className="order-detail-driver-header-time">
								<Clock />
								<span>Creado: {formatDate(order.createdAt)}</span>
							</div>
						</div>
					</div>
					{isAssigned && (
						<div className="order-detail-driver-alert">
							<AlertCircle />
							<span className="order-detail-driver-alert-text">
								¡Di que ya vas en camino! 
								{timeRemaining !== null && timeRemaining > 0 && (
									<span style={{ marginLeft: '0.5rem', fontWeight: '700' }}>
										({timeRemaining}s restantes)
									</span>
								)}
							</span>
						</div>
					)}
				</div>
				<button
					onClick={onClose}
					className="order-detail-driver-close"
					aria-label="Cerrar"
				>
					<X />
				</button>
			</div>

			{/* Order Details */}
			<div className="order-detail-driver-content">
				{/* Progreso del Pedido */}
				<div className="order-detail-driver-item order-detail-driver-item-border-2">
					<div className={`order-detail-driver-item-icon ${isAssigned ? 'order-detail-driver-item-icon-assigned' : 'order-detail-driver-item-icon-available'}`}>
						<StatusIcon />
					</div>
					<div className="order-detail-driver-item-content">
						<p className="order-detail-driver-item-label">Progreso del Pedido</p>
						<p className="order-detail-driver-item-value">{order.status}</p>
					</div>
				</div>

				{/* Local */}
				<div className="order-detail-driver-item">
					<div className="order-detail-driver-item-icon order-detail-driver-item-icon-gray">
						<Package />
					</div>
					<div className="order-detail-driver-item-content">
						<p className="order-detail-driver-item-label">Local</p>
						<p className="order-detail-driver-item-value">{order.local}</p>
					</div>
				</div>

				{/* Pickup Address */}
				<div className="order-detail-driver-item order-detail-driver-item-start">
					<div className="order-detail-driver-item-icon order-detail-driver-item-icon-available">
						<MapPin />
					</div>
					<div className="order-detail-driver-item-content">
						<p className="order-detail-driver-item-label">Dirección de Retiro</p>
						<p className="order-detail-driver-item-text">{order.pickupAddress}</p>
					</div>
				</div>

				{/* Mapa del Local o Entrega según el estado */}
				{(() => {
					// Si el pedido ya fue retirado, mostrar dirección de entrega
					const isPickedUp = order.status === 'Producto retirado' || order.status === 'Entregado';
					const addressToShow = isPickedUp ? order.deliveryAddress : order.localAddress;
					const labelToShow = isPickedUp ? 'Ubicación de Entrega' : 'Ubicación del Local';
					
					if (!addressToShow) return null;
					
					return (
						<SimpleMap address={addressToShow} label={labelToShow} />
					);
				})()}

				{/* Delivery Address */}
				<div className="order-detail-driver-item order-detail-driver-item-start">
					<div className="order-detail-driver-item-icon order-detail-driver-item-icon-orange">
						<Navigation />
					</div>
					<div className="order-detail-driver-item-content">
						<p className="order-detail-driver-item-label">Dirección de Entrega</p>
						<p className="order-detail-driver-item-text">{order.deliveryAddress}</p>
					</div>
				</div>

				{/* Precio del Reparto */}
				<div className="order-detail-driver-item order-detail-driver-item-price">
					<div className="order-detail-driver-item-icon order-detail-driver-item-icon-green">
						<DollarSign />
					</div>
					<div className="order-detail-driver-item-content">
						<p className="order-detail-driver-item-label order-detail-driver-item-price-label">Precio del Reparto</p>
						<p className="order-detail-driver-item-price-value">${formatPrice(order.suggestedPrice)}</p>
					</div>
				</div>
			</div>

			{/* Actions */}
			<div className="order-detail-driver-actions">
				{order.status === 'Pendiente' && (
					<>
						<button
							onClick={onClose}
							className="order-detail-driver-button order-detail-driver-button-secondary order-detail-driver-button-medium"
						>
							Cancelar
						</button>
						<button
							onClick={handleAccept}
							disabled={!canAcceptOrder}
							className={`order-detail-driver-button order-detail-driver-button-primary ${!canAcceptOrder ? 'order-detail-driver-button-disabled' : ''}`}
							title={!canAcceptOrder ? 'No puedes aceptar más pedidos. Tienes 2 o más pedidos activos.' : ''}
						>
							{canAcceptOrder ? 'Aceptar Pedido' : 'Límite alcanzado (2+ pedidos activos)'}
						</button>
					</>
				)}

				{order.status !== 'Pendiente' && order.status !== 'Entregado' && action && (
							<>
								<button
								onClick={onClose}
								className="order-detail-driver-button order-detail-driver-button-secondary order-detail-driver-button-medium"
								>
								Cerrar
								</button>

								<button
								onClick={handleUpdateStatus}
								className={`order-detail-driver-button ${isAssigned ? 'order-detail-driver-button-orange' : 'order-detail-driver-button-blue'}`}
								>
								{action.label}
								</button>
							</>
							)}


				{order.status === 'Entregado' && (
					<button
						onClick={onClose}
						className="order-detail-driver-button order-detail-driver-button-blue"
					>
						Cerrar
					</button>
				)}
			</div>

			{/* Modal de código de retiro */}
			{showPickupCodeModal && (
				<PickupCodeModal
					onClose={() => setShowPickupCodeModal(false)}
					onConfirm={handlePickupCodeConfirm}
					orderId={order.id}
				/>
			)}
		</div>
	);
}

