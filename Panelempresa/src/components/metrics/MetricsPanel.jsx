import { useState, useEffect, useRef, useMemo } from 'react';
import { DollarSign, Package, TrendingUp, AlertCircle, Bike, BarChart3, X, Calendar, Store, ChevronDown } from 'lucide-react';
import { useMetrics } from '../../hooks/metrics/useMetrics';
import { formatPrice, isAdminOrEmpresarial } from '../../utils/utils';
import '../../styles/Components/MetricsPanel.css';

export function MetricsPanel({ orders, currentUser, onClose, localConfigs = [] }) {
	// Si es usuario local, establecer automáticamente su local y no permitir cambiar
	const isLocalUser = currentUser?.role === 'local' && currentUser.local;
	const initialLocal = isLocalUser ? currentUser.local : 'Todos';
	
	const [selectedLocal, setSelectedLocal] = useState(initialLocal);
	const [showLocalDropdown, setShowLocalDropdown] = useState(false);
	const dropdownRef = useRef(null);
	
	// Asegurar que usuarios locales siempre tengan su local seleccionado
	useEffect(() => {
		if (isLocalUser && currentUser.local) {
			setSelectedLocal(currentUser.local);
		}
	}, [isLocalUser, currentUser?.local]);
	
	// Filtrar pedidos según el local seleccionado
	const filteredOrders = useMemo(() => {
		// Si es usuario local, ya viene filtrado desde CompanyPanel, pero por seguridad filtramos de nuevo
		if (isLocalUser && currentUser.local) {
			return orders.filter(order => order.local === currentUser.local);
		}
		
		// Para admin/empresarial, usar el selector
		if (selectedLocal === 'Todos') {
			return orders;
		}
		
		// Filtrar por local seleccionado (comparación estricta)
		const filtered = orders.filter(order => {
			// Comparación estricta del nombre del local (trim para evitar espacios)
			const orderLocal = (order.local || '').trim();
			const selectedLocalTrimmed = (selectedLocal || '').trim();
			return orderLocal === selectedLocalTrimmed;
		});
		
		return filtered;
	}, [orders, selectedLocal, isLocalUser, currentUser?.local]);
	
	const metrics = useMetrics(filteredOrders, currentUser);
	
	// Obtener lista de locales disponibles (solo para admin/empresarial)
	const availableLocales = useMemo(() => {
		if (isLocalUser) return [];
		return ['Todos', ...localConfigs.map(config => config.name)];
	}, [localConfigs, isLocalUser]);
	
	// Cerrar dropdown al hacer clic fuera
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setShowLocalDropdown(false);
			}
		};
		
		if (showLocalDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}
		
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showLocalDropdown]);

	if (metrics.loading) {
		return (
			<div className="metrics-panel">
				<div className="metrics-loading">
					<BarChart3 size={48} />
					<p>Cargando métricas...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="metrics-panel">
			{/* Header */}
			<div className="metrics-panel-header">
				<div className="metrics-panel-header-content">
					<BarChart3 size={24} />
					<h2>Métricas y Estadísticas</h2>
				</div>
				<div className="metrics-panel-header-right">
					{/* Selector de local solo para admin/empresarial - pueden ver métricas de todos los locales */}
					{isAdminOrEmpresarial(currentUser?.role) && availableLocales.length > 1 && (
						<div className="metrics-local-selector" ref={dropdownRef}>
							<button
								className="metrics-local-selector-button"
								onClick={() => setShowLocalDropdown(!showLocalDropdown)}
							>
								<Store size={16} />
								<span>{selectedLocal === 'Todos' ? 'Todos los Locales' : selectedLocal}</span>
								<ChevronDown 
									size={16} 
									style={{ 
										transform: showLocalDropdown ? 'rotate(180deg)' : 'rotate(0)',
										transition: 'transform 0.2s'
									}} 
								/>
							</button>
							{showLocalDropdown && (
								<div className="metrics-local-dropdown">
									{availableLocales.map((local) => (
										<button
											key={local}
											className={`metrics-local-option ${selectedLocal === local ? 'active' : ''}`}
											onClick={() => {
												setSelectedLocal(local);
												setShowLocalDropdown(false);
											}}
										>
											{local === 'Todos' ? 'Todos los Locales' : local}
										</button>
									))}
								</div>
							)}
						</div>
					)}
					{/* Mostrar local fijo para usuarios locales */}
					{isLocalUser && currentUser.local && (
						<div className="metrics-local-selector">
							<div className="metrics-local-selector-button" style={{ cursor: 'default', opacity: 0.8 }}>
								<Store size={16} />
								<span>{currentUser.local}</span>
							</div>
						</div>
					)}
					{onClose && (
						<button
							onClick={onClose}
							className="metrics-panel-close"
							aria-label="Cerrar métricas"
						>
							<X />
						</button>
					)}
				</div>
			</div>

			{/* Contenido */}
			<div className="metrics-panel-content">
				{/* 🥇 NIVEL 1 - MÉTRICAS ESENCIALES */}
				<div className="metrics-level">
					<div className="metrics-level-header">
						<span className="metrics-level-badge">🥇 NIVEL 1</span>
						<h3>Métricas Esenciales</h3>
					</div>

					{/* 💰 VENTAS */}
					<div className="metrics-section">
						<div className="metrics-section-title">
							<DollarSign size={20} />
							<h4>Ventas</h4>
						</div>
						<div className="metrics-grid">
							<div className="metrics-card metrics-card-primary">
								<p className="metrics-card-label">Ingresos Hoy</p>
								<p className="metrics-card-value">{formatPrice(metrics.sales.revenueToday)}</p>
							</div>
							<div className="metrics-card">
								<p className="metrics-card-label">Últimos 7 días</p>
								<p className="metrics-card-value">{formatPrice(metrics.sales.revenueLast7Days)}</p>
							</div>
							<div className="metrics-card">
								<p className="metrics-card-label">Últimos 30 días</p>
								<p className="metrics-card-value">{formatPrice(metrics.sales.revenueLast30Days)}</p>
							</div>
							<div className="metrics-card">
								<p className="metrics-card-label">Ticket Promedio</p>
								<p className="metrics-card-value">{formatPrice(metrics.sales.averageTicket)}</p>
							</div>
						</div>
					</div>

					{/* 📦 PEDIDOS */}
					<div className="metrics-section">
						<div className="metrics-section-title">
							<Package size={20} />
							<h4>Pedidos</h4>
						</div>
						<div className="metrics-grid">
							<div className="metrics-card metrics-card-primary">
								<p className="metrics-card-label">Total Hoy</p>
								<p className="metrics-card-value">{metrics.orders.totalToday}</p>
							</div>
							<div className="metrics-card metrics-card-success">
								<p className="metrics-card-label">Completados</p>
								<p className="metrics-card-value">{metrics.orders.completed}</p>
							</div>
							<div className="metrics-card metrics-card-danger">
								<p className="metrics-card-label">Cancelados</p>
								<p className="metrics-card-value">{metrics.orders.cancelled}</p>
							</div>
							<div className="metrics-card">
								<p className="metrics-card-label">Tasa de Cancelación</p>
								<p className="metrics-card-value">{metrics.orders.cancellationRate.toFixed(1)}%</p>
							</div>
						</div>
						{Object.keys(metrics.orders.byTimeSlot).length > 0 && (
							<div className="metrics-subsection">
								<p className="metrics-subsection-title">Pedidos por Franja Horaria (Hoy)</p>
								<div className="metrics-list">
									{Object.entries(metrics.orders.byTimeSlot).map(([slot, count]) => (
										<div key={slot} className="metrics-list-item">
											<span>{slot}</span>
											<span className="metrics-list-value">{count} pedidos</span>
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					{/* 📊 GRÁFICO DE PEDIDOS DIARIOS */}
					<div className="metrics-section">
						<div className="metrics-section-title">
							<Calendar size={20} />
							<h4>Pedidos Diarios (Últimos 7 días)</h4>
						</div>
						<div className="metrics-chart-container">
							<div className="metrics-chart-bars">
								{metrics.orders.byDay.map((day, index) => {
									const maxCount = Math.max(...metrics.orders.byDay.map(d => d.count), 1);
									const height = (day.count / maxCount) * 100;
									const completedHeight = day.count > 0 ? (day.completed / day.count) * 100 : 0;
									
									return (
										<div key={index} className="metrics-chart-bar-container">
											<div className="metrics-chart-bar-wrapper">
												<div
													className="metrics-chart-bar"
													style={{
														height: `${height}%`,
													}}
													title={`${day.count} pedidos`}
												>
													{day.count > 0 && (
														<span className="metrics-chart-bar-value">{day.count}</span>
													)}
												</div>
												<div
													className="metrics-chart-bar-completed"
													style={{
														height: `${completedHeight}%`,
													}}
													title={`${day.completed} completados`}
												/>
											</div>
											<p className="metrics-chart-label">{day.dateShort}</p>
										</div>
									);
								})}
							</div>
							<div className="metrics-chart-legend">
								<div className="metrics-chart-legend-item">
									<div className="metrics-chart-legend-color metrics-chart-legend-total"></div>
									<span>Total</span>
								</div>
								<div className="metrics-chart-legend-item">
									<div className="metrics-chart-legend-color metrics-chart-legend-completed"></div>
									<span>Completados</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* 🥈 NIVEL 2 - OPERACIÓN Y EFICIENCIA */}
				<div className="metrics-level">
					<div className="metrics-level-header">
						<span className="metrics-level-badge">🥈 NIVEL 2</span>
						<h3>Operación y Eficiencia</h3>
					</div>

					{/* 🛵 REPARTIDORES */}
					<div className="metrics-section">
						<div className="metrics-section-title">
							<Bike size={20} />
							<h4>Repartidores</h4>
						</div>
						<div className="metrics-grid">
							<div className="metrics-card metrics-card-primary">
								<p className="metrics-card-label">Activos Hoy</p>
								<p className="metrics-card-value">{metrics.drivers.activeToday}</p>
							</div>
							<div className="metrics-card">
								<p className="metrics-card-label">Promedio por Repartidor</p>
								<p className="metrics-card-value">{metrics.drivers.averageOrdersPerDriver.toFixed(1)}</p>
							</div>
							{metrics.drivers.inactiveWithSession > 0 && (
								<div className="metrics-card metrics-card-warning">
									<p className="metrics-card-label">Inactivos con Sesión</p>
									<p className="metrics-card-value">{metrics.drivers.inactiveWithSession}</p>
								</div>
							)}
						</div>
					</div>

					{/* 🧭 RENDIMIENTO OPERATIVO */}
					<div className="metrics-section">
						<div className="metrics-section-title">
							<TrendingUp size={20} />
							<h4>Rendimiento Operativo</h4>
						</div>
						<div className="metrics-grid">
							{metrics.performance.delayed > 0 && (
								<div className="metrics-card metrics-card-warning">
									<p className="metrics-card-label">Pedidos Retrasados</p>
									<p className="metrics-card-value">{metrics.performance.delayed}</p>
								</div>
							)}
							{metrics.performance.driverChanged > 0 && (
								<div className="metrics-card metrics-card-info">
									<p className="metrics-card-label">Cambio de Repartidor</p>
									<p className="metrics-card-value">{metrics.performance.driverChanged}</p>
								</div>
							)}
							{metrics.performance.reassigned > 0 && (
								<div className="metrics-card metrics-card-info">
									<p className="metrics-card-label">Reasignados</p>
									<p className="metrics-card-value">{metrics.performance.reassigned}</p>
								</div>
							)}
							{metrics.performance.rejected > 0 && (
								<div className="metrics-card metrics-card-danger">
									<p className="metrics-card-label">Rechazados</p>
									<p className="metrics-card-value">{metrics.performance.rejected}</p>
								</div>
							)}
						</div>
						{metrics.performance.delayed === 0 && 
						 metrics.performance.driverChanged === 0 && 
						 metrics.performance.reassigned === 0 && 
						 metrics.performance.rejected === 0 && (
							<div className="metrics-empty-state">
								<AlertCircle size={32} />
								<p>No hay problemas operativos reportados</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

