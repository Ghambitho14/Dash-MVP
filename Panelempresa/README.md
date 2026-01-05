# DeliveryApp - Aplicación Empresarial

Aplicación web para empresas y administradores locales para gestionar pedidos, clientes, usuarios y locales.

## Inicio Rápido

### Instalación

```bash
cd Panelempresa
npm install
```

### Configuración

Crea el archivo `.env` en la **raíz del proyecto** (`App/.env`):

```env
VITE_PROJECT_URL=https://tu-proyecto.supabase.co
VITE_ANNON_KEY=tu_anon_key_aqui
```

### Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### Compilación

```bash
npm run build
```

Los archivos compilados estarán en `dist/`

## Funcionalidades

- Crear y gestionar pedidos de delivery
- Administrar clientes y sus direcciones
- Gestionar usuarios (empresariales, admin, locales)
- Configurar locales/sucursales
- Ver estadísticas y estado de pedidos en tiempo real
- Chat con repartidores durante pedidos activos
- Seguimiento de repartidores en tiempo real

## Roles de Usuario

- **empresarial**: Acceso completo a todas las funciones
- **admin**: Administrador con permisos extendidos
- **local**: Usuario de local específico, acceso limitado

## Scripts Disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Compilar para producción
npm run preview  # Preview de build
npm run lint     # Linter
```

## Documentación

- `../ARCHITECTURE.md`: Arquitectura completa del proyecto
- `../AGENTS.MD`: Guía para agentes de IA
- `Database/README.md`: Documentación de base de datos
