import { useState } from 'react';

/**
 * Hook para gestionar la lógica de gestión de usuarios
 */
export function useUserManagement(currentUser) {
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [editingUser, setEditingUser] = useState(null);

	const handleEdit = (user) => {
		// Prevenir que admin edite CEO
		if (currentUser?.role === 'admin' && user.role === 'empresarial') {
			throw new Error('No puedes editar el usuario CEO. Solo el CEO puede modificar su propia cuenta.');
		}
		setEditingUser(user);
		setShowCreateForm(true);
	};

	const handleDelete = (userId, userRole, onDeleteUser) => {
		if (userRole === 'empresarial') {
			throw new Error('No se puede eliminar el usuario CEO. Este usuario es esencial para el sistema.');
		}
		// La confirmación se maneja en el componente padre (App.jsx)
		onDeleteUser(userId);
	};

	const handleCreateSubmit = (userData, onCreateUser, onUpdateUser) => {
		if (editingUser) {
			onUpdateUser(editingUser.id, userData);
			setEditingUser(null);
		} else {
			onCreateUser(userData);
		}
		setShowCreateForm(false);
	};

	const handleCreateFormClose = () => {
		setShowCreateForm(false);
		setEditingUser(null);
	};

	const handleAddNew = () => {
		setEditingUser(null);
		setShowCreateForm(true);
	};

	return {
		showCreateForm,
		editingUser,
		setShowCreateForm,
		handleEdit,
		handleDelete,
		handleCreateSubmit,
		handleCreateFormClose,
		handleAddNew,
	};
}

