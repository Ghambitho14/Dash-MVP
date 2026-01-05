import { useState } from 'react';
import { logger } from '../../utils/logger';

/**
 * Hook para gestionar la lógica de login
 */
export function useLogin(onLogin) {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const validateInputs = () => {
		if (!username.trim()) {
			setError('El usuario es requerido');
			return false;
		}
		if (!password.trim()) {
			setError('La contraseña es requerida');
			return false;
		}
		if (password.length < 6) {
			setError('La contraseña debe tener al menos 6 caracteres');
			return false;
		}
		return true;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');

		// Validar entradas
		if (!validateInputs()) {
			return;
		}

		setLoading(true);

		try {
			await onLogin(username.trim(), password);
		} catch (err) {
			setError(err.message || 'Error al iniciar sesión. Intenta nuevamente.');
			logger.error('Error en login:', err);
		} finally {
			setLoading(false);
		}
	};

	return {
		username,
		password,
		error,
		loading,
		setUsername,
		setPassword,
		handleSubmit,
	};
}

