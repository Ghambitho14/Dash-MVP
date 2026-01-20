import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Headphones, MessageCircle, Image as ImageIcon, X } from 'lucide-react';
import { useSupportChat } from '../hooks/useSupportChat';
import '../style/SupportChatAdmin.css';

export function SupportChatAdmin({ chat, admin, onClose }) {
	const [messageInput, setMessageInput] = useState('');
	const [selectedImage, setSelectedImage] = useState(null);
	const [imagePreview, setImagePreview] = useState(null);
	const inputRef = useRef(null);
	const fileInputRef = useRef(null);

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
										{message.image_url && (
											<div className="support-chat-admin-message-image-container">
												<img
													src={message.image_url}
													alt="Imagen del chat"
													className="support-chat-admin-message-image"
													onClick={() => window.open(message.image_url, '_blank')}
												/>
											</div>
										)}
										{message.message && (
											<p className="support-chat-admin-message-text">{message.message}</p>
										)}
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

			{/* Image Preview */}
			{imagePreview && (
				<div className="support-chat-admin-image-preview">
					<img src={imagePreview} alt="Vista previa" className="support-chat-admin-image-preview-img" />
					<button
						type="button"
						onClick={handleRemoveImage}
						className="support-chat-admin-image-preview-remove"
						aria-label="Eliminar imagen"
					>
						<X size={16} />
					</button>
				</div>
			)}

			{/* Input Area */}
			<form className="support-chat-admin-input-container" onSubmit={handleSend}>
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					onChange={handleImageSelect}
					className="support-chat-admin-file-input"
					disabled={sending || loading}
					aria-label="Seleccionar imagen"
				/>
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					className="support-chat-admin-image-button"
					disabled={sending || loading}
					aria-label="Agregar imagen"
				>
					<ImageIcon size={20} />
				</button>
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
					disabled={(!messageInput.trim() && !selectedImage) || sending || loading}
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

