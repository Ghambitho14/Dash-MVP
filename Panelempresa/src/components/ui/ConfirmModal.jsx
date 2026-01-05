import { AlertTriangle, X } from 'lucide-react';
import '../../styles/Components/ConfirmModal.css';

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'danger' }) {
	if (!isOpen) return null;

	const handleConfirm = () => {
		onConfirm();
		onClose();
	};

	return (
		<div className="modal-confirmacion-overlay" onClick={onClose}>
			<div className="modal-confirmacion-contenido" onClick={(e) => e.stopPropagation()}>
				<div className="modal-confirmacion-header">
					<div className="modal-confirmacion-icono-container">
						<AlertTriangle className={`modal-confirmacion-icono modal-confirmacion-icono-${type}`} />
					</div>
					<button
						onClick={onClose}
						className="modal-confirmacion-cerrar"
						aria-label="Cerrar"
					>
						<X />
					</button>
				</div>
				<div className="modal-confirmacion-cuerpo">
					<h3 className="modal-confirmacion-titulo">{title}</h3>
					<p className="modal-confirmacion-mensaje">{message}</p>
				</div>
				<div className="modal-confirmacion-acciones">
					<button
						onClick={onClose}
						className="modal-confirmacion-boton modal-confirmacion-boton-cancelar"
					>
						{cancelText}
					</button>
					<button
						onClick={handleConfirm}
						className={`modal-confirmacion-boton modal-confirmacion-boton-confirmar modal-confirmacion-boton-${type}`}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</div>
	);
}

