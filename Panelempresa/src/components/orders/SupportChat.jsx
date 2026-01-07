import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Headphones, Clock } from 'lucide-react';
import { useSupportChat } from '../../hooks/support/useSupportChat';
import { formatRelativeTime } from '../../utils/utils';
import { useCurrentTime } from '../../hooks/orders/useCurrentTime';
import '../../styles/Components/OrderChat.css';

export function SupportChat({ currentUser, onClose }) {
	const [messageInput, setMessageInput] = useState('');
	const currentTime = useCurrentTime();
	const inputRef = useRef(null);

	const {
		messages,
		loading,
		sending,
		chatExpired,
		messagesEndRef,
		sendMessage,
	} = useSupportChat(currentUser);

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

	if (chatExpired) {
		return (
			<div className="order-chat-container">
				<div className="order-chat-expired">
					<Clock size={48} />
					<p>Este chat ha expirado</p>
					<p className="order-chat-expired-subtitle">Los chats de soporte expiran después de 7 días sin actividad</p>
					<button 
						className="order-chat-reload-button"
						onClick={() => window.location.reload()}
					>
						Recargar página
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="order-chat-container">
			{/* Header */}
			<div className="order-chat-header">
				<div className="order-chat-header-info">
					<Headphones size={20} />
					<div>
						<h3 className="order-chat-header-title">Chat con Soporte</h3>
						<p className="order-chat-header-subtitle">Estamos aquí para ayudarte</p>
					</div>
				</div>
				{onClose && (
					<button 
						className="order-chat-close-button"
						onClick={onClose}
						aria-label="Cerrar chat"
					>
						×
					</button>
				)}
			</div>

			{/* Messages Area */}
			<div className="order-chat-messages">
				{loading && messages.length === 0 ? (
					<div className="order-chat-loading">
						<Loader2 className="order-chat-spinner" />
						<p>Cargando mensajes...</p>
					</div>
				) : messages.length === 0 ? (
					<div className="order-chat-empty-messages">
						<Headphones size={48} />
						<p>No hay mensajes aún</p>
						<p className="order-chat-empty-messages-subtitle">Envía tu consulta y nuestro equipo de soporte te responderá pronto</p>
					</div>
				) : (
					<div className="order-chat-messages-list">
						{messages.map((message) => {
							const isOwnMessage = message.sender_type === 'company_user';
							return (
								<div
									key={message.id}
									className={`order-chat-message ${isOwnMessage ? 'order-chat-message-own' : 'order-chat-message-other'}`}
								>
									<div className="order-chat-message-content">
										<p className="order-chat-message-text">{message.message}</p>
										<span className="order-chat-message-time">
											{formatRelativeTime(message.created_at, currentTime)}
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
			<form className="order-chat-input-container" onSubmit={handleSend}>
				<input
					ref={inputRef}
					type="text"
					className="order-chat-input"
					placeholder="Escribe tu consulta a soporte..."
					value={messageInput}
					onChange={(e) => setMessageInput(e.target.value)}
					onKeyPress={handleKeyPress}
					disabled={sending || loading}
				/>
				<button
					type="submit"
					className="order-chat-send-button"
					disabled={!messageInput.trim() || sending || loading}
					aria-label="Enviar mensaje"
				>
					{sending ? (
						<Loader2 className="order-chat-spinner" />
					) : (
						<Send size={20} />
					)}
				</button>
			</form>
		</div>
	);
}

