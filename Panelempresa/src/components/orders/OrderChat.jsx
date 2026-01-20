import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageCircle, Clock, Image as ImageIcon, X } from 'lucide-react';
import { useOrderChat } from '../../hooks/orders/useOrderChat';
import { formatRelativeTime } from '../../utils/utils';
import { useCurrentTime } from '../../hooks/orders/useCurrentTime';
import '../../styles/Components/OrderChat.css';

export function OrderChat({ order, currentUser, onClose }) {
	const [messageInput, setMessageInput] = useState('');
	const [selectedImage, setSelectedImage] = useState(null);
	const [imagePreview, setImagePreview] = useState(null);
	const currentTime = useCurrentTime();
	const inputRef = useRef(null);
	const fileInputRef = useRef(null);

	const {
		messages,
		loading,
		sending,
		chatExpired,
		messagesEndRef,
		sendMessage,
	} = useOrderChat(order, currentUser);

	// Focus en el input cuando se monta
	useEffect(() => {
		if (inputRef.current) {
			inputRef.current.focus();
		}
	}, []);

	const handleImageSelect = (e) => {
		const file = e.target.files[0];
		if (!file) return;

		// Validar tipo de archivo
		if (!file.type.startsWith('image/')) {
			alert('Por favor selecciona una imagen válida');
			return;
		}

		// Validar tamaño (máximo 5MB)
		if (file.size > 5 * 1024 * 1024) {
			alert('La imagen debe ser menor a 5MB');
			return;
		}

		setSelectedImage(file);
		const reader = new FileReader();
		reader.onloadend = () => {
			setImagePreview(reader.result);
		};
		reader.readAsDataURL(file);
	};

	const handleRemoveImage = () => {
		setSelectedImage(null);
		setImagePreview(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const handleSend = async (e) => {
		e.preventDefault();
		if ((!messageInput.trim() && !selectedImage) || sending) return;

		const messageToSend = messageInput.trim();
		const imageToSend = selectedImage;
		setMessageInput('');
		setSelectedImage(null);
		setImagePreview(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}

		try {
			await sendMessage(messageToSend, imageToSend);
		} catch (err) {
			// Restaurar mensaje e imagen en caso de error
			setMessageInput(messageToSend);
			if (imageToSend) {
				setSelectedImage(imageToSend);
				const reader = new FileReader();
				reader.onloadend = () => {
					setImagePreview(reader.result);
				};
				reader.readAsDataURL(imageToSend);
			}
			
			// Mostrar error al usuario de forma amigable
			let errorMessage = 'Error al enviar el mensaje';
			if (err.message) {
				if (err.message.includes('bucket') || err.message.includes('Bucket')) {
					errorMessage = 'Error de configuración: El bucket de almacenamiento no está configurado.\n\n' +
						'Por favor, contacta al administrador para configurar Supabase Storage.';
				} else if (err.message.includes('permisos') || err.message.includes('permission')) {
					errorMessage = 'Error de permisos: No tienes permisos para subir imágenes.\n\n' +
						'Por favor, contacta al administrador.';
				} else {
					errorMessage = err.message;
				}
			}
			alert(errorMessage);
		}
	};

	const handleKeyPress = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend(e);
		}
	};

	if (!order || !order.driverId) {
		return (
			<div className="order-chat-container">
				<div className="order-chat-empty">
					<MessageCircle size={48} />
					<p>Este pedido aún no tiene repartidor asignado</p>
					<p className="order-chat-empty-subtitle">El chat estará disponible cuando un repartidor acepte el pedido</p>
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
						<h3 className="order-chat-header-title">Chat con Repartidor</h3>
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
						<p className="order-chat-empty-messages-subtitle">Envía el primer mensaje al repartidor</p>
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
										{message.image_url && (
											<div className="order-chat-message-image-container">
												<img
													src={message.image_url}
													alt="Imagen del chat"
													className="order-chat-message-image"
													onClick={() => window.open(message.image_url, '_blank')}
												/>
											</div>
										)}
										{message.message && (
											<p className="order-chat-message-text">{message.message}</p>
										)}
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

			{/* Image Preview */}
			{imagePreview && (
				<div className="order-chat-image-preview">
					<img src={imagePreview} alt="Vista previa" className="order-chat-image-preview-img" />
					<button
						type="button"
						onClick={handleRemoveImage}
						className="order-chat-image-preview-remove"
						aria-label="Eliminar imagen"
					>
						<X size={16} />
					</button>
				</div>
			)}

			{/* Input Area */}
			<form className="order-chat-input-container" onSubmit={handleSend}>
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					onChange={handleImageSelect}
					className="order-chat-file-input"
					disabled={sending || loading}
					aria-label="Seleccionar imagen"
				/>
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					className="order-chat-image-button"
					disabled={sending || loading}
					aria-label="Agregar imagen"
				>
					<ImageIcon size={20} />
				</button>
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
					disabled={(!messageInput.trim() && !selectedImage) || sending || loading}
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

