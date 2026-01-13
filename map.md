# Mapa del Proyecto: Mercadona Tickets Stats

Este diagrama ASCII muestra la estructura del proyecto y el flujo de datos. Para mantenerlo siempre localizado y fácil de entender.

## 🏗️ Estructura del Proyecto

```ascii
[PROYECTO ROOT]
 ├── index.html ........................... Entry point (Layout, Modals, Resources)
 ├── styles.css ........................... (Legacy) Estilos generales
 ├── TSKS.md .............................. Roadmap / Tasks
 ├── README.md ............................ Documentación
 │
 ├── css/ ................................. SISTEMA DE DISEÑO
 │    ├── base.css ........................ Variables CSS, Reset, Tipografía
 │    ├── components.css .................. Cards, Botones, Modales, Tablas
 │    ├── themes.css ...................... Dark/Light mode
 │    └── tabs/ ........................... Estilos por sección
 │         ├── overview.css
 │         ├── categories.css
 │         ├── products.css
 │         ├── ...
 │
 ├── js/ .................................. LÓGICA DE APLICACIÓN
 │    ├── app.js .......................... CONTROLADOR PRINCIPAL (State, Init, Events)
 │    ├── parser.js ....................... MOTOR DE PROCESAMIENTO (Regex, OCR, Cats)
 │    ├── utils.js ........................ Helpers (Format, Dates, Math)
 │    ├── charts.js ....................... Wrapper de Chart.js
 │    ├── nutrition.js .................... DB Nutricional & Semáforo
 │    └── tabs/ ........................... CONTROLADORES DE VISTAS (Render Logic)
 │         ├── overview.js ................ KPIs & Resumen
 │         ├── categories.js .............. Gráficos por Categoría
 │         ├── products.js ................ Listado Prod. & Search
 │         ├── prices.js .................. Inflación & Histórico
 │         ├── tickets.js ................. Visualizador CRUD tickets
 │         └── insights.js ................ Mapa de Calor & Patrones
 │
 ├── data/
 │    └── schema.json ..................... Esquema de datos
 │
 └── (Python Scripts) ..................... Herramientas Backend/Dev
      ├── parse_tickets.py
      └── extract_pdfs.py
```

## 🔄 Flujo de Datos (Data Flow)

```ascii
                                    [USUARIO]
                                        │
                         (Arrastra archivos PDF / IMG)
                                        │
                                        ▼
                                 [ index.html ]
                                        │
                                        ▼
                                   [ app.js ]
                                 (Controlador)
                                        │
            ┌───────────────────────────┼───────────────────────────┐
            ▼                           ▼                           ▼
      [ parser.js ]               [ parser.js ]                [ app.js ]
      (Mode: PDF)                 (Mode: OCR)                (Mode: JSON)
            │                           │                           │
            │                     (Tesseract.js)                    │
      (PDF.js Lib)                      │                           │
            │                           ▼                           │
   [Extract Text]              [Extract Text]                       │
            │                           │                           │
            ▼                           ▼                           │
    [Regex Parsing] ◄──────── [VALIDATION MODAL] ◄──────────────────┘
   (categorizeProduct)        (User Confirms Data)
            │                           │
            └───────────┬───────────────┘
                        ▼
                [ ticketsData ]  ──────────►  [ localStorage ]
                (Global Array)                (Persistencia)
                        │
                        ▼
             [ getFilteredTickets() ]
            (Filtros: Año / Tienda)
                        │
                        ▼
    ┌─────────────┬─────────────┬─────────────┐
    ▼             ▼             ▼             ▼
[Overview]   [Products]   [Categories]    [Charts.js]
  (Tab)        (Tab)         (Tab)        (Visuals)
```

## 🧩 Relación de Componentes

```ascii
   ┌──────────────┐         Inicia           ┌──────────────┐
   │   index.html │ ───────────────────────► │   app.js     │
   └──────────────┘                          └──────┬───────┘
          │                                         │
          │ Carga                                   │ Gestiona
          ▼                                         ▼
   ┌──────────────┐                          ┌──────────────┐
   │  css/ & UI   │                          │  State Mng.  │
   └──────────────┘                          └──────┬───────┘
                                                    │
          ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
          │                                         │                                         │
          ▼                                         ▼                                         ▼
   ┌──────────────┐                          ┌──────────────┐                          ┌──────────────┐
   │  parser.js   │ ◄────(Usa)────────────── │   tabs/*.js  │ ────────(Usa)──────────► │  charts.js   │
   └──────────────┘                          └──────────────┘                          └──────────────┘
          │                                         │
          │                                         │ (Consulta)
          ▼                                         ▼
   ┌──────────────┐                          ┌──────────────┐
   │ Nutrition DB │ ◄─────────────────────── │   utils.js   │
   └──────────────┘                          └──────────────┘
```
