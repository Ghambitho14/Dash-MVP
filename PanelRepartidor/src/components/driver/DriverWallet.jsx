import { useState, useEffect, useMemo } from 'react';
import { Wallet, DollarSign, TrendingUp, Clock, X, Calendar, Package } from 'lucide-react';
import { getStorageObject } from '../../utils/storage';
import { Modal } from '../common/Modal';
import { formatDate, formatPrice } from '../../utils/utils';
import '../../styles/Components/DriverWallet.css';

export function DriverWallet({ orders = [], onNavigateToCompleted }) {
	const [driver, setDriver] = useState({});
	const [showEarningsDetails, setShowEarningsDetails] = useState(false);
	const [activeTab, setActiveTab] = useState('pedidos'); // 'pedidos', 'dia', 'semana'

	useEffect(() => {
		const loadDriver = async () => {
			const data = await getStorageObject('driver');
			setDriver(data || {});
		};
		loadDriver();
	}, []);
	
	// Usar los orders pasados como prop (vienen de Supabase)
	const ordersToUse = orders || [];
	const deliveredOrders = ordersToUse.filter(o => o.driverId === driver?.id && o.status === 'Entregado');
	const pendingOrders = ordersToUse.filter(o => o.driverId === driver?.id && o.status !== 'Entregado' && o.status !== 'Pendiente');
	
	const totalEarnings = deliveredOrders.reduce((sum, order) => sum + (order.suggestedPrice || 0), 0);
	const pendingEarnings = pendingOrders.reduce((sum, order) => sum + (order.suggestedPrice || 0), 0);
	const completedOrders = deliveredOrders.length;

	// Agrupar pedidos por día
	const ordersByDay = useMemo(() => {
		const grouped = {};
		deliveredOrders.forEach(order => {
			const date = new Date(order.updatedAt || order.createdAt);
			const dayKey = date.toLocaleDateString('es-ES', { 
				year: 'numeric', 
				month: '2-digit', 
				day: '2-digit' 
			});
			
			if (!grouped[dayKey]) {
				grouped[dayKey] = {
					date: dayKey,
					orders: [],
					total: 0
				};
			}
			
			grouped[dayKey].orders.push(order);
			grouped[dayKey].total += order.suggestedPrice || 0;
		});
		
		// Ordenar por fecha (más reciente primero)
		return Object.values(grouped).sort((a, b) => {
			return new Date(b.date.split('/').reverse().join('-')) - new Date(a.date.split('/').reverse().join('-'));
		});
	}, [deliveredOrders]);

	// Agrupar pedidos por semana
	const ordersByWeek = useMemo(() => {
		const grouped = {};
		
		deliveredOrders.forEach(order => {
			const date = new Date(order.updatedAt || order.createdAt);
			// Obtener el lunes de la semana
			const dayOfWeek = date.getDay();
			const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Ajustar para que lunes sea 1
			const monday = new Date(date);
			monday.setDate(diff);
			monday.setHours(0, 0, 0, 0);
			
			const weekKey = `Semana del ${monday.toLocaleDateString('es-ES', { 
				day: '2-digit', 
				month: '2-digit' 
			})}`;
			
			if (!grouped[weekKey]) {
				grouped[weekKey] = {
					week: weekKey,
					orders: [],
					total: 0,
					startDate: new Date(monday)
				};
			}
			
			grouped[weekKey].orders.push(order);
			grouped[weekKey].total += order.suggestedPrice || 0;
		});
		
		// Ordenar por fecha (más reciente primero)
		return Object.values(grouped).sort((a, b) => {
			return b.startDate - a.startDate;
		});
	}, [deliveredOrders]);

	return (
		<div className="driver-wallet">
			<div className="driver-wallet-header">
				<h2>Mi Billetera</h2>
				<p>Gestiona tus ganancias y pagos</p>
			</div>

			<div className="driver-wallet-content">
				<div className="driver-wallet-card driver-wallet-card-primary">
					<div className="driver-wallet-card-icon">
						<Wallet />
					</div>
					<div className="driver-wallet-card-content">
						<p className="driver-wallet-card-label">Total Ganado</p>
						<p className="driver-wallet-card-value">${totalEarnings.toLocaleString('es-CL')}</p>
					</div>
					<button 
						className="driver-wallet-card-button"
						onClick={() => setShowEarningsDetails(true)}
						title="Ver detalles de ganancias"
					>
						Ver Detalles
					</button>
				</div>

				<div className="driver-wallet-stats">
					<div className="driver-wallet-stat-card">
						<div className="driver-wallet-stat-icon driver-wallet-stat-icon-orange">
							<Clock />
						</div>
						<div className="driver-wallet-stat-content">
							<p className="driver-wallet-stat-label">Pendiente</p>
							<p className="driver-wallet-stat-value">${pendingEarnings.toLocaleString('es-CL')}</p>
						</div>
					</div>

					<div 
						className="driver-wallet-stat-card driver-wallet-stat-card-clickable"
						onClick={onNavigateToCompleted}
						style={{ cursor: onNavigateToCompleted ? 'pointer' : 'default' }}
					>
						<div className="driver-wallet-stat-icon driver-wallet-stat-icon-green">
							<TrendingUp />
						</div>
						<div className="driver-wallet-stat-content">
							<p className="driver-wallet-stat-label">Pedidos Completados</p>
							<p className="driver-wallet-stat-value">{completedOrders}</p>
						</div>
					</div>
				</div>

				<div className="driver-wallet-section">
					<h3 className="driver-wallet-section-title">Historial de Pagos</h3>
					<div className="driver-wallet-empty">
						<p>No hay pagos registrados aún</p>
					</div>
				</div>
			</div>

			{/* Modal de Detalles de Ganancias */}
			{showEarningsDetails && (
				<Modal onClose={() => setShowEarningsDetails(false)} maxWidth="xl">
					<div className="earnings-details-modal">
						<div className="earnings-details-header">
							<h2>Detalles de Ganancias</h2>
							<button 
								className="earnings-details-close"
								onClick={() => setShowEarningsDetails(false)}
							>
								<X size={20} />
							</button>
						</div>

						{/* Tabs */}
						<div className="earnings-details-tabs">
							<button
								className={`earnings-details-tab ${activeTab === 'pedidos' ? 'active' : ''}`}
								onClick={() => setActiveTab('pedidos')}
							>
								<Package size={16} />
								Por Pedido
							</button>
							<button
								className={`earnings-details-tab ${activeTab === 'dia' ? 'active' : ''}`}
								onClick={() => setActiveTab('dia')}
							>
								<Calendar size={16} />
								Por Día
							</button>
							<button
								className={`earnings-details-tab ${activeTab === 'semana' ? 'active' : ''}`}
								onClick={() => setActiveTab('semana')}
							>
								<Calendar size={16} />
								Por Semana
							</button>
						</div>

						{/* Contenido según tab activo */}
						<div className="earnings-details-content">
							{activeTab === 'pedidos' && (
								<div className="earnings-details-list">
									{deliveredOrders.length === 0 ? (
										<div className="earnings-details-empty">
											<Package size={48} />
											<p>No hay pedidos completados</p>
										</div>
									) : (
										deliveredOrders
											.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
											.map((order) => (
												<div key={order.id} className="earnings-details-item">
													<div className="earnings-details-item-info">
														<p className="earnings-details-item-title">
															{order.local || 'Local'} - {order.clientName || 'Cliente'}
														</p>
														<p className="earnings-details-item-date">
															{formatDate(order.updatedAt || order.createdAt)}
														</p>
													</div>
													<p className="earnings-details-item-amount">
														${formatPrice(order.suggestedPrice || 0)}
													</p>
												</div>
											))
									)}
								</div>
							)}

							{activeTab === 'dia' && (
								<div className="earnings-details-list">
									{ordersByDay.length === 0 ? (
										<div className="earnings-details-empty">
											<Calendar size={48} />
											<p>No hay pedidos completados</p>
										</div>
									) : (
										ordersByDay.map((dayGroup, index) => (
											<div key={index} className="earnings-details-day-group">
												<div className="earnings-details-day-header">
													<p className="earnings-details-day-date">{dayGroup.date}</p>
													<p className="earnings-details-day-total">
														${formatPrice(dayGroup.total)}
													</p>
												</div>
												<div className="earnings-details-day-orders">
													{dayGroup.orders.map((order) => (
														<div key={order.id} className="earnings-details-item earnings-details-item-nested">
															<div className="earnings-details-item-info">
																<p className="earnings-details-item-title">
																	{order.local || 'Local'} - {order.clientName || 'Cliente'}
																</p>
																<p className="earnings-details-item-date">
																	{new Date(order.updatedAt || order.createdAt).toLocaleTimeString('es-ES', {
																		hour: '2-digit',
																		minute: '2-digit'
																	})}
																</p>
															</div>
															<p className="earnings-details-item-amount">
																${formatPrice(order.suggestedPrice || 0)}
															</p>
														</div>
													))}
												</div>
											</div>
										))
									)}
								</div>
							)}

							{activeTab === 'semana' && (
								<div className="earnings-details-list">
									{ordersByWeek.length === 0 ? (
										<div className="earnings-details-empty">
											<Calendar size={48} />
											<p>No hay pedidos completados</p>
										</div>
									) : (
										ordersByWeek.map((weekGroup, index) => (
											<div key={index} className="earnings-details-week-group">
												<div className="earnings-details-week-header">
													<p className="earnings-details-week-date">{weekGroup.week}</p>
													<p className="earnings-details-week-total">
														${formatPrice(weekGroup.total)} ({weekGroup.orders.length} pedidos)
													</p>
												</div>
												<div className="earnings-details-week-orders">
													{weekGroup.orders.map((order) => (
														<div key={order.id} className="earnings-details-item earnings-details-item-nested">
															<div className="earnings-details-item-info">
																<p className="earnings-details-item-title">
																	{order.local || 'Local'} - {order.clientName || 'Cliente'}
																</p>
																<p className="earnings-details-item-date">
																	{formatDate(order.updatedAt || order.createdAt)}
																</p>
															</div>
															<p className="earnings-details-item-amount">
																${formatPrice(order.suggestedPrice || 0)}
															</p>
														</div>
													))}
												</div>
											</div>
										))
									)}
								</div>
							)}
						</div>

						{/* Resumen total */}
						<div className="earnings-details-footer">
							<p className="earnings-details-total-label">Total Ganado</p>
							<p className="earnings-details-total-amount">${formatPrice(totalEarnings)}</p>
						</div>
					</div>
				</Modal>
			)}
		</div>
	);
}

