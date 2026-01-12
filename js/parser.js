/* ============================================
   MERCADONA STATS - TICKET PARSER
   Replica la lógica de parse_tickets.py
   ============================================ */

// Parser version - increment when categorization logic changes
const PARSER_VERSION = '2.2.0';

// Storage key for raw PDF texts
const RAW_TEXTS_KEY = 'mercadona_raw_texts';

/**
 * Format a date as YYYY-MM-DD in local timezone (not UTC)
 * Avoids timezone issues with toISOString() which converts to UTC
 */
function formatLocalDate(year, month, day) {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Reglas de prioridad: se evalúan PRIMERO para resolver conflictos
// El orden importa: reglas más específicas primero
const PRIORITY_RULES = [
  // Excepciones específicas PRIMERO (antes de las reglas generales)
  { pattern: /QUESO RALLADO PIZZA|QUESO PIZZA/i, category: 'lacteos' }, // Queso para pizza = lácteos, no congelados
  { pattern: /VELA\s/i, category: 'higiene_limpieza' }, // Velas aromáticas = higiene, no bebidas
  { pattern: /ULTRA WHITE/i, category: 'higiene_limpieza' }, // Dentífrico blanqueador
  { pattern: /SUAVIZANTE/i, category: 'higiene_limpieza' }, // Suavizante ropa
  { pattern: /TURRON|TURRÓN/i, category: 'dulces_snacks' }, // Turrón siempre es dulce

  // Lácteos - productos proteínicos Hacendado primero
  { pattern: /\+\s*PROT|\+ PROTEÍNA|\+PROTEINAS|\+PROT/i, category: 'lacteos' }, // Yogures +proteína
  { pattern: /PROTEÍNAS FLAN|PROTEÍNAS NATURAL|PROTEÍNAS STRACCI|PROTEINA 0%/i, category: 'lacteos' },
  { pattern: /0% CON FRUTAS|0%0%/i, category: 'lacteos' }, // Yogures 0%
  { pattern: /Q\.?\s*LONCHAS|Q\s*SEMI|QUESO/i, category: 'lacteos' }, // Quesos

  // Proteínas
  { pattern: /CRUNCHY CHICKEN|MEDALLÓN|MEDALLON|MUSLO|CONTRA DES|CUARTO CERT|SALAMI|TACOS DE POTA/i, category: 'proteinas' },
  { pattern: /F\.\s*PLANCHA|FILETE/i, category: 'proteinas' }, // Filetes
  { pattern: /B\.GELATINA CARNE/i, category: 'proteinas' }, // Gelatina para perros con carne

  // Congelados - pizzas y productos congelados tienen prioridad sobre sus ingredientes
  { pattern: /\bPIZZA\b/i, category: 'congelados' }, // Solo pizza como palabra completa
  { pattern: /LASAÑA|LASANA/i, category: 'congelados' },
  { pattern: /CANELONES|CANELON|CANELÓN/i, category: 'congelados' },
  { pattern: /NUGGETS/i, category: 'congelados' },
  { pattern: /CROQUETAS/i, category: 'congelados' },
  { pattern: /FIGURITAS/i, category: 'congelados' },
  { pattern: /EMPANADO|EMPANADA/i, category: 'congelados' },
  { pattern: /BENTO/i, category: 'congelados' },
  { pattern: /ARROZ TRES|ARROZ ULTRACONGELADO/i, category: 'congelados' },
  { pattern: /SAN JACOBO/i, category: 'congelados' },
  { pattern: /TEQUEÑOS/i, category: 'congelados' },
  { pattern: /SALTEADO DE VE/i, category: 'congelados' }, // Salteado de verduras congelado

  // Despensa - productos procesados tienen prioridad sobre ingredientes frescos
  { pattern: /TOMATE FRITO|TOM\.FRITO|TOMATE TRITURADO/i, category: 'despensa' },
  { pattern: /CALDO POLLO|CALDO CARNE|CALDO VERDURAS|CALDO COCIDO/i, category: 'despensa' },
  { pattern: /VIRGEN EXTRA|ACEITE GRAN|ACEITE OLIVA/i, category: 'despensa' },
  { pattern: /100% INTEGRAL|INTEGRAL FINO/i, category: 'despensa' },
  { pattern: /AVENA MOLIDA|COPOS DE AVENA/i, category: 'despensa' },
  { pattern: /COUS COUS|TORTIGLIONI|RIGATONI|FUSILLI/i, category: 'despensa' },
  { pattern: /SARDINILLAS|SARDINAS EN|CABALLA EN/i, category: 'despensa' },
  { pattern: /A\. NEGRAS|ACEIT\./i, category: 'despensa' },
  { pattern: /4 ESTACIONES/i, category: 'despensa' }, // Especias 4 estaciones
  { pattern: /ESP VERDE|ESPÁRRAGO/i, category: 'despensa' }, // Espárragos en conserva

  // Bebidas - cerveza y refrescos
  { pattern: /DOBLE MALTA|SIN FILTRAR|CERV\.|\.ÁGUILA|RADLER/i, category: 'bebidas' },
  { pattern: /CC ZERO|COCA.COLA|PEPSI|FANTA/i, category: 'bebidas' },
  { pattern: /TINTO VERANO/i, category: 'bebidas' },
  { pattern: /AGUA MICELAR/i, category: 'higiene_limpieza' }, // No es bebida!
  { pattern: /CÁP\.\s*EXTRA|CÁP\.\s*FORTE/i, category: 'bebidas' }, // Cápsulas de café
  { pattern: /BLANCO DULCE|DULZZE|CAPERUCITA|RIOJA|CRIANZA/i, category: 'bebidas' }, // Vinos
  { pattern: /ESTRELLA/i, category: 'bebidas' }, // Cerveza Estrella
  { pattern: /VARITAS CHAI/i, category: 'bebidas' }, // Te chai
  { pattern: /C\. TOSTADO/i, category: 'bebidas' }, // Café tostado

  // Dulces y snacks - chocolate y dulces tienen prioridad
  { pattern: /CHOCOLATE|CHOCO/i, category: 'dulces_snacks' },
  { pattern: /PANETTONE|PANDORO/i, category: 'dulces_snacks' },
  { pattern: /CACAHUETE/i, category: 'dulces_snacks' },
  { pattern: /CARACOLA/i, category: 'dulces_snacks' },
  { pattern: /XUXES|ROCHER|LINDOR|FERRERO/i, category: 'dulces_snacks' },
  { pattern: /TORTITAS ALMENDRA|TORTITAS ARROZ/i, category: 'dulces_snacks' },
  { pattern: /BOLITA COCO/i, category: 'dulces_snacks' },
  { pattern: /BERLINA/i, category: 'dulces_snacks' },
  { pattern: /BARR PROT|BARRITA PROT/i, category: 'dulces_snacks' }, // Barritas proteína = snacks
  { pattern: /CARAMEL EUCALIPTO/i, category: 'dulces_snacks' }, // Caramelos sin azúcar

  // Frutas y verduras
  { pattern: /CHERRY|T\.CHERRY/i, category: 'frutas_verduras' },
  { pattern: /CEBOLLINO/i, category: 'frutas_verduras' },
  { pattern: /ROMANA \d/i, category: 'frutas_verduras' }, // Lechuga romana
  { pattern: /ENS\s|ENSALADA|TIERNA/i, category: 'frutas_verduras' }, // Ensaladas
  { pattern: /RABANITOS/i, category: 'frutas_verduras' },
  { pattern: /PE AGRIDULCE|REGA RED|ROJA ACIDULCE|ROJA DULCE/i, category: 'frutas_verduras' }, // Pimientos
  { pattern: /R\. SERRANA/i, category: 'frutas_verduras' }, // Ensalada serrana

  // Higiene y limpieza
  { pattern: /B\. BASURA|B\.ENVASES|BOLSAS DOGGYBAG/i, category: 'higiene_limpieza' },
  { pattern: /BOLSAS ZIP/i, category: 'higiene_limpieza' },
  { pattern: /WC POLVO|LIMPIADOR WC/i, category: 'higiene_limpieza' },
  { pattern: /ABSORBEOLOR/i, category: 'higiene_limpieza' },
  { pattern: /T\.INTIMAS|COTTONLIKE/i, category: 'higiene_limpieza' },
  { pattern: /ANTI FRIZZ|CONTORNO OJOS/i, category: 'higiene_limpieza' },
  { pattern: /PILA ALCALINA|COMPRIMIDOS VIT|MAGNESIO EFERV/i, category: 'higiene_limpieza' }, // Pilas y suplementos
  { pattern: /PLATO POINSETTIA|VASO NAVIDAD|RECIPIENTES|COPA CAVA/i, category: 'otros' }, // Menaje/decoración
  { pattern: /BOLSA PLASTICO|BOLSA RAFIA/i, category: 'otros' }, // Bolsas reutilizables

  // Proteínas - carnes y pescados específicos
  { pattern: /CLARA LIQUIDA/i, category: 'proteinas' },
  { pattern: /BURGER BERENJENA|BURGER CALABAZA|BURGER ESPINACAS/i, category: 'frutas_verduras' }, // Burgers vegetales
  { pattern: /TABLA PATE|PATE DE/i, category: 'proteinas' },
  { pattern: /B\.MIXTA|CONCHA FINA/i, category: 'proteinas' }, // Embutidos

  // Bebidas - zumos y bebidas con frutas
  { pattern: /BEBIDA ARANDANOS|BEBIDA DE/i, category: 'bebidas' },
  { pattern: /B\. ESPELT/i, category: 'bebidas' },
  { pattern: /\bMANZANILLA\b/i, category: 'bebidas' }, // Infusión de manzanilla
  { pattern: /LIQ\.\s*\+PRO/i, category: 'bebidas' }, // Bebida líquida +proteína
];

// Categories configuration (same as Python)
const CATEGORIES_CONFIG = {
  proteinas: {
    name: "Proteínas",
    icon: "",
    color: "#e74c3c",
    keywords: ["PECHUGA", "POLLO", "PAVO", "CERDO", "TERNERA", "BURGER", "JAMÓN", "JAMON",
      "CECINA", "SALMON", "SALMÓN", "HUEVO", "HUEVOS", "CHULETA", "CONTRAMUSLO",
      "LOMO", "FILETE", "ATÚN", "ATUN", "MERLUZA", "TRUCHA", "DORADA", "LUBINA",
      "MORTADELA", "LONGANIZA", "SALCHICHA", "FRANKFURT", "ALBÓNDIGA", "ALBONDIGA",
      "LANGOSTINO", "GAMBA", "CALAMAR", "MEJILLON",
      "SARDINA", "CHIPIRON", "MEDALLON", "RODAJA", "SERRANO", "CORTADO A CUCHILLO",
      "KEBAB", "TIRAS POLLO", "MUSLITO", "CODILLO", "CARRILLERA", "RELLENITO",
      "BROCHETA", "JAMONCITO", "FIAMBRE", "RESERVA TAPAS", "FUET", "COMPANGO",
      "BOQUERONES", "ANCHOAS", "BACALAO", "SEPIA", "PULPO", "RAPE"]
  },
  lacteos: {
    name: "Lácteos",
    icon: "",
    color: "#f39c12",
    keywords: ["LECHE", "QUESO", "YOGUR", "KÉFIR", "KEFIR", "COTTAGE", "MOZZARELLA",
      "MANTEQUILLA", "NATA", "BURRATA", "FETA", "GRIEGO", "BÍFIDUS", "BIFIDUS",
      "ALPRO", "SOJA", "CUAJADA", "REQUESÓN", "REQUESON", "SKYR"]
  },
  frutas_verduras: {
    name: "Frutas y Verduras",
    icon: "",
    color: "#27ae60",
    keywords: ["TOMATE", "CEBOLLA", "ZANAHORIA", "PLATANO", "PLÁTANO", "BANANA", "MANGO",
      "KIWI", "MANZANA", "PERA", "NARANJA", "MANDARINA", "LIMON", "LIMÓN",
      "AGUACATE", "PEPINO", "CALABACIN", "CALABACÍN", "ESPINACA", "RUCULA",
      "LECHUGA", "BROTES", "ENSALADA", "APIO", "PIMIENTO", "PUERRO",
      "COLIFLOR", "BROCOLI", "BRÓCOLI", "PATATA", "BATATA", "SETA", "CHAMPIÑON",
      "AJO", "FRESÓN", "FRESON", "FRAMBUESA", "ARÁNDANO", "ARANDANO", "CEREZA",
      "CIRUELA", "MELON", "MELÓN", "SANDÍA", "SANDIA", "PIÑA", "BREVAS",
      "UVA", "LIMA", "GUACAMOLE", "GAZPACHO", "SALMOREJO", "CALABAZA",
      "ESPARRAGO", "ESPÁRRAGO", "GUISANTES", "JUDÍA", "JUDIA", "ICEBERG",
      "CANÓNIGOS", "ALBAHACA", "PEREJIL", "DÁTIL", "DATIL", "REMOLACHA",
      "BERENJENA", "CASTAÑAS", "ARREGLO PUCHERO", "PUERRO", "COL ", "REPOLLO",
      "NECTARINA", "MELOCOTÓN", "MELOCOTON", "PARAGUAYO", "GRANADA", "PAPAYA"]
  },
  bebidas: {
    name: "Bebidas",
    icon: "",
    color: "#3498db",
    keywords: ["COLA", "AGUA", "CERVEZA", "ZUMO", "CAFÉ", "CAFE", "TÓNICA", "TONICA",
      "SPRITE", "LIMONADA", "ISOTONIC", "ENERG", "RADLER", "VINO", "GINEBRA",
      "VERMOUTH", "BEBIDA", "NECTAR", "ANTIOX", "SHOT", "CAVA", "CHAMPAGNE",
      "SIDRA", "WHISKY", "RON ", "VODKA", "LICOR", "SANGRÍA", "SANGRIA",
      "TÉ ", "TE ", "INFUSION", "MANZANILLA", "POLEO"]
  },
  congelados: {
    name: "Congelados",
    icon: "",
    color: "#9b59b6",
    keywords: ["PIZZA", "NUGGETS", "LASAÑA", "LASANA", "EMPANADA", "CANELONES", "CANELON",
      "CANELÓN", "WAFFLE", "PATATAS GAJO", "PATATAS HORNO", "TEQUEÑOS", "TEMPURA",
      "FIGURITAS", "CROQUETAS", "ARROZ TRES", "BENTO", "POKE", "CONGELAD",
      "HIELO", "WONTON", "EMPANADO", "ÑOQUIS", "SAN JACOBO", "GYOZAS"]
  },
  despensa: {
    name: "Despensa",
    icon: "",
    color: "#1abc9c",
    keywords: ["ARROZ", "PASTA", "MACARRON", "SPAGHETTI", "PENNE", "HELICES", "PAJARITAS",
      "FIDEOS", "FIDEO", "ACEITE", "TOMATE FRITO", "TOMATE TRITURADO", "SAL ",
      "HARINA", "AZUCAR", "AZÚCAR", "LEGUMBRE", "GARBANZO", "LENTEJA", "FABADA",
      "COCIDO", "CALDO", "SOPA", "CREMA DE", "TORTILLA", "PAN ", "PANECILLO",
      "BARRA", "NAPOLITANA", "NACHOS", "CRACKERS", "MOSTAZA",
      "MAYONESA", "ALLIOLI", "SALSA", "HUMMUS", "TSATSIKI", "ACEITUNA",
      "MEJILLONES ESCAB", "MEJILLÓN ESCAB", "MEJIL.", "SARDINAS", "CABALLA",
      "ALMEJONES", "WAKAME", "MIEL", "LEVADURA", "ESPECIAS", "CANELA",
      "PIMIENTA", "LAUREL", "INTEGRAL", "AVENA", "QUINOA", "COUS", "SEMOLA",
      "TAPIOCA", "VINAGRE", "PIMENTON", "OREGANO", "TOMILLO", "ROMERO", "CURRY",
      "BICARBONATO", "MAIZENA", "PAN RALLADO", "RELLENO", "IMPULSOR", "ROYAL",
      "PREPARADO", "FIDEUA", "FUMET", "HIERBAS", "CLAVO", "LINO", "CHÍA",
      "MAIZ DULCE", "MACEDONIA", "PAISANA", "PAELLA", "CREPES", "PULGUITAS",
      "ENCURTIDOS", "AROMA", "BANDERILLA", "GILDA", "HUMUS"]
  },
  dulces_snacks: {
    name: "Dulces y Snacks",
    icon: "",
    color: "#e67e22",
    keywords: ["CHOCOLATE", "CHOCO", "GALLETA", "GALL", "BOMBON",
      "TURRON", "TURRÓN", "POLVORON", "POLVORÓN", "GOLOSINA", "GOMINOLA",
      "CARAMELO", "CHICLE", "CACAHUETE", "SNACK", "CHEETOS", "DORITOS",
      "COCKTAIL", "FRUTOS SECOS", "FRUTOS ROJOS", "NUEZ", "HELADO", "CONO",
      "GRANIZADO", "PANETTONE", "PANDORO", "MAZAPAN", "MAZAPÁN", "ROSCÓN",
      "ROSCON", "BARRITA", "STICKS", "COOKIES", "DIGESTIVE", "MINIS LECHE",
      "KIT-KAT", "SUPERSANDWICH", "MINISANDWICH", "COULANT", "MOUSSE", "XUXES",
      "ROCHER", "LINDOR", "FERRERO", "KINDER", "OREO", "CHIPS AHOY",
      "PALMERA", "CROISSANT", "BERLINA", "ENSAIMADA", "DONUT", "MAGDALENA",
      "PELADILLA", "PERLAS", "DOCHI", "CHEESECAKE", "MINI BOMB", "FUSSION",
      "DELIZZE", "NEGRO 72%", "NEGRO 99%", "DIGEST", "MINI SALADAS"]
  },
  higiene_limpieza: {
    name: "Higiene y Limpieza",
    icon: "",
    color: "#95a5a6",
    keywords: ["PAPEL", "JABÓN", "JABON", "DETERGENTE", "DET ", "GEL BAÑO", "CHAMPÚ",
      "CHAMPU", "DEO", "DESODORANTE", "CEPILLO", "PASTA DENT", "COLG",
      "ENJUAGUE", "SUAVIZANTE", "LAVAVAJILLAS", "LIMPIA", "ESTROPAJO",
      "FREGONA", "FRIEGA", "BOLSA BASURA", "B. BASURA", "B.ENVASES", "ROLLO",
      "SERVILLETA", "TOALLITA", "PAÑUELO", "PANUELO", "BASTONCILLO", "DISCO",
      "ESPONJA", "FILM", "ALUMINIO", "SPRAY", "AMBIENTADOR", "AMB.", "VELA",
      "PERFUME", "EDP", "COLONIA", "CREMA", "MASCARILLA", "MAQUILLAJE",
      "MASCARA", "LABIAL", "MAQUINILLA", "COMP.", "PAÑAL", "GASAS",
      "T.HIDROALC", "LÁGRIMAS", "PROTECTOR", "BOLSAS ZIP", "WC ",
      "ABSORBEOLOR", "COTTONLIKE", "T.INTIMAS", "COMPRESAS", "TAMPONES",
      "MULTIUSOS", "PASTILLA LEJIA", "CÁPSULA ROPA", "ESPUMA RIZOS",
      "HIALURONICO", "INSTANT COND", "REFILL", "PLUMERO", "POSAVAJILLAS",
      "SUERO FISIO", "ESTERIL", "GEL HIAL", "P. COLORCOR", "STICK DENTAL",
      "T.MULTI", "MULTI.LIM"]
  },
  otros: {
    name: "Otros",
    icon: "",
    color: "#7f8c8d",
    keywords: []
  }
};

/**
 * Categorize a product based on its name
 * Uses priority rules first, then keyword matching
 */
function categorizeProduct(name) {
  const nameUpper = name.toUpperCase();

  // PASO 1: Evaluar reglas de prioridad primero (patrones específicos)
  for (const rule of PRIORITY_RULES) {
    if (rule.pattern.test(nameUpper)) {
      return rule.category;
    }
  }

  // PASO 2: Buscar coincidencia por keywords en orden de categorías
  for (const [catKey, catInfo] of Object.entries(CATEGORIES_CONFIG)) {
    if (catKey === 'otros') continue;

    for (const keyword of catInfo.keywords) {
      if (nameUpper.includes(keyword.toUpperCase())) {
        return catKey;
      }
    }
  }

  return 'otros';
}

/**
 * Parse store information from ticket header
 */
function parseStoreInfo(headerLines) {
  const store = { name: "Mercadona", city: "" };

  for (const line of headerLines) {
    const lineUpper = line.toUpperCase();
    if (lineUpper.includes("GALAPAGAR")) {
      store.name = "Mercadona Galapagar";
      store.city = "GALAPAGAR";
      break;
    } else if (lineUpper.includes("LOS VASCOS") || (lineUpper.includes("MADRID") && !lineUpper.includes("COMUNIDAD"))) {
      store.name = "Mercadona Madrid Los Vascos";
      store.city = "MADRID";
      break;
    } else if (lineUpper.includes("POZUELO")) {
      store.name = "Mercadona Pozuelo";
      store.city = "POZUELO DE ALARCON";
      break;
    } else if (lineUpper.includes("TORRELODONES")) {
      store.name = "Mercadona Torrelodones";
      store.city = "TORRELODONES";
      break;
    }
  }

  return store;
}

/**
 * Parse tickets from text content
 */
function parseTicketsFromText(text) {
  const tickets = [];
  const seenIds = new Set();

  // Split by ticket separator (10+ equal signs)
  const ticketBlocks = text.split(/={10,}/);

  for (const block of ticketBlocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;

    // Skip PDF filename headers (may start with emoji or text)
    if (trimmedBlock.startsWith('PDF:') || /^[\p{Emoji}]/u.test(trimmedBlock.charAt(0))) continue;

    const lines = trimmedBlock.split('\n');

    // Find date/time and invoice number
    const dateMatch = trimmedBlock.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/);
    const invoiceMatch = trimmedBlock.match(/FACTURA SIMPLIFICADA:\s*(\S+)/);
    const totalMatch = trimmedBlock.match(/TOTAL \(€\)\s*([\d,]+)/);

    if (dateMatch && invoiceMatch && totalMatch) {
      // Parse date
      const dateStr = dateMatch[1];
      const timeStr = dateMatch[2];
      const [day, month, year] = dateStr.split('/');
      const formattedDate = formatLocalDate(year, month, day);

      const invoiceId = invoiceMatch[1];

      // Skip duplicates
      if (seenIds.has(invoiceId)) continue;
      seenIds.add(invoiceId);

      const totalStr = totalMatch[1].replace(',', '.');
      const total = parseFloat(totalStr);

      // Get store info
      const store = parseStoreInfo(lines.slice(0, 10));

      // Parse items
      const items = [];
      let inItems = false;

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.includes('Descripción') && trimmedLine.includes('Importe')) {
          inItems = true;
          continue;
        }

        if (inItems) {
          // Stop at TOTAL line
          if (trimmedLine.startsWith('TOTAL (€)')) break;

          // Check for weighted item continuation
          const weightMatch = trimmedLine.match(/([\d,]+)\s*kg\s*([\d,]+)\s*€\/kg\s*([\d,]+)/);
          if (weightMatch && items.length > 0) {
            const weight = parseFloat(weightMatch[1].replace(',', '.'));
            const finalPrice = parseFloat(weightMatch[3].replace(',', '.'));
            items[items.length - 1].price = finalPrice;
            items[items.length - 1].weight = weight;
            continue;
          }

          // Regular item line: "1 PRODUCT NAME 1,25" or "2 PRODUCT NAME 1,25 2,50"
          const itemMatch = trimmedLine.match(/^(\d+)\s+(.+?)\s+([\d,]+)(?:\s+([\d,]+))?$/);
          if (itemMatch) {
            const qty = parseInt(itemMatch[1]);
            let name = itemMatch[2].trim();

            let unitPrice, totalPrice;
            if (itemMatch[4]) {
              unitPrice = parseFloat(itemMatch[3].replace(',', '.'));
              totalPrice = parseFloat(itemMatch[4].replace(',', '.'));
            } else {
              totalPrice = parseFloat(itemMatch[3].replace(',', '.'));
              unitPrice = qty > 0 ? totalPrice / qty : totalPrice;
            }

            // Clean up name
            name = name.replace(/\s+/g, ' ').trim();

            // Skip non-product lines
            const skipWords = ['TARJETA', 'IVA', 'BASE', 'CUOTA', 'ENTREGA', 'PARKING'];
            if (name && !skipWords.some(skip => name.toUpperCase().includes(skip))) {
              items.push({
                name: name,
                price: Math.round(totalPrice * 100) / 100,
                quantity: qty,
                unitPrice: Math.round(unitPrice * 100) / 100,
                category: categorizeProduct(name)
              });
            }
          }
        }
      }

      const ticket = {
        id: invoiceId,
        date: formattedDate,
        time: timeStr,
        total: total,
        store: store.name,
        items: items
      };

      tickets.push(ticket);
    }
  }

  // Sort by date
  tickets.sort((a, b) => a.date.localeCompare(b.date));

  return tickets;
}

/**
 * Extract text from PDF using pdf.js
 */
async function extractTextFromPDF(pdfData) {
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdf = await loadingTask.promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Try to preserve line structure
    const items = textContent.items;
    let lastY = null;
    let lineText = '';

    for (const item of items) {
      // Check if we're on a new line (Y position changed significantly)
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
        fullText += lineText.trim() + '\n';
        lineText = '';
      }
      lineText += item.str + ' ';
      lastY = item.transform[5];
    }

    if (lineText.trim()) {
      fullText += lineText.trim() + '\n';
    }

    fullText += '\n';
  }

  return fullText;
}

/**
 * Parse a single PDF's text into a ticket
 */
function parseSinglePDFText(text, filename) {
  // Try to find key elements
  const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/);
  const invoiceMatch = text.match(/FACTURA\s*SIMPLIFICADA[:\s]*(\d+-\d+-\d+)/i);
  const totalMatch = text.match(/TOTAL\s*\(?€?\)?\s*([\d,\.]+)/i);

  if (!dateMatch || !totalMatch) {
    console.log(`Could not parse ${filename}: missing date or total`);
    return null;
  }

  // Parse date
  const dateStr = dateMatch[1];
  const timeStr = dateMatch[2];
  const [day, month, year] = dateStr.split('/');
  const formattedDate = formatLocalDate(year, month, day);

  // Invoice ID
  let invoiceId = invoiceMatch ? invoiceMatch[1] : `PDF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Total
  const totalStr = totalMatch[1].replace(',', '.');
  const total = parseFloat(totalStr);

  // Store info
  const store = parseStoreInfo(text.split('\n').slice(0, 15));

  // Parse items - look for the pattern in Mercadona tickets
  const items = [];
  const lines = text.split('\n');

  let inItems = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Start after "Descripción" header
    if (line.includes('Descripción') || line.includes('Descripcion')) {
      inItems = true;
      continue;
    }

    // Stop at TOTAL
    if (inItems && /^TOTAL\s*\(?€?\)?/i.test(line)) {
      break;
    }

    if (inItems) {
      // Skip empty lines and payment/IVA lines
      if (!line || /^(TARJETA|IVA|BASE|CUOTA|ENTREGA|PARKING|N\.C:|AID:|ARC:|Verificado|Importe:|SE ADMITEN)/i.test(line)) {
        continue;
      }

      // Check for weighted item line (X,XXX kg X,XX €/kg X,XX)
      const weightMatch = line.match(/([\d,]+)\s*kg\s*([\d,]+)\s*€\/kg\s*([\d,]+)/);
      if (weightMatch && items.length > 0) {
        const weight = parseFloat(weightMatch[1].replace(',', '.'));
        const finalPrice = parseFloat(weightMatch[3].replace(',', '.'));
        items[items.length - 1].price = finalPrice;
        items[items.length - 1].weight = weight;
        continue;
      }

      // Try different patterns for item lines
      // Pattern 1: "1 PRODUCT NAME 1,25" or "2 PRODUCT NAME 1,25 2,50"
      let itemMatch = line.match(/^(\d+)\s+(.+?)\s+([\d,]+)(?:\s+([\d,]+))?$/);

      // Pattern 2: PDF.js might merge numbers differently "1 PRODUCT NAME1,25"
      if (!itemMatch) {
        itemMatch = line.match(/^(\d+)\s+(.+?)([\d,]+)$/);
        if (itemMatch) {
          // Check if there's a price at the end of product name
          const namePrice = itemMatch[2].match(/^(.+?)\s*([\d,]+)\s*$/);
          if (namePrice) {
            itemMatch = [null, itemMatch[1], namePrice[1], namePrice[2], itemMatch[3]];
          }
        }
      }

      if (itemMatch) {
        const qty = parseInt(itemMatch[1]);
        let name = itemMatch[2].trim();

        // Clean common OCR artifacts
        name = name.replace(/^[`'"]|[`'"]$/g, '').trim();

        let unitPrice, totalPrice;
        if (itemMatch[4]) {
          unitPrice = parseFloat(itemMatch[3].replace(',', '.'));
          totalPrice = parseFloat(itemMatch[4].replace(',', '.'));
        } else {
          totalPrice = parseFloat(itemMatch[3].replace(',', '.'));
          unitPrice = qty > 0 ? totalPrice / qty : totalPrice;
        }

        // Validate price
        if (isNaN(totalPrice) || totalPrice <= 0) continue;

        // Skip non-product lines
        const skipWords = ['TARJETA', 'IVA', 'BASE', 'CUOTA', 'ENTREGA', 'PARKING', 'TOTAL'];
        if (name && name.length > 1 && !skipWords.some(skip => name.toUpperCase().includes(skip))) {
          items.push({
            name: name,
            price: Math.round(totalPrice * 100) / 100,
            quantity: qty,
            unitPrice: Math.round(unitPrice * 100) / 100,
            category: categorizeProduct(name)
          });
        }
      }
    }
  }

  if (items.length === 0) {
    console.log(`No items found in ${filename}`);
    return null;
  }

  return {
    id: invoiceId,
    date: formattedDate,
    time: timeStr,
    total: total,
    store: store.name,
    items: items
  };
}

/**
 * Save raw texts to localStorage for future re-parsing
 */
function saveRawTexts(rawTexts) {
  try {
    const existing = getRawTexts();
    // Merge with existing, using invoice ID as key
    const merged = { ...existing, ...rawTexts };
    localStorage.setItem(RAW_TEXTS_KEY, JSON.stringify(merged));
    console.log(`Saved ${Object.keys(rawTexts).length} raw texts (total: ${Object.keys(merged).length})`);
    return true;
  } catch (e) {
    console.warn('Could not save raw texts to localStorage:', e.message);
    return false;
  }
}

/**
 * Get raw texts from localStorage
 */
function getRawTexts() {
  try {
    const saved = localStorage.getItem(RAW_TEXTS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Clear raw texts from localStorage
 */
function clearRawTexts() {
  localStorage.removeItem(RAW_TEXTS_KEY);
}

/**
 * Remove a specific raw text by invoice ID
 */
function removeRawText(invoiceId) {
  try {
    const existing = getRawTexts();
    if (existing[invoiceId]) {
      delete existing[invoiceId];
      localStorage.setItem(RAW_TEXTS_KEY, JSON.stringify(existing));
      console.log(`Removed raw text for ${invoiceId}`);
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Could not remove raw text:', e.message);
    return false;
  }
}

/**
 * Re-parse tickets from stored raw texts
 */
function reparseFromRawTexts() {
  const rawTexts = getRawTexts();
  const entries = Object.entries(rawTexts);

  if (entries.length === 0) {
    console.log('No raw texts available for re-parsing');
    return null;
  }

  console.log(`Re-parsing ${entries.length} tickets from raw texts...`);

  const tickets = [];
  const seenIds = new Set();

  for (const [id, text] of entries) {
    try {
      const ticket = parseSinglePDFText(text, id);
      if (ticket && !seenIds.has(ticket.id)) {
        seenIds.add(ticket.id);
        tickets.push(ticket);
      }
    } catch (error) {
      console.error(`Error re-parsing ${id}:`, error);
    }
  }

  // Sort by date
  tickets.sort((a, b) => a.date.localeCompare(b.date));

  console.log(`Re-parsed ${tickets.length} tickets successfully`);
  return tickets;
}

/**
 * Process multiple PDF files and generate tickets data
 */
async function processPDFs(files, progressCallback) {
  const tickets = [];
  const seenIds = new Set();
  const rawTexts = {}; // Store raw texts for later re-parsing
  let processed = 0;

  for (const file of files) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const text = await extractTextFromPDF(new Uint8Array(arrayBuffer));

      // Try to parse as single PDF first
      const ticket = parseSinglePDFText(text, file.name);

      if (ticket && !seenIds.has(ticket.id)) {
        seenIds.add(ticket.id);
        tickets.push(ticket);
        // Store raw text using invoice ID as key
        rawTexts[ticket.id] = text;
      }

      processed++;
      if (progressCallback) {
        progressCallback(processed, files.length, file.name);
      }
    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
    }
  }

  // Save raw texts for future re-parsing
  if (Object.keys(rawTexts).length > 0) {
    saveRawTexts(rawTexts);
  }

  // Sort by date
  tickets.sort((a, b) => a.date.localeCompare(b.date));

  return tickets;
}

/**
 * Build the complete data structure from tickets
 */
function buildTicketsData(tickets, mapping = {}) {
  const categories = {};
  for (const [key, value] of Object.entries(CATEGORIES_CONFIG)) {
    categories[key] = {
      name: value.name,
      icon: value.icon,
      color: value.color
    };
  }

  return {
    meta: {
      lastUpdated: new Date().toISOString().split('T')[0],
      totalTickets: tickets.length,
      currency: "EUR",
      parserVersion: PARSER_VERSION
    },
    categories: categories,
    productMapping: mapping,
    tickets: tickets
  };
}

/**
 * Migrate tickets data from older parser versions
 * First tries to re-parse from raw texts, then falls back to re-categorization
 */
function migrateTicketsData(data) {
  const currentVersion = data?.meta?.parserVersion;

  // Assume latest version if matches, BUT ensure productMapping exists
  if (currentVersion === PARSER_VERSION) {
    if (!data.productMapping) {
      data.productMapping = {}; // Backward compatibility fix
    }
    return { data, migrated: false };
  }

  console.log(`Migrating tickets from version ${currentVersion || 'unknown'} to ${PARSER_VERSION}`);

  // Preserve existing mapping if available
  const existingMapping = data.productMapping || {};

  // Try to re-parse from raw texts first (full re-parse)
  const rawTexts = getRawTexts();
  if (Object.keys(rawTexts).length > 0) {
    console.log('Raw texts available, performing full re-parse...');
    const reparsedTickets = reparseFromRawTexts();

    if (reparsedTickets && reparsedTickets.length > 0) {
      // Pass existing mapping to buildTicketsData so we don't lose it
      const migratedData = buildTicketsData(reparsedTickets, existingMapping);
      console.log(`Full re-parse complete: ${reparsedTickets.length} tickets updated to parser v${PARSER_VERSION}`);
      return { data: migratedData, migrated: true };
    }
  }

  // Fallback: just re-categorize existing products
  console.log('No raw texts available, re-categorizing products only...');
  const tickets = data.tickets || data;

  // Re-categorize all products
  for (const ticket of tickets) {
    for (const item of ticket.items) {
      item.category = categorizeProduct(item.name);
    }
  }

  // Rebuild data structure with updated version
  const migratedData = buildTicketsData(tickets, existingMapping);

  console.log(`Migration complete: ${tickets.length} tickets updated to parser v${PARSER_VERSION}`);

  return { data: migratedData, migrated: true };
}

/**
 * Extract text from Image using Tesseract.js
 */
async function extractTextFromImage(file) {
  try {
    const { data: { text } } = await Tesseract.recognize(
      file,
      'spa', // Spanish language
      { logger: m => console.log(m) } // Optional logger
    );
    return text;
  } catch (error) {
    console.error("OCR Error:", error);
    throw new Error("Error al leer la imagen: " + error.message);
  }
}

/**
 * Parse a Lidl ticket text
 */
/**
 * Helper to sanitize OCR dates
 * Tries to find a valid date in the past/present
 */
function sanitizeOCRDate(text) {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Regex for multiple formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD.MM.YY
  // Captured groups: 1=Day, 2=Month, 3=Year
  const datePatterns = [
    /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/, // DD/MM/YYYY
    /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2})\b/ // DD/MM/YY
  ];

  for (const pattern of datePatterns) {
    const matches = text.matchAll(new RegExp(pattern, 'g'));
    for (const match of matches) {
      let d = parseInt(match[1]);
      let m = parseInt(match[2]);
      let y = parseInt(match[3]);

      // Fix 2-digit year
      if (y < 100) y += 2000;

      // Sanity check
      if (m < 1 || m > 12) continue;
      if (d < 1 || d > 31) continue;
      if (y < 2000 || y > currentYear + 1) continue; // Allow +1 just in case of timezone/near year end, but generally strict

      // If date is in future (significantly), reject
      const checkDate = new Date(y, m - 1, d);
      if (checkDate > new Date(now.getTime() + 86400000)) continue; // Allow 1 day margin

      return formatLocalDate(y, m, d);
    }
  }

  return null; // No valid date found
}

/**
 * Helper to sanitize OCR prices
 * Fixes common issues like missing decimal points (600 -> 6.00)
 */
function sanitizeOCRPrice(rawPrice) {
  if (isNaN(rawPrice) || rawPrice <= 0) return 0;

  // Heuristic: Grocery items are rarely > 100€
  // If price > 50 and looks like an integer, likely missing decimal
  if (rawPrice > 50 && Number.isInteger(rawPrice)) {
    // Try dividing by 100 (e.g. 145 -> 1.45)
    return rawPrice / 100;
  }

  // Heuristic: If extremely high (e.g. > 200) even with decimal
  if (rawPrice > 200) {
    // Could be missing decimal in a different way or noise
    // Try to make it reasonable (e.g. < 20)
    if (rawPrice / 100 < 20) return rawPrice / 100;
    if (rawPrice / 10 < 20) return rawPrice / 10;
  }

  return rawPrice;
}

/**
 * Parse a Lidl ticket text (Improved for OCR)
 */
function parseLidlTicket(text, filename) {
  const lines = text.split('\n');

  // 1. Find Date (Improved)
  // Look for "Fecha" keyword first to be more accurate
  let dateStr = sanitizeOCRDate(text);

  if (!dateStr) {
    console.warn(`No valid date found in ${filename}, using today's date.`);
    dateStr = new Date().toISOString().split('T')[0];
  }

  let timeMatch = text.match(/(\d{2}:\d{2})/);
  let timeStr = timeMatch ? timeMatch[1] : "00:00";

  // 2. Find Total
  let total = 0;
  // Look for TOTAL line more flexibly
  // "TOTAL" followed by numbers, possibly with EUR/€, allows spaces inside number '23, 45'
  const totalRegex = /TOTAL\s*(?:A PAGAR)?\s*(?:EUR|€)?.*?([\d\.,]+(?:[\s\.,]\d{2})?)/i;
  const totalMatch = text.match(totalRegex);

  if (totalMatch) {
    // Clean up total string (remove internal spaces, fix dots/commas)
    let cleanTotal = totalMatch[1].replace(/\s/g, '').replace(',', '.');
    // If multiple dots, only keep last one? Standardize.
    total = parseFloat(cleanTotal);
    total = sanitizeOCRPrice(total);
  }

  // 3. Parse Items
  const items = [];

  // Lidl items: Description ... Price [TaxCode]
  // We scan all lines.
  const itemRegex = /^(.+?)\s+(\d+[\.,]\d{2}|\d+)\s*[AB]?$/;
  // Captures: 1=Name, 2=Price. Expects price to be at end of line.

  // More cleanup for OCR text
  const skipPatterns = [/SUBTOTAL/i, /TOTAL/i, /ENTREGADO/i, /CAMBIO/i, /TARJETA/i, /LIDL/i, /TIENDA/i];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (line.length < 3) continue;
    if (skipPatterns.some(p => p.test(line))) continue;

    // Try detecting price at end of line
    // Look for number at end
    const lastNumMatch = line.match(/(\d+[\.,]?\d*)\s*[AB]?$/);
    if (lastNumMatch) {
      const rawPriceStr = lastNumMatch[1];
      const rawPrice = parseFloat(rawPriceStr.replace(',', '.'));

      // Sanity check price
      const price = sanitizeOCRPrice(rawPrice);

      // Extract name part (everything before the price)
      let name = line.substring(0, line.lastIndexOf(rawPriceStr)).trim();

      // Cleanup name
      name = name.replace(/[\d\.]+$/, '').trim(); // Remove trailing numbers/dots
      if (name.length < 2) continue; // Too short

      // If price is reasonable, add item
      if (price > 0 && price < 200) {
        items.push({
          name: name,
          price: price,
          quantity: 1,
          unitPrice: price,
          category: categorizeProduct(name)
        });
      }
    }
  }

  // If no total found but we have items, sum them up
  if (total === 0 && items.length > 0) {
    total = items.reduce((sum, item) => sum + item.price, 0);
  }

  // Generate ID based on filename hash to allow re-importing same file correctly
  // Simple hash of filename + date
  const cleanFilename = filename.replace(/[^a-z0-9]/gi, '');
  const invoiceId = `LIDL-${dateStr.replace(/-/g, '')}-${Math.abs(cleanFilename.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0))}`;

  return {
    id: invoiceId,
    date: dateStr,
    time: timeStr,
    total: Math.round(total * 100) / 100,
    store: "Lidl",
    items: items
  };
}

/**
 * Process multiple Image files
 */
async function processImages(files, progressCallback) {
  const tickets = [];
  let processed = 0;

  for (const file of files) {
    try {
      if (progressCallback) {
        progressCallback(processed, files.length, file.name + " (Leyendo...)");
      }

      const text = await extractTextFromImage(file);

      if (progressCallback) {
        progressCallback(processed, files.length, file.name + " (Procesando...)");
      }

      // Determine if it's Lidl or Mercadona based on text content
      let ticket;
      if (text.toUpperCase().includes("MERCADONA")) {
        // Reuse Mercadona logic if someone uploads a photo of a Mercadona ticket
        ticket = parseSinglePDFText(text, file.name);
      } else {
        // Assume Lidl or generic
        ticket = parseLidlTicket(text, file.name);
      }

      if (ticket) {
        tickets.push(ticket);
      }

      processed++;
      if (progressCallback) {
        progressCallback(processed, files.length, file.name);
      }

    } catch (error) {
      console.error(`Error processing image ${file.name}:`, error);
    }
  }

  return tickets;
}

/**
 * Parse JSON file
 */
async function parseJSONFile(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  return data.tickets || data;
}
