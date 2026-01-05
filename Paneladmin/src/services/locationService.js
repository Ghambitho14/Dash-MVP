import { supabase } from '../utils/supabase';

/**
 * Obtiene todas las ubicaciones de repartidores activos
 */
export async function getAllDriverLocations() {
	try {
		// Primero obtener las ubicaciones
		const { data: locationsData, error: locationsError } = await supabase
			.from('driver_locations')
			.select('*')
			.order('updated_at', { ascending: false });

		if (locationsError) {
			console.error('Error en consulta de ubicaciones:', locationsError);
			throw locationsError;
		}

		if (!locationsData || locationsData.length === 0) {
			return [];
		}

		// Obtener los IDs únicos de drivers
		const driverIds = [...new Set(
			locationsData
				.map(loc => loc.driver_id)
				.filter(id => id !== null && id !== undefined)
		)];

		if (driverIds.length === 0) {
			return [];
		}

		// Obtener los drivers
		const { data: driversData, error: driversError } = await supabase
			.from('drivers')
			.select('id, name, username, phone, active, company_id')
			.in('id', driverIds);

		if (driversError) {
			console.error('Error obteniendo drivers:', driversError);
			throw driversError;
		}

		// Crear un mapa de drivers por ID
		const driversMap = (driversData || []).reduce((acc, driver) => {
			acc[driver.id] = driver;
			return acc;
		}, {});

		// Obtener los IDs únicos de companies
		const companyIds = [...new Set(
			(driversData || [])
				.map(driver => driver.company_id)
				.filter(id => id !== null && id !== undefined)
		)];

		// Obtener las companies
		let companiesMap = {};
		if (companyIds.length > 0) {
			const { data: companiesData, error: companiesError } = await supabase
				.from('companies')
				.select('id, name')
				.in('id', companyIds);

			if (!companiesError && companiesData) {
				companiesMap = companiesData.reduce((acc, company) => {
					acc[company.id] = company;
					return acc;
				}, {});
			}
		}

		// Combinar ubicaciones con drivers y companies
		const enrichedLocations = locationsData
			.map(loc => {
				const driver = driversMap[loc.driver_id];
				
				// Verificar que existe el driver y está activo
				if (!driver || driver.active !== true) {
					return null;
				}
				
				// Verificar que tiene coordenadas válidas
				if (!loc.latitude || !loc.longitude) {
					return null;
				}
				
				// Verificar que las coordenadas son números válidos
				const lat = Number(loc.latitude);
				const lng = Number(loc.longitude);
				if (isNaN(lat) || isNaN(lng)) {
					return null;
				}
				
				// Verificar que las coordenadas están en rangos válidos
				if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
					return null;
				}

				// Enriquecer con información del driver y company
				return {
					...loc,
					latitude: lat,
					longitude: lng,
					drivers: {
						...driver,
						companies: driver.company_id ? companiesMap[driver.company_id] || null : null,
					},
				};
			})
			.filter(loc => loc !== null);
		
		return enrichedLocations;
	} catch (err) {
		console.error('Error obteniendo ubicaciones de repartidores:', err);
		throw err;
	}
}

/**
 * Obtiene la ubicación de un repartidor específico
 */
export async function getDriverLocation(driverId) {
	try {
		// Obtener la ubicación
		const { data: locationData, error: locationError } = await supabase
			.from('driver_locations')
			.select('*')
			.eq('driver_id', driverId)
			.single();

		if (locationError && locationError.code !== 'PGRST116') throw locationError;
		if (!locationData) return null;

		// Obtener el driver
		const { data: driverData, error: driverError } = await supabase
			.from('drivers')
			.select('id, name, username, phone, active, company_id')
			.eq('id', driverId)
			.single();

		if (driverError) {
			console.error('Error obteniendo driver:', driverError);
			return null;
		}

		// Si el driver tiene company_id, obtener la company
		let companyData = null;
		if (driverData?.company_id) {
			const { data: company, error: companyError } = await supabase
				.from('companies')
				.select('id, name')
				.eq('id', driverData.company_id)
				.single();

			if (!companyError && company) {
				companyData = company;
			}
		}

		// Combinar datos
		return {
			...locationData,
			drivers: {
				...driverData,
				companies: companyData,
			},
		};
	} catch (err) {
		console.error('Error obteniendo ubicación del repartidor:', err);
		return null;
	}
}

