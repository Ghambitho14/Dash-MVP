import '../../styles/Components/Modal.css';

export function Modal({ children, onClose, maxWidth = '2xl' }) {
	return (
		<div className="modal-overlay" onClick={onClose}>
			<div 
				className={`modal-content modal-content-${maxWidth}`}
				onClick={(e) => e.stopPropagation()}
			>
				{children}
			</div>
		</div>
	);
}

