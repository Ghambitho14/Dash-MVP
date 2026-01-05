import { useState } from 'react';
import { X, Key, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import '../../styles/Components/PickupCodeModal.css';

export function PickupCodeModal({ onClose, onConfirm, orderId }) {
	const [code, setCode] = useState('');
	const [error, setError] = useState('');

	const handleSubmit = (e) => {
		e.preventDefault();
		if (code.trim().length === 0) {
			setError('Por favor ingresa el código');
			return;
		}
		if (code.trim().length !== 6) {
			setError('El código debe tener 6 dígitos');
			return;
		}
		const isValid = onConfirm(code.trim());
		if (!isValid) {
			setError('Código incorrecto. Por favor verifica el código e intenta nuevamente.');
			setCode('');
		}
	};

	const handleCodeChange = (value) => {
		const numericValue = value.replace(/\D/g, '').slice(0, 6);
		setCode(numericValue);
		if (error) {
			setError('');
		}
	};

	return (
		<Modal onClose={onClose} maxWidth="sm">
			<div className="pickup-code-modal">
				<div className="pickup-code-modal-header">
					<div className="pickup-code-modal-header-icon">
						<Key />
					</div>
					<div>
						<h2 className="pickup-code-modal-title">Código de Retiro</h2>
						<p className="pickup-code-modal-subtitle">Ingresa el código para retirar el producto</p>
					</div>
					<button
						onClick={onClose}
						className="pickup-code-modal-close"
						aria-label="Cerrar"
					>
						<X />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="pickup-code-modal-form">
					<div className="pickup-code-modal-input-group">
						<label htmlFor="pickup-code" className="pickup-code-modal-label">
							Código del pedido {orderId}
						</label>
						<input
							id="pickup-code"
							type="text"
							value={code}
							onChange={(e) => handleCodeChange(e.target.value)}
							placeholder="000000"
							className={`pickup-code-modal-input ${error ? 'pickup-code-modal-input-error' : ''}`}
							maxLength={6}
							autoFocus
						/>
						{error && (
							<div className="pickup-code-modal-error">
								<AlertCircle />
								<span>{error}</span>
							</div>
						)}
					</div>

					<div className="pickup-code-modal-actions">
						<button
							type="button"
							onClick={onClose}
							className="pickup-code-modal-button pickup-code-modal-button-secondary"
						>
							Cancelar
						</button>
						<button
							type="submit"
							className="pickup-code-modal-button pickup-code-modal-button-primary"
						>
							Confirmar
						</button>
					</div>
				</form>
			</div>
		</Modal>
	);
}

