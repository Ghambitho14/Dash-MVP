# Panel Admin

Panel de administración para superadministradores. Permite gestionar empresas, repartidores y crear usuarios empresariales.

## Inicio Rápido

### Instalación

```bash
cd Paneladmin
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

La aplicación estará disponible en `http://localhost:5174`

### Compilación

```bash
npm run build
```

Los archivos compilados estarán en `dist/`

## Funcionalidades

- Crear nuevas empresas
- Crear repartidores
- Crear usuarios empresariales automáticamente al crear empresas
- Gestionar el sistema completo

## Autenticación

Los superadministradores se autentican con email y password contra la tabla `superadmins` en Supabase.

**Requisitos**: El usuario debe existir en `superadmins` con `active = true`

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
