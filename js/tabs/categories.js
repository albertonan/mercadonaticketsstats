/* ============================================
   MERCADONA STATS - CATEGORIES TAB
   ============================================ */

function renderCategories() {
  const tickets = getFilteredTickets();
  
  // Calculate category totals
  const categoryData = {};
  tickets.forEach(t => {
    if (!t.items) return;
    t.items.forEach(item => {
      const cat = item.category || 'otros';
      if (!categoryData[cat]) {
        categoryData[cat] = { total: 0, count: 0, items: [] };
      }
      categoryData[cat].total += item.price;
      categoryData[cat].count += item.quantity || 1;
      categoryData[cat].items.push(item.name);
    });
  });
  
  const sortedCategories = Object.entries(categoryData)
    .sort((a, b) => b[1].total - a[1].total);
  
  const totalSpent = sortedCategories.reduce((s, [_, d]) => s + d.total, 0);
  
  // Render category chart
  renderCategoryChart(sortedCategories, totalSpent);
  
  // Render category list
  renderCategoryList(sortedCategories, totalSpent);
  
  // Render monthly category chart
  renderCategoryMonthlyChart(tickets);
  
  // Setup category product filter
  setupCategoryProductFilter(sortedCategories, tickets);
}

function renderCategoryChart(sortedCategories, totalSpent) {
  const labels = sortedCategories.map(([cat]) => cat);
  const data = sortedCategories.map(([_, d]) => d.total);
  const colors = sortedCategories.map((_, i) => getCategoryColor(i));
  
  createDoughnutChart('categoryChart', labels, data, colors, {
    formatValue: ctx => {
      const percent = ((ctx.raw / totalSpent) * 100).toFixed(1);
      return `${ctx.label}: ${formatCurrency(ctx.raw)} (${percent}%)`;
    }
  });
}

function renderCategoryList(sortedCategories, totalSpent) {
  const container = document.getElementById('categoryList');
  if (!container) return;
  
  container.innerHTML = sortedCategories.map(([cat, data], index) => {
    const percent = ((data.total / totalSpent) * 100).toFixed(1);
    return `
      <div class="category-item">
        <div class="category-color" style="background: ${getCategoryColor(index)}"></div>
        <div class="category-info">
          <div class="category-name">
            ${getCategoryEmoji(cat)} ${cat}
          </div>
          <div class="category-desc">${data.count} productos</div>
        </div>
        <div class="category-value">
          ${formatCurrency(data.total)}
          <div class="category-percent">${percent}%</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderCategoryMonthlyChart(tickets) {
  const monthlyCategories = {};
  
  tickets.forEach(t => {
    const month = t.date.substring(0, 7);
    if (!monthlyCategories[month]) monthlyCategories[month] = {};
    
    if (t.items) {
      t.items.forEach(item => {
        const cat = item.category || 'otros';
        monthlyCategories[month][cat] = (monthlyCategories[month][cat] || 0) + item.price;
      });
    }
  });
  
  const months = Object.keys(monthlyCategories).sort();
  const categories = [...new Set(tickets.flatMap(t => (t.items || []).map(i => i.category || 'otros')))];
  
  const datasets = categories.map((cat, i) => ({
    label: cat,
    data: months.map(m => monthlyCategories[m][cat] || 0),
    backgroundColor: getCategoryColor(i),
    borderRadius: 4
  }));
  
  createStackedBarChart('categoryMonthlyChart', months.map(m => formatMonth(m)), datasets, {
    formatValue: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`,
    formatAxis: v => formatCurrency(v)
  });
}

function setupCategoryProductFilter(sortedCategories, tickets) {
  const categoryFilter = document.getElementById('categoryProductFilter');
  const monthFilter = document.getElementById('monthProductFilter');
  const container = document.getElementById('categoryProductList');
  
  if (!categoryFilter || !monthFilter || !container) return;
  
  // Populate category filter
  categoryFilter.innerHTML = '<option value="all">Todas las categorías</option>' +
    sortedCategories.map(([cat]) => `<option value="${cat}">${getCategoryEmoji(cat)} ${cat}</option>`).join('');
  
  // Populate month filter
  const months = [...new Set(tickets.map(t => t.date.substring(0, 7)))].sort().reverse();
  monthFilter.innerHTML = '<option value="all">Todos los meses</option>' +
    months.map(m => `<option value="${m}">${formatMonth(m)}</option>`).join('');
  
  // Render function
  const renderProducts = () => {
    const selectedCat = categoryFilter.value;
    const selectedMonth = monthFilter.value;
    
    const productTotals = {};
    tickets.forEach(t => {
      if (selectedMonth !== 'all' && !t.date.startsWith(selectedMonth)) return;
      if (!t.items) return;
      
      t.items.forEach(item => {
        const cat = item.category || 'otros';
        if (selectedCat !== 'all' && cat !== selectedCat) return;
        
        if (!productTotals[item.name]) {
          productTotals[item.name] = { total: 0, count: 0, category: cat };
        }
        productTotals[item.name].total += item.price;
        productTotals[item.name].count += item.quantity || 1;
      });
    });
    
    const sorted = Object.entries(productTotals).sort((a, b) => b[1].total - a[1].total).slice(0, 20);
    
    container.innerHTML = sorted.length > 0 ? `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th style="text-align: right;">Cantidad</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(([name, data]) => `
              <tr>
                <td>${name}</td>
                <td>${getCategoryEmoji(data.category)} ${data.category}</td>
                <td style="text-align: right;">${data.count}</td>
                <td style="text-align: right;">${formatCurrency(data.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '<p style="padding: 20px; color: var(--text-muted);">No hay productos para mostrar</p>';
  };
  
  categoryFilter.addEventListener('change', renderProducts);
  monthFilter.addEventListener('change', renderProducts);
  renderProducts();
}
