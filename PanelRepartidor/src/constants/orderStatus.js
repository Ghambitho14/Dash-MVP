// Constantes y utilidades para estados de pedidos
// Fuente única de verdad para estados y transiciones

export const ORDER_STATUS = Object.freeze({
	PENDIENTE: 'Pendiente',
	ASIGNADO: 'Asignado',
	EN_CAMINO: 'En camino al retiro', // Estado oficial en BD
	EN_CAMINO_ALIAS: 'En camino', // Alias para compatibilidad
	PRODUCTO_RETIRADO: 'Producto retirado',
	ENTREGADO: 'Entregado',
});

// Mapeo de alias a estado oficial (para normalización)
export const STATUS_ALIAS_MAP = Object.freeze({
	'En camino': ORDER_STATUS.EN_CAMINO,
	'En camino al retiro': ORDER_STATUS.EN_CAMINO,
});

// Normalizar estado (convierte alias a estado oficial)
export function normalizeStatus(status) {
	if (!status) return status;
	return STATUS_ALIAS_MAP[status] || status;
}

export const TRANSITIONS = Object.freeze({
	[ORDER_STATUS.PENDIENTE]: [ORDER_STATUS.ASIGNADO],
	[ORDER_STATUS.ASIGNADO]: [ORDER_STATUS.EN_CAMINO],
	[ORDER_STATUS.EN_CAMINO]: [ORDER_STATUS.PRODUCTO_RETIRADO],
	[ORDER_STATUS.PRODUCTO_RETIRADO]: [ORDER_STATUS.ENTREGADO],
	[ORDER_STATUS.ENTREGADO]: [],
});

export const TRANSITION_RULES = Object.freeze({
	[`${ORDER_STATUS.EN_CAMINO}=>${ORDER_STATUS.PRODUCTO_RETIRADO}`]: {
		requiresPickupCode: true,
	},
});

export function canTransition(fromStatus, toStatus) {
	const normalizedFrom = normalizeStatus(fromStatus);
	const normalizedTo = normalizeStatus(toStatus);
	const allowed = TRANSITIONS[normalizedFrom] || [];
	return allowed.includes(normalizedTo);
}

export function getNextStatus(currentStatus) {
	const normalized = normalizeStatus(currentStatus);
	const allowed = TRANSITIONS[normalized] || [];
	return allowed.length > 0 ? allowed[0] : null;
}

export function getTransitionRule(fromStatus, toStatus) {
	const normalizedFrom = normalizeStatus(fromStatus);
	const normalizedTo = normalizeStatus(toStatus);
	return TRANSITION_RULES[`${normalizedFrom}=>${normalizedTo}`] || {};
}

export function getPrimaryAction(order) {
	if (!order?.status) return null;
	
	const next = getNextStatus(order.status);
	if (!next) return null;

	const rule = getTransitionRule(order.status, next);

	return {
		type: 'ADVANCE_STATUS',
		label: next === ORDER_STATUS.ENTREGADO ? 'Entregar pedido' : `Marcar como: ${next}`,
		toStatus: next,
		requiresPickupCode: !!rule.requiresPickupCode,
	};
}

export function validateOrderForTransition(order, toStatus) {
	if (!order?.status) return { ok: false, reason: 'Pedido sin estado' };

	const normalizedTo = normalizeStatus(toStatus);

	if (!canTransition(order.status, normalizedTo)) {
		return { ok: false, reason: `Transición inválida: ${order.status} → ${normalizedTo}` };
	}

	const rule = getTransitionRule(order.status, normalizedTo);
	if (rule.requiresPickupCode && !order.pickupCode) {
		return { ok: false, reason: 'Este pedido no tiene pickupCode configurado' };
	}

	return { ok: true };
}

