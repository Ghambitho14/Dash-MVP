import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrderList } from '../orders/OrderList';
import { DriverProfile } from './DriverProfile';
import { DriverWallet } from './DriverWallet';
import { DriverSettings } from './DriverSettings';
import { HomeView } from './HomeView';
import { OrdersView } from './OrdersView';
import { MyOrdersView } from './MyOrdersView';
import { BottomNavigation } from './BottomNavigation';
import { DriverHeader } from './DriverHeader';
import { Modal } from '../common/Modal';
import { ChatButton } from '../orders/ChatButton';
import { SupportChat } from '../support/SupportChat';
import { getOrCreateOrderChat } from '../../services/orderChatService';
import { supabase } from '../../utils/supabase';
import { getStorageObject } from '../../utils/storage';
import { Package, MapPin, CheckCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { logger } from '../../utils/logger';
import '../../styles/Components/DriverApp.css';
import { validateOrderForTransition, normalizeStatus } from '../../constants/orderStatus';

export function DriverApp({ 
	orders, 
	setOrders, 
	onReloadOrders, 
	activeView, 
	onViewChange, 
	hasLocation, 
	locationLoading,
	isOnline,
	onOnlineChange,
	onLogout,
	driverName,
	currentDriver
}) {
	const [activeTab, setActiveTab] = useState('available');
	const [driverData, setDriverData] = useState(null);
	const [showOrdersModal, setShowOrdersModal] = useState(false);
	const [showSupportChat, setShowSupportChat] = useState(false);

	// Cargar información del driver desde storage (async)
	useEffect(() => {
		const loadDriverData = async () => {
			const data = await getStorageObject('driver');
			setDriverData(data || {});
		};
		loadDriverData();
	}, []);

	// Detectar si se abrió desde la burbuja flotante (Android)
	useEffect(() => {
		// Verificar parámetros de URL
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get('showOrdersModal') === 'true') {
			setShowOrdersModal(true);
			// Limpiar el parámetro de la URL
			window.history.replaceState({}, document.title, window.location.pathname);
		}

		// Exponer función global para que MainActivity pueda llamarla
		window.setShowOrdersModal = (show) => {
			setShowOrdersModal(show);
		};

		// Limpiar función global al desmontar
		return () => {
			delete window.setShowOrdersModal;
		};
	}, []);

	const driverId = driverData?.id;
	const finalDriverName = driverName || driverData?.name || 'Repartidor';

	// ---- Listas derivadas ----
	const allAvailableOrders = orders.filter(order => order.status === 'Pendiente');

	const myOrders = orders.filter(
		order => order.driverId === driverId && order.status !== 'Entregado'
	);

	// Limitar pedidos disponibles a 2 si ya tiene 2 o más pedidos activos
	const availableOrders = myOrders.length >= 2 
		? allAvailableOrders.slice(0, 2) 
		: allAvailableOrders;

	const completedOrders = orders.filter(
		order => order.driverId === driverId && order.status === 'Entregado'
	);

	// ---- Aceptar pedido ----
	const handleAcceptOrder = async (orderId) => {
		// Validar que no tenga 2 o más pedidos activos
		if (myOrders.length >= 2) {
			toast.error('No puedes aceptar más pedidos. Tienes 2 o más pedidos activos. Completa algunos antes de aceptar nuevos.');
			return;
		}

		const order = orders.find(order => order.id === orderId);
		if (!order) {
			toast.error('Pedido no encontrado');
			return;
		}

		// Validar que tenemos el ID de base de datos
		let orderDbId = order._dbId;
		
		// Si no hay _dbId, intentar extraerlo del id formateado
		if (!orderDbId && order.id) {
			const idStr = order.id.toString().replace('ORD-', '');
			orderDbId = parseInt(idStr, 10);
		}
		
		// Asegurar que sea un número
		if (orderDbId) {
			orderDbId = parseInt(orderDbId, 10);
		}
		
		if (!orderDbId || isNaN(orderDbId)) {
			logger.error('No se puede aceptar pedido: falta _dbId o es inválido', { 
				order, 
				_dbId: order._dbId,
				id: order.id 
			});
			toast.error('Error: No se pudo identificar el pedido correctamente');
			return;
		}

		// Validar que tenemos el driverId
		if (!driverId) {
			logger.error('No se puede aceptar pedido: falta driverId');
			toast.error('Error: No se pudo identificar al repartidor');
			return;
		}

		try {
			logger.log('Aceptando pedido:', {
				orderId,
				orderDbId,
				driverId,
				order: order
			});

			const { data, error } = await supabase
				.from('orders')
				.update({
					status: 'Asignado',
					driver_id: driverId,
					updated_at: new Date().toISOString(),
				})
				.eq('id', orderDbId)
				.select();

			if (error) {
				logger.error('Error actualizando pedido:', error);
				throw error;
			}

			logger.log('Pedido actualizado exitosamente:', data);

			// Insertar en historial
			const { error: historyError } = await supabase
				.from('order_status_history')
				.insert({
					order_id: orderDbId,
					status: 'Asignado',
					driver_id: driverId,
				});

			if (historyError) {
				logger.warn('Error insertando en historial (no crítico):', historyError);
			}

			// Crear chat automáticamente cuando se acepta el pedido
			try {
				const companyId = order.company_id || order._dbCompanyId;
				if (companyId && driverId && orderDbId) {
					await getOrCreateOrderChat(orderDbId, companyId, driverId);
					logger.log('✅ Chat creado automáticamente para el pedido:', orderDbId);
				}
			} catch (chatError) {
				logger.warn('Error creando chat (no crítico):', chatError);
				// No bloqueamos el flujo si falla la creación del chat
			}

			// ✅ Con realtime no necesitas polling.
			// Igual recargamos por seguridad UX (por si realtime tarda o está apagado)
			if (onReloadOrders) {
				await onReloadOrders();
			}

			setActiveTab('myOrders');
			toast.success('Pedido aceptado exitosamente');
		} catch (err) {
			logger.error('Error al aceptar pedido:', err);
			const errorMessage = err.message || err.details || 'Error desconocido al aceptar pedido';
			toast.error('Error al aceptar pedido: ' + errorMessage);
		}
	};

	// ---- Actualizar estado (con máquina de estados) ----
	const handleUpdateStatus = async (orderId, newStatus) => {
		const order = orders.find(o => o.id === orderId);
		if (!order) {
			toast.error('Pedido no encontrado');
			return;
		}

		// Validar que tenemos el ID de base de datos
		let orderDbId = order._dbId;
		
		// Si no hay _dbId, intentar extraerlo del id formateado
		if (!orderDbId && order.id) {
			const idStr = order.id.toString().replace('ORD-', '');
			orderDbId = parseInt(idStr, 10);
		}
		
		// Asegurar que sea un número
		if (orderDbId) {
			orderDbId = parseInt(orderDbId, 10);
		}
		
		if (!orderDbId || isNaN(orderDbId)) {
			logger.error('No se puede actualizar pedido: falta _dbId o es inválido', { 
				order, 
				_dbId: order._dbId,
				id: order.id 
			});
			toast.error('Error: No se pudo identificar el pedido correctamente');
			return;
		}

		// Normalizar el estado antes de validar y actualizar
		const normalizedStatus = normalizeStatus(newStatus);

		// ✅ Validación con máquina de estados ANTES de tocar Supabase
		const check = validateOrderForTransition(order, normalizedStatus);
		if (!check.ok) {
			toast.error(check.reason);
			return;
		}

		try {
			// Validar que el estado normalizado es uno de los permitidos
			const allowedStatuses = ['Pendiente', 'Asignado', 'En camino al retiro', 'Producto retirado', 'Entregado'];
			if (!allowedStatuses.includes(normalizedStatus)) {
				logger.error('Estado no permitido:', {
					normalizedStatus,
					allowedStatuses,
					newStatus
				});
				toast.error(`Estado no permitido: ${normalizedStatus}`);
				return;
			}

			logger.log('Actualizando estado del pedido:', {
				orderId,
				orderDbId,
				newStatus,
				normalizedStatus,
				currentStatus: order.status,
				normalizedStatusLength: normalizedStatus.length,
				normalizedStatusCharCodes: normalizedStatus.split('').map(c => c.charCodeAt(0))
			});

			const { data, error } = await supabase
				.from('orders')
				.update({ 
					status: normalizedStatus.trim(), // Asegurar que no haya espacios extra
					updated_at: new Date().toISOString(),
				})
				.eq('id', orderDbId)
				.select();

			if (error) {
				logger.error('Error actualizando estado del pedido:', error);
				throw error;
			}

			logger.log('Estado actualizado exitosamente:', data);

			// Insertar en historial
			const { error: historyError } = await supabase
				.from('order_status_history')
				.insert({
					order_id: orderDbId,
					status: normalizedStatus,
					driver_id: driverId,
				});

			if (historyError) {
				logger.warn('Error insertando en historial (no crítico):', historyError);
			}

			if (onReloadOrders) {
				await onReloadOrders();
			}
			toast.success('Estado actualizado exitosamente');
		} catch (err) {
			logger.error('Error al actualizar estado:', err);
			const errorMessage = err.message || err.details || 'Error desconocido al actualizar estado';
			toast.error('Error al actualizar estado: ' + errorMessage);
		}
	};

	/**
	 * ✅ IMPORTANTE: quitamos el polling (antes lo tenías a 1 segundo)
	 * Con realtime, esto NO VA.
	 * (Si en algún momento quieres fallback, se hace cada 30-60s, no cada 1s)
	 */

	// ---- Auto-revert de pedidos "Asignado" por timeout (más liviano) ----
	// Nota profesional: esto idealmente va en servidor (trigger/cron), pero te lo dejo optimizado en cliente.
	const revertingRef = useRef(false);

	useEffect(() => {
		if (!orders?.length) return;

		const interval = setInterval(async () => {
			if (revertingRef.current) return;
			revertingRef.current = true;

			try {
				const now = Date.now();
				const oneMinuteAgo = now - 60_000;

				const ordersToRevert = orders.filter(order => {
					if (order.status !== 'Asignado') return false;
					const updated = new Date(order.updatedAt).getTime();
					return Number.isFinite(updated) && updated < oneMinuteAgo;
				});

				if (ordersToRevert.length === 0) return;

				for (const order of ordersToRevert) {
					try {
						await supabase
							.from('orders')
							.update({
								status: 'Pendiente',
								driver_id: null,
							})
							.eq('id', order._dbId);

						await supabase
							.from('order_status_history')
							.insert({
								order_id: order._dbId,
								status: 'Pendiente',
								driver_id: null,
								notes: 'Revertido automáticamente por timeout',
							});
					} catch (err) {
						logger.error('Error revirtiendo pedido:', err);
					}
				}

				// Si hay pedidos revertidos, cambiar a tab de disponibles
				if (ordersToRevert.length > 0) {
					setActiveTab('available');
				}

				// Refrescar (realtime lo traerá, pero por UX hacemos reload)
				if (onReloadOrders) {
					await onReloadOrders();
				}
			} finally {
				revertingRef.current = false;
			}
		}, 15_000); // ✅ antes era cada 1s (pesadísimo). Ahora 15s.

		return () => clearInterval(interval);
	}, [orders, onReloadOrders]);


	// Navegación desde HomeView
	const handleNavigate = (view) => {
		if (view === 'orders') {
			onViewChange('orders');
			setActiveTab('available');
		} else if (view === 'myOrders') {
			onViewChange('myOrders');
			setActiveTab('myOrders');
		} else if (view === 'completed') {
			onViewChange('completed');
		}
	};

	// Manejar cambio de tab desde bottom navigation
	const handleTabChange = (tab) => {
		if (tab === 'orders') {
			onViewChange('orders');
			setActiveTab('available');
		} else if (tab === 'myOrders') {
			onViewChange('orders');
			setActiveTab('myOrders');
		} else {
			onViewChange(tab);
		}
	};

	// Determinar qué mostrar según la vista activa
	const getCurrentView = () => {
		if (activeView === 'orders' && activeTab === 'myOrders') {
			return 'myOrders';
		}
		return activeView;
	};

	return (
		<div 
			className="driver-app-new"
			style={{
				background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
				minHeight: '100vh',
				paddingTop: '4.5rem',
				paddingBottom: '6rem',
				transition: 'background 0.3s ease',
			}}
		>
			{/* Header fijo */}
			<DriverHeader
				isConnected={isOnline}
				onToggleConnection={() => onOnlineChange && onOnlineChange(!isOnline)}
				driverName={finalDriverName}
				hasActiveOrders={myOrders.length > 0}
				onLogout={onLogout}
				onOpenSupportChat={() => setShowSupportChat(true)}
			/>

			{/* Contenido principal */}
			<main style={{ minHeight: 'calc(100vh - 6rem - 4.5rem)' }}>
				<motion.div
					key={activeView}
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: -20 }}
					transition={{ duration: 0.2 }}
				>
					{activeView === 'home' && (
						<HomeView
							userName={finalDriverName}
							isConnected={isOnline}
							onToggleConnection={() => onOnlineChange && onOnlineChange(!isOnline)}
							onNavigate={handleNavigate}
							availableCount={isOnline ? availableOrders.length : 0}
							myOrdersCount={myOrders.length}
							completedCount={completedOrders.length}
						/>
					)}

					{activeView === 'orders' && (
						activeTab === 'available' ? (
							<OrdersView
								orders={isOnline ? availableOrders : []}
								onAcceptOrder={handleAcceptOrder}
								onUpdateStatus={handleUpdateStatus}
								isOnline={isOnline}
								hasLocation={hasLocation}
								locationLoading={locationLoading}
								activeTab={activeTab}
								onTabChange={setActiveTab}
								myOrdersCount={myOrders.length}
							/>
						) : (
							<>
								<div className="orders-view-tabs">
									<button
										onClick={() => setActiveTab('available')}
										className={`orders-view-tab ${activeTab === 'available' ? 'orders-view-tab-active' : ''}`}
									>
										Pedidos Disponibles ({availableOrders.length})
									</button>
									<button
										onClick={() => setActiveTab('myOrders')}
										className={`orders-view-tab ${activeTab === 'myOrders' ? 'orders-view-tab-active' : ''}`}
									>
										Mis Pedidos ({myOrders.length})
									</button>
								</div>
								<MyOrdersView
									orders={myOrders}
									onUpdateStatus={handleUpdateStatus}
									selectedOrder={null}
									currentDriver={currentDriver}
								/>
							</>
						)
					)}

					{activeView === 'completed' && (
						<div className="driver-stats">
							<div className="driver-stats-grid">
								<div className="driver-stat-card">
									<div className="driver-stat-content">
										<div className="driver-stat-icon driver-stat-icon-green">
											<CheckCircle style={{ width: '1.25rem', height: '1.25rem' }} />
										</div>
										<p className="driver-stat-label">Total Completados</p>
										<p className="driver-stat-value">{completedOrders.length}</p>
									</div>
								</div>
							</div>

							{completedOrders.length > 0 ? (
								<OrderList
									orders={completedOrders}
								/>
							) : (
								<div className="driver-empty-state">
									<CheckCircle className="driver-empty-icon" />
									<p className="driver-empty-title">No hay pedidos completados</p>
									<p className="driver-empty-text">Los pedidos que completes aparecerán aquí</p>
								</div>
							)}
						</div>
					)}

					{activeView === 'profile' && (
						<DriverProfile 
							driverName={finalDriverName} 
							onNavigateToSettings={() => onViewChange('settings')}
						/>
					)}
					{activeView === 'wallet' && <DriverWallet orders={orders} onNavigateToCompleted={() => onViewChange('completed')} />}
					{activeView === 'settings' && <DriverSettings onLogout={onLogout} />}
				</motion.div>
			</main>

			{/* Bottom Navigation */}
			<BottomNavigation
				activeTab={getCurrentView()}
				onTabChange={handleTabChange}
				availableOrdersCount={availableOrders.length}
			/>

			{/* Modal de pedidos asignados (se abre desde burbuja flotante nativa) */}
			<AnimatePresence>
				{showOrdersModal && (
					<>
						<motion.div
							className="floating-button-overlay"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setShowOrdersModal(false)}
						/>
						<motion.div
							className="floating-button-panel"
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.8 }}
							transition={{ type: 'spring', stiffness: 300, damping: 25 }}
						>
							<div className="floating-button-panel-header">
								<h3 className="floating-button-panel-title">Mis Pedidos</h3>
								<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
									<span className="floating-button-panel-count">{myOrders.length}</span>
									<button
										onClick={() => setShowOrdersModal(false)}
										style={{
											background: 'rgba(255, 255, 255, 0.2)',
											border: 'none',
											borderRadius: '50%',
											width: '2rem',
											height: '2rem',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											cursor: 'pointer',
											color: 'white',
										}}
									>
										<X size={16} />
									</button>
								</div>
							</div>
							<div className="floating-button-panel-content">
								{myOrders.length === 0 ? (
									<div className="floating-button-panel-empty">
										<Package className="floating-button-panel-empty-icon" />
										<p className="floating-button-panel-empty-text">No tienes pedidos asignados</p>
									</div>
								) : (
									<div className="floating-button-panel-orders">
										{myOrders.map((order) => (
											<div key={order.id} className="floating-button-order-item">
												<OrderCard
													order={order}
													onClick={() => {
														onViewChange('orders');
														setActiveTab('myOrders');
														setShowOrdersModal(false);
													}}
													onAcceptOrder={handleAcceptOrder}
													onUpdateStatus={handleUpdateStatus}
													canAcceptOrder={myOrders.length < 2}
												/>
											</div>
										))}
									</div>
								)}
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>

			{/* Modal de chat de soporte */}
			{showSupportChat && currentDriver && (
				<Modal onClose={() => setShowSupportChat(false)} maxWidth="md">
					<SupportChat
						currentDriver={currentDriver}
						onClose={() => setShowSupportChat(false)}
					/>
				</Modal>
			)}
		</div>
	);
}
