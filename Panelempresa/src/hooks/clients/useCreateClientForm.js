import { useState, useEffect, useMemo } from 'react';

/**
 * Hook para gestionar la lógica del formulario de creación/edición de clientes
 */
export function useCreateClientForm(currentUser, localConfigs, initialData) {
	const isLocal = currentUser?.role === 'local' && currentUser.local;
	const availableLocales = useMemo(() => {
		return isLocal 
			? [currentUser.local]
			: localConfigs.map(config => config.name);
	}, [isLocal, currentUser?.local, localConfigs]);
	
	const initialLocal = isLocal ? currentUser.local : (initialData?.local || localConfigs[0]?.name || '');

	const [name, setName] = useState(initialData?.name || '');
	const [phone, setPhone] = useState(initialData?.phone || '');
	const [address, setAddress] = useState(initialData?.address || '');
	const [local, setLocal] = useState(initialData?.local || initialLocal);
	const [errors, setErrors] = useState({});

	// Actualizar valores cuando cambia initialData (modo edición)
	useEffect(() => {
		if (initialData) {
			setName(initialData.name);
			setPhone(initialData.phone);
			setAddress(initialData.address);
			setLocal(initialData.local);
		} else {
			setName('');
			setPhone('');
			setAddress('');
			setLocal(initialLocal);
		}
		setErrors({});
	}, [initialData, initialLocal]);

	const validateForm = () => {
		const newErrors = {};

		if (!name.trim()) {
			newErrors.name = 'El nombre es requerido';
		}

		if (!phone.trim()) {
			newErrors.phone = 'El teléfono es requerido';
		} else if (!/^\+?[\d\s-()]+$/.test(phone.trim())) {
			newErrors.phone = 'El teléfono no es válido';
		}

		if (!address.trim()) {
			newErrors.address = 'La dirección es requerida';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		if (validateForm()) {
			const clientData = {
				name: name.trim(),
				phone: phone.trim(),
				address: address.trim(),
				local: local,
			};
			
			// Reset form solo si no es edición
			if (!initialData) {
				setName('');
				setPhone('');
				setAddress('');
				setLocal(initialLocal);
			}
			setErrors({});
			
			return clientData;
		}
		return null;
	};

	const handlePhoneChange = (value) => {
		// Permitir solo números, espacios, guiones, paréntesis y el signo +
		const cleaned = value.replace(/[^\d\s\-()+]/g, '');
		setPhone(cleaned);
		if (errors.phone) {
			setErrors({ ...errors, phone: '' });
		}
	};

	const clearError = (field) => {
		if (errors[field]) {
			setErrors({ ...errors, [field]: '' });
		}
	};

	return {
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
		handleSubmit,
	};
}

