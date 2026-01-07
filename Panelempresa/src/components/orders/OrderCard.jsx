import { MapPin, Clock, Trash2, User, Star, Bike, Key, MessageCircle } from 'lucide-react';
import { formatStatusForCompany, formatRelativeTime, formatPrice, getInitials } from '../../utils/utils';
import { useCurrentTime } from '../../hooks/orders/useCurrentTime';
import { useOrderUnreadMessages } from '../../hooks/orders/useOrderUnreadMessages';
import '../../styles/Components/OrderCard.css';

export function OrderCard({ order, onClick, onDelete, showDriver = false, currentUser }) {
	const currentTime = useCurrentTime();
	const hasUnreadMessages = useOrderUnreadMessages(order, currentUser);
	const clientName = order.clientName || 'Cliente';
	const clientPhone = order.clientPhone || '';

	const handleDelete = (e) => {
		e.stopPropagation();
		onDelete?.(order.id);
	};

	// Mapear estados a clases CSS según Figma
	const getStatusClass = (status) => {
		const statusMap = {
			'Pendiente': 'pending',
			'Asignado': 'in-progress',
			'En camino al retiro': 'in-progress',
			'Producto retirado': 'in-progress',
			'Entregado': 'completed',
		};
		return statusMap[status] || 'pending';
	};

	// Mapear estados a formato de Figma (pending, in-progress, completed)
	const getFigmaStatus = (status) => {
		if (status === 'Pendiente') return 'pending';
		if (status === 'Entregado') return 'completed';
		return 'in-progress';
	};

	return (
		<div
			onClick={onClick}
			className="delivery-order-card"
		>
			{/* Header con ID y Estado */}
			<div className="delivery-order-header">
				<span className="delivery-order-id">{order.id}</span>
				<span className={`delivery-order-status ${getStatusClass(order.status)}`}>
					{formatStatusForCompany(order.status)}
				</span>
			</div>

			{/* Cliente */}
			<div className="delivery-order-client">
				<div className="delivery-order-client-avatar">
					{getInitials(clientName)}
				</div>
				<div className="delivery-order-client-info">
					<div className="delivery-order-client-name-row">
						<h4>{clientName}</h4>
						{hasUnreadMessages && order.driverId && (
							<span className="delivery-order-unread-badge">
								<MessageCircle size={14} />
								<span>Tienes un mensaje del repartidor</span>
							</span>
						)}
					</div>
					{clientPhone && <p>{clientPhone}</p>}
				</div>
			</div>

			{/* Mostrar repartidor si está asignado y showDriver es true */}
			{showDriver && order.driverName && (
				<div className="delivery-order-driver">
					<div className="delivery-order-driver-icon">
						<Bike size={16} />
					</div>
					<div className="delivery-order-driver-info">
						<div className="delivery-order-driver-name">
							<User size={14} />
							<span>{order.driverName}</span>
						</div>
						<div className="delivery-order-driver-details">
							{order.driverVehicle && (
								<span className="delivery-order-driver-vehicle">{order.driverVehicle}</span>
							)}
							{order.driverRating && (
								<div className="delivery-order-driver-rating">
									<Star size={12} fill="currentColor" />
									<span>{order.driverRating}</span>
								</div>
							)}
						</div>
					</div>
					{order.estimatedTime && (
						<div className="delivery-order-eta">
							<Clock size={14} />
							<span>{order.estimatedTime}</span>
						</div>
					)}
				</div>
			)}

			{/* Indicador si no tiene repartidor asignado en pedidos activos */}
			{showDriver && !order.driverName && order.status !== 'Entregado' && (
				<div className="delivery-order-no-driver">
					<User size={16} />
					<span>Sin repartidor asignado</span>
				</div>
			)}

			{/* Direcciones */}
			<div className="delivery-order-details">
				<div className="delivery-order-detail-row">
					<MapPin />
					<span>{order.pickupAddress}</span>
				</div>
				<div className="delivery-order-detail-row">
					<MapPin />
					<span>{order.deliveryAddress}</span>
				</div>
			</div>

			{/* Código de Retiro */}
			{order.pickupCode && (
				<div className="delivery-order-pickup-code">
					<Key size={14} />
					<span className="delivery-order-pickup-code-label">Código:</span>
					<span className="delivery-order-pickup-code-value">{order.pickupCode}</span>
				</div>
			)}

			{/* Footer con Tiempo y Precio */}
			<div className="delivery-order-footer">
				<div className="delivery-order-time">
					<Clock size={12} />
					{formatRelativeTime(order.createdAt, currentTime)}
				</div>
				<div className="delivery-order-price">
					${formatPrice(order.suggestedPrice)}
				</div>
			</div>

			{onDelete && (
				<button
					className="delivery-order-delete"
					onClick={handleDelete}
					title="Eliminar pedido"
					style={{ position: 'absolute', top: '1rem', right: '1rem' }}
				>
					<Trash2 size={16} />
				</button>
			)}
		</div>
	);
}

