/* ============================================
   MERCADONA STATS - UTILITY FUNCTIONS
   ============================================ */

/**
 * Parse a date string (YYYY-MM-DD) as local date, avoiding timezone issues.
 * Using new Date("2024-01-15") interprets it as UTC, which can shift the day
 * in local timezone. This function ensures the date is parsed as local.
 * @param {string} dateStr - Date string in format "YYYY-MM-DD"
 * @returns {Date} Date object in local timezone
 */
function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Format currency
function formatCurrency(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
}

// Format category name (capitalize and replace underscores)
function formatCategoryName(cat) {
  if (!cat) return 'Otros';
  return cat
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
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
  const d = parseLocalDate(date);
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

// Get category emoji - returns empty string now (emojis removed)
function getCategoryEmoji(category) {
  return '';
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
