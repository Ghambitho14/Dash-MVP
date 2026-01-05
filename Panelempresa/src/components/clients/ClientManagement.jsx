import { CreateClientForm } from './CreateClientForm';
import { useClientManagement } from '../../hooks/clients/useClientManagement';
import { X, User as UserIcon, Plus, Edit2, Trash2, Phone, MapPin, Store } from 'lucide-react';
import '../../styles/Components/ClientManagement.css';

export function ClientManagement({ clients, currentUser, localConfigs, onCreateClient, onUpdateClient, onDeleteClient, onClose }) {
	const {
		showCreateForm,
		editingClient,
		filteredClients,
		setShowCreateForm,
		handleEdit,
		handleDelete: handleDeleteWrapper,
		handleCreateSubmit: handleCreateSubmitWrapper,
		handleCreateFormClose,
	} = useClientManagement(clients, currentUser);

	const handleDelete = (clientId) => {
		handleDeleteWrapper(clientId, onDeleteClient);
	};

	const handleCreateSubmit = (clientData) => {
		handleCreateSubmitWrapper(clientData, onCreateClient, onUpdateClient);
	};

	return (
		<>
			<div className="gestion-clientes-overlay" onClick={onClose}>
				<div className="gestion-clientes-content" onClick={(e) => e.stopPropagation()}>
					{/* Header */}
					<div className="gestion-clientes-header">
						<div className="gestion-clientes-header-content">
							<div className="gestion-clientes-header-icon">
								<UserIcon />
							</div>
							<div>
								<h2 className="gestion-clientes-title">Configurar Clientes</h2>
								<p className="gestion-clientes-subtitle">Gestiona tu lista de clientes</p>
							</div>
						</div>
						<button
							onClick={onClose}
							className="gestion-clientes-close"
							aria-label="Cerrar"
						>
							<X />
						</button>
					</div>

					{/* Actions */}
					<div className="gestion-clientes-actions">
						<button
							onClick={() => setShowCreateForm(true)}
							className="gestion-clientes-button gestion-clientes-button-add"
						>
							<Plus />
							Agregar Cliente
						</button>
					</div>

					{/* Clients List */}
					<div className="gestion-clientes-list">
						{filteredClients.length === 0 ? (
							<div className="gestion-clientes-empty">
								<UserIcon className="gestion-clientes-empty-icon" />
								<p className="gestion-clientes-empty-text">No hay clientes registrados</p>
								<p className="gestion-clientes-empty-subtext">
									{currentUser.role === 'local' 
										? `No hay clientes asignados a ${currentUser.local}`
										: 'Agrega tu primer cliente para comenzar'}
								</p>
							</div>
						) : (
							filteredClients.map((client) => (
								<div key={client.id} className="gestion-clientes-item">
									<div className="gestion-clientes-item-content">
									<div className="gestion-clientes-item-avatar">
										<UserIcon />
									</div>
									<div className="gestion-clientes-item-info">
										<h3 className="gestion-clientes-item-name">{client.name}</h3>
										<div className="gestion-clientes-item-details">
											<div className="gestion-clientes-item-detail">
												<Phone />
												<span>{client.phone}</span>
											</div>
											<div className="gestion-clientes-item-detail">
												<MapPin />
												<span>{client.address}</span>
											</div>
											<div className="gestion-clientes-item-detail">
												<Store />
												<span>{client.local}</span>
											</div>
										</div>
									</div>
									</div>
									<div className="gestion-clientes-item-actions">
										<button
											onClick={() => handleEdit(client)}
											className="gestion-clientes-item-button gestion-clientes-item-button-edit"
											title="Editar cliente"
										>
											<Edit2 />
										</button>
										<button
											onClick={() => handleDelete(client.id)}
											className="gestion-clientes-item-button gestion-clientes-item-button-delete"
											title="Eliminar cliente"
										>
											<Trash2 />
										</button>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>

			{/* Create/Edit Form */}
			{showCreateForm && (
				<CreateClientForm
					onSubmit={handleCreateSubmit}
					onClose={handleCreateFormClose}
					currentUser={currentUser}
					localConfigs={localConfigs}
					initialData={editingClient ? {
						name: editingClient.name,
						phone: editingClient.phone,
						address: editingClient.address,
						local: editingClient.local,
					} : undefined}
				/>
			)}
		</>
	);
}

