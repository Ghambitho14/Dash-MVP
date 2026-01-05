import { useState, useEffect } from 'react';
import { Building2, UserPlus, LogOut, Plus, X, Edit2, FileText, CheckCircle, XCircle, Trash2, MapPin, Bell } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { hashPassword } from '../utils/passwordUtils';
import { validateRUT, validateChileanPhone, validateEmail, formatRUT, formatChileanPhone, checkRUTExistsInDrivers, checkEmailExistsInDrivers, checkPhoneExistsInDrivers } from '../utils/validationUtils';
import {
	loadCompanyRegistrationRequests,
	loadDriverRegistrationRequests,
	approveCompanyRequest,
	rejectCompanyRequest,
	approveDriverRequest,
	rejectDriverRequest,
} from '../services/registrationRequestsService';
import { useDriverLocations } from '../hooks/useDriverLocations';
import { useToast } from '../hooks/useToast';
import { AdminTrackingMap } from './AdminTrackingMap';
import '../style/Dashboard.css';

export function Dashboard({ admin, onLogout }) {
	const { showSuccess, showError, showWarning } = useToast();
	const [activeTab, setActiveTab] = useState('requests');
	const [companies, setCompanies] = useState([]);
	const [drivers, setDrivers] = useState([]);
	const [companyRequests, setCompanyRequests] = useState([]);
	const [driverRequests, setDriverRequests] = useState([]);
	const [showCompanyForm, setShowCompanyForm] = useState(false);
	const [showDriverForm, setShowDriverForm] = useState(false);
	const [editingCompany, setEditingCompany] = useState(null);
	const [editingDriver, setEditingDriver] = useState(null);
	const [loading, setLoading] = useState(false);
	const [processingRequest, setProcessingRequest] = useState(null);
	const [showRejectModal, setShowRejectModal] = useState(null);
	const [rejectNotes, setRejectNotes] = useState('');
	
	// Tracking de ubicaciones de repartidores
	const { locations, loading: locationsLoading, error: locationsError, reload: reloadLocations } = useDriverLocations();

	// Formulario de empresa
	const [companyForm, setCompanyForm] = useState({
		name: '',
		business_name: '',
		tax_id: '',
		phone: '',
		email: '',
		address: '',
		username: '',
		password: '',
	});

	// Formulario de repartidor
	const [driverForm, setDriverForm] = useState({
		username: '',
		password: '',
		name: '',
		phone: '',
		email: '',
		company_id: '',
	});

	useEffect(() => {
		loadCompanies();
		loadDrivers();
		loadRequests();
	}, []);

	const loadRequests = async () => {
		try {
			const [companyReqs, driverReqs] = await Promise.all([
				loadCompanyRegistrationRequests(),
				loadDriverRegistrationRequests(),
			]);
			setCompanyRequests(companyReqs);
			setDriverRequests(driverReqs);
		} catch (err) {
			console.error('Error cargando solicitudes:', err);
		}
	};

	const loadCompanies = async () => {
		try {
			const { data, error } = await supabase
				.from('companies')
				.select('*')
				.order('created_at', { ascending: false });

			if (error) throw error;
			setCompanies(data || []);
		} catch (err) {
			console.error('Error cargando empresas:', err);
		}
	};

	const loadDrivers = async () => {
		try {
			const { data, error } = await supabase
				.from('drivers')
				.select('*')
				.order('created_at', { ascending: false });

			if (error) throw error;
			setDrivers(data || []);
		} catch (err) {
			console.error('Error cargando repartidores:', err);
		}
	};

	const handleCreateCompany = async (e) => {
		e.preventDefault();
		setLoading(true);

		try {
			// Validar contraseña si se proporciona
			if (companyForm.password && companyForm.password.trim()) {
				if (companyForm.password.length < 6) {
					setLoading(false);
					return;
				}
			}

			if (editingCompany) {
				// Actualizar empresa existente
				const { data: companyData, error: companyError } = await supabase
					.from('companies')
					.update({
						name: companyForm.name,
						business_name: companyForm.business_name,
						tax_id: companyForm.tax_id || null,
						phone: companyForm.phone,
						email: companyForm.email || null,
						address: companyForm.address || null,
					})
					.eq('id', editingCompany.id)
					.select()
					.single();

				if (companyError) throw companyError;

				// Actualizar usuario si se cambió username o password
				if (companyForm.username || companyForm.password) {
					const updateData = {};
					if (companyForm.username) updateData.username = companyForm.username;
					if (companyForm.password && companyForm.password.trim()) {
						// Hashear contraseña antes de guardar
						updateData.password = await hashPassword(companyForm.password);
					}

					const { error: userError } = await supabase
						.from('company_users')
						.update(updateData)
						.eq('company_id', editingCompany.id)
						.eq('role', 'empresarial');

					if (userError) {
						console.error('Error actualizando usuario:', userError);
						throw userError;
					}
				}

				setCompanies(companies.map(c => c.id === editingCompany.id ? companyData : c));
				setEditingCompany(null);
			} else {
				// Crear nueva empresa
				const { data: companyData, error: companyError } = await supabase
					.from('companies')
					.insert({
						name: companyForm.name,
						business_name: companyForm.business_name,
						tax_id: companyForm.tax_id || null,
						phone: companyForm.phone,
						email: companyForm.email || null,
						address: companyForm.address || null,
						superadmin_id: admin.id,
						active: true,
					})
					.select()
					.single();

				if (companyError) throw companyError;

				// Crear el usuario empresarial para acceder a la app
				if (companyForm.username && companyForm.password) {
					// Hashear contraseña antes de guardar
					const hashedPassword = await hashPassword(companyForm.password);
					
					const { data: userData, error: userError } = await supabase
						.from('company_users')
						.insert({
							company_id: companyData.id,
							username: companyForm.username,
							password: hashedPassword,
							role: 'empresarial',
							name: companyForm.name,
						})
						.select()
						.single();

					if (userError) {
						console.error('Error creando usuario:', userError);
						await supabase.from('companies').delete().eq('id', companyData.id);
						throw userError;
					}
					
					console.log('Usuario creado exitosamente:', userData);
				} else {
					throw new Error('Usuario y contraseña son requeridos');
				}

				setCompanies([companyData, ...companies]);
			}

			setCompanyForm({
				name: '',
				business_name: '',
				tax_id: '',
				phone: '',
				email: '',
				address: '',
				username: '',
				password: '',
			});
			setShowCompanyForm(false);
		} catch (err) {
			console.error('Error al ' + (editingCompany ? 'actualizar' : 'crear') + ' empresa: ' + err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleCreateDriver = async (e) => {
		e.preventDefault();
		setLoading(true);

		try {
			// Validar contraseña
			if (!editingDriver && (!driverForm.password || !driverForm.password.trim())) {
				showError('La contraseña es requerida');
				setLoading(false);
				return;
			}
			if (driverForm.password && driverForm.password.trim()) {
				if (driverForm.password.length < 6) {
					showError('La contraseña debe tener al menos 6 caracteres');
					setLoading(false);
					return;
				}
			}

			// Validar teléfono chileno
			if (!validateChileanPhone(driverForm.phone)) {
				showError('El teléfono debe ser un número móvil chileno (ej: +56912345678 o 912345678).');
				setLoading(false);
				return;
			}

			// Validar email si se proporciona
			if (driverForm.email && driverForm.email.trim() && !validateEmail(driverForm.email)) {
				showError('El email ingresado no es válido.');
				setLoading(false);
				return;
			}

			// Verificar duplicados
			const phoneCheck = await checkPhoneExistsInDrivers(driverForm.phone, editingDriver?.id);
			if (phoneCheck.exists) {
				showError(phoneCheck.message);
				setLoading(false);
				return;
			}

			if (driverForm.email && driverForm.email.trim()) {
				const emailCheck = await checkEmailExistsInDrivers(driverForm.email, editingDriver?.id);
				if (emailCheck.exists) {
					showError(emailCheck.message);
					setLoading(false);
					return;
				}
			}

			if (editingDriver) {
				// Actualizar repartidor existente
				const updateData = {
					username: driverForm.username,
					name: driverForm.name,
					phone: driverForm.phone,
					email: driverForm.email || null,
					company_id: driverForm.company_id || null,
				};

				// Solo actualizar password si se proporcionó una nueva
				if (driverForm.password && driverForm.password.trim()) {
					updateData.password = await hashPassword(driverForm.password);
				}

				const { data, error } = await supabase
					.from('drivers')
					.update(updateData)
					.eq('id', editingDriver.id)
					.select()
					.single();

				if (error) {
					console.error('Error actualizando repartidor:', error);
					throw error;
				}

				console.log('Repartidor actualizado exitosamente:', data);
				setDrivers(drivers.map(d => d.id === editingDriver.id ? data : d));
				setEditingDriver(null);
			} else {
				// Crear nuevo repartidor
				// Hashear contraseña antes de guardar
				const hashedPassword = await hashPassword(driverForm.password);
				
				const { data, error } = await supabase
					.from('drivers')
					.insert({
						username: driverForm.username,
						password: hashedPassword,
						name: driverForm.name,
						phone: driverForm.phone,
						email: driverForm.email || null,
						company_id: driverForm.company_id || null,
						active: true,
					})
					.select()
					.single();

				if (error) {
					console.error('Error creando repartidor:', error);
					throw error;
				}

				console.log('Repartidor creado exitosamente:', data);
				setDrivers([data, ...drivers]);
			}

			setDriverForm({
				username: '',
				password: '',
				name: '',
				phone: '',
				email: '',
				company_id: '',
			});
			setShowDriverForm(false);
		} catch (err) {
			console.error('Error completo:', err);
			showError('Error al ' + (editingDriver ? 'actualizar' : 'crear') + ' repartidor: ' + err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleEditCompany = (company) => {
		setEditingCompany(company);
		setCompanyForm({
			name: company.name,
			business_name: company.business_name || '',
			tax_id: company.tax_id || '',
			phone: company.phone,
			email: company.email || '',
			address: company.address || '',
			username: '', // No mostramos el username actual por seguridad
			password: '', // No mostramos la contraseña actual por seguridad
		});
		setShowCompanyForm(true);
	};

	const handleEditDriver = (driver) => {
		setEditingDriver(driver);
		setDriverForm({
			username: driver.username,
			password: '', // No mostramos la contraseña actual por seguridad
			name: driver.name,
			phone: driver.phone,
			email: driver.email || '',
			company_id: driver.company_id || '',
		});
		setShowDriverForm(true);
	};

	const handleCancelEdit = () => {
		setEditingCompany(null);
		setEditingDriver(null);
		setShowCompanyForm(false);
		setShowDriverForm(false);
		setCompanyForm({
			name: '',
			business_name: '',
			tax_id: '',
			phone: '',
			email: '',
			address: '',
			username: '',
			password: '',
		});
		setDriverForm({
			username: '',
			password: '',
			name: '',
			phone: '',
			email: '',
			company_id: '',
		});
	};

	const handleDeleteCompany = async (companyId) => {
		if (!confirm('¿Estás seguro de que deseas eliminar esta empresa? Esta acción no se puede deshacer.')) {
			return;
		}

		setLoading(true);
		try {
			// Primero eliminar los usuarios asociados
			const { error: usersError } = await supabase
				.from('company_users')
				.delete()
				.eq('company_id', companyId);

			if (usersError) {
				console.error('Error eliminando usuarios:', usersError);
				throw usersError;
			}

			// Luego eliminar la empresa
			const { error: companyError } = await supabase
				.from('companies')
				.delete()
				.eq('id', companyId);

			if (companyError) {
				console.error('Error eliminando empresa:', companyError);
				throw companyError;
			}

			showSuccess('Empresa eliminada exitosamente');
			await loadCompanies();
		} catch (err) {
			console.error('Error eliminando empresa:', err);
			showError('Error al eliminar empresa: ' + err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteDriver = async (driverId) => {
		if (!confirm('¿Estás seguro de que deseas eliminar este repartidor? Esta acción no se puede deshacer.')) {
			return;
		}

		setLoading(true);
		try {
			const { error: driverError } = await supabase
				.from('drivers')
				.delete()
				.eq('id', driverId);

			if (driverError) {
				console.error('Error eliminando repartidor:', driverError);
				throw driverError;
			}

			showSuccess('Repartidor eliminado exitosamente');
			await loadDrivers();
		} catch (err) {
			console.error('Error eliminando repartidor:', err);
			showError('Error al eliminar repartidor: ' + err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleApproveCompanyRequest = async (requestId) => {
		if (!confirm('¿Estás seguro de aprobar esta solicitud de empresa?')) return;

		setProcessingRequest(requestId);
		try {
			await approveCompanyRequest(requestId, admin.id);
			showSuccess('Solicitud aprobada exitosamente');
			await loadRequests();
			await loadCompanies(); // Recargar empresas
		} catch (err) {
			showError('Error al aprobar solicitud: ' + err.message);
		} finally {
			setProcessingRequest(null);
		}
	};

	const handleRejectCompanyRequest = async (requestId) => {
		if (!rejectNotes.trim()) {
			showWarning('Por favor ingresa un motivo de rechazo');
			return;
		}

		setProcessingRequest(requestId);
		try {
			await rejectCompanyRequest(requestId, admin.id, rejectNotes);
			showSuccess('Solicitud rechazada');
			setShowRejectModal(null);
			setRejectNotes('');
			await loadRequests();
		} catch (err) {
			showError('Error al rechazar solicitud: ' + err.message);
		} finally {
			setProcessingRequest(null);
		}
	};

	const handleApproveDriverRequest = async (requestId) => {
		if (!confirm('¿Estás seguro de aprobar esta solicitud de repartidor?')) return;

		setProcessingRequest(requestId);
		try {
			await approveDriverRequest(requestId, admin.id);
			showSuccess('Solicitud aprobada exitosamente');
			await loadRequests();
			await loadDrivers(); // Recargar repartidores
		} catch (err) {
			showError('Error al aprobar solicitud: ' + err.message);
		} finally {
			setProcessingRequest(null);
		}
	};

	const handleRejectDriverRequest = async (requestId) => {
		if (!rejectNotes.trim()) {
			showWarning('Por favor ingresa un motivo de rechazo');
			return;
		}

		setProcessingRequest(requestId);
		try {
			await rejectDriverRequest(requestId, admin.id, rejectNotes);
			showSuccess('Solicitud rechazada');
			setShowRejectModal(null);
			setRejectNotes('');
			await loadRequests();
		} catch (err) {
			showError('Error al rechazar solicitud: ' + err.message);
		} finally {
			setProcessingRequest(null);
		}
	};

	return (
		<div className="admin-dashboard">
			<header className="admin-dashboard-header">
				<div>
					<h1>Panel de Administración</h1>
					<p>Bienvenido, {admin.name}</p>
				</div>
				<div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
					<button 
						className="admin-logout-button admin-notification-button"
						style={{ background: '#f59e0b' }}
						title="Notificaciones"
						onClick={() => {
							// TODO: Implementar notificaciones
							console.log('Notificaciones');
						}}
					>
						<Bell size={16} />
					</button>
					<button onClick={onLogout} className="admin-logout-button">
						<LogOut />
						Cerrar Sesión
					</button>
				</div>
			</header>

			<div className="admin-dashboard-tabs">
				<button
					className={activeTab === 'requests' ? 'active' : ''}
					onClick={() => setActiveTab('requests')}
				>
					<FileText />
					Solicitudes
					{(companyRequests.length > 0 || driverRequests.length > 0) && (
						<span className="admin-tab-badge">
							{companyRequests.length + driverRequests.length}
						</span>
					)}
				</button>
				<button
					className={activeTab === 'companies' ? 'active' : ''}
					onClick={() => setActiveTab('companies')}
				>
					<Building2 />
					Empresas
				</button>
				<button
					className={activeTab === 'drivers' ? 'active' : ''}
					onClick={() => setActiveTab('drivers')}
				>
					<UserPlus />
					Repartidores
				</button>
				<button
					className={activeTab === 'tracking' ? 'active' : ''}
					onClick={() => setActiveTab('tracking')}
				>
					<MapPin />
					Tracking
					{locations.length > 0 && (
						<span className="admin-tab-badge">
							{locations.length}
						</span>
					)}
				</button>
			</div>

			<div className="admin-dashboard-content">
				{activeTab === 'requests' && (
					<div className="admin-section">
						<h2>Solicitudes de Registro</h2>

						{/* Solicitudes de Empresas */}
						<div style={{ marginBottom: '2rem' }}>
							<h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 600 }}>
								Solicitudes de Empresas ({companyRequests.length})
							</h3>
							{companyRequests.length === 0 ? (
								<p className="admin-empty">No hay solicitudes de empresas pendientes</p>
							) : (
								<div className="admin-list">
									{companyRequests.map((request) => (
										<div key={request.id} className="admin-card">
											<div style={{ flex: 1 }}>
												<h3>{request.company_name}</h3>
												<p style={{ marginTop: '0.5rem', color: '#6b7280' }}>
													<strong>Usuario:</strong> {request.username} • <strong>Nombre:</strong> {request.name}
												</p>
												{request.email && (
													<p style={{ marginTop: '0.25rem', color: '#6b7280' }}>
														<strong>Email:</strong> {request.email}
													</p>
												)}
												{request.phone && (
													<p style={{ marginTop: '0.25rem', color: '#6b7280' }}>
														<strong>Teléfono:</strong> {request.phone}
													</p>
												)}
												<p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
													Solicitado: {new Date(request.created_at).toLocaleDateString('es-ES', {
														year: 'numeric',
														month: 'long',
														day: 'numeric',
														hour: '2-digit',
														minute: '2-digit',
													})}
												</p>
											</div>
											<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
												<button
													onClick={() => handleApproveCompanyRequest(request.id)}
													className="admin-approve-button"
													disabled={processingRequest === request.id}
													title="Aprobar solicitud"
												>
													<CheckCircle size={18} />
													Aprobar
												</button>
												<button
													onClick={() => setShowRejectModal({ type: 'company', id: request.id })}
													className="admin-reject-button"
													disabled={processingRequest === request.id}
													title="Rechazar solicitud"
												>
													<XCircle size={18} />
													Rechazar
												</button>
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Solicitudes de Repartidores */}
						<div>
							<h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 600 }}>
								Solicitudes de Repartidores ({driverRequests.length})
							</h3>
							{driverRequests.length === 0 ? (
								<p className="admin-empty">No hay solicitudes de repartidores pendientes</p>
							) : (
								<div className="admin-list">
									{driverRequests.map((request) => (
										<div key={request.id} className="admin-card">
											<div style={{ flex: 1 }}>
												<h3>{request.name}</h3>
												<p style={{ marginTop: '0.5rem', color: '#6b7280' }}>
													<strong>Usuario:</strong> {request.username} • <strong>RUT:</strong> {request.document_id}
												</p>
												<p style={{ marginTop: '0.25rem', color: '#6b7280' }}>
													<strong>Teléfono:</strong> {request.phone}
													{request.email && ` • <strong>Email:</strong> ${request.email}`}
												</p>
												<p style={{ marginTop: '0.25rem', color: '#6b7280' }}>
													<strong>Vehículo:</strong> {request.vehicle_type}
													{request.vehicle_brand && ` • ${request.vehicle_brand}`}
													{request.vehicle_model && ` ${request.vehicle_model}`}
												</p>
												<p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
													Solicitado: {new Date(request.created_at).toLocaleDateString('es-ES', {
														year: 'numeric',
														month: 'long',
														day: 'numeric',
														hour: '2-digit',
														minute: '2-digit',
													})}
												</p>
											</div>
											<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
												<button
													onClick={() => handleApproveDriverRequest(request.id)}
													className="admin-approve-button"
													disabled={processingRequest === request.id}
													title="Aprobar solicitud"
												>
													<CheckCircle size={18} />
													Aprobar
												</button>
												<button
													onClick={() => setShowRejectModal({ type: 'driver', id: request.id })}
													className="admin-reject-button"
													disabled={processingRequest === request.id}
													title="Rechazar solicitud"
												>
													<XCircle size={18} />
													Rechazar
												</button>
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Modal de Rechazo */}
						{showRejectModal && (
							<div className="admin-modal-overlay" onClick={() => {
								setShowRejectModal(null);
								setRejectNotes('');
							}}>
								<div className="admin-modal" onClick={(e) => e.stopPropagation()}>
									<div className="admin-modal-header">
										<h3>Rechazar Solicitud</h3>
										<button onClick={() => {
											setShowRejectModal(null);
											setRejectNotes('');
										}}>
											<X />
										</button>
									</div>
									<div className="admin-form">
										<div className="admin-form-field">
											<label>Motivo del rechazo *</label>
											<textarea
												value={rejectNotes}
												onChange={(e) => setRejectNotes(e.target.value)}
												placeholder="Ingresa el motivo por el cual se rechaza esta solicitud..."
												rows="4"
												required
											/>
										</div>
										<div className="admin-form-actions">
											<button
												type="button"
												onClick={() => {
													setShowRejectModal(null);
													setRejectNotes('');
												}}
											>
												Cancelar
											</button>
											<button
												type="button"
												onClick={() => {
													if (showRejectModal.type === 'company') {
														handleRejectCompanyRequest(showRejectModal.id);
													} else {
														handleRejectDriverRequest(showRejectModal.id);
													}
												}}
												disabled={!rejectNotes.trim() || processingRequest}
											>
												{processingRequest ? 'Rechazando...' : 'Rechazar Solicitud'}
											</button>
										</div>
									</div>
								</div>
							</div>
						)}
					</div>
				)}

				{activeTab === 'companies' && (
					<div className="admin-section">
						<div className="admin-section-header">
							<h2>Empresas</h2>
							<button
								onClick={() => {
									setEditingCompany(null);
									setCompanyForm({
										name: '',
										business_name: '',
										tax_id: '',
										phone: '',
										email: '',
										address: '',
										username: '',
										password: '',
									});
									setShowCompanyForm(true);
								}}
								className="admin-add-button"
							>
								<Plus />
								Nueva Empresa
							</button>
						</div>

						{showCompanyForm && (
							<div className="admin-modal-overlay" onClick={() => setShowCompanyForm(false)}>
								<div className="admin-modal" onClick={(e) => e.stopPropagation()}>
									<div className="admin-modal-header">
										<h3>{editingCompany ? 'Editar Empresa' : 'Nueva Empresa'}</h3>
										<button onClick={handleCancelEdit}>
											<X />
										</button>
									</div>
									<form onSubmit={handleCreateCompany} className="admin-form">
										<div className="admin-form-field">
											<label>Nombre *</label>
											<input
												type="text"
												value={companyForm.name}
												onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
												required
											/>
										</div>
										<div className="admin-form-field">
											<label>Razón Social</label>
											<input
												type="text"
												value={companyForm.business_name}
												onChange={(e) => setCompanyForm({ ...companyForm, business_name: e.target.value })}
											/>
										</div>
										<div className="admin-form-field">
											<label>RUT</label>
											<input
												type="text"
												value={companyForm.tax_id}
												onChange={(e) => setCompanyForm({ ...companyForm, tax_id: e.target.value })}
											/>
										</div>
										<div className="admin-form-field">
											<label>Teléfono *</label>
											<input
												type="tel"
												value={companyForm.phone}
												onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
												required
											/>
										</div>
										<div className="admin-form-field">
											<label>Email</label>
											<input
												type="email"
												value={companyForm.email}
												onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
											/>
										</div>
										<div className="admin-form-field">
											<label>Dirección</label>
											<textarea
												value={companyForm.address}
												onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
												rows="3"
											/>
										</div>
										{!editingCompany && (
											<>
												<div className="admin-form-field">
													<label>Usuario para App Principal *</label>
													<input
														type="text"
														value={companyForm.username}
														onChange={(e) => setCompanyForm({ ...companyForm, username: e.target.value })}
														placeholder="Usuario para acceder a la app"
														required
													/>
												</div>
												<div className="admin-form-field">
													<label>Contraseña para App Principal *</label>
													<input
														type="password"
														value={companyForm.password}
														onChange={(e) => setCompanyForm({ ...companyForm, password: e.target.value })}
														placeholder="Contraseña para acceder a la app"
														required
													/>
												</div>
											</>
										)}
										{editingCompany && (
											<>
												<div className="admin-form-field">
													<label>Nuevo Usuario (opcional)</label>
													<input
														type="text"
														value={companyForm.username}
														onChange={(e) => setCompanyForm({ ...companyForm, username: e.target.value })}
														placeholder="Dejar vacío para no cambiar"
													/>
												</div>
												<div className="admin-form-field">
													<label>Nueva Contraseña (opcional)</label>
													<input
														type="password"
														value={companyForm.password}
														onChange={(e) => setCompanyForm({ ...companyForm, password: e.target.value })}
														placeholder="Dejar vacío para no cambiar"
													/>
												</div>
											</>
										)}
										<div className="admin-form-actions">
											<button type="button" onClick={handleCancelEdit}>
												Cancelar
											</button>
											<button type="submit" disabled={loading}>
												{loading ? (editingCompany ? 'Actualizando...' : 'Creando...') : (editingCompany ? 'Actualizar Empresa' : 'Crear Empresa')}
											</button>
										</div>
									</form>
								</div>
							</div>
						)}

						<div className="admin-list">
							{companies.length === 0 ? (
								<p className="admin-empty">No hay empresas registradas</p>
							) : (
								companies.map((company) => (
									<div key={company.id} className="admin-card">
										<div>
											<h3>{company.name}</h3>
											<p>{company.business_name || company.email || company.phone}</p>
										</div>
										<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
											<span className={company.active ? 'status-active' : 'status-inactive'}>
												{company.active ? 'Activa' : 'Inactiva'}
											</span>
											<button
												onClick={() => handleEditCompany(company)}
												className="admin-edit-button"
												title="Editar empresa"
											>
												<Edit2 size={16} />
											</button>
											<button
												onClick={() => handleDeleteCompany(company.id)}
												className="admin-delete-button"
												title="Eliminar empresa"
												disabled={loading}
											>
												<Trash2 size={16} />
											</button>
										</div>
									</div>
								))
							)}
						</div>
					</div>
				)}

				{activeTab === 'drivers' && (
					<div className="admin-section">
						<div className="admin-section-header">
							<h2>Repartidores</h2>
							<button
								onClick={() => {
									setEditingDriver(null);
									setDriverForm({
										username: '',
										password: '',
										name: '',
										phone: '',
										email: '',
										company_id: '',
									});
									setShowDriverForm(true);
								}}
								className="admin-add-button"
							>
								<Plus />
								Nuevo Repartidor
							</button>
						</div>

						{showDriverForm && (
							<div className="admin-modal-overlay" onClick={() => setShowDriverForm(false)}>
								<div className="admin-modal" onClick={(e) => e.stopPropagation()}>
									<div className="admin-modal-header">
										<h3>{editingDriver ? 'Editar Repartidor' : 'Nuevo Repartidor'}</h3>
										<button onClick={handleCancelEdit}>
											<X />
										</button>
									</div>
									<form onSubmit={handleCreateDriver} className="admin-form">
										<div className="admin-form-field">
											<label>Usuario *</label>
											<input
												type="text"
												value={driverForm.username}
												onChange={(e) => setDriverForm({ ...driverForm, username: e.target.value })}
												required
											/>
										</div>
										<div className="admin-form-field">
											<label>{editingDriver ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}</label>
											<input
												type="password"
												value={driverForm.password}
												onChange={(e) => setDriverForm({ ...driverForm, password: e.target.value })}
												placeholder={editingDriver ? 'Dejar vacío para no cambiar' : ''}
												required={!editingDriver}
											/>
										</div>
										<div className="admin-form-field">
											<label>Nombre *</label>
											<input
												type="text"
												value={driverForm.name}
												onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
												required
											/>
										</div>
										<div className="admin-form-field">
											<label>Teléfono *</label>
											<input
												type="tel"
												value={driverForm.phone}
												onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
												required
											/>
										</div>
										<div className="admin-form-field">
											<label>Email</label>
											<input
												type="email"
												value={driverForm.email}
												onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
											/>
										</div>
										<div className="admin-form-field">
											<label>Empresa (Opcional)</label>
											<select
												value={driverForm.company_id}
												onChange={(e) => setDriverForm({ ...driverForm, company_id: e.target.value })}
											>
												<option value="">Sin empresa</option>
												{companies.map((company) => (
													<option key={company.id} value={company.id}>
														{company.name}
													</option>
												))}
											</select>
										</div>
										<div className="admin-form-actions">
											<button type="button" onClick={handleCancelEdit}>
												Cancelar
											</button>
											<button type="submit" disabled={loading}>
												{loading ? (editingDriver ? 'Actualizando...' : 'Creando...') : (editingDriver ? 'Actualizar Repartidor' : 'Crear Repartidor')}
											</button>
										</div>
									</form>
								</div>
							</div>
						)}

						<div className="admin-list">
							{drivers.length === 0 ? (
								<p className="admin-empty">No hay repartidores registrados</p>
							) : (
								drivers.map((driver) => (
									<div key={driver.id} className="admin-card">
										<div>
											<h3>{driver.name}</h3>
											<p>{driver.username} • {driver.phone}</p>
										</div>
										<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
											<span className={driver.active ? 'status-active' : 'status-inactive'}>
												{driver.active ? 'Activo' : 'Inactivo'}
											</span>
											<button
												onClick={() => handleEditDriver(driver)}
												className="admin-edit-button"
												title="Editar repartidor"
											>
												<Edit2 size={16} />
											</button>
											<button
												onClick={() => handleDeleteDriver(driver.id)}
												className="admin-delete-button"
												title="Eliminar repartidor"
												disabled={loading}
											>
												<Trash2 size={16} />
											</button>
										</div>
									</div>
								))
							)}
						</div>
					</div>
				)}

				{activeTab === 'tracking' && (
					<div className="admin-section">
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
							<div>
								<h2>Tracking de Repartidores</h2>
								<p style={{ marginTop: '0.5rem', color: '#6b7280' }}>
									Ubicaciones en tiempo real de todos los repartidores activos
								</p>
							</div>
							{locationsError && (
								<button
									onClick={() => reloadLocations()}
									style={{
										padding: '0.5rem 1rem',
										backgroundColor: '#3b82f6',
										color: 'white',
										border: 'none',
										borderRadius: '0.375rem',
										cursor: 'pointer',
										fontSize: '0.875rem',
									}}
								>
									Reintentar
								</button>
							)}
						</div>

						<AdminTrackingMap 
							locations={locations}
							loading={locationsLoading}
							error={locationsError}
						/>
					</div>
				)}
			</div>

		</div>
	);
}

