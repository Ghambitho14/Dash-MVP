import { Plus, Users, UserCog, Settings } from 'lucide-react';
import '../../styles/Components/QuickActions.css';

export function QuickActions({ isAdmin, onCreateOrder, onShowClients, onShowUsers, onShowSettings }) {
	return (
		<div className="delivery-actions-card">
			<h3 className="delivery-actions-title">Acciones Rápidas</h3>
			<div className="delivery-actions-grid">
				<button 
					className="delivery-action-button"
					onClick={onCreateOrder}
					title="Crear nuevo pedido"
				>
					<Plus />
					<span className="delivery-action-text">Nuevo Pedido</span>
				</button>
				
				<button 
					className="delivery-action-button secondary"
					onClick={onShowClients}
					title="Gestionar clientes"
				>
					<Users />
					<span className="delivery-action-text">Clientes</span>
				</button>
				
				{isAdmin && (
					<>
						<button 
							className="delivery-action-button secondary"
							onClick={onShowUsers}
							title="Gestionar usuarios"
						>
							<UserCog />
							<span className="delivery-action-text">Usuarios</span>
						</button>
						
						<button 
							className="delivery-action-button secondary"
							onClick={onShowSettings}
							title="Configuración"
						>
							<Settings />
							<span className="delivery-action-text">Configurar</span>
						</button>
					</>
				)}
			</div>
		</div>
	);
}

