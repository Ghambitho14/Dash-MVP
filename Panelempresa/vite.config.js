import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	// Leer .env desde la raíz del proyecto
	envDir: path.resolve(__dirname, '..'),
	// Base path: raíz (explícito para consistencia)
	base: '/',
	build: {
		outDir: 'dist',
		assetsDir: 'assets',
	},
	optimizeDeps: {
		include: ['leaflet', 'react-leaflet'],
	},
});

