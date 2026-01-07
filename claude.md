# Mercadona Stats Dashboard - Documentación Técnica

## Propósito del Proyecto

Dashboard web para visualizar estadísticas de compras en Mercadona. Los datos provienen de tickets digitales extraídos de PDFs (ver `extract_pdfs.py` y `merge_pdfs_to_text.py`). El archivo fuente es `tickets_mercadona.txt` con ~5000 líneas de texto plano conteniendo 90 tickets desde octubre 2023 hasta enero 2026.

## Arquitectura de Archivos

```
ticketsMercadona/
├── index.html          # HTML principal con 4 pestañas
├── styles.css          # Estilos CSS (variables, responsive, componentes)
├── app.js              # Lógica JavaScript vanilla (Chart.js)
├── data/
│   ├── schema.json     # Plantilla/esquema del JSON de datos
│   └── tickets.json    # Datos reales (90 tickets, 2447 items, categorías, historial precios)
├── tickets_mercadona.txt   # Fuente original (texto plano de tickets)
├── parse_tickets.py        # Script para regenerar tickets.json desde el txt
├── pdfs_extraidos/         # PDFs originales de tickets
├── extract_pdfs.py         # Script extracción PDFs
├── merge_pdfs_to_text.py   # Script merge a texto
└── estadisticas.js         # LEGACY: versión React anterior (ignorar)
```

## Estructura de Datos (data/tickets.json)

### Meta
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

### Tickets Array
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

### Categorías
9 categorías definidas con:
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

## Funcionalidades de la Aplicación (app.js)

### Estado Global
```javascript
let ticketsData = null;    // Datos cargados del JSON
let currentYear = 'all';   // Filtro de año activo
let charts = {};           // Instancias de Chart.js para destruir/recrear
```

### Flujo de Inicialización
1. `DOMContentLoaded` → `init()`
2. `loadData()` → fetch `data/tickets.json`
3. `setupDOM()` → cachear elementos DOM
4. `setupTabs()` → listeners para cambio de pestaña
5. `setupYearFilter()` → poblar selector con años disponibles
6. `renderAllViews()` → renderizar todas las vistas

### Pestañas

#### 1. Resumen (overview)
- **Cards**: Total gastado, nº tickets, media por ticket, media mensual, tienda más visitada
- **Gráfico**: Barras de gasto mensual (Chart.js bar chart)
- **Resumen**: Mes con mayor/menor gasto

Función principal: `renderOverview()`

#### 2. Categorías (categories)
- **Gráfico**: Doughnut chart con distribución por categoría
- **Lista**: Categorías ordenadas por gasto con porcentajes

Funciones: `renderCategories()`, `categorizeProduct()`, `renderCategoryChart()`, `renderCategoryList()`

**NOTA**: Si los tickets no tienen `items` detallados, usa distribución estimada:
```javascript
const avgDistribution = {
  proteinas: 0.25,
  lacteos: 0.15,
  frutas_verduras: 0.12,
  // ...
};
```

#### 3. Productos (products)
- **Gráfico**: Barras horizontales Top 10 productos por gasto
- **Tabla**: Lista de todos los productos con búsqueda

Funciones: `renderProducts()`, `renderTopProductsChart()`, `renderProductTable()`

#### 4. Evolución Precios (prices)
- **Selector**: Dropdown para elegir producto
- **Gráfico**: Línea de evolución temporal del precio
- **Tabla**: Variación de precios (precio inicial → actual, % cambio)
- **Interactividad**: Click en fila de tabla actualiza el gráfico

Funciones: `renderPriceHistory()`, `renderPriceChangeChart()`, `renderPriceChangeTable()`, `setupPriceProductSelector()`

### Filtro por Año
- Selector en header: "Todos", "2026", "2025", "2024", "2023"
- `getFilteredTickets()` filtra por año seleccionado
- Al cambiar año, `renderAllViews()` actualiza todo

### Utilidades
```javascript
formatCurrency(value)     // → "123,45 €"
formatMonth(yearMonth)    // "2024-03" → "Mar 2024"
formatDate(date)          // "2024-03-15" → "15 mar 24"
truncate(str, length)     // Truncar texto largo
showError(message)        // Mostrar error si falla carga
```

## Estilos (styles.css)

### Variables CSS
```css
:root {
  --primary: #667eea;
  --secondary: #764ba2;
  --bg-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --border-radius: 16px;
  /* ... */
}
```

### Componentes Principales
- `.header` - Cabecera con título y filtros
- `.tabs` / `.tab` - Navegación por pestañas
- `.content` - Contenido de cada pestaña (show/hide con `.active`)
- `.card` - Tarjetas de estadísticas
- `.chart-container` / `.chart-wrapper` - Contenedores de gráficos
- `.category-item` / `.product-item` - Items de listas
- `.price-change` - Badge de variación de precio (`.increase`, `.decrease`, `.same`)

### Responsive
- Breakpoint 768px: layout columna única, tabs wrap
- Breakpoint 480px: reducción de padding y font-size

## Dependencias Externas

- **Chart.js 4.4.1** via CDN: `https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js`

## Cómo Ejecutar

Requiere servidor HTTP por la carga del JSON con fetch:
```bash
cd /home/nan/Downloads/ticketsMercadona
python3 -m http.server 8000
# Abrir http://localhost:8000
```

## Actualización de Datos

Para agregar nuevos tickets:

1. Editar `data/tickets.json`
2. Agregar nuevo objeto al array `tickets`:
```json
{
  "id": 91,
  "date": "2026-01-15",
  "total": 45.67,
  "store": "MADRID LOS VASCOS",
  "items": []
}
```
3. Actualizar `meta.totalTickets` y `meta.endDate`
4. Opcionalmente agregar entradas a `productHistory` si hay cambios de precios

## Tiendas Conocidas

- **GALAPAGAR**: Principal tienda 2023-2024
- **MADRID LOS VASCOS**: Principal tienda 2025-2026

## Rango de Totales por Ticket

- Mínimo: ~15€
- Máximo: ~120€
- Media: ~50-60€

## Notas Técnicas

1. La mayoría de tickets tienen `items: []` vacío. El detalle de productos está simplificado. La funcionalidad de categorías usa estimaciones cuando no hay items.

2. El `productHistory` es independiente de los tickets - es un tracking manual de precios observados para productos específicos.

3. Los gráficos se destruyen y recrean al cambiar filtros (`charts.monthly.destroy()`) para evitar memory leaks de Chart.js.

4. La clasificación de productos por categoría usa `keywords` definidos en las categorías. La función `categorizeProduct()` busca coincidencias en el nombre del producto.

5. Colores de categorías están hardcodeados en el JSON para consistencia visual:
   - Proteínas: #ef4444 (rojo)
   - Lácteos: #3b82f6 (azul)
   - Frutas/Verduras: #22c55e (verde)
   - Bebidas: #06b6d4 (cyan)
   - Congelados: #8b5cf6 (violeta)
   - Despensa: #f59e0b (naranja)
   - Dulces/Snacks: #ec4899 (rosa)
   - Higiene/Limpieza: #14b8a6 (teal)
   - Otros: #6b7280 (gris)
