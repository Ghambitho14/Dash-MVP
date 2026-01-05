import { OrderCard } from './OrderCard';
import { useCurrentTime } from '../../hooks/useCurrentTime';
import '../../styles/Components/OrderList.css';

export function OrderList({ orders, onAcceptOrder, onUpdateStatus }) {
	const currentTime = useCurrentTime();
	
	if (orders.length === 0) {
		return (
			<div className="order-list-empty">
				<p className="order-list-empty-text">No hay pedidos para mostrar</p>
			</div>
		);
	}

	return (
		<div className="order-list">
			{orders.map((order) => (
				<OrderCard
					key={order.id}
					order={order}
					onAcceptOrder={onAcceptOrder}
					onUpdateStatus={onUpdateStatus}
					currentTime={currentTime}
				/>
			))}
		</div>
	);
}

