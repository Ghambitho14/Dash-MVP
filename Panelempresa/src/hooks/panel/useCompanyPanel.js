import { useState, useEffect, useMemo } from 'react';
import { isAdminOrEmpresarial } from '../../utils/utils';

/**
 * Hook para gestionar la lógica del panel de empresa
 */
export function useCompanyPanel(currentUser, orders, setOrders, localConfigs, setLocalConfigs, onCreateOrder, onDeleteOrder, onSaveLocalConfigs) {
	const [selectedOrder, setSelectedOrder] = useState(null);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [showClientManagement, setShowClientManagement] = useState(false);
	const [showUserManagement, setShowUserManagement] = useState(false);
	const [showLocalSettings, setShowLocalSettings] = useState(false);
	const [showSettingsModal, setShowSettingsModal] = useState(false);
	const [showAccountSettings, setShowAccountSettings] = useState(false);
	const [activeTab, setActiveTab] = useState('active');
	const [selectedLocal, setSelectedLocal] = useState('Todos');
	const [showLocalDropdown, setShowLocalDropdown] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [showTrackingPanel, setShowTrackingPanel] = useState(false);

	useEffect(() => {
		// Si es usuario local, establecer automáticamente su local
		if (currentUser?.role === 'local' && currentUser.local) {
			setSelectedLocal(currentUser.local);
		}
	}, [currentUser]);

	const handleCreateOrder = async (orderData, clients) => {
		try {
			await onCreateOrder(orderData, clients, localConfigs);
			setShowCreateForm(false);
		} catch (err) {
			throw err;
		}
	};

	const handleDeleteOrder = async (orderId) => {
		try {
			await onDeleteOrder(orderId);
			if (selectedOrder?.id === orderId) {
				setSelectedOrder(null);
			}
		} catch (err) {
			throw err;
		}
	};

	const handleSaveLocalConfigs = async (configs) => {
		try {
			await onSaveLocalConfigs(configs);
		} catch (err) {
			throw err;
		}
	};

	// Filtrar pedidos según el rol del usuario
	const userFilteredOrders = useMemo(() => {
		if (currentUser?.role === 'local' && currentUser.local) {
			return orders.filter(order => order.local === currentUser.local);
		}
		return orders;
	}, [orders, currentUser]);

	// Filtrar pedidos por estado y local
	const filteredOrders = useMemo(() => {
		let result = userFilteredOrders;

		// Filtrar por estado
		if (activeTab === 'active') {
			result = result.filter(order => order.status !== 'Entregado');
		} else if (activeTab === 'completed') {
			result = result.filter(order => order.status === 'Entregado');
		}

		// Filtrar por local (solo para admin y CEO)
		if (isAdminOrEmpresarial(currentUser?.role)) {
			if (selectedLocal !== 'Todos') {
				result = result.filter(order => order.local === selectedLocal);
			}
		}

		return result;
	}, [userFilteredOrders, activeTab, selectedLocal, currentUser?.role]);

	const locales = ['Todos', ...localConfigs.map(config => config.name)];

	return {
		// Estado
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
		// Datos calculados
		userFilteredOrders,
		filteredOrders,
		locales,
		// Acciones
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
		handleCreateOrder,
		handleDeleteOrder,
		handleSaveLocalConfigs,
	};
}

