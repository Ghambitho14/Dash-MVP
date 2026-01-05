import { useContext, useState, useEffect } from 'react';
import { CurrentTimeContext } from '../components/providers/CurrentTimeProvider';

// Hook para usar el tiempo actual (singleton)
export function useCurrentTime() {
	const context = useContext(CurrentTimeContext);
	
	// Si no hay provider, crear un intervalo local como fallback
	// (para compatibilidad con código que no usa el provider)
	const [localTime, setLocalTime] = useState(new Date());
	
	useEffect(() => {
		if (context) return; // Si hay contexto, no crear intervalo local
		
		const interval = setInterval(() => setLocalTime(new Date()), 1000);
		return () => clearInterval(interval);
	}, [context]);
	
	return context || localTime;
}

