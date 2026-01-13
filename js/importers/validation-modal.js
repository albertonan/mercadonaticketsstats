/* ============================================
   VALIDATION MODAL
   Logic for validating and correcting OCR results
   ============================================ */

// State for validation
let pendingValidationTickets = [];
let currentValidationIndex = 0;
let validatedTickets = [];
let validationResolve = null;
let currentValidationOcrText = '';

// Start validation process for multiple tickets
function startTicketValidation(ticketsWithOcr) {
  return new Promise((resolve) => {
    if (!ticketsWithOcr || ticketsWithOcr.length === 0) {
      resolve([]);
      return;
    }

    pendingValidationTickets = ticketsWithOcr;
    currentValidationIndex = 0;
    validatedTickets = [];
    validationResolve = resolve;

    const { ticket, ocrText } = pendingValidationTickets[0];
    showTicketValidationModal(ticket, 0, pendingValidationTickets.length, ocrText);
  });
}

// Show validation modal for a ticket
function showTicketValidationModal(ticket, index, total, ocrText) {
  const modal = document.getElementById('ticketValidationModal');
  if (!modal) return;

  currentValidationOcrText = ocrText || '';

  // Update header
  document.getElementById('validationTicketNumber').textContent = `#${index + 1}`;
  document.getElementById('validationProgress').textContent = `Ticket ${index + 1} de ${total}`;

  // Populate fields
  document.getElementById('validationStore').value = ticket.store || 'Lidl';
  document.getElementById('validationDate').value = ticket.date || '';
  document.getElementById('validationTime').value = ticket.time || '';
  document.getElementById('validationTotal').value = ticket.total || 0;

  // Populate items
  renderValidationItems(ticket.items || []);

  // Show OCR text
  document.getElementById('validationOcrText').textContent = ocrText || '(No disponible)';

  // Show modal
  modal.classList.add('active');

  // Setup event listeners
  setupValidationEventListeners();
}

// Render items in validation table
function renderValidationItems(items) {
  const tbody = document.getElementById('validationItemsList');
  const countSpan = document.getElementById('validationItemCount');

  countSpan.textContent = items.length;

  tbody.innerHTML = items.map((item, idx) => `
    <tr data-index="${idx}">
      <td>
        <input type="text" value="${escapeHtml(item.name)}" class="item-name" data-field="name">
      </td>
      <td>
        <input type="number" value="${item.quantity || 1}" min="1" step="1" class="item-qty" data-field="quantity">
      </td>
      <td>
        <input type="number" value="${item.unitPrice || item.price}" min="0" step="0.01" class="item-unit-price" data-field="unitPrice">
      </td>
      <td class="validation-item-subtotal" data-subtotal>
        ${((item.quantity || 1) * (item.unitPrice || item.price)).toFixed(2)}€
      </td>
      <td>
        <button type="button" class="validation-delete-btn" data-delete="${idx}" title="Eliminar">×</button>
      </td>
    </tr>
  `).join('');

  updateValidationSummary();
}

// Update summary calculations
function updateValidationSummary() {
  const rows = document.querySelectorAll('#validationItemsList tr');
  let sum = 0;

  rows.forEach(row => {
    const qty = parseFloat(row.querySelector('.item-qty')?.value) || 1;
    const unitPrice = parseFloat(row.querySelector('.item-unit-price')?.value) || 0;
    const subtotal = qty * unitPrice;
    sum += subtotal;

    const subtotalCell = row.querySelector('[data-subtotal]');
    if (subtotalCell) {
      subtotalCell.textContent = subtotal.toFixed(2) + '€';
    }
  });

  document.getElementById('validationItemsSum').textContent = sum.toFixed(2) + '€';
  document.getElementById('validationItemCount').textContent = rows.length;

  // Compare with total
  const total = parseFloat(document.getElementById('validationTotal').value) || 0;
  const diff = Math.abs(sum - total);
  const diffEl = document.getElementById('validationDiff');

  if (diff < 0.02) {
    diffEl.textContent = '✓ Coincide';
    diffEl.className = 'validation-diff match';
  } else {
    const diffSign = sum > total ? '+' : '-';
    diffEl.textContent = `${diffSign}${diff.toFixed(2)}€ diferencia`;
    diffEl.className = 'validation-diff mismatch';
  }
}

// Setup event listeners for validation modal
function setupValidationEventListeners() {
  const tbody = document.getElementById('validationItemsList');
  const addBtn = document.getElementById('addValidationItem');
  const confirmBtn = document.getElementById('confirmTicketBtn');
  const skipBtn = document.getElementById('skipTicketBtn');

  // Remove old listeners by cloning
  const newAddBtn = addBtn.cloneNode(true);
  addBtn.parentNode.replaceChild(newAddBtn, addBtn);

  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  const newSkipBtn = skipBtn.cloneNode(true);
  skipBtn.parentNode.replaceChild(newSkipBtn, skipBtn);

  // Add item button
  newAddBtn.addEventListener('click', () => {
    const newRow = document.createElement('tr');
    const idx = tbody.querySelectorAll('tr').length;
    newRow.dataset.index = idx;
    newRow.innerHTML = `
      <td>
        <input type="text" value="" class="item-name" data-field="name" placeholder="Nombre del producto">
      </td>
      <td>
        <input type="number" value="1" min="1" step="1" class="item-qty" data-field="quantity">
      </td>
      <td>
        <input type="number" value="0.00" min="0" step="0.01" class="item-unit-price" data-field="unitPrice">
      </td>
      <td class="validation-item-subtotal" data-subtotal>0.00€</td>
      <td>
        <button type="button" class="validation-delete-btn" data-delete="${idx}" title="Eliminar">×</button>
      </td>
    `;
    tbody.appendChild(newRow);
    newRow.querySelector('.item-name').focus();
    updateValidationSummary();
  });

  // Event delegation for tbody
  tbody.addEventListener('input', (e) => {
    if (e.target.matches('input')) {
      updateValidationSummary();
    }
  });

  tbody.addEventListener('click', (e) => {
    if (e.target.matches('.validation-delete-btn')) {
      e.target.closest('tr').remove();
      updateValidationSummary();
    }
  });

  // Confirm button
  newConfirmBtn.addEventListener('click', () => {
    const ticket = collectValidatedTicket();
    validatedTickets.push(ticket);
    hideTicketValidationModal();
    processNextValidationTicket();
  });

  // Skip button
  newSkipBtn.addEventListener('click', () => {
    hideTicketValidationModal();
    processNextValidationTicket();
  });
}

// Collect validated ticket data from form
function collectValidatedTicket() {
  const rows = document.querySelectorAll('#validationItemsList tr');
  const items = [];

  rows.forEach(row => {
    const name = row.querySelector('.item-name')?.value?.trim();
    const qty = parseInt(row.querySelector('.item-qty')?.value) || 1;
    const unitPrice = parseFloat(row.querySelector('.item-unit-price')?.value) || 0;

    if (name && unitPrice > 0) {
      items.push({
        name: name,
        quantity: qty,
        unitPrice: Math.round(unitPrice * 100) / 100,
        price: Math.round(qty * unitPrice * 100) / 100,
        category: categorizeProduct(name)
      });
    }
  });

  const store = document.getElementById('validationStore').value || 'Lidl';
  const date = document.getElementById('validationDate').value;
  const time = document.getElementById('validationTime').value || '12:00';
  const total = parseFloat(document.getElementById('validationTotal').value) || 0;

  // Generate ID
  const cleanDate = date.replace(/-/g, '');
  const hash = Math.abs(items.map(i => i.name).join('').split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0));
  const id = `${store.toUpperCase().replace(/\s+/g, '-')}-${cleanDate}-${hash}`;

  return {
    id: id,
    date: date,
    time: time,
    total: Math.round(total * 100) / 100,
    store: store,
    items: items
  };
}

// Hide validation modal
function hideTicketValidationModal() {
  const modal = document.getElementById('ticketValidationModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Process next ticket in queue
function processNextValidationTicket() {
  currentValidationIndex++;

  if (currentValidationIndex < pendingValidationTickets.length) {
    const { ticket, ocrText } = pendingValidationTickets[currentValidationIndex];
    showTicketValidationModal(ticket, currentValidationIndex, pendingValidationTickets.length, ocrText);
  } else {
    // All done
    if (validationResolve) {
      validationResolve(validatedTickets);
      validationResolve = null;
    }
    pendingValidationTickets = [];
    currentValidationIndex = 0;
    validatedTickets = [];
  }
}
