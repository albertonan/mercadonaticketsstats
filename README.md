# 🛒 Shopping Stats (Mercadona & Lidl)

Aplicación web local para visualizar y analizar tus hábitos de compra a partir de tickets digitales (PDF o Imágenes). Funciona completamente en el navegador sin enviar datos a ningún servidor externo.

## 📊 Descripción General

Esta herramienta permite importar tickets de compra (principalmente de Mercadona en PDF y Lidl en imagen/foto) para extraer automáticamente la información de productos, precios y fechas. Genera estadísticas detalladas, gráficos de consumo y permite comparar precios entre diferentes tiendas.

## 🛠 Arquitectura y Flujo de Datos

El siguiente diagrama muestra cómo fluyen los datos desde que el usuario sube un archivo hasta que se visualizan en el dashboard:

```mermaid
graph TD
    User([Usuario]) -->|Sube PDF/Imagen| Loader[Data Loader Modal]
    User -->|Sube JSON| Loader
    
    subgraph "Procesamiento (Client-Side)"
        Loader -->|PDF| PDFJS[PDF.js Library]
        Loader -->|Imagen| OCR[Tesseract.js (OCR)]
        PDFJS -->|Texto Plano| Parser[Parser.js]
        OCR -->|Texto Plano| Parser
        
        Parser -->|RegEx & Reglas| Categorizer{Categorizador}
        Categorizer -->|Categoría Asignada| TicketObj[Objeto Ticket]
    end
    
    subgraph "Almacenamiento"
        TicketObj -->|Merge & Deduplicate| TicketsArray[Array de Tickets]
        TicketsArray <-->|Persistencia| LocalStorage[(LocalStorage)]
        TicketsArray -->|Exportar| JSONFile[tickets.json]
    end
    
    subgraph "Visualización (App.js)"
        TicketsArray --> App[Controlador Principal]
        App --> Router[Gestor de Pestañas]
        
        Router --> Tab1[Resumen/Overview]
        Router --> Tab2[Insights]
        Router --> Tab3[Categorías]
        Router --> Tab4[Productos]
        Router --> Tab5[Precios]
        Router --> Tab6[Historial Tickets]
        
        Tab1 & Tab2 & Tab3 & Tab4 & Tab5 --> Charts[Chart.js]
        Tab5 --> PriceComp[Comparador Tiendas]
    end
```

## ✨ Características Principales

### 1. Ingesta de Datos (Parser)
- **PDF (Mercadona):** Extracción nativa de texto manteniendo la estructura de líneas.
- **Imágenes (Lidl/Otros):** OCR integrado para leer fotos de tickets físicos.
- **Categorización Inteligente:** Algoritmo basado en prioridad (Reglas específicas > Palabras clave) para clasificar productos en:
  - 🥬 Frutas y Verduras
  - 🍖 Proteínas
  - 🥛 Lácteos
  - 🥖 Despensa
  - ❄️ Congelados
  - 🍫 Dulces y Snacks
  - 🥤 Bebidas
  - 🧹 Higiene y Limpieza

### 2. Dashboard y Visualización
- **Resumen:** KPIs de gasto total, media mensual y patrones de compra.
- **Gráficos:** Evolución de gasto mensual, distribución por categorías y "mapas de calor" de horarios de compra.
- **Multitienda:** Filtros para ver estadísticas globales o específicas por tienda (ej. Mercadona vs Lidl).

### 3. Análisis de Precios
- **Historial:** Gráficos de evolución de precio para cada producto individual.
- **Tendencia:** Índice general de inflación de tu cesta de la compra.
- **Comparador:** Tablas comparativas para ver qué tienda ofrece el mejor precio actual para un mismo producto.
- **Alertas:** Detección automática de subidas/bajadas significativas.

## 📂 Estructura del Proyecto

- `index.html`: Punto de entrada único de la aplicación.
- `js/`: Lógica de la aplicación.
  - `app.js`: Orquestador principal (estado, inicialización, router).
  - `parser.js`: Motor de extracción y categorización.
  - `importers/`: Módulos de gestión de archivos.
    - `file-importer.js`: Procesamiento de PDFs e Imágenes.
    - `json-importer.js`: Importación de backups.
    - `validation-modal.js`: UI para validar datos OCR.
  - `charts.js`: Configuraciones de Chart.js.
  - `tabs/*.js`: Lógica específica para cada pestaña de la interfaz.
- `css/`: Estilos modulares (base, temas, componentes).
- `data/`: Carpeta para datos de ejemplo (opcional).

## 🚀 Uso

1. Abre `index.html` en tu navegador.
2. Pulsa el botón `+` o "Cargar Datos".
3. Arrastra tus archivos PDF de Mercadona o fotos de tickets.
4. El sistema procesará localmente los archivos y guardará los resultados en tu navegador.
5. (Opcional) Descarga el archivo `tickets.json` como copia de seguridad.

## 🔒 Privacidad

Todo el procesamiento se realiza en **tu navegador**. Ningún dato (ni tickets ni estadísticas) se envía a servidores externos. Google Fonts y librerías CDN (Chart.js, PDF.js, Tesseract) son las únicas conexiones externas para cargar los recursos de la aplicación.
