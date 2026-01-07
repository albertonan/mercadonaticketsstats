/* ============================================
   MERCADONA STATS - TICKETS TAB
   ============================================ */

// Tickets tab state
let ticketsCurrentPage = 1;
let ticketsPerPage = 10;
let ticketsSort = 'date-desc';
let ticketsSearch = '';

function renderTicketsList() {
  const tickets = getFilteredTickets();
  
  // Setup search and sort
  setupTicketsControls();
  
  // Render stats
  renderTicketsStats(tickets);
  
  // Render ticket list
  updateTicketsList(tickets);
}

function setupTicketsControls() {
  const searchInput = document.getElementById('ticketSearch');
  const sortSelect = document.getElementById('ticketSort');
  const perPageSelect = document.getElementById('ticketsPerPage');
  
  if (searchInput) {
    searchInput.value = ticketsSearch;
    searchInput.addEventListener('input', debounce(() => {
      ticketsSearch = searchInput.value;
      ticketsCurrentPage = 1;
      updateTicketsList(getFilteredTickets());
    }, 300));
  }
  
  if (sortSelect) {
    sortSelect.value = ticketsSort;
    sortSelect.addEventListener('change', () => {
      ticketsSort = sortSelect.value;
      ticketsCurrentPage = 1;
      updateTicketsList(getFilteredTickets());
    });
  }
  
  if (perPageSelect) {
    perPageSelect.value = ticketsPerPage;
    perPageSelect.addEventListener('change', () => {
      ticketsPerPage = parseInt(perPageSelect.value);
      ticketsCurrentPage = 1;
      updateTicketsList(getFilteredTickets());
    });
  }
}

function renderTicketsStats(tickets) {
  const container = document.getElementById('ticketsStats');
  if (!container) return;
  
  const total = tickets.reduce((sum, t) => sum + t.total, 0);
  const avgTicket = tickets.length > 0 ? total / tickets.length : 0;
  const maxTicket = tickets.length > 0 ? Math.max(...tickets.map(t => t.total)) : 0;
  const totalItems = tickets.reduce((sum, t) => sum + (t.items?.length || 0), 0);
  
  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-content">
        <div class="stat-label">Total tickets</div>
        <div class="stat-value">${tickets.length}</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-content">
        <div class="stat-label">Gasto total</div>
        <div class="stat-value">${formatCurrency(total)}</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-content">
        <div class="stat-label">Media por ticket</div>
        <div class="stat-value">${formatCurrency(avgTicket)}</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-content">
        <div class="stat-label">Ticket más alto</div>
        <div class="stat-value">${formatCurrency(maxTicket)}</div>
      </div>
    </div>
  `;
}

function updateTicketsList(tickets) {
  // Filter by search
  let filtered = tickets;
  if (ticketsSearch) {
    const query = ticketsSearch.toLowerCase();
    filtered = tickets.filter(t => 
      t.store?.toLowerCase().includes(query) ||
      t.date?.includes(query) ||
      t.items?.some(i => i.name?.toLowerCase().includes(query))
    );
  }
  
  // Sort
  switch(ticketsSort) {
    case 'date-asc':
      filtered.sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));
      break;
    case 'total-desc':
      filtered.sort((a, b) => b.total - a.total);
      break;
    case 'total-asc':
      filtered.sort((a, b) => a.total - b.total);
      break;
    case 'items-desc':
      filtered.sort((a, b) => (b.items?.length || 0) - (a.items?.length || 0));
      break;
    default: // date-desc
      filtered.sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
  }
  
  // Pagination
  const totalPages = Math.ceil(filtered.length / ticketsPerPage);
  const startIndex = (ticketsCurrentPage - 1) * ticketsPerPage;
  const endIndex = startIndex + ticketsPerPage;
  const pageTickets = filtered.slice(startIndex, endIndex);
  
  // Render list
  const container = document.getElementById('ticketListContainer');
  if (!container) return;
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <p>No se encontraron tickets${ticketsSearch ? ` para "${ticketsSearch}"` : ''}</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="ticket-grid">
      ${pageTickets.map((t, i) => `
        <div class="ticket-card" onclick="showTicketDetail(${startIndex + i})">
          <div class="ticket-header">
            <div class="ticket-date">
              <span class="date-day">${parseLocalDate(t.date).getDate()}</span>
              <span class="date-month">${parseLocalDate(t.date).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}</span>
            </div>
            <div class="ticket-total">${formatCurrency(t.total)}</div>
          </div>
          <div class="ticket-info">
            <div class="ticket-store">${t.store || 'Mercadona'}</div>
            <div class="ticket-items">${t.items?.length || 0} productos</div>
          </div>
          <div class="ticket-preview">
            ${(t.items || []).slice(0, 3).map(i => `<span class="preview-item">${truncate(i.name, 15)}</span>`).join('')}
            ${(t.items?.length || 0) > 3 ? `<span class="preview-more">+${t.items.length - 3} más</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    
    <div class="pagination">
      <button class="btn btn-secondary" onclick="changeTicketsPage(-1)" ${ticketsCurrentPage === 1 ? 'disabled' : ''}>
        ← Anterior
      </button>
      <span class="page-info">Página ${ticketsCurrentPage} de ${totalPages} (${filtered.length} tickets)</span>
      <button class="btn btn-secondary" onclick="changeTicketsPage(1)" ${ticketsCurrentPage === totalPages ? 'disabled' : ''}>
        Siguiente →
      </button>
    </div>
  `;
}

function changeTicketsPage(delta) {
  const tickets = getFilteredTickets();
  let filtered = tickets;
  if (ticketsSearch) {
    const query = ticketsSearch.toLowerCase();
    filtered = tickets.filter(t => 
      t.store?.toLowerCase().includes(query) ||
      t.date?.includes(query) ||
      t.items?.some(i => i.name?.toLowerCase().includes(query))
    );
  }
  const totalPages = Math.ceil(filtered.length / ticketsPerPage);
  
  ticketsCurrentPage = Math.max(1, Math.min(totalPages, ticketsCurrentPage + delta));
  updateTicketsList(tickets);
}

function showTicketDetail(index) {
  const tickets = getFilteredTickets();
  
  // Apply same filters as list
  let filtered = tickets;
  if (ticketsSearch) {
    const query = ticketsSearch.toLowerCase();
    filtered = tickets.filter(t => 
      t.store?.toLowerCase().includes(query) ||
      t.date?.includes(query) ||
      t.items?.some(i => i.name?.toLowerCase().includes(query))
    );
  }
  
  // Apply same sort as list
  switch(ticketsSort) {
    case 'date-asc':
      filtered.sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));
      break;
    case 'total-desc':
      filtered.sort((a, b) => b.total - a.total);
      break;
    case 'total-asc':
      filtered.sort((a, b) => a.total - b.total);
      break;
    case 'items-desc':
      filtered.sort((a, b) => (b.items?.length || 0) - (a.items?.length || 0));
      break;
    default:
      filtered.sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
  }
  
  const ticket = filtered[index];
  if (!ticket) return;
  
  // Group items by category
  const byCategory = {};
  (ticket.items || []).forEach(item => {
    const cat = item.category || 'otros';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  });
  
  const modal = document.getElementById('ticketModal');
  const content = document.getElementById('ticketModalContent');
  
  if (!modal || !content) return;
  
  content.innerHTML = `
    <div class="modal-header">
      <h2>Ticket del ${formatDate(ticket.date)}</h2>
      <button class="modal-close" onclick="closeTicketModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="ticket-detail-header">
        <div class="detail-info">
          <p><strong>Tienda:</strong> ${ticket.store || 'Mercadona'}</p>
          <p><strong>Hora:</strong> ${ticket.time || 'N/A'}</p>
          <p><strong>Productos:</strong> ${ticket.items?.length || 0}</p>
        </div>
        <div class="detail-total">
          <span class="total-label">Total</span>
          <span class="total-value">${formatCurrency(ticket.total)}</span>
        </div>
      </div>
      
      <div class="ticket-items-detail">
        ${Object.entries(byCategory).map(([cat, items]) => `
          <div class="category-group">
            <h4>${getCategoryEmoji(cat)} ${cat}</h4>
            <div class="items-list">
              ${items.map(i => `
                <div class="item-row">
                  <span class="item-name">${i.name}</span>
                  <span class="item-qty">${i.quantity || 1}x</span>
                  <span class="item-price">${formatCurrency(i.price)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="modal-actions">
        <button class="btn btn-danger" onclick="deleteTicket(${index})">Borrar ticket</button>
        <button class="btn btn-secondary" onclick="copyTicketToClipboard(${index})">Copiar</button>
        <button class="btn btn-primary" onclick="closeTicketModal()">Cerrar</button>
      </div>
    </div>
  `;
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeTicketModal() {
  const modal = document.getElementById('ticketModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function deleteTicket(index) {
  const tickets = getFilteredTickets();
  let filtered = tickets;
  if (ticketsSearch) {
    const query = ticketsSearch.toLowerCase();
    filtered = tickets.filter(t => 
      t.store?.toLowerCase().includes(query) ||
      t.date?.includes(query) ||
      t.items?.some(i => i.name?.toLowerCase().includes(query))
    );
  }
  
  switch(ticketsSort) {
    case 'date-asc':
      filtered.sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));
      break;
    case 'total-desc':
      filtered.sort((a, b) => b.total - a.total);
      break;
    case 'total-asc':
      filtered.sort((a, b) => a.total - b.total);
      break;
    case 'items-desc':
      filtered.sort((a, b) => (b.items?.length || 0) - (a.items?.length || 0));
      break;
    default:
      filtered.sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
  }
  
  const ticket = filtered[index];
  if (!ticket) return;
  
  if (!confirm(`¿Estás seguro de que quieres borrar el ticket del ${formatDate(ticket.date)} (${formatCurrency(ticket.total)})?`)) {
    return;
  }
  
  // Find and remove from ticketsData
  const ticketIndex = ticketsData.findIndex(t => 
    t.date === ticket.date && t.time === ticket.time && t.total === ticket.total
  );
  
  if (ticketIndex !== -1) {
    ticketsData.splice(ticketIndex, 1);
    
    // Update fullData
    if (fullData) {
      if (fullData.tickets) {
        fullData.tickets = ticketsData;
      } else {
        fullData = ticketsData;
      }
    }
    
    // Save to localStorage
    try {
      localStorage.setItem('mercadona_tickets_data', JSON.stringify(fullData));
    } catch (e) {
      console.warn('Could not save to localStorage');
    }
    
    // Close modal and refresh
    closeTicketModal();
    renderTicketsList();
    updatePeriodInfo();
  }
}

function copyTicketToClipboard(index) {
  const tickets = getFilteredTickets();
  let filtered = tickets;
  if (ticketsSearch) {
    const query = ticketsSearch.toLowerCase();
    filtered = tickets.filter(t => 
      t.store?.toLowerCase().includes(query) ||
      t.date?.includes(query) ||
      t.items?.some(i => i.name?.toLowerCase().includes(query))
    );
  }
  
  switch(ticketsSort) {
    case 'date-asc':
      filtered.sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));
      break;
    case 'total-desc':
      filtered.sort((a, b) => b.total - a.total);
      break;
    case 'total-asc':
      filtered.sort((a, b) => a.total - b.total);
      break;
    case 'items-desc':
      filtered.sort((a, b) => (b.items?.length || 0) - (a.items?.length || 0));
      break;
    default:
      filtered.sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
  }
  
  const ticket = filtered[index];
  if (!ticket) return;
  
  let text = `MERCADONA - ${ticket.store || 'Tienda'}\n`;
  text += `Fecha: ${formatDate(ticket.date)}\n`;
  text += `Hora: ${ticket.time || 'N/A'}\n`;
  text += `${'─'.repeat(40)}\n\n`;
  
  (ticket.items || []).forEach(i => {
    text += `${i.name}\n`;
    text += `  ${i.quantity || 1}x ${formatCurrency(i.unitPrice || i.price)} = ${formatCurrency(i.price)}\n`;
  });
  
  text += `\n${'─'.repeat(40)}\n`;
  text += `TOTAL: ${formatCurrency(ticket.total)}\n`;
  
  navigator.clipboard.writeText(text).then(() => {
    alert('Ticket copiado al portapapeles');
  }).catch(() => {
    alert('Error al copiar');
  });
}
