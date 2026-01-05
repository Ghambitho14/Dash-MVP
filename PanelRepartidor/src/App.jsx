import { useState, useEffect, useCallback, useRef } from 'react';
import { DriverApp } from './components/driver/DriverApp';
import { Login } from './components/auth/Login';
import { supabase } from './utils/supabase';
import { useDriverLocation } from './hooks/useDriverLocation';
import { useLocationTracking } from './hooks/useLocationTracking';
import { geocodeAddress, calculateDistance } from './utils/utils';
import { getStorageObject, setStorageObject, removeStorageItem, setStorageItem } from './utils/storage';
import toast from 'react-hot-toast';
import { logger } from './utils/logger';

// Radio de proximidad en kilómetros (configurable)
const PROXIMITY_RADIUS_KM = 5; // Por defecto 5 km

export default function App() {
	const [currentDriver, setCurrentDriver] = useState(null);
	const [orders, setOrders] = useState([]);
	const [driverActiveView, setDriverActiveView] = useState('home');
	const [loading, setLoading] = useState(false);
	const [localCoordinates, setLocalCoordinates] = useState(new Map()); // Cache de coordenadas de locales
	const [isOnline, setIsOnline] = useState(false); // Estado inicial: desconectado (no pide ubicación)
	const [checkingSession, setCheckingSession] = useState(true); // Verificando sesión guardada
	
	// Obtener ubicación GPS del repartidor solo cuando está conectado
	const { location: driverLocation, loading: locationLoading } = useDriverLocation(isOnline && !!currentDriver);
	
	// Tracking en tiempo real de la ubicación cuando está conectado
	useLocationTracking(
		currentDriver?.id,
		null, // orderId - se actualizará cuando acepte un pedido
		isOnline && !!currentDriver
	);

	// Función para formatear un pedido (memoizada para evitar re-renders y deps inestables)
	const formatOrder = useCallback((order) => {
		return {
			id: `ORD-${order.id}`,
			clientName: order.clients?.name || '',
			clientPhone: order.clients?.phone || '',
			pickupAddress: order.pickup_address,
			deliveryAddress: order.delivery_address,
			local: order.locals?.name || '',
			localAddress: order.locals?.address || order.pickup_address || '',
			suggestedPrice: parseFloat(order.suggested_price),
			notes: order.notes || '',
			status: order.status,
			pickupCode: order.pickup_code,
			driverName: order.drivers?.name || null,
			driverId: order.driver_id,
			createdAt: new Date(order.created_at),
			updatedAt: new Date(order.updated_at),
			_dbId: order.id,
			_dbClientId: order.client_id,
			_dbLocalId: order.local_id,
			_dbUserId: order.user_id,
			local_id: order.local_id,
			company_id: order.company_id,
		};
	}, []);

	// Geocodificar direcciones de locales (con cache)
	const geocodeLocalAddress = useCallback(async (localAddress) => {
		if (!localAddress) return null;

		// Verificar cache
		if (localCoordinates.has(localAddress)) {
			return localCoordinates.get(localAddress);
		}

		// Geocodificar
		const coords = await geocodeAddress(localAddress);
		if (coords) {
			setLocalCoordinates(prev => new Map(prev).set(localAddress, coords));
		}
		return coords;
	}, [localCoordinates]);

	// Cargar pedidos desde Supabase
	const loadOrders = useCallback(async () => {
		if (!currentDriver) return;
		setLoading(true);

		try {
			const companyId = currentDriver.companyId || currentDriver.company_id;
			const driverId = currentDriver.id;

			// Crear consulta base
			let query = supabase
				.from('orders')
				.select(`
					*,
					clients(name, phone, address),
					locals(name, address),
					company_users(name),
					drivers(name, phone)
				`);

			// Si tiene empresa, filtrar por empresa
			if (companyId) {
				query = query.eq('company_id', companyId);
			}

			// Cargar pedidos pendientes O pedidos asignados a este driver
			const { data, error } = await query
				.or(`status.eq.Pendiente,driver_id.eq.${driverId}`)
				.order('created_at', { ascending: false });

			if (error) throw error;

			// Formatear todos los pedidos
			let formattedOrders = (data || []).map(formatOrder);

			// Filtrar por proximidad si tenemos ubicación GPS y el pedido está pendiente
			if (driverLocation && formattedOrders.length > 0) {
				// Geocodificar direcciones de locales para pedidos pendientes
				const ordersWithDistance = await Promise.all(
					formattedOrders.map(async (order) => {
						// Si el pedido ya está asignado al driver, no filtrar por distancia
						if (order.status !== 'Pendiente' || order.driverId === driverId) {
							return { ...order, distance: 0, withinRadius: true };
						}

						// Obtener coordenadas del local
						const localCoords = await geocodeLocalAddress(order.localAddress);
						if (!localCoords) {
							// Si no se puede geocodificar, mostrar el pedido (fallback)
							return { ...order, distance: null, withinRadius: true };
						}

						// Calcular distancia
						const distance = calculateDistance(
							driverLocation.lat,
							driverLocation.lon,
							localCoords.lat,
							localCoords.lon
						);

						return {
							...order,
							distance: distance,
							withinRadius: distance <= PROXIMITY_RADIUS_KM
						};
					})
				);

				// Filtrar solo pedidos dentro del radio (excepto los asignados al driver)
				formattedOrders = ordersWithDistance.filter(order => 
					order.driverId === driverId || order.withinRadius
				);
			}

			setOrders(formattedOrders);
		} catch (err) {
			logger.error('Error cargando pedidos:', err);
			toast.error('Error al cargar los pedidos');
		} finally {
			setLoading(false);
		}
	}, [currentDriver, formatOrder, driverLocation, geocodeLocalAddress]);

	// Cargar pedidos cuando el driver se loguea o se restaura la sesión
	const loadOrdersRef = useRef(loadOrders);
	loadOrdersRef.current = loadOrders;
	
	useEffect(() => {
		if (currentDriver && !checkingSession) {
			loadOrdersRef.current();
		}
	}, [currentDriver, checkingSession]);

	// Recargar pedidos cuando cambia la ubicación GPS (con delay para evitar demasiadas llamadas)
	useEffect(() => {
		if (!currentDriver || locationLoading || !driverLocation) return;

		// Esperar un poco antes de recargar para evitar llamadas excesivas
		const timeoutId = setTimeout(() => {
			loadOrdersRef.current();
		}, 2000);

		return () => clearTimeout(timeoutId);
	}, [driverLocation?.lat, driverLocation?.lon, currentDriver, locationLoading]);

	// ✅ REALTIME: escuchar cambios en orders SOLO para la company del driver + fallback 60s
	useEffect(() => {
		if (!currentDriver) return;

		const companyId = currentDriver.companyId || currentDriver.company_id;
		if (!companyId) return;

		// Carga inicial (por si entras y no hay datos aún)
		loadOrdersRef.current();

		const channel = supabase
			.channel(`orders-company-${companyId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'orders',
					filter: `company_id=eq.${companyId}`,
				},
				() => {
					loadOrdersRef.current();
				}
			)
			.subscribe();

		// Fallback profesional (por si realtime cae / reconexión / lag)
		const fallback = setInterval(() => {
			loadOrdersRef.current();
		}, 60000);

		return () => {
			clearInterval(fallback);
			supabase.removeChannel(channel);
		};
	}, [currentDriver]);

	// Guardar estado "en línea" en storage cuando cambia
	useEffect(() => {
		if (currentDriver) {
			setStorageObject('isOnline', isOnline).catch(err => {
				logger.error('Error guardando estado isOnline:', err);
			});
		}
	}, [isOnline, currentDriver]);

	// Exponer configuración de Supabase para el servicio de burbuja flotante (Android)
	useEffect(() => {
		const supabaseUrl = import.meta.env.VITE_PROJECT_URL;
		const supabaseKey = import.meta.env.VITE_ANNON_KEY;
		
		if (supabaseUrl && supabaseKey) {
			setStorageItem('supabase_url', supabaseUrl).catch(err => {
				logger.warn('No se pudo guardar configuración de Supabase:', err);
			});
			setStorageItem('supabase_key', supabaseKey).catch(err => {
				logger.warn('No se pudo guardar configuración de Supabase:', err);
			});
		}
	}, []);

	// Verificar sesión guardada al cargar la app (solo una vez al montar)
	useEffect(() => {
		// Solo ejecutar una vez al montar
		if (!checkingSession) return;
		
		const checkSavedSession = async () => {
			try {
				// Verificar si hay sesión guardada (usa Capacitor Preferences en Android)
				const driver = await getStorageObject('driver');
				if (!driver) {
					setCheckingSession(false);
					return;
				}

				// Validar que el driver tenga los campos mínimos
				if (!driver.id) {
					await removeStorageItem('driver');
					await removeStorageItem('orders');
					await removeStorageItem('isOnline');
					setCheckingSession(false);
					return;
				}
				
				// Validar que el driver siga activo en la base de datos
				const { data, error } = await supabase
					.from('drivers')
					.select('id, username, name, phone, email, active, company_id')
					.eq('id', driver.id)
					.eq('active', true)
					.single();

				if (error) {
					// Si es error de "no encontrado", limpiar sesión
					if (error.code === 'PGRST116') {
						logger.info('Driver no encontrado o inactivo, limpiando sesión');
					} else {
						logger.error('Error verificando driver en BD:', error);
					}
					await removeStorageItem('driver');
					await removeStorageItem('orders');
					await removeStorageItem('isOnline');
					setCheckingSession(false);
					return;
				}

				if (!data) {
					// Driver no existe o está inactivo, limpiar sesión
					await removeStorageItem('driver');
					await removeStorageItem('orders');
					await removeStorageItem('isOnline');
					setCheckingSession(false);
					return;
				}

				// Restaurar sesión con datos actualizados de la BD
				const restoredDriver = {
					id: data.id,
					username: data.username,
					name: data.name,
					phone: data.phone || '',
					email: data.email || '',
					active: data.active,
					companyId: data.company_id,
					company_id: data.company_id,
				};

				setCurrentDriver(restoredDriver);
				await setStorageObject('driver', restoredDriver);
				
				// Restaurar estado de conexión guardado
				const savedOnlineStatus = await getStorageObject('isOnline');
				if (savedOnlineStatus !== null && savedOnlineStatus === true) {
					setIsOnline(true);
					logger.info('Estado "en línea" restaurado desde storage');
				} else {
					setIsOnline(false);
				}
			} catch (err) {
				logger.error('Error verificando sesión:', err);
				await removeStorageItem('driver');
				await removeStorageItem('orders');
				await removeStorageItem('isOnline');
			} finally {
				setCheckingSession(false);
			}
		};

		checkSavedSession();
	}, [checkingSession]); // Solo ejecutar cuando checkingSession es true

	const handleLogin = async (driver) => {
		setCurrentDriver(driver);
		// Guardar driver usando Capacitor Preferences (Android) o localStorage (web)
		await setStorageObject('driver', driver);
		// Restaurar estado de conexión guardado o iniciar desconectado
		const savedOnlineStatus = await getStorageObject('isOnline');
		if (savedOnlineStatus !== null && savedOnlineStatus === true) {
			setIsOnline(true);
		} else {
			setIsOnline(false);
		}
	};

	const handleLogout = async () => {
		setCurrentDriver(null);
		setOrders([]);
		setIsOnline(false); // Asegurar que se desconecte al hacer logout
		await removeStorageItem('driver');
		await removeStorageItem('orders');
		await removeStorageItem('isOnline'); // Limpiar estado guardado
		
		// Limpiar credenciales de Supabase al hacer logout (seguridad)
		await removeStorageItem('supabase_url').catch(() => {});
		await removeStorageItem('supabase_key').catch(() => {});
	};

	// Mostrar loading mientras se verifica la sesión
	if (checkingSession) {
		return (
			<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
				<p>Cargando...</p>
			</div>
		);
	}

	// Si no hay driver logueado, mostrar login
	if (!currentDriver) {
		return <Login onLogin={handleLogin} />;
	}

	if (loading && orders.length === 0) {
		return (
			<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
				<p>Cargando pedidos...</p>
			</div>
		);
	}

	return (
		<DriverApp
			orders={orders}
			setOrders={setOrders}
			onReloadOrders={loadOrders}
			activeView={driverActiveView}
			onViewChange={setDriverActiveView}
			hasLocation={!!driverLocation}
			locationLoading={locationLoading}
			isOnline={isOnline}
			onOnlineChange={setIsOnline}
			onLogout={handleLogout}
			driverName={currentDriver.name}
			currentDriver={currentDriver}
		/>
	);
}
