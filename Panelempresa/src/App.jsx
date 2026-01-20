import { Toaster } from 'react-hot-toast';
import { CompanyPanel } from './components/panel/CompanyPanel';
import { Login } from './components/auth/Login';
import { ConfirmModal } from './components/ui/ConfirmModal';
import { useAuth } from './hooks/auth/useAuth';
import { useOrders } from './hooks/orders/useOrders';
import { useClients } from './hooks/clients/useClients';
import { useUsers } from './hooks/users/useUsers';
import { useLocals } from './hooks/locals/useLocals';
import { useToast } from './hooks/ui/useToast';
import { useConfirm } from './hooks/ui/useConfirm';

export default function App() {
	// ✅ TODOS LOS HOOKS DEBEN LLAMARSE SIEMPRE (antes de cualquier early return)
	const { currentUser, login, logout, updateUser: updateCurrentUser } = useAuth();
	const { localConfigs, setLocalConfigs, saveLocalConfigs } = useLocals(currentUser);
	const { clients, createClient, updateClient, deleteClient, reloadClients } = useClients(currentUser, localConfigs);
	const { users, createUser, updateUser, deleteUser } = useUsers(currentUser, localConfigs);
	const { orders, setOrders, createOrder, deleteOrder, reloadOrders } = useOrders(currentUser);
	const { showSuccess, showError } = useToast();
	const { confirm, isOpen, config, onConfirm, onCancel } = useConfirm();

	// Wrappers para manejar errores y confirmaciones
	const handleCreateClient = async (clientData) => {
		try {
			await createClient(clientData);
			showSuccess('Cliente creado exitosamente');
		} catch (err) {
			showError('Error al crear cliente: ' + err.message);
		}
	};

	const handleUpdateClient = async (clientId, clientData) => {
		try {
			await updateClient(clientId, clientData);
			showSuccess('Cliente actualizado exitosamente');
		} catch (err) {
			showError('Error al actualizar cliente: ' + err.message);
		}
	};

	const handleDeleteClient = async (clientId) => {
		const confirmed = await confirm({
			title: 'Eliminar Cliente',
			message: '¿Estás seguro de que deseas eliminar este cliente?',
			confirmText: 'Eliminar',
			cancelText: 'Cancelar',
			type: 'danger',
		});

		if (!confirmed) return;

		try {
			await deleteClient(clientId);
			showSuccess('Cliente eliminado exitosamente');
		} catch (err) {
			showError('Error al eliminar cliente: ' + err.message);
		}
	};

	const handleCreateUser = async (userData) => {
		try {
			await createUser(userData);
			showSuccess('Usuario creado exitosamente');
		} catch (err) {
			showError('Error al crear usuario: ' + err.message);
		}
	};

	const handleUpdateUser = async (userId, userData) => {
		try {
			await updateUser(userId, userData);
			showSuccess('Usuario actualizado exitosamente');
		} catch (err) {
			showError('Error al actualizar usuario: ' + err.message);
		}
	};

	const handleDeleteUser = async (userId) => {
		const confirmed = await confirm({
			title: 'Eliminar Usuario',
			message: '¿Estás seguro de que deseas eliminar este usuario?',
			confirmText: 'Eliminar',
			cancelText: 'Cancelar',
			type: 'danger',
		});

		if (!confirmed) return;

		try {
			await deleteUser(userId);
			showSuccess('Usuario eliminado exitosamente');
		} catch (err) {
			showError('Error al eliminar usuario: ' + err.message);
		}
	};

	// Wrappers para manejar errores y confirmaciones de pedidos
	const handleCreateOrder = async (orderData, clients, localConfigs) => {
		try {
			await createOrder(orderData, clients, localConfigs);
			// Recargar clientes por si se creó uno nuevo durante la creación del pedido
			await reloadClients();
			showSuccess('Pedido creado exitosamente');
		} catch (err) {
			showError('Error al crear pedido: ' + err.message);
			throw err;
		}
	};

	const handleDeleteOrder = async (orderId) => {
		const confirmed = await confirm({
			title: 'Eliminar Pedido',
			message: '¿Estás seguro de que deseas eliminar este pedido?',
			confirmText: 'Eliminar',
			cancelText: 'Cancelar',
			type: 'danger',
		});

		if (!confirmed) return;

		try {
			await deleteOrder(orderId);
			showSuccess('Pedido eliminado exitosamente');
		} catch (err) {
			showError('Error al eliminar pedido: ' + err.message);
			throw err;
		}
	};

	const handleSaveLocalConfigs = async (configs) => {
		try {
			await saveLocalConfigs(configs);
			showSuccess('Locales guardados exitosamente');
		} catch (err) {
			showError('Error al guardar locales: ' + err.message);
			throw err;
		}
	};

	// Si no hay usuario logueado, mostrar login
	if (!currentUser) {
		return <Login onLogin={login} />;
	}

	// Solo vista de empresa
	return (
		<>
			<Toaster />
			<ConfirmModal
				isOpen={isOpen}
				onClose={onCancel}
				onConfirm={onConfirm}
				title={config?.title || 'Confirmar'}
				message={config?.message || ''}
				confirmText={config?.confirmText || 'Confirmar'}
				cancelText={config?.cancelText || 'Cancelar'}
				type={config?.type || 'danger'}
			/>
			<CompanyPanel 
				currentUser={currentUser} 
				orders={orders} 
				setOrders={setOrders}
				onReloadOrders={reloadOrders}
				localConfigs={localConfigs}
				setLocalConfigs={setLocalConfigs}
				clients={clients}
				onCreateClient={handleCreateClient}
				onUpdateClient={handleUpdateClient}
				onDeleteClient={handleDeleteClient}
				users={users}
				onCreateUser={handleCreateUser}
				onUpdateUser={handleUpdateUser}
				onDeleteUser={handleDeleteUser}
				onCreateOrder={handleCreateOrder}
				onDeleteOrder={handleDeleteOrder}
				onSaveLocalConfigs={handleSaveLocalConfigs}
				onLogout={logout}
				onUpdateCurrentUser={updateCurrentUser}
			/>
		</>
	);
}

