import { useState } from 'react';
import { createRegistrationRequest } from '../../services/registrationService';
import { logger } from '../../utils/logger';

/**
 * Hook para gestionar la lógica de registro/solicitud
 */
export function useRegistration() {
	const [formData, setFormData] = useState({
		companyName: '',
		username: '',
		password: '',
		confirmPassword: '',
		name: '',
		email: '',
		phone: '',
	});
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);

	const updateField = (field, value) => {
		setFormData(prev => ({ ...prev, [field]: value }));
		setError('');
	};

	const validateForm = () => {
		if (!formData.companyName.trim()) {
			setError('El nombre de la empresa es requerido');
			return false;
		}
		if (!formData.username.trim()) {
			setError('El nombre de usuario es requerido');
			return false;
		}
		if (formData.username.length < 3) {
			setError('El nombre de usuario debe tener al menos 3 caracteres');
			return false;
		}
		if (!formData.password) {
			setError('La contraseña es requerida');
			return false;
		}
		if (formData.password.length < 6) {
			setError('La contraseña debe tener al menos 6 caracteres');
			return false;
		}
		if (formData.password !== formData.confirmPassword) {
			setError('Las contraseñas no coinciden');
			return false;
		}
		if (!formData.name.trim()) {
			setError('El nombre completo es requerido');
			return false;
		}
		return true;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess(false);

		if (!validateForm()) {
			return;
		}

		setLoading(true);

		try {
			await createRegistrationRequest({
				companyName: formData.companyName.trim(),
				username: formData.username.trim().toLowerCase(),
				password: formData.password,
				name: formData.name.trim(),
				email: formData.email.trim() || null,
				phone: formData.phone.trim() || null,
			});

			setSuccess(true);
			// Limpiar formulario
			setFormData({
				companyName: '',
				username: '',
				password: '',
				confirmPassword: '',
				name: '',
				email: '',
				phone: '',
			});
		} catch (err) {
			setError(err.message || 'Error al enviar la solicitud. Intenta nuevamente.');
			logger.error('Error en registro:', err);
		} finally {
			setLoading(false);
		}
	};

	const resetForm = () => {
		setFormData({
			companyName: '',
			username: '',
			password: '',
			confirmPassword: '',
			name: '',
			email: '',
			phone: '',
		});
		setError('');
		setSuccess(false);
	};

	return {
		formData,
		error,
		loading,
		success,
		updateField,
		handleSubmit,
		resetForm,
	};
}

