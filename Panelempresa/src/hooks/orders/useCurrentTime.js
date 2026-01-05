import { useState, useEffect } from 'react';

/**
 * Hook para tiempo en tiempo real
 */
export function useCurrentTime() {
	const [currentTime, setCurrentTime] = useState(new Date());
	
	useEffect(() => {
		const interval = setInterval(() => setCurrentTime(new Date()), 1000);
		return () => clearInterval(interval);
	}, []);
	
	return currentTime;
}

