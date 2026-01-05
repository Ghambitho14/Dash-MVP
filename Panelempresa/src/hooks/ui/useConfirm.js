import { useState, useCallback } from 'react';

/**
 * Hook para manejar confirmaciones con modal
 * Retorna: { confirm, ConfirmModal, isOpen, onConfirm, onCancel }
 */
export function useConfirm() {
	const [isOpen, setIsOpen] = useState(false);
	const [config, setConfig] = useState(null);
	const [resolvePromise, setResolvePromise] = useState(null);

	const confirm = useCallback((config) => {
		return new Promise((resolve) => {
			setConfig(config);
			setIsOpen(true);
			setResolvePromise(() => resolve);
		});
	}, []);

	const handleConfirm = useCallback(() => {
		if (resolvePromise) {
			resolvePromise(true);
			setResolvePromise(null);
		}
		setIsOpen(false);
	}, [resolvePromise]);

	const handleCancel = useCallback(() => {
		if (resolvePromise) {
			resolvePromise(false);
			setResolvePromise(null);
		}
		setIsOpen(false);
	}, [resolvePromise]);

	return {
		confirm,
		isOpen,
		config,
		onConfirm: handleConfirm,
		onCancel: handleCancel,
	};
}

