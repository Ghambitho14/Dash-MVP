import { useState, useRef } from 'react';
import { User, Lock, Camera, X, Save } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { hashPassword } from '../../utils/passwordUtils';
import { logger } from '../../utils/logger';
import { useToast } from '../../hooks/ui/useToast';
import '../../styles/Components/AccountSettings.css';

export function AccountSettings({ currentUser, onClose, onUpdateUser }) {
	const [name, setName] = useState(currentUser.name || '');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [profilePhoto, setProfilePhoto] = useState(currentUser.profile_photo_url || null);
	const [profilePhotoFile, setProfilePhotoFile] = useState(null);
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState({});
	const fileInputRef = useRef(null);
	const { showSuccess, showError } = useToast();

	const validateForm = () => {
		const newErrors = {};

		if (!name.trim()) {
			newErrors.name = 'El nombre es requerido';
		}

		if (password.trim()) {
			if (password.length < 6) {
				newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
			}
			if (password !== confirmPassword) {
				newErrors.confirmPassword = 'Las contraseñas no coinciden';
			}
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleFileSelect = (e) => {
		const file = e.target.files[0];
		if (!file) return;

		// Validar tipo de archivo
		if (!file.type.startsWith('image/')) {
			showError('Por favor selecciona una imagen válida');
			return;
		}

		// Validar tamaño (máximo 5MB)
		if (file.size > 5 * 1024 * 1024) {
			showError('La imagen debe ser menor a 5MB');
			return;
		}

		setProfilePhotoFile(file);

		// Crear preview
		const reader = new FileReader();
		reader.onloadend = () => {
			setProfilePhoto(reader.result);
		};
		reader.readAsDataURL(file);
	};

	const uploadProfilePhoto = async (file) => {
		try {
			// Generar nombre único para el archivo
			const fileExt = file.name.split('.').pop();
			const fileName = `${currentUser._dbId}_${Date.now()}.${fileExt}`;
			const filePath = `profile_photos/${fileName}`;

			// Subir a Supabase Storage
			const { data, error: uploadError } = await supabase.storage
				.from('avatars')
				.upload(filePath, file, {
					cacheControl: '3600',
					upsert: true,
				});

			if (uploadError) throw uploadError;

			// Obtener URL pública
			const { data: { publicUrl } } = supabase.storage
				.from('avatars')
				.getPublicUrl(filePath);

			return publicUrl;
		} catch (err) {
			logger.error('Error subiendo foto de perfil:', err);
			throw new Error('Error al subir la foto de perfil');
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		setLoading(true);

		try {
			const updateData = {
				name: name.trim(),
			};

			// Actualizar contraseña si se proporcionó
			if (password.trim()) {
				updateData.password = await hashPassword(password);
			}

			// Subir foto de perfil si hay una nueva
			if (profilePhotoFile) {
				try {
					const photoUrl = await uploadProfilePhoto(profilePhotoFile);
					updateData.profile_photo_url = photoUrl;
				} catch (err) {
					showError(err.message || 'Error al subir la foto');
					setLoading(false);
					return;
				}
			}

			// Actualizar usuario en la base de datos
			const { error } = await supabase
				.from('company_users')
				.update(updateData)
				.eq('id', currentUser._dbId);

			if (error) throw error;

			// Actualizar usuario en el contexto
			const updatedUser = {
				...currentUser,
				name: updateData.name,
				profile_photo_url: updateData.profile_photo_url || currentUser.profile_photo_url,
			};

			if (onUpdateUser) {
				onUpdateUser(updatedUser);
			}

			showSuccess('Cuenta actualizada exitosamente');
			onClose();
		} catch (err) {
			logger.error('Error actualizando cuenta:', err);
			showError('Error al actualizar la cuenta: ' + (err.message || 'Error desconocido'));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="account-settings">
			<div className="account-settings-header">
				<h2 className="account-settings-title">Configuración de Cuenta</h2>
				<button
					type="button"
					onClick={onClose}
					className="account-settings-close"
					aria-label="Cerrar"
				>
					<X />
				</button>
			</div>

			<form onSubmit={handleSubmit} className="account-settings-form">
				{/* Foto de Perfil */}
				<div className="account-settings-section">
					<label className="account-settings-label">Foto de Perfil</label>
					<div className="account-settings-photo-container">
						<div className="account-settings-photo-preview">
							{profilePhoto ? (
								<img src={profilePhoto} alt="Foto de perfil" />
							) : (
								<div className="account-settings-photo-placeholder">
									<User size={48} />
								</div>
							)}
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								className="account-settings-photo-button"
								title="Cambiar foto"
							>
								<Camera size={20} />
							</button>
						</div>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							onChange={handleFileSelect}
							className="account-settings-file-input"
						/>
						<p className="account-settings-hint">
							Formatos: JPG, PNG, GIF. Tamaño máximo: 5MB
						</p>
					</div>
				</div>

				{/* Nombre */}
				<div className="account-settings-section">
					<label htmlFor="account-name" className="account-settings-label">
						Nombre Completo *
					</label>
					<div className="account-settings-input-wrapper">
						<User className="account-settings-input-icon" />
						<input
							id="account-name"
							type="text"
							value={name}
							onChange={(e) => {
								setName(e.target.value);
								setErrors({ ...errors, name: '' });
							}}
							className={`account-settings-input ${errors.name ? 'account-settings-input-error' : ''}`}
							placeholder="Tu nombre completo"
							required
							disabled={loading}
						/>
					</div>
					{errors.name && (
						<span className="account-settings-error">{errors.name}</span>
					)}
				</div>

				{/* Contraseña */}
				<div className="account-settings-section">
					<label htmlFor="account-password" className="account-settings-label">
						Nueva Contraseña (opcional)
					</label>
					<div className="account-settings-input-wrapper">
						<Lock className="account-settings-input-icon" />
						<input
							id="account-password"
							type="password"
							value={password}
							onChange={(e) => {
								setPassword(e.target.value);
								setErrors({ ...errors, password: '' });
							}}
							className={`account-settings-input ${errors.password ? 'account-settings-input-error' : ''}`}
							placeholder="Dejar vacío para no cambiar"
							disabled={loading}
						/>
					</div>
					{errors.password && (
						<span className="account-settings-error">{errors.password}</span>
					)}
				</div>

				{/* Confirmar Contraseña */}
				{password.trim() && (
					<div className="account-settings-section">
						<label htmlFor="account-confirm-password" className="account-settings-label">
							Confirmar Nueva Contraseña *
						</label>
						<div className="account-settings-input-wrapper">
							<Lock className="account-settings-input-icon" />
							<input
								id="account-confirm-password"
								type="password"
								value={confirmPassword}
								onChange={(e) => {
									setConfirmPassword(e.target.value);
									setErrors({ ...errors, confirmPassword: '' });
								}}
								className={`account-settings-input ${errors.confirmPassword ? 'account-settings-input-error' : ''}`}
								placeholder="Confirma tu nueva contraseña"
								disabled={loading}
							/>
						</div>
						{errors.confirmPassword && (
							<span className="account-settings-error">{errors.confirmPassword}</span>
						)}
					</div>
				)}

				{/* Botones */}
				<div className="account-settings-actions">
					<button
						type="button"
						onClick={onClose}
						className="account-settings-button account-settings-button-cancel"
						disabled={loading}
					>
						Cancelar
					</button>
					<button
						type="submit"
						className="account-settings-button account-settings-button-save"
						disabled={loading}
					>
						{loading ? (
							<>Guardando...</>
						) : (
							<>
								<Save size={18} />
								Guardar Cambios
							</>
						)}
					</button>
				</div>
			</form>
		</div>
	);
}

