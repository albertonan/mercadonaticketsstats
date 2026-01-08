/* ============================================
   MERCADONA STATS - INSIGHTS TAB (New Design)
   ============================================ */

function renderInsights() {
  const tickets = getFilteredTickets();
  
  renderPriceAlerts(tickets);
  renderShoppingHabits(tickets);
  renderHeatmap(tickets);
}

function renderPriceAlerts(tickets) {
  const container = document.getElementById('priceAlertsList');
  if (!container) return;
  
  // Logic to find price changes
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
      
      // Filter for significant changes, or just top ones to fill the UI
      if (Math.abs(change) >= 2) { 
        alerts.push({ name, change, lastPrice: lastAvg, prevPrice: prevAvg });
      }
    }
  });
  
  // Sort by absolute change magnitude
  alerts.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  
  // Take top 8 to fill horizontal space
  const displayAlerts = alerts.slice(0, 8);
  
  if (displayAlerts.length === 0) {
      container.innerHTML = '<div class="empty-state">No hay cambios significativos</div>';
      return;
  }

  container.innerHTML = displayAlerts.map(a => {
      const isIncrease = a.change > 0;
      const colorClass = isIncrease ? 'alert-red' : 'alert-green';
      const icon = isIncrease ? '↗' : '↘'; // or use specific logic
      // Fix text: "+4.50€ (New: 28.90€)" format from image
      const diff = a.lastPrice - a.prevPrice;
      const sign = isIncrease ? '+' : '';
      
      return `
      <div class="alert-item ${colorClass}">
          <div class="alert-info">
              <span class="alert-product-name">${truncate(a.name, 25)}</span>
              <span class="alert-price-details">
                <span class="alert-diff">${sign}${formatCurrency(diff)}</span> 
                <span class="alert-new-price">(Nuevo: ${formatCurrency(a.lastPrice)})</span>
              </span>
          </div>
          <div class="alert-arrow">${icon}</div>
      </div>
      `;
  }).join('');
}

function renderPredictions(tickets) {
  const badge = document.getElementById('predictionBadge');
  const canvas = document.getElementById('predictionChart');
  if (!canvas) return;
  
  // Data prep
  const monthlySpend = {};
  tickets.forEach(t => {
      const month = t.date.substring(0, 7);
      monthlySpend[month] = (monthlySpend[month] || 0) + t.total;
  });
  
  const sortedMonths = Object.keys(monthlySpend).sort();
  const values = sortedMonths.map(m => monthlySpend[m]);
  
  // Simple prediction: avg of last 3 months
  const recent = values.slice(-3);
  const avg = recent.length ? recent.reduce((a,b)=>a+b,0)/recent.length : 0;
  
  // Update badge
  if (badge) {
      const lower = Math.floor(avg * 0.95);
      const upper = Math.ceil(avg * 1.05);
      // Determine next month name 
      const now = new Date();
      const nextMonthName = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleString('es-ES', { month: 'long' });
      const capNextMonth = nextMonthName.charAt(0).toUpperCase() + nextMonthName.slice(1);
      
      badge.textContent = `Proyección ${capNextMonth}: ${lower}€ - ${upper}€`;
  }
  
  // Chart.js
  const ctx = canvas.getContext('2d');
  
  // Generate labels (last 6 months + next month)
  const labels = sortedMonths.slice(-6); // last 6 real months
  // Add next month label
  // ... (simplification for brevity: just use last 6 data points)
  
  const dataPoints = values.slice(-6);
  
  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 150);
  gradient.addColorStop(0, 'rgba(111, 76, 255, 0.4)'); // Purple-ish
  gradient.addColorStop(1, 'rgba(111, 76, 255, 0)');

  // Destroy if exists in window (store instance on canvas or a global map)
  if (window.predictionChartInstance) window.predictionChartInstance.destroy();

  // Add a predicted point
  const predictedValue = avg; 
  const displayLabels = [...labels.map(formatMonthShort), 'Pred'];
  const displayData = [...dataPoints, null]; // Gap?
  // Actually fine to just link them up
  // Chart.js allows datasets to span.
  
  // Let's do a single line that becomes dotted for prediction?
  // Easier: One dataset for history, one for prediction (connecting last point)
  
  const historyData = dataPoints;
  const predictionData = Array(dataPoints.length - 1).fill(null);
  predictionData.push(dataPoints[dataPoints.length - 1]); // connect
  predictionData.push(predictedValue);

  window.predictionChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
          labels: displayLabels,
          datasets: [
              {
                  label: 'Gasto',
                  data: historyData,
                  borderColor: '#6366f1',
                  backgroundColor: gradient,
                  borderWidth: 2,
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0
              },
              {
                  label: 'Proyección',
                  data: [...Array(historyData.length-1).fill(null), historyData[historyData.length-1], predictedValue],
                  borderColor: '#818cf8',
                  borderWidth: 2,
                  borderDash: [5, 5],
                  fill: false,
                  tension: 0.4,
                  pointRadius: [ ...Array(historyData.length).fill(0), 4], // Point only at end
                  pointBackgroundColor: '#6366f1'
              }
          ]
      },
      options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: true } },
          scales: {
              x: { grid: { display: false }, ticks: { font: { size: 10 } } },
              y: { display: false, min: 0 } // Hide Y axis like in image
          },
          interaction: { intersect: false, mode: 'index' }
      }
  });
}

function renderBudgetTracker(tickets) {
  const canvas = document.getElementById('budgetChart');
  const percentEl = document.getElementById('budgetPercent');
  const totalEl = document.getElementById('budgetTotal');
  if (!canvas) return;
  
  // Current month total
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentTotal = tickets
    .filter(t => t.date.startsWith(currentMonthPrefix))
    .reduce((sum, t) => sum + t.total, 0);
    
  // Target Budget (mocked or stored)
  const budget = localStorage.getItem('mercadona_budget') ? parseFloat(localStorage.getItem('mercadona_budget')) : 500; // Default 500
  
  const percent = Math.min(100, Math.round((currentTotal / budget) * 100));
  
  if (percentEl) percentEl.textContent = `${percent}%`;
  if (totalEl) totalEl.textContent = `${Math.round(currentTotal)}€ / ${budget}€`;
  
  if (window.budgetChartInstance) window.budgetChartInstance.destroy();
  
  window.budgetChartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
          labels: ['Gastado', 'Restante'],
          datasets: [{
              data: [currentTotal, Math.max(0, budget - currentTotal)],
              backgroundColor: ['#3b82f6', '#e2e8f0'], // Blue and Light Gray
              borderWidth: 0,
              cutout: '85%', // Thin ring
              circumference: 260, // Open circle style slightly? Or full? Image shows ~270 degree arc, but full circle is fine too. Image is actually full circle with rounded caps usually. Let's stick to standard full circle unless I use rotation. Image shows 72% reaching about 3/4. It looks like a standard full donut.
              borderRadius: 20
          }]
      },
      options: {
          responsive: true,
          maintainAspectRatio: false,
          rotation: -90, 
          circumference: 360,
          plugins: { legend: { display: false }, tooltip: { enabled: false } }
      }
  });
}

function renderShoppingHabits(tickets) {
  // 1. Favorite Moment (Day + Time)
  const dayCount = {};
  const hourCounts = {}; // "18:00 - 19:00" bucket
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  tickets.forEach(t => {
      const d = parseLocalDate(t.date);
      const dayName = dayNames[d.getDay()];
      dayCount[dayName] = (dayCount[dayName] || 0) + 1;
      
      if(t.time) {
          const h = parseInt(t.time.split(':')[0]);
          const slot = `${h}:00 - ${h+1}:00`;
          hourCounts[slot] = (hourCounts[slot] || 0) + 1;
      }
  });
  
  const favDay = Object.entries(dayCount).sort((a,b)=>b[1]-a[1])[0];
  const favTime = Object.entries(hourCounts).sort((a,b)=>b[1]-a[1])[0];
  
  document.getElementById('favDay').textContent = favDay ? favDay[0] : '-';
  document.getElementById('favTime').textContent = favTime ? favTime[0] : '-';
  
  // 2. Interval
  // Simple avg days between tickets
  const dates = tickets.map(t => parseLocalDate(t.date)).sort((a,b)=>a-b);
  let avgDays = 0;
  if (dates.length > 1) {
      const diffMs = dates[dates.length - 1] - dates[0];
      const days = diffMs / (1000 * 60 * 60 * 24);
      avgDays = days / (dates.length - 1);
  }
  
  document.getElementById('avgInterval').textContent = avgDays.toFixed(1);
  // Trend: compare with prev month interval? (Mocked for now)
  // document.getElementById('intervalTrend').textContent = ...
}

function renderHeatmap(tickets) {
  const grid = document.getElementById('heatmapGrid');
  if (!grid) return;
  
  // 7 days (rows) x 15 hours (8am - 22pm = 15 slots)
  // Rows: Lun(0), Mar(1), Mie(2), Jue(3), Vie(4), Sab(5), Dom(6)
  // Cols: 8h(0), 9h(1), ... 22h(14)
  
  // Initialize counts matrix[day][hour]
  const matrix = Array(7).fill(null).map(() => Array(15).fill(0));
  
  let ticketsWithTime = 0;
  tickets.forEach(t => {
      if (!t.time) return;
      ticketsWithTime++;
      
      const d = parseLocalDate(t.date);
      let jsDay = d.getDay(); // JS: 0=Sun, 1=Mon, ..., 6=Sat
      
      // Convert to UI index: Mon=0, Tue=1, ..., Sun=6
      let dayIdx = jsDay === 0 ? 6 : jsDay - 1;
      
      // Parse hour from time string (e.g., "18:30" -> 18)
      const timeParts = t.time.split(':');
      const hour = parseInt(timeParts[0], 10);
      
      // Only count hours from 8 to 22
      if (hour >= 8 && hour <= 22) {
          const colIdx = hour - 8; // 8h -> col 0, 22h -> col 14
          matrix[dayIdx][colIdx]++;
      }
  });
  
  // Find max value for color scaling
  let maxVal = 1; // Prevent division by zero
  matrix.forEach(row => row.forEach(v => { if (v > maxVal) maxVal = v; }));
  
  // Render grid cells (row by row, left to right)
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  let html = '';
  for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 15; col++) {
          const val = matrix[row][col];
          let cellClass = 'heat-cell';
          let bgColor = '#eef2f7'; // Empty/light gray
          
          if (val > 0) {
              const intensity = val / maxVal;
              // Classic heatmap colors: green → yellow → orange → red
              // Hue: 120 (green) → 60 (yellow) → 30 (orange) → 0 (red)
              const hue = 120 - (intensity * 120); // 120 to 0
              const saturation = 70 + intensity * 20; // 70-90%
              const lightness = 75 - intensity * 30; // 75% to 45%
              bgColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
              cellClass += intensity > 0.7 ? ' heat-high' : ' heat-filled';
          } else {
              cellClass += ' heat-empty';
          }
          
          const hour = col + 8;
          html += `<div class="${cellClass}" style="background-color: ${bgColor};" title="${dayNames[row]} ${hour}h: ${val} compras"></div>`;
      }
  }
  grid.innerHTML = html;
}

function formatMonthShort(dateStr) {
    // 2023-10
    const [y, m] = dateStr.split('-');
    const date = new Date(parseInt(y), parseInt(m)-1, 1);
    return date.toLocaleString('es-ES', { month: 'short' });
}

