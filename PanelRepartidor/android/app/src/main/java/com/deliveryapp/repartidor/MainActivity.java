package com.deliveryapp.repartidor;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import static android.content.Context.POWER_SERVICE;
import android.content.Context;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

public class MainActivity extends BridgeActivity {
	private static final int PERMISSION_REQUEST_CODE = 1001;
	private static final String WORK_NAME = "order_notification_work";
	
	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		
		// Crear canal de notificaciones de alta prioridad para pedidos
		createOrderNotificationChannel();
		
		// Solicitar permisos necesarios
		requestPermissions();
		
		// Solicitar desactivar optimización de batería (importante para segundo plano)
		requestIgnoreBatteryOptimizations();
		
		// Iniciar servicio en primer plano para mantener la app activa
		// COMENTADO: Se desactivó la notificación persistente de "activo en segundo plano"
		// startBackgroundService();
		
		// Programar verificación periódica de pedidos en segundo plano
		scheduleOrderNotificationWorker();
	}
	
	/**
	 * Crea el canal de notificaciones de alta prioridad para pedidos nuevos
	 * Este canal es diferente al del BackgroundService y tiene alta prioridad
	 */
	private void createOrderNotificationChannel() {
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
			NotificationChannel channel = new NotificationChannel(
				"order_notifications", // ID del canal (debe coincidir con el usado en JS)
				"Nuevos Pedidos", // Nombre visible para el usuario
				NotificationManager.IMPORTANCE_HIGH // Alta prioridad - aparece como notificación importante
			);
			channel.setDescription("Notificaciones cuando llegan nuevos pedidos disponibles");
			channel.setShowBadge(true);
			channel.enableVibration(true);
			channel.enableLights(true);
			channel.setLightColor(0xFFF59E0B); // Color naranja
			
			NotificationManager manager = getSystemService(NotificationManager.class);
			if (manager != null) {
				manager.createNotificationChannel(channel);
				android.util.Log.d("MainActivity", "✅ Canal de notificaciones de pedidos creado (alta prioridad)");
			}
		}
	}
	
	/**
	 * Inicia el servicio en primer plano para mantener la app activa en segundo plano
	 */
	private void startBackgroundService() {
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
			Intent serviceIntent = new Intent(this, BackgroundService.class);
			startForegroundService(serviceIntent);
			android.util.Log.d("MainActivity", "✅ Servicio en primer plano iniciado");
		} else {
			Intent serviceIntent = new Intent(this, BackgroundService.class);
			startService(serviceIntent);
			android.util.Log.d("MainActivity", "✅ Servicio iniciado (Android < 8.0)");
		}
	}
	
	/**
	 * Solicita los permisos necesarios para la app (ubicación y notificaciones)
	 */
	private void requestPermissions() {
		List<String> permissionsToRequest = new ArrayList<>();
		
		// Permisos de ubicación (requeridos desde Android 6.0)
		if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) 
				!= PackageManager.PERMISSION_GRANTED) {
			permissionsToRequest.add(Manifest.permission.ACCESS_FINE_LOCATION);
		}
		
		if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) 
				!= PackageManager.PERMISSION_GRANTED) {
			permissionsToRequest.add(Manifest.permission.ACCESS_COARSE_LOCATION);
		}
		
		// Permiso de notificaciones (requerido desde Android 13 / API 33)
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
			if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) 
					!= PackageManager.PERMISSION_GRANTED) {
				permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS);
			}
		}
		
		// Solicitar permisos si hay alguno pendiente
		if (!permissionsToRequest.isEmpty()) {
			ActivityCompat.requestPermissions(
				this,
				permissionsToRequest.toArray(new String[0]),
				PERMISSION_REQUEST_CODE
			);
		}
	}
	
	/**
	 * Solicita desactivar la optimización de batería para que la app funcione en segundo plano
	 */
	private void requestIgnoreBatteryOptimizations() {
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
			PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
			if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
				try {
					Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
					intent.setData(Uri.parse("package:" + getPackageName()));
					startActivity(intent);
					android.util.Log.d("MainActivity", "✅ Solicitando desactivar optimización de batería");
				} catch (Exception e) {
					android.util.Log.w("MainActivity", "⚠️ No se pudo abrir configuración de batería: " + e.getMessage());
					// Intentar abrir configuración manual
					try {
						Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
						startActivity(intent);
					} catch (Exception e2) {
						android.util.Log.w("MainActivity", "⚠️ No se pudo abrir configuración de batería (fallback)");
					}
				}
			} else {
				android.util.Log.d("MainActivity", "✅ Optimización de batería ya desactivada");
			}
		}
	}
	
	/**
	 * Programa el Worker para verificar nuevos pedidos periódicamente en segundo plano
	 */
	private void scheduleOrderNotificationWorker() {
		// Crear restricciones: requiere conexión a internet, pero no requiere que el dispositivo esté cargando
		Constraints constraints = new Constraints.Builder()
			.setRequiredNetworkType(NetworkType.CONNECTED)
			.setRequiresBatteryNotLow(false) // No requiere batería alta
			.setRequiresCharging(false) // No requiere que esté cargando
			.setRequiresDeviceIdle(false) // No requiere que el dispositivo esté inactivo
			.build();
		
		// Crear trabajo periódico: cada 15 minutos (mínimo permitido por Android)
		PeriodicWorkRequest periodicWork = new PeriodicWorkRequest.Builder(
			OrderNotificationWorker.class,
			15, // Intervalo mínimo: 15 minutos
			TimeUnit.MINUTES
		)
		.setConstraints(constraints)
		.setInitialDelay(1, TimeUnit.MINUTES) // Ejecutar después de 1 minuto inicialmente
		.build();
		
		// Programar el trabajo periódico (reemplaza si ya existe)
		WorkManager.getInstance(this).enqueueUniquePeriodicWork(
			WORK_NAME,
			ExistingPeriodicWorkPolicy.REPLACE,
			periodicWork
		);
		
		// Programar múltiples verificaciones inmediatas con delays cortos para detectar pedidos más rápido
		// Esto compensa la limitación de 15 minutos del trabajo periódico
		scheduleMultipleChecks(constraints);
		
		android.util.Log.d("MainActivity", "✅ Worker de notificaciones programado (periódico cada 15min + verificaciones frecuentes)");
	}
	
	/**
	 * Programa múltiples verificaciones con delays cortos para detectar pedidos más rápido
	 * Se programa una cadena de verificaciones para cubrir los primeros minutos después de cerrar la app
	 */
	private void scheduleMultipleChecks(Constraints constraints) {
		WorkManager workManager = WorkManager.getInstance(this);
		
		// Ejecutar inmediatamente
		OneTimeWorkRequest immediateWork = new OneTimeWorkRequest.Builder(OrderNotificationWorker.class)
			.setConstraints(constraints)
			.build();
		workManager.enqueue(immediateWork);
		
		// Programar verificaciones frecuentes en los primeros minutos: 15s, 30s, 45s, 1min, 2min, 3min, 5min, 7min, 10min
		// Esto ayuda a detectar pedidos más rápido cuando la app está cerrada
		// Después de 10 minutos, el trabajo periódico (cada 15min) toma el control
		long[] delays = {15, 30, 45, 60, 120, 180, 300, 420, 600}; // segundos
		
		for (long delay : delays) {
			OneTimeWorkRequest delayedWork = new OneTimeWorkRequest.Builder(OrderNotificationWorker.class)
				.setConstraints(constraints)
				.setInitialDelay(delay, TimeUnit.SECONDS)
				.build();
			workManager.enqueue(delayedWork);
		}
		
		android.util.Log.d("MainActivity", "✅ Verificaciones programadas: inmediata + 15s, 30s, 45s, 1min, 2min, 3min, 5min, 7min, 10min");
	}
	
	@Override
	public void onDestroy() {
		super.onDestroy();
		// No detenemos el Worker aquí porque queremos que siga funcionando en segundo plano
		// El Worker seguirá verificando nuevos pedidos periódicamente
	}
}
