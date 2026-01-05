import { supabase } from '../utils/supabase';
import { hashPassword } from '../utils/passwordUtils';
import { logger } from '../utils/logger';
import { validateRUT, validateChileanPhone, validateEmail, validateAge, checkRUTExists, checkEmailExists, checkPhoneExists } from '../utils/validationUtils';

/**
 * Crea una solicitud de registro de nuevo repartidor
 */
export async function createDriverRegistrationRequest(requestData) {
	try {
		// Validar RUT
		if (!validateRUT(requestData.documentId)) {
			throw new Error('El RUT ingresado no es válido. Verifica el formato y el dígito verificador.');
		}

		// Validar teléfono chileno
		if (!validateChileanPhone(requestData.phone)) {
			throw new Error('El teléfono ingresado no es válido. Debe ser un número móvil chileno (ej: +56912345678 o 912345678).');
		}

		// Validar email si se proporciona
		if (requestData.email && requestData.email.trim() && !validateEmail(requestData.email)) {
			throw new Error('El email ingresado no es válido.');
		}

		// Validar mayoría de edad
		if (!validateAge(requestData.birthDate)) {
			throw new Error('Debes ser mayor de edad (18 años) para registrarte');
		}

		// Verificar que el RUT no esté duplicado
		const rutCheck = await checkRUTExists(requestData.documentId);
		if (rutCheck.exists) {
			throw new Error(rutCheck.message);
		}

		// Verificar que el email no esté duplicado (si se proporciona)
		if (requestData.email && requestData.email.trim()) {
			const emailCheck = await checkEmailExists(requestData.email);
			if (emailCheck.exists) {
				throw new Error(emailCheck.message);
			}
		}

		// Verificar que el teléfono no esté duplicado
		const phoneCheck = await checkPhoneExists(requestData.phone);
		if (phoneCheck.exists) {
			throw new Error(phoneCheck.message);
		}

		// Validar que el username no exista en drivers
		const { data: existingDriver, error: driverCheckError } = await supabase
			.from('drivers')
			.select('id')
			.eq('username', requestData.username)
			.maybeSingle();

		if (driverCheckError) {
			logger.error('Error verificando username en drivers:', driverCheckError);
			throw new Error('Error al verificar el nombre de usuario. Intenta nuevamente.');
		}

		if (existingDriver) {
			throw new Error('El nombre de usuario ya está en uso');
		}

		// Validar que no haya una solicitud pendiente con el mismo username
		const { data: existingRequest, error: requestCheckError } = await supabase
			.from('driver_registration_requests')
			.select('id, status')
			.eq('username', requestData.username)
			.in('status', ['pending'])
			.maybeSingle();

		if (requestCheckError) {
			logger.error('Error verificando solicitud pendiente:', requestCheckError);
			throw new Error('Error al verificar solicitudes. Intenta nuevamente.');
		}

		if (existingRequest) {
			throw new Error('Ya existe una solicitud pendiente con este nombre de usuario');
		}

		// Hashear contraseña
		const hashedPassword = await hashPassword(requestData.password);

		// Crear solicitud
		const { data, error } = await supabase
			.from('driver_registration_requests')
			.insert({
				username: requestData.username,
				password: hashedPassword,
				name: requestData.name,
				document_id: requestData.documentId,
				birth_date: requestData.birthDate,
				phone: requestData.phone,
				email: requestData.email || null,
				address: requestData.address || null,
				vehicle_type: requestData.vehicleType,
				vehicle_brand: requestData.vehicleBrand || null,
				vehicle_model: requestData.vehicleModel || null,
				vehicle_year: requestData.vehicleYear || null,
				vehicle_plate: requestData.vehiclePlate || null,
				vehicle_photo_url: requestData.vehiclePhotoUrl || null,
				helmet_photo_url: requestData.helmetPhotoUrl || null,
				insurance_valid: requestData.insuranceValid || false,
				id_card_photo_url: requestData.idCardPhotoUrl || null,
				driver_license_photo_url: requestData.driverLicensePhotoUrl || null,
				criminal_record_photo_url: requestData.criminalRecordPhotoUrl || null,
				status: 'pending',
			})
			.select()
			.single();

		if (error) {
			logger.error('Error creando solicitud de registro de repartidor:', error);
			throw new Error('Error al enviar la solicitud. Intenta nuevamente.');
		}

		return data;
	} catch (err) {
		logger.error('Error en createDriverRegistrationRequest:', err);
		throw err;
	}
}

