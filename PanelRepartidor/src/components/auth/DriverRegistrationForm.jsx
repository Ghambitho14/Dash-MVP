import { useState } from 'react';
import { Bike, User, Lock, Mail, Phone, MapPin, Calendar, FileText, Car, Camera, CheckCircle, X, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { useDriverRegistration } from '../../hooks/useDriverRegistration';
import { Modal } from '../common/Modal';
import '../../styles/Components/DriverRegistrationForm.css';

export function DriverRegistrationForm({ isOpen, onClose }) {
	const {
		formData,
		error,
		loading,
		success,
		currentStep,
		fieldErrors,
		validating,
		updateField,
		handleNextStep,
		handlePreviousStep,
		handleSubmit,
		resetForm,
	} = useDriverRegistration();

	const handleClose = () => {
		resetForm();
		onClose();
	};

	const handleFileUpload = (field, file) => {
		// Por ahora, solo guardamos el nombre del archivo
		// En producción, esto debería subir a Supabase Storage y guardar la URL
		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				// Por ahora guardamos como data URL, en producción usar URL de Supabase Storage
				updateField(field, reader.result);
			};
			reader.readAsDataURL(file);
		}
	};

	if (!isOpen) return null;

	const steps = [
		{ number: 1, title: 'Datos Personales' },
		{ number: 2, title: 'Datos del Vehículo' },
		{ number: 3, title: 'Documentación' },
	];

	return (
		<Modal onClose={handleClose} maxWidth="3xl">
			<div className="driver-registration-container">
				<div className="driver-registration-header">
					<div className="driver-registration-header-content">
						<Bike className="driver-registration-icon" />
						<h2 className="driver-registration-title">Registro de Repartidor</h2>
					</div>
					<button
						type="button"
						onClick={handleClose}
						className="driver-registration-close"
						aria-label="Cerrar"
					>
						<X style={{ width: '1.25rem', height: '1.25rem' }} />
					</button>
				</div>

				{success ? (
					<div className="driver-registration-success">
						<CheckCircle className="driver-registration-success-icon" />
						<h3 className="driver-registration-success-title">¡Solicitud Enviada!</h3>
						<p className="driver-registration-success-message">
							Tu solicitud de registro ha sido enviada exitosamente. 
							Un administrador revisará tu solicitud y te notificará cuando sea aprobada.
						</p>
						<button
							type="button"
							onClick={handleClose}
							className="driver-registration-success-button"
						>
							Cerrar
						</button>
					</div>
				) : (
					<>
						{/* Progress Steps */}
						<div className="driver-registration-steps">
							{steps.map((step, index) => (
								<div key={step.number} className="driver-registration-step-wrapper">
									<div
										className={`driver-registration-step ${
											currentStep === step.number
												? 'driver-registration-step-active'
												: currentStep > step.number
												? 'driver-registration-step-completed'
												: ''
										}`}
									>
										{currentStep > step.number ? (
											<CheckCircle style={{ width: '1.25rem', height: '1.25rem' }} />
										) : (
											<span>{step.number}</span>
										)}
									</div>
									<span className="driver-registration-step-label">{step.title}</span>
									{index < steps.length - 1 && (
										<div
											className={`driver-registration-step-line ${
												currentStep > step.number ? 'driver-registration-step-line-completed' : ''
											}`}
										/>
									)}
								</div>
							))}
						</div>

						<form onSubmit={currentStep === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNextStep(); }} className="driver-registration-form">
							{error && (
								<div className="driver-registration-error">
									{error}
								</div>
							)}

							{/* Step 1: Datos Personales */}
							{currentStep === 1 && (
								<div className="driver-registration-step-content">
									<h3 className="driver-registration-step-title">Datos Personales</h3>
									<p className="driver-registration-step-description">
										Completa tu información personal para identificarte
									</p>

									<div className="driver-registration-form-grid">
										<div className="driver-registration-form-group">
											<label className="driver-registration-label">
												<div className="driver-registration-label-content">
													<User style={{ width: '1rem', height: '1rem' }} />
													Nombre Completo *
												</div>
											</label>
											<input
												type="text"
												value={formData.name}
												onChange={(e) => updateField('name', e.target.value)}
												className={`driver-registration-input ${fieldErrors.name ? 'driver-registration-input-error' : ''}`}
												placeholder="Juan Pérez"
												required
												disabled={loading}
											/>
											{fieldErrors.name && (
												<span className="driver-registration-field-error">{fieldErrors.name}</span>
											)}
										</div>

										<div className="driver-registration-form-group">
											<label className="driver-registration-label">
												<div className="driver-registration-label-content">
													<FileText style={{ width: '1rem', height: '1rem' }} />
													RUT / Documento de Identidad *
												</div>
											</label>
											<input
												type="text"
												value={formData.documentId}
												onChange={(e) => updateField('documentId', e.target.value)}
												className={`driver-registration-input ${fieldErrors.documentId ? 'driver-registration-input-error' : ''}`}
												placeholder="12.345.678-9"
												required
												disabled={loading || validating.documentId}
											/>
											{validating.documentId && (
												<span className="driver-registration-field-validating">Verificando...</span>
											)}
											{fieldErrors.documentId && !validating.documentId && (
												<span className="driver-registration-field-error">{fieldErrors.documentId}</span>
											)}
										</div>

										<div className="driver-registration-form-group">
											<label className="driver-registration-label">
												<div className="driver-registration-label-content">
													<Calendar style={{ width: '1rem', height: '1rem' }} />
													Fecha de Nacimiento *
												</div>
											</label>
											<input
												type="date"
												value={formData.birthDate}
												onChange={(e) => updateField('birthDate', e.target.value)}
												className={`driver-registration-input ${fieldErrors.birthDate ? 'driver-registration-input-error' : ''}`}
												required
												disabled={loading}
												max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
											/>
											{fieldErrors.birthDate && (
												<span className="driver-registration-field-error">{fieldErrors.birthDate}</span>
											)}
										</div>

										<div className="driver-registration-form-group">
											<label className="driver-registration-label">
												<div className="driver-registration-label-content">
													<Phone style={{ width: '1rem', height: '1rem' }} />
													Teléfono * (Formato: +56912345678 o 912345678)
												</div>
											</label>
											<input
												type="tel"
												value={formData.phone}
												onChange={(e) => updateField('phone', e.target.value)}
												className={`driver-registration-input ${fieldErrors.phone ? 'driver-registration-input-error' : ''}`}
												placeholder="+56912345678"
												required
												disabled={loading || validating.phone}
											/>
											{validating.phone && (
												<span className="driver-registration-field-validating">Verificando...</span>
											)}
											{fieldErrors.phone && !validating.phone && (
												<span className="driver-registration-field-error">{fieldErrors.phone}</span>
											)}
										</div>

										<div className="driver-registration-form-group">
											<label className="driver-registration-label">
												<div className="driver-registration-label-content">
													<Mail style={{ width: '1rem', height: '1rem' }} />
													Email
												</div>
											</label>
											<input
												type="email"
												value={formData.email}
												onChange={(e) => updateField('email', e.target.value)}
												className={`driver-registration-input ${fieldErrors.email ? 'driver-registration-input-error' : ''}`}
												placeholder="correo@ejemplo.com"
												disabled={loading || validating.email}
											/>
											{validating.email && (
												<span className="driver-registration-field-validating">Verificando...</span>
											)}
											{fieldErrors.email && !validating.email && (
												<span className="driver-registration-field-error">{fieldErrors.email}</span>
											)}
										</div>

										<div className="driver-registration-form-group">
											<label className="driver-registration-label">
												<div className="driver-registration-label-content">
													<MapPin style={{ width: '1rem', height: '1rem' }} />
													Dirección
												</div>
											</label>
											<input
												type="text"
												value={formData.address}
												onChange={(e) => updateField('address', e.target.value)}
												className="driver-registration-input"
												placeholder="Calle, número, ciudad"
												disabled={loading}
											/>
										</div>

										<div className="driver-registration-form-group">
											<label className="driver-registration-label">
												<div className="driver-registration-label-content">
													<User style={{ width: '1rem', height: '1rem' }} />
													Nombre de Usuario *
												</div>
											</label>
											<input
												type="text"
												value={formData.username}
												onChange={(e) => updateField('username', e.target.value.toLowerCase())}
												className={`driver-registration-input ${fieldErrors.username ? 'driver-registration-input-error' : ''}`}
												placeholder="usuario123"
												required
												disabled={loading}
												minLength={3}
											/>
											{fieldErrors.username && (
												<span className="driver-registration-field-error">{fieldErrors.username}</span>
											)}
										</div>

										<div className="driver-registration-form-group">
											<label className="driver-registration-label">
												<div className="driver-registration-label-content">
													<Lock style={{ width: '1rem', height: '1rem' }} />
													Contraseña *
												</div>
											</label>
											<input
												type="password"
												value={formData.password}
												onChange={(e) => updateField('password', e.target.value)}
												className={`driver-registration-input ${fieldErrors.password ? 'driver-registration-input-error' : ''}`}
												placeholder="Mínimo 6 caracteres"
												required
												disabled={loading}
												minLength={6}
											/>
											{fieldErrors.password && (
												<span className="driver-registration-field-error">{fieldErrors.password}</span>
											)}
										</div>

										<div className="driver-registration-form-group">
											<label className="driver-registration-label">
												<div className="driver-registration-label-content">
													<Lock style={{ width: '1rem', height: '1rem' }} />
													Confirmar Contraseña *
												</div>
											</label>
											<input
												type="password"
												value={formData.confirmPassword}
												onChange={(e) => updateField('confirmPassword', e.target.value)}
												className={`driver-registration-input ${fieldErrors.confirmPassword ? 'driver-registration-input-error' : ''}`}
												placeholder="Repite la contraseña"
												required
												disabled={loading}
												minLength={6}
											/>
											{fieldErrors.confirmPassword && (
												<span className="driver-registration-field-error">{fieldErrors.confirmPassword}</span>
											)}
										</div>
									</div>
								</div>
							)}

							{/* Step 2: Datos del Vehículo */}
							{currentStep === 2 && (
								<div className="driver-registration-step-content">
									<h3 className="driver-registration-step-title">Datos del Vehículo</h3>
									<p className="driver-registration-step-description">
										Información sobre tu vehículo de trabajo
									</p>

									<div className="driver-registration-form-grid">
										<div className="driver-registration-form-group driver-registration-form-group-full">
											<label className="driver-registration-label">
												<div className="driver-registration-label-content">
													<Car style={{ width: '1rem', height: '1rem' }} />
													Tipo de Vehículo *
												</div>
											</label>
											<select
												value={formData.vehicleType}
												onChange={(e) => updateField('vehicleType', e.target.value)}
												className="driver-registration-input"
												required
												disabled={loading}
											>
												<option value="">Selecciona un tipo</option>
												<option value="moto">Moto</option>
												<option value="bicicleta">Bicicleta</option>
												<option value="auto">Auto</option>
											</select>
										</div>

										{/* Campos condicionales según tipo de vehículo */}
										{formData.vehicleType !== 'bicicleta' && (
											<>
												<div className="driver-registration-form-group">
													<label className="driver-registration-label">
														<div className="driver-registration-label-content">
															<Car style={{ width: '1rem', height: '1rem' }} />
															Marca
														</div>
													</label>
													<input
														type="text"
														value={formData.vehicleBrand || ''}
														onChange={(e) => updateField('vehicleBrand', e.target.value)}
														className="driver-registration-input"
														placeholder="Ej: Honda"
														disabled={loading}
													/>
												</div>

												<div className="driver-registration-form-group">
													<label className="driver-registration-label">
														<div className="driver-registration-label-content">
															<Car style={{ width: '1rem', height: '1rem' }} />
															Modelo
														</div>
													</label>
													<input
														type="text"
														value={formData.vehicleModel || ''}
														onChange={(e) => updateField('vehicleModel', e.target.value)}
														className="driver-registration-input"
														placeholder="Ej: CBR 600"
														disabled={loading}
													/>
												</div>

												<div className="driver-registration-form-group">
													<label className="driver-registration-label">
														<div className="driver-registration-label-content">
															<Calendar style={{ width: '1rem', height: '1rem' }} />
															Año
														</div>
													</label>
											<input
												type="number"
												value={formData.vehicleYear || ''}
												onChange={(e) => updateField('vehicleYear', e.target.value)}
												className="driver-registration-input"
												placeholder="2020"
												min="1900"
												max={new Date().getFullYear() + 1}
												disabled={loading}
											/>
												</div>

												<div className="driver-registration-form-group">
													<label className="driver-registration-label">
														<div className="driver-registration-label-content">
															<FileText style={{ width: '1rem', height: '1rem' }} />
															Patente
														</div>
													</label>
													<input
														type="text"
														value={formData.vehiclePlate || ''}
														onChange={(e) => updateField('vehiclePlate', e.target.value.toUpperCase())}
														className="driver-registration-input"
														placeholder="ABCD12"
														disabled={loading}
													/>
												</div>
											</>
										)}

										<div className="driver-registration-form-group driver-registration-form-group-full">
											<label className="driver-registration-label">
												<div className="driver-registration-label-content">
													<Camera style={{ width: '1rem', height: '1rem' }} />
													Foto del Vehículo *
												</div>
											</label>
											<input
												type="file"
												accept="image/*"
												onChange={(e) => handleFileUpload('vehiclePhotoUrl', e.target.files[0])}
												className="driver-registration-file-input"
												required
												disabled={loading}
											/>
										</div>

										{formData.vehicleType === 'bicicleta' && (
											<div className="driver-registration-form-group driver-registration-form-group-full">
												<label className="driver-registration-label">
													<div className="driver-registration-label-content">
														<Camera style={{ width: '1rem', height: '1rem' }} />
														Foto del Casco *
													</div>
												</label>
												<input
													type="file"
													accept="image/*"
													onChange={(e) => handleFileUpload('helmetPhotoUrl', e.target.files[0])}
													className="driver-registration-file-input"
													required
													disabled={loading}
												/>
											</div>
										)}

									</div>
								</div>
							)}

							{/* Step 3: Documentación */}
							{currentStep === 3 && (
								<div className="driver-registration-step-content">
									<h3 className="driver-registration-step-title">Documentación Obligatoria</h3>
									<p className="driver-registration-step-description">
										Sube las fotos de tus documentos. Estos serán revisados por un administrador.
									</p>

									<div className="driver-registration-form-grid">
										<div className="driver-registration-form-group driver-registration-form-group-full">
											<label className="driver-registration-label">
												<div className="driver-registration-label-content">
													<FileText style={{ width: '1rem', height: '1rem' }} />
													Foto del Carnet de Identidad *
												</div>
											</label>
											<input
												type="file"
												accept="image/*"
												onChange={(e) => handleFileUpload('idCardPhotoUrl', e.target.files[0])}
												className="driver-registration-file-input"
												required
												disabled={loading}
											/>
										</div>

										{/* Licencia de conducir solo para bicicleta y auto, NO para moto */}
										{formData.vehicleType !== 'moto' && (
											<div className="driver-registration-form-group driver-registration-form-group-full">
												<label className="driver-registration-label">
													<div className="driver-registration-label-content">
														<FileText style={{ width: '1rem', height: '1rem' }} />
														Licencia de Conducir *
													</div>
												</label>
												<input
													type="file"
													accept="image/*"
													onChange={(e) => handleFileUpload('driverLicensePhotoUrl', e.target.files[0])}
													className="driver-registration-file-input"
													required
													disabled={loading}
												/>
											</div>
										)}

										<div className="driver-registration-form-group driver-registration-form-group-full">
											<label className="driver-registration-label">
												<div className="driver-registration-label-content">
													<FileText style={{ width: '1rem', height: '1rem' }} />
													Certificado de Antecedentes *
												</div>
											</label>
											<input
												type="file"
												accept="image/*"
												onChange={(e) => handleFileUpload('criminalRecordPhotoUrl', e.target.files[0])}
												className="driver-registration-file-input"
												required
												disabled={loading}
											/>
										</div>
									</div>
								</div>
							)}

							{/* Navigation Buttons */}
							<div className="driver-registration-actions">
								{currentStep > 1 && (
									<button
										type="button"
										onClick={handlePreviousStep}
										className="driver-registration-button-secondary"
										disabled={loading}
									>
										<ChevronLeft style={{ width: '1rem', height: '1rem' }} />
										Anterior
									</button>
								)}
								<div className="driver-registration-actions-spacer" />
								<button
									type="button"
									onClick={handleClose}
									className="driver-registration-button-cancel"
									disabled={loading}
								>
									Cancelar
								</button>
								{currentStep < 3 ? (
									<button
										type="button"
										onClick={handleNextStep}
										className="driver-registration-button-primary"
										disabled={loading}
									>
										Siguiente
										<ChevronRight style={{ width: '1rem', height: '1rem' }} />
									</button>
								) : (
									<button
										type="submit"
										className="driver-registration-button-primary"
										disabled={loading}
									>
										{loading ? 'Enviando...' : 'Enviar Solicitud'}
									</button>
								)}
							</div>
						</form>
					</>
				)}
			</div>
		</Modal>
	);
}

