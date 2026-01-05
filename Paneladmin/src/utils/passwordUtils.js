import bcrypt from 'bcryptjs';

/**
 * Hashea una contraseña usando bcrypt
 * @param {string} password - Contraseña a hashear
 * @returns {Promise<string>} - Contraseña hasheada con bcrypt
 */
export async function hashPassword(password) {
	if (!password || typeof password !== 'string') {
		throw new Error('La contraseña debe ser un string no vacío');
	}
	const saltRounds = 10;
	return await bcrypt.hash(password, saltRounds);
}

/**
 * Verifica si una contraseña coincide con un hash bcrypt
 * @param {string} password - Contraseña a verificar
 * @param {string} hashedPassword - Contraseña hasheada con bcrypt
 * @returns {Promise<boolean>} - true si coinciden, false si no
 */
export async function verifyPassword(password, hashedPassword) {
	if (!password || !hashedPassword) {
		return false;
	}
	
	// Verificar que el hash sea válido (debe empezar con $2a$, $2b$, o $2y$)
	if (!hashedPassword.startsWith('$2')) {
		// Si no es un hash bcrypt válido, rechazar la autenticación
		console.error('⚠️ Error: La contraseña almacenada no está hasheada correctamente');
		return false;
	}
	
	// Comparar usando bcrypt
	return await bcrypt.compare(password, hashedPassword);
}

