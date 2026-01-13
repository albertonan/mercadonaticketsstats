/* ============================================
   JSON IMPORTER
   Logic for importing tickets.json files
   ============================================ */

let pendingJSONFile = null;

// Initialize JSON UI handlers
function initJSONImporter() {
  const jsonInput = document.getElementById('jsonFileInput');
  const jsonDropzone = document.getElementById('jsonDropzone');
  const jsonConfirmBtn = document.getElementById('jsonConfirmBtn');
  
  // Setup JSON Input
  if (jsonInput) {
    jsonInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await handleJSONUpload(file);
      }
    });
  }

  // Setup JSON Dropzone
  setupDropzone(jsonDropzone, jsonInput, 'json', async (files) => {
    if (files.length > 0) {
      await handleJSONUpload(files[0]);
    }
  });

  // Setup Confirmation Button (Replacer)
  if (jsonConfirmBtn) {
    jsonConfirmBtn.addEventListener('click', async () => {
      if (pendingJSONFile) {
        await processJSONFile(pendingJSONFile);
        pendingJSONFile = null;
      }
    });
  }
}


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

    // Parse logic is in parser.js but we wrap it here
    const parsedData = await parseJSONFile(file); // From parser.js

    // Note: parser.js's parseJSONFile returns the array or object.
    // If it returns object { tickets: [], productMapping: {} }, we handle it.
    // But verify what parseJSONFile actually returns.
    // In parser.js: return data.tickets || data;
    // So it returns just tickets array usually. 
    // Wait, fullData is needed.

    // Let's create a custom logic here to be safe or update parser.js
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
