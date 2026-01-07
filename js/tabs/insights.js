/* ============================================
   MERCADONA STATS - INSIGHTS TAB
   ============================================ */

function renderInsights() {
  const tickets = getFilteredTickets();
  
  renderPriceAlerts(tickets);
  renderPredictions(tickets);
  renderShoppingHabits(tickets);
  renderShoppingPatterns(tickets);
  renderSavingsOpportunities(tickets);
  setupBudgetTracker(tickets);
}

function renderPriceAlerts(tickets) {
  const container = document.getElementById('priceAlerts');
  if (!container) return;
  
  // Find recent price increases
  const priceData = {};
  tickets.forEach(t => {
    const month = t.date.substring(0, 7);
    (t.items || []).forEach(item => {
      const price = item.unitPrice || item.price;
      if (!price) return;
      if (!priceData[item.name]) priceData[item.name] = {};
      if (!priceData[item.name][month]) priceData[item.name][month] = [];
      priceData[item.name][month].push(price);
    });
  });
  
  const alerts = [];
  Object.entries(priceData).forEach(([name, history]) => {
    const months = Object.keys(history).sort();
    if (months.length >= 2) {
      const lastMonth = months[months.length - 1];
      const prevMonth = months[months.length - 2];
      const lastAvg = history[lastMonth].reduce((a, b) => a + b, 0) / history[lastMonth].length;
      const prevAvg = history[prevMonth].reduce((a, b) => a + b, 0) / history[prevMonth].length;
      const change = ((lastAvg - prevAvg) / prevAvg) * 100;
      
      if (Math.abs(change) >= 10) {
        alerts.push({ name, change, lastPrice: lastAvg, prevPrice: prevAvg });
      }
    }
  });
  
  alerts.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  
  container.innerHTML = alerts.length > 0 ? `
    <div class="alerts-list">
      ${alerts.slice(0, 10).map(a => `
        <div class="alert-item ${a.change > 0 ? 'alert-increase' : 'alert-decrease'}">
          <div class="alert-icon">${a.change > 0 ? '📈' : '📉'}</div>
          <div class="alert-content">
            <div class="alert-name">${a.name}</div>
            <div class="alert-detail">
              ${formatCurrency(a.prevPrice)} → ${formatCurrency(a.lastPrice)}
            </div>
          </div>
          <div class="alert-change ${a.change > 0 ? 'text-danger' : 'text-success'}">
            ${a.change > 0 ? '+' : ''}${a.change.toFixed(1)}%
          </div>
        </div>
      `).join('')}
    </div>
  ` : '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No hay alertas de precios significativas</p>';
}

function renderPredictions(tickets) {
  const container = document.getElementById('predictions');
  if (!container) return;
  
  // Calculate monthly spending
  const monthlySpend = {};
  tickets.forEach(t => {
    const month = t.date.substring(0, 7);
    monthlySpend[month] = (monthlySpend[month] || 0) + t.total;
  });
  
  const months = Object.keys(monthlySpend).sort();
  const values = months.map(m => monthlySpend[m]);
  
  if (months.length < 3) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">Se necesitan más datos para predicciones</p>';
    return;
  }
  
  // Simple moving average prediction
  const recent = values.slice(-3);
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  
  // Trend calculation
  const trend = values.length >= 2 ? (values[values.length - 1] - values[values.length - 2]) / values[values.length - 2] * 100 : 0;
  
  const prediction = avgRecent * (1 + trend / 100);
  
  // Calculate yearly prediction
  const monthsRemaining = 12 - new Date().getMonth();
  const yearlyPrediction = values.reduce((a, b) => a + b, 0) + (prediction * monthsRemaining);
  
  container.innerHTML = `
    <div class="prediction-cards">
      <div class="prediction-card">
        <div class="prediction-icon">📅</div>
        <div class="prediction-content">
          <div class="prediction-label">Próximo mes estimado</div>
          <div class="prediction-value">${formatCurrency(prediction)}</div>
          <div class="prediction-trend ${trend > 0 ? 'text-danger' : 'text-success'}">
            ${trend > 0 ? '↑' : '↓'} ${Math.abs(trend).toFixed(1)}% vs mes anterior
          </div>
        </div>
      </div>
      <div class="prediction-card">
        <div class="prediction-icon">📆</div>
        <div class="prediction-content">
          <div class="prediction-label">Estimación anual</div>
          <div class="prediction-value">${formatCurrency(yearlyPrediction)}</div>
          <div class="prediction-detail">${formatCurrency(yearlyPrediction / 12)}/mes media</div>
        </div>
      </div>
    </div>
  `;
}

function renderShoppingHabits(tickets) {
  const container = document.getElementById('shoppingHabits');
  if (!container) return;
  
  // Analyze shopping patterns
  const dayCount = {};
  const hourCount = {};
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  tickets.forEach(t => {
    const date = parseLocalDate(t.date);
    const day = date.getDay();
    dayCount[day] = (dayCount[day] || 0) + 1;
    
    if (t.time) {
      const hour = parseInt(t.time.split(':')[0]);
      const period = hour < 12 ? 'Mañana' : hour < 17 ? 'Tarde' : 'Noche';
      hourCount[period] = (hourCount[period] || 0) + 1;
    }
  });
  
  const favoriteDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];
  const favoritePeriod = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0];
  
  // Calculate average items per ticket
  const avgItems = tickets.reduce((sum, t) => sum + (t.items?.length || 0), 0) / tickets.length;
  
  // Calculate shopping frequency
  const dates = tickets.map(t => parseLocalDate(t.date)).sort((a, b) => a - b);
  let avgDaysBetween = 0;
  if (dates.length > 1) {
    const totalDays = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
    avgDaysBetween = totalDays / (dates.length - 1);
  }
  
  container.innerHTML = `
    <div class="habits-grid">
      <div class="habit-card">
        <div class="habit-icon">📅</div>
        <div class="habit-content">
          <div class="habit-label">Día favorito</div>
          <div class="habit-value">${favoriteDay ? dayNames[favoriteDay[0]] : 'N/A'}</div>
          <div class="habit-detail">${favoriteDay ? favoriteDay[1] + ' visitas' : ''}</div>
        </div>
      </div>
      <div class="habit-card">
        <div class="habit-icon">🕐</div>
        <div class="habit-content">
          <div class="habit-label">Hora preferida</div>
          <div class="habit-value">${favoritePeriod ? favoritePeriod[0] : 'N/A'}</div>
          <div class="habit-detail">${favoritePeriod ? favoritePeriod[1] + ' visitas' : ''}</div>
        </div>
      </div>
      <div class="habit-card">
        <div class="habit-icon">🛒</div>
        <div class="habit-content">
          <div class="habit-label">Media de productos</div>
          <div class="habit-value">${avgItems.toFixed(1)}</div>
          <div class="habit-detail">por ticket</div>
        </div>
      </div>
      <div class="habit-card">
        <div class="habit-icon">🔄</div>
        <div class="habit-content">
          <div class="habit-label">Frecuencia</div>
          <div class="habit-value">~${Math.round(avgDaysBetween)} días</div>
          <div class="habit-detail">entre compras</div>
        </div>
      </div>
    </div>
  `;
}

function renderShoppingPatterns(tickets) {
  const container = document.getElementById('shoppingPatterns');
  if (!container) return;
  
  // Analyze what products are bought together
  const pairCount = {};
  tickets.forEach(t => {
    const items = (t.items || []).map(i => i.name);
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const pair = [items[i], items[j]].sort().join(' + ');
        pairCount[pair] = (pairCount[pair] || 0) + 1;
      }
    }
  });
  
  const topPairs = Object.entries(pairCount)
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  // Find seasonal products
  const monthlyProducts = {};
  tickets.forEach(t => {
    const month = parseLocalDate(t.date).getMonth();
    (t.items || []).forEach(item => {
      if (!monthlyProducts[item.name]) {
        monthlyProducts[item.name] = new Array(12).fill(0);
      }
      monthlyProducts[item.name][month]++;
    });
  });
  
  container.innerHTML = `
    <div class="patterns-section">
      <h4>🔗 Productos que compras juntos</h4>
      ${topPairs.length > 0 ? `
        <div class="pairs-list">
          ${topPairs.map(([pair, count]) => `
            <div class="pair-item">
              <span class="pair-names">${pair}</span>
              <span class="pair-count">${count}x</span>
            </div>
          `).join('')}
        </div>
      ` : '<p style="color: var(--text-muted);">No hay suficientes datos</p>'}
    </div>
  `;
}

function renderSavingsOpportunities(tickets) {
  const container = document.getElementById('savingsOpportunities');
  if (!container) return;
  
  // Find products with price variation (potential to buy at lower price)
  const priceData = {};
  tickets.forEach(t => {
    (t.items || []).forEach(item => {
      const price = item.unitPrice || item.price;
      if (!price) return;
      if (!priceData[item.name]) {
        priceData[item.name] = { prices: [], total: 0, count: 0 };
      }
      priceData[item.name].prices.push(price);
      priceData[item.name].total += item.price;
      priceData[item.name].count++;
    });
  });
  
  const opportunities = [];
  Object.entries(priceData).forEach(([name, data]) => {
    if (data.prices.length < 3) return;
    const minPrice = Math.min(...data.prices);
    const maxPrice = Math.max(...data.prices);
    const avgPrice = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
    const variation = ((maxPrice - minPrice) / minPrice) * 100;
    
    if (variation >= 15 && data.count >= 3) {
      const potentialSavings = (avgPrice - minPrice) * data.count;
      opportunities.push({ name, minPrice, maxPrice, avgPrice, variation, potentialSavings, count: data.count });
    }
  });
  
  opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings);
  
  container.innerHTML = opportunities.length > 0 ? `
    <div class="savings-list">
      ${opportunities.slice(0, 8).map(o => `
        <div class="savings-item">
          <div class="savings-product">
            <div class="savings-name">${truncate(o.name, 30)}</div>
            <div class="savings-detail">
              Rango: ${formatCurrency(o.minPrice)} - ${formatCurrency(o.maxPrice)}
            </div>
          </div>
          <div class="savings-potential">
            <div class="savings-amount">Ahorro potencial</div>
            <div class="savings-value">${formatCurrency(o.potentialSavings)}</div>
          </div>
        </div>
      `).join('')}
    </div>
    <p style="text-align: center; color: var(--text-muted); margin-top: 16px; font-size: 0.9em;">
      💡 Estos productos tienen precios variables. Compra cuando estén en su precio mínimo.
    </p>
  ` : '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No se encontraron oportunidades de ahorro significativas</p>';
}

function setupBudgetTracker(tickets) {
  const container = document.getElementById('budgetTracker');
  if (!container) return;
  
  // Calculate current month spending
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthSpend = tickets
    .filter(t => t.date.startsWith(currentMonth))
    .reduce((sum, t) => sum + t.total, 0);
  
  // Get average monthly spend
  const monthlySpend = {};
  tickets.forEach(t => {
    const month = t.date.substring(0, 7);
    monthlySpend[month] = (monthlySpend[month] || 0) + t.total;
  });
  const avgMonthly = Object.values(monthlySpend).reduce((a, b) => a + b, 0) / Object.keys(monthlySpend).length;
  
  // Load saved budget or use average
  const savedBudget = localStorage.getItem('mercadona_budget');
  const budget = savedBudget ? parseFloat(savedBudget) : Math.ceil(avgMonthly / 50) * 50;
  
  const progress = budget > 0 ? (currentMonthSpend / budget) * 100 : 0;
  const remaining = budget - currentMonthSpend;
  
  container.innerHTML = `
    <div class="budget-header">
      <div class="budget-info">
        <label for="budgetInput">Presupuesto mensual:</label>
        <div class="budget-input-group">
          <input type="number" id="budgetInput" value="${budget}" min="0" step="50">
          <span>€</span>
          <button class="btn btn-small btn-secondary" onclick="saveBudget()">Guardar</button>
        </div>
      </div>
    </div>
    
    <div class="budget-progress">
      <div class="progress-bar">
        <div class="progress-fill ${progress > 100 ? 'over-budget' : progress > 80 ? 'warning' : ''}" 
             style="width: ${Math.min(progress, 100)}%"></div>
      </div>
      <div class="progress-labels">
        <span>Gastado: ${formatCurrency(currentMonthSpend)}</span>
        <span>${progress.toFixed(0)}%</span>
        <span>Presupuesto: ${formatCurrency(budget)}</span>
      </div>
    </div>
    
    <div class="budget-summary">
      ${remaining >= 0 ? `
        <div class="remaining positive">
          <span class="remaining-label">Te queda disponible:</span>
          <span class="remaining-value">${formatCurrency(remaining)}</span>
        </div>
      ` : `
        <div class="remaining negative">
          <span class="remaining-label">⚠️ Excedido en:</span>
          <span class="remaining-value">${formatCurrency(Math.abs(remaining))}</span>
        </div>
      `}
      <div class="days-remaining">
        ${getDaysRemainingInMonth()} días restantes este mes
      </div>
    </div>
  `;
}

function saveBudget() {
  const input = document.getElementById('budgetInput');
  if (!input) return;
  
  const budget = parseFloat(input.value);
  if (isNaN(budget) || budget < 0) {
    alert('Por favor, introduce un presupuesto válido');
    return;
  }
  
  localStorage.setItem('mercadona_budget', budget.toString());
  renderInsights();
}

function getDaysRemainingInMonth() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate();
}
