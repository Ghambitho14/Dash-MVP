import { useState } from 'react';

/**
 * Hook para gestionar la lógica de configuración de locales
 */
export function useLocalSettings(initialLocals) {
	const [locals, setLocals] = useState(initialLocals);

	const handleAddLocal = () => {
		const newLocalNumber = locals.length + 1;
		setLocals([
			...locals,
			{
				name: `Local ${newLocalNumber}`,
				address: '',
			},
		]);
	};

	const handleDeleteLocal = (index) => {
		// La confirmación se maneja en el componente LocalSettings
		setLocals(locals.filter((_, i) => i !== index));
	};

	const handleUpdateLocal = (index, field, value) => {
		setLocals(locals.map((local, i) => 
			i === index ? { ...local, [field]: value } : local
		));
	};

	const handleSave = (onSave, onClose) => {
		onSave(locals);
		onClose();
	};

	return {
		locals,
		handleAddLocal,
		handleDeleteLocal,
		handleUpdateLocal,
		handleSave,
	};
}

