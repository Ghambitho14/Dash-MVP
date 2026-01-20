import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, AnimatePresence } from 'framer-motion';
import { Package, X } from 'lucide-react';
import { OrderCard } from '../orders/OrderCard';
import '../../styles/Components/FloatingButton.css';

export function FloatingButton({ 
	myOrders = [], 
	myOrdersCount = 0,
	onSelectOrder,
	onAcceptOrder,
	onUpdateStatus
}) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const buttonRef = useRef(null);
	const containerRef = useRef(null);
	const panelRef = useRef(null);

	const x = useMotionValue(0);
	const y = useMotionValue(0);

	// Inicializar posición en la esquina inferior derecha
	useEffect(() => {
		const updatePosition = () => {
			const buttonSize = 56; // Tamaño del botón en px (3.5rem)
			const margin = 16; // Margen desde los bordes (1rem)
			
			// Posición inicial: esquina inferior derecha
			const initialX = window.innerWidth - buttonSize - margin;
			const initialY = window.innerHeight - buttonSize - margin - 80; // 80px para la bottom nav
			
			setPosition({ x: initialX, y: initialY });
			x.set(initialX);
			y.set(initialY);
		};

		updatePosition();
		
		// Actualizar posición cuando cambia el tamaño de la ventana
		window.addEventListener('resize', updatePosition);
		
		return () => {
			window.removeEventListener('resize', updatePosition);
		};
	}, [x, y]);

	// Manejar el arrastre
	const handleDragStart = () => {
		setIsDragging(true);
	};

	const handleDrag = (event, info) => {
		// Limitar el movimiento dentro de los límites de la pantalla
		const buttonSize = 56;
		const margin = 16;
		const maxX = window.innerWidth - buttonSize - margin;
		const maxY = window.innerHeight - buttonSize - margin - 80; // 80px para la bottom nav
		const minX = margin;
		const minY = margin;

		let newX = position.x + info.delta.x;
		let newY = position.y + info.delta.y;

		// Limitar a los bordes
		newX = Math.max(minX, Math.min(maxX, newX));
		newY = Math.max(minY, Math.min(maxY, newY));

		setPosition({ x: newX, y: newY });
	};

	const handleDragEnd = () => {
		setIsDragging(false);
		
		// Ajustar a la esquina más cercana con animación suave
		const buttonSize = 56;
		const margin = 16;
		const centerX = window.innerWidth / 2;
		const centerY = window.innerHeight / 2;

		let finalX, finalY;

		// Determinar esquina más cercana
		if (position.x < centerX) {
			finalX = margin; // Izquierda
		} else {
			finalX = window.innerWidth - buttonSize - margin; // Derecha
		}

		if (position.y < centerY) {
			finalY = margin; // Arriba
		} else {
			finalY = window.innerHeight - buttonSize - margin - 80; // Abajo (considerando bottom nav)
		}

		setPosition({ x: finalX, y: finalY });
		x.set(finalX);
		y.set(finalY);
	};

	const handleClick = (e) => {
		if (!isDragging) {
			e.stopPropagation();
			setIsExpanded(!isExpanded);
		}
	};

	// Cerrar panel al hacer clic fuera
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (
				isExpanded &&
				panelRef.current &&
				!panelRef.current.contains(event.target) &&
				buttonRef.current &&
				!buttonRef.current.contains(event.target)
			) {
				setIsExpanded(false);
			}
		};

		if (isExpanded) {
			document.addEventListener('mousedown', handleClickOutside);
			document.addEventListener('touchstart', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('touchstart', handleClickOutside);
		};
	}, [isExpanded]);

	// Calcular posición del panel (centrado en la pantalla principal)
	const panelWidth = 380;
	const panelHeight = 500;
	
	// Centrar el panel en la pantalla
	const panelX = (window.innerWidth - panelWidth) / 2;
	const panelY = (window.innerHeight - panelHeight) / 2;

	return (
		<div ref={containerRef} className="floating-button-container">
			<motion.button
				ref={buttonRef}
				className="floating-button"
				drag={!isExpanded}
				dragMomentum={false}
				dragElastic={0}
				onDragStart={handleDragStart}
				onDrag={handleDrag}
				onDragEnd={handleDragEnd}
				onClick={handleClick}
				style={{
					x,
					y,
					position: 'fixed',
				}}
				whileHover={!isExpanded ? { scale: 1.1 } : {}}
				whileTap={{ scale: 0.95 }}
				initial={{ scale: 0 }}
				animate={{ scale: 1, rotate: isExpanded ? 45 : 0 }}
				transition={{ type: 'spring', stiffness: 300, damping: 20 }}
			>
				{isExpanded ? (
					<X className="floating-button-icon" />
				) : (
					<Package className="floating-button-icon" />
				)}
				{myOrdersCount > 0 && !isExpanded && (
					<motion.div
						className="floating-button-badge"
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ type: 'spring', stiffness: 500, damping: 15 }}
					>
						{myOrdersCount}
					</motion.div>
				)}
			</motion.button>

			<AnimatePresence>
				{isExpanded && (
					<>
						<motion.div
							className="floating-button-overlay"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setIsExpanded(false)}
						/>
						<motion.div
							ref={panelRef}
							className="floating-button-panel"
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.8 }}
							transition={{ type: 'spring', stiffness: 300, damping: 25 }}
						>
						<div className="floating-button-panel-header">
							<h3 className="floating-button-panel-title">Mis Pedidos</h3>
							<span className="floating-button-panel-count">{myOrdersCount}</span>
						</div>
						<div className="floating-button-panel-content">
							{myOrders.length === 0 ? (
								<div className="floating-button-panel-empty">
									<Package className="floating-button-panel-empty-icon" />
									<p className="floating-button-panel-empty-text">No tienes pedidos asignados</p>
								</div>
							) : (
								<div className="floating-button-panel-orders">
									{myOrders.map((order) => (
										<div key={order.id} className="floating-button-order-item">
											<OrderCard
												order={order}
												onClick={() => {
													if (onSelectOrder) onSelectOrder(order);
													setIsExpanded(false);
												}}
												onAcceptOrder={onAcceptOrder}
												onUpdateStatus={onUpdateStatus}
												canAcceptOrder={myOrdersCount < 2}
											/>
										</div>
									))}
								</div>
							)}
						</div>
					</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	);
}

