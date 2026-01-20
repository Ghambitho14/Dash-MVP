import { useState, useEffect, useMemo } from 'react';
import { getLocalAddress } from '../../utils/utils';

/**
 * Hook para gestionar la lógica del formulario de creación de pedidos
 */
export function useCreateOrderForm(currentUser, localConfigs, clients) {
	const isLocal = currentUser?.role === 'local' && currentUser.local;
	const availableLocales = isLocal 
		? [currentUser.local]
		: localConfigs.map(config => config.name);
	
	const initialLocal = isLocal ? currentUser.local : (localConfigs[0]?.name || '');
	const initialAddress = getLocalAddress(initialLocal, localConfigs);

	const [formData, setFormData] = useState({
		clientName: '',
		selectedClientId: '',
		clientPhone: '',
		pickupAddress: initialAddress,
		deliveryAddress: '',
		local: initialLocal,
		suggestedPrice: '',
		notes: '',
	});

	const [showClientDropdown, setShowClientDropdown] = useState(false);

	// Filtrar clientes según búsqueda y local seleccionado
	const filteredClients = useMemo(() => {
		// Primero filtrar por local
		let localFilteredClients = clients.filter(client => client.local === formData.local);
		
		// Luego filtrar por búsqueda
		if (!formData.clientName.trim()) return localFilteredClients;
		const search = formData.clientName.toLowerCase();
		return localFilteredClients.filter(client => 
			client.name.toLowerCase().includes(search) ||
			client.phone.includes(search) ||
			client.address.toLowerCase().includes(search)
		);
	}, [clients, formData.clientName, formData.local]);

	// Cuando se selecciona un cliente, autocompletar dirección
	const handleSelectClient = (client) => {
		setFormData(prev => ({
			...prev,
			selectedClientId: client.id,
			clientName: client.name,
			clientPhone: '', // Limpiar teléfono cuando se selecciona un cliente registrado
			deliveryAddress: client.address,
		}));
		setShowClientDropdown(false);
	};

	// Cuando se escribe manualmente, limpiar selección
	const handleClientNameChange = (value) => {
		setFormData(prev => ({
			...prev,
			clientName: value,
			selectedClientId: '',
			// No limpiar teléfono al escribir, solo cuando se selecciona un cliente
			deliveryAddress: prev.selectedClientId ? '' : prev.deliveryAddress,
		}));
		setShowClientDropdown(value.trim().length > 0);
	};

	// Cerrar dropdown al hacer click fuera
	useEffect(() => {
		const handleClickOutside = (event) => {
			const target = event.target;
			if (!target.closest('.formulario-crear-pedido-client-wrapper')) {
				setShowClientDropdown(false);
			}
		};

		if (showClientDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [showClientDropdown]);

	useEffect(() => {
		if (isLocal) {
			setFormData(prev => ({ 
				...prev, 
				local: currentUser.local,
				pickupAddress: getLocalAddress(currentUser.local, localConfigs)
			}));
		}
	}, [isLocal, currentUser?.local, localConfigs]);

	const handleLocalChange = (local) => {
		setFormData(prev => ({ 
			...prev, 
			local: local,
			pickupAddress: getLocalAddress(local, localConfigs)
		}));
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		
		return {
			clientName: formData.clientName,
			selectedClientId: formData.selectedClientId,
			clientPhone: formData.selectedClientId ? undefined : formData.clientPhone, // Solo incluir si no hay cliente seleccionado
			pickupAddress: formData.pickupAddress,
			deliveryAddress: formData.deliveryAddress,
			local: formData.local,
			suggestedPrice: parseFloat(formData.suggestedPrice),
			notes: formData.notes || undefined,
		};
	};

	// Validar: si no hay cliente seleccionado, el teléfono es requerido
	const isValid = formData.pickupAddress.trim() !== '' 
		&& formData.deliveryAddress.trim() !== '' 
		&& formData.suggestedPrice !== '' 
		&& parseFloat(formData.suggestedPrice) > 0
		&& (formData.selectedClientId || formData.clientPhone.trim() !== ''); // Teléfono requerido si no hay cliente seleccionado

	const getGridClass = () => {
		if (availableLocales.length <= 3) return 'formulario-crear-pedido-local-grid-3';
		if (availableLocales.length <= 4) return 'formulario-crear-pedido-local-grid-4';
		return 'formulario-crear-pedido-local-grid-5';
	};

	return {
		formData,
		showClientDropdown,
		filteredClients,
		isLocal,
		availableLocales,
		isValid,
		gridClass: getGridClass(),
		setFormData,
		setShowClientDropdown,
		handleSelectClient,
		handleClientNameChange,
		handleLocalChange,
		handleSubmit,
	};
}

