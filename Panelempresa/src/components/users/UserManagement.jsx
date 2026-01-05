import { CreateUserForm } from './CreateUserForm';
import { useUserManagement } from '../../hooks/users/useUserManagement';
import { useToast } from '../../hooks/ui/useToast';
import { X, User as UserIcon, Plus, Edit2, Trash2, Shield, Store, Crown } from 'lucide-react';
import { getRoleName } from '../../utils/utils';
import '../../styles/Components/UserManagement.css';

export function UserManagement({ users, onCreateUser, onUpdateUser, onDeleteUser, onClose, localConfigs, currentUser }) {
	const {
		showCreateForm,
		editingUser,
		handleEdit: handleEditWrapper,
		handleDelete: handleDeleteWrapper,
		handleCreateSubmit: handleCreateSubmitWrapper,
		handleCreateFormClose,
		handleAddNew,
	} = useUserManagement(currentUser);
	const { showError } = useToast();

	const handleEdit = (user) => {
		try {
			handleEditWrapper(user);
		} catch (err) {
			showError(err.message);
		}
	};

	const handleDelete = (userId, userRole) => {
		try {
			handleDeleteWrapper(userId, userRole, onDeleteUser);
		} catch (err) {
			showError(err.message);
		}
	};

	const handleCreateSubmit = (userData) => {
		handleCreateSubmitWrapper(userData, onCreateUser, onUpdateUser);
	};

	return (
		<>
			<div className={`gestion-usuarios-overlay ${showCreateForm ? 'gestion-usuarios-overlay-hidden' : ''}`} onClick={onClose}>
				<div className="gestion-usuarios-content" onClick={(e) => e.stopPropagation()}>
					<div className="gestion-usuarios-header">
						<div className="gestion-usuarios-header-content">
							<div className="gestion-usuarios-header-icon">
								<UserIcon />
							</div>
							<div>
								<h2 className="gestion-usuarios-title">Gestionar Usuarios</h2>
								<p className="gestion-usuarios-subtitle">Crea y administra usuarios del sistema</p>
							</div>
						</div>
						<button
							onClick={onClose}
							className="gestion-usuarios-close"
							aria-label="Cerrar"
						>
							<X />
						</button>
					</div>

					<div className="gestion-usuarios-actions">
						<button
							onClick={handleAddNew}
							className="gestion-usuarios-button gestion-usuarios-button-primary"
						>
							<Plus />
							Agregar Nuevo Usuario
						</button>
					</div>

					<div className="gestion-usuarios-list">
						{users.length === 0 ? (
							<div className="gestion-usuarios-empty">
								<UserIcon className="gestion-usuarios-empty-icon" />
								<p className="gestion-usuarios-empty-title">No hay usuarios registrados</p>
								<p className="gestion-usuarios-empty-text">
									Haz clic en "Agregar Nuevo Usuario" para empezar.
								</p>
							</div>
						) : (
							users.map((user) => (
								<div key={user.id} className="gestion-usuarios-item">
									<div className="gestion-usuarios-item-info">
										<div className="gestion-usuarios-item-icon">
											{user.role === 'empresarial' ? <Crown /> : user.role === 'admin' ? <Shield /> : <Store />}
										</div>
										<div className="gestion-usuarios-item-details">
											<p className="gestion-usuarios-item-name">{user.name}</p>
											<p className="gestion-usuarios-item-username">@{user.username}</p>
											{user.role === 'local' && user.local && (
												<p className="gestion-usuarios-item-local">Local: {user.local}</p>
											)}
											<div className="gestion-usuarios-item-badges">
												<span className={`gestion-usuarios-item-badge gestion-usuarios-item-badge-${user.role}`}>
													{getRoleName(user.role)}
												</span>
												{user.local && (
													<span className="gestion-usuarios-item-badge gestion-usuarios-item-badge-local">
														<Store size={12} />
														{user.local}
													</span>
												)}
											</div>
										</div>
									</div>
									<div className="gestion-usuarios-item-actions">
										{!(currentUser.role === 'admin' && user.role === 'empresarial') && (
											<button
												onClick={() => handleEdit(user)}
												className="gestion-usuarios-item-button gestion-usuarios-item-button-edit"
												title="Editar usuario"
											>
												<Edit2 size={16} />
											</button>
										)}
										{user.role !== 'empresarial' && (
											<button
												onClick={() => handleDelete(user.id, user.role)}
												className="gestion-usuarios-item-button gestion-usuarios-item-button-delete"
												title="Eliminar usuario"
											>
												<Trash2 size={16} />
											</button>
										)}
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>

			{showCreateForm && (
				<CreateUserForm
					onSubmit={handleCreateSubmit}
					onClose={handleCreateFormClose}
					localConfigs={localConfigs}
					existingUsers={users}
					initialData={editingUser ? {
						id: editingUser.id,
						username: editingUser.username,
						name: editingUser.name,
						role: editingUser.role,
						local: editingUser.local,
					} : undefined}
				/>
			)}
		</>
	);
}

