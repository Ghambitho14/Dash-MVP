import { useState, useEffect, useMemo } from 'react';

/**
 * Hook para gestionar la lógica del formulario de creación/edición de usuarios
 */
export function useCreateUserForm(localConfigs, existingUsers, initialData) {
	const availableLocales = useMemo(() => localConfigs.map(config => config.name), [localConfigs]);

	const [username, setUsername] = useState(initialData?.username || '');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [name, setName] = useState(initialData?.name || '');
	const [role, setRole] = useState(initialData?.role || 'local');
	const [local, setLocal] = useState(initialData?.local || (availableLocales.length > 0 ? availableLocales[0] : undefined));
	const [errors, setErrors] = useState({});

	useEffect(() => {
		if (initialData) {
			setUsername(initialData.username);
			setPassword('');
			setConfirmPassword('');
			setName(initialData.name);
			setRole(initialData.role);
			setLocal(initialData.local);
		} else {
			setUsername('');
			setPassword('');
			setConfirmPassword('');
			setName('');
			setRole('local');
			setLocal(availableLocales.length > 0 ? availableLocales[0] : undefined);
		}
		setErrors({});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialData?.id, availableLocales.length]);

	const validateForm = () => {
		const newErrors = {};

		if (!username.trim()) {
			newErrors.username = 'El usuario es requerido';
		} else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
			newErrors.username = 'El usuario solo puede contener letras, números y guiones bajos';
		} else if (existingUsers.some(u => u.username.toLowerCase() === username.trim().toLowerCase() && (!initialData || u.id !== initialData.id))) {
			newErrors.username = 'Este usuario ya existe';
		}

		if (!initialData) {
			// Solo validar password en creación, no en edición
			if (!password.trim()) {
				newErrors.password = 'La contraseña es requerida';
			} else if (password.length < 6) {
				newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
			}

			if (!confirmPassword.trim()) {
				newErrors.confirmPassword = 'Confirma la contraseña';
			} else if (password !== confirmPassword) {
				newErrors.confirmPassword = 'Las contraseñas no coinciden';
			}
		} else {
			// En edición, validar password solo si se ingresó
			if (password.trim() || confirmPassword.trim()) {
				if (password.length < 6) {
					newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
				}
				if (password !== confirmPassword) {
					newErrors.confirmPassword = 'Las contraseñas no coinciden';
				}
			}
		}

		if (!name.trim()) {
			newErrors.name = 'El nombre es requerido';
		}

		if (role === 'local') {
			if (availableLocales.length === 0) {
				newErrors.local = 'Primero debes crear locales en "Configurar Locales"';
			} else if (!local) {
				newErrors.local = 'Debes seleccionar un local para usuarios de tipo local';
			}
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		if (validateForm()) {
			const userData = {
				username: username.trim(),
				// Solo incluir password si se proporcionó una nueva (el servicio la hasheará con bcrypt antes de guardarla)
				password: password.trim() || undefined,
				role: role,
				local: role === 'local' ? local : undefined,
				name: name.trim(),
			};
			
			// Reset form solo si no es edición
			if (!initialData) {
				setUsername('');
				setPassword('');
				setConfirmPassword('');
				setName('');
				setRole('local');
				setLocal(availableLocales[0]);
			}
			setErrors({});
			
			return userData;
		}
		return null;
	};

	const handleRoleChange = (newRole) => {
		setRole(newRole);
		if (newRole !== 'local') {
			setLocal(undefined);
			if (errors.local) {
				setErrors({ ...errors, local: '' });
			}
		} else {
			setLocal(availableLocales.length > 0 ? availableLocales[0] : undefined);
		}
	};

	const handleLocalChange = (newLocal) => {
		setLocal(newLocal);
		if (errors.local) {
			setErrors({ ...errors, local: '' });
		}
	};

	const clearError = (field) => {
		if (errors[field]) {
			setErrors({ ...errors, [field]: '' });
		}
	};

	const getGridClass = () => {
		if (availableLocales.length <= 3) return 'formulario-crear-usuario-local-grid-3';
		if (availableLocales.length <= 4) return 'formulario-crear-usuario-local-grid-4';
		return 'formulario-crear-usuario-local-grid-5';
	};

	return {
		username,
		password,
		confirmPassword,
		name,
		role,
		local,
		errors,
		availableLocales,
		gridClass: getGridClass(),
		setUsername,
		setPassword,
		setConfirmPassword,
		setName,
		handleRoleChange,
		handleLocalChange,
		clearError,
		handleSubmit,
	};
}

