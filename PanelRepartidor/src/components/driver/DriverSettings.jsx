import { Bell, Shield, Moon, Globe, LogOut } from 'lucide-react';
import '../../styles/Components/DriverSettings.css';

export function DriverSettings({ onLogout }) {
	return (
		<div className="driver-settings">
			<div className="driver-settings-header">
				<h2>Ajustes</h2>
				<p>Configura tu aplicación</p>
			</div>

			<div className="driver-settings-content">
				<div className="driver-settings-section">
					<h3 className="driver-settings-section-title">Notificaciones</h3>
					<div className="driver-settings-item">
						<div className="driver-settings-item-content">
							<div className="driver-settings-item-icon">
								<Bell />
							</div>
							<div className="driver-settings-item-text">
								<p className="driver-settings-item-label">Notificaciones Push</p>
								<p className="driver-settings-item-description">Recibe notificaciones de nuevos pedidos</p>
							</div>
						</div>
						<label className="driver-settings-toggle">
							<input type="checkbox" defaultChecked disabled />
							<span className="driver-settings-toggle-slider"></span>
						</label>
						<span className="driver-settings-coming-soon">Próximamente</span>
					</div>
				</div>

				<div className="driver-settings-section">
					<h3 className="driver-settings-section-title">Privacidad</h3>
					<div className="driver-settings-item">
						<div className="driver-settings-item-content">
							<div className="driver-settings-item-icon">
								<Shield />
							</div>
							<div className="driver-settings-item-text">
								<p className="driver-settings-item-label">Compartir ubicación</p>
								<p className="driver-settings-item-description">Permite que la app use tu ubicación GPS</p>
							</div>
						</div>
						<label className="driver-settings-toggle">
							<input type="checkbox" defaultChecked disabled />
							<span className="driver-settings-toggle-slider"></span>
						</label>
						<span className="driver-settings-coming-soon">Próximamente</span>
					</div>
				</div>

				<div className="driver-settings-section">
					<h3 className="driver-settings-section-title">Apariencia</h3>
					<div className="driver-settings-item">
						<div className="driver-settings-item-content">
							<div className="driver-settings-item-icon">
								<Moon />
							</div>
							<div className="driver-settings-item-text">
								<p className="driver-settings-item-label">Modo Oscuro</p>
								<p className="driver-settings-item-description">Activa el tema oscuro</p>
							</div>
						</div>
						<label className="driver-settings-toggle">
							<input type="checkbox" disabled />
							<span className="driver-settings-toggle-slider"></span>
						</label>
						<span className="driver-settings-coming-soon">Próximamente</span>
					</div>
				</div>

				<div className="driver-settings-section">
					<h3 className="driver-settings-section-title">Idioma</h3>
					<div className="driver-settings-item">
						<div className="driver-settings-item-content">
							<div className="driver-settings-item-icon">
								<Globe />
							</div>
							<div className="driver-settings-item-text">
								<p className="driver-settings-item-label">Idioma</p>
								<p className="driver-settings-item-description">Español (Chile)</p>
							</div>
						</div>
					</div>
				</div>

				<div className="driver-settings-section">
					<h3 className="driver-settings-section-title">Cuenta</h3>
					{onLogout && (
						<button
							onClick={onLogout}
							className="driver-settings-logout-button"
						>
							<div className="driver-settings-item-content">
								<div className="driver-settings-item-icon">
									<LogOut />
								</div>
								<div className="driver-settings-item-text">
									<p className="driver-settings-item-label">Cerrar Sesión</p>
									<p className="driver-settings-item-description">Salir de tu cuenta</p>
								</div>
							</div>
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

