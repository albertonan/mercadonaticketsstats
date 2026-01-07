# Mercadona Stats Dashboard - Documentación Técnica

## Propósito del Proyecto

Dashboard web interactivo para visualizar y analizar estadísticas de compras en Mercadona. Los datos provienen de tickets digitales extraídos de PDFs y procesados mediante scripts Python. El sistema permite realizar análisis detallados del gasto, productos, categorías, tendencias de precios y obtener insights sobre hábitos de compra.

### Características Principales
- 📊 Visualización de estadísticas de compra con 6 pestañas especializadas
- 🔍 Análisis de productos, categorías y evolución de precios
- 📈 Gráficos interactivos con Chart.js
- 🎨 Interfaz moderna con modo oscuro
- 📱 Diseño responsive para móvil y desktop
- 💾 Carga de datos desde JSON o archivos de texto de tickets
- 🔄 Sistema de parsing dual (Python y JavaScript)

## Arquitectura de Archivos

```
mercadonaticketsstats/
├── index.html              # HTML principal con estructura de pestañas
├── app.js                  # Entry point (solo importa módulos)
├── claude.md              # Esta documentación
│
├── css/                   # Estilos modulares
│   ├── base.css          # Variables CSS, reset, estilos globales
│   ├── components.css    # Componentes reutilizables (cards, modals, tables)
│   ├── tabs.css          # Estilos específicos de pestañas
│   └── themes.css        # Tema oscuro y claro
│
├── js/                    # JavaScript modular
│   ├── app.js            # Aplicación principal, estado global, inicialización
│   ├── charts.js         # Funciones de Chart.js, creación de gráficos
│   ├── parser.js         # Parser de tickets en texto plano (replica Python)
│   ├── utils.js          # Funciones utilitarias (formateo, fechas, etc)
│   └── tabs/             # Lógica de cada pestaña
│       ├── overview.js   # Pestaña Resumen
│       ├── categories.js # Pestaña Categorías
│       ├── products.js   # Pestaña Productos
│       ├── prices.js     # Pestaña Precios
│       ├── insights.js   # Pestaña Insights
│       └── tickets.js    # Pestaña Tickets
│
├── tabs/                  # HTML de contenido de cada pestaña (cargado dinámicamente)
│   ├── overview.html
│   ├── categories.html
│   ├── products.html
│   ├── prices.html
│   ├── insights.html
│   └── tickets.html
│
├── data/
│   ├── tickets.json      # Datos procesados (90 tickets, 2447 items, categorías)
│   └── schema.json       # Esquema/plantilla del JSON
│
├── tickets_mercadona.txt    # Fuente: texto plano de tickets
├── parse_tickets.py         # Script Python para generar tickets.json desde .txt
├── extract_pdfs.py          # Script para extraer PDFs de archivos ZIP/EML
└── merge_pdfs_to_text.py    # Script para convertir PDFs a tickets_mercadona.txt
```

## Flujo de Procesamiento de Datos

### 1. Extracción de PDFs (extract_pdfs.py)
```bash
python3 extract_pdfs.py
```
- Lee archivos ZIP que contienen emails (.eml)
- Extrae PDFs adjuntos de los emails
- Guarda PDFs en carpeta `pdfs_extraidos/`
- Los PDFs son tickets de compra de Mercadona en formato digital

### 2. Conversión PDF → Texto (merge_pdfs_to_text.py)
```bash
python3 merge_pdfs_to_text.py
```
- Lee todos los PDFs de `pdfs_extraidos/`
- Usa biblioteca `pypdf` para extraer texto
- Concatena todo en archivo único: `tickets_mercadona.txt`
- Formato: texto plano con ~5000 líneas, 90 tickets (oct 2023 - ene 2026)

### 3. Parsing Texto → JSON (parse_tickets.py)
```bash
python3 parse_tickets.py
```
**Proceso:**
1. Lee `tickets_mercadona.txt` línea por línea
2. Detecta inicio de ticket (línea "FACTURA SIMPLIFICADA")
3. Extrae metadata:
   - ID de factura (ej: "3665-016-337318")
   - Fecha (formato "DD/MM/YYYY" → "YYYY-MM-DD")
   - Hora ("HH:MM")
   - Tienda (nombre y ciudad)
4. Extrae items del ticket:
   - Líneas con patrón: cantidad + nombre + precio
   - Calcula precio unitario y categoriza automáticamente
5. Genera JSON estructurado: `data/tickets.json`

**Categorización automática:**
- 9 categorías con keywords para clasificación
- Busca coincidencias en nombre de producto
- Ejemplo: "PECHUGA POLLO" → categoría "proteinas"

### 4. Carga en Aplicación Web
La aplicación web puede cargar datos de dos formas:

**Opción A: JSON pregenerado**
```javascript
fetch('data/tickets.json')  // Carga tickets.json
```

**Opción B: Archivo de texto de tickets**
```javascript
// Usuario sube tickets_mercadona.txt
// parser.js lo procesa en tiempo real (replica parse_tickets.py)
```

## Estructura de Datos (data/tickets.json)

El JSON generado contiene tres secciones principales:

### 1. Meta
Información general del dataset:
```json
{
  "meta": {
    "lastUpdated": "2026-01-07",
    "totalTickets": 90,
    "startDate": "2023-10-06",
    "endDate": "2026-01-03"
  }
}
```

### 2. Tickets Array
Cada ticket tiene:
- `id`: ID de factura (ej: "3665-016-337318")
- `date`: formato "YYYY-MM-DD"
- `time`: hora del ticket "HH:MM"
- `total`: float con el importe total en euros
- `store`: objeto con `name` y `city`
- `items`: array de productos (TODOS los tickets tienen items completos)

Estructura de items:
```json
{
  "items": [
    {
      "name": "LECHE DESN. PROT 1L",
      "quantity": 2,
      "price": 2.50,
      "unitPrice": 1.25,
      "category": "lacteos"
    }
  ]
}
```

**Nota**: Los 90 tickets tienen sus items completos extraídos (2447 productos totales).
El script `parse_tickets.py` se usa para regenerar el JSON desde `tickets_mercadona.txt`.

### 3. Categorías (categories)
9 categorías definidas con colores, iconos y keywords para clasificación automática:
- `name`: nombre legible
- `color`: hex color para gráficos
- `icon`: emoji representativo
- `keywords`: array de strings para clasificar productos automáticamente

```json
{
  "categories": {
    "proteinas": {
      "name": "Proteínas",
      "color": "#ef4444",
      "icon": "🥩",
      "keywords": ["POLLO", "PAVO", "TERNERA", "CERDO", "JAMON", "ATUN", "SALMON", "HUEVO", "CECINA", "BACON"]
    },
    "lacteos": { ... },
    "frutas_verduras": { ... },
    "bebidas": { ... },
    "congelados": { ... },
    "despensa": { ... },
    "dulces_snacks": { ... },
    "higiene_limpieza": { ... },
    "otros": { ... }
  }
}
```

### Historial de Precios (productHistory)
Seguimiento de precios de productos específicos a lo largo del tiempo:
```json
{
  "productHistory": {
    "LECHE SEMIDESNATADA": [
      { "date": "2023-10-06", "price": 1.25 },
      { "date": "2024-03-15", "price": 1.30 },
      { "date": "2025-01-10", "price": 1.35 }
    ],
    "COCA COLA ZERO": [ ... ],
    "CECINA": [ ... ]
  }
}
```

Productos con historial de precios incluidos:
- LECHE SEMIDESNATADA (1.25 → 1.35€)
- COCA COLA ZERO (1.10 → 1.25€)
- CECINA (3.25 → 4.20€)
- PECHUGA PAVO LONCHAS (2.15 → 2.45€)
- QUESO COTTAGE (1.85 → 2.10€)
- PLATANO (1.49 → 1.89€/kg)
- 6 HUEVOS CAMPEROS (1.59 → 2.20€)
- PAN DE MOLDE INTEGRAL (1.20 → 1.45€)
- YOGUR GRIEGO NATURAL (1.95 → 2.25€)
- ACEITE OLIVA VIRGEN (5.99 → 8.50€)
- AGUA MINERAL (0.35 → 0.42€)
- MANZANA GOLDEN (1.99 → 2.29€/kg)
- JAMON SERRANO (3.50 → 4.10€)
- QUESO MANCHEGO (4.25 → 5.10€)
- DETERGENTE LIQUIDO (4.50 → 5.20€)

### 4. Product History (productHistory)
Tracking manual de precios de productos específicos a lo largo del tiempo. No se extrae automáticamente de los tickets, sino que se mantiene manualmente para análisis de inflación.

```json
{
  "productHistory": {
    "LECHE SEMIDESNATADA": [
      { "date": "2023-10-06", "price": 1.25 },
      { "date": "2024-03-15", "price": 1.30 },
      { "date": "2025-01-10", "price": 1.35 }
    ]
  }
}
```

## Arquitectura de la Aplicación Web

### Inicialización (js/app.js)

**Estado Global:**
```javascript
let ticketsData = [];      // Array de tickets filtrados
let currentYear = 'all';   // Filtro de año activo
let currentStore = 'all';  // Filtro de tienda activa
let fullData = null;       // Datos completos con meta, categories, productHistory
```

**Flujo de inicio:**
1. `init()` - Punto de entrada al cargar DOM
2. `setupDarkMode()` - Inicializa tema claro/oscuro desde localStorage
3. `tryLoadData()` - Intenta cargar datos:
   - Primero desde `data/tickets.json` (fetch)
   - Si falla, desde localStorage (datos guardados previamente)
   - Si no hay datos, muestra modal de carga
4. `startApp()` - Inicia la aplicación:
   - `setupFilters()` - Configura filtros de año y tienda
   - `setupExport()` - Configura botón de exportación
   - `setupTabs()` - Configura navegación entre pestañas
   - Restaura última pestaña activa desde localStorage
5. `switchTab(tabName)` - Carga contenido de pestaña y ejecuta su renderizado

### Sistema de Pestañas

Cada pestaña tiene:
- **HTML template** en `tabs/{nombre}.html`
- **Módulo JS** en `js/tabs/{nombre}.js` con función `render{Nombre}()`
- Se cargan dinámicamente al hacer clic

**Ejemplo de flujo:**
```javascript
// Usuario hace clic en pestaña "Productos"
switchTab('products')
  → fetch('tabs/products.html')
  → Inyectar HTML en #tabContent
  → Ejecutar renderProducts() desde products.js
  → Aplicar filtros y renderizar gráficos
```

### Sistema de Filtros

**Filtro de Año:**
- Extrae años únicos de los tickets
- Opciones: "Todos", "2026", "2025", "2024", "2023"
- Al cambiar: actualiza `currentYear` y re-renderiza pestaña activa

**Filtro de Tienda:**
- Extrae tiendas únicas de los tickets
- Opciones: "Todas", lista de tiendas
- Al cambiar: actualiza `currentStore` y re-renderiza pestaña activa

**Función de filtrado:**
```javascript
function getFilteredTickets() {
  return ticketsData.filter(t => {
    const yearMatch = currentYear === 'all' || t.date.startsWith(currentYear);
    const storeMatch = currentStore === 'all' || 
      (t.store?.city === currentStore || t.store?.name === currentStore);
    return yearMatch && storeMatch;
  });
}
```

## Funcionalidades por Pestaña

### 1. 📊 Resumen (Overview)

**Visualizaciones:**
- **Cards de KPIs:**
  - Total gastado (suma de todos los tickets)
  - Número de tickets
  - Media por ticket
  - Media mensual
  - Tienda más visitada (con número de visitas)
  - Día favorito de compra (con número de compras)

- **Gráfico de Gasto Mensual:**
  - Tipo: Barra vertical
  - Agrupa tickets por mes (YYYY-MM)
  - Muestra total gastado por mes
  - Tooltip con formato de moneda

- **Gráfico de Gasto por Día de Semana:**
  - Tipo: Barra horizontal
  - Agrupa por día de la semana (L, M, X, J, V, S, D)
  - Muestra gasto total y promedio por día

- **Comparación Año a Año:**
  - Tipo: Línea
  - Compara gasto mensual entre diferentes años
  - Múltiples líneas, una por año

**Código principal:** `js/tabs/overview.js`

### 2. 🏷️ Categorías (Categories)

**Visualizaciones:**
- **Gráfico de Distribución:**
  - Tipo: Doughnut (rosquilla)
  - Muestra porcentaje de gasto por categoría
  - 9 categorías con colores predefinidos
  - Tooltip con valor y porcentaje

- **Lista de Categorías:**
  - Ordenadas por gasto (mayor a menor)
  - Muestra: emoji, nombre, número de productos, gasto total, porcentaje
  - Color indicador para cada categoría

- **Gráfico de Evolución por Categoría:**
  - Tipo: Línea múltiple
  - Muestra evolución mensual del gasto por categoría
  - Una línea por categoría

- **Filtro de Productos por Categoría:**
  - Selector para ver productos de una categoría específica
  - Lista filtrada de productos con detalles

**Clasificación automática:**
```javascript
function categorizeProduct(productName) {
  const upperName = productName.toUpperCase();
  for (const [catId, catData] of Object.entries(CATEGORIES_CONFIG)) {
    if (catData.keywords.some(kw => upperName.includes(kw))) {
      return catId;
    }
  }
  return 'otros'; // Categoría por defecto
}
```

**Código principal:** `js/tabs/categories.js`

### 3. 🛒 Productos (Products)

**Visualizaciones:**
- **Buscador de Productos:**
  - Input con debounce (300ms)
  - Busca por nombre de producto
  - Muestra resultados con: emoji categoría, nombre, precio promedio, gasto total
  - Límite: 10 resultados

- **Gráfico Top Productos:**
  - Tipo: Barra horizontal
  - Selector de ordenación:
    - Por gasto total
    - Por frecuencia de compra
    - Por cantidad comprada
  - Top 10 productos
  - Colores por categoría

- **Tabla de Todos los Productos:**
  - Columnas: Producto, Categoría, Cantidad, Frecuencia, Precio promedio, Total
  - Ordenable por columnas
  - Paginación (20 productos por página)
  - Badges con iconos de categoría

**Cálculos:**
```javascript
// Por cada producto se acumula:
productData[name] = {
  total: suma_de_precios,        // Gasto total
  count: suma_de_cantidades,     // Unidades compradas
  frequency: num_apariciones,    // Cuántas veces se compró
  category: categoria,           // Categoría asignada
  prices: [precios_unitarios]    // Array de precios para promedio
}
```

**Código principal:** `js/tabs/products.js`

### 4. 💰 Precios (Prices)

**Visualizaciones:**
- **Selector de Producto:**
  - Dropdown con productos que tienen historial de precios
  - Solo productos presentes en `fullData.productHistory`

- **Gráfico de Evolución de Precio:**
  - Tipo: Línea
  - Muestra precio a lo largo del tiempo
  - Puntos marcados con valores
  - Eje Y: precio en euros
  - Eje X: fechas

- **Tabla de Cambios de Precio:**
  - Columnas: Producto, Precio Inicial, Precio Actual, Cambio (€), Cambio (%)
  - Badge de color según cambio:
    - Verde: bajada de precio
    - Rojo: subida de precio
    - Gris: sin cambio
  - Click en fila actualiza el gráfico
  - Ordenable por cambio de precio

**Cálculo de variación:**
```javascript
const change = currentPrice - firstPrice;
const percentChange = ((change / firstPrice) * 100).toFixed(1);
```

**Código principal:** `js/tabs/prices.js`

### 5. 💡 Insights (Insights)

Pestaña de análisis avanzado con múltiples secciones:

**A. Alertas de Precios:**
- Detecta cambios significativos (≥10%) en precios entre meses
- Compara último mes con mes anterior
- Muestra: producto, precio anterior → actual, % cambio
- Iconos: 📈 (subida) / 📉 (bajada)

**B. Predicciones:**
- Calcula tendencia de gasto mensual
- Proyecta gasto del próximo mes
- Usa regresión lineal simple

**C. Hábitos de Compra:**
- Día favorito de compra (más tickets)
- Hora favorita de compra
- Intervalo promedio entre compras (en días)
- Productos más consistentes (mayor frecuencia)

**D. Patrones de Compra:**
- Gráfico de calor: días × horas
- Muestra cuándo se realizan más compras
- Identifica patrones semanales

**E. Oportunidades de Ahorro:**
- Detecta productos que se compran frecuentemente
- Compara con productos similares más baratos
- Sugiere alternativas basado en keywords de categoría

**F. Seguimiento de Presupuesto:**
- Input para establecer presupuesto mensual
- Compara gasto real vs presupuesto
- Gráfico de progreso mensual
- Alertas si se supera el presupuesto

**Código principal:** `js/tabs/insights.js`

### 6. 🎫 Tickets (Tickets)

**Visualizaciones:**
- **Lista de Todos los Tickets:**
  - Cards con información de cada ticket
  - Datos: fecha, hora, tienda, total, número de items
  - Click para expandir y ver detalle de items

- **Detalle de Items:**
  - Tabla con productos del ticket
  - Columnas: Cantidad, Producto, Categoría, Precio unitario, Total

- **Filtros Adicionales:**
  - Por rango de fechas
  - Por rango de importes
  - Por tienda

- **Ordenación:**
  - Por fecha (más reciente primero)
  - Por importe (mayor a menor)
  - Por número de items

- **Búsqueda:**
  - Por ID de ticket
  - Por productos contenidos

**Código principal:** `js/tabs/tickets.js`
```javascript
formatCurrency(value)     // → "123,45 €"
formatMonth(yearMonth)    // "2024-03" → "Mar 2024"
formatDate(date)          // "2024-03-15" → "15 mar 24"
truncate(str, length)     // Truncar texto largo
showError(message)        // Mostrar error si falla carga
```

## Actualización de Datos (Manual en JSON)

Si prefieres editar `data/tickets.json` directamente sin usar scripts:

1. Abrir `data/tickets.json`
2. Agregar nuevo objeto al array `tickets`:
```json
{
  "id": "3665-016-999999",
  "date": "2026-01-15",
  "time": "11:30",
  "total": 45.67,
  "store": {
    "name": "MERCADONA",
    "city": "MADRID LOS VASCOS"
  },
  "items": [
    {
      "name": "LECHE SEMIDESNATADA",
      "quantity": 1,
      "price": 1.35,
      "unitPrice": 1.35,
      "category": "lacteos"
    }
  ]
}
```
3. Actualizar `meta.totalTickets` y `meta.endDate`
4. Opcionalmente agregar entradas a `productHistory` si hay cambios de precios notables
5. Guardar y recargar la aplicación web

**Código principal:** `js/tabs/tickets.js`

## Sistema de Gráficos (js/charts.js)

Wrapper sobre Chart.js para crear gráficos consistentes.

**Registro global:**
```javascript
const chartsRegistry = {};  // Almacena instancias activas
```

**Funciones principales:**

### createBarChart(canvasId, labels, data, options)
- Crea gráfico de barras vertical
- Destruye gráfico anterior si existe
- Opciones: label, color, formatValue, formatAxis

### createHorizontalBarChart(canvasId, labels, data, options)
- Crea gráfico de barras horizontal
- Útil para rankings de productos

### createLineChart(canvasId, datasets, options)
- Crea gráfico de línea
- Soporta múltiples líneas (datasets)
- Opciones: formatValue, formatAxis, tension (curvatura)

### createDoughnutChart(canvasId, labels, data, colors, options)
- Crea gráfico de rosquilla
- Requiere array de colores
- Opciones: formatValue (para tooltip)

### destroyChart(canvasId)
- Destruye instancia de Chart.js
- Previene memory leaks

**Configuración común:**
```javascript
const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true },
    tooltip: { 
      backgroundColor: 'rgba(0,0,0,0.8)',
      callbacks: { /* formateo personalizado */ }
    }
  }
}
```

## Funciones Utilitarias (js/utils.js)

### Parseo de Fechas (IMPORTANTE)
- `parseLocalDate(dateStr)` → **Función crítica**. Convierte string "YYYY-MM-DD" a Date en zona horaria local.
  
  **Problema que resuelve:** `new Date("2024-01-15")` interpreta la fecha como UTC medianoche, 
  lo que en España (UTC+1/+2) puede mostrar el día anterior (ej: Lunes aparece como Domingo).
  
  ```javascript
  // INCORRECTO - puede mostrar día equivocado
  new Date("2024-01-15").getDay()  // Puede ser 0 (Domingo) en vez de 1 (Lunes)
  
  // CORRECTO - siempre muestra el día correcto
  parseLocalDate("2024-01-15").getDay()  // Siempre 1 (Lunes)
  ```

### Formateo
- `formatCurrency(value)` → "123,45 €"
- `formatMonth(yearMonth)` → "2024-03" → "Mar 2024"
- `formatDate(date)` → "2024-03-15" → "15 mar 24" (usa parseLocalDate internamente)
- `formatDateTime(date, time)` → "15 mar 24 10:30"
- `formatPercent(value)` → "23.4%"
- `truncate(str, length)` → Trunca texto con "..."

### Cálculos
- `calculateAverage(array)` → Promedio de números
- `calculateMedian(array)` → Mediana
- `groupBy(array, keyFn)` → Agrupa objetos por clave
- `sortBy(array, keyFn, order)` → Ordena array

### Colores y Categorías
- `getCategoryColor(index)` → Color hexadecimal por índice
- `getCategoryEmoji(categoryName)` → Emoji de categoría
- `getCategoryName(categoryId)` → Nombre legible

### Utilidades de Fecha
- `getDateRange(tickets)` → [minDate, maxDate]
- `getMonthsBetween(date1, date2)` → Array de meses

### Debouncing y Throttling
- `debounce(fn, delay)` → Debounce para búsquedas
- `throttle(fn, delay)` → Throttle para scroll

## Parser de Tickets en Texto (js/parser.js)

Replica la lógica de `parse_tickets.py` en JavaScript para procesar archivos de texto en el navegador.

**Flujo:**
1. Usuario sube archivo `.txt` mediante input file
2. Lee contenido como texto
3. Divide en líneas
4. Busca patrones de inicio de ticket
5. Extrae metadata y items
6. Categoriza productos
7. Genera objeto JSON equivalente

**Patrones Regex principales:**
```javascript
const PATTERNS = {
  factura: /FACTURA SIMPLIFICADA/,
  facturaId: /(\d{4}-\d{3}-\d{6})/,
  fecha: /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/,
  item: /^(\d+)\s+(.+?)\s+([\d,]+)$/,
  precio: /([\d,]+)/
};
```

**Categorización:**
```javascript
function categorizeItem(itemName) {
  const upper = itemName.toUpperCase();
  for (const [catId, config] of Object.entries(CATEGORIES_CONFIG)) {
    if (config.keywords.some(kw => upper.includes(kw))) {
      return catId;
    }
  }
  return 'otros';
}
```

**Ventajas:**
- Permite cargar datos sin necesidad de servidor Python
- Procesamiento en tiempo real en el navegador
- Misma lógica que el script Python

## Características Especiales

### 🌙 Modo Oscuro
- Toggle en header
- Persiste en localStorage: `mercadona_theme`
- Cambia variables CSS automáticamente
- Suavizado con transitions

**CSS:**
```css
[data-theme="dark"] {
  --bg-primary: #1a1a2e;
  --text-primary: #f0f0f0;
  --card-bg: #16213e;
  /* ... */
}
```

### 📥 Exportación de Datos
- Botón en header
- Exporta datos filtrados a JSON
- Descarga como archivo
- Incluye metadata y tickets seleccionados

```javascript
function exportData() {
  const filtered = getFilteredTickets();
  const data = {
    meta: { /* ... */ },
    tickets: filtered
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { 
    type: 'application/json' 
  });
  downloadBlob(blob, 'mercadona_export.json');
}
```

### 📂 Carga de Archivos de Datos
- Modal para cargar datos
- Soporta dos formatos:
  1. **JSON** (`tickets.json`): carga directa
  2. **TXT** (`tickets_mercadona.txt`): parsea con parser.js
- Guarda en localStorage para persistencia
- Validación de estructura de datos

### 💾 Persistencia
- **localStorage** para:
  - Datos de tickets (`mercadona_tickets_data`)
  - Tema activo (`mercadona_theme`)
  - Última pestaña activa (`mercadona_active_tab`)
  - Filtros aplicados (`mercadona_filters`)
  - Presupuesto configurado (`mercadona_budget`)

## Estilos y Diseño (CSS)

### Variables CSS (css/base.css)
```css
:root {
  /* Colores principales */
  --primary: #667eea;
  --secondary: #764ba2;
  --accent: #f093fb;
  
  /* Fondo y texto */
  --bg-primary: #f5f7fa;
  --bg-secondary: #ffffff;
  --text-primary: #2d3748;
  --text-secondary: #718096;
  --text-muted: #a0aec0;
  
  /* Componentes */
  --card-bg: #ffffff;
  --card-shadow: 0 4px 6px rgba(0,0,0,0.1);
  --border-color: #e2e8f0;
  --border-radius: 12px;
  
  /* Estados */
  --success: #48bb78;
  --warning: #ed8936;
  --danger: #f56565;
  --info: #4299e1;
}
```

### Componentes Reutilizables (css/components.css)

**Cards:**
```css
.card {
  background: var(--card-bg);
  border-radius: var(--border-radius);
  padding: 24px;
  box-shadow: var(--card-shadow);
  transition: transform 0.2s;
}

.card:hover {
  transform: translateY(-2px);
}
```

**Badges:**
```css
.badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
}

.badge-success { background: var(--success); color: white; }
.badge-danger { background: var(--danger); color: white; }
```

**Botones:**
```css
.btn {
  padding: 10px 20px;
  border-radius: var(--border-radius);
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
}
```

### Sistema de Grid Responsivo
```css
.grid {
  display: grid;
  gap: 24px;
}

.grid-2 { grid-template-columns: repeat(2, 1fr); }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.grid-4 { grid-template-columns: repeat(4, 1fr); }

@media (max-width: 768px) {
  .grid-2, .grid-3, .grid-4 {
    grid-template-columns: 1fr;
  }
}
```

### Breakpoints
- **Desktop:** > 1024px
- **Tablet:** 768px - 1024px
- **Mobile:** < 768px

## Cómo Ejecutar el Proyecto

### Opción 1: Servidor HTTP Simple (Python)
```bash
cd /home/nan/Projects/mercadonaticketsstats
python3 -m http.server 8000
```
Abrir: `http://localhost:8000`

### Opción 2: Live Server (VS Code)
1. Instalar extensión "Live Server"
2. Click derecho en `index.html`
3. "Open with Live Server"

### Opción 3: Servidor Node.js
```bash
npx http-server -p 8000
```

**Nota:** Se requiere servidor HTTP porque la app usa `fetch()` para cargar JSON y templates HTML, lo cual no funciona con `file://` protocol.

## Flujo Completo de Uso

### Primera Vez (sin datos)
1. Abrir aplicación en navegador
2. Modal de carga aparece automáticamente
3. Opciones:
   - **Opción A:** Seleccionar archivo JSON pregenerado
   - **Opción B:** Seleccionar archivo TXT de tickets y parsear
4. Datos se guardan en localStorage
5. Dashboard carga automáticamente

### Uso Normal (con datos en localStorage)
1. Aplicación carga datos automáticamente
2. Navegar entre pestañas
3. Aplicar filtros de año/tienda
4. Explorar estadísticas y gráficos
5. Exportar datos si es necesario

### Actualización de Datos
1. Click en botón "📂 Cargar otros datos"
2. Seleccionar nuevo archivo
3. Los datos anteriores se reemplazan
4. Dashboard se actualiza automáticamente

## Actualización de Datos (Vía Scripts Python)

### Agregar Nuevos Tickets

**1. Obtener PDFs:**
- Descargar tickets de email de Mercadona
- Pueden estar en archivos ZIP/EML

**2. Extraer PDFs:**
```bash
python3 extract_pdfs.py
```
- Procesa archivos ZIP en el directorio
- Extrae PDFs a `pdfs_extraidos/`

**3. Convertir a Texto:**
```bash
python3 merge_pdfs_to_text.py
```
- Lee todos los PDFs
- Extrae texto con pypdf
- Genera/actualiza `tickets_mercadona.txt`

**4. Generar JSON:**
```bash
python3 parse_tickets.py
```
- Parsea `tickets_mercadona.txt`
- Categoriza automáticamente productos
- Genera `data/tickets.json`

**5. Recargar en Navegador:**
- Refrescar página
- O usar botón "Cargar otros datos"

## Dependencias y Tecnologías

### Frontend
- **Vanilla JavaScript** (ES6+)
- **Chart.js 4.4.1** - Gráficos interactivos
- **CSS3** - Variables, Grid, Flexbox, Transitions
- **HTML5** - Semantic markup

### Backend/Scripts Python
- **Python 3.8+**
- **pypdf** - Extracción de texto de PDFs
- **email** (built-in) - Parsing de archivos EML
- **zipfile** (built-in) - Extracción de ZIPs
- **re** (built-in) - Expresiones regulares para parsing
- **json** (built-in) - Generación de JSON

### Sin Dependencias de Build
- No requiere npm/webpack/babel
- No requiere framework (React/Vue/Angular)
- JavaScript modular nativo (ES modules)
- CSS puro sin preprocesadores

## Estructura de Datos en Memoria

```javascript
// Estado global en app.js
{
  ticketsData: [         // Array de tickets filtrados
    {
      id: "3665-016-337318",
      date: "2023-10-06",
      time: "10:30",
      total: 45.67,
      store: {
        name: "MERCADONA",
        city: "GALAPAGAR"
      },
      items: [
        {
          name: "LECHE DESN. PROT 1L",
          quantity: 2,
          price: 2.50,
          unitPrice: 1.25,
          category: "lacteos"
        }
      ]
    }
  ],
  
  currentYear: 'all',    // Filtro activo
  currentStore: 'all',   // Filtro activo
  
  fullData: {            // Datos completos
    meta: { /* ... */ },
    tickets: [ /* ... */ ],
    categories: { /* ... */ },
    productHistory: { /* ... */ }
  }
}
```

## Rendimiento y Optimizaciones

### Lazy Loading
- Las pestañas se cargan solo cuando se activan
- HTML de pestañas se carga con fetch bajo demanda
- Previene carga inicial pesada

### Destrucción de Gráficos
```javascript
// Antes de crear nuevo gráfico
if (chartsRegistry[chartId]) {
  chartsRegistry[chartId].destroy();
}
// Evita memory leaks de Chart.js
```

### Debouncing en Búsquedas
```javascript
productSearch.addEventListener('input', debounce(() => {
  // Búsqueda con 300ms de delay
}, 300));
```

### LocalStorage Caching
- Datos se guardan localmente
- Reduce carga de servidor
- Persistencia entre sesiones

### Filtrado Eficiente
```javascript
// Filtro se aplica una vez, resultado se reutiliza
const filteredTickets = getFilteredTickets();
// Evita filtrar múltiples veces en una renderización
```

## Colores de Categorías (Código Hexadecimal)

| Categoría | Color | Emoji |
|-----------|-------|-------|
| Proteínas | `#e74c3c` (Rojo) | 🥩 |
| Lácteos | `#f39c12` (Naranja) | 🧀 |
| Frutas/Verduras | `#27ae60` (Verde) | 🥬 |
| Bebidas | `#3498db` (Azul) | 🥤 |
| Congelados | `#9b59b6` (Morado) | 🧊 |
| Despensa | `#e67e22` (Naranja oscuro) | 🏺 |
| Dulces/Snacks | `#e91e63` (Rosa) | 🍫 |
| Higiene/Limpieza | `#00bcd4` (Cyan) | 🧴 |
| Otros | `#95a5a6` (Gris) | 📦 |

## Tiendas Registradas

- **GALAPAGAR** - Principal 2023-2024
- **MADRID LOS VASCOS** - Principal 2025-2026
- Otras tiendas pueden aparecer según historial

## Estadísticas del Dataset Actual

- **Total tickets:** 90
- **Período:** Octubre 2023 - Enero 2026 (27 meses)
- **Total productos:** 2447 items
- **Productos únicos:** ~200
- **Gasto total:** ~4500€
- **Gasto promedio por ticket:** ~50€
- **Rango de tickets:** 15€ - 120€

## Notas Técnicas Importantes

1. **Items en Tickets:**
   - Los 90 tickets tienen arrays `items` completos con productos detallados
   - Cada item incluye: name, quantity, price, unitPrice, category
   - Total de 2447 productos registrados

2. **Product History:**
   - Es independiente de los tickets
   - Tracking manual de evolución de precios
   - No se genera automáticamente del parsing
   - 15 productos con historial de precios

3. **Categorización Automática:**
   - Usa keywords definidos en cada categoría
   - Busca coincidencias en nombre de producto (case-insensitive)
   - Primera coincidencia gana
   - Productos sin match van a "otros"

4. **Memory Management en Chart.js:**
   - Siempre destruir gráficos antes de recrear
   - Uso de registro global `chartsRegistry`
   - Previene memory leaks en navegación entre pestañas

5. **Responsive Design:**
   - Breakpoint principal: 768px
   - Grid adaptativos: 4 → 2 → 1 columnas
   - Tabs horizontales → verticales en móvil

6. **Browser Compatibility:**
   - Requiere navegador moderno (ES6+)
   - Usa fetch API, localStorage, ES modules
   - Funciona en Chrome, Firefox, Safari, Edge recientes

## Posibles Mejoras Futuras

- [ ] Backend con base de datos (PostgreSQL)
- [ ] API REST para CRUD de tickets
- [ ] Autenticación de usuarios
- [ ] Comparación entre usuarios/hogares
- [ ] Integración con API de Mercadona (si disponible)
- [ ] Notificaciones de cambios de precios
- [ ] OCR para extraer tickets de imágenes
- [ ] App móvil (React Native / Flutter)
- [ ] Sincronización en tiempo real
- [ ] Exportación a PDF/Excel
- [ ] Dashboard de administración
- [ ] Tests automatizados (Jest/Cypress)

---

**Última actualización:** 2026-01-07  
**Versión del proyecto:** 2.0  
**Mantenedor:** Alberto Nan
