/* ============================================
   FILE IMPORTER (PDF & Image)
   Logic for importing files allowing both PDF parsing and OCR
   ============================================ */

// Initialize File Importer handlers
function initFileImporter() {
  const pdfInput = document.getElementById('pdfFileInput');
  const pdfDropzone = document.getElementById('pdfDropzone');
  const processBtn = document.getElementById('processPdfsBtn');
  
  if (pdfInput) {
    pdfInput.addEventListener('change', (e) => {
      updatePdfFileList(e.target.files);
    });
  }

  if (processBtn) {
    processBtn.addEventListener('click', handlePDFProcess);
  }

  setupDropzone(pdfDropzone, pdfInput, 'pdf', (files) => {
    // Merge with existing selection
    const dt = new DataTransfer();
    const existingFiles = document.getElementById('pdfFileInput').files;
    for (const f of existingFiles) dt.items.add(f);
    for (const f of files) {
      if (f.type === 'application/pdf' || f.type.startsWith('image/')) dt.items.add(f);
    }
    document.getElementById('pdfFileInput').files = dt.files;
    updatePdfFileList(dt.files);
  });
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

  // Reset input immediately so user can upload again without refreshing
  // This must happen before any async operation
  pdfInput.value = '';

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

    // Process Images with validation
    if (imageFiles.length > 0) {
      const imageResults = await processImages(imageFiles, (current, total, filename) => {
        const percent = Math.round((current / total) * 100);
        progressEl.innerHTML = `
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${percent}%"></div>
          </div>
          <p>Procesando Imagen ${current}/${total}: ${filename}</p>
        `;
      });

      // If we have image results, show validation modal
      if (imageResults.length > 0) {
        progressEl.innerHTML = `
          <p>OCR completado. Valida los ${imageResults.length} ticket(s) detectados...</p>
        `;

        // Hide the data loader modal temporarily to show validation modal
        hideDataLoaderModal();

        // Start validation process and wait for user to validate all tickets
        const validatedImageTickets = await startTicketValidation(imageResults);

        // Re-show data loader modal if there were results
        if (validatedImageTickets.length > 0 || newTickets.length > 0) {
          showDataLoaderModal();
        }

        newTickets = newTickets.concat(validatedImageTickets);
      }
    }

    if (newTickets.length === 0) {
      showDataLoaderModal();
      progressEl.innerHTML = `<span class="error">No se añadieron tickets (todos fueron omitidos o hubo errores)</span>`;
      processBtn.disabled = false;
      return;
    }

    // Merge with existing tickets, avoiding duplicates
    const existingTickets = ticketsData || [];
    const mergedTickets = mergeTickets(existingTickets, newTickets);
    const addedCount = mergedTickets.length - existingTickets.length;
    const duplicateCount = newTickets.length - addedCount;

    fullData = buildTicketsData(mergedTickets, productMapping); // Use global productMapping
    ticketsData = mergedTickets;

    showDataLoaderModal();
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

    // Update file list display (input already reset at start)
    updatePdfFileList([]);

  } catch (error) {
    showDataLoaderModal();
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
