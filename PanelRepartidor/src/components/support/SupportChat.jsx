import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, LifeBuoy } from 'lucide-react';
import { useSupportChat } from '../../hooks/useSupportChat';
import { formatRelativeTime } from '../../utils/utils';
import { useCurrentTime } from '../../hooks/useCurrentTime';
import '../../styles/Components/OrderChat.css'; // Reusing styles

export function SupportChat({ currentDriver, onClose }) {
	const [messageInput, setMessageInput] = useState('');
	const currentTime = useCurrentTime();
	const inputRef = useRef(null);

	const {
		messages,
		loading,
		sending,
		messagesEndRef,
		sendMessage,
	} = useSupportChat(currentDriver);

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
			setMessageInput(messageToSend); // Restaurar mensaje en caso de error
		}
	};

	const handleKeyPress = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend(e);
		}
	};

	if (!currentDriver) {
		return (
			<div className="order-chat-container">
				<div className="order-chat-empty">
					<LifeBuoy size={48} />
					<p>No se pudo cargar la información del repartidor para el chat de soporte.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="order-chat-container">
			{/* Header */}
			<div className="order-chat-header">
				<div className="order-chat-header-info">
					<LifeBuoy size={20} />
					<div>
						<h3 className="order-chat-header-title">Chat de Soporte</h3>
						<p className="order-chat-header-subtitle">Con el equipo de administración</p>
					</div>
				</div>
				{onClose && (
					<button 
						className="order-chat-close-button"
						onClick={onClose}
						aria-label="Cerrar chat de soporte"
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
						<p>Cargando mensajes de soporte...</p>
					</div>
				) : messages.length === 0 ? (
					<div className="order-chat-empty-messages">
						<LifeBuoy size={48} />
						<p>No hay mensajes aún</p>
						<p className="order-chat-empty-messages-subtitle">Envía tu primer mensaje al equipo de soporte</p>
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

