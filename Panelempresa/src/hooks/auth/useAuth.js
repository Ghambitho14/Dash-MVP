import { useState, useCallback, useEffect } from 'react';
import { authenticateUser } from '../../services/authService';

const SESSION_KEY = 'delivery_app_session';
const SESSION_DURATION_MS = 13 * 60 * 60 * 1000; // 13 horas en milisegundos

/**
 * Hook para gestionar autenticación con persistencia de 13 horas
 */
export function useAuth() {
	const [currentUser, setCurrentUser] = useState(null);
	const [loading, setLoading] = useState(true); // Iniciar en true para verificar sesión
	const [error, setError] = useState('');

	// Verificar sesión guardada al cargar
	useEffect(() => {
		try {
			const savedSession = localStorage.getItem(SESSION_KEY);
			if (savedSession) {
				const { user, timestamp } = JSON.parse(savedSession);
				const now = Date.now();
				const elapsed = now - timestamp;

				// Si la sesión no ha expirado (menos de 13 horas)
				if (elapsed < SESSION_DURATION_MS) {
					setCurrentUser(user);
					setLoading(false);
				} else {
					// Sesión expirada, limpiar
					localStorage.removeItem(SESSION_KEY);
					setLoading(false);
				}
			} else {
				setLoading(false);
			}
		} catch (err) {
			// Si hay error al leer, limpiar y continuar
			localStorage.removeItem(SESSION_KEY);
			setLoading(false);
		}
	}, []);

	const login = useCallback(async (usernameOrUser, password) => {
		setLoading(true);
		setError('');

		try {
			if (typeof usernameOrUser !== 'string') {
				throw new Error('Username debe ser un string');
			}
			if (typeof password !== 'string') {
				throw new Error('Password debe ser un string');
			}

			const user = await authenticateUser(usernameOrUser, password);
			setCurrentUser(user);
			// Guardar sesión con timestamp (13 horas de duración)
			localStorage.setItem(SESSION_KEY, JSON.stringify({
				user: user,
				timestamp: Date.now()
			}));
			return user;
		} catch (err) {
			setError(err.message || 'Error al iniciar sesión. Intenta nuevamente.');
			throw err;
		} finally {
			setLoading(false);
		}
	}, []);

	const logout = useCallback(() => {
		setCurrentUser(null);
		setError('');
		localStorage.removeItem(SESSION_KEY);
	}, []);

	const updateUser = useCallback((updatedUser) => {
		setCurrentUser(updatedUser);
		// Actualizar sesión guardada
		const savedSession = localStorage.getItem(SESSION_KEY);
		if (savedSession) {
			const { timestamp } = JSON.parse(savedSession);
			localStorage.setItem(SESSION_KEY, JSON.stringify({
				user: updatedUser,
				timestamp: timestamp
			}));
		}
	}, []);

	return {
		currentUser,
		loading,
		error,
		login,
		logout,
		updateUser,
	};
}

