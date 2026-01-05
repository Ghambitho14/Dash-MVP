import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import './style/App.css';

const SESSION_KEY = 'panel_admin_session';
const SESSION_DURATION_MS = 13 * 60 * 60 * 1000; // 13 horas en milisegundos

function App() {
	const [admin, setAdmin] = useState(null);
	const [loading, setLoading] = useState(true); // Iniciar en true para verificar sesión

	// Verificar sesión guardada al cargar
	useEffect(() => {
		try {
			const savedSession = localStorage.getItem(SESSION_KEY);
			if (savedSession) {
				const { admin: savedAdmin, timestamp } = JSON.parse(savedSession);
				const now = Date.now();
				const elapsed = now - timestamp;

				// Si la sesión no ha expirado (menos de 13 horas)
				if (elapsed < SESSION_DURATION_MS) {
					setAdmin(savedAdmin);
					setLoading(false);
				} else {
					// Sesión expirada, limpiar
					localStorage.removeItem(SESSION_KEY);
					setLoading(false);
				}
			} else {
				setLoading(false);
			}
		} catch (err) {
			// Si hay error al leer, limpiar y continuar
			localStorage.removeItem(SESSION_KEY);
			setLoading(false);
		}
	}, []);

	const handleLogin = (adminData) => {
		setAdmin(adminData);
		// Guardar sesión con timestamp
		localStorage.setItem(SESSION_KEY, JSON.stringify({
			admin: adminData,
			timestamp: Date.now()
		}));
	};

	const handleLogout = () => {
		setAdmin(null);
		localStorage.removeItem(SESSION_KEY);
	};

	// Mostrar loading mientras se verifica la sesión
	if (loading) {
		return (
			<div className="app">
				<div style={{ 
					display: 'flex', 
					justifyContent: 'center', 
					alignItems: 'center', 
					height: '100vh' 
				}}>
					<div>Cargando...</div>
				</div>
			</div>
		);
	}

	return (
		<div className="app">
			<Toaster />
			{admin ? (
				<Dashboard admin={admin} onLogout={handleLogout} />
			) : (
				<Login onLogin={handleLogin} />
			)}
		</div>
	);
}

export default App;
