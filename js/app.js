/* ============================================
   SHOPPING STATS - MAIN APPLICATION
   ============================================ */

// Global state
let ticketsData = [];
let currentYear = 'all';
let currentStore = 'all';
let fullData = null; // Complete data including categories

// App version - increment to force cache clear
const APP_VERSION = '2.1.0';
const APP_VERSION_KEY = 'shopping_app_version';

// Note: charts registry is defined in js/charts.js

// Check if app version changed and clear old data if needed
function checkAppVersion() {
  const savedVersion = localStorage.getItem(APP_VERSION_KEY);
  if (savedVersion !== APP_VERSION) {
    console.log(`App updated from ${savedVersion || 'unknown'} to ${APP_VERSION}, clearing old cache...`);
    // Don't clear data on version update, just UI state
    localStorage.removeItem('shopping_active_tab');
    localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
    return true; // Version changed
  }
  return false;
}

// Clear all localStorage data (keeps raw texts for re-parsing)
function clearAllData() {
  const keysToRemove = [
    'shopping_tickets_data',
    'shopping_active_tab',
    'shopping_year_filter',
    'shopping_store_filter',
    'shopping_budget',
    // Legacy keys
    'mercadona_tickets_data',
    'mercadona_active_tab',
    'mercadona_year_filter',
    'mercadona_budget',
    'mercadona_theme'
  ];
  keysToRemove.forEach(key => localStorage.removeItem(key));
  ticketsData = [];
  fullData = null;
  console.log('All cached data cleared (raw texts preserved for re-parsing)');
}

// Clear everything including raw texts (full reset)
function clearEverything() {
  clearAllData();
  if (typeof clearRawTexts === 'function') {
    clearRawTexts();
  }
  localStorage.removeItem(APP_VERSION_KEY);
  console.log('Full reset complete (including raw texts)');
}

// Validate ticket date format (should be YYYY-MM-DD)
function validateTicketDates(tickets) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  let fixed = 0;

  tickets.forEach(t => {
    if (t.date && !dateRegex.test(t.date)) {
      // Try to fix DD/MM/YYYY format
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(t.date)) {
        const [day, month, year] = t.date.split('/');
        t.date = `${year}-${month}-${day}`;
        fixed++;
      }
    }
  });

  if (fixed > 0) {
    console.log(`Fixed ${fixed} tickets with old date format`);
  }
  return tickets;
}

// Initialize application
async function init() {
  setupDarkMode();

  // Check for version update (clears cache if needed)
  const versionChanged = checkAppVersion();

  const hasData = await tryLoadData();

  if (!hasData) {
    showDataLoaderModal();
  } else {
    startApp();
  }
}

// Try to load data from file or localStorage
async function tryLoadData() {
  // First try to load from file
  try {
    const response = await fetch('data/tickets.json');
    if (response.ok) {
      let data = await response.json();

      // Check if migration needed
      const { data: migratedData, migrated } = migrateTicketsData(data);
      fullData = migratedData;
      ticketsData = fullData.tickets || fullData;

      // Validate and fix date formats
      ticketsData = validateTicketDates(ticketsData);

      if (ticketsData && ticketsData.length > 0) {
        console.log(`Loaded ${ticketsData.length} tickets from file${migrated ? ' (migrated)' : ''}`);
        return true;
      }
    }
  } catch (error) {
    console.log('No tickets.json file found');
  }

  // Try localStorage as fallback
  try {
    // Try new key first
    let savedData = localStorage.getItem('shopping_tickets_data');
    let legacyData = false;

    // Fallback to legacy key
    if (!savedData) {
      savedData = localStorage.getItem('mercadona_tickets_data');
      if (savedData) legacyData = true;
    }

    if (savedData) {
      let data = JSON.parse(savedData);

      // Check if migration needed and migrate
      const { data: migratedData, migrated } = migrateTicketsData(data);
      fullData = migratedData;
      ticketsData = fullData.tickets || fullData;

      // Validate and fix date formats
      ticketsData = validateTicketDates(ticketsData);

      if (ticketsData && ticketsData.length > 0) {
        // If migrated or legacy, save back to new localStorage key
        if (migrated || legacyData) {
          try {
            localStorage.setItem('shopping_tickets_data', JSON.stringify(fullData));
            if (legacyData) {
              localStorage.removeItem('mercadona_tickets_data');
              console.log('Migrated legacy localStorage data to new key');
            } else {
              console.log('Migrated data saved to localStorage');
            }
          } catch (e) {
            console.warn('Could not save migrated data to localStorage');
          }
        }
        console.log(`Loaded ${ticketsData.length} tickets from localStorage${migrated ? ' (migrated)' : ''}`);
        return true;
      }
    }
  } catch (error) {
    console.log('No data in localStorage');
  }

  return false;
}

// Start the app after data is loaded
function startApp() {
  setupFilters();
  setupExport();
  setupTabs();

  // Update period info
  updatePeriodInfo();

  // Setup reload data button
  const reloadBtn = document.getElementById('reloadDataBtn');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      showDataLoaderModal();
    });
  }

  // Restore last active tab
  const savedTab = localStorage.getItem('shopping_active_tab') || 'overview';
  switchTab(savedTab);

  // Log raw texts info
  if (typeof getRawTexts === 'function') {
    const rawTexts = getRawTexts();
    const count = Object.keys(rawTexts).length;
    if (count > 0) {
      console.log(`📄 ${count} raw PDF texts stored for future re-parsing`);
    }
  }

  console.log('Shopping Stats initialized');
}

// Update period info display
function updatePeriodInfo() {
  const periodInfo = document.getElementById('periodInfo');
  if (periodInfo && ticketsData.length > 0) {
    const dates = ticketsData.map(t => t.date).sort();
    const firstDate = formatDate(dates[0]);
    const lastDate = formatDate(dates[dates.length - 1]);
    periodInfo.textContent = `${ticketsData.length} tickets · ${firstDate} - ${lastDate}`;
  }
}

// Show the data loader modal
function showDataLoaderModal() {
  const modal = document.getElementById('dataLoaderModal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setupDataLoaderHandlers();
  }
}

// Hide the data loader modal
function hideDataLoaderModal() {
  const modal = document.getElementById('dataLoaderModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Setup data loader event handlers
function setupDataLoaderHandlers() {
  const jsonInput = document.getElementById('jsonFileInput');
  const pdfInput = document.getElementById('pdfFileInput');
  const jsonDropzone = document.getElementById('jsonDropzone');
  const pdfDropzone = document.getElementById('pdfDropzone');
  const processBtn = document.getElementById('processPdfsBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const jsonConfirmBtn = document.getElementById('jsonConfirmBtn');
  const jsonWarning = document.getElementById('jsonWarning');

  // Close modal button
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      hideDataLoaderModal();
      pendingJSONFile = null;
      if (jsonWarning) jsonWarning.style.display = 'none';
    });
  }

  // JSON confirm button (accept replacement)
  if (jsonConfirmBtn) {
    jsonConfirmBtn.addEventListener('click', async () => {
      if (pendingJSONFile) {
        await processJSONFile(pendingJSONFile);
        pendingJSONFile = null;
      }
    });
  }

  // JSON file input
  if (jsonInput) {
    jsonInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await handleJSONUpload(file);
      }
    });
  }

  // PDF file input
  if (pdfInput) {
    pdfInput.addEventListener('change', (e) => {
      updatePdfFileList(e.target.files);
    });
  }

  // Process PDFs button
  if (processBtn) {
    processBtn.addEventListener('click', handlePDFProcess);
  }

  // Setup dropzones
  setupDropzone(jsonDropzone, jsonInput, 'json');
  setupDropzone(pdfDropzone, pdfInput, 'pdf');
}

// Setup drag and drop
function setupDropzone(dropzone, input, type) {
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
    if (type === 'json' && files.length > 0) {
      await handleJSONUpload(files[0]);
    } else if (type === 'pdf') {
      // Merge with existing selection
      const dt = new DataTransfer();
      const existingFiles = document.getElementById('pdfFileInput').files;
      for (const f of existingFiles) dt.items.add(f);
      for (const f of files) {
        if (f.type === 'application/pdf' || f.type.startsWith('image/')) dt.items.add(f);
      }
      document.getElementById('pdfFileInput').files = dt.files;
      updatePdfFileList(dt.files);
    }
  });

  dropzone.addEventListener('click', () => input?.click());
}

// Pending JSON file for confirmation
let pendingJSONFile = null;

// Handle JSON file upload
async function handleJSONUpload(file) {
  const status = document.getElementById('jsonStatus');
  const warning = document.getElementById('jsonWarning');
  const warningText = warning?.querySelector('.warning-text');

  // Check if there are existing tickets and show warning
  if (ticketsData && ticketsData.length > 0) {
    pendingJSONFile = file;
    if (warning && warningText) {
      warningText.textContent = `Actualmente tienes ${ticketsData.length} tickets cargados. Subir este archivo JSON REEMPLAZARÁ todos los datos existentes.`;
      warning.style.display = 'block';
    }
    return;
  }

  await processJSONFile(file);
}

// Process JSON file (after confirmation if needed)
async function processJSONFile(file) {
  const status = document.getElementById('jsonStatus');
  const warning = document.getElementById('jsonWarning');

  // Hide warning if visible
  if (warning) warning.style.display = 'none';

  try {
    status.innerHTML = '<span class="loading-spinner"></span> Cargando...';

    const text = await file.text();
    const data = JSON.parse(text);

    fullData = data;
    ticketsData = data.tickets || data;

    if (!ticketsData || ticketsData.length === 0) {
      throw new Error('No se encontraron tickets en el archivo');
    }

    status.innerHTML = `<span class="success">${ticketsData.length} tickets cargados correctamente</span>`;

    // Save to localStorage for persistence
    try {
      localStorage.setItem('shopping_tickets_data', JSON.stringify(fullData));
    } catch (e) {
      console.warn('Could not save to localStorage (data too large)');
    }

    setTimeout(() => {
      hideDataLoaderModal();
      startApp();
    }, 1000);

  } catch (error) {
    status.innerHTML = `<span class="error">Error: ${error.message}</span>`;
  }
}

// Update PDF file list display
function updatePdfFileList(files) {
  const listEl = document.getElementById('pdfFileList');
  const processBtn = document.getElementById('processPdfsBtn');

  if (files.length === 0) {
    listEl.innerHTML = '<p class="text-muted">No hay archivos seleccionados</p>';
    processBtn.disabled = true;
    return;
  }

  listEl.innerHTML = `
    <p><strong>${files.length} archivo(s) seleccionado(s):</strong></p>
    <ul class="file-list">
      ${Array.from(files).slice(0, 10).map(f => `<li>${f.name}</li>`).join('')}
      ${files.length > 10 ? `<li>... y ${files.length - 10} más</li>` : ''}
    </ul>
  `;
  processBtn.disabled = false;
}

// Handle File processing (PDFs and Images)
async function handlePDFProcess() {
  const pdfInput = document.getElementById('pdfFileInput');
  const files = Array.from(pdfInput.files);
  const progressEl = document.getElementById('pdfProgress');
  const processBtn = document.getElementById('processPdfsBtn');

  if (files.length === 0) return;

  processBtn.disabled = true;
  progressEl.style.display = 'block';

  try {
    const pdfFiles = files.filter(f => f.type === 'application/pdf');
    const imageFiles = files.filter(f => f.type.startsWith('image/'));

    let newTickets = [];

    // Process PDFs
    if (pdfFiles.length > 0) {
      const pdfTickets = await processPDFs(pdfFiles, (current, total, filename) => {
        const percent = Math.round((current / total) * 100);
        progressEl.innerHTML = `
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${percent}%"></div>
          </div>
          <p>Procesando PDF ${current}/${total}: ${filename}</p>
        `;
      });
      newTickets = newTickets.concat(pdfTickets);
    }

    // Process Images
    if (imageFiles.length > 0) {
      const imageTickets = await processImages(imageFiles, (current, total, filename) => {
        const percent = Math.round((current / total) * 100);
        progressEl.innerHTML = `
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${percent}%"></div>
          </div>
          <p>Procesando Imagen ${current}/${total}: ${filename}</p>
        `;
      });
      newTickets = newTickets.concat(imageTickets);
    }

    if (newTickets.length === 0) {
      throw new Error('No se pudieron extraer tickets de los archivos');
    }

    // Merge with existing tickets, avoiding duplicates
    const existingTickets = ticketsData || [];
    const mergedTickets = mergeTickets(existingTickets, newTickets);
    const addedCount = mergedTickets.length - existingTickets.length;
    const duplicateCount = newTickets.length - addedCount;

    fullData = buildTicketsData(mergedTickets);
    ticketsData = mergedTickets;

    let statusMsg = `${addedCount} tickets nuevos añadidos`;
    if (duplicateCount > 0) {
      statusMsg += ` (${duplicateCount} duplicados ignorados)`;
    }
    progressEl.innerHTML = `<span class="success">${statusMsg}</span>`;

    // Save to localStorage
    try {
      localStorage.setItem('shopping_tickets_data', JSON.stringify(fullData));
    } catch (e) {
      console.warn('Could not save to localStorage (data too large)');
    }

    // Offer download
    setTimeout(() => {
      progressEl.innerHTML += `
        <br><br>
        <button class="btn btn-secondary" onclick="downloadGeneratedJSON()">
          Descargar tickets.json
        </button>
      `;
    }, 500);

    setTimeout(() => {
      hideDataLoaderModal();
      startApp();
    }, 2000);

    // Reset input
    pdfInput.value = '';
    updatePdfFileList([]);

  } catch (error) {
    progressEl.innerHTML = `<span class="error">Error: ${error.message}</span>`;
    processBtn.disabled = false;
  }
}

// Merge tickets avoiding duplicates (by date + total + item count)
function mergeTickets(existing, newTickets) {
  const getTicketKey = (t) => `${t.date}_${t.total.toFixed(2)}_${(t.items || []).length}`;

  const existingKeys = new Set(existing.map(getTicketKey));
  const merged = [...existing];

  for (const ticket of newTickets) {
    const key = getTicketKey(ticket);
    if (!existingKeys.has(key)) {
      merged.push(ticket);
      existingKeys.add(key);
    }
  }

  // Sort by date descending
  merged.sort((a, b) => b.date.localeCompare(a.date));

  return merged;
}

// Download the generated JSON
function downloadGeneratedJSON() {
  if (!fullData) return;

  const json = JSON.stringify(fullData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tickets.json';
  a.click();
  URL.revokeObjectURL(url);
}

// Get filtered tickets based on current filters
function getFilteredTickets() {
  return ticketsData.filter(t => {
    if (currentYear !== 'all' && !t.date.startsWith(currentYear)) return false;
    if (currentStore !== 'all' && t.store !== currentStore) return false;
    return true;
  });
}

// Tab management
function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      switchTab(tabId);
    });
  });

  // Handle browser back/forward
  window.addEventListener('popstate', (e) => {
    if (e.state?.tab) {
      switchTab(e.state.tab, false);
    }
  });
}

function switchTab(tabId, pushState = true) {
  // Update active tab button
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  // Show selected tab content
  const tabContent = document.getElementById(`${tabId}Tab`);
  if (tabContent) {
    tabContent.classList.add('active');
  }

  // Save to localStorage
  localStorage.setItem('shopping_active_tab', tabId);

  // Update URL hash
  if (pushState) {
    history.pushState({ tab: tabId }, '', `#${tabId}`);
  }

  // Render tab content
  renderTab(tabId);
}

function renderTab(tabId) {
  switch (tabId) {
    case 'overview':
      renderOverview();
      break;
    case 'categories':
      renderCategories();
      break;
    case 'products':
      renderProducts();
      break;
    case 'prices':
      renderPriceHistory();
      break;
    case 'tickets':
      renderTicketsList();
      break;
    case 'insights':
      renderInsights();
      break;
  }
}

// Dark mode - auto detect from system preference
function setupDarkMode() {
  const savedTheme = localStorage.getItem('shopping_theme');

  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark-mode');
  }
}

// Filters
function setupFilters() {
  setupYearFilter();
  setupStoreFilter();
}

function setupYearFilter() {
  const select = document.getElementById('yearFilter');
  if (!select) return;

  // Get available years
  const years = [...new Set(ticketsData.map(t => t.date.substring(0, 4)))].sort().reverse();

  select.innerHTML = `
    <option value="all">Todos los años</option>
    ${years.map(y => `<option value="${y}">${y}</option>`).join('')}
  `;

  // Restore saved filter
  const savedYear = localStorage.getItem('shopping_year_filter');
  if (savedYear && (savedYear === 'all' || years.includes(savedYear))) {
    select.value = savedYear;
    currentYear = savedYear;
  }

  select.addEventListener('change', () => {
    currentYear = select.value;
    localStorage.setItem('shopping_year_filter', currentYear);
    const activeTab = localStorage.getItem('shopping_active_tab') || 'overview';
    renderTab(activeTab);
  });
}

function setupStoreFilter() {
  const select = document.getElementById('storeFilter');
  if (!select) return;

  // Get available stores
  const stores = [...new Set(ticketsData.map(t => t.store).filter(Boolean))].sort();

  // Always show filter if there are stores, even if just one, so user can see it's working
  if (stores.length === 0) {
    select.style.display = 'none';
    return;
  }

  select.style.display = 'inline-block';

  select.innerHTML = `
    <option value="all">Todas las tiendas</option>
    ${stores.map(s => `<option value="${s}">${s}</option>`).join('')}
  `;

  // Restore saved filter
  const savedStore = localStorage.getItem('shopping_store_filter');
  if (savedStore && (savedStore === 'all' || stores.includes(savedStore))) {
    select.value = savedStore;
    currentStore = savedStore;
  }

  select.addEventListener('change', () => {
    currentStore = select.value;
    localStorage.setItem('shopping_store_filter', currentStore);
    const activeTab = localStorage.getItem('shopping_active_tab') || 'overview';
    renderTab(activeTab);
  });
}

// Export functionality
function setupExport() {
  const btn = document.getElementById('exportBtn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const tickets = getFilteredTickets();

    // Prepare CSV
    let csv = 'Fecha,Tienda,Total,Productos\n';
    tickets.forEach(t => {
      csv += `"${t.date}","${t.store || 'Mercadona'}",${t.total},"${(t.items || []).map(i => i.name).join('; ')}"\n`;
    });

    downloadFile(csv, `shopping_tickets_${currentYear}.csv`, 'text/csv');
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);

// Also check URL hash on load
if (window.location.hash) {
  const tabFromHash = window.location.hash.substring(1);
  if (['overview', 'categories', 'products', 'prices', 'tickets', 'insights'].includes(tabFromHash)) {
    localStorage.setItem('shopping_active_tab', tabFromHash);
  }
}
