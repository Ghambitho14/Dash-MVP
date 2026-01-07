import { useMemo, useEffect, useState, useRef } from 'react';
import { loadOrderStatusHistory, loadActiveDrivers } from '../../services/metricsService';
import { getCompanyId } from '../../utils/utils';
import { logger } from '../../utils/logger';

/**
 * Hook para calcular todas las métricas del dashboard
 */
export function useMetrics(orders, currentUser) {
	const [statusHistory, setStatusHistory] = useState([]);
	const [activeDrivers, setActiveDrivers] = useState([]);
	const [loading, setLoading] = useState(true);

	const companyId = currentUser ? getCompanyId(currentUser) : null;

	// Obtener IDs de pedidos de forma estable
	const orderDbIds = useMemo(() => {
		if (!orders || orders.length === 0) return [];
		return orders
			.map(order => order._dbId || order.id?.replace('ORD-', ''))
			.filter(Boolean)
			.map(id => parseInt(id, 10))
			.filter(id => !isNaN(id))
			.sort((a, b) => a - b); // Ordenar para tener una referencia estable
	}, [orders]);

	// Cargar historial de estados y repartidores
	// Recargar cuando cambien los IDs de pedidos (incluyendo cuando se filtra por local)
	const orderDbIdsString = useMemo(() => orderDbIds.join(','), [orderDbIds]);
	const prevOrderDbIdsStringRef = useRef(null); // Iniciar en null para forzar primera carga
	
	useEffect(() => {
		// Si no hay pedidos o no hay companyId, limpiar y salir
		if (orderDbIds.length === 0 || !companyId) {
			setStatusHistory([]);
			setActiveDrivers([]);
			setLoading(false);
			prevOrderDbIdsStringRef.current = null;
			return;
		}

		// Recargar si los IDs cambiaron (incluyendo cuando se filtra por local)
		// Si prevOrderDbIdsStringRef.current es null, es la primera carga
		if (prevOrderDbIdsStringRef.current !== null && orderDbIdsString === prevOrderDbIdsStringRef.current) {
			// Los IDs son los mismos, no necesitamos recargar desde la BD
			// El statusHistory se filtrará en el useMemo de métricas
			// Asegurarnos de que loading esté en false
			setLoading(false);
			return;
		}

		prevOrderDbIdsStringRef.current = orderDbIdsString;

		const loadData = async () => {
			setLoading(true);
			try {
				const [history, drivers] = await Promise.all([
					loadOrderStatusHistory(orderDbIds),
					loadActiveDrivers(companyId),
				]);

				setStatusHistory(history);
				setActiveDrivers(drivers);
			} catch (err) {
				logger.error('Error cargando datos para métricas:', err);
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, [orderDbIdsString, orderDbIds, companyId]);

	const metrics = useMemo(() => {
		if (!orders || orders.length === 0) {
			return getEmptyMetrics();
		}

		// Obtener IDs de pedidos actuales para filtrar el historial
		const currentOrderDbIds = new Set(
			orders
				.map(order => order._dbId || order.id?.replace('ORD-', ''))
				.filter(Boolean)
				.map(id => parseInt(id, 10))
				.filter(id => !isNaN(id))
		);

		// Filtrar statusHistory para solo incluir pedidos actuales
		// Esto es importante cuando se cambia de local
		const filteredStatusHistory = statusHistory.filter(h => currentOrderDbIds.has(h.order_id));

		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const sevenDaysAgo = new Date(today);
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
		const thirtyDaysAgo = new Date(today);
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		// Filtrar pedidos por fecha
		const ordersToday = orders.filter(o => new Date(o.createdAt) >= today);
		const ordersLast7Days = orders.filter(o => new Date(o.createdAt) >= sevenDaysAgo);
		const ordersLast30Days = orders.filter(o => new Date(o.createdAt) >= thirtyDaysAgo);

		// ============================================
		// NIVEL 1 - MÉTRICAS ESENCIALES
		// ============================================

		// 💰 VENTAS
		const sales = calculateSales(orders, ordersToday, ordersLast7Days, ordersLast30Days);

		// 📦 PEDIDOS
		const ordersMetrics = calculateOrdersMetrics(orders, ordersToday);

		// ⏱️ TIEMPOS
		const times = calculateTimes(orders, filteredStatusHistory);

		// ============================================
		// NIVEL 2 - OPERACIÓN Y EFICIENCIA
		// ============================================

		// 🛵 REPARTIDORES
		const drivers = calculateDriversMetrics(orders, ordersToday, activeDrivers);

		// 🧭 RENDIMIENTO OPERATIVO
		const performance = calculatePerformanceMetrics(orders, filteredStatusHistory);

		return {
			loading,
			sales,
			orders: ordersMetrics,
			times,
			drivers,
			performance,
		};
	}, [orders, statusHistory, activeDrivers, loading]);

	return metrics;
}

// ============================================
// FUNCIONES DE CÁLCULO
// ============================================

function getEmptyMetrics() {
	return {
		loading: false, // No hay pedidos, no necesita cargar
		sales: {
			revenueToday: 0,
			revenueLast7Days: 0,
			revenueLast30Days: 0,
			averageTicket: 0,
		},
		orders: {
			totalToday: 0,
			completed: 0,
			cancelled: 0,
			cancellationRate: 0,
			byTimeSlot: {},
			byDay: [],
		},
		times: {
			averageTotalDelivery: 0,
			averagePreparation: 0,
			averageAssignment: 0,
			averageRoute: 0,
		},
		drivers: {
			activeToday: 0,
			averageOrdersPerDriver: 0,
			averageTimePerDriver: {},
			inactiveWithSession: 0,
		},
		performance: {
			delayed: 0,
			driverChanged: 0,
			reassigned: 0,
			rejected: 0,
		},
	};
}

function calculateSales(orders, ordersToday, ordersLast7Days, ordersLast30Days) {
	// Ingresos hoy
	const revenueToday = ordersToday
		.filter(o => o.status === 'Entregado' && o.suggestedPrice)
		.reduce((sum, o) => sum + (parseFloat(o.suggestedPrice) || 0), 0);

	// Ingresos últimos 7 días
	const revenueLast7Days = ordersLast7Days
		.filter(o => o.status === 'Entregado' && o.suggestedPrice)
		.reduce((sum, o) => sum + (parseFloat(o.suggestedPrice) || 0), 0);

	// Ingresos últimos 30 días
	const revenueLast30Days = ordersLast30Days
		.filter(o => o.status === 'Entregado' && o.suggestedPrice)
		.reduce((sum, o) => sum + (parseFloat(o.suggestedPrice) || 0), 0);

	// Ticket promedio (solo completados)
	const completedOrders = orders.filter(o => o.status === 'Entregado' && o.suggestedPrice);
	const averageTicket = completedOrders.length > 0
		? completedOrders.reduce((sum, o) => sum + (parseFloat(o.suggestedPrice) || 0), 0) / completedOrders.length
		: 0;

	return {
		revenueToday,
		revenueLast7Days,
		revenueLast30Days,
		averageTicket,
	};
}

function calculateOrdersMetrics(orders, ordersToday) {
	// Pedidos totales hoy
	const totalToday = ordersToday.length;

	// Pedidos completados
	const completed = orders.filter(o => o.status === 'Entregado').length;

	// Pedidos cancelados (asumimos que no hay estado "Cancelado" en el sistema actual)
	// Si en el futuro se agrega, se puede filtrar por status === 'Cancelado'
	const cancelled = 0; // Por ahora no hay cancelaciones

	// Tasa de cancelación
	const cancellationRate = orders.length > 0 ? (cancelled / orders.length) * 100 : 0;

	// Pedidos por franja horaria
	const byTimeSlot = {};
	ordersToday.forEach(order => {
		const hour = new Date(order.createdAt).getHours();
		const slot = getTimeSlot(hour);
		if (!byTimeSlot[slot]) {
			byTimeSlot[slot] = 0;
		}
		byTimeSlot[slot]++;
	});

	// Pedidos por día (últimos 7 días)
	const byDay = [];
	const today = new Date();
	for (let i = 6; i >= 0; i--) {
		const date = new Date(today);
		date.setDate(date.getDate() - i);
		date.setHours(0, 0, 0, 0);
		
		const nextDate = new Date(date);
		nextDate.setDate(nextDate.getDate() + 1);
		
		const dayOrders = orders.filter(o => {
			const orderDate = new Date(o.createdAt);
			return orderDate >= date && orderDate < nextDate;
		});
		
		byDay.push({
			date: date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }),
			dateShort: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
			count: dayOrders.length,
			completed: dayOrders.filter(o => o.status === 'Entregado').length,
		});
	}

	return {
		totalToday,
		completed,
		cancelled,
		cancellationRate,
		byTimeSlot,
		byDay,
	};
}

function getTimeSlot(hour) {
	if (hour >= 6 && hour < 12) return 'Mañana (6-12)';
	if (hour >= 12 && hour < 18) return 'Tarde (12-18)';
	if (hour >= 18 && hour < 24) return 'Noche (18-24)';
	return 'Madrugada (0-6)';
}

function calculateTimes(orders, statusHistory) {
	// Solo pedidos completados
	const completedOrders = orders.filter(o => o.status === 'Entregado');

	if (completedOrders.length === 0) {
		return {
			averageTotalDelivery: 0,
			averagePreparation: 0,
			averageAssignment: 0,
			averageRoute: 0,
		};
	}

	let totalDeliveryTime = 0;
	let totalPreparationTime = 0;
	let totalAssignmentTime = 0;
	let totalRouteTime = 0;
	let countWithTimes = 0;

	completedOrders.forEach(order => {
		const orderDbId = order._dbId || order.id?.replace('ORD-', '');
		if (!orderDbId) return;

		const orderHistory = statusHistory.filter(h => h.order_id === parseInt(orderDbId, 10));
		if (orderHistory.length === 0) {
			// Si no hay historial, usar created_at y updated_at
			const totalTime = new Date(order.updatedAt) - new Date(order.createdAt);
			totalDeliveryTime += totalTime;
			countWithTimes++;
			return;
		}

		// Ordenar historial por fecha
		orderHistory.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

		// Tiempo total de entrega
		const totalTime = new Date(order.updatedAt) - new Date(order.createdAt);
		totalDeliveryTime += totalTime;

		// Tiempo de preparación (Pendiente -> Asignado)
		const pendingToAssigned = findTimeBetweenStatuses(orderHistory, 'Pendiente', 'Asignado');
		if (pendingToAssigned > 0) {
			totalPreparationTime += pendingToAssigned;
		}

		// Tiempo de asignación (Pendiente -> Asignado, mismo que preparación)
		if (pendingToAssigned > 0) {
			totalAssignmentTime += pendingToAssigned;
		}

		// Tiempo en ruta (En camino al retiro -> Entregado)
		const routeTime = findTimeBetweenStatuses(orderHistory, 'En camino al retiro', 'Entregado');
		if (routeTime > 0) {
			totalRouteTime += routeTime;
		}

		countWithTimes++;
	});

	return {
		averageTotalDelivery: countWithTimes > 0 ? totalDeliveryTime / countWithTimes : 0,
		averagePreparation: countWithTimes > 0 ? totalPreparationTime / countWithTimes : 0,
		averageAssignment: countWithTimes > 0 ? totalAssignmentTime / countWithTimes : 0,
		averageRoute: countWithTimes > 0 ? totalRouteTime / countWithTimes : 0,
	};
}

function findTimeBetweenStatuses(history, fromStatus, toStatus) {
	const fromIndex = history.findIndex(h => h.status === fromStatus);
	const toIndex = history.findIndex(h => h.status === toStatus);

	if (fromIndex === -1 || toIndex === -1 || toIndex <= fromIndex) return 0;

	const fromTime = new Date(history[fromIndex].created_at);
	const toTime = new Date(history[toIndex].created_at);
	return toTime - fromTime;
}

function calculateDriversMetrics(orders, ordersToday, activeDrivers) {
	// Repartidores activos hoy (que tienen al menos un pedido hoy)
	const driversWithOrdersToday = new Set();
	ordersToday
		.filter(o => o.driverId)
		.forEach(o => driversWithOrdersToday.add(o.driverId));

	const activeToday = driversWithOrdersToday.size;

	// Pedidos promedio por repartidor
	const driverOrderCounts = {};
	ordersToday
		.filter(o => o.driverId)
		.forEach(o => {
			if (!driverOrderCounts[o.driverId]) {
				driverOrderCounts[o.driverId] = 0;
			}
			driverOrderCounts[o.driverId]++;
		});

	const totalOrdersByDrivers = Object.values(driverOrderCounts).reduce((sum, count) => sum + count, 0);
	const averageOrdersPerDriver = activeToday > 0 ? totalOrdersByDrivers / activeToday : 0;

	// Tiempo promedio por repartidor (simplificado - se puede mejorar)
	const averageTimePerDriver = {};

	// Repartidores inactivos con sesión abierta
	// Nota: Esto requiere verificar el estado de conexión, que actualmente está en localStorage
	// Por ahora, mostramos 0 o podemos implementar una verificación más compleja
	const inactiveWithSession = 0;

	return {
		activeToday,
		averageOrdersPerDriver,
		averageTimePerDriver,
		inactiveWithSession,
	};
}

function calculatePerformanceMetrics(orders, statusHistory) {
	// Pedidos retrasados (más de X minutos desde creación)
	// Asumimos que un pedido está retrasado si tiene más de 60 minutos y no está completado
	const now = Date.now();
	const delayed = orders.filter(o => {
		if (o.status === 'Entregado') return false;
		const age = now - new Date(o.createdAt).getTime();
		return age > 60 * 60 * 1000; // 60 minutos
	}).length;

	// Pedidos con cambio de repartidor
	// Verificar en el historial si un pedido tuvo múltiples driver_id diferentes
	const driverChanged = new Set();
	statusHistory.forEach(entry => {
		if (entry.driver_id) {
			const orderHistory = statusHistory.filter(h => h.order_id === entry.order_id);
			const uniqueDrivers = new Set(orderHistory.map(h => h.driver_id).filter(Boolean));
			if (uniqueDrivers.size > 1) {
				driverChanged.add(entry.order_id);
			}
		}
	});

	// Pedidos reasignados (mismo concepto que cambio de repartidor)
	const reassigned = driverChanged.size;

	// Pedidos rechazados (no hay estado de rechazo actualmente)
	const rejected = 0;

	return {
		delayed,
		driverChanged: driverChanged.size,
		reassigned,
		rejected,
	};
}

