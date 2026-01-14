/* ============================================
   SHOPPING STATS - MAIN APPLICATION
   ============================================ */

// Global state
// Global state
let ticketsData = [];
let currentYear = 'all';
let currentStore = 'all';
let fullData = null; // Complete data including categories
let productMapping = {}; // Canonical name mapping: { "Canonical Name": ["alias 1", "alias 2"] }
let productReverseMapping = {}; // Cache for fast lookup: { "alias 1": "Canonical Name" }

// App version - increment to force cache clear
const APP_VERSION = '2.2.0';
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
    'shopping_product_mapping',
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
    // Load mappings
    // Load mappings
    if (fullData && fullData.productMapping) {
      let mapping = fullData.productMapping;

      // AUTO-MIGRATION: Check if it's the old format (values are strings)
      const isOldFormat = Object.values(mapping).some(v => typeof v === 'string');

      if (isOldFormat) {
        console.log("Migrating product mapping to new format (One-to-Many)...");
        const newMapping = {};
        for (const [alias, canonical] of Object.entries(mapping)) {
          if (typeof canonical === 'string') {
            if (!newMapping[canonical]) newMapping[canonical] = [];
            newMapping[canonical].push(alias);
          }
        }
        productMapping = newMapping;
        // Trigger save
        updateProductMapping("force_save", null);
      } else {
        productMapping = mapping;
      }

      rebuildReverseMapping();
      console.log(`Loaded ${Object.keys(productMapping).length} product groups`);

    } else {
      // Fallback to legacy separate key...
      try {
        const savedMapping = localStorage.getItem('shopping_product_mapping');
        if (savedMapping) {
          const oldMapping = JSON.parse(savedMapping);
          // Migrate old mapping on the fly
          const newMapping = {};
          for (const [alias, canonical] of Object.entries(oldMapping)) {
            if (!newMapping[canonical]) newMapping[canonical] = [];
            newMapping[canonical].push(alias);
          }
          productMapping = newMapping;
          rebuildReverseMapping();

          console.log(`Loaded and migrated legacy product mappings`);
          updateProductMapping("force_save", null);
        }
      } catch (e) {
        console.warn('Error loading product mappings');
      }
    }

    startApp();
  }
}


// Helper to get normalized/canonical name for a product
// Rebuild the reverse mapping cache (for fast lookup)
function rebuildReverseMapping() {
  productReverseMapping = {};
  for (const [canonical, aliases] of Object.entries(productMapping)) {
    if (Array.isArray(aliases)) {
      aliases.forEach(alias => {
        productReverseMapping[alias.toLowerCase().trim()] = canonical;
      });
    }
  }
}

// Helper to get normalized/canonical name for a product
function getNormalizedName(rawName) {
  if (!rawName) return '';
  const normalizedKey = rawName.toLowerCase().trim();
  // Check fast lookup cache
  return productReverseMapping[normalizedKey] || rawName;
}

// Helper to update product mapping
function updateProductMapping(rawName, canonicalName) {
  if (rawName === "force_save") {
    // Just save
  } else {
    const alias = rawName.toLowerCase().trim();

    // 1. Remove from any existing group
    for (const [group, aliases] of Object.entries(productMapping)) {
      if (!Array.isArray(aliases)) continue;
      const filtered = aliases.filter(a => a.toLowerCase().trim() !== alias);
      if (filtered.length !== aliases.length) {
        if (filtered.length === 0) {
          delete productMapping[group]; // Remove empty group
        } else {
          productMapping[group] = filtered;
        }
      }
    }

    // 2. Add to new group if specified
    if (canonicalName) {
      if (!productMapping[canonicalName]) {
        productMapping[canonicalName] = [];
      }
      // Avoid duplicates
      const exists = productMapping[canonicalName].some(a => a.toLowerCase().trim() === alias);
      if (!exists) {
        productMapping[canonicalName].push(rawName); // Store original raw name preferred
      }
    }

    // 3. Update cache
    rebuildReverseMapping();
  }

  // Update fullData
  if (fullData) {
    fullData.productMapping = productMapping;
  }

  // Save to localStorage
  try {
    if (fullData) {
      localStorage.setItem('shopping_tickets_data', JSON.stringify(fullData));
    }
  } catch (e) {
    console.warn('Could not save product mapping');
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
  // Initialize Importers
  initJSONImporter();
  initFileImporter();

  const closeModalBtn = document.getElementById('closeModalBtn');
  const jsonWarning = document.getElementById('jsonWarning');

  // Close modal button
  if (closeModalBtn) {
    // Cloning to remove old listeners
    const newBtn = closeModalBtn.cloneNode(true);
    closeModalBtn.parentNode.replaceChild(newBtn, closeModalBtn);
    
    newBtn.addEventListener('click', () => {
      hideDataLoaderModal();
      if (typeof pendingJSONFile !== 'undefined') pendingJSONFile = null;
      if (jsonWarning) jsonWarning.style.display = 'none';
    });
  }
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

// Setup export functionality
function setupExport() {
  // Currently handled by inline onclick in HTML
}

// Download the current dataset as JSON
function downloadGeneratedJSON() {
  if (!ticketsData || ticketsData.length === 0) {
    alert("No hay datos para exportar");
    return;
  }
  
  const dataToSave = fullData || { tickets: ticketsData, productMapping: productMapping };
  const jsonStr = JSON.stringify(dataToSave, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `tickets_data_${new Date().toISOString().slice(0, 10)}.json`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', init);



