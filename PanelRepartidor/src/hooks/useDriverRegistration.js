import { useState } from 'react';
import { createDriverRegistrationRequest } from '../services/driverRegistrationService';
import { logger } from '../utils/logger';
import { validateRUT, validateChileanPhone, validateEmail, validateAge, formatRUT, formatChileanPhone, checkRUTExists, checkEmailExists, checkPhoneExists } from '../utils/validationUtils';

/**
 * Hook para gestionar la lógica de registro de repartidor
 */
export function useDriverRegistration() {
	const [formData, setFormData] = useState({
		// Datos personales
		username: '',
		password: '',
		confirmPassword: '',
		name: '',
		documentId: '',
		birthDate: '',
		phone: '',
		email: '',
		address: '',
		
		// Datos del vehículo
		vehicleType: '',
		vehicleBrand: '',
		vehicleModel: '',
		vehicleYear: '',
		vehiclePlate: '',
		vehiclePhotoUrl: '',
		helmetPhotoUrl: '',
		insuranceValid: false,
		
		// Documentación
		idCardPhotoUrl: '',
		driverLicensePhotoUrl: '',
		criminalRecordPhotoUrl: '',
	});
	
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [currentStep, setCurrentStep] = useState(1); // 1: Datos personales, 2: Vehículo, 3: Documentación
	const [fieldErrors, setFieldErrors] = useState({});
	const [validating, setValidating] = useState({});

	const updateField = async (field, value) => {
		// Formatear valores según el campo
		let formattedValue = value;
		if (field === 'documentId' && value) {
			// Formatear RUT mientras se escribe
			formattedValue = formatRUT(value);
		} else if (field === 'phone' && value) {
			// Formatear teléfono mientras se escribe (solo limpiar, no formatear completamente)
			formattedValue = value.replace(/\s/g, '').replace(/\-/g, '').replace(/\(/g, '').replace(/\)/g, '');
		}

		setFormData(prev => ({ ...prev, [field]: formattedValue }));
		setError('');
		
		// Limpiar error del campo específico
		if (fieldErrors[field]) {
			setFieldErrors(prev => {
				const newErrors = { ...prev };
				delete newErrors[field];
				return newErrors;
			});
		}

		// Validar en tiempo real según el campo
		if (field === 'documentId' && formattedValue) {
			validateFieldInRealTime('documentId', formattedValue);
		} else if (field === 'email' && formattedValue) {
			validateFieldInRealTime('email', formattedValue);
		} else if (field === 'phone' && formattedValue) {
			validateFieldInRealTime('phone', formattedValue);
		}
	};

	const validateFieldInRealTime = async (field, value) => {
		if (!value || !value.trim()) {
			return;
		}

		setValidating(prev => ({ ...prev, [field]: true }));

		try {
			if (field === 'documentId') {
				if (!validateRUT(value)) {
					setFieldErrors(prev => ({ ...prev, documentId: 'El RUT ingresado no es válido. Verifica el formato y el dígito verificador.' }));
				} else {
					const rutCheck = await checkRUTExists(value);
					if (rutCheck.exists) {
						setFieldErrors(prev => ({ ...prev, documentId: rutCheck.message }));
					} else {
						setFieldErrors(prev => {
							const newErrors = { ...prev };
							delete newErrors.documentId;
							return newErrors;
						});
					}
				}
			} else if (field === 'email') {
				if (!validateEmail(value)) {
					setFieldErrors(prev => ({ ...prev, email: 'El email ingresado no es válido.' }));
				} else {
					const emailCheck = await checkEmailExists(value);
					if (emailCheck.exists) {
						setFieldErrors(prev => ({ ...prev, email: emailCheck.message }));
					} else {
						setFieldErrors(prev => {
							const newErrors = { ...prev };
							delete newErrors.email;
							return newErrors;
						});
					}
				}
			} else if (field === 'phone') {
				if (!validateChileanPhone(value)) {
					setFieldErrors(prev => ({ ...prev, phone: 'El teléfono debe ser un número móvil chileno (ej: +56912345678 o 912345678).' }));
				} else {
					const phoneCheck = await checkPhoneExists(value);
					if (phoneCheck.exists) {
						setFieldErrors(prev => ({ ...prev, phone: phoneCheck.message }));
					} else {
						setFieldErrors(prev => {
							const newErrors = { ...prev };
							delete newErrors.phone;
							return newErrors;
						});
					}
				}
			}
		} catch (err) {
			logger.error(`Error validando ${field}:`, err);
		} finally {
			setValidating(prev => {
				const newValidating = { ...prev };
				delete newValidating[field];
				return newValidating;
			});
		}
	};

	const validateStep1 = () => {
		setError('');
		const errors = {};

		if (!formData.name.trim()) {
			errors.name = 'El nombre completo es requerido';
		}

		if (!formData.documentId.trim()) {
			errors.documentId = 'El RUT es requerido';
		} else if (!validateRUT(formData.documentId)) {
			errors.documentId = 'El RUT ingresado no es válido. Verifica el formato y el dígito verificador.';
		} else if (fieldErrors.documentId) {
			errors.documentId = fieldErrors.documentId;
		}

		if (!formData.birthDate) {
			errors.birthDate = 'La fecha de nacimiento es requerida';
		} else {
			// Validar mayoría de edad usando la función centralizada
			// Importar al inicio del archivo para mejor rendimiento
			if (!validateAge(formData.birthDate)) {
				errors.birthDate = 'Debes ser mayor de edad (18 años) para registrarte';
			}
		}

		if (!formData.phone.trim()) {
			errors.phone = 'El teléfono es requerido';
		} else if (!validateChileanPhone(formData.phone)) {
			errors.phone = 'El teléfono debe ser un número móvil chileno (ej: +56912345678 o 912345678).';
		} else if (fieldErrors.phone) {
			errors.phone = fieldErrors.phone;
		}

		if (formData.email && formData.email.trim()) {
			if (!validateEmail(formData.email)) {
				errors.email = 'El email ingresado no es válido.';
			} else if (fieldErrors.email) {
				errors.email = fieldErrors.email;
			}
		}

		if (!formData.username.trim()) {
			errors.username = 'El nombre de usuario es requerido';
		} else if (formData.username.length < 3) {
			errors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
		}

		if (!formData.password) {
			errors.password = 'La contraseña es requerida';
		} else if (formData.password.length < 6) {
			errors.password = 'La contraseña debe tener al menos 6 caracteres';
		}

		if (!formData.confirmPassword) {
			errors.confirmPassword = 'Debes confirmar la contraseña';
		} else if (formData.password !== formData.confirmPassword) {
			errors.confirmPassword = 'Las contraseñas no coinciden';
		}

		if (Object.keys(errors).length > 0) {
			setFieldErrors(errors);
			setError('Por favor corrige los errores en el formulario');
			return false;
		}

		return true;
	};

	const validateStep2 = () => {
		if (!formData.vehicleType) {
			setError('El tipo de vehículo es requerido');
			return false;
		}
		if (!formData.vehiclePhotoUrl) {
			setError('La foto del vehículo es requerida');
			return false;
		}
		if (formData.vehicleType === 'bicicleta' && !formData.helmetPhotoUrl) {
			setError('La foto del casco es requerida para bicicleta');
			return false;
		}
		return true;
	};

	const validateStep3 = () => {
		// Las fotos son opcionales en el formulario, pero recomendadas
		// El administrador puede rechazar si faltan
		return true;
	};

	const handleNextStep = () => {
		setError('');
		if (currentStep === 1 && !validateStep1()) {
			return;
		}
		if (currentStep === 2 && !validateStep2()) {
			return;
		}
		if (currentStep < 3) {
			setCurrentStep(currentStep + 1);
		}
	};

	const handlePreviousStep = () => {
		setError('');
		if (currentStep > 1) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess(false);

		if (!validateStep3()) {
			return;
		}

		setLoading(true);

		try {
			await createDriverRegistrationRequest({
				username: formData.username.trim().toLowerCase(),
				password: formData.password,
				name: formData.name.trim(),
				documentId: formData.documentId.trim(),
				birthDate: formData.birthDate,
				phone: formData.phone.trim(),
				email: formData.email.trim() || null,
				address: formData.address.trim() || null,
				vehicleType: formData.vehicleType,
				vehicleBrand: formData.vehicleBrand.trim() || null,
				vehicleModel: formData.vehicleModel.trim() || null,
				vehicleYear: formData.vehicleYear ? parseInt(formData.vehicleYear) : null,
				vehiclePlate: formData.vehiclePlate.trim() || null,
				vehiclePhotoUrl: formData.vehiclePhotoUrl || null,
				helmetPhotoUrl: formData.helmetPhotoUrl || null,
				insuranceValid: formData.insuranceValid,
				idCardPhotoUrl: formData.idCardPhotoUrl || null,
				driverLicensePhotoUrl: formData.driverLicensePhotoUrl || null,
				criminalRecordPhotoUrl: formData.criminalRecordPhotoUrl || null,
			});

			setSuccess(true);
			// Limpiar formulario
			setFormData({
				username: '',
				password: '',
				confirmPassword: '',
				name: '',
				documentId: '',
				birthDate: '',
				phone: '',
				email: '',
				address: '',
				vehicleType: '',
				vehicleBrand: '',
				vehicleModel: '',
				vehicleYear: '',
				vehiclePlate: '',
				vehiclePhotoUrl: '',
				helmetPhotoUrl: '',
				insuranceValid: false,
				idCardPhotoUrl: '',
				driverLicensePhotoUrl: '',
				criminalRecordPhotoUrl: '',
			});
			setCurrentStep(1);
		} catch (err) {
			setError(err.message || 'Error al enviar la solicitud. Intenta nuevamente.');
			logger.error('Error en registro de repartidor:', err);
		} finally {
			setLoading(false);
		}
	};

	const resetForm = () => {
		setFormData({
			username: '',
			password: '',
			confirmPassword: '',
			name: '',
			documentId: '',
			birthDate: '',
			phone: '',
			email: '',
			address: '',
			vehicleType: '',
			vehicleBrand: '',
			vehicleModel: '',
			vehicleYear: '',
			vehiclePlate: '',
			vehiclePhotoUrl: '',
			insuranceValid: false,
			idCardPhotoUrl: '',
			driverLicensePhotoUrl: '',
			criminalRecordPhotoUrl: '',
		});
		setError('');
		setFieldErrors({});
		setValidating({});
		setSuccess(false);
		setCurrentStep(1);
	};

	return {
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
	};
}

