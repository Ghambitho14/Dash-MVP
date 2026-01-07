import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Headphones, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { getActiveSupportChats, getUnreadSupportMessagesCount } from '../services/supportChatService';
import { SupportChatAdmin } from './SupportChatAdmin';
import '../style/SupportChatButton.css';

export function SupportChatButton({ admin }) {
	const [showChatList, setShowChatList] = useState(false);
	const [supportChats, setSupportChats] = useState([]);
	const [selectedChat, setSelectedChat] = useState(null);
	const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
	const [loading, setLoading] = useState(false);

	// Verificar mensajes no leídos periódicamente
	useEffect(() => {
		if (!admin) {
			setHasUnreadMessages(false);
			return;
		}

		const checkUnreadMessages = async () => {
			try {
				const count = await getUnreadSupportMessagesCount();
				setHasUnreadMessages(count > 0);
			} catch (err) {
				console.error('❌ Error verificando mensajes no leídos:', err);
				setHasUnreadMessages(false);
			}
		};

		checkUnreadMessages();

		// Verificar cada 5 segundos
		const interval = setInterval(checkUnreadMessages, 5000);
		return () => clearInterval(interval);
	}, [admin]);

	// Cargar chats activos cuando se abre la lista
	useEffect(() => {
		if (!admin || !showChatList) return;

		const loadChats = async () => {
			setLoading(true);
			try {
				const chats = await getActiveSupportChats();
				setSupportChats(chats || []);
			} catch (err) {
				console.error('❌ Error cargando chats de soporte:', err);
				setSupportChats([]);
			} finally {
				setLoading(false);
			}
		};

		loadChats();
	}, [admin, showChatList]);

	// Escuchar mensajes nuevos en tiempo real
	useEffect(() => {
		if (!admin) return;

		const channel = supabase
			.channel(`support-chat-button-${admin.id}-${Date.now()}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'support_chat_messages',
				},
				async (payload) => {
					const newMessage = payload.new;

					// Solo procesar mensajes de empresas
					if (newMessage.sender_type !== 'company_user') {
						return;
					}

					setHasUnreadMessages(true);
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [admin]);

	const handleOpenChat = async (chat) => {
		setSelectedChat(chat);
		setShowChatList(false);
		setHasUnreadMessages(false);
	};

	const handleCloseChat = () => {
		setSelectedChat(null);
	};

	if (!admin) return null;

	return (
		<>
			{/* Botón en el header */}
			<button
				className="support-chat-button admin-logout-button"
				style={{ background: '#3b82f6' }}
				onClick={() => setShowChatList(true)}
				title={hasUnreadMessages ? "Tienes mensajes nuevos de soporte" : "Chats de soporte"}
			>
				<Headphones size={16} />
				{hasUnreadMessages && (
					<span className="support-chat-indicator"></span>
				)}
			</button>

			{/* Lista de chats */}
			{showChatList && (
				<>
					<div 
						className="support-chat-overlay"
						onClick={() => setShowChatList(false)}
					/>
					<div className="support-chat-panel">
						<div className="support-chat-panel-header">
							<h3>Chats de Soporte</h3>
							<button
								className="support-chat-close"
								onClick={() => setShowChatList(false)}
							>
								×
							</button>
						</div>
						<div className="support-chat-panel-content">
							{loading ? (
								<div className="support-chat-loading">
									<Loader2 className="support-chat-spinner" />
									<p>Cargando chats...</p>
								</div>
							) : supportChats.length === 0 ? (
								<div className="support-chat-empty">
									<MessageCircle size={48} />
									<p>No hay chats activos</p>
								</div>
							) : (
								<div className="support-chat-list">
									{supportChats.map(chat => (
										<button
											key={chat.id}
											className="support-chat-item"
											onClick={() => handleOpenChat(chat)}
										>
											<div className="support-chat-item-info">
												<span className="support-chat-item-company">
													{chat.companies?.name || chat.drivers?.name || 'Usuario'}
												</span>
												<span className="support-chat-item-time">
													{new Date(chat.created_at).toLocaleDateString('es-ES')}
												</span>
											</div>
											<Headphones size={20} />
										</button>
									))}
								</div>
							)}
						</div>
					</div>
				</>
			)}

			{/* Modal de chat */}
			{selectedChat && admin && (
				<div className="admin-modal-overlay" onClick={handleCloseChat}>
					<div className="admin-modal support-chat-modal" onClick={(e) => e.stopPropagation()}>
						<SupportChatAdmin 
							chat={selectedChat} 
							admin={admin}
							onClose={handleCloseChat}
						/>
					</div>
				</div>
			)}
		</>
	);
}

