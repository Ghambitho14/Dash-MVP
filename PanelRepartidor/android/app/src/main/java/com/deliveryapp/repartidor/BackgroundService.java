package com.deliveryapp.repartidor;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;

public class BackgroundService extends Service {
	private static final String TAG = "BackgroundService";
	private static final int NOTIFICATION_ID = 1000;
	private static final String CHANNEL_ID = "background_service_channel";
	
	@Override
	public void onCreate() {
		super.onCreate();
		createNotificationChannel();
		Log.d(TAG, "✅ BackgroundService creado");
	}
	
	@Override
	public int onStartCommand(Intent intent, int flags, int startId) {
		// Crear notificación persistente
		Notification notification = createNotification();
		
		// Iniciar como servicio en primer plano
		startForeground(NOTIFICATION_ID, notification);
		
		Log.d(TAG, "✅ BackgroundService iniciado en primer plano");
		
		// Retornar START_STICKY para que se reinicie si Android lo mata
		return START_STICKY;
	}
	
	@Override
	public IBinder onBind(Intent intent) {
		return null;
	}
	
	@Override
	public void onDestroy() {
		super.onDestroy();
		Log.d(TAG, "⚠️ BackgroundService destruido");
	}
	
	private void createNotificationChannel() {
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
			NotificationChannel channel = new NotificationChannel(
				CHANNEL_ID,
				"Servicio en Segundo Plano",
				NotificationManager.IMPORTANCE_LOW // Baja prioridad para que no sea molesto
			);
			channel.setDescription("Mantiene la app activa para recibir notificaciones de pedidos");
			channel.setShowBadge(false);
			channel.setSound(null, null); // Sin sonido
			channel.enableVibration(false); // Sin vibración
			
			NotificationManager manager = getSystemService(NotificationManager.class);
			if (manager != null) {
				manager.createNotificationChannel(channel);
			}
		}
	}
	
	private Notification createNotification() {
		// Intent para abrir la app cuando se toque la notificación
		Intent notificationIntent = new Intent(this, MainActivity.class);
		PendingIntent pendingIntent = PendingIntent.getActivity(
			this,
			0,
			notificationIntent,
			PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
		);
		
		return new NotificationCompat.Builder(this, CHANNEL_ID)
			.setContentTitle("📦 DeliveryApp Repartidor")
			.setContentText("Activo en segundo plano - Recibiendo pedidos")
			.setSmallIcon(android.R.drawable.ic_menu_mylocation)
			.setContentIntent(pendingIntent)
			.setOngoing(true) // Notificación persistente
			.setPriority(NotificationCompat.PRIORITY_LOW) // Baja prioridad
			.setCategory(NotificationCompat.CATEGORY_SERVICE)
			.setShowWhen(false) // No mostrar hora
			.setSound(null) // Sin sonido
			.setVibrate(null) // Sin vibración
			.build();
	}
}

