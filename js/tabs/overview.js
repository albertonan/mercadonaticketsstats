/* ============================================
   MERCADONA STATS - OVERVIEW TAB
   ============================================ */

function renderOverview() {
  const tickets = getFilteredTickets();
  if (tickets.length === 0) {
    document.getElementById('tabContent').innerHTML = '<div class="no-data"><div class="no-data-icon">📊</div><p>No hay datos disponibles</p></div>';
    return;
  }
  
  const totalSpent = tickets.reduce((sum, t) => sum + t.total, 0);
  const avgPerTicket = totalSpent / tickets.length;
  
  // Calculate monthly average
  const monthlyTotals = {};
  tickets.forEach(t => {
    const month = t.date.substring(0, 7);
    monthlyTotals[month] = (monthlyTotals[month] || 0) + t.total;
  });
  const months = Object.keys(monthlyTotals);
  const avgPerMonth = months.length ? totalSpent / months.length : 0;
  
  // Most visited store
  const stores = {};
  tickets.forEach(t => {
    const storeName = typeof t.store === 'object' ? t.store.city || t.store.name : t.store;
    stores[storeName] = (stores[storeName] || 0) + 1;
  });
  const topStore = Object.entries(stores).sort((a, b) => b[1] - a[1])[0];
  
  // Favorite day
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayCounts = new Array(7).fill(0);
  tickets.forEach(t => dayCounts[parseLocalDate(t.date).getDay()]++);
  const favoriteDayIndex = dayCounts.indexOf(Math.max(...dayCounts));
  
  // Update DOM
  document.getElementById('totalSpent').textContent = formatCurrency(totalSpent);
  document.getElementById('ticketCount').textContent = tickets.length;
  document.getElementById('avgTicket').textContent = formatCurrency(avgPerTicket);
  document.getElementById('avgMonth').textContent = formatCurrency(avgPerMonth);
  document.getElementById('topStore').textContent = topStore ? topStore[0] : '-';
  document.getElementById('topStoreCount').textContent = topStore ? `${topStore[1]} visitas` : '';
  document.getElementById('favoriteDay').textContent = days[favoriteDayIndex];
  document.getElementById('favoriteDayCount').textContent = `${dayCounts[favoriteDayIndex]} compras`;
  
  // Render charts
  renderMonthlyChart();
  renderWeeklyChart();
  renderComparison();
}

function renderMonthlyChart() {
  const tickets = getFilteredTickets();
  
  const monthlyData = {};
  tickets.forEach(t => {
    const month = t.date.substring(0, 7);
    monthlyData[month] = (monthlyData[month] || 0) + t.total;
  });
  
  const sortedMonths = Object.keys(monthlyData).sort();
  const labels = sortedMonths.map(m => formatMonth(m));
  const data = sortedMonths.map(m => monthlyData[m]);
  
  createBarChart('monthlyChart', labels, data, {
    label: 'Gasto mensual',
    formatValue: v => formatCurrency(v),
    formatAxis: v => formatCurrency(v)
  });
}

function renderWeeklyChart() {
  const tickets = getFilteredTickets();
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayCounts = new Array(7).fill(0);
  const dayTotals = new Array(7).fill(0);
  
  tickets.forEach(t => {
    const day = parseLocalDate(t.date).getDay();
    dayCounts[day]++;
    dayTotals[day] += t.total;
  });
  
  const colors = ['#f56565', '#ed8936', '#ecc94b', '#48bb78', '#4299e1', '#667eea', '#9f7aea'];
  
  createDoughnutChart('weeklyChart', days, dayCounts, colors, {
    formatValue: ctx => `${ctx.label}: ${ctx.raw} visitas (${formatCurrency(dayTotals[ctx.dataIndex])})`
  });
}

function renderComparison() {
  const tickets = getFilteredTickets();
  const container = document.getElementById('comparisonCards');
  if (!container || tickets.length < 2) {
    const section = document.getElementById('comparisonSection');
    if (section) section.style.display = 'none';
    return;
  }
  
  const sorted = [...tickets].sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
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
  
  if (previous.length === 0) {
    document.getElementById('comparisonSection').style.display = 'none';
    return;
  }
  
  document.getElementById('comparisonSection').style.display = 'block';
  
  const recentTotal = recent.reduce((s, t) => s + t.total, 0);
  const previousTotal = previous.reduce((s, t) => s + t.total, 0);
  const spendChange = previousTotal ? ((recentTotal - previousTotal) / previousTotal * 100) : 0;
  
  const recentCount = recent.length;
  const previousCount = previous.length;
  const countChange = previousCount ? ((recentCount - previousCount) / previousCount * 100) : 0;
  
  const recentAvg = recentCount ? recentTotal / recentCount : 0;
  const previousAvg = previousCount ? previousTotal / previousCount : 0;
  const avgChange = previousAvg ? ((recentAvg - previousAvg) / previousAvg * 100) : 0;
  
  container.innerHTML = `
    <div class="comparison-card">
      <div class="label">Gasto últimos 30 días</div>
      <div class="value">${formatCurrency(recentTotal)}</div>
      <div class="change ${spendChange > 0 ? 'positive' : 'negative'}">
        ${spendChange > 0 ? '↑' : '↓'} ${Math.abs(spendChange).toFixed(1)}%
      </div>
    </div>
    <div class="comparison-card">
      <div class="label">Compras</div>
      <div class="value">${recentCount}</div>
      <div class="change ${countChange > 0 ? 'positive' : 'negative'}">
        ${countChange > 0 ? '↑' : '↓'} ${Math.abs(countChange).toFixed(1)}%
      </div>
    </div>
    <div class="comparison-card">
      <div class="label">Media por compra</div>
      <div class="value">${formatCurrency(recentAvg)}</div>
      <div class="change ${avgChange > 0 ? 'positive' : 'negative'}">
        ${avgChange > 0 ? '↑' : '↓'} ${Math.abs(avgChange).toFixed(1)}%
      </div>
    </div>
  `;
}
