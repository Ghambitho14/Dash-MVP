import { useState, useEffect } from 'react';
import { MessageCircle, Headphones } from 'lucide-react';
import { OrderChat } from './OrderChat';
import { SupportChat } from './SupportChat';
import { Modal } from '../ui/Modal';
import { supabase } from '../../utils/supabase';
import { getCompanyId, getDbId } from '../../utils/utils';
import { logger } from '../../utils/logger';
import '../../styles/Components/ChatHeaderButton.css';

export function ChatHeaderButton({ orders, currentUser }) {
	const [showChatList, setShowChatList] = useState(false);
	const [ordersWithChat, setOrdersWithChat] = useState([]);
	const [selectedOrder, setSelectedOrder] = useState(null);
	const [showSupportChat, setShowSupportChat] = useState(false);
	const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

	// Verificar mensajes no leídos periódicamente
	useEffect(() => {
		if (!orders?.length || !currentUser) {
			setHasUnreadMessages(false);
			return;
		}

		const checkUnreadMessages = async () => {
			try {
				const companyId = getCompanyId(currentUser);
				const userId = getDbId(currentUser);
				if (!companyId || !userId) return;

				// Filtrar pedidos con repartidor asignado
				const ordersWithDriver = orders.filter(
					order => order.driverId && order.status !== 'Entregado'
				);

				if (ordersWithDriver.length === 0) {
					setHasUnreadMessages(false);
					return;
				}

				const orderDbIds = ordersWithDriver
					.map(order => order._dbId || parseInt(order.id?.replace('ORD-', ''), 10))
					.filter(id => id && !isNaN(id));

				if (orderDbIds.length === 0) {
					setHasUnreadMessages(false);
					return;
				}

				// Obtener chats activos
				const { data: chats, error } = await supabase
					.from('order_chats')
					.select('id')
					.in('order_id', orderDbIds)
					.gt('expires_at', new Date().toISOString());

				if (error || !chats || chats.length === 0) {
					setHasUnreadMessages(false);
					return;
				}

				const chatIds = chats.map(chat => chat.id);

				// Verificar mensajes no leídos del repartidor
				const { data: unreadMessages, error: unreadError } = await supabase
					.from('order_chat_messages')
					.select('id')
					.in('chat_id', chatIds)
					.eq('sender_type', 'driver')
					.is('read_at', null);

				if (!unreadError && unreadMessages && unreadMessages.length > 0) {
					setHasUnreadMessages(true);
				} else {
					setHasUnreadMessages(false);
				}
			} catch (err) {
				logger.error('❌ Error verificando mensajes no leídos:', err);
				setHasUnreadMessages(false);
			}
		};

		checkUnreadMessages();

		// Verificar cada 2 segundos
		const interval = setInterval(checkUnreadMessages, 2000);
		return () => clearInterval(interval);
	}, [orders, currentUser]);

	// Escuchar mensajes nuevos en tiempo real para actualizar el punto rojo
	useEffect(() => {
		if (!orders?.length || !currentUser) return;

		const companyId = getCompanyId(currentUser);
		const userId = getDbId(currentUser);
		if (!companyId || !userId) return;

		const ordersWithDriver = orders.filter(
			order => order.driverId && order.status !== 'Entregado'
		);

		if (ordersWithDriver.length === 0) return;

		const orderDbIds = ordersWithDriver
			.map(order => order._dbId || parseInt(order.id?.replace('ORD-', ''), 10))
			.filter(id => id && !isNaN(id));

		if (orderDbIds.length === 0) return;

		// Suscribirse a mensajes nuevos
		const channel = supabase
			.channel(`chat-header-indicator-${companyId}-${Date.now()}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'order_chat_messages',
				},
				async (payload) => {
					const newMessage = payload.new;

					// Solo procesar mensajes del repartidor
					if (newMessage.sender_type !== 'driver') {
						return;
					}

					// Verificar que pertenece a uno de nuestros pedidos
					try {
						const { data: chat } = await supabase
							.from('order_chats')
							.select('order_id')
							.eq('id', newMessage.chat_id)
							.single();

						if (chat) {
							const orderDbId = parseInt(chat.order_id, 10);
							if (orderDbIds.includes(orderDbId)) {
								setHasUnreadMessages(true);
							}
						}
					} catch (err) {
						// Ignorar errores
					}
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [orders, currentUser]);

	// Cargar pedidos con chat activo cuando se abre la lista
	useEffect(() => {
		if (!orders?.length || !currentUser || !showChatList) return;

		const loadOrdersWithChat = async () => {
			try {
				const companyId = getCompanyId(currentUser);
				if (!companyId) return;

				const ordersWithDriver = orders.filter(
					order => order.driverId && order.status !== 'Entregado'
				);

				if (ordersWithDriver.length === 0) {
					setOrdersWithChat([]);
					return;
				}

				const orderDbIds = ordersWithDriver
					.map(order => order._dbId || parseInt(order.id?.replace('ORD-', ''), 10))
					.filter(id => id && !isNaN(id));

				if (orderDbIds.length === 0) {
					setOrdersWithChat([]);
					return;
				}

				const { data: chats, error } = await supabase
					.from('order_chats')
					.select('id, order_id')
					.in('order_id', orderDbIds)
					.gt('expires_at', new Date().toISOString());

				if (error || !chats || chats.length === 0) {
					setOrdersWithChat([]);
					return;
				}

				const ordersWithActiveChat = ordersWithDriver.filter(order => {
					const orderDbId = order._dbId || parseInt(order.id?.replace('ORD-', ''), 10);
					return chats.some(chat => chat.order_id === orderDbId);
				});

				setOrdersWithChat(ordersWithActiveChat);
			} catch (err) {
				logger.error('❌ Error cargando chats:', err);
				setOrdersWithChat([]);
			}
		};

		loadOrdersWithChat();
	}, [orders, currentUser, showChatList]);

	const handleOpenChat = async (order) => {
		setSelectedOrder(order);
		setShowChatList(false);
		
		// Marcar mensajes como leídos
		try {
			const orderDbId = order._dbId || parseInt(order.id?.replace('ORD-', ''), 10);
			const userId = getDbId(currentUser);
			
			if (orderDbId && userId) {
				const { data: chat } = await supabase
					.from('order_chats')
					.select('id')
					.eq('order_id', orderDbId)
					.gt('expires_at', new Date().toISOString())
					.single();
				
				if (chat) {
					await supabase
						.from('order_chat_messages')
						.update({ read_at: new Date().toISOString() })
						.eq('chat_id', chat.id)
						.eq('sender_type', 'driver')
						.is('read_at', null);
				}
			}
		} catch (err) {
			logger.error('❌ Error marcando mensajes como leídos:', err);
		}
		
		setHasUnreadMessages(false);
	};

	const handleCloseChat = () => {
		setSelectedOrder(null);
	};

	const handleOpenSupportChat = () => {
		setShowSupportChat(true);
		setShowChatList(false);
	};

	const handleCloseSupportChat = () => {
		setShowSupportChat(false);
	};

	if (!currentUser) return null;

	return (
		<>
			{/* Botón en el header */}
			<button
				className="chat-header-button delivery-header-button boton-encabezado-empresa"
				onClick={() => setShowChatList(true)}
				title={hasUnreadMessages ? "Tienes mensajes nuevos" : "Chats activos"}
			>
				<MessageCircle size={18} />
				{hasUnreadMessages && (
					<span className="chat-header-indicator" style={{
						position: 'absolute',
						top: '0.25rem',
						right: '0.25rem',
						width: '0.5rem',
						height: '0.5rem',
						background: '#ef4444',
						borderRadius: '50%',
						border: '2px solid white',
						zIndex: 10
					}}></span>
				)}
			</button>

			{/* Lista de chats */}
			{showChatList && (
				<>
					<div 
						className="chat-header-overlay"
						onClick={() => setShowChatList(false)}
					/>
					<div className="chat-header-panel">
						<div className="chat-header-panel-header">
							<h3>Chats Activos</h3>
							<button
								className="chat-header-close"
								onClick={() => setShowChatList(false)}
							>
								×
							</button>
						</div>
						<div className="chat-header-panel-content">
							{/* Botón de Soporte */}
							<button
								className="chat-header-support-button"
								onClick={handleOpenSupportChat}
							>
								<Headphones size={20} />
								<span>Contactar Soporte</span>
							</button>

							{/* Separador */}
							{ordersWithChat.length > 0 && (
								<div className="chat-header-divider" />
							)}

							{/* Lista de chats de pedidos */}
							{ordersWithChat.length === 0 ? (
								<div className="chat-header-empty">
									<MessageCircle size={48} />
									<p>No hay chats activos</p>
								</div>
							) : (
								<div className="chat-header-list">
									{ordersWithChat.map(order => (
										<button
											key={order.id}
											className="chat-header-item"
											onClick={() => handleOpenChat(order)}
										>
											<div className="chat-header-item-info">
												<span className="chat-header-item-order">Pedido {order.id}</span>
												{order.clientName && (
													<span className="chat-header-item-client">{order.clientName}</span>
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

			{/* Modal de chat de pedido */}
			{selectedOrder && currentUser && (
				<Modal onClose={handleCloseChat} maxWidth="md">
					<OrderChat 
						order={selectedOrder} 
						currentUser={currentUser}
						onClose={handleCloseChat}
					/>
				</Modal>
			)}

			{/* Modal de chat de soporte */}
			{showSupportChat && currentUser && (
				<Modal onClose={handleCloseSupportChat} maxWidth="md">
					<SupportChat 
						currentUser={currentUser}
						onClose={handleCloseSupportChat}
					/>
				</Modal>
			)}
		</>
	);
}
