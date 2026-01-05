/**
 * Utilidad de almacenamiento que usa Capacitor Preferences en apps nativas
 * y localStorage como fallback en web
 */

import { getCapacitorModules } from './utils';
import { logger } from './logger';

let Capacitor = null;
let Preferences = null;

// Intentar cargar Capacitor solo si está disponible
const initCapacitor = async () => {
	if (typeof window === 'undefined') return;
	
	// Si ya está inicializado, no hacer nada
	if (Capacitor && Preferences) return;
	
	// Usar la utilidad unificada de utils.js
	const modules = await getCapacitorModules();
	if (modules) {
		Capacitor = modules.Capacitor;
		// Intentar cargar Preferences usando variable de string para evitar análisis estático
		try {
			const preferencesModuleName = '@capacitor/preferences';
			const preferencesModule = await import(/* @vite-ignore */ preferencesModuleName);
			Preferences = preferencesModule.Preferences;
		} catch (err) {
			// Preferences no disponible
			Preferences = null;
		}
	} else {
		Capacitor = null;
		Preferences = null;
	}
};

/**
 * Verifica si estamos en una plataforma nativa
 */
const isNativePlatform = () => {
	if (typeof window === 'undefined') return false;
	
	// Si Capacitor ya está cargado, usar su método
	if (Capacitor) {
		return Capacitor.isNativePlatform();
	}
	
	// Verificar si window.Capacitor existe (se carga automáticamente en apps nativas)
	return !!(window.Capacitor && window.Capacitor.isNativePlatform?.());
};

/**
 * Guarda un valor en el almacenamiento
 * @param {string} key - Clave
 * @param {string} value - Valor (debe ser string)
 */
export const setStorageItem = async (key, value) => {
	await initCapacitor();
	
	if (isNativePlatform() && Preferences) {
		// Usar Capacitor Preferences en apps nativas
		try {
			await Preferences.set({ key, value });
		} catch (err) {
			logger.error('Error guardando en Preferences:', err);
			// Fallback a localStorage
			localStorage.setItem(key, value);
		}
	} else {
		// Usar localStorage en web
		localStorage.setItem(key, value);
	}
};

/**
 * Obtiene un valor del almacenamiento
 * @param {string} key - Clave
 * @returns {Promise<string|null>} Valor o null si no existe
 */
export const getStorageItem = async (key) => {
	await initCapacitor();
	
	if (isNativePlatform() && Preferences) {
		// Usar Capacitor Preferences en apps nativas
		try {
			const result = await Preferences.get({ key });
			return result.value;
		} catch (err) {
			logger.error('Error leyendo de Preferences:', err);
			// Fallback a localStorage
			return localStorage.getItem(key);
		}
	} else {
		// Usar localStorage en web
		return localStorage.getItem(key);
	}
};

/**
 * Elimina un valor del almacenamiento
 * @param {string} key - Clave
 */
export const removeStorageItem = async (key) => {
	await initCapacitor();
	
	if (isNativePlatform() && Preferences) {
		// Usar Capacitor Preferences en apps nativas
		try {
			await Preferences.remove({ key });
		} catch (err) {
			logger.error('Error eliminando de Preferences:', err);
			// Fallback a localStorage
			localStorage.removeItem(key);
		}
	} else {
		// Usar localStorage en web
		localStorage.removeItem(key);
	}
};

/**
 * Guarda un objeto JSON en el almacenamiento
 * @param {string} key - Clave
 * @param {object} value - Objeto a guardar
 */
export const setStorageObject = async (key, value) => {
	const jsonString = JSON.stringify(value);
	await setStorageItem(key, jsonString);
};

/**
 * Obtiene un objeto JSON del almacenamiento
 * @param {string} key - Clave
 * @returns {Promise<object|null>} Objeto o null si no existe
 */
export const getStorageObject = async (key) => {
	const jsonString = await getStorageItem(key);
	if (!jsonString) return null;
	
	try {
		return JSON.parse(jsonString);
	} catch (err) {
		logger.error('Error parseando JSON del storage:', err);
		return null;
	}
};

