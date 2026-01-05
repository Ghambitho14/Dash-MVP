import { X, User, Lock, Store, Shield, Crown } from 'lucide-react';
import { useCreateUserForm } from '../../hooks/users/useCreateUserForm';
import '../../styles/Components/CreateUserForm.css';

export function CreateUserForm({ onSubmit, onClose, localConfigs, existingUsers, initialData }) {
	const {
		username,
		password,
		confirmPassword,
		name,
		role,
		local,
		errors,
		availableLocales,
		gridClass,
		setUsername,
		setPassword,
		setConfirmPassword,
		setName,
		handleRoleChange,
		handleLocalChange,
		clearError,
		handleSubmit: handleFormSubmit,
	} = useCreateUserForm(localConfigs, existingUsers, initialData);

	const handleSubmit = (e) => {
		const userData = handleFormSubmit(e);
		if (userData) {
			onSubmit(userData);
		}
	};

	return (
		<div className="formulario-crear-usuario-overlay" onClick={onClose}>
			<div className="formulario-crear-usuario-content" onClick={(e) => e.stopPropagation()}>
				<div className="formulario-crear-usuario-header">
					<div className="formulario-crear-usuario-header-left">
						<div className="formulario-crear-usuario-header-icon">
							<User />
						</div>
						<div>
							<h2 className="formulario-crear-usuario-title">{initialData ? 'Editar Usuario' : 'Agregar Usuario'}</h2>
							<p className="formulario-crear-usuario-subtitle">Completa los datos del usuario</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="formulario-crear-usuario-close"
						aria-label="Cerrar"
					>
						<X />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="formulario-crear-usuario">
					<div className="formulario-crear-usuario-group">
						<label htmlFor="user-username" className="formulario-crear-usuario-label">
							Usuario *
						</label>
						<div className="formulario-crear-usuario-input-wrapper">
							<User className="formulario-crear-usuario-input-icon" />
							<input
								id="user-username"
								type="text"
								value={username}
								onChange={(e) => {
									setUsername(e.target.value);
									clearError('username');
								}}
								placeholder="Ej: usuario123"
								className={`formulario-crear-usuario-input ${errors.username ? 'formulario-crear-usuario-input-error' : ''}`}
								autoFocus
								disabled={!!initialData}
							/>
						</div>
						{errors.username && (
							<span className="formulario-crear-usuario-error">{errors.username}</span>
						)}
						{initialData && (
							<p className="formulario-crear-usuario-hint">El usuario no se puede modificar</p>
						)}
					</div>

					<div className="formulario-crear-usuario-group">
						<label htmlFor="user-password" className="formulario-crear-usuario-label">
							Contraseña {initialData ? '(dejar vacío para mantener)' : '*'}
						</label>
						<div className="formulario-crear-usuario-input-wrapper">
							<Lock className="formulario-crear-usuario-input-icon" />
							<input
								id="user-password"
								type="password"
								value={password}
								onChange={(e) => {
									setPassword(e.target.value);
									clearError('password');
								}}
								placeholder={initialData ? "Dejar vacío para mantener" : "Mínimo 6 caracteres"}
								className={`formulario-crear-usuario-input ${errors.password ? 'formulario-crear-usuario-input-error' : ''}`}
							/>
						</div>
						{errors.password && (
							<span className="formulario-crear-usuario-error">{errors.password}</span>
						)}
					</div>

					<div className="formulario-crear-usuario-group">
						<label htmlFor="user-confirm-password" className="formulario-crear-usuario-label">
							Confirmar Contraseña {initialData ? '(dejar vacío para mantener)' : '*'}
						</label>
						<div className="formulario-crear-usuario-input-wrapper">
							<Lock className="formulario-crear-usuario-input-icon" />
							<input
								id="user-confirm-password"
								type="password"
								value={confirmPassword}
								onChange={(e) => {
									setConfirmPassword(e.target.value);
									clearError('confirmPassword');
								}}
								placeholder={initialData ? "Dejar vacío para mantener" : "Confirma la contraseña"}
								className={`formulario-crear-usuario-input ${errors.confirmPassword ? 'formulario-crear-usuario-input-error' : ''}`}
							/>
						</div>
						{errors.confirmPassword && (
							<span className="formulario-crear-usuario-error">{errors.confirmPassword}</span>
						)}
					</div>

					<div className="formulario-crear-usuario-group">
						<label htmlFor="user-name" className="formulario-crear-usuario-label">
							Nombre Completo *
						</label>
						<div className="formulario-crear-usuario-input-wrapper">
							<User className="formulario-crear-usuario-input-icon" />
							<input
								id="user-name"
								type="text"
								value={name}
								onChange={(e) => {
									setName(e.target.value);
									clearError('name');
								}}
								placeholder="Ej: Juan Pérez"
								className={`formulario-crear-usuario-input ${errors.name ? 'formulario-crear-usuario-input-error' : ''}`}
							/>
						</div>
						{errors.name && (
							<span className="formulario-crear-usuario-error">{errors.name}</span>
						)}
					</div>

					<div className="formulario-crear-usuario-group">
						<label className="formulario-crear-usuario-label">
							<div className="formulario-crear-usuario-label-content">
								<Shield />
								Rol *
							</div>
						</label>
						<div className="formulario-crear-usuario-role-buttons formulario-crear-usuario-role-buttons-3">
							<button
								type="button"
								onClick={() => handleRoleChange('empresarial')}
								className={`formulario-crear-usuario-role-button ${role === 'empresarial' ? 'formulario-crear-usuario-role-button-active' : 'formulario-crear-usuario-role-button-inactive'}`}
							>
								<Crown />
								CEO
							</button>
							<button
								type="button"
								onClick={() => handleRoleChange('admin')}
								className={`formulario-crear-usuario-role-button ${role === 'admin' ? 'formulario-crear-usuario-role-button-active' : 'formulario-crear-usuario-role-button-inactive'}`}
							>
								<Shield />
								Administrador
							</button>
							<button
								type="button"
								onClick={() => handleRoleChange('local')}
								className={`formulario-crear-usuario-role-button ${role === 'local' ? 'formulario-crear-usuario-role-button-active' : 'formulario-crear-usuario-role-button-inactive'}`}
							>
								<Store />
								Local
							</button>
						</div>
					</div>

					{role === 'local' && (
						<div className="formulario-crear-usuario-group">
							<label className="formulario-crear-usuario-label">
								<div className="formulario-crear-usuario-label-content">
									<Store />
									Local Asignado *
								</div>
							</label>
							{availableLocales.length === 0 ? (
								<div className="formulario-crear-usuario-no-locals">
									<p className="formulario-crear-usuario-no-locals-text">
										No hay locales creados. Por favor, crea locales primero en "Configurar Locales".
									</p>
								</div>
							) : (
								<>
									<div className={`formulario-crear-usuario-local-grid ${gridClass}`}>
										{availableLocales.map((loc) => (
											<button
												key={loc}
												type="button"
												onClick={() => handleLocalChange(loc)}
												className={`formulario-crear-usuario-local-button ${local === loc ? 'formulario-crear-usuario-local-button-active' : 'formulario-crear-usuario-local-button-inactive'}`}
											>
												{loc}
											</button>
										))}
									</div>
									{errors.local && (
										<span className="formulario-crear-usuario-error">{errors.local}</span>
									)}
								</>
							)}
						</div>
					)}

					<div className="formulario-crear-usuario-actions">
						<button
							type="button"
							onClick={onClose}
							className="formulario-crear-usuario-button formulario-crear-usuario-button-secondary"
						>
							Cancelar
						</button>
						<button
							type="submit"
							className="formulario-crear-usuario-button formulario-crear-usuario-button-primary"
						>
							{initialData ? 'Guardar Cambios' : 'Agregar Usuario'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

