# App Repartidor

Aplicación móvil para repartidores. Disponible como aplicación web y APK Android.

## Inicio Rápido

## Scripts Disponibles

```bash

importante el run cap:syrnc

npm run cap:sync         # Sincronizar con Capacitor 
npm run dev              # Servidor de desarrollo
npm run build            # Compilar para web
npm run apk:build        # Compilar y sincronizar para APK
npm run cap:sync         # Sincronizar con Capacitor
npm run cap:open:android # Abrir Android Studio
npm run lint             # Linter
```

### Instalación

```bash
cd PanelRepartidor
npm install
```


### Desarrollo Web - ver modo mobil 

```bash
npm run dev
```

## Compilación APK Android

### Requisitos

- Android Studio instalado
- Java JDK configurado
- Android SDK instalado

### Compilar APK

**Windows:**
```bash
build-apk.bat
```

**Manual:**
```bash
npm run build
npx cap sync
npm run cap:open:android
```

Luego en Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)**

El APK estará en: `android/app/build/outputs/apk/debug/app-debug.apk`

## Funcionalidades

- Ver pedidos disponibles
- Aceptar pedidos
- Actualizar estado de pedidos
- Validar código de retiro
- Ver pedidos completados
- Chat con empresas durante pedidos activos
- Gestionar perfil y configuración
- Ver ganancias en billetera




## Documentación

- `../ARCHITECTURE.md`: Arquitectura completa del proyecto
- `../AGENTS.MD`: Guía para agentes de IA
