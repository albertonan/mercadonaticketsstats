/* ============================================
   MERCADONA STATS - PRODUCTS TAB
   ============================================ */

function renderProducts() {
  const tickets = getFilteredTickets();

  // Calculate product totals
  const productData = {};
  tickets.forEach(t => {
    if (!t.items) return;
    t.items.forEach(item => {
      const name = getNormalizedName(item.name); // Use normalized name
      if (!productData[name]) {
        productData[name] = {
          total: 0,
          count: 0,
          frequency: 0,
          category: item.category || 'otros',
          prices: [],
          rawNames: new Set() // Track original names
        };
      }
      productData[name].total += item.price;
      productData[name].count += item.quantity || 1;
      productData[name].frequency++;
      productData[name].prices.push(item.unitPrice || item.price);
      productData[name].rawNames.add(item.name);
    });
  });

  // Update product count badge
  const badge = document.getElementById('productCountBadge');
  if (badge) badge.textContent = `${Object.keys(productData).length} productos`;

  // Setup search
  setupProductSearch(productData);

  // Render top products chart
  renderTopProductsChart(productData);

  // Render product table
  // Render product table
  renderProductTable(productData);

  // Setup Product Manager Button
  setupProductManagerBtn();
}

function setupProductSearch(productData) {
  const input = document.getElementById('productSearch');
  const results = document.getElementById('searchResults');
  if (!input || !results) return;

  // Store product data globally for click handlers
  window._productData = productData;

  input.addEventListener('input', debounce(() => {
    const query = input.value.toLowerCase().trim();
    if (query.length < 2) {
      results.innerHTML = '';
      return;
    }

    const matches = Object.entries(productData)
      .filter(([name]) => name.toLowerCase().includes(query))
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    results.innerHTML = matches.length > 0 ? matches.map(([name, data]) => {
      const avgPrice = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
      return `
        <div class="product-item clickable" onclick="handleProductClick('${escapeAttr(name)}')">
          <div class="product-icon">${getCategoryEmoji(data.category)}</div>
          <div class="product-info">
            <div class="product-name">${name}</div>
            <div class="product-meta">
              Comprado ${data.count}x · Precio medio: ${formatCurrency(avgPrice)}
            </div>
          </div>
          <div class="product-price">${formatCurrency(data.total)}</div>
        </div>
      `;
    }).join('') : '<p style="padding:16px;color:var(--text-muted);text-align:center;">Sin resultados</p>';
  }, 300));
}

// Helper to escape attribute values
function escapeAttr(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

function renderTopProductsChart(productData) {
  const sortSelect = document.getElementById('topProductsSort');
  if (!sortSelect) return;

  const renderChart = () => {
    const sortBy = sortSelect.value;
    let sorted;

    switch (sortBy) {
      case 'quantity':
        sorted = Object.entries(productData).sort((a, b) => b[1].count - a[1].count);
        break;
      case 'frequency':
        sorted = Object.entries(productData).sort((a, b) => b[1].frequency - a[1].frequency);
        break;
      default:
        sorted = Object.entries(productData).sort((a, b) => b[1].total - a[1].total);
    }

    const top10 = sorted.slice(0, 10);
    const labels = top10.map(([name]) => truncate(name, 20));
    const data = top10.map(([_, d]) => sortBy === 'quantity' ? d.count : sortBy === 'frequency' ? d.frequency : d.total);
    const colors = top10.map(([_, d]) => getCategoryColor(Object.keys(productData).indexOf(_) % 9));

    destroyChart('topProductsChart');

    const canvas = document.getElementById('topProductsChart');
    if (!canvas) return;

    charts['topProductsChart'] = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: sortBy === 'quantity' ? 'Cantidad' : sortBy === 'frequency' ? 'Frecuencia' : 'Gasto',
          data,
          backgroundColor: colors,
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
              label: ctx => sortBy === 'spent' ? formatCurrency(ctx.raw) : `${ctx.raw} ${sortBy === 'quantity' ? 'unidades' : 'compras'}`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: v => sortBy === 'spent' ? formatCurrency(v) : v
            }
          }
        }
      }
    });
  };

  sortSelect.addEventListener('change', renderChart);
  renderChart();
}

function renderProductTable(productData) {
  const container = document.getElementById('productTable');
  if (!container) return;

  const sorted = Object.entries(productData).sort((a, b) => b[1].total - a[1].total);

  // Store product data globally for click handlers
  window._productData = productData;

  container.innerHTML = `
    <div class="table-container" style="max-height: 500px; overflow-y: auto;">
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Categoría</th>
            <th style="text-align: right;">Cantidad</th>
            <th style="text-align: right;">Frecuencia</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.slice(0, 100).map(([name, data]) => `
            <tr class="clickable-row" onclick="handleProductClick('${escapeAttr(name)}')" title="Ver información nutricional">
              <td>${name}</td>
              <td>${getCategoryEmoji(data.category)} ${data.category}</td>
              <td style="text-align: right;">${data.count}</td>
              <td style="text-align: right;">${data.frequency}x</td>
              <td style="text-align: right;">${formatCurrency(data.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ${sorted.length > 100 ? `<p style="text-align: center; color: var(--text-muted); margin-top: 16px;">Mostrando 100 de ${sorted.length} productos</p>` : ''}
  `;
}

// Handle product click from table
function handleProductClick(productName) {
  const data = window._productData?.[productName];
  if (data) {
    showNutritionModal(productName, data);
  }
}

// ==========================================
// PRODUCT GROUPING MANAGER
// ==========================================

function setupProductManagerBtn() {
  const btn = document.getElementById('manageAliasesBtn');
  if (btn) {
    // Remove old listeners to avoid duplicates if re-rendered
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', openProductGroupingModal);
  }
}

let selectedUnmapped = new Set();
let selectedCanonical = null;

function openProductGroupingModal() {
  const modal = document.getElementById('groupingModal');
  if (!modal) return;

  modal.classList.add('active');
  renderGroupingLists();

  // Listeners
  document.getElementById('closeGroupingModalBtn').onclick = () => modal.classList.remove('active');

  document.getElementById('groupingSearch').oninput = (e) => {
    renderUnmappedList(e.target.value);
  };

  document.getElementById('newGroupBtn').onclick = () => {
    openGroupEditor('');
  };

  document.getElementById('linkProductsBtn').onclick = linkSelectedProducts;

  document.getElementById('saveGroupBtn').onclick = saveGroupEditor;
  document.getElementById('cancelGroupBtn').onclick = closeGroupEditor;

  document.getElementById('autoSuggestBtn').onclick = runAutoSuggest;
  document.getElementById('closeSuggestBtn').onclick = () => {
    document.getElementById('autoSuggestPanel').style.display = 'none';
  };
}

function renderGroupingLists() {
  // 1. Get all raw names from tickets
  const allRawNames = new Set();
  ticketsData.forEach(t => t.items?.forEach(i => allRawNames.add(i.name)));

  // 2. Separate into Mapped and Unmapped
  const unmapped = [];
  const canonicalGroups = productMapping; // New structure: canonical -> [aliases]

  allRawNames.forEach(raw => {
    // Check if raw name is in any group (via reverse lookup)
    const normalized = getNormalizedName(raw);

    // If normalized name equals raw name, it implies no mapping found (unless it IS the canonical name itself)
    // But with new structure, normalized is the Group Name.
    // If raw name matches a Group Name, it might technically be "mapped" to itself if it's in the list?
    // Actually getNormalizedName returns Key if found in ReverseMap.

    // We want to list items that are NOT in any group yet.
    // Use reverseMapping directly for check? No, rely on public helper.

    // If raw is in a group, getNormalizedName returns the Group Name.
    // If raw is NOT in a group, getNormalizedName returns raw.

    if (normalized === raw && !canonicalGroups[raw]) {
      // It's unmapped AND it is not a group name itself
      unmapped.push(raw);
    }
    // Note: If 'raw' IS the group name (e.g. "Leche"), it won't be in unmapped because canonicalGroups["Leche"] exists.
    // But we should verify if "Leche" is INSIDE the list of "Leche"?
    // The previous logic was simpler.

    // Let's rely on: Is it in reverse map?
    if (typeof productReverseMapping !== 'undefined') {
      if (!productReverseMapping[raw.toLowerCase().trim()]) {
        // Not an alias of anything
        // Also check if it is a canonical key itself that hasn't self-referenced?
        // Actually, if I create group "Leche", "Leche" usually isn't in the alias list unless explicit.
        // But for visual purposes, "Leche" is the group.

        // If this raw name matches an existing Group Key, don't show as unmapped, it's the header.
        if (!canonicalGroups[raw]) {
          unmapped.push(raw);
        }
      }
    } else {
      // Fallback if reverse map not ready (shouldn't happen)
      if (getNormalizedName(raw) === raw && !productMapping[raw]) {
        unmapped.push(raw);
      }
    }
  });

  // Sort
  unmapped.sort();

  // Render Unmapped
  window._unmappedProducts = unmapped; // Store for filtering
  renderUnmappedList('');

  // Render Canonical
  const canonicalContainer = document.getElementById('canonicalList');
  canonicalContainer.innerHTML = Object.entries(canonicalGroups).sort().map(([group, aliases]) => {
    const count = aliases ? aliases.length : 0;
    const isSelected = selectedCanonical === group;
    return `
            <div class="group-item ${isSelected ? 'selected' : ''}" 
                 onclick="selectCanonical('${escapeAttr(group)}')"
                 style="padding: 8px; border-bottom: 1px solid #eee; cursor: pointer; background: ${isSelected ? '#e6fffa' : 'white'};">
                <div style="font-weight: 600;">${group}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${count} variantes vinculadas</div>
            </div>
        `;
  }).join('');
}

function renderUnmappedList(filter) {
  const container = document.getElementById('unmappedList');
  const filtered = window._unmappedProducts.filter(p => p.toLowerCase().includes(filter.toLowerCase()));

  container.innerHTML = filtered.map(p => {
    const isSelected = selectedUnmapped.has(p);
    return `
            <div class="unmapped-item" 
                 onclick="toggleUnmapped('${escapeAttr(p)}')"
                 style="padding: 6px; border-bottom: 1px solid #eee; cursor: pointer; background: ${isSelected ? '#ebf8ff' : 'white'}; display: flex; align-items: center;">
                <input type="checkbox" ${isSelected ? 'checked' : ''} style="margin-right: 8px; pointer-events: none;">
                <span style="font-size: 0.85rem;">${p}</span>
            </div>
        `;
  }).join('');
}

function toggleUnmapped(name) {
  if (selectedUnmapped.has(name)) {
    selectedUnmapped.delete(name);
  } else {
    selectedUnmapped.add(name);
  }
  renderUnmappedList(document.getElementById('groupingSearch').value);
  updateLinkButton();
}

function selectCanonical(name) {
  if (selectedCanonical === name) {
    // Edit mode if clicking twice? Or just select.
    openGroupEditor(name);
    selectedCanonical = null; // Deselect after opening editor
  } else {
    selectedCanonical = name;
  }
  renderGroupingLists();
  updateLinkButton();
}

function updateLinkButton() {
  const btn = document.getElementById('linkProductsBtn');
  // Enable if unmapped selected AND canonical selected
  if (selectedUnmapped.size > 0 && selectedCanonical) {
    btn.disabled = false;
    btn.title = `Vincular ${selectedUnmapped.size} productos a "${selectedCanonical}"`;
  } else {
    btn.disabled = true;
  }
}

function linkSelectedProducts() {
  if (!selectedCanonical || selectedUnmapped.size === 0) return;

  selectedUnmapped.forEach(raw => {
    updateProductMapping(raw, selectedCanonical);
  });

  selectedUnmapped.clear();
  renderGroupingLists();

  // Refresh main view in background
  renderProducts();
}

// Editor
function openGroupEditor(canonicalName) {
  const editor = document.getElementById('groupEditor');
  const input = document.getElementById('canonicalNameInput');
  const list = document.getElementById('linkedProductsList');

  editor.style.display = 'block';
  input.value = canonicalName;

  // Find linked products
  let linked = [];
  if (canonicalName && productMapping[canonicalName]) {
    linked = [...productMapping[canonicalName]];
  }

  list.innerHTML = linked.map(l => `
        <span class="badge" style="background:#edf2f7; color:#4a5568; display: flex; align-items: center; gap: 4px;">
            ${l} <span onclick="unlinkProduct('${escapeAttr(l)}')" style="cursor: pointer; color: #e53e3e;">&times;</span>
        </span>
    `).join('');

  // Scroll to bottom
  const modalContent = document.querySelector('.modal-content');
  modalContent.scrollTop = modalContent.scrollHeight;
}

function saveGroupEditor() {
  const newName = document.getElementById('canonicalNameInput').value.trim();
  if (!newName) return;

  // NOTE: If we are renaming a group, we need to move aliases.
  // But editor doesn't track "old name", only "selectedCanonical" in scope if we trust it?
  // We can infer it from context or we just create new group and let user delete old?
  // For now the editor assumes we are "adding/modifying" the group specified by input.

  // 1. Link selected unmapped products
  if (selectedUnmapped.size > 0) {
    selectedUnmapped.forEach(raw => updateProductMapping(raw, newName));
    selectedUnmapped.clear();
  }

  // 2. If 'selectedCanonical' was set and is different from newName, we might be renaming?
  // User might expect "Renaming" the group moves ALL existing items.
  if (selectedCanonical && selectedCanonical !== newName) {
    // Move all aliases from old group to new
    const oldAliases = productMapping[selectedCanonical] || [];
    oldAliases.forEach(alias => updateProductMapping(alias, newName));
    // Delete old group
    delete productMapping[selectedCanonical];
    updateProductMapping("force_save", null);
  }

  closeGroupEditor();
  renderGroupingLists();
  renderProducts();
}

function closeGroupEditor() {
  document.getElementById('groupEditor').style.display = 'none';
}

window.unlinkProduct = function (rawName) {
  updateProductMapping(rawName, null); // Remove mapping
  // Refresh editor list (tricky cause we need to know current canonical being edited)
  // For simplicity, just close editor and refresh lists
  closeGroupEditor();
  renderGroupingLists();
  renderProducts();
};

// ==========================================
// AUTO SUGGEST
// ==========================================
function runAutoSuggest() {
  const unmapped = window._unmappedProducts || [];
  const suggestions = [];
  const panel = document.getElementById('autoSuggestPanel');
  const tbody = document.getElementById('suggestionsTableBody');
  const badge = document.getElementById('suggestionCount');

  panel.style.display = 'block';
  tbody.innerHTML = '<tr><td colspan="4"><div class="loading-spinner"></div> Buscando coincidencias...</td></tr>';

  setTimeout(() => {
    // Compare unmapped vs unmapped
    for (let i = 0; i < unmapped.length; i++) {
      for (let j = i + 1; j < unmapped.length; j++) {
        const a = unmapped[i];
        const b = unmapped[j];
        const sim = calculateSimilarity(a, b);
        if (sim > 65) { // Threshold
          suggestions.push({ a, b, sim, type: 'new' });
        }
      }

      // Compare unmapped vs existing canonicals (to merge into existing)
      // (Skipped for simplicity, let's focus on grouping unmapped together first)
    }

    suggestions.sort((x, y) => y.sim - x.sim);

    badge.textContent = suggestions.length;

    if (suggestions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">No se encontraron sugerencias obvias.</td></tr>';
      return;
    }

    tbody.innerHTML = suggestions.slice(0, 50).map((s, idx) => `
            <tr>
                <td>${s.a}</td>
                <td>${s.b}</td>
                <td><div class="progress-bar" style="width: 50px; height: 6px; display: inline-block; vertical-align: middle;"><div class="progress-fill" style="width: ${s.sim}%"></div></div> ${s.sim.toFixed(0)}%</td>
                <td>
                    <button class="btn-small" onclick="acceptSuggestion('${escapeAttr(s.a)}', '${escapeAttr(s.b)}', this)">Agrupar</button>
                </td>
            </tr>
        `).join('');
  }, 100);
}

window.acceptSuggestion = function (a, b, btn) {
  // Determine a canonical name (shortest usually better?)
  const canonical = a.length < b.length ? a : b;

  updateProductMapping(a, canonical);
  updateProductMapping(b, canonical);

  btn.textContent = "Agrupado";
  btn.disabled = true;
  btn.style.background = "#48bb78";

  renderGroupingLists();
  renderProducts();
};
