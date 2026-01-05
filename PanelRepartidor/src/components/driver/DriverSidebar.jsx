import { Package, User, Wallet, Settings, X, CheckCircle, Home } from 'lucide-react';
import '../../styles/Components/DriverSidebar.css';

export function DriverSidebar({ isOpen, onClose, activeView, onViewChange, driverName }) {
	const menuItems = [
		{ id: 'home', label: 'Inicio', icon: Home },
		{ id: 'orders', label: 'Pedidos', icon: Package },
		{ id: 'completed', label: 'Pedidos Completados', icon: CheckCircle },
		{ id: 'profile', label: 'Perfil', icon: User },
		{ id: 'wallet', label: 'Billetera', icon: Wallet },
		{ id: 'settings', label: 'Ajustes', icon: Settings },
	];

	return (
		<>
			{/* Overlay */}
			{isOpen && (
				<div className="driver-sidebar-overlay" onClick={onClose} />
			)}

			{/* Sidebar */}
			<div className={`driver-sidebar ${isOpen ? 'driver-sidebar-open' : ''}`}>
				<div className="driver-sidebar-header">
					<div className="driver-sidebar-user">
						<div className="driver-sidebar-avatar">
							<User />
						</div>
						<div className="driver-sidebar-user-info">
							<h3>{driverName}</h3>
							<p>Repartidor</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="driver-sidebar-close"
					>
						<X />
					</button>
				</div>

				<nav className="driver-sidebar-nav">
					{menuItems.map((item) => {
						const Icon = item.icon;
						return (
							<button
								key={item.id}
								onClick={() => {
									onViewChange(item.id);
									onClose();
								}}
								className={`driver-sidebar-item ${activeView === item.id ? 'driver-sidebar-item-active' : ''}`}
							>
								<Icon />
								<span>{item.label}</span>
							</button>
						);
					})}
				</nav>
			</div>
		</>
	);
}

