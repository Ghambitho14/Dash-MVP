/**
 * Logger condicional que solo loguea en desarrollo
 * En producción, los logs se omiten excepto los errores críticos
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
	/**
	 * Log normal (solo en desarrollo)
	 */
	log: (...args) => {
		if (isDevelopment) {
			console.log(...args);
		}
	},

	/**
	 * Log de información (solo en desarrollo)
	 */
	info: (...args) => {
		if (isDevelopment) {
			console.info(...args);
		}
	},

	/**
	 * Log de advertencia (solo en desarrollo)
	 */
	warn: (...args) => {
		if (isDevelopment) {
			console.warn(...args);
		}
	},

	/**
	 * Log de error (siempre se muestra, pero en producción podría enviarse a servicio de logging)
	 */
	error: (...args) => {
		console.error(...args);
		// TODO: En producción, enviar a servicio de logging (Sentry, LogRocket, etc.)
	},
};

