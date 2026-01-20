package com.deliveryapp.repartidor;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class OrderNotificationWorker extends Worker {
	private static final String TAG = "OrderNotificationWorker";
	private static final String CHANNEL_ID = "new_orders_channel";
	private static final int NOTIFICATION_ID = 1001;
	
	public OrderNotificationWorker(@NonNull Context context, @NonNull WorkerParameters params) {
		super(context, params);
		createNotificationChannel();
	}
	
	@NonNull
	@Override
	public Result doWork() {
		try {
			Log.d(TAG, "🔔 Verificando nuevos pedidos en segundo plano...");
			
			// Obtener datos del driver desde SharedPreferences (usando Capacitor Preferences)
			// Capacitor Preferences guarda en "CapacitorStorage"
			SharedPreferences prefs = getApplicationContext().getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
			
			// Log para debugging: mostrar todas las keys disponibles
			Log.d(TAG, "📋 Keys disponibles en CapacitorStorage: " + prefs.getAll().keySet().toString());
			
			String driverJson = prefs.getString("driver", null);
			// Intentar leer isOnline como string primero (más confiable)
			String isOnlineStr = prefs.getString("isOnline", null);
			
			Log.d(TAG, "📊 Datos leídos - driver: " + (driverJson != null ? "existe (" + driverJson.length() + " chars)" : "null"));
			Log.d(TAG, "📊 Datos leídos - isOnline (string): " + isOnlineStr);
			
			// Parsear isOnline (puede ser "true", "false", "\"true\"", "\"false\"" o null)
			boolean isOnline = false;
			if (isOnlineStr != null) {
				try {
					// Remover comillas si las tiene y espacios
					String cleaned = isOnlineStr.replace("\"", "").trim();
					if (cleaned.equals("true") || cleaned.equalsIgnoreCase("true")) {
						isOnline = true;
						Log.d(TAG, "✅ isOnline detectado como TRUE");
					} else {
						Log.d(TAG, "ℹ️ isOnline detectado como FALSE: " + cleaned);
					}
				} catch (Exception e) {
					Log.w(TAG, "Error parseando isOnline: " + e.getMessage());
				}
			} else {
				Log.w(TAG, "⚠️ isOnline es null - el driver probablemente no está en línea");
			}
			
			Log.d(TAG, "📊 isOnline parseado (final): " + isOnline);
			
			// Verificar que el driver esté en línea
			if (driverJson == null) {
				Log.w(TAG, "⚠️ No hay datos de driver en SharedPreferences");
				return Result.success();
			}
			
			if (!isOnline) {
				Log.d(TAG, "⚠️ Driver no está en línea (isOnline=false), omitiendo verificación");
				return Result.success();
			}
			
			// Parsear datos del driver
			JSONObject driver = new JSONObject(driverJson);
			String driverId = driver.optString("id");
			String companyId = driver.optString("companyId") != null ? driver.optString("companyId") : driver.optString("company_id");
			
			if (driverId == null || companyId == null) {
				Log.w(TAG, "⚠️ No se encontró driverId o companyId");
				return Result.success();
			}
			
			// Obtener configuración de Supabase (también desde Capacitor Preferences)
			String supabaseUrl = prefs.getString("supabase_url", null);
			String supabaseKey = prefs.getString("supabase_key", null);
			
			Log.d(TAG, "📊 Supabase URL: " + (supabaseUrl != null ? "existe" : "null"));
			Log.d(TAG, "📊 Supabase Key: " + (supabaseKey != null ? "existe" : "null"));
			
			if (supabaseUrl == null || supabaseKey == null) {
				Log.w(TAG, "⚠️ No se encontró configuración de Supabase");
				return Result.success();
			}
			
			// Obtener último pedido notificado (desde Capacitor Preferences)
			String lastNotifiedOrderId = prefs.getString("last_notified_order_id", null);
			Log.d(TAG, "📊 Último pedido notificado: " + (lastNotifiedOrderId != null ? lastNotifiedOrderId : "ninguno"));
			
			// Consultar nuevos pedidos pendientes con relaciones
			// Obtener los últimos 5 pedidos para comparar con el último notificado
			String apiUrl = supabaseUrl + "/rest/v1/orders?company_id=eq." + companyId 
				+ "&status=eq.Pendiente&order=created_at.desc&limit=5"
				+ "&select=*,clients(name,phone),locals(name,address)";
			
			URL url = new URL(apiUrl);
			HttpURLConnection conn = (HttpURLConnection) url.openConnection();
			conn.setRequestMethod("GET");
			conn.setRequestProperty("apikey", supabaseKey);
			conn.setRequestProperty("Authorization", "Bearer " + supabaseKey);
			conn.setRequestProperty("Content-Type", "application/json");
			conn.setRequestProperty("Prefer", "return=representation");
			
			int responseCode = conn.getResponseCode();
			Log.d(TAG, "📡 Respuesta de Supabase: " + responseCode);
			
			if (responseCode == HttpURLConnection.HTTP_OK) {
				BufferedReader reader = new BufferedReader(
					new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8)
				);
				StringBuilder response = new StringBuilder();
				String line;
				while ((line = reader.readLine()) != null) {
					response.append(line);
				}
				reader.close();
				
				String responseStr = response.toString();
				Log.d(TAG, "📦 Respuesta JSON: " + (responseStr.length() > 200 ? responseStr.substring(0, 200) + "..." : responseStr));
				
				JSONArray orders = new JSONArray(responseStr);
				Log.d(TAG, "📦 Pedidos encontrados: " + orders.length());
				
				if (orders.length() > 0) {
					// Buscar el pedido más reciente que no haya sido notificado
					JSONObject newOrder = null;
					String newOrderId = null;
					
					for (int i = 0; i < orders.length(); i++) {
						JSONObject order = orders.getJSONObject(i);
						String orderId = order.optString("id");
						
						// Si no hay último pedido notificado, usar el más reciente
						if (lastNotifiedOrderId == null) {
							newOrder = order;
							newOrderId = orderId;
							break;
						}
						
						// Si encontramos un pedido diferente al último notificado, es nuevo
						if (!orderId.equals(lastNotifiedOrderId)) {
							newOrder = order;
							newOrderId = orderId;
							// Continuar buscando para encontrar el más reciente
						} else {
							// Si encontramos el último notificado, ya revisamos todos los nuevos
							break;
						}
					}
					
					// Si encontramos un pedido nuevo, mostrar notificación
					if (newOrder != null && newOrderId != null) {
						String orderDisplayId = "ORD-" + newOrderId;
						String clientName = newOrder.optJSONObject("clients") != null 
							? newOrder.optJSONObject("clients").optString("name", "Cliente")
							: "Cliente";
						String localName = newOrder.optJSONObject("locals") != null
							? newOrder.optJSONObject("locals").optString("name", "Local")
							: "Local";
						String deliveryAddress = newOrder.optString("delivery_address", "Sin dirección");
						double suggestedPrice = newOrder.optDouble("suggested_price", 0);
						String priceText = suggestedPrice > 0 ? String.format("$%.2f", suggestedPrice) : "Precio a acordar";
						
						String title = "📦 Nuevo pedido disponible - " + orderDisplayId;
						String body = localName + " → " + clientName + "\n" + deliveryAddress + "\n" + priceText;
						
						showNotification(title, body);
						
						// Guardar ID del pedido notificado (el más reciente)
						prefs.edit().putString("last_notified_order_id", newOrderId).apply();
						
						Log.d(TAG, "✅ Notificación enviada para pedido: " + orderDisplayId);
					} else {
						Log.d(TAG, "ℹ️ No hay pedidos nuevos (último notificado: " + lastNotifiedOrderId + ")");
					}
				} else {
					Log.d(TAG, "ℹ️ No hay pedidos pendientes");
				}
			} else {
				Log.w(TAG, "⚠️ Error consultando pedidos: " + responseCode);
			}
			
			conn.disconnect();
			return Result.success();
			
		} catch (Exception e) {
			Log.e(TAG, "❌ Error en OrderNotificationWorker", e);
			// Retry con backoff exponencial (WorkManager lo maneja automáticamente)
			return Result.retry();
		}
	}
	
	/**
	 * 🔴 IMPORTANTE: Crea el canal de notificación (requerido en Android 8+)
	 * Si no existe el canal, las notificaciones no se mostrarán
	 * Este método es seguro llamarlo múltiples veces (si el canal ya existe, no hace nada)
	 */
	private void createNotificationChannel() {
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
			NotificationManager manager = getApplicationContext().getSystemService(NotificationManager.class);
			if (manager == null) return;
			
			// Verificar si el canal ya existe
			if (manager.getNotificationChannel(CHANNEL_ID) != null) {
				Log.d(TAG, "✅ Canal de notificación ya existe: " + CHANNEL_ID);
				return;
			}
			
			NotificationChannel channel = new NotificationChannel(
				CHANNEL_ID,
				"Nuevos Pedidos",
				NotificationManager.IMPORTANCE_HIGH
			);
			channel.setDescription("Notificaciones de nuevos pedidos disponibles");
			channel.enableVibration(true);
			channel.enableLights(true);
			
			manager.createNotificationChannel(channel);
			Log.d(TAG, "✅ Canal de notificación creado: " + CHANNEL_ID);
		}
	}
	
	private void showNotification(String title, String body) {
		NotificationManager manager = (NotificationManager) getApplicationContext()
			.getSystemService(Context.NOTIFICATION_SERVICE);
		
		if (manager == null) return;
		
		// 🔴 IMPORTANTE: Asegurar que el canal existe antes de crear la notificación (Android 8+)
		// Si no existe el canal, la notificación no se mostrará
		createNotificationChannel();
		
		NotificationCompat.Builder builder = new NotificationCompat.Builder(getApplicationContext(), CHANNEL_ID)
			.setSmallIcon(android.R.drawable.ic_menu_mylocation) // Icono de ubicación/envío
			.setContentTitle(title)
			.setContentText(body)
			.setPriority(NotificationCompat.PRIORITY_HIGH)
			.setAutoCancel(true)
			.setVibrate(new long[]{0, 500, 200, 500})
			.setStyle(new NotificationCompat.BigTextStyle().bigText(body));
		
		manager.notify(NOTIFICATION_ID, builder.build());
	}
}

