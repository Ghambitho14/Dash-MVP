import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Headphones, MessageCircle } from 'lucide-react';
import { useSupportChat } from '../hooks/useSupportChat';
import '../style/SupportChatAdmin.css';

export function SupportChatAdmin({ chat, admin, onClose }) {
	const [messageInput, setMessageInput] = useState('');
	const inputRef = useRef(null);

	const {
		messages,
		loading,
		sending,
		messagesEndRef,
		sendMessage,
	} = useSupportChat(chat, admin);

	// Focus en el input cuando se monta
	useEffect(() => {
		if (inputRef.current) {
			inputRef.current.focus();
		}
	}, []);

	const handleSend = async (e) => {
		e.preventDefault();
		if (!messageInput.trim() || sending) return;

		const messageToSend = messageInput.trim();
		setMessageInput('');

		try {
			await sendMessage(messageToSend);
		} catch (err) {
			// El error ya se maneja en el hook
			setMessageInput(messageToSend); // Restaurar mensaje en caso de error
		}
	};

	const handleKeyPress = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend(e);
		}
	};

	const formatTime = (dateString) => {
		const date = new Date(dateString);
		return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
	};

	if (!chat) {
		return (
			<div className="support-chat-admin-container">
				<div className="support-chat-admin-empty">
					<MessageCircle size={48} />
					<p>No hay chat seleccionado</p>
				</div>
			</div>
		);
	}

	return (
		<div className="support-chat-admin-container">
			{/* Header */}
			<div className="support-chat-admin-header">
			<div className="support-chat-admin-header-info">
				<Headphones size={20} />
				<div>
					<h3 className="support-chat-admin-header-title">
						Chat con {chat.companies?.name || chat.drivers?.name || 'Usuario'}
					</h3>
					<p className="support-chat-admin-header-subtitle">
						{chat.companies ? 'Soporte Empresa' : 'Soporte Repartidor'}
					</p>
				</div>
			</div>
				{onClose && (
					<button 
						className="support-chat-admin-close-button"
						onClick={onClose}
						aria-label="Cerrar chat"
					>
						×
					</button>
				)}
			</div>

			{/* Messages Area */}
			<div className="support-chat-admin-messages">
				{loading && messages.length === 0 ? (
					<div className="support-chat-admin-loading">
						<Loader2 className="support-chat-admin-spinner" />
						<p>Cargando mensajes...</p>
					</div>
				) : messages.length === 0 ? (
					<div className="support-chat-admin-empty-messages">
						<Headphones size={48} />
						<p>No hay mensajes aún</p>
						<p className="support-chat-admin-empty-messages-subtitle">Esperando mensaje de la empresa</p>
					</div>
				) : (
					<div className="support-chat-admin-messages-list">
						{messages.map((message) => {
							const isOwnMessage = message.sender_type === 'superadmin';
							const isDriverMessage = message.sender_type === 'driver';
							return (
								<div
									key={message.id}
									className={`support-chat-admin-message ${isOwnMessage ? 'support-chat-admin-message-own' : 'support-chat-admin-message-other'}`}
								>
									<div className="support-chat-admin-message-content">
										<p className="support-chat-admin-message-text">{message.message}</p>
										<span className="support-chat-admin-message-time">
											{formatTime(message.created_at)}
										</span>
									</div>
								</div>
							);
						})}
						<div ref={messagesEndRef} />
					</div>
				)}
			</div>

			{/* Input Area */}
			<form className="support-chat-admin-input-container" onSubmit={handleSend}>
				<input
					ref={inputRef}
					type="text"
					className="support-chat-admin-input"
					placeholder="Escribe tu respuesta..."
					value={messageInput}
					onChange={(e) => setMessageInput(e.target.value)}
					onKeyPress={handleKeyPress}
					disabled={sending || loading}
				/>
				<button
					type="submit"
					className="support-chat-admin-send-button"
					disabled={!messageInput.trim() || sending || loading}
					aria-label="Enviar mensaje"
				>
					{sending ? (
						<Loader2 className="support-chat-admin-spinner" />
					) : (
						<Send size={20} />
					)}
				</button>
			</form>
		</div>
	);
}

