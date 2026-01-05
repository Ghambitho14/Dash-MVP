import { useState } from 'react';
import { Building2, Lock, User as UserIcon, LogIn } from 'lucide-react';
import { useLogin } from '../../hooks/auth/useLogin';
import { RegistrationForm } from './RegistrationForm';
import '../../styles/Components/Login.css';

export function Login({ onLogin }) {
	const [showRegistration, setShowRegistration] = useState(false);
	const {
		username,
		password,
		error,
		loading,
		setUsername,
		setPassword,
		handleSubmit,
	} = useLogin(onLogin);

	return (
		<div className="login-contenedor">
			<div className="login-envoltorio">
				{/* Lado izquierdo - Ilustración */}
				<div className="login-marca-lado">
					<div className="login-ilustracion">
						<div className="login-ilustracion-escena">
							{/* Montañas de fondo */}
							<div className="login-montana-atras"></div>
							<div className="login-montana"></div>
							
							{/* Nubes */}
							<div className="login-nube"></div>
							<div className="login-nube"></div>
							
							{/* Estrellas */}
							<div className="login-estrellas">
								<div className="login-estrella"></div>
								<div className="login-estrella"></div>
								<div className="login-estrella"></div>
								<div className="login-estrella"></div>
								<div className="login-estrella"></div>
							</div>
							
							{/* Luna/Sol */}
							<div className="login-celestial"></div>
						</div>
					</div>

					<div className="login-ilustracion-texto">
						<p className="login-ilustracion-titulo">Que tengas unas excelentes ventas.</p>
						<p className="login-ilustracion-subtitulo">Planifica tus pedidos con dash</p>
					</div>
				</div>

				{/* Lado derecho - Formulario */}
				<div className="login-formulario-lado">
					<div className="login-encabezado">
						<h1 className="login-saludo">
							¡Hola!
							<span className="login-saludo-destacado">Buen día</span>
						</h1>
						<p className="login-subtitulo">Ingresa tus credenciales para acceder</p>
					</div>

					<div className="login-formulario-contenedor">
						<form onSubmit={handleSubmit} className="login-formulario">
							<div className="login-formulario-grupo">
								<label className="login-etiqueta">
									<div className="login-etiqueta-contenido">
										<UserIcon style={{ width: '1rem', height: '1rem' }} />
										Usuario
									</div>
								</label>
								<input
									type="text"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									className="login-entrada"
									placeholder="Ingresa tu usuario"
									required
								/>
							</div>

							<div className="login-formulario-grupo">
								<label className="login-etiqueta">
									<div className="login-etiqueta-contenido">
										<Lock style={{ width: '1rem', height: '1rem' }} />
										Contraseña
									</div>
								</label>
								<input
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="login-entrada"
									placeholder="Ingresa tu contraseña"
									required
								/>
							</div>

							<div className="login-olvidaste-contraseña">
								<span className="login-placeholder" title="Funcionalidad en desarrollo">¿Olvidaste tu contraseña? (Próximamente)</span>
							</div>

							{error && (
								<div className="login-error">
									{error}
								</div>
							)}

							<button
								type="submit"
								className="login-boton"
								disabled={loading}
							>
								<LogIn style={{ width: '1.25rem', height: '1.25rem' }} />
								{loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
							</button>
						</form>

						<div className="login-crear-cuenta">
							<span className="login-crear-cuenta-texto">¿No tienes cuenta?</span>
							<button
								type="button"
								onClick={() => setShowRegistration(true)}
								className="login-crear-cuenta-enlace"
							>
								Crear cuenta
							</button>
						</div>
					</div>
				</div>
			</div>

			<RegistrationForm
				isOpen={showRegistration}
				onClose={() => setShowRegistration(false)}
			/>
		</div>
	);
}