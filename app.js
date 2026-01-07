/* ============================================
   MERCADONA STATS - APPLICATION
   ============================================ */

// Global state
let ticketsData = null;
let currentYear = 'all';
let charts = {};

// DOM Elements
const DOM = {
  yearSelector: null,
  tabs: null,
  contents: null
};

// Initialize app
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadData();
  setupDOM();
  setupTabs();
  setupYearFilter();
  setupDarkMode();
  setupExport();
  setupStoreFilter();
  setupProductSearch();
  setupBudgetTracker();
  renderAllViews();
}

// Load JSON data
async function loadData() {
  try {
    const response = await fetch('data/tickets.json');
    if (!response.ok) throw new Error('Error loading data');
    ticketsData = await response.json();
    console.log('Data loaded:', ticketsData.meta);
  } catch (error) {
    console.error('Error:', error);
    showError('Error cargando datos. Verifica que existe data/tickets.json');
  }
}

function setupDOM() {
  DOM.yearSelector = document.getElementById('yearSelector');
  DOM.tabs = document.querySelectorAll('.tab');
  DOM.contents = document.querySelectorAll('.content');
}

// ============================================
// TABS
// ============================================
function setupTabs() {
  DOM.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      
      DOM.tabs.forEach(t => t.classList.remove('active'));
      DOM.contents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(target).classList.add('active');
    });
  });
}

// ============================================
// YEAR FILTER
// ============================================
function setupYearFilter() {
  if (!ticketsData) return;
  
  const years = getAvailableYears();
  DOM.yearSelector.innerHTML = '<option value="all">Todos los años</option>';
  years.forEach(year => {
    DOM.yearSelector.innerHTML += `<option value="${year}">${year}</option>`;
  });
  
  DOM.yearSelector.addEventListener('change', (e) => {
    currentYear = e.target.value;
    renderAllViews();
  });
}

function getAvailableYears() {
  const years = new Set();
  ticketsData.tickets.forEach(t => {
    years.add(t.date.substring(0, 4));
  });
  return Array.from(years).sort().reverse();
}

// ============================================
// RENDER ALL VIEWS
// ============================================
function renderAllViews() {
  renderOverview();
  renderMonthlyChart();
  renderCategories();
  renderProducts();
  renderPriceHistory();
  renderWeeklyChart();
  renderComparison();
  renderTicketsList();
  renderInsights();
}

// ============================================
// OVERVIEW TAB
// ============================================
function renderOverview() {
  const tickets = getFilteredTickets();
  const totalSpent = tickets.reduce((sum, t) => sum + t.total, 0);
  const avgPerTicket = totalSpent / tickets.length || 0;
  
  // Calculate monthly average
  const monthlyTotals = {};
  tickets.forEach(t => {
    const month = t.date.substring(0, 7);
    monthlyTotals[month] = (monthlyTotals[month] || 0) + t.total;
  });
  const months = Object.keys(monthlyTotals);
  const avgPerMonth = months.length ? totalSpent / months.length : 0;
  
  // Most visited store - handle both string and object store formats
  const stores = {};
  tickets.forEach(t => {
    const storeName = typeof t.store === 'object' ? t.store.city || t.store.name : t.store;
    stores[storeName] = (stores[storeName] || 0) + 1;
  });
  const topStore = Object.entries(stores).sort((a, b) => b[1] - a[1])[0];
  
  // Update stats cards
  document.getElementById('totalSpent').textContent = formatCurrency(totalSpent);
  document.getElementById('ticketCount').textContent = tickets.length;
  document.getElementById('avgTicket').textContent = formatCurrency(avgPerTicket);
  document.getElementById('avgMonth').textContent = formatCurrency(avgPerMonth);
  document.getElementById('topStore').textContent = topStore ? topStore[0] : '-';
  document.getElementById('topStoreCount').textContent = topStore ? `${topStore[1]} visitas` : '';
  
  // Period info
  if (tickets.length > 0) {
    const sortedDates = tickets.map(t => t.date).sort();
    const startDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];
    const period = currentYear === 'all' 
      ? `${startDate} a ${endDate}`
      : currentYear;
    document.getElementById('periodInfo').textContent = period;
  } else {
    document.getElementById('periodInfo').textContent = 'Sin datos';
  }
}

// ============================================
// MONTHLY CHART
// ============================================
function renderMonthlyChart() {
  const tickets = getFilteredTickets();
  
  // Group by month
  const monthlyData = {};
  tickets.forEach(t => {
    const month = t.date.substring(0, 7);
    monthlyData[month] = (monthlyData[month] || 0) + t.total;
  });
  
  const sortedMonths = Object.keys(monthlyData).sort();
  const labels = sortedMonths.map(m => formatMonth(m));
  const data = sortedMonths.map(m => monthlyData[m]);
  
  // Destroy existing chart
  if (charts.monthly) {
    charts.monthly.destroy();
  }
  
  const ctx = document.getElementById('monthlyChart').getContext('2d');
  charts.monthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Gasto mensual',
        data,
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => formatCurrency(ctx.raw)
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: v => formatCurrency(v)
          }
        }
      }
    }
  });
  
  // Render monthly summary
  renderMonthlySummary(sortedMonths, monthlyData);
}

function renderMonthlySummary(months, data) {
  const container = document.getElementById('monthlySummary');
  if (!container) return;
  
  const maxSpend = Math.max(...Object.values(data));
  const minSpend = Math.min(...Object.values(data));
  const maxMonth = months.find(m => data[m] === maxSpend);
  const minMonth = months.find(m => data[m] === minSpend);
  
  container.innerHTML = `
    <div class="alert alert-info">
      <h4>📊 Resumen</h4>
      <p>Mayor gasto: ${formatMonth(maxMonth)} (${formatCurrency(maxSpend)})</p>
      <p>Menor gasto: ${formatMonth(minMonth)} (${formatCurrency(minSpend)})</p>
    </div>
  `;
}

// ============================================
// CATEGORIES TAB
// ============================================
function renderCategories() {
  const tickets = getFilteredTickets();
  const categories = ticketsData.categories;
  
  // Calculate category totals from items
  const categoryTotals = {};
  const categoryItems = {};
  
  Object.keys(categories).forEach(cat => {
    categoryTotals[cat] = 0;
    categoryItems[cat] = [];
  });
  
  tickets.forEach(ticket => {
    if (ticket.items && ticket.items.length > 0) {
      ticket.items.forEach(item => {
        const category = item.category || categorizeProduct(item.name);
        // item.price is already the line total
        const itemTotal = item.price;
        categoryTotals[category] += itemTotal;
        
        // Track items for detail - use unitPrice for display
        const unitPrice = item.unitPrice || (item.price / (item.quantity || 1));
        const existing = categoryItems[category].find(i => i.name === item.name);
        if (existing) {
          existing.quantity += item.quantity;
          existing.total += itemTotal;
          existing.purchases.push({ date: ticket.date, price: unitPrice, qty: item.quantity });
        } else {
          categoryItems[category].push({
            name: item.name,
            quantity: item.quantity,
            price: unitPrice,
            total: itemTotal,
            category: category,
            purchases: [{ date: ticket.date, price: unitPrice, qty: item.quantity }]
          });
        }
      });
    }
  });
  
  // If no item detail, estimate from totals
  const hasItemData = Object.values(categoryTotals).some(v => v > 0);
  if (!hasItemData) {
    const avgDistribution = {
      proteinas: 0.25,
      lacteos: 0.15,
      frutas_verduras: 0.12,
      bebidas: 0.10,
      congelados: 0.08,
      despensa: 0.12,
      dulces_snacks: 0.05,
      higiene_limpieza: 0.08,
      otros: 0.05
    };
    const total = tickets.reduce((s, t) => s + t.total, 0);
    Object.keys(categories).forEach(cat => {
      categoryTotals[cat] = total * (avgDistribution[cat] || 0.05);
    });
  }
  
  // Render category pie chart
  renderCategoryChart(categoryTotals);
  
  // Render category list
  renderCategoryList(categoryTotals, categoryItems);
  
  // Render monthly category chart
  renderCategoryMonthlyChart(tickets);
  
  // Render products by category with filters
  renderCategoryProducts(categoryItems);
}

function categorizeProduct(productName) {
  const name = productName.toUpperCase();
  const categories = ticketsData.categories;
  
  for (const [catKey, catData] of Object.entries(categories)) {
    if (catData.keywords && catData.keywords.some(kw => name.includes(kw))) {
      return catKey;
    }
  }
  return 'otros';
}

function renderCategoryChart(totals) {
  const categories = ticketsData.categories;
  const labels = Object.keys(totals).map(k => categories[k]?.name || k);
  const data = Object.values(totals);
  const colors = Object.keys(totals).map(k => categories[k]?.color || '#999');
  
  if (charts.category) {
    charts.category.destroy();
  }
  
  const ctx = document.getElementById('categoryChart').getContext('2d');
  charts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { padding: 15 }
        },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.label}: ${formatCurrency(ctx.raw)}`
          }
        }
      }
    }
  });
}

function renderCategoryMonthlyChart(tickets) {
  const categories = ticketsData.categories;
  
  // Group by month and category
  const monthlyData = {};
  const categoryKeys = Object.keys(categories);
  
  tickets.forEach(ticket => {
    const month = ticket.date.substring(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = {};
      categoryKeys.forEach(cat => monthlyData[month][cat] = 0);
    }
    
    if (ticket.items && ticket.items.length > 0) {
      ticket.items.forEach(item => {
        const category = item.category || categorizeProduct(item.name);
        // item.price is already the line total
        monthlyData[month][category] += item.price;
      });
    } else {
      // Distribute ticket total by estimated percentages
      const avgDistribution = {
        proteinas: 0.25, lacteos: 0.15, frutas_verduras: 0.12,
        bebidas: 0.10, congelados: 0.08, despensa: 0.12,
        dulces_snacks: 0.05, higiene_limpieza: 0.08, otros: 0.05
      };
      categoryKeys.forEach(cat => {
        monthlyData[month][cat] += ticket.total * (avgDistribution[cat] || 0.05);
      });
    }
  });
  
  const sortedMonths = Object.keys(monthlyData).sort();
  const labels = sortedMonths.map(m => formatMonth(m));
  
  // Create datasets for each category
  const datasets = categoryKeys.map(catKey => {
    const cat = categories[catKey];
    return {
      label: cat.name,
      data: sortedMonths.map(m => monthlyData[m][catKey]),
      backgroundColor: cat.color,
      borderRadius: 4
    };
  });
  
  if (charts.categoryMonthly) {
    charts.categoryMonthly.destroy();
  }
  
  const ctx = document.getElementById('categoryMonthlyChart');
  if (!ctx) return;
  
  charts.categoryMonthly = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 15, usePointStyle: true }
        },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
          }
        }
      },
      scales: {
        x: { stacked: true },
        y: {
          stacked: true,
          ticks: { callback: v => formatCurrency(v) }
        }
      }
    }
  });
}

function renderCategoryList(totals, items) {
  const container = document.getElementById('categoryList');
  const categories = ticketsData.categories;
  const total = Object.values(totals).reduce((s, v) => s + v, 0);
  
  // Sort by total descending
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  
  container.innerHTML = sorted.map(([key, value]) => {
    const cat = categories[key];
    const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
    const itemCount = items[key] ? items[key].length : 0;
    return `
      <div class="category-item" data-category="${key}" style="cursor: pointer;">
        <div class="category-color" style="background: ${cat?.color || '#999'}"></div>
        <div class="category-info">
          <div class="category-name">${cat?.icon || '📦'} ${cat?.name || key}</div>
          <div class="category-desc">${percent}% del total${itemCount > 0 ? ` • ${itemCount} productos` : ''}</div>
        </div>
        <div class="category-value">
          ${formatCurrency(value)}
        </div>
      </div>
    `;
  }).join('');
  
  // Add click handler to filter products
  container.querySelectorAll('.category-item').forEach(item => {
    item.addEventListener('click', () => {
      const cat = item.dataset.category;
      const catFilter = document.getElementById('categoryProductFilter');
      if (catFilter) {
        catFilter.value = cat;
        catFilter.dispatchEvent(new Event('change'));
      }
    });
  });
}

// Render products by category with filters
function renderCategoryProducts(categoryItems) {
  const container = document.getElementById('categoryProductList');
  const catFilter = document.getElementById('categoryProductFilter');
  const monthFilter = document.getElementById('monthProductFilter');
  const categories = ticketsData.categories;
  const tickets = getFilteredTickets();
  
  // Populate category filter
  catFilter.innerHTML = '<option value="all">Todas las categorías</option>';
  Object.entries(categories).forEach(([key, cat]) => {
    catFilter.innerHTML += `<option value="${key}">${cat.icon} ${cat.name}</option>`;
  });
  
  // Populate month filter
  const months = new Set();
  tickets.forEach(t => months.add(t.date.substring(0, 7)));
  const sortedMonths = Array.from(months).sort().reverse();
  monthFilter.innerHTML = '<option value="all">Todos los meses</option>';
  sortedMonths.forEach(m => {
    monthFilter.innerHTML += `<option value="${m}">${formatMonth(m)}</option>`;
  });
  
  // Filter and render function
  function filterAndRender() {
    const selectedCat = catFilter.value;
    const selectedMonth = monthFilter.value;
    
    // Collect products based on filters
    let allProducts = [];
    
    tickets.forEach(ticket => {
      const ticketMonth = ticket.date.substring(0, 7);
      if (selectedMonth !== 'all' && ticketMonth !== selectedMonth) return;
      
      if (ticket.items && ticket.items.length > 0) {
        ticket.items.forEach(item => {
          const itemCat = item.category || categorizeProduct(item.name);
          if (selectedCat !== 'all' && itemCat !== selectedCat) return;
          
          const existing = allProducts.find(p => p.name === item.name);
          // item.price is already the line total
          const itemTotal = item.price;
          const unitPrice = item.unitPrice || (item.price / (item.quantity || 1));
          
          if (existing) {
            existing.quantity += item.quantity;
            existing.total += itemTotal;
          } else {
            allProducts.push({
              name: item.name,
              quantity: item.quantity,
              price: unitPrice,
              total: itemTotal,
              category: itemCat
            });
          }
        });
      }
    });
    
    // Sort by total spent
    allProducts.sort((a, b) => b.total - a.total);
    
    if (allProducts.length === 0) {
      container.innerHTML = `
        <div class="no-data" style="padding: 30px;">
          <div class="no-data-icon">📦</div>
          <p>No hay productos para los filtros seleccionados</p>
          <p style="font-size: 0.8rem; color: var(--text-muted);">Solo los tickets con items detallados se muestran aquí</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="search-box">
        <input type="text" id="categoryProductSearch" placeholder="Buscar producto...">
      </div>
      <div class="table-container" style="max-height: 400px; overflow-y: auto;">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Cantidad</th>
              <th>Precio unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${allProducts.map(p => {
              const cat = categories[p.category];
              return `
                <tr data-name="${p.name.toLowerCase()}">
                  <td><strong>${p.name}</strong></td>
                  <td><span style="color: ${cat?.color || '#999'}">${cat?.icon || '📦'} ${cat?.name || p.category}</span></td>
                  <td>${p.quantity}</td>
                  <td>${formatCurrency(p.price)}</td>
                  <td><strong>${formatCurrency(p.total)}</strong></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="padding: 12px; background: #f7fafc; border-radius: 8px; margin-top: 12px;">
        <strong>Total:</strong> ${formatCurrency(allProducts.reduce((s, p) => s + p.total, 0))} 
        <span style="color: var(--text-secondary); margin-left: 12px;">(${allProducts.length} productos, ${allProducts.reduce((s, p) => s + p.quantity, 0)} unidades)</span>
      </div>
    `;
    
    // Setup search
    const searchInput = document.getElementById('categoryProductSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const rows = container.querySelectorAll('tbody tr');
        rows.forEach(row => {
          const name = row.dataset.name;
          row.style.display = name.includes(term) ? '' : 'none';
        });
      });
    }
  }
  
  // Add event listeners
  catFilter.addEventListener('change', filterAndRender);
  monthFilter.addEventListener('change', filterAndRender);
  
  // Initial render
  filterAndRender();
}

// ============================================
// PRODUCTS TAB
// ============================================
function renderProducts() {
  const tickets = getFilteredTickets();
  const categories = ticketsData.categories;
  
  // Collect all products
  const products = {};
  let ticketsWithItems = 0;
  
  tickets.forEach(ticket => {
    if (ticket.items && ticket.items.length > 0) {
      ticketsWithItems++;
      ticket.items.forEach(item => {
        const key = item.name;
        // item.price is already the line total
        const itemTotal = item.price;
        const unitPrice = item.unitPrice || (item.price / (item.quantity || 1));
        
        if (!products[key]) {
          products[key] = {
            name: item.name,
            category: item.category || categorizeProduct(item.name),
            totalQty: 0,
            totalSpent: 0,
            purchases: []
          };
        }
        products[key].totalQty += item.quantity;
        products[key].totalSpent += itemTotal;
        products[key].purchases.push({
          date: ticket.date,
          price: unitPrice,
          qty: item.quantity
        });
      });
    }
  });
  
  // Sort by total spent
  const sorted = Object.values(products).sort((a, b) => b.totalSpent - a.totalSpent);
  
  // Render top products chart
  renderTopProductsChart(sorted.slice(0, 10));
  
  // Render product table with info
  renderProductTable(sorted, tickets.length, ticketsWithItems, categories);
}

function renderTopProductsChart(products) {
  if (charts.topProducts) {
    charts.topProducts.destroy();
  }
  
  const ctx = document.getElementById('topProductsChart');
  if (!ctx) return;
  
  if (products.length === 0) {
    ctx.parentElement.innerHTML = `
      <div class="no-data" style="height: 300px; display: flex; flex-direction: column; justify-content: center;">
        <div class="no-data-icon">📊</div>
        <p>No hay datos de productos disponibles</p>
      </div>
    `;
    return;
  }
  
  const categories = ticketsData.categories;
  
  charts.topProducts = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: products.map(p => truncate(p.name, 20)),
      datasets: [{
        label: 'Gasto total',
        data: products.map(p => p.totalSpent),
        backgroundColor: products.map(p => {
          const cat = categories[p.category];
          return cat?.color || 'rgba(118, 75, 162, 0.8)';
        }),
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
            label: ctx => formatCurrency(ctx.raw)
          }
        }
      },
      scales: {
        x: {
          ticks: { callback: v => formatCurrency(v) }
        }
      }
    }
  });
}

function renderProductTable(products, totalTickets, ticketsWithItems, categories) {
  const container = document.getElementById('productTable');
  if (!container) return;
  
  if (products.length === 0) {
    container.innerHTML = `
      <div class="no-data">
        <div class="no-data-icon">📦</div>
        <p>No hay productos detallados disponibles</p>
        <p style="font-size: 0.8rem; color: var(--text-muted);">
          ${ticketsWithItems} de ${totalTickets} tickets tienen items detallados
        </p>
      </div>
    `;
    return;
  }
  
  const totalSpent = products.reduce((s, p) => s + p.totalSpent, 0);
  const totalItems = products.reduce((s, p) => s + p.totalQty, 0);
  
  container.innerHTML = `
    <div class="alert alert-info" style="margin-bottom: 16px;">
      <h4>📊 Resumen de productos</h4>
      <p>${products.length} productos únicos • ${totalItems} unidades • ${formatCurrency(totalSpent)} gastado</p>
      <p style="font-size: 0.75rem; color: var(--text-muted);">Datos de ${ticketsWithItems} tickets con items detallados</p>
    </div>
    <div class="search-box">
      <input type="text" id="productSearch" placeholder="Buscar producto...">
    </div>
    <div class="table-container" style="max-height: 500px; overflow-y: auto;">
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Cantidad</th>
            <th>Precio medio</th>
            <th>Total gastado</th>
          </tr>
        </thead>
        <tbody>
          ${products.map(p => {
            const cat = categories[p.category];
            return `
              <tr data-name="${p.name.toLowerCase()}">
                <td><strong>${p.name}</strong></td>
                <td><span style="color: ${cat?.color || '#999'}">${cat?.icon || '📦'}</span> ${cat?.name || p.category}</td>
                <td>${p.totalQty}</td>
                <td>${formatCurrency(p.totalSpent / p.totalQty)}</td>
                <td><strong>${formatCurrency(p.totalSpent)}</strong></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  // Setup search
  const searchInput = document.getElementById('productSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const rows = container.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const name = row.dataset.name;
        row.style.display = name.includes(term) ? '' : 'none';
      });
    });
  }
}

// ============================================
// PRICE HISTORY TAB
// ============================================
function renderPriceHistory() {
  const history = ticketsData.productHistory;
  if (!history || Object.keys(history).length === 0) {
    document.getElementById('priceHistoryContent').innerHTML = `
      <div class="no-data">
        <div class="no-data-icon">📈</div>
        <p>No hay historial de precios disponible</p>
      </div>
    `;
    return;
  }
  
  // Calculate price changes
  const priceChanges = [];
  Object.entries(history).forEach(([product, entries]) => {
    if (entries.length >= 2) {
      const sorted = [...entries].sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const change = last.price - first.price;
      const changePercent = ((change / first.price) * 100).toFixed(1);
      
      priceChanges.push({
        product,
        firstPrice: first.price,
        firstDate: first.date,
        lastPrice: last.price,
        lastDate: last.date,
        change,
        changePercent: parseFloat(changePercent),
        entries: sorted
      });
    }
  });
  
  // Sort by absolute change
  priceChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  
  // Render general price summary
  renderPriceSummary(priceChanges);
  
  // Render general trend chart
  renderGeneralPriceTrendChart(priceChanges);
  
  // Render price chart for selected product (default first one)
  renderPriceChangeChart(priceChanges[0]);
  
  // Render price change table
  renderPriceChangeTable(priceChanges);
  
  // Setup product selector
  setupPriceProductSelector(priceChanges);
}

function renderPriceSummary(changes) {
  const container = document.getElementById('priceSummaryCards');
  if (!container || changes.length === 0) return;
  
  const increases = changes.filter(c => c.changePercent > 0);
  const decreases = changes.filter(c => c.changePercent < 0);
  const stable = changes.filter(c => c.changePercent === 0);
  
  const avgChange = changes.reduce((sum, c) => sum + c.changePercent, 0) / changes.length;
  
  // Calculate weighted average (by number of purchases)
  const totalPurchases = changes.reduce((sum, c) => sum + c.entries.length, 0);
  const weightedAvg = changes.reduce((sum, c) => sum + (c.changePercent * c.entries.length), 0) / totalPurchases;
  
  // Top increase and decrease
  const topIncrease = increases.length > 0 ? increases.reduce((max, c) => c.changePercent > max.changePercent ? c : max) : null;
  const topDecrease = decreases.length > 0 ? decreases.reduce((min, c) => c.changePercent < min.changePercent ? c : min) : null;
  
  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-icon" style="background: ${avgChange >= 0 ? 'linear-gradient(135deg, #f56565, #c53030)' : 'linear-gradient(135deg, #48bb78, #2f855a)'};">
        ${avgChange >= 0 ? '📈' : '📉'}
      </div>
      <div class="stat-info">
        <h3>Variación Media</h3>
        <p class="stat-value" style="color: ${avgChange >= 0 ? 'var(--danger)' : 'var(--success)'};">
          ${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(1)}%
        </p>
        <small>${changes.length} productos con historial</small>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon" style="background: linear-gradient(135deg, #f56565, #c53030);">📈</div>
      <div class="stat-info">
        <h3>Subidas de Precio</h3>
        <p class="stat-value">${increases.length}</p>
        <small>${((increases.length / changes.length) * 100).toFixed(0)}% del total</small>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon" style="background: linear-gradient(135deg, #48bb78, #2f855a);">📉</div>
      <div class="stat-info">
        <h3>Bajadas de Precio</h3>
        <p class="stat-value">${decreases.length}</p>
        <small>${((decreases.length / changes.length) * 100).toFixed(0)}% del total</small>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon" style="background: linear-gradient(135deg, #667eea, #5a67d8);">⚖️</div>
      <div class="stat-info">
        <h3>Precio Estable</h3>
        <p class="stat-value">${stable.length}</p>
        <small>${((stable.length / changes.length) * 100).toFixed(0)}% del total</small>
      </div>
    </div>
    
    ${topIncrease ? `
    <div class="stat-card">
      <div class="stat-icon" style="background: linear-gradient(135deg, #ed8936, #dd6b20);">🔥</div>
      <div class="stat-info">
        <h3>Mayor Subida</h3>
        <p class="stat-value" style="font-size: 1rem;">${truncate(topIncrease.product, 25)}</p>
        <small style="color: var(--danger);">+${topIncrease.changePercent.toFixed(1)}% (${formatCurrency(topIncrease.firstPrice)} → ${formatCurrency(topIncrease.lastPrice)})</small>
      </div>
    </div>
    ` : ''}
    
    ${topDecrease ? `
    <div class="stat-card">
      <div class="stat-icon" style="background: linear-gradient(135deg, #4299e1, #3182ce);">💰</div>
      <div class="stat-info">
        <h3>Mayor Bajada</h3>
        <p class="stat-value" style="font-size: 1rem;">${truncate(topDecrease.product, 25)}</p>
        <small style="color: var(--success);">${topDecrease.changePercent.toFixed(1)}% (${formatCurrency(topDecrease.firstPrice)} → ${formatCurrency(topDecrease.lastPrice)})</small>
      </div>
    </div>
    ` : ''}
  `;
}

function renderGeneralPriceTrendChart(changes) {
  const canvas = document.getElementById('generalPriceTrendChart');
  if (!canvas || changes.length === 0) return;
  
  if (charts.generalPriceTrend) charts.generalPriceTrend.destroy();
  
  // Group changes by percent range
  const ranges = {
    '>+20%': 0,
    '+10% a +20%': 0,
    '+5% a +10%': 0,
    '0% a +5%': 0,
    '-5% a 0%': 0,
    '-10% a -5%': 0,
    '-20% a -10%': 0,
    '<-20%': 0
  };
  
  changes.forEach(c => {
    const p = c.changePercent;
    if (p > 20) ranges['>+20%']++;
    else if (p > 10) ranges['+10% a +20%']++;
    else if (p > 5) ranges['+5% a +10%']++;
    else if (p >= 0) ranges['0% a +5%']++;
    else if (p > -5) ranges['-5% a 0%']++;
    else if (p > -10) ranges['-10% a -5%']++;
    else if (p > -20) ranges['-20% a -10%']++;
    else ranges['<-20%']++;
  });
  
  const labels = Object.keys(ranges);
  const data = Object.values(ranges);
  const colors = [
    '#c53030', '#e53e3e', '#f56565', '#fc8181',  // Reds for increases
    '#68d391', '#48bb78', '#38a169', '#2f855a'   // Greens for decreases
  ];
  
  charts.generalPriceTrend = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Productos',
        data,
        backgroundColor: colors,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.raw} productos (${((ctx.raw / changes.length) * 100).toFixed(1)}%)`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          title: { display: true, text: 'Número de productos' }
        }
      }
    }
  });
}

function renderPriceChangeChart(item) {
  if (!item) return;
  
  if (charts.priceHistory) {
    charts.priceHistory.destroy();
  }
  
  const ctx = document.getElementById('priceHistoryChart');
  if (!ctx) return;
  
  const labels = item.entries.map(e => formatDate(e.date));
  const data = item.entries.map(e => e.price);
  
  // Calculate trend line color
  const isIncrease = item.change > 0;
  const color = isIncrease ? '#f56565' : '#48bb78';
  
  charts.priceHistory = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: item.product,
        data,
        borderColor: color,
        backgroundColor: isIncrease ? 'rgba(245, 101, 101, 0.1)' : 'rgba(72, 187, 120, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 6,
        pointHoverRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `Evolución del precio: ${item.product}`,
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
          ticks: { callback: v => formatCurrency(v) }
        }
      }
    }
  });
}

function renderPriceChangeTable(changes) {
  const container = document.getElementById('priceChangeTable');
  if (!container) return;
  
  container.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Precio inicial</th>
            <th>Precio actual</th>
            <th>Variación</th>
          </tr>
        </thead>
        <tbody>
          ${changes.map(p => {
            const changeClass = p.change > 0 ? 'increase' : (p.change < 0 ? 'decrease' : 'same');
            const changeIcon = p.change > 0 ? '📈' : (p.change < 0 ? '📉' : '➖');
            return `
              <tr class="price-row" data-product="${p.product}">
                <td>${p.product}</td>
                <td>${formatCurrency(p.firstPrice)}<br><small>${p.firstDate}</small></td>
                <td>${formatCurrency(p.lastPrice)}<br><small>${p.lastDate}</small></td>
                <td>
                  <span class="price-change ${changeClass}">
                    ${changeIcon} ${p.change > 0 ? '+' : ''}${formatCurrency(p.change)} (${p.changePercent}%)
                  </span>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  // Click to show chart
  container.querySelectorAll('.price-row').forEach(row => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => {
      const product = row.dataset.product;
      const item = changes.find(c => c.product === product);
      if (item) {
        renderPriceChangeChart(item);
        // Update selector
        const selector = document.getElementById('priceProductSelector');
        if (selector) selector.value = product;
      }
    });
  });
}

function setupPriceProductSelector(changes) {
  const selector = document.getElementById('priceProductSelector');
  if (!selector) return;
  
  selector.innerHTML = changes.map(c => 
    `<option value="${c.product}">${c.product}</option>`
  ).join('');
  
  selector.addEventListener('change', () => {
    const item = changes.find(c => c.product === selector.value);
    if (item) renderPriceChangeChart(item);
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function formatCurrency(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
}

function formatMonth(yearMonth) {
  if (!yearMonth) return '-';
  const [year, month] = yearMonth.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', { 
    day: 'numeric',
    month: 'short',
    year: '2-digit'
  });
}

function truncate(str, length) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

function showError(message) {
  document.body.innerHTML = `
    <div class="container">
      <div class="card" style="text-align: center; padding: 40px;">
        <div style="font-size: 3rem; margin-bottom: 16px;">⚠️</div>
        <h2>Error</h2>
        <p style="color: var(--text-secondary);">${message}</p>
      </div>
    </div>
  `;
}

// ============================================
// DARK MODE
// ============================================
let currentStore = 'all';

function setupDarkMode() {
  const btn = document.getElementById('darkModeToggle');
  if (!btn) return;
  
  // Check saved preference
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    btn.textContent = '☀️';
  }
  
  btn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    btn.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('darkMode', isDark);
    
    // Re-render charts with updated colors
    Object.values(charts).forEach(chart => {
      if (chart) chart.update();
    });
  });
}

// ============================================
// EXPORT FUNCTIONALITY
// ============================================
function setupExport() {
  const btn = document.getElementById('exportBtn');
  if (!btn) return;
  
  btn.addEventListener('click', showExportModal);
}

function showExportModal() {
  const tickets = getFilteredTickets();
  
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content">
      <span class="modal-close">&times;</span>
      <h3>📥 Exportar Datos</h3>
      <p style="margin: 16px 0; color: var(--text-secondary);">
        Exportar ${tickets.length} tickets del período seleccionado
      </p>
      <div class="stats-grid">
        <button class="btn-small" onclick="exportCSV()">📄 Exportar CSV</button>
        <button class="btn-small" onclick="exportSummary()">📊 Resumen TXT</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.querySelector('.modal-close').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function exportCSV() {
  const tickets = getFilteredTickets();
  let csv = 'Fecha,Tienda,Total,Productos\n';
  
  tickets.forEach(t => {
    const store = typeof t.store === 'object' ? t.store.city : t.store;
    csv += `${t.date},${store},${t.total.toFixed(2)},${t.itemCount}\n`;
  });
  
  downloadFile(csv, 'mercadona_tickets.csv', 'text/csv');
  document.querySelector('.modal').remove();
}

function exportSummary() {
  const tickets = getFilteredTickets();
  const total = tickets.reduce((sum, t) => sum + t.total, 0);
  
  let txt = '=== RESUMEN MERCADONA ===\n\n';
  txt += `Período: ${currentYear === 'all' ? 'Todos' : currentYear}\n`;
  txt += `Total tickets: ${tickets.length}\n`;
  txt += `Gasto total: ${formatCurrency(total)}\n`;
  txt += `Media por ticket: ${formatCurrency(total / tickets.length)}\n\n`;
  txt += '--- DETALLE POR MES ---\n';
  
  const monthly = {};
  tickets.forEach(t => {
    const m = t.date.substring(0, 7);
    monthly[m] = (monthly[m] || 0) + t.total;
  });
  
  Object.entries(monthly).sort().forEach(([m, v]) => {
    txt += `${formatMonth(m)}: ${formatCurrency(v)}\n`;
  });
  
  downloadFile(txt, 'mercadona_resumen.txt', 'text/plain');
  document.querySelector('.modal').remove();
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================
// STORE FILTER
// ============================================
function setupStoreFilter() {
  const selector = document.getElementById('storeFilter');
  if (!selector || !ticketsData) return;
  
  const stores = new Set();
  ticketsData.tickets.forEach(t => {
    const store = typeof t.store === 'object' ? t.store.city : t.store;
    if (store) stores.add(store);
  });
  
  selector.innerHTML = '<option value="all">Todas las tiendas</option>';
  Array.from(stores).sort().forEach(s => {
    selector.innerHTML += `<option value="${s}">${s}</option>`;
  });
  
  selector.addEventListener('change', (e) => {
    currentStore = e.target.value;
    renderAllViews();
  });
}

function getFilteredTickets() {
  let tickets = ticketsData.tickets;
  
  if (currentYear !== 'all') {
    tickets = tickets.filter(t => t.date.startsWith(currentYear));
  }
  
  if (currentStore !== 'all') {
    tickets = tickets.filter(t => {
      const store = typeof t.store === 'object' ? t.store.city : t.store;
      return store === currentStore;
    });
  }
  
  return tickets;
}

// ============================================
// PRODUCT SEARCH
// ============================================
function setupProductSearch() {
  const input = document.getElementById('productSearch');
  const results = document.getElementById('searchResults');
  if (!input || !results) return;
  
  input.addEventListener('input', debounce(() => {
    const query = input.value.toLowerCase().trim();
    if (query.length < 2) {
      results.innerHTML = '';
      return;
    }
    
    const tickets = getFilteredTickets();
    const matches = [];
    
    tickets.forEach(t => {
      if (!t.items) return;
      t.items.forEach(item => {
        if (item.name.toLowerCase().includes(query)) {
          matches.push({
            name: item.name,
            price: item.unitPrice || item.price,
            date: t.date,
            store: typeof t.store === 'object' ? t.store.city : t.store
          });
        }
      });
    });
    
    // Group by product name
    const grouped = {};
    matches.forEach(m => {
      if (!grouped[m.name]) {
        grouped[m.name] = { count: 0, prices: [], dates: [] };
      }
      grouped[m.name].count++;
      grouped[m.name].prices.push(m.price);
      grouped[m.name].dates.push(m.date);
    });
    
    results.innerHTML = Object.entries(grouped)
      .slice(0, 10)
      .map(([name, data]) => {
        const avgPrice = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
        const minPrice = Math.min(...data.prices);
        const maxPrice = Math.max(...data.prices);
        return `
          <div class="product-item">
            <div class="product-name">${name}</div>
            <div class="product-details">
              <span>Comprado ${data.count}x</span>
              <span>Precio: ${formatCurrency(avgPrice)}</span>
              ${minPrice !== maxPrice ? `<span>(${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)})</span>` : ''}
            </div>
          </div>
        `;
      }).join('') || '<p style="padding:16px;color:var(--text-muted);">Sin resultados</p>';
  }, 300));
}

function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ============================================
// WEEKLY CHART
// ============================================
function renderWeeklyChart() {
  const canvas = document.getElementById('weeklyChart');
  if (!canvas) return;
  
  const tickets = getFilteredTickets();
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayTotals = new Array(7).fill(0);
  const dayCounts = new Array(7).fill(0);
  
  tickets.forEach(t => {
    const day = parseLocalDate(t.date).getDay();
    dayTotals[day] += t.total;
    dayCounts[day]++;
  });
  
  // Find favorite day
  const favoriteIndex = dayCounts.indexOf(Math.max(...dayCounts));
  const favoriteDay = document.getElementById('favoriteDay');
  if (favoriteDay) {
    favoriteDay.textContent = days[favoriteIndex];
  }
  
  if (charts.weekly) charts.weekly.destroy();
  
  charts.weekly = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: days,
      datasets: [{
        data: dayCounts,
        backgroundColor: [
          '#f56565', '#ed8936', '#ecc94b', '#48bb78',
          '#4299e1', '#667eea', '#9f7aea'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.label}: ${ctx.raw} visitas (${formatCurrency(dayTotals[ctx.dataIndex])})`
          }
        }
      }
    }
  });
}

// ============================================
// COMPARISON SECTION
// ============================================
function renderComparison() {
  const tickets = getFilteredTickets();
  if (tickets.length < 2) return;
  
  // Sort by date
  const sorted = [...tickets].sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
  
  // Get last 30 days vs previous 30 days
  const now = parseLocalDate(sorted[0].date);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  const recent = sorted.filter(t => parseLocalDate(t.date) >= thirtyDaysAgo);
  const previous = sorted.filter(t => {
    const d = parseLocalDate(t.date);
    return d >= sixtyDaysAgo && d < thirtyDaysAgo;
  });
  
  const recentTotal = recent.reduce((s, t) => s + t.total, 0);
  const previousTotal = previous.reduce((s, t) => s + t.total, 0);
  const recentCount = recent.length;
  const previousCount = previous.length;
  
  const spendChange = previousTotal ? ((recentTotal - previousTotal) / previousTotal * 100) : 0;
  const countChange = previousCount ? ((recentCount - previousCount) / previousCount * 100) : 0;
  
  const recentAvg = recentCount ? recentTotal / recentCount : 0;
  const previousAvg = previousCount ? previousTotal / previousCount : 0;
  const avgChange = previousAvg ? ((recentAvg - previousAvg) / previousAvg * 100) : 0;
  
  const grid = document.getElementById('comparisonGrid');
  if (grid) {
    grid.innerHTML = `
      <div class="comparison-card">
        <div class="label">Gasto últimos 30 días</div>
        <div class="value">${formatCurrency(recentTotal)}</div>
        <div class="change ${spendChange > 0 ? 'positive' : 'negative'}">
          ${spendChange > 0 ? '↑' : '↓'} ${Math.abs(spendChange).toFixed(1)}% vs período anterior
        </div>
      </div>
      <div class="comparison-card">
        <div class="label">Compras últimos 30 días</div>
        <div class="value">${recentCount}</div>
        <div class="change ${countChange > 0 ? 'positive' : 'negative'}">
          ${countChange > 0 ? '↑' : '↓'} ${Math.abs(countChange).toFixed(1)}% vs período anterior
        </div>
      </div>
      <div class="comparison-card">
        <div class="label">Media por compra</div>
        <div class="value">${formatCurrency(recentAvg)}</div>
        <div class="change ${avgChange > 0 ? 'positive' : 'negative'}">
          ${avgChange > 0 ? '↑' : '↓'} ${Math.abs(avgChange).toFixed(1)}% vs período anterior
        </div>
      </div>
    `;
  }
}

// ============================================
// TICKETS LIST
// ============================================
let ticketPage = 1;
const ticketsPerPage = 15;
let currentTicketSort = 'date-desc';
let ticketSearchQuery = '';

function renderTicketsList() {
  const container = document.getElementById('ticketsList');
  if (!container) return;
  
  let tickets = getFilteredTickets();
  
  // Apply search filter
  if (ticketSearchQuery) {
    tickets = tickets.filter(t => {
      const store = typeof t.store === 'object' ? t.store.city : t.store;
      return t.date.includes(ticketSearchQuery) || 
             (store && store.toLowerCase().includes(ticketSearchQuery.toLowerCase())) ||
             (t.items && t.items.some(i => i.name.toLowerCase().includes(ticketSearchQuery.toLowerCase())));
    });
  }
  
  // Sort tickets
  const sorted = sortTickets(tickets, currentTicketSort);
  
  // Render stats
  renderTicketStats(sorted);
  
  // Pagination
  const totalPages = Math.ceil(sorted.length / ticketsPerPage);
  const start = (ticketPage - 1) * ticketsPerPage;
  const pageTickets = sorted.slice(start, start + ticketsPerPage);
  
  container.innerHTML = pageTickets.map(t => {
    const store = typeof t.store === 'object' ? t.store.city : t.store;
    return `
      <div class="ticket-item" onclick="showTicketDetail('${t.id}')">
        <div>
          <div class="ticket-date">${formatDate(t.date)}</div>
          <div class="ticket-store">${store || 'Mercadona'}</div>
        </div>
        <div class="ticket-items-count">${t.itemCount} productos</div>
        <div class="ticket-total">${formatCurrency(t.total)}</div>
      </div>
    `;
  }).join('') || '<p style="padding: 20px; text-align: center; color: var(--text-muted);">No se encontraron tickets</p>';
  
  // Render pagination
  renderTicketPagination(totalPages);
  
  // Setup sort and search handlers (only once)
  setupTicketControls();
}

function sortTickets(tickets, sortBy) {
  const sorted = [...tickets];
  switch(sortBy) {
    case 'date-desc': return sorted.sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
    case 'date-asc': return sorted.sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));
    case 'total-desc': return sorted.sort((a, b) => b.total - a.total);
    case 'total-asc': return sorted.sort((a, b) => a.total - b.total);
    case 'items-desc': return sorted.sort((a, b) => b.itemCount - a.itemCount);
    default: return sorted;
  }
}

function renderTicketStats(tickets) {
  const container = document.getElementById('ticketStats');
  if (!container || tickets.length === 0) return;
  
  const total = tickets.reduce((s, t) => s + t.total, 0);
  const avg = total / tickets.length;
  const max = Math.max(...tickets.map(t => t.total));
  const min = Math.min(...tickets.map(t => t.total));
  const totalItems = tickets.reduce((s, t) => s + (t.itemCount || 0), 0);
  
  container.innerHTML = `
    <div class="stat-card compact">
      <div class="stat-info">
        <h3>Total</h3>
        <p class="stat-value">${formatCurrency(total)}</p>
      </div>
    </div>
    <div class="stat-card compact">
      <div class="stat-info">
        <h3>Media</h3>
        <p class="stat-value">${formatCurrency(avg)}</p>
      </div>
    </div>
    <div class="stat-card compact">
      <div class="stat-info">
        <h3>Mayor</h3>
        <p class="stat-value">${formatCurrency(max)}</p>
      </div>
    </div>
    <div class="stat-card compact">
      <div class="stat-info">
        <h3>Menor</h3>
        <p class="stat-value">${formatCurrency(min)}</p>
      </div>
    </div>
    <div class="stat-card compact">
      <div class="stat-info">
        <h3>Productos</h3>
        <p class="stat-value">${totalItems}</p>
      </div>
    </div>
  `;
}

function renderTicketPagination(totalPages) {
  const container = document.getElementById('ticketPagination');
  if (!container || totalPages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }
  
  let html = '';
  if (ticketPage > 1) {
    html += `<button class="btn-small" onclick="changeTicketPage(${ticketPage - 1})">← Anterior</button> `;
  }
  html += `<span style="margin: 0 16px;">Página ${ticketPage} de ${totalPages}</span>`;
  if (ticketPage < totalPages) {
    html += ` <button class="btn-small" onclick="changeTicketPage(${ticketPage + 1})">Siguiente →</button>`;
  }
  container.innerHTML = html;
}

function changeTicketPage(page) {
  ticketPage = page;
  renderTicketsList();
}

function setupTicketControls() {
  const sortSelect = document.getElementById('ticketSort');
  const searchInput = document.getElementById('ticketSearch');
  
  if (sortSelect && !sortSelect.dataset.initialized) {
    sortSelect.dataset.initialized = 'true';
    sortSelect.addEventListener('change', (e) => {
      currentTicketSort = e.target.value;
      ticketPage = 1;
      renderTicketsList();
    });
  }
  
  if (searchInput && !searchInput.dataset.initialized) {
    searchInput.dataset.initialized = 'true';
    searchInput.addEventListener('input', debounce((e) => {
      ticketSearchQuery = e.target.value.trim();
      ticketPage = 1;
      renderTicketsList();
    }, 300));
  }
}

function renderTicketCalendar(tickets) {
  const calendar = document.getElementById('ticketCalendar');
  if (!calendar || tickets.length === 0) return;
  
  // Get ticket dates with their totals
  const ticketsByDate = {};
  tickets.forEach(t => {
    if (!ticketsByDate[t.date]) {
      ticketsByDate[t.date] = { count: 0, total: 0, ids: [] };
    }
    ticketsByDate[t.date].count++;
    ticketsByDate[t.date].total += t.total;
    ticketsByDate[t.date].ids.push(t.id);
  });
  
  const dates = Object.keys(ticketsByDate);
  const sortedTickets = [...tickets].sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
  const lastDate = parseLocalDate(sortedTickets[0].date);
  
  // Show last 3 months
  let html = '<div class="calendar-months">';
  
  for (let m = 0; m < 3; m++) {
    const targetDate = new Date(lastDate.getFullYear(), lastDate.getMonth() - m, 1);
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();
    
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const firstDay = new Date(targetYear, targetMonth, 1).getDay();
    
    const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    let monthHtml = `
      <div class="calendar-month">
        <h4>${targetDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h4>
        <div class="calendar-grid">
          ${dayNames.map(d => `<div class="calendar-day calendar-header">${d}</div>`).join('')}
    `;
    
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      monthHtml += '<div class="calendar-day empty"></div>';
    }
    
    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const ticketData = ticketsByDate[dateStr];
      const hasTicket = !!ticketData;
      
      monthHtml += `
        <div class="calendar-day ${hasTicket ? 'has-ticket' : ''}" 
             ${hasTicket ? `onclick="showTicketDetail('${ticketData.ids[0]}')" title="${formatCurrency(ticketData.total)}"` : ''}>
          ${day}
          ${hasTicket && ticketData.count > 1 ? `<span class="ticket-badge">${ticketData.count}</span>` : ''}
        </div>
      `;
    }
    
    monthHtml += '</div></div>';
    html += monthHtml;
  }
  
  html += '</div>';
  calendar.innerHTML = html;
}

function showTicketDetail(id) {
  const ticket = ticketsData.tickets.find(t => t.id === id);
  if (!ticket) return;
  
  const store = typeof ticket.store === 'object' ? ticket.store : { city: ticket.store };
  
  // Group items by category
  const itemsByCategory = {};
  if (ticket.items) {
    ticket.items.forEach(item => {
      const cat = item.category || 'Otros';
      if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
      itemsByCategory[cat].push(item);
    });
  }
  
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <span class="modal-close">&times;</span>
      
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <div>
          <h3 style="margin: 0;">🧾 Ticket</h3>
          <p style="color: var(--text-secondary); margin: 4px 0 0 0;">
            ${store.city || 'Mercadona'}${store.address ? ` - ${store.address}` : ''}
          </p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.875rem; color: var(--text-secondary);">${formatDate(ticket.date)}</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--info);">${formatCurrency(ticket.total)}</div>
        </div>
      </div>
      
      ${ticket.items && ticket.items.length > 0 ? `
        <div style="max-height: 400px; overflow-y: auto;">
          ${Object.entries(itemsByCategory).map(([cat, items]) => `
            <div style="margin-bottom: 16px;">
              <h4 style="color: var(--primary); margin-bottom: 8px; font-size: 0.875rem; text-transform: uppercase;">
                ${getCategoryEmoji(cat)} ${cat}
              </h4>
              <table style="width: 100%;">
                <tbody>
                  ${items.map(item => `
                    <tr>
                      <td style="padding: 6px 0;">${item.name}</td>
                      <td style="text-align: right; color: var(--text-secondary); width: 60px;">
                        ${item.quantity > 1 ? item.quantity + ' ud' : ''}
                      </td>
                      <td style="text-align: right; font-weight: 600; width: 80px;">
                        ${formatCurrency(item.price)}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `).join('')}
        </div>
      ` : '<p style="color: var(--text-muted); text-align: center;">No hay detalles de productos</p>'}
      
      <div style="margin-top: 20px; padding-top: 16px; border-top: 2px solid #e2e8f0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span>Productos</span>
          <span>${ticket.itemCount}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 1.25rem; font-weight: 700;">
          <span>TOTAL</span>
          <span style="color: var(--info);">${formatCurrency(ticket.total)}</span>
        </div>
      </div>
      
      <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: flex-end;">
        <button class="btn-small" onclick="compareTicket('${ticket.id}')">📊 Comparar</button>
        <button class="btn-small" onclick="copyTicketToClipboard('${ticket.id}')">📋 Copiar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.querySelector('.modal-close').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function getCategoryEmoji(category) {
  const emojis = {
    'proteinas': '🥩',
    'frutas_verduras': '🥬',
    'lacteos': '🧀',
    'despensa': '🥫',
    'bebidas': '🥤',
    'congelados': '🧊',
    'higiene_limpieza': '🧴',
    'dulces_snacks': '🍪',
    'otros': '📦'
  };
  return emojis[category] || '📦';
}

function compareTicket(id) {
  const ticket = ticketsData.tickets.find(t => t.id === id);
  if (!ticket) return;
  
  // Find similar tickets (within 20% total)
  const similar = ticketsData.tickets.filter(t => 
    t.id !== id && 
    Math.abs(t.total - ticket.total) / ticket.total < 0.2
  ).slice(0, 5);
  
  alert(`Tickets similares a ${formatCurrency(ticket.total)}:\n\n` + 
    similar.map(t => `${formatDate(t.date)}: ${formatCurrency(t.total)}`).join('\n') ||
    'No hay tickets similares');
}

function copyTicketToClipboard(id) {
  const ticket = ticketsData.tickets.find(t => t.id === id);
  if (!ticket) return;
  
  const store = typeof ticket.store === 'object' ? ticket.store.city : ticket.store;
  let text = `MERCADONA - ${store}\n${ticket.date}\n\n`;
  
  if (ticket.items) {
    ticket.items.forEach(item => {
      text += `${item.name} ${item.quantity > 1 ? '(' + item.quantity + ')' : ''}: ${formatCurrency(item.price)}\n`;
    });
  }
  text += `\nTOTAL: ${formatCurrency(ticket.total)}`;
  
  navigator.clipboard.writeText(text).then(() => {
    alert('Ticket copiado al portapapeles');
  });
}

// ============================================
// INSIGHTS
// ============================================
function renderInsights() {
  renderPriceAlerts();
  renderPredictions();
  renderShoppingHabits();
  renderCategoryTrends();
  renderShoppingPatterns();
  renderSavingsOpportunities();
}

function renderPriceAlerts() {
  const container = document.getElementById('priceAlerts');
  if (!container) return;
  
  const tickets = getFilteredTickets();
  const priceHistory = {};
  
  tickets.forEach(t => {
    if (!t.items) return;
    t.items.forEach(item => {
      const price = item.unitPrice || item.price;
      if (!priceHistory[item.name]) {
        priceHistory[item.name] = [];
      }
      priceHistory[item.name].push({ price, date: t.date });
    });
  });
  
  const alerts = [];
  Object.entries(priceHistory).forEach(([name, history]) => {
    if (history.length < 2) return;
    
    const sorted = history.sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));
    const firstPrice = sorted[0].price;
    const lastPrice = sorted[sorted.length - 1].price;
    const change = ((lastPrice - firstPrice) / firstPrice * 100);
    
    if (Math.abs(change) > 10) {
      alerts.push({ name, firstPrice, lastPrice, change });
    }
  });
  
  // Sort by absolute change
  alerts.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  
  container.innerHTML = alerts.slice(0, 8).map(a => `
    <div class="alert-item ${a.change < 0 ? 'decrease' : ''}">
      <div class="product-name">${truncate(a.name, 35)}</div>
      <div class="price-info">
        <div class="old-price">${formatCurrency(a.firstPrice)}</div>
        <div class="new-price">${formatCurrency(a.lastPrice)} 
          <span style="color: ${a.change > 0 ? 'var(--danger)' : 'var(--success)'}">
            (${a.change > 0 ? '+' : ''}${a.change.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  `).join('') || '<p style="color: var(--text-muted); padding: 16px;">No hay alertas de precio significativas</p>';
}

function renderPredictions() {
  const container = document.getElementById('predictions');
  if (!container) return;
  
  const tickets = getFilteredTickets();
  if (tickets.length < 4) {
    container.innerHTML = '<p style="color: var(--text-muted);">Se necesitan más datos para predicciones</p>';
    return;
  }
  
  // Calculate monthly average
  const monthly = {};
  tickets.forEach(t => {
    const m = t.date.substring(0, 7);
    monthly[m] = (monthly[m] || 0) + t.total;
  });
  
  const values = Object.values(monthly);
  const avgMonthly = values.reduce((a, b) => a + b, 0) / values.length;
  
  // Weekly frequency
  const weeklyFreq = tickets.length / (values.length * 4.33);
  
  // Average basket
  const avgBasket = tickets.reduce((s, t) => s + t.total, 0) / tickets.length;
  
  // Predicted annual
  const annualPrediction = avgMonthly * 12;
  
  container.innerHTML = `
    <div class="prediction-card">
      <div class="prediction-value">${formatCurrency(avgMonthly)}</div>
      <div class="prediction-label">Gasto mensual estimado</div>
    </div>
    <div class="prediction-card" style="background: linear-gradient(135deg, #48bb78, #38a169);">
      <div class="prediction-value">${weeklyFreq.toFixed(1)}</div>
      <div class="prediction-label">Compras por semana</div>
    </div>
    <div class="prediction-card" style="background: linear-gradient(135deg, #ed8936, #dd6b20);">
      <div class="prediction-value">${formatCurrency(annualPrediction)}</div>
      <div class="prediction-label">Proyección anual</div>
    </div>
  `;
}

function renderShoppingHabits() {
  const container = document.getElementById('habitsGrid');
  if (!container) return;
  
  const tickets = getFilteredTickets();
  if (tickets.length === 0) return;
  
  // Most bought product
  const productCounts = {};
  tickets.forEach(t => {
    if (!t.items) return;
    t.items.forEach(item => {
      productCounts[item.name] = (productCounts[item.name] || 0) + (item.quantity || 1);
    });
  });
  const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];
  
  // Average items per ticket
  const avgItems = tickets.reduce((s, t) => s + (t.itemCount || 0), 0) / tickets.length;
  
  // Favorite time (if we had hour data, for now use weekday)
  const dayCounts = new Array(7).fill(0);
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  tickets.forEach(t => dayCounts[parseLocalDate(t.date).getDay()]++);
  const favoriteDay = days[dayCounts.indexOf(Math.max(...dayCounts))];
  
  // Top category
  const categoryCounts = {};
  tickets.forEach(t => {
    if (!t.items) return;
    t.items.forEach(item => {
      if (item.category) {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      }
    });
  });
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
  
  container.innerHTML = `
    <div class="habit-card">
      <div class="habit-icon">🛒</div>
      <div class="habit-content">
        <h4>Producto favorito</h4>
        <p>${topProduct ? `${topProduct[0]} (${topProduct[1]}x)` : 'Sin datos'}</p>
      </div>
    </div>
    <div class="habit-card">
      <div class="habit-icon">📦</div>
      <div class="habit-content">
        <h4>Productos por compra</h4>
        <p>${avgItems.toFixed(1)} productos de media</p>
      </div>
    </div>
    <div class="habit-card">
      <div class="habit-icon">📅</div>
      <div class="habit-content">
        <h4>Día preferido</h4>
        <p>${favoriteDay}</p>
      </div>
    </div>
    <div class="habit-card">
      <div class="habit-icon">🏷️</div>
      <div class="habit-content">
        <h4>Categoría top</h4>
        <p>${topCategory ? topCategory[0] : 'Sin categorizar'}</p>
      </div>
    </div>
  `;
}

function renderCategoryTrends() {
  const canvas = document.getElementById('categoryTrendsChart');
  if (!canvas) return;
  
  const tickets = getFilteredTickets();
  const monthlyCategories = {};
  
  tickets.forEach(t => {
    const month = t.date.substring(0, 7);
    if (!monthlyCategories[month]) monthlyCategories[month] = {};
    
    if (t.items) {
      t.items.forEach(item => {
        const cat = item.category || 'Otros';
        monthlyCategories[month][cat] = (monthlyCategories[month][cat] || 0) + item.price;
      });
    }
  });
  
  const months = Object.keys(monthlyCategories).sort();
  const categories = [...new Set(tickets.flatMap(t => (t.items || []).map(i => i.category || 'Otros')))];
  
  const colors = ['#667eea', '#48bb78', '#ed8936', '#f56565', '#9f7aea', '#4299e1', '#ecc94b', '#38b2ac', '#fc8181'];
  
  if (charts.categoryTrends) charts.categoryTrends.destroy();
  
  charts.categoryTrends = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: months.map(m => formatMonth(m)),
      datasets: categories.slice(0, 5).map((cat, i) => ({
        label: cat,
        data: months.map(m => monthlyCategories[m][cat] || 0),
        borderColor: colors[i % colors.length],
        backgroundColor: colors[i % colors.length] + '20',
        fill: true,
        tension: 0.3
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => formatCurrency(v) }
        }
      }
    }
  });
}

// ============================================
// BUDGET TRACKER
// ============================================
function setupBudgetTracker() {
  const input = document.getElementById('budgetInput');
  const btn = document.getElementById('setBudgetBtn');
  if (!input || !btn) return;
  
  // Load saved budget
  const saved = localStorage.getItem('monthlyBudget');
  if (saved) {
    input.value = saved;
    updateBudgetProgress(parseFloat(saved));
  }
  
  btn.addEventListener('click', () => {
    const budget = parseFloat(input.value);
    if (budget > 0) {
      localStorage.setItem('monthlyBudget', budget);
      updateBudgetProgress(budget);
    }
  });
}

function updateBudgetProgress(budget) {
  const progress = document.getElementById('budgetProgress');
  if (!progress) return;
  
  const tickets = getFilteredTickets();
  
  // Get all months with data
  const monthlySpending = {};
  tickets.forEach(t => {
    const month = t.date.substring(0, 7);
    monthlySpending[month] = (monthlySpending[month] || 0) + t.total;
  });
  
  const months = Object.keys(monthlySpending).sort().reverse();
  const currentMonth = months[0] || '';
  const spent = monthlySpending[currentMonth] || 0;
  
  const percentage = Math.min((spent / budget) * 100, 100);
  const remaining = budget - spent;
  
  // Calculate average vs budget
  const avgMonthly = Object.values(monthlySpending).reduce((a, b) => a + b, 0) / Math.max(Object.keys(monthlySpending).length, 1);
  const avgVsBudget = ((avgMonthly - budget) / budget * 100).toFixed(0);
  
  progress.innerHTML = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span>Gastado en ${formatMonth(currentMonth)}:</span>
      <span><strong>${formatCurrency(spent)}</strong></span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${percentage}%; background: ${percentage > 90 ? 'var(--danger)' : percentage > 70 ? 'var(--warning)' : 'var(--success)'}"></div>
      <span class="progress-text">${percentage.toFixed(0)}%</span>
    </div>
    <p style="margin-top: 12px; color: ${remaining >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: 600;">
      ${remaining >= 0 ? `✓ Te quedan ${formatCurrency(remaining)} este mes` : `⚠️ Te has pasado ${formatCurrency(Math.abs(remaining))}`}
    </p>
    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
      <div style="display: flex; justify-content: space-between; font-size: 0.875rem; color: var(--text-secondary);">
        <span>Media mensual histórica:</span>
        <span style="color: ${avgMonthly > budget ? 'var(--danger)' : 'var(--success)'}">
          ${formatCurrency(avgMonthly)} (${avgVsBudget > 0 ? '+' : ''}${avgVsBudget}% vs presupuesto)
        </span>
      </div>
    </div>
  `;
}

// ============================================
// SHOPPING PATTERNS CHART
// ============================================
function renderShoppingPatterns() {
  const canvas = document.getElementById('shoppingPatternsChart');
  if (!canvas) return;
  
  const tickets = getFilteredTickets();
  if (tickets.length === 0) return;
  
  // Calculate spending by day of week and hour patterns
  const dayData = new Array(7).fill(0);
  const dayCount = new Array(7).fill(0);
  const weekData = {};
  
  tickets.forEach(t => {
    const date = parseLocalDate(t.date);
    const day = date.getDay();
    dayData[day] += t.total;
    dayCount[day]++;
    
    // Weekly spending
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().substring(0, 10);
    weekData[weekKey] = (weekData[weekKey] || 0) + t.total;
  });
  
  const avgByDay = dayData.map((total, i) => dayCount[i] ? total / dayCount[i] : 0);
  
  if (charts.shoppingPatterns) charts.shoppingPatterns.destroy();
  
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  charts.shoppingPatterns = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: days,
      datasets: [
        {
          label: 'Gasto total',
          data: dayData,
          backgroundColor: 'rgba(102, 126, 234, 0.7)',
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          label: 'Media por compra',
          data: avgByDay,
          type: 'line',
          borderColor: '#ed8936',
          backgroundColor: 'transparent',
          pointBackgroundColor: '#ed8936',
          pointRadius: 6,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
          }
        }
      },
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Gasto total' },
          ticks: { callback: v => formatCurrency(v) }
        },
        y1: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'Media por compra' },
          ticks: { callback: v => formatCurrency(v) },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}

// ============================================
// SAVINGS OPPORTUNITIES
// ============================================
function renderSavingsOpportunities() {
  const container = document.getElementById('savingsOpportunities');
  if (!container) return;
  
  const tickets = getFilteredTickets();
  if (tickets.length < 5) {
    container.innerHTML = '<p style="color: var(--text-muted);">Se necesitan más datos para calcular oportunidades de ahorro</p>';
    return;
  }
  
  const opportunities = [];
  
  // 1. Products with price variations - could buy when cheaper
  const priceHistory = {};
  tickets.forEach(t => {
    if (!t.items) return;
    t.items.forEach(item => {
      const price = item.unitPrice || item.price / (item.quantity || 1);
      if (!priceHistory[item.name]) priceHistory[item.name] = [];
      priceHistory[item.name].push({ price, date: t.date, quantity: item.quantity || 1 });
    });
  });
  
  Object.entries(priceHistory).forEach(([name, history]) => {
    if (history.length < 3) return;
    const prices = history.map(h => h.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const totalQty = history.reduce((s, h) => s + h.quantity, 0);
    
    if (max > min * 1.15 && totalQty >= 5) {
      const potentialSaving = (avg - min) * totalQty;
      opportunities.push({
        type: 'price-variation',
        name,
        message: `Precio variable: ${formatCurrency(min)} - ${formatCurrency(max)}`,
        saving: potentialSaving,
        tip: `Comprando siempre al mejor precio podrías ahorrar ${formatCurrency(potentialSaving)}`
      });
    }
  });
  
  // 2. Frequent small purchases - could consolidate
  const monthlyVisits = {};
  tickets.forEach(t => {
    const month = t.date.substring(0, 7);
    if (!monthlyVisits[month]) monthlyVisits[month] = [];
    monthlyVisits[month].push(t.total);
  });
  
  const avgVisitsPerMonth = Object.values(monthlyVisits).reduce((s, v) => s + v.length, 0) / Object.keys(monthlyVisits).length;
  const avgTicketValue = tickets.reduce((s, t) => s + t.total, 0) / tickets.length;
  
  if (avgVisitsPerMonth > 8 && avgTicketValue < 50) {
    opportunities.push({
      type: 'consolidation',
      name: 'Compras frecuentes',
      message: `${avgVisitsPerMonth.toFixed(1)} compras/mes de media ${formatCurrency(avgTicketValue)}`,
      tip: 'Consolidar compras podría reducir compras impulsivas y ahorrar tiempo'
    });
  }
  
  // 3. Category analysis - most expensive categories
  const categorySpend = {};
  tickets.forEach(t => {
    if (!t.items) return;
    t.items.forEach(item => {
      const cat = item.category || 'otros';
      categorySpend[cat] = (categorySpend[cat] || 0) + item.price;
    });
  });
  
  const totalSpend = Object.values(categorySpend).reduce((a, b) => a + b, 0);
  const topCategories = Object.entries(categorySpend)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  topCategories.forEach(([cat, spend]) => {
    const percent = (spend / totalSpend * 100).toFixed(0);
    if (percent > 25) {
      opportunities.push({
        type: 'category',
        name: `Alto gasto en ${cat}`,
        message: `${percent}% del gasto total (${formatCurrency(spend)})`,
        tip: `Considera buscar alternativas más económicas en ${cat}`
      });
    }
  });
  
  // Sort by potential saving
  opportunities.sort((a, b) => (b.saving || 0) - (a.saving || 0));
  
  container.innerHTML = opportunities.length > 0 ? 
    opportunities.slice(0, 6).map(opp => `
      <div class="habit-card" style="border-left: 4px solid ${opp.type === 'price-variation' ? 'var(--warning)' : opp.type === 'consolidation' ? 'var(--info)' : 'var(--primary)'};">
        <div class="habit-icon">${opp.type === 'price-variation' ? '💰' : opp.type === 'consolidation' ? '🛒' : '📊'}</div>
        <div class="habit-content">
          <h4>${opp.name}</h4>
          <p style="font-size: 0.875rem; color: var(--text-secondary);">${opp.message}</p>
          <p style="font-size: 0.75rem; color: var(--success); margin-top: 4px;">💡 ${opp.tip}</p>
        </div>
      </div>
    `).join('') :
    '<p style="color: var(--text-muted); padding: 16px;">¡Excelente! No se encontraron oportunidades de ahorro significativas.</p>';
}
