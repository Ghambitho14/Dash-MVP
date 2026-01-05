import { X, User, Phone, MapPin, Store } from 'lucide-react';
import { useCreateClientForm } from '../../hooks/clients/useCreateClientForm';
import '../../styles/Components/CreateClientForm.css';

export function CreateClientForm({ onSubmit, onClose, currentUser, localConfigs, initialData }) {
	const {
		name,
		phone,
		address,
		local,
		errors,
		isLocal,
		availableLocales,
		setName,
		setPhone,
		setAddress,
		setLocal,
		handlePhoneChange,
		clearError,
		handleSubmit: handleFormSubmit,
	} = useCreateClientForm(currentUser, localConfigs, initialData);

	const handleSubmit = (e) => {
		const clientData = handleFormSubmit(e);
		if (clientData) {
			onSubmit(clientData);
		}
	};

	return (
		<div className="formulario-crear-cliente-overlay" onClick={onClose}>
			<div className="formulario-crear-cliente-content" onClick={(e) => e.stopPropagation()}>
				<div className="formulario-crear-cliente-header">
					<div className="formulario-crear-cliente-header-left">
						<div className="formulario-crear-cliente-header-icon">
							<User />
						</div>
						<div>
							<h2 className="formulario-crear-cliente-title">{initialData ? 'Editar Cliente' : 'Agregar Cliente'}</h2>
							<p className="formulario-crear-cliente-subtitle">Completa los datos del cliente</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="formulario-crear-cliente-close"
						aria-label="Cerrar"
					>
						<X />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="formulario-crear-cliente">
					<div className="formulario-crear-cliente-group">
						<label htmlFor="client-name" className="formulario-crear-cliente-label">
							Nombre del Cliente *
						</label>
						<div className="formulario-crear-cliente-input-wrapper">
							<User className="formulario-crear-cliente-input-icon" />
							<input
								id="client-name"
								type="text"
								value={name}
								onChange={(e) => {
									setName(e.target.value);
									clearError('name');
								}}
								placeholder="Ej: Juan Pérez"
								className={`formulario-crear-cliente-input ${errors.name ? 'formulario-crear-cliente-input-error' : ''}`}
								autoFocus
							/>
						</div>
						{errors.name && (
							<span className="formulario-crear-cliente-error">{errors.name}</span>
						)}
					</div>

					<div className="formulario-crear-cliente-group">
						<label htmlFor="client-phone" className="formulario-crear-cliente-label">
							Teléfono *
						</label>
						<div className="formulario-crear-cliente-input-wrapper">
							<Phone className="formulario-crear-cliente-input-icon" />
							<input
								id="client-phone"
								type="tel"
								value={phone}
								onChange={(e) => handlePhoneChange(e.target.value)}
								placeholder="Ej: +56 9 1234 5678"
								className={`formulario-crear-cliente-input ${errors.phone ? 'formulario-crear-cliente-input-error' : ''}`}
							/>
						</div>
						{errors.phone && (
							<span className="formulario-crear-cliente-error">{errors.phone}</span>
						)}
					</div>

					<div className="formulario-crear-cliente-group">
						<label htmlFor="client-address" className="formulario-crear-cliente-label">
							Dirección *
						</label>
						<div className="formulario-crear-cliente-input-wrapper">
							<MapPin className="formulario-crear-cliente-input-icon" />
							<input
								id="client-address"
								type="text"
								value={address}
								onChange={(e) => {
									setAddress(e.target.value);
									clearError('address');
								}}
								placeholder="Ej: Av. Principal 123, Santiago"
								className={`formulario-crear-cliente-input ${errors.address ? 'formulario-crear-cliente-input-error' : ''}`}
							/>
						</div>
					{errors.address && (
						<span className="formulario-crear-cliente-error">{errors.address}</span>
					)}
				</div>

				{/* Local Assignment */}
				<div className="formulario-crear-cliente-group">
					<label className="formulario-crear-cliente-label">
						<div className="formulario-crear-cliente-label-content">
							<Store />
							Local Asignado *
						</div>
					</label>
					{isLocal ? (
						<div className="formulario-crear-cliente-local-display">
							{currentUser.local}
						</div>
					) : (
						<div className="formulario-crear-cliente-local-grid">
							{availableLocales.map((loc) => (
								<button
									key={loc}
									type="button"
									onClick={() => setLocal(loc)}
									className={`formulario-crear-cliente-local-button ${local === loc ? 'formulario-crear-cliente-local-button-active' : 'formulario-crear-cliente-local-button-inactive'}`}
								>
									{loc}
								</button>
							))}
						</div>
					)}
				</div>

				<div className="formulario-crear-cliente-actions">
						<button
							type="button"
							onClick={onClose}
							className="formulario-crear-cliente-button formulario-crear-cliente-button-secondary"
						>
							Cancelar
						</button>
						<button
							type="submit"
							className="formulario-crear-cliente-button formulario-crear-cliente-button-primary"
						>
							{initialData ? 'Guardar Cambios' : 'Agregar Cliente'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

