/* ============================================
   MERCADONA STATS - PRICES TAB
   ============================================ */

// State for prices tab
let selectedProduct = null;
let priceSort = 'variation';

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
      if (!priceData[item.name]) {
        priceData[item.name] = { prices: [], dates: [], history: {} };
      }
      priceData[item.name].prices.push(price);
      priceData[item.name].dates.push(t.date);
      if (!priceData[item.name].history[date]) {
        priceData[item.name].history[date] = [];
      }
      priceData[item.name].history[date].push(price);
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

function renderPriceTable(variations) {
  const container = document.getElementById('priceChangeTable');
  const sortSelect = document.getElementById('priceSort');
  if (!container) return;
  
  const renderTable = () => {
    const sortBy = sortSelect?.value || 'variation';
    let sorted;
    
    switch(sortBy) {
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
