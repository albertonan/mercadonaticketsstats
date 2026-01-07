#!/usr/bin/env python3
"""
Parse tickets_mercadona.txt and generate complete tickets.json
"""

import re
import json
from datetime import datetime

# Categories configuration
CATEGORIES = {
    "proteinas": {
        "name": "Proteínas",
        "icon": "🥩",
        "color": "#e74c3c",
        "keywords": ["PECHUGA", "POLLO", "PAVO", "CERDO", "TERNERA", "BURGER", "JAMÓN", "JAMON", 
                    "CECINA", "SALMON", "SALMÓN", "HUEVO", "HUEVOS", "CHULETA", "CONTRAMUSLO",
                    "LOMO", "FILETE", "ATÚN", "ATUN", "MERLUZA", "TRUCHA", "DORADA", "LUBINA",
                    "MORTADELA", "LONGANIZA", "SALCHICHA", "FRANKFURT", "ALBÓNDIGA", "ALBONDIGA",
                    "NUGGETS", "CROQUETAS", "LANGOSTINO", "GAMBA", "CALAMAR", "MEJILLON",
                    "SARDINA", "CHIPIRON", "MEDALLON", "RODAJA", "SERRANO", "CORTADO A CUCHILLO",
                    "KEBAB", "TIRAS POLLO", "MUSLITO", "CODILLO", "CARRILLERA", "RELLENITO",
                    "BROCHETA", "JAMONCITO", "FIAMBRE", "RESERVA TAPAS", "FUET", "COMPANGO"]
    },
    "lacteos": {
        "name": "Lácteos",
        "icon": "🧀",
        "color": "#f39c12",
        "keywords": ["LECHE", "QUESO", "YOGUR", "KÉFIR", "KEFIR", "COTTAGE", "MOZZARELLA",
                    "MANTEQUILLA", "NATA", "BURRATA", "FETA", "GRIEGO", "BÍFIDUS", "BIFIDUS",
                    "ALPRO", "SOJA", "+PROT", "PROTEÍNA", "PROTEINA", "PROTEIN"]
    },
    "frutas_verduras": {
        "name": "Frutas y Verduras",
        "icon": "🥬",
        "color": "#27ae60",
        "keywords": ["TOMATE", "CEBOLLA", "ZANAHORIA", "PLATANO", "PLÁTANO", "BANANA", "MANGO",
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
    "bebidas": {
        "name": "Bebidas",
        "icon": "🥤",
        "color": "#3498db",
        "keywords": ["COLA", "AGUA", "CERVEZA", "ZUMO", "CAFÉ", "CAFE", "TÓNICA", "TONICA",
                    "SPRITE", "LIMONADA", "ISOTONIC", "ENERG", "RADLER", "VINO", "GINEBRA",
                    "VERMOUTH", "BEBIDA", "NECTAR", "ANTIOX", "SHOT"]
    },
    "congelados": {
        "name": "Congelados",
        "icon": "🧊",
        "color": "#9b59b6",
        "keywords": ["PIZZA", "NUGGETS", "LASAÑA", "LASANA", "EMPANADA", "CANELONES", "CANELON",
                    "CANELÓN", "WAFFLE", "PATATAS GAJO", "PATATAS HORNO", "TEQUEÑOS", "TEMPURA",
                    "FIGURITAS", "CROQUETAS", "ARROZ TRES", "BENTO", "POKE", "CONGELAD",
                    "HIELO", "WONTON", "EMPANADO", "ÑOQUIS"]
    },
    "despensa": {
        "name": "Despensa",
        "icon": "🍚",
        "color": "#1abc9c",
        "keywords": ["ARROZ", "PASTA", "MACARRON", "SPAGHETTI", "PENNE", "HELICES", "PAJARITAS",
                    "FIDEOS", "FIDEO", "ACEITE", "TOMATE FRITO", "TOMATE TRITURADO", "SAL",
                    "HARINA", "AZUCAR", "AZÚCAR", "LEGUMBRE", "GARBANZO", "LENTEJA", "FABADA",
                    "COCIDO", "CALDO", "SOPA", "CREMA DE", "TORTILLA", "PAN ", "PANECILLO",
                    "BARRA", "CROISSANT", "NAPOLITANA", "NACHOS", "CRACKERS", "MOSTAZA",
                    "MAYONESA", "ALLIOLI", "SALSA", "HUMMUS", "TSATSIKI", "ACEITUNA",
                    "MEJILLONES ESCAB", "SARDINAS", "CABALLA", "ALMEJONES", "WAKAME",
                    "MIEL", "LEVADURA", "ESPECIAS", "CANELA", "PIMIENTA", "LAUREL"]
    },
    "dulces_snacks": {
        "name": "Dulces y Snacks",
        "icon": "🍫",
        "color": "#e67e22",
        "keywords": ["CHOCOLATE", "CHOCO", "GALLETA", "CROISSANT", "BERLINA", "BOMBON",
                    "TURRON", "TURRÓN", "POLVORON", "POLVORÓN", "GOLOSINA", "GOMINOLA",
                    "CARAMELO", "CHICLE", "CACAHUETE", "SNACK", "CHEETOS", "DORITOS",
                    "COCKTAIL", "FRUTOS SECOS", "NUEZ", "HELADO", "CONO", "GRANIZADO",
                    "PANETTONE", "PANDORO", "MAZAPAN", "MAZAPÁN", "ROSCÓN", "ROSCON",
                    "BARRITA", "STICKS", "COOKIES", "DIGESTIVE", "MINIS LECHE", "KIT-KAT",
                    "SUPERSANDWICH", "MINISANDWICH", "COULANT", "MOUSSE"]
    },
    "higiene_limpieza": {
        "name": "Higiene y Limpieza",
        "icon": "🧴",
        "color": "#95a5a6",
        "keywords": ["PAPEL", "JABÓN", "JABON", "DETERGENTE", "GEL", "CHAMPÚ", "CHAMPU",
                    "DEO", "DESODORANTE", "CEPILLO", "PASTA DENT", "COLG", "ENJUAGUE",
                    "SUAVIZANTE", "LAVAVAJILLAS", "LIMPIA", "ESTROPAJO", "FREGONA",
                    "BOLSA BASURA", "ROLLO", "SERVILLETA", "TOALLITA", "PAÑUELO", "PANUELO",
                    "BASTONCILLO", "DISCO", "ESPONJA", "FILM", "ALUMINIO", "SPRAY",
                    "AMBIENTADOR", "VELA", "PERFUME", "EDP", "COLONIA", "CREMA", "MASCARILLA",
                    "MAQUILLAJE", "MASCARA", "LABIAL", "MAQUINILLA", "COMP.", "PAÑAL",
                    "GASAS", "T.HIDROALC", "LÁGRIMAS", "PROTECTOR"]
    },
    "otros": {
        "name": "Otros",
        "icon": "📦",
        "color": "#7f8c8d",
        "keywords": []
    }
}

def categorize_product(name):
    """Categorize a product based on its name"""
    name_upper = name.upper()
    
    for cat_key, cat_info in CATEGORIES.items():
        if cat_key == "otros":
            continue
        for keyword in cat_info["keywords"]:
            if keyword.upper() in name_upper:
                return cat_key
    
    return "otros"

def parse_store_info(header_lines):
    """Extract store information from ticket header"""
    store = {"name": "Mercadona", "city": ""}
    
    for line in header_lines:
        if "GALAPAGAR" in line.upper():
            store["name"] = "Mercadona Galapagar"
            store["city"] = "GALAPAGAR"
            break
        elif "LOS VASCOS" in line.upper() or "MADRID" in line.upper():
            store["name"] = "Mercadona Madrid Los Vascos"
            store["city"] = "MADRID"
            break
        elif "POZUELO" in line.upper():
            store["name"] = "Mercadona Pozuelo"
            store["city"] = "POZUELO DE ALARCON"
            break
        elif "TORRELODONES" in line.upper():
            store["name"] = "Mercadona Torrelodones"
            store["city"] = "TORRELODONES"
            break
    
    return store

def parse_tickets(text):
    """Parse all tickets from the text file"""
    tickets = []
    seen_ids = set()
    
    # Split by ticket separator
    ticket_blocks = re.split(r'={10,}', text)
    
    current_ticket = None
    
    for block in ticket_blocks:
        block = block.strip()
        if not block:
            continue
        
        # Check if this is a ticket header (PDF filename)
        if block.startswith('📄'):
            continue
        
        # Look for ticket data
        lines = block.split('\n')
        
        # Find date/time and invoice number
        date_match = re.search(r'(\d{2}/\d{2}/\d{4})\s+(\d{2}:\d{2})', block)
        invoice_match = re.search(r'FACTURA SIMPLIFICADA:\s*(\S+)', block)
        total_match = re.search(r'TOTAL \(€\)\s*([\d,]+)', block)
        
        if date_match and invoice_match and total_match:
            # Parse date
            date_str = date_match.group(1)
            time_str = date_match.group(2)
            date_obj = datetime.strptime(date_str, "%d/%m/%Y")
            
            invoice_id = invoice_match.group(1)
            
            # Skip duplicates
            if invoice_id in seen_ids:
                continue
            seen_ids.add(invoice_id)
            
            total_str = total_match.group(1).replace(',', '.')
            total = float(total_str)
            
            # Get store info
            store = parse_store_info(lines[:10])
            
            # Parse items
            items = []
            in_items = False
            
            for line in lines:
                line = line.strip()
                
                if 'Descripción' in line and 'Importe' in line:
                    in_items = True
                    continue
                
                if in_items:
                    # Stop at TOTAL line
                    if line.startswith('TOTAL (€)'):
                        break
                    
                    # Parse item line: "1 PRODUCT NAME 1,25" or "2 PRODUCT NAME 1,25 2,50"
                    # Also handle weighted items like "1,440 kg 2,10 €/kg 3,02"
                    
                    # Check for weighted item continuation
                    weight_match = re.match(r'([\d,]+)\s*kg\s*([\d,]+)\s*€/kg\s*([\d,]+)', line)
                    if weight_match and items:
                        # Update the last item with weight info
                        weight = float(weight_match.group(1).replace(',', '.'))
                        price_per_kg = float(weight_match.group(2).replace(',', '.'))
                        final_price = float(weight_match.group(3).replace(',', '.'))
                        items[-1]['price'] = final_price
                        items[-1]['weight'] = weight
                        continue
                    
                    # Regular item line
                    item_match = re.match(r'^(\d+)\s+(.+?)\s+([\d,]+)(?:\s+([\d,]+))?$', line)
                    if item_match:
                        qty = int(item_match.group(1))
                        name = item_match.group(2).strip()
                        
                        # If there's a 4th group, that's the total (qty > 1)
                        if item_match.group(4):
                            unit_price = float(item_match.group(3).replace(',', '.'))
                            total_price = float(item_match.group(4).replace(',', '.'))
                        else:
                            total_price = float(item_match.group(3).replace(',', '.'))
                            unit_price = total_price / qty if qty > 0 else total_price
                        
                        # Clean up name
                        name = re.sub(r'\s+', ' ', name).strip()
                        
                        # Skip non-product lines
                        if name and not any(skip in name.upper() for skip in ['TARJETA', 'IVA', 'BASE', 'CUOTA', 'ENTREGA', 'PARKING']):
                            items.append({
                                "name": name,
                                "price": round(total_price, 2),
                                "quantity": qty,
                                "unitPrice": round(unit_price, 2),
                                "category": categorize_product(name)
                            })
            
            ticket = {
                "id": invoice_id,
                "date": date_obj.strftime("%Y-%m-%d"),
                "time": time_str,
                "total": total,
                "store": store,
                "items": items
            }
            
            tickets.append(ticket)
    
    # Sort by date
    tickets.sort(key=lambda x: x['date'])
    
    return tickets

def main():
    # Read the source file
    with open('tickets_mercadona.txt', 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Parse tickets
    tickets = parse_tickets(text)
    
    print(f"Parsed {len(tickets)} unique tickets")
    
    # Calculate stats
    total_spent = sum(t['total'] for t in tickets)
    total_items = sum(len(t['items']) for t in tickets)
    
    print(f"Total spent: €{total_spent:.2f}")
    print(f"Total items: {total_items}")
    
    # Create the JSON structure
    data = {
        "meta": {
            "lastUpdated": datetime.now().strftime("%Y-%m-%d"),
            "totalTickets": len(tickets),
            "currency": "EUR"
        },
        "categories": {k: {"name": v["name"], "icon": v["icon"], "color": v["color"]} 
                      for k, v in CATEGORIES.items()},
        "tickets": tickets,
        "productHistory": {}
    }
    
    # Build product history
    product_history = {}
    for ticket in tickets:
        for item in ticket['items']:
            name = item['name']
            if name not in product_history:
                product_history[name] = []
            product_history[name].append({
                "date": ticket['date'],
                "price": item.get('unitPrice', item['price']),
                "store": ticket['store']['city']
            })
    
    data['productHistory'] = product_history
    
    # Write to JSON
    with open('data/tickets.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"Written to data/tickets.json")
    
    # Show category distribution
    cat_counts = {}
    for ticket in tickets:
        for item in ticket['items']:
            cat = item['category']
            cat_counts[cat] = cat_counts.get(cat, 0) + 1
    
    print("\nCategory distribution:")
    for cat, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count} items")

if __name__ == '__main__':
    main()
