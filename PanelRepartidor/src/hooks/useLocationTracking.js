import { useEffect, useRef } from 'react';
import { saveDriverLocation } from '../services/locationService';
import { logger } from '../utils/logger';
import { getCapacitorModules } from '../utils/utils';
import toast from 'react-hot-toast';

/**
 * Hook para trackear la ubicación GPS del repartidor
 * Usa Capacitor Geolocation en móvil, fallback a Web API en navegador
 */
export function useLocationTracking(driverId, orderId = null, enabled = true) {
	const watchIdRef = useRef(null);
	const lastUpdateRef = useRef(0);
	const isNativeRef = useRef(null); // null = no verificado, true/false = resultado
	const UPDATE_INTERVAL = 10000; // Actualizar cada 10 segundos

	useEffect(() => {
		if (!enabled || !driverId) {
			return;
		}

		let cleanup = () => {};

		const initTracking = async () => {
			logger.log('📍 Iniciando tracking de ubicación...', { driverId, enabled, hasNavigator: !!navigator.geolocation });
			
			// Intentar usar Capacitor si está disponible (solo en móvil nativo)
			const capacitorModules = await getCapacitorModules();
			
			if (capacitorModules) {
				const { Geolocation, Capacitor } = capacitorModules;
				
				try {
					if (Capacitor.isNativePlatform()) {
						isNativeRef.current = true;
						logger.log('📍 Usando Capacitor Geolocation (móvil nativo)');
						
						// Verificar permisos primero
						let permissionStatus = await Geolocation.checkPermissions();
						
						if (permissionStatus.location !== 'granted') {
							logger.log('📍 Solicitando permisos de ubicación...');
							// Solicitar permisos
							permissionStatus = await Geolocation.requestPermissions();
							if (permissionStatus.location !== 'granted') {
								logger.error('❌ Permisos de ubicación denegados en móvil');
								return;
							}
						}
						
						logger.log('✅ Permisos de ubicación concedidos');
						
						// Obtener ubicación inicial
						try {
							const initialPosition = await Geolocation.getCurrentPosition({
								enableHighAccuracy: true,
								timeout: 5000,
								maximumAge: 0
							});
							
							logger.log('📍 Ubicación inicial obtenida:', {
								lat: initialPosition.coords.latitude,
								lng: initialPosition.coords.longitude
							});
							
							const now = Date.now();
							if (now - lastUpdateRef.current >= UPDATE_INTERVAL) {
								lastUpdateRef.current = now;
								await saveDriverLocation(
									driverId,
									initialPosition.coords.latitude,
									initialPosition.coords.longitude,
									orderId
								);
								logger.log('✅ Ubicación inicial guardada en Supabase');
							}
						} catch (err) {
							// Manejar errores de forma más detallada
							const errorInfo = {
								message: err?.message || 'Error desconocido',
								code: err?.code,
								name: err?.name,
								toString: err?.toString()
							};
							
							// Si el usuario canceló el diálogo de permisos, no es un error crítico
							if (err?.message?.includes('cancelled') || err?.message?.includes('PHASE_CLIENT_ALREADY_HIDDEN')) {
								logger.warn('⚠️ Usuario canceló el diálogo de permisos de ubicación');
								return; // Salir silenciosamente si el usuario canceló
							}
							
							logger.error('❌ Error obteniendo ubicación inicial:', errorInfo);
						}
						
						// Iniciar seguimiento continuo con Capacitor
						const watchId = await Geolocation.watchPosition(
							{
								enableHighAccuracy: true,
								timeout: 5000,
								maximumAge: 0
							},
							(position, err) => {
								if (err) {
									// Manejar errores de forma más detallada
									const errorInfo = {
										message: err?.message || 'Error desconocido',
										code: err?.code,
										name: err?.name,
										toString: err?.toString()
									};
									
									// Si el usuario canceló el diálogo de permisos, no es un error crítico
									if (err?.message?.includes('cancelled') || err?.message?.includes('PHASE_CLIENT_ALREADY_HIDDEN')) {
										logger.warn('⚠️ Usuario canceló el diálogo de permisos de ubicación');
										return;
									}
									
									logger.error('❌ Error en watchPosition:', errorInfo);
									return;
								}
								
								const now = Date.now();
								// Solo actualizar si ha pasado el intervalo
								if (now - lastUpdateRef.current < UPDATE_INTERVAL) {
									return;
								}
								
								const { latitude, longitude } = position.coords;
								lastUpdateRef.current = now;
								
								logger.log('📍 Nueva ubicación detectada (móvil):', { lat: latitude, lng: longitude });
								
								// Guardar ubicación en Supabase
								saveDriverLocation(driverId, latitude, longitude, orderId)
									.then(() => {
										logger.log('✅ Ubicación guardada en Supabase');
									})
									.catch(err => {
										logger.error('❌ Error guardando ubicación:', err);
									});
							}
						);
						
						watchIdRef.current = watchId;
						logger.log('✅ Tracking iniciado con Capacitor (watchId:', watchId, ')');
						
						// Cleanup para Capacitor
						cleanup = async () => {
							if (watchIdRef.current !== null) {
								try {
									await Geolocation.clearWatch({ id: watchIdRef.current });
									logger.log('🔌 Tracking detenido (Capacitor)');
								} catch (err) {
									logger.error('Error limpiando watchPosition:', err);
								}
								watchIdRef.current = null;
							}
						};
						
						return;
					}
				} catch (err) {
					// Si falla Capacitor, continuar con Web API
					logger.warn('⚠️ Error usando Capacitor, usando Web Geolocation API:', err);
				}
			}
			
			// Fallback a Web Geolocation API (navegador)
			isNativeRef.current = false;
			logger.log('📍 Usando Web Geolocation API (navegador)');
			
			if (!navigator.geolocation) {
				logger.error('❌ Geolocalización no disponible en este navegador');
				return;
			}
			
			const updateLocation = (position) => {
				const now = Date.now();
				// Solo actualizar si ha pasado el intervalo
				if (now - lastUpdateRef.current < UPDATE_INTERVAL) {
					return;
				}
				
				const { latitude, longitude } = position.coords;
				lastUpdateRef.current = now;
				
				logger.log('📍 Nueva ubicación detectada (navegador):', { lat: latitude, lng: longitude });
				
				// Guardar ubicación en Supabase
				saveDriverLocation(driverId, latitude, longitude, orderId)
					.then(() => {
						logger.log('✅ Ubicación guardada en Supabase');
					})
					.catch(err => {
						logger.error('❌ Error guardando ubicación:', err);
					});
			};
			
			const handleError = (error) => {
				// Manejar errores de forma más robusta
				const errorCode = error?.code;
				const errorMessage = error?.message || 'Error desconocido';
				const errorName = error?.name || 'GeolocationPositionError';
				
				// Si el usuario canceló el diálogo de permisos, no es un error crítico
				if (errorMessage.includes('cancelled') || errorMessage.includes('PHASE_CLIENT_ALREADY_HIDDEN')) {
					logger.warn('⚠️ Usuario canceló el diálogo de permisos de ubicación');
					return; // Salir silenciosamente si el usuario canceló
				}
				
				const errorMessages = {
					1: 'PERMISSION_DENIED - Permisos de ubicación denegados. Por favor, permite el acceso a la ubicación en la configuración del navegador.',
					2: 'POSITION_UNAVAILABLE - La ubicación no está disponible. Verifica que el GPS esté activado.',
					3: 'TIMEOUT - Tiempo de espera agotado al obtener la ubicación. Intenta de nuevo.'
				};
				
				const userMessage = errorMessages[errorCode] || `Error desconocido: ${errorMessage}`;
				
				logger.error('❌ Error obteniendo ubicación:', {
					code: errorCode,
					message: errorMessage,
					name: errorName,
					errorType: {
						1: 'PERMISSION_DENIED',
						2: 'POSITION_UNAVAILABLE',
						3: 'TIMEOUT'
					}[errorCode] || 'UNKNOWN',
					userMessage: userMessage,
					errorObject: error?.toString ? error.toString() : JSON.stringify(error)
				});
				
				// Mostrar toast al usuario solo para errores críticos (no para timeout)
				if (errorCode === 1) {
					// PERMISSION_DENIED - el usuario necesita dar permisos
					toast.error('Permisos de ubicación denegados. Por favor, permite el acceso a la ubicación en la configuración del navegador.');
				} else if (errorCode === 2) {
					// POSITION_UNAVAILABLE - GPS no disponible
					toast.error('La ubicación no está disponible. Verifica que el GPS esté activado.');
				} else if (errorCode === 3) {
					// TIMEOUT - No mostrar toast, solo log (watchPosition seguirá intentando)
					logger.warn('⚠️ Timeout obteniendo ubicación inicial. El seguimiento continuo seguirá intentando...');
				}
			};
			
			// Función para obtener ubicación inicial con reintentos y fallback a baja precisión
			const getInitialPosition = (useHighAccuracy = true, attempt = 1) => {
				const maxAttempts = useHighAccuracy ? 2 : 1;
				const options = {
					enableHighAccuracy: useHighAccuracy,
					timeout: useHighAccuracy ? 30000 : 15000, // 30s alta precisión, 15s baja precisión
					maximumAge: useHighAccuracy ? 0 : 300000, // Alta precisión: nueva, Baja: hasta 5 minutos
				};
				
				logger.log(`📍 Solicitando ubicación inicial (navegador) - ${useHighAccuracy ? 'Alta precisión' : 'Baja precisión'} - Intento ${attempt}...`);
				
				navigator.geolocation.getCurrentPosition(
					(position) => {
						logger.log('✅ Ubicación inicial obtenida (navegador):', {
							lat: position.coords.latitude,
							lng: position.coords.longitude,
							accuracy: position.coords.accuracy,
							precision: useHighAccuracy ? 'alta' : 'baja'
						});
						updateLocation(position);
					},
					(error) => {
						// Si es timeout y aún hay intentos con la misma precisión, reintentar
						if (error.code === 3 && attempt < maxAttempts) {
							logger.warn(`⚠️ Timeout obteniendo ubicación (intento ${attempt}), reintentando...`);
							setTimeout(() => {
								getInitialPosition(useHighAccuracy, attempt + 1);
							}, 3000);
						} else if (error.code === 3 && useHighAccuracy) {
							// Si falla con alta precisión, intentar con baja precisión
							logger.warn('⚠️ Timeout con alta precisión, intentando con baja precisión...');
							setTimeout(() => {
								getInitialPosition(false, 1);
							}, 1000);
						} else {
							// Para otros errores o si se agotaron los intentos, usar handleError
							handleError(error);
						}
					},
					options
				);
			};
			
			// Obtener ubicación inicial con reintentos
			getInitialPosition();
			
			logger.log('📍 Iniciando seguimiento continuo (navegador)...');
			// Iniciar seguimiento continuo con opciones más permisivas
			// Usar baja precisión para watchPosition para evitar timeouts constantes
			const watchOptions = {
				enableHighAccuracy: false, // Baja precisión para evitar timeouts
				timeout: 30000, // 30 segundos para watchPosition
				maximumAge: 60000, // Aceptar ubicaciones de hasta 1 minuto de antigüedad
			};
			
			// Función de error para watchPosition (más tolerante)
			const handleWatchError = (error) => {
				const errorCode = error?.code;
				const errorMessage = error?.message || 'Error desconocido';
				
				// Para timeout en watchPosition, solo log (no es crítico, seguirá intentando)
				if (errorCode === 3) {
					logger.warn('⚠️ Timeout en seguimiento de ubicación. Continuando intentos...');
					return;
				}
				
				// Para otros errores, usar handleError normal
				handleError(error);
			};
			
			watchIdRef.current = navigator.geolocation.watchPosition(
				updateLocation,
				handleWatchError,
				watchOptions
			);
			
			logger.log('✅ Tracking iniciado con Web API (watchId:', watchIdRef.current, ')');
			
			// Cleanup para Web API
			cleanup = () => {
				if (watchIdRef.current !== null) {
					navigator.geolocation.clearWatch(watchIdRef.current);
					logger.log('🔌 Tracking detenido (Web API)');
					watchIdRef.current = null;
				}
			};
		};
		
		initTracking();
		
		// Limpiar al desmontar
		return () => {
			cleanup();
		};
	}, [driverId, orderId, enabled]);
}

