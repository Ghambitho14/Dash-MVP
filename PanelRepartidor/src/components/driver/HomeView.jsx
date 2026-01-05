import { motion } from 'framer-motion';
import { Zap, Package, PackageOpen, PackageCheck } from 'lucide-react';
import '../../styles/Components/HomeView.css';

export function HomeView({ 
	userName, 
	isConnected, 
	onToggleConnection, 
	onNavigate,
	availableCount,
	myOrdersCount,
	completedCount
}) {
	const stats = [
		{
			icon: Package,
			label: 'Disponibles',
			count: availableCount || 0,
			bgColor: 'linear-gradient(135deg, #528af4 0%, #7aa1f9 100%)',
			iconBg: 'rgba(82, 138, 244, 0.15)',
			color: '#528af4',
			navigateTo: 'orders',
		},
		{
			icon: PackageOpen,
			label: 'En Curso',
			count: myOrdersCount || 0,
			bgColor: 'linear-gradient(135deg, #2b73ee 0%, #528af4 100%)',
			iconBg: 'rgba(43, 115, 238, 0.15)',
			color: '#2b73ee',
			navigateTo: 'myOrders',
		},
		{
			icon: PackageCheck,
			label: 'Completados Hoy',
			count: completedCount || 0,
			bgColor: 'linear-gradient(135deg, #035ce8 0%, #2b73ee 100%)',
			iconBg: 'rgba(3, 92, 232, 0.15)',
			color: '#035ce8',
			navigateTo: 'completed',
		},
	];

	return (
		<div className="home-view-container">
			{/* Header */}
			<div className="home-view-header">
				<div>
					<p className="home-view-greeting">Hola,</p>
					<h1 className="home-view-name">{userName}</h1>
				</div>
			</div>

			{/* Cards de estadísticas */}
			<div className="home-view-stats-grid">
				{stats.map((stat, index) => (
					<motion.div
						key={stat.label}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.1 + 0.3 }}
						whileHover={{ y: -6, scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => onNavigate && onNavigate(stat.navigateTo)}
						className="home-view-stat-card"
					>
						<div
							className="home-view-stat-bg"
							style={{
								background: stat.bgColor,
							}}
						/>

						<div className="home-view-stat-content">
							<div className="home-view-stat-info">
								<motion.div
									whileHover={{ scale: 1.15, rotate: 10 }}
									transition={{ type: 'spring', stiffness: 400 }}
									className="home-view-stat-icon-container"
									style={{
										backgroundColor: stat.iconBg,
									}}
								>
									<stat.icon style={{ color: stat.color }} className="home-view-stat-icon" />
								</motion.div>
								<div>
									<p className="home-view-stat-label">{stat.label}</p>
									<motion.p
										key={stat.count}
										initial={{ scale: 1.3, opacity: 0 }}
										animate={{ scale: 1, opacity: 1 }}
										className="home-view-stat-count"
									>
										{stat.count}
									</motion.p>
								</div>
							</div>

							<motion.div
								initial={{ scaleY: 0 }}
								animate={{ scaleY: 1 }}
								transition={{ delay: index * 0.1 + 0.4 }}
								className="home-view-stat-accent"
								style={{
									background: stat.bgColor,
								}}
							/>
						</div>
					</motion.div>
				))}
			</div>
		</div>
	);
}

