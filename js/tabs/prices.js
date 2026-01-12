/* ============================================
   MERCADONA STATS - PRICES TAB
   ============================================ */

// State for prices tab
let selectedProduct = null;
let priceSort = 'variation';
let comparisonList = [];


function renderPriceHistory() {
  const tickets = getFilteredTickets();

  // Collect price data
  const priceData = {};
  tickets.forEach(t => {
    const date = t.date.substring(0, 7); // YYYY-MM
    if (!t.items) return;
    t.items.forEach(item => {
      const price = item.unitPrice || item.price;
      if (!price) return;
      const name = getNormalizedName(item.name);
      if (!priceData[name]) {
        priceData[name] = { prices: [], dates: [], history: {} };
      }
      priceData[name].prices.push(price);
      priceData[name].dates.push(t.date);
      if (!priceData[name].history[date]) {
        priceData[name].history[date] = [];
      }
      priceData[name].history[date].push(price);
    });
  });

  // Calculate variations
  const variations = Object.entries(priceData).map(([name, data]) => {
    const months = Object.keys(data.history).sort();
    if (months.length < 2) {
      return { name, variation: 0, firstPrice: data.prices[0], lastPrice: data.prices[data.prices.length - 1], data };
    }
    const firstMonth = months[0];
    const lastMonth = months[months.length - 1];
    const firstPrice = data.history[firstMonth].reduce((a, b) => a + b, 0) / data.history[firstMonth].length;
    const lastPrice = data.history[lastMonth].reduce((a, b) => a + b, 0) / data.history[lastMonth].length;
    const variation = ((lastPrice - firstPrice) / firstPrice) * 100;
    return { name, variation, firstPrice, lastPrice, data };
  });

  // Render summary cards
  renderPriceSummary(variations);

  // Render general price trend
  renderGeneralPriceTrend(priceData);

  // Setup product selector
  setupProductSelector(priceData, variations);

  // Setup manual comparison
  setupManualComparison();


  // Render price table
  renderPriceTable(variations);
}

function renderPriceSummary(variations) {
  const container = document.getElementById('priceSummaryCards');
  if (!container) return;

  const increased = variations.filter(v => v.variation > 5).length;
  const decreased = variations.filter(v => v.variation < -5).length;
  const stable = variations.filter(v => Math.abs(v.variation) <= 5).length;
  const avgVariation = variations.length > 0 ? variations.reduce((a, b) => a + b.variation, 0) / variations.length : 0;

  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-content">
        <div class="stat-label">Subieron precio</div>
        <div class="stat-value">${increased}</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-content">
        <div class="stat-label">Bajaron precio</div>
        <div class="stat-value">${decreased}</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-content">
        <div class="stat-label">Estables</div>
        <div class="stat-value">${stable}</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-content">
        <div class="stat-label">Variación media</div>
        <div class="stat-value ${avgVariation > 0 ? 'text-danger' : avgVariation < 0 ? 'text-success' : ''}">${avgVariation > 0 ? '+' : ''}${avgVariation.toFixed(1)}%</div>
      </div>
    </div>
  `;
}

function renderGeneralPriceTrend(priceData) {
  const canvas = document.getElementById('generalPriceTrendChart');
  if (!canvas) return;

  // Calculate average price per month across all products
  const monthlyAvg = {};
  Object.values(priceData).forEach(data => {
    Object.entries(data.history).forEach(([month, prices]) => {
      if (!monthlyAvg[month]) {
        monthlyAvg[month] = { total: 0, count: 0 };
      }
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      monthlyAvg[month].total += avg;
      monthlyAvg[month].count++;
    });
  });

  const months = Object.keys(monthlyAvg).sort();
  const averages = months.map(m => monthlyAvg[m].total / monthlyAvg[m].count);

  // Normalize to percentage change from first month
  const basePrice = averages[0] || 1;
  const normalized = averages.map(a => ((a - basePrice) / basePrice) * 100);

  destroyChart('generalPriceTrendChart');

  charts['generalPriceTrendChart'] = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: months.map(m => formatMonth(m)),
      datasets: [{
        label: 'Variación de precios (%)',
        data: normalized,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: normalized.map(v => v > 0 ? '#ef4444' : '#22c55e')
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.raw > 0 ? '+' : ''}${ctx.raw.toFixed(2)}% vs inicio`
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: v => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`
          }
        }
      }
    }
  });
}

function setupProductSelector(priceData, variations) {
  const select = document.getElementById('productPriceSelect');
  const chartContainer = document.getElementById('individualPriceChart');
  if (!select || !chartContainer) return;

  // Get products with price history
  const productsWithHistory = variations
    .filter(v => Object.keys(v.data.history).length >= 2)
    .sort((a, b) => Math.abs(b.variation) - Math.abs(a.variation));

  select.innerHTML = `
    <option value="">Selecciona un producto...</option>
    ${productsWithHistory.slice(0, 100).map(v => `
      <option value="${v.name}">${truncate(v.name, 40)} (${v.variation > 0 ? '+' : ''}${v.variation.toFixed(1)}%)</option>
    `).join('')}
  `;

  select.addEventListener('change', () => {
    const productName = select.value;
    if (!productName || !priceData[productName]) {
      chartContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px;">Selecciona un producto para ver su evolución de precio</p>';
      return;
    }

    renderProductPriceChart(productName, priceData[productName]);
  });

  // Show most variable product by default
  if (productsWithHistory.length > 0) {
    select.value = productsWithHistory[0].name;
    renderProductPriceChart(productsWithHistory[0].name, productsWithHistory[0].data);
  }
}

function renderProductPriceChart(productName, data) {
  const container = document.getElementById('individualPriceChart');
  if (!container) return;

  container.innerHTML = `<canvas id="productPriceCanvas"></canvas>`;
  const canvas = document.getElementById('productPriceCanvas');

  const months = Object.keys(data.history).sort();
  const averages = months.map(m => {
    const prices = data.history[m];
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  });

  destroyChart('productPriceCanvas');

  charts['productPriceCanvas'] = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: months.map(m => formatMonth(m)),
      datasets: [{
        label: productName,
        data: averages,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 6,
        pointBackgroundColor: '#22c55e'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: productName,
          font: { size: 14 }
        },
        tooltip: {
          callbacks: {
            label: ctx => formatCurrency(ctx.raw)
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: v => formatCurrency(v)
          }
        }
      }
    }
  });
}

function setupManualComparison() {
  const storeSelect = document.getElementById('compStoreSelect');
  const productSelect = document.getElementById('compProductSelect');
  const addBtn = document.getElementById('addCompBtn');
  const clearBtn = document.getElementById('clearCompBtn');

  if (!storeSelect || !productSelect) return;

  // 1. Populate Stores
  // Store names are in ticketsData, we extract unique non-empty stores
  const stores = [...new Set(ticketsData.map(t => t.store || 'Mercadona'))].filter(Boolean).sort();

  storeSelect.innerHTML = `<option value="">Selecciona tienda...</option>
    ${stores.map(s => `<option value="${s}">${s}</option>`).join('')}`;

  // 2. Store Change Listener
  storeSelect.onchange = () => {
    const store = storeSelect.value;
    productSelect.disabled = !store;
    addBtn.disabled = true;

    if (store) {
      // Find all products for this store
      const products = new Set();
      ticketsData.forEach(t => {
        if ((t.store || 'Mercadona') === store && t.items) {
          t.items.forEach(i => products.add(getNormalizedName(i.name)));
        }
      });

      const sortedProducts = [...products].sort();
      productSelect.innerHTML = `<option value="">Selecciona producto...</option>
        ${sortedProducts.map(p => `<option value="${p}">${p}</option>`).join('')}`;
    } else {
      productSelect.innerHTML = '<option value="">Primero selecciona tienda...</option>';
    }
  };

  // 3. Product Change Listener
  productSelect.onchange = () => {
    addBtn.disabled = !productSelect.value;
  };

  // 4. Add Button Listener
  addBtn.onclick = () => {
    const store = storeSelect.value;
    const product = productSelect.value;
    if (store && product) {
      addToComparison(store, product);
    }
  };

  // 5. Clear Button Listener
  if (clearBtn) {
    clearBtn.onclick = () => {
      comparisonList = [];
      renderComparisonTable();
    };
  }

  // Initial render
  renderComparisonTable();
}

function addToComparison(store, product) {
  // Find latest price data
  let latestData = null;

  // Sort tickets by date desc
  const sortedTickets = [...ticketsData].sort((a, b) => b.date.localeCompare(a.date));

  for (const t of sortedTickets) {
    if ((t.store || 'Mercadona') === store && t.items) {
      const item = t.items.find(i => getNormalizedName(i.name) === product);
      if (item) {
        latestData = {
          name: product,
          store: store,
          price: item.price, // Total price (could be dependent on weight)
          unitPrice: item.unitPrice, // Unit price is better for comparison
          quantity: item.quantity,
          weight: item.weight,
          date: t.date
        };
        break;
      }
    }
  }

  if (latestData) {
    // Check if already exists (same store and product)
    const exists = comparisonList.some(i => i.name === product && i.store === store);
    if (!exists) {
      comparisonList.push(latestData);
      renderComparisonTable();
    }
  }
}

function renderComparisonTable() {
  const container = document.getElementById('priceComparisonContainer');
  const clearBtn = document.getElementById('clearCompBtn');

  if (comparisonList.length === 0) {
    if (clearBtn) clearBtn.style.display = 'none';
    container.innerHTML = `
          <div class="empty-state" style="text-align: center; color: var(--text-muted); padding: 30px; border: 2px dashed var(--border-color); border-radius: var(--border-radius);">
            <div style="font-size: 2rem; margin-bottom: 10px;">⚖️</div>
            <p>Añade productos de diferentes tiendas para comparar sus precios lado a lado.</p>
          </div>`;
    return;
  }

  if (clearBtn) clearBtn.style.display = 'block'; // Make sure to show clear button

  // Calculate best unit price logic
  // We only compare items that have a unitPrice.
  const validItems = comparisonList.filter(i => i.unitPrice);
  const minUnitPrice = validItems.length > 0 ? Math.min(...validItems.map(i => i.unitPrice)) : 0;
  const hasComparison = validItems.length > 1;

  container.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Tienda</th>
            <th>Producto</th>
            <th style="text-align: right;">Precio/U</th>
            <th style="text-align: right;">Precio Pago</th>
            <th style="text-align: right;">Fecha</th>
            <th style="text-align: center;">Acción</th>
          </tr>
        </thead>
        <tbody>
          ${comparisonList.map((item, index) => {
    const isBest = hasComparison && item.unitPrice && Math.abs(item.unitPrice - minUnitPrice) < 0.001;
    let diffBadge = '';

    if (item.unitPrice && hasComparison && !isBest) {
      const diffPercent = ((item.unitPrice - minUnitPrice) / minUnitPrice) * 100;
      diffBadge = `<div style="font-size: 0.75rem; color: #ef4444; font-weight: 500;">+${diffPercent.toFixed(1)}%</div>`;
    } else if (isBest) {
      diffBadge = `<div style="font-size: 0.75rem; color: #22c55e; font-weight: 500;">Mejor precio</div>`;
    }

    return `
              <tr class="${isBest ? 'highlight-success' : ''}" style="${isBest ? 'background-color: rgba(34, 197, 94, 0.05);' : ''}">
                <td><strong>${item.store}</strong></td>
                <td>${item.name}</td>
                <td style="text-align: right;">
                    <div style="font-weight: bold;">${item.unitPrice ? formatCurrency(item.unitPrice) : '-'}</div>
                    ${diffBadge}
                </td>
                <td style="text-align: right;">
                    <div>${formatCurrency(item.price)}</div>
                    ${item.weight ? `<div style="font-size: 0.75rem; color: var(--text-muted);">${item.weight.toFixed(3).replace('.', ',')} kg</div>` : ''}
                </td>
                <td style="text-align: right; font-size: 0.8rem; color: var(--text-muted);">${formatDate(item.date)}</td>
                <td style="text-align: center;">
                    <button onclick="window.removeComparisonItem(${index})" title="Eliminar" style="background: none; border: none; cursor: pointer; color: #ef4444; font-size: 1.2rem;">&times;</button>
                </td>
              </tr>
              `;
  }).join('')}
        </tbody>
      </table>
    </div>
    `;
}

// Global function for onclick
window.removeComparisonItem = function (index) {
  comparisonList.splice(index, 1);
  renderComparisonTable();
};

function renderPriceTable(variations) {
  const container = document.getElementById('priceChangeTable');
  const sortSelect = document.getElementById('priceSort');
  if (!container) return;

  const renderTable = () => {
    const sortBy = sortSelect?.value || 'variation';
    let sorted;

    switch (sortBy) {
      case 'increase':
        sorted = [...variations].sort((a, b) => b.variation - a.variation);
        break;
      case 'decrease':
        sorted = [...variations].sort((a, b) => a.variation - b.variation);
        break;
      default:
        sorted = [...variations].sort((a, b) => Math.abs(b.variation) - Math.abs(a.variation));
    }

    const withChanges = sorted.filter(v => Math.abs(v.variation) > 0.5);

    container.innerHTML = `
      <div class="table-container" style="max-height: 500px; overflow-y: auto;">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th style="text-align: right;">Precio inicial</th>
              <th style="text-align: right;">Precio actual</th>
              <th style="text-align: right;">Variación</th>
            </tr>
          </thead>
          <tbody>
            ${withChanges.slice(0, 100).map(v => `
              <tr>
                <td>${v.name}</td>
                <td style="text-align: right;">${formatCurrency(v.firstPrice)}</td>
                <td style="text-align: right;">${formatCurrency(v.lastPrice)}</td>
                <td style="text-align: right;" class="${v.variation > 0 ? 'text-danger' : v.variation < 0 ? 'text-success' : ''}">
                  ${v.variation > 0 ? '↑' : v.variation < 0 ? '↓' : '→'} ${v.variation > 0 ? '+' : ''}${v.variation.toFixed(1)}%
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${withChanges.length > 100 ? `<p style="text-align: center; color: var(--text-muted); margin-top: 16px;">Mostrando 100 de ${withChanges.length} productos con cambios</p>` : ''}
    `;
  };

  if (sortSelect) {
    sortSelect.addEventListener('change', renderTable);
  }
  renderTable();
}
