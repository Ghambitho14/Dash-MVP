import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		// Plugin para ignorar imports de Capacitor durante el análisis estático
		{
			name: 'ignore-capacitor-imports',
			enforce: 'pre',
			resolveId(id) {
				// Si Vite intenta resolver un módulo de Capacitor durante el análisis estático,
				// retornar null para que Vite lo ignore y lo maneje en runtime
				if (id.startsWith('@capacitor/')) {
					// Retornar null hace que Vite no intente resolverlo estáticamente
					// El import dinámico se manejará en runtime
					return null;
				}
			}
		}
	],
	// Leer .env desde la raíz del proyecto
	envDir: path.resolve(__dirname, '..'),
	// Para APK no necesitamos base path, solo para web
	// base: '/driver/',
	build: {
		outDir: 'dist',
		assetsDir: 'assets',
	},
	// Optimizar dependencias para evitar problemas con imports dinámicos
	optimizeDeps: {
		exclude: ['@capacitor/core', '@capacitor/geolocation', '@capacitor/preferences']
	}
});

