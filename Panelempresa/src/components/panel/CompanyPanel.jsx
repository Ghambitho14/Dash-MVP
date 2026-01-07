import { CreateOrderForm } from '../orders/CreateOrderForm';
import { ClientManagement } from '../clients/ClientManagement';
import { UserManagement } from '../users/UserManagement';
import { OrderList } from '../orders/OrderList';
import { OrderDetail } from '../orders/OrderDetail';
import { LocalSettings } from '../locals/LocalSettings';
import { TrackingPanel } from '../tracking/TrackingPanel';
import { MetricsPanel } from '../metrics/MetricsPanel';
import { AccountSettings } from '../settings/AccountSettings';
import { QuickActions } from '../ui/QuickActions';
import { Modal } from '../ui/Modal';
import { ChatHeaderButton } from '../orders/ChatHeaderButton';
import { useCompanyPanel } from '../../hooks/panel/useCompanyPanel';
import { useChatNotifications } from '../../hooks/orders/useChatNotifications';
import { isAdminOrEmpresarial, getRoleName, getInitials } from '../../utils/utils';
import { Package, Store, ChevronDown, Settings, LogOut, Search, Clock, Menu, X, Building2, Users, UserCog, Plus, Navigation, User, BarChart3 } from 'lucide-react';
import { logger } from '../../utils/logger';
import '../../styles/Components/CompanyPanel.css';
import '../../styles/Components/SettingsModal.css';

export function CompanyPanel({ currentUser, orders, setOrders, onReloadOrders, localConfigs, setLocalConfigs, clients, onCreateClient, onUpdateClient, onDeleteClient, users, onCreateUser, onUpdateUser, onDeleteUser, onCreateOrder, onDeleteOrder, onSaveLocalConfigs, onLogout, onUpdateCurrentUser }) {
	// Hook para notificaciones de chat
	useChatNotifications(orders, currentUser);

	const {
		selectedOrder,
		showCreateForm,
		showClientManagement,
		showUserManagement,
		showLocalSettings,
		showSettingsModal,
		showAccountSettings,
		activeTab,
		selectedLocal,
		showLocalDropdown,
		sidebarOpen,
		showTrackingPanel,
		showMetricsPanel,
		userFilteredOrders,
		filteredOrders,
		locales,
		setSelectedOrder,
		setShowCreateForm,
		setShowClientManagement,
		setShowUserManagement,
		setShowLocalSettings,
		setShowSettingsModal,
		setShowAccountSettings,
		setActiveTab,
		setSelectedLocal,
		setShowLocalDropdown,
		setSidebarOpen,
		setShowTrackingPanel,
		setShowMetricsPanel,
		handleCreateOrder,
		handleDeleteOrder,
		handleSaveLocalConfigs,
	} = useCompanyPanel(currentUser, orders, setOrders, localConfigs, setLocalConfigs, onCreateOrder, onDeleteOrder, onSaveLocalConfigs);

	const handleCreateOrderWrapper = (orderData) => handleCreateOrder(orderData, clients);
	const handleDeleteOrderWrapper = handleDeleteOrder;
	const handleSaveLocalConfigsWrapper = handleSaveLocalConfigs;

	return (
		<div className="panel-empresa">
			{/* Header Superior - Diseño Figma */}
			<header className="delivery-header encabezado-superior-empresa">
				<div className="delivery-header-left encabezado-superior-empresa-izquierda">
					{/* Botón Hamburguesa - Solo móvil */}
					<button
						className="boton-hamburguesa-empresa"
						onClick={() => setSidebarOpen(!sidebarOpen)}
						aria-label="Abrir menú"
					>
						<Menu />
					</button>
					
					<div className="delivery-logo logo-empresa">
						<div className="delivery-logo-icon logo-icono-empresa">
							<Package />
						</div>
						<span className="delivery-logo-text">{currentUser.companyName || 'DeliveryApp'}</span>
					</div>
					
					<div className="delivery-header-divider divisor-encabezado-empresa" />
					
					{isAdminOrEmpresarial(currentUser.role) && (
						<div className="delivery-local-selector selector-local-encabezado-empresa">
							<button
								className="delivery-local-button boton-local-encabezado-empresa"
								onClick={() => setShowLocalDropdown(!showLocalDropdown)}
							>
								<Store />
								<span>{selectedLocal}</span>
								<ChevronDown style={{ 
									transform: showLocalDropdown ? 'rotate(180deg)' : 'rotate(0)',
									transition: 'transform 0.2s'
								}} />
							</button>
							
							{showLocalDropdown && (
								<div className="delivery-local-dropdown menu-local-encabezado-empresa">
									{locales.map((local) => (
										<button
											key={local}
											className={`delivery-local-option opcion-local-encabezado-empresa ${selectedLocal === local ? 'active activa' : ''}`}
											onClick={() => {
												setSelectedLocal(local);
												setShowLocalDropdown(false);
											}}
										>
											<Store size={16} />
											{local}
										</button>
									))}
								</div>
							)}
						</div>
					)}
					
					{currentUser.role === 'local' && currentUser.local && (
						<div className="delivery-local-selector selector-local-encabezado-empresa">
							<div className="delivery-local-button boton-local-encabezado-empresa boton-local-encabezado-empresa-solo-lectura">
								<Store />
								<span>{currentUser.local}</span>
							</div>
						</div>
					)}
				</div>
				
				<div className="delivery-header-right encabezado-superior-empresa-derecha">
					<div className="delivery-user-info info-usuario-encabezado-empresa">
						<div className="delivery-user-avatar avatar-usuario-encabezado-empresa">
							{getInitials(currentUser.name)}
						</div>
						<div className="delivery-user-details detalles-usuario-encabezado-empresa">
							<div className="delivery-user-name nombre-usuario-encabezado-empresa">{currentUser.name}</div>
							<div className="delivery-user-role rol-usuario-encabezado-empresa">
								{getRoleName(currentUser.role)}
								{currentUser.role === 'local' && currentUser.local && (
									<span className="local-usuario-encabezado-empresa"> • {currentUser.local}</span>
								)}
							</div>
						</div>
					</div>
					
					{/* Botón de Chat */}
					<ChatHeaderButton orders={userFilteredOrders} currentUser={currentUser} />
					
					{isAdminOrEmpresarial(currentUser.role) && (
						<button 
							className="delivery-header-button boton-encabezado-empresa" 
							title="Configuración"
							onClick={() => setShowSettingsModal(true)}
						>
							<Settings />
						</button>
					)}
					
					<button 
						className="delivery-header-button boton-encabezado-empresa" 
						onClick={onLogout}
						title="Salir"
					>
						<LogOut />
					</button>
				</div>
			</header>

			{/* Overlay para móvil */}
			{sidebarOpen && (
				<div 
					className="superposicion-empresa"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			{/* Container */}
			<div className="contenedor-empresa">
				{/* Sidebar - Diseño Figma: QuickActions + StatsGrid */}
				<aside className={`barra-lateral-empresa ${sidebarOpen ? 'barra-lateral-empresa-abierta' : ''}`}>
					{/* Botón Cerrar - Solo móvil */}
					<button
						className="cerrar-barra-lateral-empresa"
						onClick={() => setSidebarOpen(false)}
						aria-label="Cerrar menú"
					>
						<X />
					</button>
					
					{/* Selector de Local - Solo móvil y solo para admin/empresarial */}
					{isAdminOrEmpresarial(currentUser.role) && (
						<div className="selector-local-sidebar-mobile">
							<label className="selector-local-sidebar-mobile-label">Seleccionar Local</label>
							<div className="selector-local-sidebar-mobile-dropdown">
								<button
									className="boton-local-sidebar-mobile"
									onClick={() => setShowLocalDropdown(!showLocalDropdown)}
								>
									<Store />
									<span>{selectedLocal}</span>
									<ChevronDown style={{ 
										transform: showLocalDropdown ? 'rotate(180deg)' : 'rotate(0)',
										transition: 'transform 0.2s'
									}} />
								</button>
								
								{showLocalDropdown && (
									<div className="menu-local-sidebar-mobile">
										{locales.map((local) => (
											<button
												key={local}
												className={`opcion-local-sidebar-mobile ${selectedLocal === local ? 'activa' : ''}`}
												onClick={() => {
													setSelectedLocal(local);
													setShowLocalDropdown(false);
												}}
											>
												<Store size={16} />
												{local}
											</button>
										))}
									</div>
								)}
							</div>
						</div>
					)}
					
					{/* Quick Actions */}
					<QuickActions
						isAdmin={isAdminOrEmpresarial(currentUser.role)}
						onCreateOrder={() => setShowCreateForm(true)}
						onShowClients={() => setShowClientManagement(true)}
						onShowUsers={() => setShowUserManagement(true)}
						onShowSettings={() => setShowSettingsModal(true)}
					/>

					{/* Botón Ir a Métricas */}
					<button
						className="delivery-metrics-button"
						onClick={() => {
							setShowMetricsPanel(true);
							setShowTrackingPanel(false);
							setActiveTab(null);
						}}
						title="Ver métricas y estadísticas"
					>
						<BarChart3 size={20} />
						<span>Ir a métricas</span>
					</button>
				</aside>

				{/* Main Content - Diseño Figma */}
				<main className="delivery-main">
					{/* Header del Main */}
					<div className="delivery-main-header">
						<div className="delivery-main-title-row">
							<h2 className="delivery-main-title">
								{showMetricsPanel ? 'Métricas y Estadísticas' : 'Panel de Pedidos'}
							</h2>
							
							{!showTrackingPanel && !showMetricsPanel && (
								<div className="delivery-search-bar">
									<Search className="delivery-search-icon" />
									<input
										type="text"
										className="delivery-search-input"
										placeholder="Buscar pedidos..."
									/>
								</div>
							)}
						</div>

						{/* Tabs */}
						{!showMetricsPanel && (
							<div className="delivery-tabs">
								<button
									onClick={() => {
										setActiveTab('active');
										setShowTrackingPanel(false);
										setShowMetricsPanel(false);
									}}
									className={`delivery-tab ${activeTab === 'active' && !showTrackingPanel && !showMetricsPanel ? 'active' : ''}`}
								>
									Activos ({userFilteredOrders.filter(o => o.status !== 'Entregado').length})
								</button>
								<button
									onClick={() => {
										setActiveTab('completed');
										setShowTrackingPanel(false);
										setShowMetricsPanel(false);
									}}
									className={`delivery-tab ${activeTab === 'completed' && !showTrackingPanel && !showMetricsPanel ? 'active' : ''}`}
								>
									Completados ({userFilteredOrders.filter(o => o.status === 'Entregado').length})
								</button>
								<button
									onClick={() => {
										setShowTrackingPanel(true);
										setShowMetricsPanel(false);
										setActiveTab(null);
									}}
									className={`delivery-tab ${showTrackingPanel ? 'active' : ''}`}
								>
									<Navigation style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
									Trackeo
								</button>
							</div>
						)}
					</div>

					{/* Orders List, Panel de Trackeo o Panel de Métricas */}
					{showMetricsPanel ? (
						<div className="delivery-orders-container">
							<MetricsPanel 
								orders={userFilteredOrders}
								currentUser={currentUser}
								localConfigs={localConfigs}
								onClose={() => {
									setShowMetricsPanel(false);
									setActiveTab('active');
								}}
							/>
						</div>
					) : showTrackingPanel ? (
						<div className="delivery-orders-container">
							<TrackingPanel 
								orders={userFilteredOrders.filter(order => order.status !== 'Entregado')}
								onSelectOrder={setSelectedOrder}
							/>
						</div>
					) : (
						<div className="delivery-orders-container">
							{filteredOrders.length === 0 ? (
								<div className="delivery-empty-state">
									<Package size={64} />
									<h3>No hay pedidos</h3>
									<p>Los pedidos aparecerán aquí cuando se creen</p>
								</div>
							) : (
								<div className="delivery-orders-grid">
									<OrderList 
										orders={filteredOrders} 
										onSelectOrder={setSelectedOrder}
										onDeleteOrder={handleDeleteOrderWrapper}
										currentUser={currentUser}
									/>
								</div>
							)}
						</div>
					)}
				</main>
			</div>

			{/* Modals */}
			{showCreateForm && (
				<Modal onClose={() => setShowCreateForm(false)} maxWidth="2xl">
					<CreateOrderForm
						onSubmit={handleCreateOrderWrapper}
						onCancel={() => setShowCreateForm(false)}
						currentUser={currentUser}
						localConfigs={localConfigs}
						clients={clients}
					/>
				</Modal>
			)}

			{showClientManagement && (
				<ClientManagement
					clients={clients}
					currentUser={currentUser}
					localConfigs={localConfigs}
					onCreateClient={onCreateClient}
					onUpdateClient={onUpdateClient}
					onDeleteClient={onDeleteClient}
					onClose={() => setShowClientManagement(false)}
				/>
			)}

			{selectedOrder && (
				<Modal onClose={() => setSelectedOrder(null)} maxWidth="2xl">
					<OrderDetail 
						order={selectedOrder} 
						onClose={() => setSelectedOrder(null)}
						currentUser={currentUser}
					/>
				</Modal>
			)}

			{showUserManagement && (
				<UserManagement
					users={users}
					onCreateUser={onCreateUser}
					onUpdateUser={onUpdateUser}
					onDeleteUser={onDeleteUser}
					onClose={() => setShowUserManagement(false)}
					localConfigs={localConfigs}
					currentUser={currentUser}
				/>
			)}

			{showSettingsModal && (
				<Modal onClose={() => setShowSettingsModal(false)} maxWidth="md">
					<div className="modal-configuracion">
						<h2 className="modal-configuracion-titulo">Configuración</h2>
						<div className="modal-configuracion-grid">
							{isAdminOrEmpresarial(currentUser.role) && (
								<button
									className="modal-configuracion-item"
									onClick={() => {
										setShowSettingsModal(false);
										setShowAccountSettings(true);
									}}
								>
									<div className="modal-configuracion-icono modal-configuracion-icono-orange">
										<User />
									</div>
									<div className="modal-configuracion-contenido">
										<h3 className="modal-configuracion-nombre">Mi Cuenta</h3>
										<p className="modal-configuracion-descripcion">Configurar nombre, contraseña y foto de perfil</p>
									</div>
								</button>
							)}

							<button
								className="modal-configuracion-item"
								onClick={() => {
									setShowSettingsModal(false);
									setShowLocalSettings(true);
								}}
							>
								<div className="modal-configuracion-icono modal-configuracion-icono-blue">
									<Building2 />
								</div>
								<div className="modal-configuracion-contenido">
									<h3 className="modal-configuracion-nombre">Locales</h3>
									<p className="modal-configuracion-descripcion">Gestionar locales y sucursales</p>
								</div>
							</button>

							<button
								className="modal-configuracion-item"
								onClick={() => {
									setShowSettingsModal(false);
									setShowUserManagement(true);
								}}
							>
								<div className="modal-configuracion-icono modal-configuracion-icono-purple">
									<UserCog />
								</div>
								<div className="modal-configuracion-contenido">
									<h3 className="modal-configuracion-nombre">Usuarios</h3>
									<p className="modal-configuracion-descripcion">Gestionar usuarios empresariales</p>
								</div>
							</button>

							<button
								className="modal-configuracion-item"
								onClick={() => {
									setShowSettingsModal(false);
									setShowClientManagement(true);
								}}
							>
								<div className="modal-configuracion-icono modal-configuracion-icono-green">
									<Users />
								</div>
								<div className="modal-configuracion-contenido">
									<h3 className="modal-configuracion-nombre">Clientes</h3>
									<p className="modal-configuracion-descripcion">Gestionar clientes</p>
								</div>
							</button>
						</div>
					</div>
				</Modal>
			)}

			{showLocalSettings && (
				<Modal onClose={() => setShowLocalSettings(false)} maxWidth="xl">
					<LocalSettings
						onClose={() => setShowLocalSettings(false)}
						onSave={handleSaveLocalConfigsWrapper}
						initialLocals={localConfigs}
					/>
				</Modal>
			)}

			{showAccountSettings && (
				<Modal onClose={() => setShowAccountSettings(false)} maxWidth="md">
					<AccountSettings
						currentUser={currentUser}
						onClose={() => setShowAccountSettings(false)}
						onUpdateUser={onUpdateCurrentUser}
					/>
				</Modal>
			)}


		</div>
	);
}

