import { motion } from 'framer-motion';
import { Zap, LogOut, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { logger } from '../../utils/logger';
import '../../styles/Components/DriverHeader.css';

export function DriverHeader({ isConnected, onToggleConnection, driverName, hasActiveOrders, onLogout }) {
	const handleToggleConnection = () => {
		// Si intenta desconectarse y tiene pedidos activos, bloquear
		if (isConnected && hasActiveOrders) {
			toast.error('No puedes desconectarte mientras tienes pedidos activos', {
				duration: 3000,
			});
			return;
		}

		onToggleConnection();
	};

	return (
		<header className="driver-header">
			<div className="driver-header-content">
				<div className="driver-header-left">
					<h1 className="driver-header-title">{driverName || 'Repartidor'}</h1>
				</div>

				<div className="driver-header-right">
					{/* Estado de conexión */}
					<motion.button
						onClick={handleToggleConnection}
						className={`driver-header-connection-wrapper ${isConnected && hasActiveOrders ? 'driver-header-connection-locked' : ''}`}
						whileTap={{ scale: 0.95 }}
						whileHover={isConnected && hasActiveOrders ? {} : { scale: 1.02 }}
						title={isConnected && hasActiveOrders ? 'No puedes desconectarte con pedidos activos' : ''}
					>
						{isConnected ? (
							<div className="driver-header-status-connected">
								<div className="driver-header-radar-pulse" style={{ animationDelay: '0s' }}></div>
								<div className="driver-header-radar-pulse" style={{ animationDelay: '0.6s' }}></div>
								<div className="driver-header-radar-pulse" style={{ animationDelay: '1.2s' }}></div>
								
								<div className="driver-header-icon-wrapper driver-header-icon-glow">
									<Zap className="driver-header-zap-icon" />
								</div>
								
								<span className="driver-header-status-text">En línea</span>
								<div className="driver-header-status-dot"></div>
							</div>
						) : (
							<div className="driver-header-status-disconnected">
								<div className="driver-header-icon-wrapper-offline">
									<Zap className="driver-header-zap-icon" />
								</div>
								<span className="driver-header-status-text">Desconectado</span>
							</div>
						)}
					</motion.button>

					{/* Botón de notificaciones */}
					<motion.button
						className="driver-header-logout-button driver-notification-button"
						whileTap={{ scale: 0.95 }}
						title="Notificaciones"
						style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
						onClick={() => {
							// TODO: Implementar notificaciones
							logger.info('Notificaciones - funcionalidad pendiente');
						}}
					>
						<Bell className="driver-header-logout-icon" style={{ color: 'white' }} />
					</motion.button>

					{/* Botón de cerrar sesión */}
					{onLogout && (
						<motion.button
							onClick={onLogout}
							className="driver-header-logout-button"
							whileTap={{ scale: 0.95 }}
							title="Cerrar sesión"
						>
							<LogOut className="driver-header-logout-icon" />
						</motion.button>
					)}
				</div>
			</div>
		</header>
	);
}

