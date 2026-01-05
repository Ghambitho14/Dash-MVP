import { Package } from 'lucide-react';
import { OrderCard as CompanyOrderCard } from './OrderCard';

export function OrderList({ orders, onSelectOrder, onDeleteOrder, currentUser }) {
	if (orders.length === 0) {
		return (
			<div className="delivery-empty-state">
				<Package size={64} />
				<h3>No hay pedidos</h3>
				<p>Los pedidos aparecerán aquí cuando se creen</p>
			</div>
		);
	}

	return (
		<>
			{orders.map((order) => (
				<CompanyOrderCard
					key={order.id}
					order={order}
					onClick={() => onSelectOrder(order)}
					onDelete={onDeleteOrder}
					showDriver={true}
					currentUser={currentUser}
				/>
			))}
		</>
	);
}

