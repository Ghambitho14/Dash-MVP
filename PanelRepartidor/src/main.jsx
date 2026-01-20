import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { CurrentTimeProvider } from './components/providers/CurrentTimeProvider';
import './styles/globals.css';
import './styles/utils/statusUtils.css';

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<CurrentTimeProvider>
			<Toaster />
			<App />
		</CurrentTimeProvider>
	</StrictMode>,
);

