# AFM STOCK — Sistema de Depósito e Inventario (v2.1 React)

Reconstrucción integral de **AFM STOCK** migrada a una arquitectura moderna basada en **React 18**, **Vite**, **TypeScript** y **Firebase / Firestore**.

El propósito central de la aplicación es **consultar qué productos hay en el depósito y conocer sus existencias de forma rápida, intuitiva y profesional**, tanto desde computadoras de escritorio como desde dispositivos móviles en el depósito.

---

## 1. Arquitectura Técnica

```
afmstock/
├── public/                 # Assets estáticos y PWA shell
│   ├── manifest.json       # Manifiesto de la aplicación web
│   └── sw.js               # Service Worker seguro (estrategia Network-First, excluye Firebase)
├── src/
│   ├── components/         # Componentes organizados por dominio
│   │   ├── auth/           # Login y gestión de sesión
│   │   ├── common/         # Componentes atómicos (Button, Input, Modal, Badge, ConfirmModal, Spinner)
│   │   ├── dashboard/      # Métricas e indicadores clave
│   │   ├── layout/         # Header, Sidebar desktop y MobileNav táctil
│   │   ├── movements/      # Tabla, cards y modales de movimientos
│   │   ├── notes/          # Panel de notas rápidas y auto-procesamiento a stock
│   │   └── products/       # Tabla desktop, cards móvil, ficha técnica y ajuste rápido
│   ├── context/            # Contextos globales (AuthContext, ToastContext)
│   ├── hooks/              # Custom hooks reactivos (useProductos, useMovimientos, useBorradores)
│   ├── pages/              # Vistas de secciones (DashboardView, ProductsView, MovementsView)
│   ├── search/             # Motor de búsqueda insensible a acentos/ñ con scoring y Levenshtein
│   ├── services/           # Servicios y repositorios de datos desacoplados de la UI
│   │   └── firebase/       # Configuración e inicialización modular del SDK v10/v11
│   ├── types/              # Definiciones de tipos TypeScript con tolerancia a esquemas heterogéneos
│   ├── utils/              # Formateadores de fecha es-AR, números y utilidades
│   ├── App.tsx             # Orquestador visual y enrutamiento SPA
│   ├── index.css           # Estilos base Tailwind CSS
│   └── main.tsx            # Punto de entrada de la aplicación
├── legacy/                 # Archivos originales preservados de respaldo
├── _redirects              # Configuración de routing SPA
├── tailwind.config.js      # Configuración de diseño y paleta de colores
├── tsconfig.json           # Configuración de compilación TypeScript estricta
└── vite.config.ts          # Configuración de empaquetado y code-splitting (Rollup manualChunks)
```

---

## 2. Decisiones Técnicas Clave

1. **Protección Absoluta de Datos en Producción:**
   - No se alteró el esquema de Firestore ni los identificadores de documentos existentes.
   - La aplicación implementa mapeadores y adaptadores resilientes (`mapDocToProducto`, `mapDocToMovimiento`) capaces de tolerar campos nulos, registros antiguos con campos `sku` o `codigo_barra`, y documentos incompletos sin romper la UI.
2. **Eliminación Definitiva del Importador:**
   - Se eliminaron por completo `importar.html` y `stock.txt`.
   - Se retiraron las rutas y referencias a `/importar` de `_redirects`.
   - Se conservaron todos los productos cargados históricamente en Firestore.
3. **Búsqueda Ponderada y Segura:**
   - Búsqueda insensible a mayúsculas, minúsculas, tildes (acentos diacríticos) y letra `ñ`.
   - Algoritmo de distancia de Levenshtein para tolerancia a errores tipográficos leves en palabras de más de 3 letras.
   - Scoring por coincidencia exacta en código SKU o nombre.
   - Resaltado visual seguro mediante nodos de React (`React.createElement('mark')`), sin usar `innerHTML` ni exponer la app a vectores XSS.
4. **Experiencia Desktop y Móvil Responsiva:**
   - **Escritorio (1280 × 800):** Tabla de productos y movimientos con ordenamiento por columnas, badges de estado claros y acciones rápidas.
   - **Celular (375 × 667):** Tarjetas táctiles optimizadas sin desplazamiento horizontal forzado, números de stock grandes y barra de navegación inferior fija (`MobileNav`) con botón flotante (`FAB`).
5. **Transacciones Atómicas y Prevención de Stock Negativo:**
   - Las salidas y las reversiones de movimientos se ejecutan en transacciones atómicas (`runTransaction`) garantizando que nunca quede el inventario en números negativos ni inconsistente ante desconexiones.
6. **PWA Segura:**
   - El Service Worker implementa Network-First para archivos HTML de navegación (evita servir código JavaScript antiguo) y excluye explícitamente cualquier solicitud hacia dominios de Firebase (`firestore.googleapis.com`, `identitytoolkit.googleapis.com`), garantizando que jamás se guarden datos sensibles en caché ni se generen escrituras offline desincronizadas.

---

## 3. Funcionalidades Conservadas, Mejoradas y Eliminadas

| Funcionalidad | Estado | Detalle |
| :--- | :--- | :--- |
| **Consulta de Productos y Existencias** | Conservada y Mejorada | Búsqueda por nombre y código con scoring, filtros por categoría y stock (Bajo / Sin Stock). |
| **Ficha Detallada del Producto** | Conservada y Mejorada | Modal con stock actual, mínimo, categoría, ubicación, marca, proveedor, notas y fechas. |
| **Ajuste Rápido de Stock** | Conservada y Mejorada | Modal con cálculo en tiempo real de diferencia (+/−) y registro de auditoría en `historialEdiciones`. |
| **Registro de Entradas y Salidas** | Conservada y Mejorada | Selector dinámico con buscador de productos, validación de stock disponible e imputación a movimientos. |
| **Reversión de Movimientos** | Conservada y Mejorada | Reversión en transacción atómica (restaura stock y previene negativos al revertir entradas). |
| **Historial de Producto** | Conservada y Mejorada | Pestañas de Movimientos y Auditoría de Cambios (diffs campo por campo). |
| **Notas Rápidas / Borradores** | Conservada y Mejorada | Detección automática de verbos (+/−), cantidades y auto-procesamiento rápido a stock. |
| **Exportación a CSV** | Conservada | Exportación local de todo el inventario de stock para planillas. |
| **Módulo Importador de Stock** | **ELIMINADO DEFINITIVAMENTE** | `importar.html` y `stock.txt` eliminados sin afectar datos existentes. |

---

## 4. Instalación y Ejecución Local

### Requisitos
- Node.js >= 18.0.0
- npm >= 9.0.0

### Instalación de dependencias
```bash
npm install
```

### Ejecutar servidor de desarrollo local
```bash
npm run dev
```
La aplicación iniciará en `http://localhost:3000`.

### Verificación de tipos TypeScript
```bash
npm run typecheck
```

### Ejecutar batería de pruebas automatizadas (Vitest)
```bash
npm test
```

### Generar build de producción local
```bash
npm run build
```
Los archivos optimizados se generan en la carpeta `dist/`.

---

## 5. Variables de Entorno

La aplicación cuenta con una configuración embebida de conexión al proyecto Firebase (`ferreteria-sistema`), pero permite sobreescribirla mediante variables de entorno en un archivo `.env`:

```env
VITE_FIREBASE_API_KEY=AIzaSyC5freZBatfO5zrhhNNFo_nYw7ejfym2aY
VITE_FIREBASE_AUTH_DOMAIN=ferreteria-sistema.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ferreteria-sistema
VITE_FIREBASE_STORAGE_BUCKET=ferreteria-sistema.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=122400105302
VITE_FIREBASE_APP_ID=1:122400105302:web:36586c69fc2d2b9e71ecf7

# Para desarrollo local con Firebase Emulator Suite (opcional):
VITE_USE_FIREBASE_EMULATOR=false
```

---

## 6. Seguridad y Protección de Producción

- **Sin escrituras a producción durante tests:** La suite de pruebas utiliza mocks y emuladores aislados en memoria.
- **Sin push ni merge automatizado:** Todo el desarrollo se encuentra confinado a la rama local `feature/react-migration`. Las ramas `main`, `cleanup/remove-tecniya` y `backup/pre-tecniya-cleanup-2026-11-19` permanecen intactas.
