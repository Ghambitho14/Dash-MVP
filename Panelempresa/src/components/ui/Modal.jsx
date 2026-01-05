import '../../styles/Components/Modal.css';

export function Modal({ children, onClose, maxWidth = '2xl' }) {
	return (
		<div className="superposicion-modal" onClick={onClose}>
			<div 
				className={`contenido-modal contenido-modal-${maxWidth}`}
				onClick={(e) => e.stopPropagation()}
			>
				{children}
			</div>
		</div>
	);
}

