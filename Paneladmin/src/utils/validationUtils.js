/**
 * Utilidades de validación para formularios
 */

import { supabase } from './supabase';

/**
 * Valida un RUT chileno (formato y dígito verificador)
 * @param {string} rut - RUT a validar (puede tener puntos y guión)
 * @returns {boolean} - true si el RUT es válido
 */
export function validateRUT(rut) {
	if (!rut || typeof rut !== 'string') {
		return false;
	}

	// Limpiar el RUT (quitar puntos y espacios, convertir a mayúsculas)
	const cleanRUT = rut.replace(/\./g, '').replace(/\s/g, '').toUpperCase();

	// Verificar formato básico (debe tener al menos 8 caracteres y máximo 10)
	if (cleanRUT.length < 8 || cleanRUT.length > 10) {
		return false;
	}

	// Separar número y dígito verificador
	const match = cleanRUT.match(/^(\d{7,9})([0-9K])$/);
	if (!match) {
		return false;
	}

	const number = match[1];
	const dv = match[2];

	// Calcular dígito verificador
	let sum = 0;
	let multiplier = 2;

	// Recorrer el número de derecha a izquierda
	for (let i = number.length - 1; i >= 0; i--) {
		sum += parseInt(number[i]) * multiplier;
		multiplier = multiplier === 7 ? 2 : multiplier + 1;
	}

	const remainder = sum % 11;
	let calculatedDV = 11 - remainder;

	// Casos especiales
	if (calculatedDV === 11) {
		calculatedDV = '0';
	} else if (calculatedDV === 10) {
		calculatedDV = 'K';
	} else {
		calculatedDV = calculatedDV.toString();
	}

	// Comparar dígito verificador
	return calculatedDV === dv;
}

/**
 * Formatea un RUT chileno (agrega puntos y guión)
 * @param {string} rut - RUT sin formato
 * @returns {string} - RUT formateado
 */
export function formatRUT(rut) {
	if (!rut) return '';

	// Limpiar el RUT
	const cleanRUT = rut.replace(/\./g, '').replace(/\-/g, '').replace(/\s/g, '').toUpperCase();

	if (cleanRUT.length < 2) return cleanRUT;

	// Separar número y dígito verificador
	const match = cleanRUT.match(/^(\d+)([0-9K])$/);
	if (!match) return cleanRUT;

	const number = match[1];
	const dv = match[2];

	// Agregar puntos cada 3 dígitos desde la derecha
	const formattedNumber = number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

	return `${formattedNumber}-${dv}`;
}

/**
 * Valida un número de teléfono chileno
 * Acepta formatos: +56912345678, 56912345678, 912345678, 9 1234 5678
 * @param {string} phone - Teléfono a validar
 * @returns {boolean} - true si el teléfono es válido
 */
export function validateChileanPhone(phone) {
	if (!phone || typeof phone !== 'string') {
		return false;
	}

	// Limpiar el teléfono (quitar espacios, guiones, paréntesis)
	const cleanPhone = phone.replace(/\s/g, '').replace(/\-/g, '').replace(/\(/g, '').replace(/\)/g, '');

	// Patrones válidos:
	// +56912345678 (con código de país y +)
	// 56912345678 (con código de país sin +)
	// 912345678 (solo número móvil)
	const phoneRegex = /^(\+?56)?9\d{8}$/;

	return phoneRegex.test(cleanPhone);
}

/**
 * Formatea un número de teléfono chileno
 * @param {string} phone - Teléfono sin formato
 * @returns {string} - Teléfono formateado (+56 9 1234 5678)
 */
export function formatChileanPhone(phone) {
	if (!phone) return '';

	// Limpiar el teléfono
	const cleanPhone = phone.replace(/\s/g, '').replace(/\-/g, '').replace(/\(/g, '').replace(/\)/g, '').replace(/\+/g, '');

	// Si empieza con 56, quitarlo
	let number = cleanPhone.startsWith('56') ? cleanPhone.substring(2) : cleanPhone;

	// Si no empieza con 9, agregarlo
	if (!number.startsWith('9')) {
		number = '9' + number;
	}

	// Formatear: +56 9 1234 5678
	if (number.length === 9) {
		return `+56 ${number[0]} ${number.substring(1, 5)} ${number.substring(5)}`;
	}

	return phone; // Si no tiene el formato esperado, devolver original
}

/**
 * Valida un email
 * @param {string} email - Email a validar
 * @returns {boolean} - true si el email es válido
 */
export function validateEmail(email) {
	if (!email || typeof email !== 'string') {
		return false;
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email.trim());
}

/**
 * Verifica si un RUT ya existe en drivers
 * @param {string} documentId - RUT a verificar
 * @param {number} excludeDriverId - ID de driver a excluir (para edición)
 * @returns {Promise<{exists: boolean, message: string}>}
 */
export async function checkRUTExistsInDrivers(documentId, excludeDriverId = null) {

	let query = supabase
		.from('drivers')
		.select('id')
		.eq('document_id', documentId);

	if (excludeDriverId) {
		query = query.neq('id', excludeDriverId);
	}

	const { data: existingDriver, error: driverError } = await query.maybeSingle();

	if (driverError) {
		throw new Error('Error al verificar el RUT. Intenta nuevamente.');
	}

	if (existingDriver) {
		return { exists: true, message: 'Este RUT ya está registrado como repartidor' };
	}

	return { exists: false, message: '' };
}

/**
 * Verifica si un email ya existe en drivers
 * @param {string} email - Email a verificar
 * @param {number} excludeDriverId - ID de driver a excluir (para edición)
 * @returns {Promise<{exists: boolean, message: string}>}
 */
export async function checkEmailExistsInDrivers(email, excludeDriverId = null) {
	if (!email || !email.trim()) {
		return { exists: false, message: '' }; // Email es opcional
	}

	let query = supabase
		.from('drivers')
		.select('id')
		.eq('email', email.trim().toLowerCase());

	if (excludeDriverId) {
		query = query.neq('id', excludeDriverId);
	}

	const { data: existingDriver, error: driverError } = await query.maybeSingle();

	if (driverError) {
		throw new Error('Error al verificar el email. Intenta nuevamente.');
	}

	if (existingDriver) {
		return { exists: true, message: 'Este email ya está registrado como repartidor' };
	}

	return { exists: false, message: '' };
}

/**
 * Verifica si un teléfono ya existe en drivers
 * @param {string} phone - Teléfono a verificar
 * @param {number} excludeDriverId - ID de driver a excluir (para edición)
 * @returns {Promise<{exists: boolean, message: string}>}
 */
export async function checkPhoneExistsInDrivers(phone, excludeDriverId = null) {
	if (!phone || !phone.trim()) {
		return { exists: false, message: '' };
	}

	// Normalizar teléfono (quitar espacios, guiones, etc.)
	const normalizedPhone = phone.replace(/\s/g, '').replace(/\-/g, '').replace(/\(/g, '').replace(/\)/g, '');

	let query = supabase
		.from('drivers')
		.select('id, phone');

	if (excludeDriverId) {
		query = query.neq('id', excludeDriverId);
	}

	const { data: drivers, error: driverError } = await query;

	if (driverError) {
		throw new Error('Error al verificar el teléfono. Intenta nuevamente.');
	}

	// Comparar teléfonos normalizados
	if (drivers && drivers.length > 0) {
		for (const driver of drivers) {
			const driverPhoneNormalized = driver.phone?.replace(/\s/g, '').replace(/\-/g, '').replace(/\(/g, '').replace(/\)/g, '') || '';
			if (driverPhoneNormalized === normalizedPhone || 
				driverPhoneNormalized.endsWith(normalizedPhone) || 
				normalizedPhone.endsWith(driverPhoneNormalized)) {
				return { exists: true, message: 'Este teléfono ya está registrado como repartidor' };
			}
		}
	}

	return { exists: false, message: '' };
}

