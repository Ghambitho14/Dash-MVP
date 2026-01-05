## Compilación y Despliegue

### App Empresarial
```bash
cd Panelempresa
npm run build        # Compila para web
npm run start        # Servidor de producción
```

### Panel Admin
```bash
cd Paneladmin
npm run build        # Compila para web
```

### App Repartidor
```bash
cd PanelRepartidor
npm run build        # Compila para web
build-apk.bat        # Compila y prepara para APK
npm run cap:open:android  # Abre Android Studio
```

---

## Estructura de Archivos Detallada

### App Empresarial (`Panelempresa/src/`)
```
src/
├── App.jsx                    # Componente raíz
├── main.jsx                   # Punto de entrada
├── components/                # Componentes React (presentación)
│   ├── auth/
│   │   ├── Login.jsx
│   │   └── RegistrationForm.jsx
│   ├── clients/
│   │   ├── ClientManagement.jsx
│   │   └── CreateClientForm.jsx
│   ├── orders/
│   │   ├── OrderList.jsx
│   │   ├── OrderCard.jsx
│   │   ├── OrderDetail.jsx
│   │   ├── OrderChat.jsx
│   │   ├── CreateOrderForm.jsx
│   │   └── OrderMap.jsx
│   ├── users/
│   │   ├── UserManagement.jsx
│   │   └── CreateUserForm.jsx
│   ├── locals/
│   │   └── LocalSettings.jsx
│   ├── panel/
│   │   └── CompanyPanel.jsx
│   ├── tracking/
│   │   └── TrackingPanel.jsx
│   ├── settings/
│   │   └── AccountSettings.jsx
│   └── ui/
│       ├── Modal.jsx
│       ├── ConfirmModal.jsx
│       └── QuickActions.jsx
├── hooks/                      # Hooks personalizados (lógica de estado)
│   ├── auth/
│   │   ├── useAuth.js
│   │   ├── useLogin.js
│   │   └── useRegistration.js
│   ├── orders/
│   │   ├── useOrders.js
│   │   ├── useCreateOrderForm.js
│   │   ├── useOrderChat.js
│   │   └── useCurrentTime.js
│   ├── clients/
│   │   ├── useClients.js
│   │   ├── useClientManagement.js
│   │   └── useCreateClientForm.js
│   ├── users/
│   │   ├── useUsers.js
│   │   ├── useUserManagement.js
│   │   └── useCreateUserForm.js
│   ├── locals/
│   │   ├── useLocals.js
│   │   └── useLocalSettings.js
│   ├── panel/
│   │   └── useCompanyPanel.js
│   └── ui/
│       ├── useNotifications.js
│       ├── useToast.js
│       └── useConfirm.js
├── services/                   # Servicios (comunicación con Supabase)
│   ├── authService.js
│   ├── orderService.js
│   ├── orderChatService.js
│   ├── clientService.js
│   ├── userService.js
│   ├── localService.js
│   ├── registrationService.js
│   └── locationService.js
├── styles/                     # Estilos CSS
│   ├── globals.css
│   ├── layouts/
│   ├── Components/
│   └── utils/
├── types/                      # Tipos y estructuras (reservado para futuro)
└── utils/                      # Utilidades
    ├── supabase.js
    ├── utils.js
    ├── logger.js
    ├── passwordUtils.js
    ├── googleMapsLoader.js
    └── googleMapsErrors.js
```

### App Repartidor (`PanelRepartidor/src/`)
```
src/
├── App.jsx                    # Componente raíz
├── main.jsx                      # Punto de entrada
├── components/                 # Componentes React
│   ├── auth/
│   │   ├── Login.jsx
│   │   └── DriverRegistrationForm.jsx
│   ├── driver/
│   │   ├── DriverApp.jsx
│   │   ├── DriverSidebar.jsx
│   │   ├── DriverHeader.jsx
│   │   ├── DriverProfile.jsx
│   │   ├── DriverWallet.jsx
│   │   ├── DriverSettings.jsx
│   │   ├── HomeView.jsx
│   │   ├── OrdersView.jsx
│   │   ├── MyOrdersView.jsx
│   │   ├── BottomNavigation.jsx
│   │   └── FloatingButton.jsx
│   ├── orders/
│   │   ├── OrderList.jsx
│   │   ├── OrderCard.jsx
│   │   ├── OrderDetail.jsx
│   │   ├── OrderChat.jsx
│   │   ├── PickupCodeModal.jsx
│   │   ├── orderStateMachine.jsx
│   │   └── SimpleMap.jsx
│   ├── providers/
│   │   └── CurrentTimeProvider.jsx
│   └── common/
│       └── Modal.jsx
├── hooks/                      # Hooks personalizados
│   ├── useDriverLocation.js
│   ├── useLocationTracking.js
│   ├── useDriverRegistration.js
│   ├── useOrderChat.js
│   ├── useNotifications.js
│   └── useCurrentTime.js
├── services/                   # Servicios
│   ├── driverRegistrationService.js
│   ├── locationService.js
│   └── orderChatService.js
├── constants/                 # Constantes
│   └── orderStatus.js
├── styles/                     # Estilos CSS
│   ├── globals.css
│   ├── layouts/
│   ├── Components/
│   └── utils/
├── types/                      # Tipos y estructuras
│   └── driver.js
└── utils/                      # Utilidades
    ├── supabase.js
    ├── utils.js
    ├── storage.js
    ├── logger.js
    ├── passwordUtils.js
    └── validationUtils.js
```

---

## Patrones de Diseño

### Arquitectura en Capas

La aplicación sigue una arquitectura en capas que separa claramente las responsabilidades:

1. **Capa de Presentación** (`components/`): Componentes React que solo manejan UI
2. **Capa de Lógica** (`hooks/`): Hooks personalizados que encapsulan estado y efectos
3. **Capa de Servicios** (`services/`): Funciones que manejan comunicación con Supabase
4. **Capa de Utilidades** (`utils/`): Funciones helper y configuración

#### Flujo de Datos
```
Componente → Hook → Service → Supabase
     ↑                           ↓
     └────────── Estado ─────────┘
```
