import { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { verifyPassword } from '../../utils/passwordUtils';
import { Bike, Lock, User as UserIcon, ArrowRight } from 'lucide-react';
import { logger } from '../../utils/logger';
import { DriverRegistrationForm } from './DriverRegistrationForm';
import '../../styles/Components/Login.css';

export function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setLoading(true);

    try {
      // Validar que los campos no estén vacíos
      if (!username.trim() || !password.trim()) {
        setError('Por favor completa todos los campos');
        return;
      }

      const { data, error: queryError } = await supabase
        .from('drivers')
        .select('id, username, name, phone, email, active, company_id, password')
        .eq('username', username.trim())
        .eq('active', true)
        .single();

      if (queryError) {
        // Si es un error de "no encontrado", mostrar mensaje genérico
        if (queryError.code === 'PGRST116') {
          setError('Usuario o contraseña incorrectos');
        } else {
          logger.error('Error en consulta de login:', queryError);
          setError('Error al verificar credenciales. Intenta nuevamente.');
        }
        return;
      }

      if (!data) {
        setError('Usuario o contraseña incorrectos');
        return;
      }

      // Verificar que el driver esté activo
      if (!data.active) {
        setError('Tu cuenta está desactivada. Contacta al administrador.');
        return;
      }

      // Verificar contraseña usando bcrypt
      const isPasswordValid = await verifyPassword(password, data.password);
      if (!isPasswordValid) {
        setError('Usuario o contraseña incorrectos');
        return;
      }

      // Crear objeto driver sin contraseña
      const driver = {
        id: data.id,
        username: data.username,
        name: data.name,
        phone: data.phone || '',
        email: data.email || '',
        active: data.active,
        companyId: data.company_id,
        company_id: data.company_id,
      };

      // Iniciar sesión directamente - la ubicación se obtendrá automáticamente cuando active "Conectado"
      onLogin(driver);
    } catch (err) {
      logger.error('Error en login:', err);
      setError('Error al iniciar sesión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* HEADER */}
      <header className="login-header">
		<div className="glass-effect">
		<div className="light-beam" />
		<div className="light-beam" />
		<div className="light-beam" />
		<div className="floating-light" />
		<div className="floating-light" />
		<div className="floating-light" />
		<div className="floating-light" />
		<div className="frost-overlay" />
		</div>

        <div className="logo-container">
          <Bike className="logo-icon" />
        </div>

        <h1 className="header-title">App Repartidor</h1>
        <p className="header-subtitle">
          Inicia sesión para comenzar tu jornada
        </p>
      </header>

      {/* CARD */}
      <section className="login-card">
        <h2 className="card-title">Bienvenido</h2>
        <p className="card-description">
          Ingresa tus credenciales para continuar
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          {/* Usuario */}
          <div className="form-group">
            <label className="form-label">
              <UserIcon className="label-icon" />
              Usuario
            </label>
            <input
              type="text"
              className={`form-input ${error ? 'is-error' : ''}`}
              placeholder="Ingresa tu usuario"
              value={username}
              autoComplete="username"
              disabled={loading}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              required
            />
          </div>

          {/* Contraseña */}
          <div className="form-group">
            <label className="form-label">
              <Lock className="label-icon" />
              Contraseña
            </label>

            <div className="password-wrapper">
              <input
                type="password"
                className={`form-input password-input ${error ? 'is-error' : ''}`}
                placeholder="Ingresa tu contraseña"
                value={password}
                autoComplete="current-password"
                disabled={loading}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                required
              />
            </div>
          </div>

          {error && (
            <div className="driver-login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            <span className="login-button-content">
              {loading ? (
                <>
                  <span className="login-spinner" />
                  Entrando...
                </>
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRight className="login-arrow-icon" />
                </>
              )}
            </span>
          </button>
        </form>

        <div className="safe-area" />

        <div className="login-crear-cuenta">
          <span className="login-crear-cuenta-texto">¿No tienes cuenta?</span>
          <button
            type="button"
            onClick={() => setShowRegistration(true)}
            className="login-crear-cuenta-enlace"
          >
            Registrarse
          </button>
        </div>
      </section>

      <DriverRegistrationForm
        isOpen={showRegistration}
        onClose={() => setShowRegistration(false)}
      />
    </div>
  );
}
