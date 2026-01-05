import { useState } from 'react';
import { LogIn, Lock, Mail } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { verifyPassword } from '../utils/passwordUtils';
import '../style/Login.css';

export function Login({ onLogin }) {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const validateInputs = () => {
		if (!email.trim()) {
			setError('El correo electrónico es requerido');
			return false;
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
			setError('El correo electrónico no es válido');
			return false;
		}
		if (!password.trim()) {
			setError('La contraseña es requerida');
			return false;
		}
		if (password.length < 6) {
			setError('La contraseña debe tener al menos 6 caracteres');
			return false;
		}
		return true;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');

		// Validar entradas
		if (!validateInputs()) {
			return;
		}

		setLoading(true);

		try {
			// Buscar el superadmin en la base de datos
			const { data, error: queryError } = await supabase
				.from('superadmins')
				.select('*')
				.eq('email', email.trim())
				.eq('active', true)
				.single();

			if (queryError || !data) {
				setError('Credenciales incorrectas');
				setLoading(false);
				return;
			}

			// Verificar contraseña usando bcrypt
			const isPasswordValid = await verifyPassword(password, data.password);
			if (!isPasswordValid) {
				setError('Credenciales incorrectas');
				setLoading(false);
				return;
			}

			// Login exitoso - crear objeto sin password
			const { password: _, ...adminWithoutPassword } = data;
			onLogin(adminWithoutPassword);
		} catch (err) {
			setError('Error al iniciar sesión. Intenta nuevamente.');
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="admin-login">
			<div className="admin-login-container">
				<div className="admin-login-header">
					<LogIn className="admin-login-icon" />
					<h1>Panel de Administración</h1>
					<p>Inicia sesión para continuar</p>
				</div>

				<form onSubmit={handleSubmit} className="admin-login-form">
					{error && (
						<div className="admin-login-error">
							{error}
						</div>
					)}

					<div className="admin-login-field">
						<label htmlFor="email">
							<Mail />
							Correo Electrónico
						</label>
						<input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="tu@email.com"
							required
							disabled={loading}
						/>
					</div>

					<div className="admin-login-field">
						<label htmlFor="password">
							<Lock />
							Contraseña
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="••••••••"
							required
							disabled={loading}
						/>
					</div>

					<button
						type="submit"
						className="admin-login-button"
						disabled={loading}
					>
						{loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
					</button>
				</form>
			</div>
		</div>
	);
}

