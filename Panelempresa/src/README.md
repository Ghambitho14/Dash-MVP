# DeliveryApp - Aplicación Empresarial

Aplicación web para empresas y administradores locales para gestionar pedidos, clientes, usuarios y locales del sistema de delivery.

---

## Propósito

Esta aplicación permite a las empresas:
- Crear y gestionar pedidos de delivery
- Administrar clientes y sus direcciones
- Gestionar usuarios (empresariales, admin, locales)
- Configurar locales/sucursales
- Ver estadísticas y estado de pedidos en tiempo real

---

## Inicio Rápido

### Requisitos Previos
- Node.js 16+ instalado
- Archivo `.env` configurado con credenciales de Supabase

### Instalación

```bash
# Desde la raíz del proyecto
npm install
```

### Configuración

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_PROJECT_URL=https://tu-proyecto.supabase.co
VITE_ANNON_KEY=tu_anon_key_aqui
```

### Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### Compilación para Producción

```bash
npm run build
```

Los archivos compilados estarán en `dist/`

---

## Estructura del Proyecto

```
src/
├── App.jsx                    # Componente raíz con lógica principal
├── main.jsx                   # Punto de entrada de React
├── components/                # Componentes React
│   ├── CompanyPanel.jsx       # Panel principal con todas las funcionalidades
│   ├── Login.jsx              # Autenticación de usuarios
│   ├── OrderList.jsx          # Lista de pedidos con filtros
│   ├── OrderCard.jsx           # Tarjeta individual de pedido
│   ├── OrderDetail.jsx        # Modal con detalles del pedido
│   ├── CreateOrderForm.jsx    # Formulario para crear pedidos
│   ├── ClientManagement.jsx   # Gestión CRUD de clientes
│   ├── CreateClientForm.jsx   # Formulario de clientes
│   ├── UserManagement.jsx     # Gestión CRUD de usuarios
│   ├── CreateUserForm.jsx     # Formulario de usuarios
│   ├── LocalSettings.jsx      # Configuración de locales
│   └── Modal.jsx              # Componente modal reutilizable
├── layouts/                   # Layouts
│   └── CompanyLayout.jsx      # Layout principal con header y sidebar
├── styles/                     # Estilos CSS
│   ├── globals.css            # Estilos globales
│   ├── layouts/               # Estilos de layouts
│   ├── Components/            # Estilos por componente
│   └── utils/                 # Utilidades CSS
├── types/                      # Tipos y estructuras de datos
│   ├── order.js               # Estructura de pedidos
│   ├── client.js              # Estructura de clientes
│   └── user.js                # Estructura de usuarios
└── utils/                      # Utilidades
    ├── supabase.js            # Cliente de Supabase
    ├── utils.js               # Funciones helper
    └── mockData.js            # Datos de prueba
```

---

## Autenticación

### Roles Disponibles

1. **`empresarial`**: Acceso completo
   - Crear y gestionar pedidos
   - Gestionar clientes, usuarios y locales
   - Ver todos los pedidos de la empresa

2. **`admin`**: Administrador
   - Mismas funciones que empresarial
   - Permisos extendidos

3. **`local`**: Usuario de local
   - Acceso limitado a su local específico
   - Crear pedidos solo para su local
   - Ver pedidos de su local

### Login

Los usuarios se autentican con:
- **Email**: Correo electrónico del usuario
- **Password**: Contraseña

La autenticación se realiza contra la tabla `company_users` en Supabase.

---

## Funcionalidades Principales

### 1. Gestión de Pedidos

#### Crear Pedido
- Seleccionar cliente (o crear nuevo)
- Especificar direcciones de retiro y entrega
- Asignar local
- Establecer precio sugerido
- Agregar notas
- Se genera automáticamente un código de retiro único (6 dígitos)

#### Ver Pedidos
- Filtros por estado: Todos, Pendiente, Asignado, En camino, Retirado, Entregado
- Filtro por local
- Vista de lista con información resumida
- Modal con detalles completos

#### Estados de Pedidos
1. **Pendiente**: Pedido creado, esperando repartidor
2. **Asignado**: Repartidor aceptó el pedido
3. **En camino al retiro**: Repartidor yendo a retirar
4. **Producto retirado**: Repartidor retiró (código validado)
5. **Entregado**: Pedido completado

### 2. Gestión de Clientes

- **Crear**: Agregar nuevos clientes con nombre, teléfono y dirección
- **Editar**: Modificar información de clientes existentes
- **Eliminar**: Remover clientes (con confirmación)
- **Asignar Local**: Cada cliente puede estar asignado a un local

### 3. Gestión de Usuarios

- **Crear**: Agregar usuarios con email, password y rol
- **Editar**: Modificar información y roles
- **Eliminar**: Desactivar usuarios
- **Roles**: empresarial, admin, local

### 4. Configuración de Locales

- **Crear**: Agregar nuevos locales/sucursales
- **Editar**: Modificar información de locales
- **Eliminar**: Remover locales
- Cada local tiene nombre y dirección

---

## Componentes Principales

### CompanyPanel
Componente principal que contiene:
- Sidebar con estadísticas y acciones
- Tabs para diferentes vistas (pedidos, clientes, usuarios, locales)
- Filtros y búsquedas
- Modales para crear/editar

### OrderList
Lista de pedidos con:
- Filtros por estado y local
- Ordenamiento
- Vista de tarjetas
- Acciones rápidas

### CreateOrderForm
Formulario completo para crear pedidos:
- Selector de cliente
- Campos de direcciones
- Selector de local
- Campo de precio
- Campo de notas

---

## Flujo de Datos

### Carga Inicial
1. Usuario se autentica
2. Se cargan datos de la empresa (`companies`)
3. Se cargan locales (`locals`)
4. Se cargan clientes (`clients`)
5. Se cargan usuarios (`company_users`)
6. Se cargan pedidos (`orders`) con relaciones

### Actualización de Pedidos
- Recarga automática cada 10 segundos
- Actualización en tiempo real cuando cambian estados

### Persistencia
- Sesión guardada en `localStorage`
- Datos sincronizados con Supabase

---

## Tablas de Supabase Utilizadas

- `company_users`: Autenticación y gestión de usuarios
- `companies`: Información de empresas
- `locals`: Locales/sucursales
- `clients`: Clientes
- `orders`: Pedidos
- `drivers`: Información de repartidores (solo lectura)

---

## Estilos y Diseño

### Responsive Design
- **Desktop**: Sidebar visible, layout completo
- **Tablet**: Sidebar colapsable
- **Mobile**: Sidebar como overlay, tabs horizontales

### Estilos
- CSS Modules por componente
- Estilos globales en `globals.css`
- Utilidades CSS en `utils/`

---

## Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Compilar para producción
npm run preview      # Preview de build
npm run lint         # Linter
```

---

## Notas de Desarrollo

### Convenciones
- Componentes en PascalCase
- Hooks personalizados cuando sea necesario
- Funciones helper en `utils/`
- Tipos y estructuras en `types/`

### Estado Global
- Estado gestionado con React Hooks
- `useState` para estado local
- `useEffect` para efectos secundarios
- `useCallback` para funciones memoizadas

### Variables de Entorno
Asegúrate de tener el archivo `.env` configurado antes de iniciar.

---

## Solución de Problemas

### Error: "Cannot find module '@supabase/supabase-js'"
```bash
npm install
```

### Error: "VITE_PROJECT_URL is not defined"
Verifica que el archivo `.env` existe y tiene las variables correctas.

### Error de autenticación
Verifica que las credenciales en `.env` sean correctas y que el usuario exista en Supabase.

---

## Recursos

- [Documentación de React](https://react.dev/)
- [Documentación de Vite](https://vitejs.dev/)
- [Documentación de Supabase](https://supabase.com/docs)
- [Lucide Icons](https://lucide.dev/)

---

## Documentación Adicional

- `../../ARCHITECTURE.md`: Documentación completa de arquitectura (en la raíz del proyecto)
- `../../AGENTS.MD`: Guía para agentes de IA (en la raíz del proyecto)
- `../README.md`: Documentación general del proyecto
- `../Database/README.md`: Documentación de base de datos
- `../../CHECKLIST_PRODUCCION.md`: Checklist para producción

---

**Versión**: 1.0.0  
**Última actualización**: 2024

