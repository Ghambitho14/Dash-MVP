import { useState } from 'react';
import { Menu, LogOut } from 'lucide-react';
import { DriverSidebar } from '../components/driver/DriverSidebar';
import '../styles/layouts/DriverLayout.css';

export function DriverLayout({ children, driverName, activeView, onViewChange, onLogout, isOnline, onOnlineChange }) {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	return (
		<div className="driver-layout">
			{/* Sidebar */}
			<DriverSidebar
				isOpen={sidebarOpen}
				onClose={() => setSidebarOpen(false)}
				activeView={activeView}
				onViewChange={(view) => {
					onViewChange(view);
					setSidebarOpen(false);
				}}
				driverName={driverName}
			/>

			{/* Header fijo */}
			<header className="driver-layout-header">
				<div className="driver-layout-header-content">
					<button
						onClick={() => setSidebarOpen(true)}
						className="driver-layout-menu-button"
						aria-label="Abrir menú"
					>
						<Menu />
					</button>
					<div className="driver-layout-header-info">
						<h2 className="driver-layout-header-name">{driverName}</h2>
					</div>
					<div className="driver-layout-header-right">
						<div className="driver-layout-status-switch-container">
							<label className="driver-layout-status-switch">
								<input
									type="checkbox"
									checked={isOnline}
									onChange={(e) => onOnlineChange && onOnlineChange(e.target.checked)}
								/>
								<span className="driver-layout-status-slider"></span>
								<span className="driver-layout-status-label">{isOnline ? 'Conectado' : 'Desconectado'}</span>
							</label>
						</div>
						{onLogout && (
							<button
								onClick={onLogout}
								className="driver-layout-logout-button"
								title="Cerrar sesión"
								aria-label="Cerrar sesión"
							>
								<LogOut />
							</button>
						)}
					</div>
				</div>
			</header>

			{/* Contenido */}
			<main className="driver-layout-main">
				{children}
			</main>
		</div>
	);
}
