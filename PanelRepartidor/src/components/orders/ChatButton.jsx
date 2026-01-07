import { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { OrderChat } from './OrderChat';
import { Modal } from '../common/Modal';
import { supabase } from '../../utils/supabase';
import { logger } from '../../utils/logger';
import '../../styles/Components/ChatButton.css';

export function ChatButton({ orders, currentDriver }) {
	const [showChatList, setShowChatList] = useState(false);
	const [ordersWithChat, setOrdersWithChat] = useState([]);
	const [selectedOrder, setSelectedOrder] = useState(null);
	const [loading, setLoading] = useState(false);

	// Cargar pedidos con chat activo
	useEffect(() => {
		if (!orders?.length || !currentDriver || !showChatList) return;

		const loadOrdersWithChat = async () => {
			setLoading(true);
			try {
				// Filtrar pedidos activos del repartidor
				const activeOrders = orders.filter(
					order => order.driverId === currentDriver.id && order.status !== 'Entregado'
				);

				if (activeOrders.length === 0) {
					setOrdersWithChat([]);
					return;
				}

				const orderDbIds = activeOrders
					.map(order => order._dbId || order.id?.replace('ORD-', ''))
					.filter(Boolean);

				if (orderDbIds.length === 0) {
					setOrdersWithChat([]);
					return;
				}

				// Obtener chats activos
				const { data: chats, error } = await supabase
					.from('order_chats')
					.select('id, order_id')
					.in('order_id', orderDbIds)
					.gt('expires_at', new Date().toISOString());

				if (error) {
					logger.error('❌ Error cargando chats:', error);
					setOrdersWithChat([]);
					return;
				}

				if (!chats || chats.length === 0) {
					setOrdersWithChat([]);
					return;
				}

				// Mapear chats a pedidos
				const ordersWithActiveChat = activeOrders.filter(order => {
					const orderDbId = order._dbId || order.id?.replace('ORD-', '');
					return chats.some(chat => chat.order_id === orderDbId);
				});

				setOrdersWithChat(ordersWithActiveChat);
			} catch (err) {
				logger.error('❌ Error en loadOrdersWithChat:', err);
				setOrdersWithChat([]);
			} finally {
				setLoading(false);
			}
		};

		loadOrdersWithChat();
	}, [orders, currentDriver, showChatList]);

	const handleOpenChat = (order) => {
		setSelectedOrder(order);
		setShowChatList(false);
	};

	const handleCloseChat = () => {
		setSelectedOrder(null);
	};

	if (!currentDriver) return null;

	// Solo mostrar si hay pedidos activos del repartidor
	const hasActiveOrders = orders?.some(
		order => order.driverId === currentDriver.id && order.status !== 'Entregado'
	);

	if (!hasActiveOrders) return null;

	return (
		<>
			{/* Botón flotante */}
			<button
				className="chat-button-floating"
				onClick={() => setShowChatList(true)}
				title="Chats activos"
			>
				<MessageCircle size={24} />
				{ordersWithChat.length > 0 && (
					<span className="chat-button-badge">{ordersWithChat.length}</span>
				)}
			</button>

			{/* Lista de chats */}
			{showChatList && (
				<>
					<div 
						className="chat-button-overlay"
						onClick={() => setShowChatList(false)}
					/>
					<div className="chat-button-panel">
						<div className="chat-button-panel-header">
							<h3>Chats Activos</h3>
							<button
								className="chat-button-close"
								onClick={() => setShowChatList(false)}
							>
								<X size={20} />
							</button>
						</div>
						<div className="chat-button-panel-content">
							{loading ? (
								<div className="chat-button-loading">Cargando...</div>
							) : ordersWithChat.length === 0 ? (
								<div className="chat-button-empty">
									<MessageCircle size={48} />
									<p>No hay chats activos</p>
								</div>
							) : (
								<div className="chat-button-list">
									{ordersWithChat.map(order => (
										<button
											key={order.id}
											className="chat-button-item"
											onClick={() => handleOpenChat(order)}
										>
											<div className="chat-button-item-info">
												<span className="chat-button-item-order">Pedido {order.id}</span>
												{order.local && (
													<span className="chat-button-item-client">{order.local}</span>
												)}
											</div>
											<MessageCircle size={20} />
										</button>
									))}
								</div>
							)}
						</div>
					</div>
				</>
			)}

			{/* Modal de chat */}
			{selectedOrder && currentDriver && (
				<Modal onClose={handleCloseChat} maxWidth="md">
					<OrderChat 
						order={selectedOrder} 
						currentDriver={currentDriver}
						onClose={handleCloseChat}
					/>
				</Modal>
			)}
		</>
	);
}

