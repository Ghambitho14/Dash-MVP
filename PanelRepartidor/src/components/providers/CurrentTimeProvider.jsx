import { useState, useEffect, createContext } from 'react';

// Contexto para compartir el tiempo actual entre componentes
export const CurrentTimeContext = createContext(null);

// Provider que mantiene un solo intervalo global
export function CurrentTimeProvider({ children }) {
	const [currentTime, setCurrentTime] = useState(new Date());
	
	useEffect(() => {
		// Un solo intervalo para toda la app
		const interval = setInterval(() => setCurrentTime(new Date()), 1000);
		return () => clearInterval(interval);
	}, []);
	
	return (
		<CurrentTimeContext.Provider value={currentTime}>
			{children}
		</CurrentTimeContext.Provider>
	);
}

