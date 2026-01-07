/* ============================================
   MERCADONA STATS - UTILITY FUNCTIONS
   ============================================ */

// Format currency
function formatCurrency(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
}

// Format month (YYYY-MM -> "Mes Año")
function formatMonth(yearMonth) {
  if (!yearMonth) return '-';
  const [year, month] = yearMonth.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

// Format date
function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', { 
    day: 'numeric',
    month: 'short',
    year: '2-digit'
  });
}

// Truncate string
function truncate(str, length) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

// Debounce function
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Get category emoji
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

// Get category color
function getCategoryColor(index) {
  const colors = [
    '#667eea', '#48bb78', '#ed8936', '#f56565', 
    '#9f7aea', '#4299e1', '#ecc94b', '#38b2ac', '#fc8181'
  ];
  return colors[index % colors.length];
}

// Show error
function showError(message) {
  const container = document.querySelector('.tab-content.active') || document.querySelector('.container');
  if (container) {
    container.innerHTML = `
      <div class="chart-container" style="text-align: center; padding: 40px;">
        <div style="font-size: 3rem; margin-bottom: 16px;">⚠️</div>
        <h2>Error</h2>
        <p style="color: var(--text-secondary);">${message}</p>
      </div>
    `;
  }
  console.error(message);
}

// Download file
function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
