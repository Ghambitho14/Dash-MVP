import { Building2, User as UserIcon, Lock, Mail, Phone, X, CheckCircle } from 'lucide-react';
import { useRegistration } from '../../hooks/auth/useRegistration';
import { Modal } from '../ui/Modal';
import '../../styles/Components/RegistrationForm.css';

export function RegistrationForm({ isOpen, onClose }) {
	const {
		formData,
		error,
		loading,
		success,
		updateField,
		handleSubmit,
		resetForm,
	} = useRegistration();

	const handleClose = () => {
		resetForm();
		onClose();
	};

	if (!isOpen) return null;

	return (
		<Modal onClose={handleClose} maxWidth="md">
			<div className="registration-form-container">
				<div className="registration-form-header">
					<div className="registration-form-header-content">
						<Building2 className="registration-form-icon" />
						<h2 className="registration-form-title">Solicitar Registro</h2>
					</div>
					<button
						type="button"
						onClick={handleClose}
						className="registration-form-close"
						aria-label="Cerrar"
					>
						<X style={{ width: '1.25rem', height: '1.25rem' }} />
					</button>
				</div>

				{success ? (
					<div className="registration-form-success">
						<CheckCircle className="registration-form-success-icon" />
						<h3 className="registration-form-success-title">¡Solicitud Enviada!</h3>
						<p className="registration-form-success-message">
							Tu solicitud de registro ha sido enviada exitosamente. 
							Un administrador revisará tu solicitud y te notificará cuando sea aprobada.
						</p>
						<button
							type="button"
							onClick={handleClose}
							className="registration-form-success-button"
						>
							Cerrar
						</button>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="registration-form">
						<p className="registration-form-description">
							Completa el formulario para solicitar el registro de tu empresa. 
							Un administrador revisará tu solicitud y te notificará cuando sea aprobada.
						</p>

						{error && (
							<div className="registration-form-error">
								{error}
							</div>
						)}

						<div className="registration-form-group">
							<label className="registration-form-label">
								<div className="registration-form-label-content">
									<Building2 style={{ width: '1rem', height: '1rem' }} />
									Nombre de la Empresa *
								</div>
							</label>
							<input
								type="text"
								value={formData.companyName}
								onChange={(e) => updateField('companyName', e.target.value)}
								className="registration-form-input"
								placeholder="Ej: Mi Empresa S.A."
								required
								disabled={loading}
							/>
						</div>

						<div className="registration-form-group">
							<label className="registration-form-label">
								<div className="registration-form-label-content">
									<UserIcon style={{ width: '1rem', height: '1rem' }} />
									Nombre de Usuario *
								</div>
							</label>
							<input
								type="text"
								value={formData.username}
								onChange={(e) => updateField('username', e.target.value.toLowerCase())}
								className="registration-form-input"
								placeholder="usuario123"
								required
								disabled={loading}
								minLength={3}
							/>
						</div>

						<div className="registration-form-row">
							<div className="registration-form-group">
								<label className="registration-form-label">
									<div className="registration-form-label-content">
										<Lock style={{ width: '1rem', height: '1rem' }} />
										Contraseña *
									</div>
								</label>
								<input
									type="password"
									value={formData.password}
									onChange={(e) => updateField('password', e.target.value)}
									className="registration-form-input"
									placeholder="Mínimo 6 caracteres"
									required
									disabled={loading}
									minLength={6}
								/>
							</div>

							<div className="registration-form-group">
								<label className="registration-form-label">
									<div className="registration-form-label-content">
										<Lock style={{ width: '1rem', height: '1rem' }} />
										Confirmar Contraseña *
									</div>
								</label>
								<input
									type="password"
									value={formData.confirmPassword}
									onChange={(e) => updateField('confirmPassword', e.target.value)}
									className="registration-form-input"
									placeholder="Repite la contraseña"
									required
									disabled={loading}
									minLength={6}
								/>
							</div>
						</div>

						<div className="registration-form-group">
							<label className="registration-form-label">
								<div className="registration-form-label-content">
									<UserIcon style={{ width: '1rem', height: '1rem' }} />
									Nombre Completo *
								</div>
							</label>
							<input
								type="text"
								value={formData.name}
								onChange={(e) => updateField('name', e.target.value)}
								className="registration-form-input"
								placeholder="Juan Pérez"
								required
								disabled={loading}
							/>
						</div>

						<div className="registration-form-row">
							<div className="registration-form-group">
								<label className="registration-form-label">
									<div className="registration-form-label-content">
										<Mail style={{ width: '1rem', height: '1rem' }} />
										Email
									</div>
								</label>
								<input
									type="email"
									value={formData.email}
									onChange={(e) => updateField('email', e.target.value)}
									className="registration-form-input"
									placeholder="correo@ejemplo.com"
									disabled={loading}
								/>
							</div>

							<div className="registration-form-group">
								<label className="registration-form-label">
									<div className="registration-form-label-content">
										<Phone style={{ width: '1rem', height: '1rem' }} />
										Teléfono
									</div>
								</label>
								<input
									type="tel"
									value={formData.phone}
									onChange={(e) => updateField('phone', e.target.value)}
									className="registration-form-input"
									placeholder="+1234567890"
									disabled={loading}
								/>
							</div>
						</div>

						<div className="registration-form-actions">
							<button
								type="button"
								onClick={handleClose}
								className="registration-form-button-cancel"
								disabled={loading}
							>
								Cancelar
							</button>
							<button
								type="submit"
								className="registration-form-button-submit"
								disabled={loading}
							>
								{loading ? 'Enviando...' : 'Enviar Solicitud'}
							</button>
						</div>
					</form>
				)}
			</div>
		</Modal>
	);
}

