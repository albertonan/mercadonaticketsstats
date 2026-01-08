/* ============================================
   MERCADONA STATS - NUTRITION SERVICE
   Uses Open Food Facts API for real nutrition data
   https://world.openfoodfacts.org/
   ============================================ */

// Cache for nutrition data to avoid repeated API calls
const nutritionCache = new Map();

// Open Food Facts API configuration
const OFF_API = {
  // Use world API which supports CORS for search.pl
  baseUrl: 'https://world.openfoodfacts.org',
  userAgent: 'MercadonaStats/1.0'
};

/**
 * Search for product nutrition info in Open Food Facts
 * @param {string} productName - Product name to search for
 * @returns {Promise<Object|null>} - Nutrition data or null if not found
 */
async function searchNutritionInfo(productName) {
  // Check cache first
  const cacheKey = productName.toLowerCase().trim();
  if (nutritionCache.has(cacheKey)) {
    return nutritionCache.get(cacheKey);
  }

  try {
    // Clean product name for better search results
    const searchTerms = cleanProductName(productName);
    
    // Try first with Hacendado brand filter (most Mercadona products)
    let result = await searchOpenFoodFacts(searchTerms, productName, 'hacendado');
    
    // If no good match, try with Mercadona brand
    if (!result) {
      result = await searchOpenFoodFacts(searchTerms, productName, 'mercadona');
    }
    
    // If still no match, try generic search
    if (!result) {
      result = await searchOpenFoodFacts(searchTerms, productName, null);
    }
    
    // Cache result
    nutritionCache.set(cacheKey, result);
    return result;

  } catch (error) {
    console.warn(`Error fetching nutrition for "${productName}":`, error.message);
    return null;
  }
}

/**
 * Execute search against Open Food Facts API
 * Uses cgi/search.pl which has better search and CORS support
 */
async function searchOpenFoodFacts(searchTerms, originalName, brandFilter) {
  const params = new URLSearchParams({
    search_terms: searchTerms,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '15',
    sort_by: 'unique_scans_n'
  });
  
  // Add brand filter if specified
  if (brandFilter) {
    params.append('tagtype_0', 'brands');
    params.append('tag_contains_0', 'contains');
    params.append('tag_0', brandFilter);
  }

  const response = await fetch(`${OFF_API.baseUrl}/cgi/search.pl?${params}`, {
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  
  if (data.products && data.products.length > 0) {
    const bestMatch = findBestMatch(originalName, data.products);
    if (bestMatch) {
      return extractNutritionData(bestMatch);
    }
  }
  
  return null;
}

/**
 * Clean product name for better API search
 */
function cleanProductName(name) {
  return name
    // Remove weight/quantity indicators
    .replace(/\d+\s*(g|kg|ml|l|cl|ud|uds?|%)\b/gi, '')
    // Remove common abbreviations and expand them
    .replace(/\bHAC\b/gi, '')
    .replace(/\bMERC\b/gi, '')
    .replace(/\bDESN\b/gi, 'desnatada')
    .replace(/\bSEMI\b/gi, 'semidesnatada')
    .replace(/\bPROT\b/gi, 'proteinas')
    .replace(/\bNAT\b/gi, 'natural')
    .replace(/\bCHOCO\b/gi, 'chocolate')
    // Remove special characters
    .replace(/[\.\/\-_,]/g, ' ')
    // Clean extra spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find best matching product from search results
 * More strict matching to avoid irrelevant results
 */
function findBestMatch(searchName, products) {
  const searchLower = searchName.toLowerCase();
  // Get significant words (length >= 3, not common words)
  const commonWords = ['con', 'sin', 'para', 'del', 'los', 'las', 'una', 'uno'];
  const searchWords = searchLower
    .split(/\s+/)
    .filter(w => w.length >= 3 && !commonWords.includes(w));
  
  if (searchWords.length === 0) return null;
  
  let bestProduct = null;
  let bestScore = 0;

  for (const product of products) {
    if (!product.nutriments || Object.keys(product.nutriments).length === 0) {
      continue; // Skip products without nutrition data
    }

    const productName = (product.product_name || '').toLowerCase();
    const brand = (product.brands || '').toLowerCase();
    const countries = product.countries_tags || [];
    
    let score = 0;
    let matchedWords = 0;
    
    // Score based on word matches - require at least one significant match
    for (const word of searchWords) {
      if (productName.includes(word)) {
        score += 5;
        matchedWords++;
      }
    }
    
    // Must match at least one significant word
    if (matchedWords === 0) continue;
    
    // Big bonus for Hacendado/Mercadona products
    if (brand.includes('hacendado') || brand.includes('mercadona')) {
      score += 15;
    }
    
    // Bonus for Spanish products
    if (countries.some(c => c.includes('spain') || c.includes('españa'))) {
      score += 5;
    }

    // Bonus for completeness of nutrition data
    const nutrientCount = countNutrients(product.nutriments);
    score += Math.min(nutrientCount, 5);
    
    // Bonus for more word matches
    score += matchedWords * 3;

    if (score > bestScore) {
      bestScore = score;
      bestProduct = product;
    }
  }

  // Require minimum score to return a match
  return bestScore >= 10 ? bestProduct : null;
}

/**
 * Count available nutrients
 */
function countNutrients(nutriments) {
  const keys = ['energy-kcal_100g', 'fat_100g', 'proteins_100g', 
                'carbohydrates_100g', 'sugars_100g', 'salt_100g', 'fiber_100g'];
  return keys.filter(k => nutriments[k] !== undefined).length;
}

/**
 * Extract and normalize nutrition data from API response
 */
function extractNutritionData(product) {
  const n = product.nutriments || {};
  
  return {
    found: true,
    productName: product.product_name || 'Producto',
    brand: product.brands || '',
    image: product.image_small_url || product.image_url || null,
    quantity: product.quantity || '',
    nutriscore: product.nutriscore_grade || null,
    novaGroup: product.nova_group || null,
    ecoscore: product.ecoscore_grade || null,
    
    // Nutrition per 100g
    nutrients: {
      energy: {
        value: n['energy-kcal_100g'] ?? n['energy_100g'] ?? null,
        unit: 'kcal'
      },
      fat: {
        value: n['fat_100g'] ?? null,
        unit: 'g'
      },
      saturatedFat: {
        value: n['saturated-fat_100g'] ?? null,
        unit: 'g'
      },
      carbohydrates: {
        value: n['carbohydrates_100g'] ?? null,
        unit: 'g'
      },
      sugars: {
        value: n['sugars_100g'] ?? null,
        unit: 'g'
      },
      fiber: {
        value: n['fiber_100g'] ?? null,
        unit: 'g'
      },
      proteins: {
        value: n['proteins_100g'] ?? null,
        unit: 'g'
      },
      salt: {
        value: n['salt_100g'] ?? null,
        unit: 'g'
      }
    },
    
    // Source info
    source: {
      name: 'Open Food Facts',
      url: `https://es.openfoodfacts.org/producto/${product.code}`,
      barcode: product.code
    }
  };
}

/**
 * Render nutrition modal
 */
function showNutritionModal(productName, purchaseData) {
  // Remove existing modal if any
  const existingModal = document.getElementById('nutritionModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'nutritionModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="nutrition-modal">
      <div class="nutrition-header">
        <h3>${escapeHtml(productName)}</h3>
        <button class="close-btn" onclick="closeNutritionModal()">&times;</button>
      </div>
      <div class="nutrition-content">
        <div class="nutrition-loading">
          <div class="spinner"></div>
          <p>Buscando información nutricional...</p>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  // Small delay to trigger CSS transition
  requestAnimationFrame(() => {
    modal.classList.add('active');
  });
  document.body.style.overflow = 'hidden';

  // Fetch nutrition data
  searchNutritionInfo(productName).then(data => {
    renderNutritionContent(data, purchaseData);
  });
}

/**
 * Render nutrition content in modal
 */
function renderNutritionContent(nutritionData, purchaseData) {
  const content = document.querySelector('.nutrition-content');
  if (!content) return;

  if (!nutritionData) {
    content.innerHTML = `
      <div class="nutrition-not-found">
        <div class="not-found-icon">🔍</div>
        <h4>Información no encontrada</h4>
        <p>No se encontró información nutricional para este producto en Open Food Facts.</p>
        <p class="hint">Puedes contribuir añadiendo el producto en 
          <a href="https://es.openfoodfacts.org/cgi/product.pl" target="_blank" rel="noopener">
            openfoodfacts.org
          </a>
        </p>
      </div>
      ${renderPurchaseInfo(purchaseData)}
    `;
    return;
  }

  const { nutrients, nutriscore, novaGroup, ecoscore, image, brand, quantity, source } = nutritionData;

  content.innerHTML = `
    <div class="nutrition-found">
      ${image ? `<img src="${image}" alt="${nutritionData.productName}" class="product-image">` : ''}
      
      <div class="product-meta">
        ${brand ? `<span class="brand">${escapeHtml(brand)}</span>` : ''}
        ${quantity ? `<span class="quantity">${escapeHtml(quantity)}</span>` : ''}
      </div>

      ${renderScores(nutriscore, novaGroup, ecoscore)}
      
      <div class="nutrition-table">
        <h4>Información nutricional <small>(por 100g)</small></h4>
        <table>
          <tbody>
            ${renderNutrientRow('Energía', nutrients.energy, 'kcal')}
            ${renderNutrientRow('Grasas', nutrients.fat, 'g')}
            ${renderNutrientRow('  - Saturadas', nutrients.saturatedFat, 'g', true)}
            ${renderNutrientRow('Carbohidratos', nutrients.carbohydrates, 'g')}
            ${renderNutrientRow('  - Azúcares', nutrients.sugars, 'g', true)}
            ${renderNutrientRow('Fibra', nutrients.fiber, 'g')}
            ${renderNutrientRow('Proteínas', nutrients.proteins, 'g')}
            ${renderNutrientRow('Sal', nutrients.salt, 'g')}
          </tbody>
        </table>
      </div>

      ${renderPurchaseInfo(purchaseData)}

      <div class="nutrition-source">
        <small>
          Datos de <a href="${source.url}" target="_blank" rel="noopener">Open Food Facts</a>
          ${source.barcode ? `· Código: ${source.barcode}` : ''}
        </small>
      </div>
    </div>
  `;
}

/**
 * Render Nutri-Score, NOVA and Eco-Score badges
 */
function renderScores(nutriscore, novaGroup, ecoscore) {
  const scores = [];
  
  if (nutriscore) {
    const colors = { a: '#038141', b: '#85bb2f', c: '#fecb02', d: '#ee8100', e: '#e63e11' };
    scores.push(`
      <div class="score-badge nutriscore nutriscore-${nutriscore}">
        <span class="score-label">Nutri-Score</span>
        <span class="score-value" style="background: ${colors[nutriscore] || '#999'}">${nutriscore.toUpperCase()}</span>
      </div>
    `);
  }

  if (novaGroup) {
    const novaLabels = {
      1: 'Sin procesar',
      2: 'Procesado',
      3: 'Muy procesado',
      4: 'Ultra-procesado'
    };
    const novaColors = { 1: '#038141', 2: '#85bb2f', 3: '#fecb02', 4: '#e63e11' };
    scores.push(`
      <div class="score-badge nova nova-${novaGroup}">
        <span class="score-label">NOVA</span>
        <span class="score-value" style="background: ${novaColors[novaGroup] || '#999'}">${novaGroup}</span>
        <span class="score-desc">${novaLabels[novaGroup] || ''}</span>
      </div>
    `);
  }

  if (ecoscore && ecoscore !== 'unknown') {
    const colors = { a: '#038141', b: '#85bb2f', c: '#fecb02', d: '#ee8100', e: '#e63e11' };
    scores.push(`
      <div class="score-badge ecoscore ecoscore-${ecoscore}">
        <span class="score-label">Eco-Score</span>
        <span class="score-value" style="background: ${colors[ecoscore] || '#999'}">${ecoscore.toUpperCase()}</span>
      </div>
    `);
  }

  return scores.length > 0 ? `<div class="scores-container">${scores.join('')}</div>` : '';
}

/**
 * Render nutrient table row
 */
function renderNutrientRow(label, nutrient, defaultUnit, isSubitem = false) {
  if (!nutrient || nutrient.value === null || nutrient.value === undefined) {
    return `
      <tr class="${isSubitem ? 'subitem' : ''}">
        <td>${label}</td>
        <td class="value muted">-</td>
      </tr>
    `;
  }
  
  const value = typeof nutrient.value === 'number' 
    ? nutrient.value.toFixed(1) 
    : nutrient.value;
  const unit = nutrient.unit || defaultUnit;
  
  return `
    <tr class="${isSubitem ? 'subitem' : ''}">
      <td>${label}</td>
      <td class="value">${value} ${unit}</td>
    </tr>
  `;
}

/**
 * Render purchase info section
 */
function renderPurchaseInfo(purchaseData) {
  if (!purchaseData) return '';
  
  const avgPrice = purchaseData.prices.reduce((a, b) => a + b, 0) / purchaseData.prices.length;
  const minPrice = Math.min(...purchaseData.prices);
  const maxPrice = Math.max(...purchaseData.prices);
  
  return `
    <div class="purchase-info">
      <h4>Tus compras</h4>
      <div class="purchase-stats">
        <div class="stat">
          <span class="stat-value">${purchaseData.count}</span>
          <span class="stat-label">Unidades</span>
        </div>
        <div class="stat">
          <span class="stat-value">${purchaseData.frequency}x</span>
          <span class="stat-label">Compras</span>
        </div>
        <div class="stat">
          <span class="stat-value">${formatCurrency(avgPrice)}</span>
          <span class="stat-label">Precio medio</span>
        </div>
        <div class="stat">
          <span class="stat-value">${formatCurrency(purchaseData.total)}</span>
          <span class="stat-label">Total gastado</span>
        </div>
      </div>
      ${minPrice !== maxPrice ? `
        <div class="price-range">
          Rango de precios: ${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Close nutrition modal
 */
function closeNutritionModal() {
  const modal = document.getElementById('nutritionModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => modal.remove(), 300);
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeNutritionModal();
});

// Close modal on backdrop click
document.addEventListener('click', (e) => {
  if (e.target.id === 'nutritionModal') closeNutritionModal();
});
