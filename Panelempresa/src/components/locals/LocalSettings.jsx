import { X, Plus, Trash2, MapPin, Store } from 'lucide-react';
import { useLocalSettings } from '../../hooks/locals/useLocalSettings';
import { useConfirm } from '../../hooks/ui/useConfirm';
import { ConfirmModal } from '../ui/ConfirmModal';
import '../../styles/Components/LocalSettings.css';

export function LocalSettings({ onClose, onSave, initialLocals }) {
	const {
		locals,
		handleAddLocal,
		handleDeleteLocal,
		handleUpdateLocal,
		handleSave,
	} = useLocalSettings(initialLocals);
	const { confirm, isOpen, config, onConfirm, onCancel } = useConfirm();

	const handleDelete = async (index) => {
		const confirmed = await confirm({
			title: 'Eliminar Local',
			message: '¿Estás seguro de que deseas eliminar este local?',
			confirmText: 'Eliminar',
			cancelText: 'Cancelar',
			type: 'danger',
		});

		if (confirmed) {
			handleDeleteLocal(index);
		}
	};

	return (
		<>
			<ConfirmModal
				isOpen={isOpen}
				onClose={onCancel}
				onConfirm={onConfirm}
				title={config?.title || 'Confirmar'}
				message={config?.message || ''}
				confirmText={config?.confirmText || 'Confirmar'}
				cancelText={config?.cancelText || 'Cancelar'}
				type={config?.type || 'danger'}
			/>
			<div className="configuracion-locales">
			{/* Header */}
			<div className="configuracion-locales-header">
				<div className="configuracion-locales-header-content">
					<h3>Configuración de Locales</h3>
					<p>Gestiona los locales y sus direcciones</p>
				</div>
				<button
					onClick={onClose}
					className="configuracion-locales-close"
				>
					<X />
				</button>
			</div>

			{/* Locales List */}
			<div className="configuracion-locales-list">
				{locals.map((local, index) => (
					<div key={index} className="configuracion-locales-item">
						<div className="configuracion-locales-item-header">
							<div className="configuracion-locales-item-title">
								<Store />
								<span className="configuracion-locales-item-title-text">{local.name || `Local ${index + 1}`}</span>
							</div>
							{locals.length > 1 && (
								<button
									onClick={() => handleDelete(index)}
									className="configuracion-locales-item-delete"
									title="Eliminar local"
								>
									<Trash2 />
								</button>
							)}
						</div>

						<div className="configuracion-locales-item-fields">
							{/* Nombre del Local */}
							<div className="configuracion-locales-item-field">
								<label className="configuracion-locales-item-label">Nombre del Local</label>
								<input
									type="text"
									value={local.name}
									onChange={(e) => handleUpdateLocal(index, 'name', e.target.value)}
									placeholder="Ej: Local 1"
									className="configuracion-locales-item-input"
								/>
							</div>

							{/* Dirección del Local */}
							<div className="configuracion-locales-item-field">
								<label className="configuracion-locales-item-label">
									<div className="configuracion-locales-item-label-content">
										<MapPin />
										Dirección del Local
									</div>
								</label>
								<input
									type="text"
									value={local.address}
									onChange={(e) => handleUpdateLocal(index, 'address', e.target.value)}
									placeholder="Ej: Av. Principal 123, Local 1"
									className="configuracion-locales-item-input"
								/>
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Add Local Button */}
			<button
				onClick={handleAddLocal}
				className="configuracion-locales-add"
			>
				<Plus />
				Agregar Nuevo Local
			</button>

			{/* Actions */}
			<div className="configuracion-locales-actions">
				<button
					onClick={onClose}
					className="configuracion-locales-button configuracion-locales-button-cancel"
				>
					Cancelar
				</button>
				<button
					onClick={() => handleSave(onSave, onClose)}
					className="configuracion-locales-button configuracion-locales-button-save"
				>
					Guardar Cambios
				</button>
			</div>
		</div>
		</>
	);
}

