import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageCircle, Clock } from 'lucide-react';
import { useOrderChat } from '../../hooks/useOrderChat';
import { formatRelativeTime } from '../../utils/utils';
import '../../styles/Components/OrderChat.css';

export function OrderChat({ order, currentDriver, onClose }) {
	const [messageInput, setMessageInput] = useState('');
	const [currentTime, setCurrentTime] = useState(new Date());
	const inputRef = useRef(null);

	// Actualizar tiempo cada minuto
	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(new Date());
		}, 60000);
		return () => clearInterval(interval);
	}, []);

	const {
		messages,
		loading,
		sending,
		chatExpired,
		messagesEndRef,
		sendMessage,
	} = useOrderChat(order, currentDriver);

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

	if (!order) {
		return (
			<div className="order-chat-container">
				<div className="order-chat-empty">
					<MessageCircle size={48} />
					<p>No hay pedido seleccionado</p>
				</div>
			</div>
		);
	}

	if (chatExpired) {
		return (
			<div className="order-chat-container">
				<div className="order-chat-expired">
					<Clock size={48} />
					<p>Este chat ha expirado</p>
					<p className="order-chat-expired-subtitle">Los chats expiran después de 24 horas sin actividad</p>
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
					<MessageCircle size={20} />
					<div>
						<h3 className="order-chat-header-title">Chat con Empresa</h3>
						<p className="order-chat-header-subtitle">Pedido {order.id}</p>
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
						<MessageCircle size={48} />
						<p>No hay mensajes aún</p>
						<p className="order-chat-empty-messages-subtitle">Envía el primer mensaje a la empresa</p>
					</div>
				) : (
					<div className="order-chat-messages-list">
						{messages.map((message) => {
							const isOwnMessage = message.sender_type === 'driver';
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
					placeholder="Escribe un mensaje..."
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

