/* ============================================
   MERCADONA STATS - TICKET PARSER
   Replica la lógica de parse_tickets.py
   ============================================ */

// Categories configuration (same as Python)
const CATEGORIES_CONFIG = {
  proteinas: {
    name: "Proteínas",
    icon: "🥩",
    color: "#e74c3c",
    keywords: ["PECHUGA", "POLLO", "PAVO", "CERDO", "TERNERA", "BURGER", "JAMÓN", "JAMON", 
              "CECINA", "SALMON", "SALMÓN", "HUEVO", "HUEVOS", "CHULETA", "CONTRAMUSLO",
              "LOMO", "FILETE", "ATÚN", "ATUN", "MERLUZA", "TRUCHA", "DORADA", "LUBINA",
              "MORTADELA", "LONGANIZA", "SALCHICHA", "FRANKFURT", "ALBÓNDIGA", "ALBONDIGA",
              "NUGGETS", "CROQUETAS", "LANGOSTINO", "GAMBA", "CALAMAR", "MEJILLON",
              "SARDINA", "CHIPIRON", "MEDALLON", "RODAJA", "SERRANO", "CORTADO A CUCHILLO",
              "KEBAB", "TIRAS POLLO", "MUSLITO", "CODILLO", "CARRILLERA", "RELLENITO",
              "BROCHETA", "JAMONCITO", "FIAMBRE", "RESERVA TAPAS", "FUET", "COMPANGO"]
  },
  lacteos: {
    name: "Lácteos",
    icon: "🧀",
    color: "#f39c12",
    keywords: ["LECHE", "QUESO", "YOGUR", "KÉFIR", "KEFIR", "COTTAGE", "MOZZARELLA",
              "MANTEQUILLA", "NATA", "BURRATA", "FETA", "GRIEGO", "BÍFIDUS", "BIFIDUS",
              "ALPRO", "SOJA", "+PROT", "PROTEÍNA", "PROTEINA", "PROTEIN"]
  },
  frutas_verduras: {
    name: "Frutas y Verduras",
    icon: "🥬",
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
              "CANÓNIGOS", "ALBAHACA", "PEREJIL", "DÁTIL", "DATIL", "REMOLACHA"]
  },
  bebidas: {
    name: "Bebidas",
    icon: "🥤",
    color: "#3498db",
    keywords: ["COLA", "AGUA", "CERVEZA", "ZUMO", "CAFÉ", "CAFE", "TÓNICA", "TONICA",
              "SPRITE", "LIMONADA", "ISOTONIC", "ENERG", "RADLER", "VINO", "GINEBRA",
              "VERMOUTH", "BEBIDA", "NECTAR", "ANTIOX", "SHOT"]
  },
  congelados: {
    name: "Congelados",
    icon: "🧊",
    color: "#9b59b6",
    keywords: ["PIZZA", "NUGGETS", "LASAÑA", "LASANA", "EMPANADA", "CANELONES", "CANELON",
              "CANELÓN", "WAFFLE", "PATATAS GAJO", "PATATAS HORNO", "TEQUEÑOS", "TEMPURA",
              "FIGURITAS", "CROQUETAS", "ARROZ TRES", "BENTO", "POKE", "CONGELAD",
              "HIELO", "WONTON", "EMPANADO", "ÑOQUIS"]
  },
  despensa: {
    name: "Despensa",
    icon: "🍚",
    color: "#1abc9c",
    keywords: ["ARROZ", "PASTA", "MACARRON", "SPAGHETTI", "PENNE", "HELICES", "PAJARITAS",
              "FIDEOS", "FIDEO", "ACEITE", "TOMATE FRITO", "TOMATE TRITURADO", "SAL",
              "HARINA", "AZUCAR", "AZÚCAR", "LEGUMBRE", "GARBANZO", "LENTEJA", "FABADA",
              "COCIDO", "CALDO", "SOPA", "CREMA DE", "TORTILLA", "PAN ", "PANECILLO",
              "BARRA", "CROISSANT", "NAPOLITANA", "NACHOS", "CRACKERS", "MOSTAZA",
              "MAYONESA", "ALLIOLI", "SALSA", "HUMMUS", "TSATSIKI", "ACEITUNA",
              "MEJILLONES ESCAB", "SARDINAS", "CABALLA", "ALMEJONES", "WAKAME",
              "MIEL", "LEVADURA", "ESPECIAS", "CANELA", "PIMIENTA", "LAUREL"]
  },
  dulces_snacks: {
    name: "Dulces y Snacks",
    icon: "🍫",
    color: "#e67e22",
    keywords: ["CHOCOLATE", "CHOCO", "GALLETA", "CROISSANT", "BERLINA", "BOMBON",
              "TURRON", "TURRÓN", "POLVORON", "POLVORÓN", "GOLOSINA", "GOMINOLA",
              "CARAMELO", "CHICLE", "CACAHUETE", "SNACK", "CHEETOS", "DORITOS",
              "COCKTAIL", "FRUTOS SECOS", "NUEZ", "HELADO", "CONO", "GRANIZADO",
              "PANETTONE", "PANDORO", "MAZAPAN", "MAZAPÁN", "ROSCÓN", "ROSCON",
              "BARRITA", "STICKS", "COOKIES", "DIGESTIVE", "MINIS LECHE", "KIT-KAT",
              "SUPERSANDWICH", "MINISANDWICH", "COULANT", "MOUSSE"]
  },
  higiene_limpieza: {
    name: "Higiene y Limpieza",
    icon: "🧴",
    color: "#95a5a6",
    keywords: ["PAPEL", "JABÓN", "JABON", "DETERGENTE", "GEL", "CHAMPÚ", "CHAMPU",
              "DEO", "DESODORANTE", "CEPILLO", "PASTA DENT", "COLG", "ENJUAGUE",
              "SUAVIZANTE", "LAVAVAJILLAS", "LIMPIA", "ESTROPAJO", "FREGONA",
              "BOLSA BASURA", "ROLLO", "SERVILLETA", "TOALLITA", "PAÑUELO", "PANUELO",
              "BASTONCILLO", "DISCO", "ESPONJA", "FILM", "ALUMINIO", "SPRAY",
              "AMBIENTADOR", "VELA", "PERFUME", "EDP", "COLONIA", "CREMA", "MASCARILLA",
              "MAQUILLAJE", "MASCARA", "LABIAL", "MAQUINILLA", "COMP.", "PAÑAL",
              "GASAS", "T.HIDROALC", "LÁGRIMAS", "PROTECTOR"]
  },
  otros: {
    name: "Otros",
    icon: "📦",
    color: "#7f8c8d",
    keywords: []
  }
};

/**
 * Categorize a product based on its name
 */
function categorizeProduct(name) {
  const nameUpper = name.toUpperCase();
  
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
    
    // Skip PDF filename headers
    if (trimmedBlock.startsWith('📄')) continue;
    
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
      const dateObj = new Date(year, month - 1, day);
      
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
        date: dateObj.toISOString().split('T')[0],
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
  const dateObj = new Date(year, month - 1, day);
  
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
    date: dateObj.toISOString().split('T')[0],
    time: timeStr,
    total: total,
    store: store.name,
    items: items
  };
}

/**
 * Process multiple PDF files and generate tickets data
 */
async function processPDFs(files, progressCallback) {
  const tickets = [];
  const seenIds = new Set();
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
      }
      
      processed++;
      if (progressCallback) {
        progressCallback(processed, files.length, file.name);
      }
    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
    }
  }
  
  // Sort by date
  tickets.sort((a, b) => a.date.localeCompare(b.date));
  
  return tickets;
}

/**
 * Build the complete data structure from tickets
 */
function buildTicketsData(tickets) {
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
      currency: "EUR"
    },
    categories: categories,
    tickets: tickets
  };
}

/**
 * Parse JSON file
 */
async function parseJSONFile(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  return data.tickets || data;
}
