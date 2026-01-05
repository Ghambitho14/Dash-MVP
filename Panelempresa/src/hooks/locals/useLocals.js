import { useState, useEffect, useCallback } from 'react';
import { loadLocals, saveLocalConfigs } from '../../services/localService';
import { logger } from '../../utils/logger';
import { getCompanyId } from '../../utils/utils';

/**
 * Hook para gestionar locales
 */
export function useLocals(currentUser) {
	const [localConfigs, setLocalConfigs] = useState([]);
	const [loading, setLoading] = useState(false);

	const fetchLocals = useCallback(async () => {
		if (!currentUser) return;

		setLoading(true);
		try {
			const companyId = getCompanyId(currentUser);
			const loadedLocals = await loadLocals(companyId);
			setLocalConfigs(loadedLocals);
		} catch (err) {
			logger.error('Error cargando locales:', err);
		} finally {
			setLoading(false);
		}
	}, [currentUser]);

	useEffect(() => {
		if (currentUser) {
			fetchLocals();
		}
	}, [currentUser, fetchLocals]);

	const handleSaveLocalConfigs = useCallback(async (configs) => {
		if (!currentUser) return;

		try {
			const companyId = getCompanyId(currentUser);
			const updatedLocals = await saveLocalConfigs(configs, companyId);
			setLocalConfigs(updatedLocals);
			return updatedLocals;
		} catch (err) {
			logger.error('Error guardando locales:', err);
			throw err;
		}
	}, [currentUser]);

	return {
		localConfigs,
		setLocalConfigs,
		loading,
		saveLocalConfigs: handleSaveLocalConfigs,
		reloadLocals: fetchLocals,
	};
}

