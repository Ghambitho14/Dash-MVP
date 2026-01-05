import { X, MapPin, Navigation, DollarSign, FileText, Store, User as UserIcon, Package } from 'lucide-react';
import { useCreateOrderForm } from '../../hooks/orders/useCreateOrderForm';
import '../../styles/Components/CreateOrderForm.css';

export function CreateOrderForm({ onSubmit, onCancel, currentUser, localConfigs, clients }) {
	const {
		formData,
		showClientDropdown,
		filteredClients,
		isLocal,
		availableLocales,
		isValid,
		gridClass,
		setFormData,
		setShowClientDropdown,
		handleSelectClient,
		handleClientNameChange,
		handleLocalChange,
		handleSubmit: handleFormSubmit,
	} = useCreateOrderForm(currentUser, localConfigs, clients);

	const handleSubmit = (e) => {
		const orderData = handleFormSubmit(e);
		if (orderData) {
			onSubmit(orderData);
		}
	};

	return (
		<div className="formulario-crear-pedido-container">
			<div className="formulario-crear-pedido-header">
				<div className="formulario-crear-pedido-header-left">
					<div className="formulario-crear-pedido-header-icon">
						<Package />
					</div>
					<div>
						<h2 className="formulario-crear-pedido-title">Crear Nuevo Pedido</h2>
						<p className="formulario-crear-pedido-subtitle">Completa los detalles del pedido</p>
					</div>
				</div>
				<button
					type="button"
					onClick={onCancel}
					className="formulario-crear-pedido-close"
					aria-label="Cerrar"
				>
					<X />
				</button>
			</div>

			<form onSubmit={handleSubmit} className="formulario-crear-pedido">

				{/* Client Selection */}
				<div className="formulario-crear-pedido-group">
					<label htmlFor="order-client" className="formulario-crear-pedido-label">
						Cliente (Opcional)
					</label>
					<div className="formulario-crear-pedido-input-wrapper">
						<UserIcon className="formulario-crear-pedido-input-icon" />
						<div className="formulario-crear-pedido-client-wrapper">
							<input
								id="order-client"
								type="text"
								value={formData.clientName}
								onChange={(e) => handleClientNameChange(e.target.value)}
								onFocus={() => setShowClientDropdown(true)}
								placeholder="Escribe el nombre o selecciona un cliente"
								className="formulario-crear-pedido-input"
							/>
							{showClientDropdown && filteredClients.length > 0 && (
								<div className="formulario-crear-pedido-client-dropdown">
									{filteredClients.map((client) => (
										<button
											key={client.id}
											type="button"
											onClick={() => handleSelectClient(client)}
											className="formulario-crear-pedido-client-item"
										>
											<div className="formulario-crear-pedido-client-item-info">
												<p className="formulario-crear-pedido-client-item-name">{client.name}</p>
												<p className="formulario-crear-pedido-client-item-details">
													{client.phone} • {client.address}
												</p>
											</div>
										</button>
									))}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Pickup Address */}
				<div className="formulario-crear-pedido-group">
					<label htmlFor="order-pickup" className="formulario-crear-pedido-label">
						Dirección de Retiro *
					</label>
					<div className="formulario-crear-pedido-input-wrapper">
						<MapPin className="formulario-crear-pedido-input-icon" />
						<input
							id="order-pickup"
							type="text"
							value={formData.pickupAddress}
							onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
							placeholder="Ej: Av. Principal 123, Local 5"
							className="formulario-crear-pedido-input"
							required
						/>
					</div>
				</div>

				{/* Delivery Address */}
				<div className="formulario-crear-pedido-group">
					<label htmlFor="order-delivery" className="formulario-crear-pedido-label">
						<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
							<span>Dirección de Entrega *</span>
							{formData.selectedClientId && (
								<span className="formulario-crear-pedido-client-badge">Desde cliente</span>
							)}
						</div>
					</label>
					<div className="formulario-crear-pedido-input-wrapper">
						<Navigation className="formulario-crear-pedido-input-icon" />
						<input
							id="order-delivery"
							type="text"
							value={formData.deliveryAddress}
							onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
							placeholder="Ej: Calle Secundaria 456, Apto 10B"
							className="formulario-crear-pedido-input"
							required
						/>
					</div>
				</div>

				{/* Local */}
				<div className="formulario-crear-pedido-group">
					<label className="formulario-crear-pedido-label">
						Local de Retiro *
					</label>
					{isLocal ? (
						<div className="formulario-crear-pedido-input-wrapper">
							<Store className="formulario-crear-pedido-input-icon" />
							<div className="formulario-crear-pedido-local-display">
								{currentUser.local}
							</div>
						</div>
					) : (
						<div className={`formulario-crear-pedido-local-grid ${gridClass}`}>
							{availableLocales.map((local) => (
								<button
									key={local}
									type="button"
									onClick={() => handleLocalChange(local)}
									className={`formulario-crear-pedido-local-button ${formData.local === local ? 'formulario-crear-pedido-local-button-active' : 'formulario-crear-pedido-local-button-inactive'}`}
								>
									<Store size={16} />
									{local}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Suggested Price */}
				<div className="formulario-crear-pedido-group">
					<label htmlFor="order-price" className="formulario-crear-pedido-label">
						Precio Sugerido para el Repartidor *
					</label>
					<div className="formulario-crear-pedido-input-wrapper">
						<DollarSign className="formulario-crear-pedido-input-icon" />
						<input
							id="order-price"
							type="number"
							step="0.01"
							min="0"
							value={formData.suggestedPrice}
							onChange={(e) => setFormData({ ...formData, suggestedPrice: e.target.value })}
							placeholder="0.00"
							className="formulario-crear-pedido-input"
							required
						/>
					</div>
				</div>

				{/* Notes */}
				<div className="formulario-crear-pedido-group">
					<label htmlFor="order-notes" className="formulario-crear-pedido-label">
						Notas Adicionales (Opcional)
					</label>
					<div className="formulario-crear-pedido-input-wrapper">
						<FileText className="formulario-crear-pedido-input-icon formulario-crear-pedido-textarea-icon" />
						<textarea
							id="order-notes"
							value={formData.notes}
							onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
							placeholder="Instrucciones especiales, detalles del paquete, etc."
							rows={3}
							className="formulario-crear-pedido-textarea"
						/>
					</div>
				</div>

				{/* Actions */}
				<div className="formulario-crear-pedido-actions">
					<button
						type="button"
						onClick={onCancel}
						className="formulario-crear-pedido-button formulario-crear-pedido-button-cancel"
					>
						Cancelar
					</button>
					<button
						type="submit"
						disabled={!isValid}
						className="formulario-crear-pedido-button formulario-crear-pedido-button-submit"
					>
						Crear Pedido
					</button>
				</div>
			</form>
		</div>
	);
}

