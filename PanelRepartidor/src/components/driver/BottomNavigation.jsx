import { motion } from 'framer-motion';
import { Home, Package, MapPin, TrendingUp, User as UserIcon } from 'lucide-react';
import '../../styles/Components/BottomNavigation.css';

export function BottomNavigation({ activeTab, onTabChange, availableOrdersCount }) {
	const tabs = [
		{ id: 'home', icon: Home, label: 'Inicio' },
		{ id: 'orders', icon: Package, label: 'Pedidos', badge: availableOrdersCount > 0 ? availableOrdersCount : null },
		{ id: 'myOrders', icon: MapPin, label: 'Activos' },
		{ id: 'wallet', icon: TrendingUp, label: 'Ganancias' },
		{ id: 'profile', icon: UserIcon, label: 'Perfil' },
	];

	return (
		<nav className="bottom-navigation">
			<div className="bottom-navigation-content">
				{tabs.map((tab) => {
					const Icon = tab.icon;
					const isActive = activeTab === tab.id;
					
					return (
						<motion.button
							key={tab.id}
							onClick={() => onTabChange(tab.id)}
							whileTap={{ scale: 0.95 }}
							className={`bottom-nav-button ${isActive ? 'bottom-nav-active' : ''}`}
						>
							<div className="bottom-nav-icon-wrapper">
								<Icon 
									className="bottom-nav-icon"
									style={{
										color: isActive ? '#2b73ee' : '#94a3b8',
									}} 
								/>
								{isActive && (
									<motion.div
										layoutId="activeIndicator"
										className="bottom-nav-active-indicator"
										transition={{ type: 'spring', stiffness: 500, damping: 35 }}
									/>
								)}
								{tab.badge && tab.badge > 0 && (
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										className="bottom-nav-badge badge-pulse"
									>
										{tab.badge}
									</motion.div>
								)}
							</div>
							<span 
								className="bottom-nav-label"
								style={{
									color: isActive ? '#2b73ee' : '#94a3b8',
									fontWeight: isActive ? 600 : 500,
								}}
							>
								{tab.label}
							</span>
						</motion.button>
					);
				})}
			</div>
		</nav>
	);
}

