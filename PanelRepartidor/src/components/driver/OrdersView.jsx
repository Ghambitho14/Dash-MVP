import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown, Navigation, Clock, MapPin, User as UserIcon, ExternalLink } from 'lucide-react';
import { OrderList } from '../orders/OrderList';
import '../../styles/Components/OrdersView.css';

export function OrdersView({ 
	orders, 
	onSelectOrder, 
	onAcceptOrder,
	onUpdateStatus,
	isOnline,
	hasLocation,
	locationLoading,
	activeTab,
	onTabChange,
	myOrdersCount = 0
}) {
	const [sortBy, setSortBy] = useState('distance');
	const [showFilters, setShowFilters] = useState(false);

	const sortedOrders = [...orders].sort((a, b) => {
		if (sortBy === 'distance') {
			const distA = a.distance !== null && a.distance !== undefined ? a.distance : Infinity;
			const distB = b.distance !== null && b.distance !== undefined ? b.distance : Infinity;
			return distA - distB;
		}
		if (sortBy === 'payment') {
			return (b.suggestedPrice || 0) - (a.suggestedPrice || 0);
		}
		if (sortBy === 'time') {
			const timeA = new Date(a.createdAt).getTime();
			const timeB = new Date(b.createdAt).getTime();
			return timeA - timeB;
		}
		return 0;
	});

	const openInGoogleMaps = (address) => {
		// Usar OpenStreetMap en lugar de Google Maps (gratuito)
		const url = `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`;
		window.open(url, '_blank');
	};

	return (
		<div className="orders-view-container">
			{/* Tabs */}
			<div className="orders-view-tabs">
				<button
					onClick={() => onTabChange && onTabChange('available')}
					className={`orders-view-tab ${activeTab === 'available' ? 'orders-view-tab-active' : ''}`}
				>
					Pedidos Disponibles ({orders.length})
				</button>
				<button
					onClick={() => onTabChange && onTabChange('myOrders')}
					className={`orders-view-tab ${activeTab === 'myOrders' ? 'orders-view-tab-active' : ''}`}
				>
					Mis Pedidos
				</button>
			</div>

			{activeTab === 'available' && (
				<>
					<div className="orders-view-header">
						<div>
							<h1 className="orders-view-title">Pedidos Disponibles</h1>
							<p className="orders-view-subtitle">Selecciona un pedido para comenzar</p>
						</div>

						{/* Sort/Filter Controls */}
						<div className="orders-view-controls">
							<motion.button
								whileTap={{ scale: 0.95 }}
								onClick={() => setShowFilters(!showFilters)}
								className="orders-view-control-button"
							>
								<ArrowUpDown className="orders-view-control-icon" />
							</motion.button>
						</div>
					</div>

			{/* Sort Options */}
			{showFilters && (
				<motion.div
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: 'auto' }}
					exit={{ opacity: 0, height: 0 }}
					className="orders-view-sort-container"
				>
					{[
						{ value: 'distance', label: 'Más Cerca' },
						{ value: 'payment', label: 'Mayor Pago' },
						{ value: 'time', label: 'Menos Tiempo' },
					].map((option) => (
						<motion.button
							key={option.value}
							whileTap={{ scale: 0.95 }}
							onClick={() => {
								setSortBy(option.value);
								setShowFilters(false);
							}}
							className={`orders-view-sort-option ${sortBy === option.value ? 'orders-view-sort-option-active' : ''}`}
						>
							{option.label}
						</motion.button>
					))}
				</motion.div>
			)}

			{/* Warnings */}
			{!isOnline && (
				<div className="orders-view-warning orders-view-warning-important">
					<MapPin />
					<div>
						<p><strong>Conéctate para ver pedidos</strong></p>
						<p>Activa el botón "Conectado" en la parte superior para activar tu ubicación GPS y ver pedidos disponibles</p>
					</div>
				</div>
			)}
			{isOnline && !hasLocation && locationLoading && (
				<div className="orders-view-warning">
					<MapPin />
					<p>Obteniendo tu ubicación GPS...</p>
				</div>
			)}
			{isOnline && !hasLocation && !locationLoading && (
				<div className="orders-view-warning">
					<MapPin />
					<p>No se pudo obtener tu ubicación GPS. Verifica los permisos de ubicación en tu dispositivo.</p>
				</div>
			)}

					{/* Orders List */}
					<div className="orders-view-orders-container">
						{!isOnline ? (
							<div className="orders-view-empty">
								<MapPin className="orders-view-empty-icon" />
								<p className="orders-view-empty-title">Conéctate para ver pedidos</p>
								<p className="orders-view-empty-text">
									Activa el botón "Conectado" en la parte superior para activar tu ubicación GPS y ver pedidos disponibles
								</p>
							</div>
						) : sortedOrders.length > 0 ? (
							<>
								{myOrdersCount >= 2 && (
									<div className="orders-view-warning orders-view-warning-important">
										<Package />
										<div>
											<p><strong>Límite de pedidos alcanzado</strong></p>
											<p>Tienes {myOrdersCount} pedido{myOrdersCount !== 1 ? 's' : ''} activo{myOrdersCount !== 1 ? 's' : ''}. Completa algunos antes de aceptar nuevos. Solo puedes ver hasta 2 pedidos disponibles.</p>
										</div>
									</div>
								)}
								<OrderList
									orders={sortedOrders}
									onAcceptOrder={onAcceptOrder}
									onUpdateStatus={onUpdateStatus}
									myOrdersCount={myOrdersCount}
								/>
							</>
						) : (
							<div className="orders-view-empty">
								<MapPin className="orders-view-empty-icon" />
								<p className="orders-view-empty-title">No hay pedidos disponibles</p>
								<p className="orders-view-empty-text">
									{hasLocation 
										? 'No hay pedidos pendientes dentro de 5 km de tu ubicación'
										: 'Obteniendo tu ubicación GPS...'
									}
								</p>
							</div>
						)}
					</div>
				</>
			)}
		</div>
	);
}

