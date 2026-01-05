import { useState, useMemo } from 'react';

/**
 * Hook para gestionar la lógica de gestión de clientes
 */
export function useClientManagement(clients, currentUser) {
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [editingClient, setEditingClient] = useState(null);

	// Filtrar clientes según el local del usuario
	const filteredClients = useMemo(() => {
		if (currentUser?.role === 'local' && currentUser.local) {
			return clients.filter(client => client.local === currentUser.local);
		}
		return clients;
	}, [clients, currentUser]);

	const handleEdit = (client) => {
		setEditingClient(client);
		setShowCreateForm(true);
	};

	const handleDelete = (clientId, onDeleteClient) => {
		// La confirmación se maneja en el componente padre (App.jsx)
		onDeleteClient(clientId);
	};

	const handleCreateSubmit = (clientData, onCreateClient, onUpdateClient) => {
		if (editingClient) {
			onUpdateClient(editingClient.id, clientData);
			setEditingClient(null);
		} else {
			onCreateClient(clientData);
		}
		setShowCreateForm(false);
	};

	const handleCreateFormClose = () => {
		setShowCreateForm(false);
		setEditingClient(null);
	};

	return {
		showCreateForm,
		editingClient,
		filteredClients,
		setShowCreateForm,
		handleEdit,
		handleDelete,
		handleCreateSubmit,
		handleCreateFormClose,
	};
}

