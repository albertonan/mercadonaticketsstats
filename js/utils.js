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
  return function (...args) {
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

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Setup drag and drop for inputs
function setupDropzone(dropzone, input, type, onFileDrop) {
  if (!dropzone) return;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
    dropzone.addEventListener(event, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  ['dragenter', 'dragover'].forEach(event => {
    dropzone.addEventListener(event, () => dropzone.classList.add('dragover'));
  });

  ['dragleave', 'drop'].forEach(event => {
    dropzone.addEventListener(event, () => dropzone.classList.remove('dragover'));
  });

  dropzone.addEventListener('drop', async (e) => {
    const files = e.dataTransfer.files;
    if (onFileDrop) {
      onFileDrop(files);
    } else {
      // Default behavior if no callback provided
      if (type === 'json' && files.length > 0) {
        // App logic would handle this
        input.files = files; // Assign but doesn't trigger change?
        // JSON Importer handles this usually
      } else if (type === 'pdf') {
         // File Importer handles this
      }
    }
  });

  dropzone.addEventListener('click', () => input?.click());
}

// Levenshtein distance for string similarity
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  // increment along the first column of each row
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // increment each column in the first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1
          )
        ); // deletion
      }
    }
  }

  return matrix[b.length][a.length];
}

// Calculate similarity percentage (0-100)
function calculateSimilarity(str1, str2) {
  const normalize = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const s1 = normalize(str1);
  const s2 = normalize(str2);

  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 100;

  const distance = levenshteinDistance(s1, s2);
  return ((maxLength - distance) / maxLength) * 100;
}
