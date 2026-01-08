/* ============================================
   MERCADONA STATS - PRODUCTS TAB
   ============================================ */

function renderProducts() {
  const tickets = getFilteredTickets();
  
  // Calculate product totals
  const productData = {};
  tickets.forEach(t => {
    if (!t.items) return;
    t.items.forEach(item => {
      if (!productData[item.name]) {
        productData[item.name] = { 
          total: 0, 
          count: 0, 
          frequency: 0, 
          category: item.category || 'otros',
          prices: []
        };
      }
      productData[item.name].total += item.price;
      productData[item.name].count += item.quantity || 1;
      productData[item.name].frequency++;
      productData[item.name].prices.push(item.unitPrice || item.price);
    });
  });
  
  // Update product count badge
  const badge = document.getElementById('productCountBadge');
  if (badge) badge.textContent = `${Object.keys(productData).length} productos`;
  
  // Setup search
  setupProductSearch(productData);
  
  // Render top products chart
  renderTopProductsChart(productData);
  
  // Render product table
  renderProductTable(productData);
}

function setupProductSearch(productData) {
  const input = document.getElementById('productSearch');
  const results = document.getElementById('searchResults');
  if (!input || !results) return;
  
  // Store product data globally for click handlers
  window._productData = productData;
  
  input.addEventListener('input', debounce(() => {
    const query = input.value.toLowerCase().trim();
    if (query.length < 2) {
      results.innerHTML = '';
      return;
    }
    
    const matches = Object.entries(productData)
      .filter(([name]) => name.toLowerCase().includes(query))
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);
    
    results.innerHTML = matches.length > 0 ? matches.map(([name, data]) => {
      const avgPrice = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
      return `
        <div class="product-item clickable" onclick="handleProductClick('${escapeAttr(name)}')">
          <div class="product-icon">${getCategoryEmoji(data.category)}</div>
          <div class="product-info">
            <div class="product-name">${name}</div>
            <div class="product-meta">
              Comprado ${data.count}x · Precio medio: ${formatCurrency(avgPrice)}
            </div>
          </div>
          <div class="product-price">${formatCurrency(data.total)}</div>
        </div>
      `;
    }).join('') : '<p style="padding:16px;color:var(--text-muted);text-align:center;">Sin resultados</p>';
  }, 300));
}

// Helper to escape attribute values
function escapeAttr(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

function renderTopProductsChart(productData) {
  const sortSelect = document.getElementById('topProductsSort');
  if (!sortSelect) return;
  
  const renderChart = () => {
    const sortBy = sortSelect.value;
    let sorted;
    
    switch(sortBy) {
      case 'quantity':
        sorted = Object.entries(productData).sort((a, b) => b[1].count - a[1].count);
        break;
      case 'frequency':
        sorted = Object.entries(productData).sort((a, b) => b[1].frequency - a[1].frequency);
        break;
      default:
        sorted = Object.entries(productData).sort((a, b) => b[1].total - a[1].total);
    }
    
    const top10 = sorted.slice(0, 10);
    const labels = top10.map(([name]) => truncate(name, 20));
    const data = top10.map(([_, d]) => sortBy === 'quantity' ? d.count : sortBy === 'frequency' ? d.frequency : d.total);
    const colors = top10.map(([_, d]) => getCategoryColor(Object.keys(productData).indexOf(_) % 9));
    
    destroyChart('topProductsChart');
    
    const canvas = document.getElementById('topProductsChart');
    if (!canvas) return;
    
    charts['topProductsChart'] = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: sortBy === 'quantity' ? 'Cantidad' : sortBy === 'frequency' ? 'Frecuencia' : 'Gasto',
          data,
          backgroundColor: colors,
          borderRadius: 8
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => sortBy === 'spent' ? formatCurrency(ctx.raw) : `${ctx.raw} ${sortBy === 'quantity' ? 'unidades' : 'compras'}`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: v => sortBy === 'spent' ? formatCurrency(v) : v
            }
          }
        }
      }
    });
  };
  
  sortSelect.addEventListener('change', renderChart);
  renderChart();
}

function renderProductTable(productData) {
  const container = document.getElementById('productTable');
  if (!container) return;
  
  const sorted = Object.entries(productData).sort((a, b) => b[1].total - a[1].total);
  
  // Store product data globally for click handlers
  window._productData = productData;
  
  container.innerHTML = `
    <div class="table-container" style="max-height: 500px; overflow-y: auto;">
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Categoría</th>
            <th style="text-align: right;">Cantidad</th>
            <th style="text-align: right;">Frecuencia</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.slice(0, 100).map(([name, data]) => `
            <tr class="clickable-row" onclick="handleProductClick('${escapeAttr(name)}')" title="Ver información nutricional">
              <td>${name}</td>
              <td>${getCategoryEmoji(data.category)} ${data.category}</td>
              <td style="text-align: right;">${data.count}</td>
              <td style="text-align: right;">${data.frequency}x</td>
              <td style="text-align: right;">${formatCurrency(data.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ${sorted.length > 100 ? `<p style="text-align: center; color: var(--text-muted); margin-top: 16px;">Mostrando 100 de ${sorted.length} productos</p>` : ''}
  `;
}

// Handle product click from table
function handleProductClick(productName) {
  const data = window._productData?.[productName];
  if (data) {
    showNutritionModal(productName, data);
  }
}
