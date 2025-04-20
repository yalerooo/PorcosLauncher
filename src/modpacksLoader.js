// --- FILE: src/modpacksLoader.js ---
// Variables globales
let allModpacks = [];
let currentFilter = 'all';
let isModpackOperationInProgress = false;

// Guardar referencias a los callbacks para poder eliminarlos correctamente
let installProgressCallback = null;
let updateProgressCallback = null;

// Función para cargar los modpacks desde la API
async function loadModpacks() {
    try {
        const modpacksContainer = document.getElementById('modpacks-container');
        modpacksContainer.innerHTML = '<div class="loading-spinner"></div>';
        
        // Obtener los modpacks
        const result = await window.api.fetchModpacks();
        
        if (!result.success) {
            showModpacksError(result.error || 'Error al cargar los modpacks');
            return;
        }
        
        allModpacks = result.modpacks;
        
        // Filtrar y mostrar los modpacks
        filterAndDisplayModpacks();
    } catch (error) {
        console.error('Error cargando modpacks:', error);
        showModpacksError('Error al cargar los modpacks');
    }
}

// Función para mostrar un mensaje de error
function showModpacksError(message) {
    const modpacksContainer = document.getElementById('modpacks-container');
    modpacksContainer.innerHTML = `
        <div class="no-modpacks">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h3>¡Ups! Algo ha salido mal</h3>
            <p>${message}</p>
        </div>
    `;
}

// Función para filtrar y mostrar los modpacks según el filtro actual
function filterAndDisplayModpacks() {
    const searchTerm = document.getElementById('modpack-search').value.toLowerCase();
    
    let filteredModpacks = allModpacks;
    
    // Aplicar filtro por término de búsqueda
    if (searchTerm) {
        filteredModpacks = filteredModpacks.filter(modpack => 
            modpack.name.toLowerCase().includes(searchTerm) || 
            modpack.description.toLowerCase().includes(searchTerm)
        );
    }
    
    // Aplicar filtro por tipo
    if (currentFilter === 'installed') {
        filteredModpacks = filteredModpacks.filter(modpack => modpack.installed);
    } else if (currentFilter === 'updates') {
        filteredModpacks = filteredModpacks.filter(modpack => modpack.updateAvailable);
    }
    
    // Mostrar los modpacks filtrados
    displayModpacks(filteredModpacks);
}

// Función para mostrar los modpacks en el contenedor
function displayModpacks(modpacks) {
    const modpacksContainer = document.getElementById('modpacks-container');
    
    if (!modpacks || modpacks.length === 0) {
        modpacksContainer.innerHTML = `
            <div class="no-modpacks">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.29 7 12 12 20.71 7"></polyline>
                    <line x1="12" y1="22" x2="12" y2="12"></line>
                </svg>
                <h3>No hay modpacks disponibles</h3>
                <p>No se encontraron modpacks que coincidan con tu búsqueda. Intenta con otros términos o cambia el filtro.</p>
            </div>
        `;
        return;
    }
    
    modpacksContainer.innerHTML = '';
    
    // Crear las tarjetas de modpacks
    modpacks.forEach(modpack => {
        const modpackCard = document.createElement('div');
        modpackCard.className = 'modpack-card';
        
        const isInstalled = modpack.installed;
        const hasUpdate = modpack.updateAvailable;
        
        modpackCard.innerHTML = `
            <div class="modpack-card-header">
                <img src="${modpack.icon || 'assets/default-pack.png'}" alt="${modpack.name}" onerror="this.src='assets/default-pack.png'">
                <div class="modpack-version-badge">v${modpack.version}</div>
                ${hasUpdate ? '<div class="update-available-badge">¡Actualización disponible!</div>' : ''}
            </div>
            <div class="modpack-card-content">
                <h3 class="modpack-title">${modpack.name}</h3>
                <p class="modpack-description">${modpack.description}</p>
                
                <div class="modpack-details">
                    <div class="modpack-detail">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76z"></path>
                            <line x1="16" y1="8" x2="2" y2="22"></line>
                            <line x1="17.5" y1="15" x2="9" y2="15"></line>
                        </svg>
                        Minecraft ${modpack.minecraftVersion}
                    </div>
                    <div class="modpack-detail">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        Forge ${modpack.forgeVersion}
                    </div>
                    ${isInstalled ? `
                    <div class="modpack-detail">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        Versión instalada: ${modpack.installedVersion}
                    </div>
                    ` : ''}
                </div>
                
                <div class="modpack-card-actions">
                    ${!isInstalled ? `
                        <button class="install-button" data-modpack-id="${modpack.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Instalar
                        </button>
                    ` : `
                        <div class="modpack-actions-row">
                            ${hasUpdate ? `
                                <button class="update-button" data-modpack-id="${modpack.id}" data-instance-id="${modpack.instanceId}">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M23 4v6h-6"></path>
                                        <path d="M1 20v-6h6"></path>
                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
                                        <path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                    </svg>
                                    Actualizar
                                </button>
                            ` : `
                                <div class="installed-badge">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                    </svg>
                                    Instalado
                                </div>
                            `}
                            <button class="uninstall-button" data-modpack-id="${modpack.id}" data-instance-id="${modpack.instanceId}">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Desinstalar
                            </button>
                        </div>
                    `}
                </div>
            </div>
        `;
        
        modpacksContainer.appendChild(modpackCard);
    });
    
    // Agregar event listeners para los botones de instalar
    document.querySelectorAll('.install-button').forEach(button => {
        button.addEventListener('click', handleInstallClick);
    });
    
    // Agregar event listeners para los botones de actualizar
    document.querySelectorAll('.update-button').forEach(button => {
        button.addEventListener('click', handleUpdateClick);
    });
    
    // Agregar event listeners para los botones de desinstalar
    document.querySelectorAll('.uninstall-button').forEach(button => {
        button.addEventListener('click', handleUninstallClick);
    });
}

// Función para manejar el clic en el botón de instalar
async function handleInstallClick(event) {
    if (isModpackOperationInProgress) {
        showStatus('Hay una operación en progreso. Por favor, espera...');
        return;
    }
    
    const button = event.currentTarget;
    const modpackId = button.dataset.modpackId;
    
    // Encontrar el modpack en la lista
    const modpack = allModpacks.find(m => m.id === modpackId);
    
    if (!modpack) {
        showStatus('Modpack no encontrado');
        return;
    }
    
    // Mostrar un modal para que el usuario ingrese el nombre de la instancia
    showCreateModpackInstanceModal(modpack);
}

// Función para mostrar el modal de creación de instancia para modpack
function showCreateModpackInstanceModal(modpack) {
    // Verificar si ya existe el modal, si no, crearlo
    let modal = document.getElementById('modpackInstanceModal');
    if (!modal) {
        const modalHTML = `
            <div id="modpackInstanceModal" class="modal">
                <div class="modal-content edit-modal">
                    <h2>Instalar Modpack</h2>
                    
                    <div class="modal-grid">
                        <div class="left-column">
                            <p>Vas a instalar el modpack <strong id="modpackNameInModal"></strong></p>
                            <div id="modpackModalDetails" class="modal-details"></div>
                        </div>
                        
                        <div class="right-column">
                            <div class="input-group">
                                <label for="modpackInstanceName">Nombre de la instancia:</label>
                                <input type="text" id="modpackInstanceName" placeholder="Introduce un nombre para la instancia">
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-buttons">
                        <button id="installModpackButton" class="save-button">Instalar</button>
                        <button id="cancelModpackInstall" class="cancel-button">Cancelar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('modpackInstanceModal');
    }
    
    // Actualizar el contenido del modal
    document.getElementById('modpackNameInModal').textContent = modpack.name;
    document.getElementById('modpackModalDetails').innerHTML = `
        <div class="modal-detail-item">
            <strong>Versión:</strong> ${modpack.version}
        </div>
        <div class="modal-detail-item">
            <strong>Minecraft:</strong> ${modpack.minecraftVersion}
        </div>
        <div class="modal-detail-item">
            <strong>Forge:</strong> ${modpack.forgeVersion}
        </div>
        <div class="modal-detail-item">
            <strong>Descripción:</strong> ${modpack.description}
        </div>
    `;
    
    // Sugerir un nombre para la instancia basado en el nombre del modpack
    document.getElementById('modpackInstanceName').value = modpack.name;
    
    // Mostrar el modal
    modal.style.display = 'flex';
    
    // Configurar event listeners
    document.getElementById('installModpackButton').onclick = () => {
        const instanceName = document.getElementById('modpackInstanceName').value.trim();
        if (!instanceName) {
            alert('Por favor, introduce un nombre para la instancia');
            return;
        }
        
        modal.style.display = 'none';
        startModpackInstallation(modpack.id, instanceName);
    };
    
    document.getElementById('cancelModpackInstall').onclick = () => {
        modal.style.display = 'none';
    };
    
    // Cerrar el modal si se hace clic fuera de él
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Función para iniciar la instalación del modpack
async function startModpackInstallation(modpackId, instanceName) {
    if (isModpackOperationInProgress) {
        return;
    }
    
    isModpackOperationInProgress = true;
    showUpdateProgressContainer('Instalando modpack', 'Preparando instalación...');
    
    try {
        // Registrar callback para el progreso
        installProgressCallback = (event, data) => {
            // data = { status: 'downloading'/'extracting'/'completed'/'error'/'progressing', progress: 0.0-1.0 }
            let statusText = 'Procesando...';
            if (data.status === 'downloading') {
                statusText = 'Descargando...';
            } else if (data.status === 'extracting') {
                statusText = 'Extrayendo...';
            } else if (data.status === 'completed') {
                statusText = 'Completado.';
            } else if (data.status === 'error') {
                statusText = 'Error.';
            } else if (data.status.startsWith('downloading_part')) {
                // Extract part numbers if needed, e.g., "Descargando parte 2 de 3..."
                statusText = 'Descargando partes...'; 
            } else if (data.status === 'progressing') {
                 // Generic progress if specific phase isn't clear
                 statusText = 'Progresando...';
            }
            
            // Update the status text and progress bar
            const statusElement = document.querySelector('.update-progress-container .status-text');
            if (statusElement) {
                statusElement.textContent = statusText;
            }
            updateProgressBar(data.progress);
        };
        window.api.onModpackInstallProgress(installProgressCallback);
        
        // Iniciar la instalación
        const result = await window.api.installModpack(modpackId, instanceName);
        
        if (result.success) {
            showStatus(`Modpack instalado correctamente en la instancia "${result.instanceName}"`, 5000);
            // Recargar la lista de modpacks para reflejar el cambio
            await loadModpacks();
            // Recargar la lista de instancias para mostrar la nueva instancia
            if (window.loadInstances) {
                await window.loadInstances();
            }
        } else {
            showStatus(`Error al instalar el modpack: ${result.error}`, 5000);
        }
    } catch (error) {
        console.error('Error durante la instalación del modpack:', error);
        showStatus('Error durante la instalación del modpack', 5000);
    } finally {
        // Limpiar el listener de progreso
        if (installProgressCallback) {
            window.api.offModpackInstallProgress(installProgressCallback);
            installProgressCallback = null;
        }
        hideUpdateProgressContainer();
        isModpackOperationInProgress = false;
    }
}

// Función para manejar el clic en el botón de actualizar
async function handleUpdateClick(event) {
    if (isModpackOperationInProgress) {
        showStatus('Hay una operación en progreso. Por favor, espera...');
        return;
    }
    
    const button = event.currentTarget;
    const modpackId = button.dataset.modpackId;
    const instanceId = button.dataset.instanceId;
    
    // Encontrar el modpack en la lista
    const modpack = allModpacks.find(m => m.id === modpackId);
    
    if (!modpack) {
        showStatus('Modpack no encontrado');
        return;
    }
    
    // Pedir confirmación al usuario usando el modal personalizado
    showConfirmModal(
        'Actualizar modpack',
        `¿Estás seguro de que deseas actualizar el modpack ${modpack.name} a la versión ${modpack.version}?`,
        async () => {
            // Esta función se ejecuta cuando el usuario acepta
            await startModpackUpdate(instanceId, modpackId);
        }
    );
}

// Función para iniciar la actualización del modpack
async function startModpackUpdate(instanceId, modpackId) {
    if (isModpackOperationInProgress) {
        return;
    }
    
    isModpackOperationInProgress = true;
    showUpdateProgressContainer('Actualizando modpack', 'Preparando actualización...');
    
    try {
        // Registrar callback para el progreso
        updateProgressCallback = (event, data) => {
            updateProgressBar(data.progress);
        };
        window.api.onModpackUpdateProgress(updateProgressCallback);
        
        // Iniciar la actualización
        const result = await window.api.updateModpack(instanceId, modpackId);
        
        if (result.success) {
            showStatus(`Modpack actualizado correctamente${result.message ? `: ${result.message}` : ''}`, 5000);
            // Recargar la lista de modpacks para reflejar el cambio
            await loadModpacks();
            // Recargar la lista de instancias para mostrar los cambios
            if (window.loadInstances) {
                await window.loadInstances();
            }
        } else {
            showStatus(`Error al actualizar el modpack: ${result.error}`, 5000);
        }
    } catch (error) {
        console.error('Error durante la actualización del modpack:', error);
        showStatus('Error durante la actualización del modpack', 5000);
    } finally {
        // Limpiar el listener de progreso
        if (updateProgressCallback) {
            window.api.offModpackUpdateProgress(updateProgressCallback);
            updateProgressCallback = null;
        }
        hideUpdateProgressContainer();
        isModpackOperationInProgress = false;
    }
}

// Función para mostrar el contenedor de progreso de actualización
function showUpdateProgressContainer(title, status) {
    const container = document.getElementById('updateProgressContainer');
    document.querySelector('.update-progress-title').textContent = title;
    document.getElementById('updateProgressStatus').textContent = status;
    document.getElementById('updateProgressBar').style.width = '0%';
    container.style.display = 'block';
    
    // Configurar el botón de cancelar
    document.getElementById('cancelUpdateButton').onclick = () => {
        if (confirm('¿Estás seguro de que deseas cancelar esta operación?')) {
            hideUpdateProgressContainer();
            isModpackOperationInProgress = false;
        }
    };
    
    // Configurar el botón de cerrar
    document.getElementById('closeUpdateProgress').onclick = () => {
        if (confirm('¿Estás seguro de que deseas cerrar esta ventana?')) {
            hideUpdateProgressContainer();
        }
    };
}

// Función para ocultar el contenedor de progreso
function hideUpdateProgressContainer() {
    const container = document.getElementById('updateProgressContainer');
    container.style.display = 'none';
}

// Función para actualizar la barra de progreso
function updateProgressBar(progress) {
    const progressBar = document.getElementById('updateProgressBar');
    const progressStatus = document.getElementById('updateProgressStatus');
    
    if (typeof progress === 'number') {
        const percentage = Math.min(Math.round(progress * 100), 100);
        progressBar.style.width = `${percentage}%`;
        progressStatus.textContent = `Descargando... ${percentage}%`;
    } else if (progress === 'extracting') {
        progressBar.style.width = '100%';
        progressStatus.textContent = 'Extrayendo archivos...';
    } else if (progress === 'completed') {
        progressBar.style.width = '100%';
        progressStatus.textContent = 'Completado';
    } else if (progress && typeof progress === 'object' && progress.extracting) {
        // Mostrar el progreso de extracción como porcentaje
        const percentage = Math.min(Math.round(progress.progress * 100), 100);
        progressBar.style.width = `${percentage}%`;
        progressStatus.textContent = `Extrayendo archivos... ${percentage}%`;
    }
}

// Función para mostrar un mensaje de estado
function showStatus(message, duration = 3000) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.classList.add('active');
    
    setTimeout(() => {
        statusElement.classList.remove('active');
    }, duration);
}

// Inicialización del módulo de modpacks
function initModpacksModule() {
    // Forzar estilos para el dropdown y sus opciones
    const modpackFilter = document.getElementById('modpack-filter');
    
    // Estilos para el dropdown principal
    modpackFilter.style.backgroundColor = '#000000';
    modpackFilter.style.color = 'white';
    modpackFilter.style.border = '1px solid #ff66c4'; // Borde con el color principal
    
    // Aplicar estilos inline a todas las opciones
    const options = modpackFilter.options;
    for (let i = 0; i < options.length; i++) {
        options[i].style.backgroundColor = '#000000';
        options[i].style.color = 'white';
    }
    
    // Configurar event listeners para el filtro y búsqueda
    modpackFilter.addEventListener('change', function() {
        currentFilter = this.value;
        filterAndDisplayModpacks();
    });
    
    document.getElementById('modpack-search').addEventListener('input', function() {
        filterAndDisplayModpacks();
    });
    
    // Configurar el event listener para el icono de modpacks en la barra superior
    document.getElementById('modpacks-icon').addEventListener('click', function() {
        showSection('modpacks');
        loadModpacks();
    });
    
    // Cargar los modpacks inicialmente
    loadModpacks();
}

// Función para manejar el clic en el botón de desinstalar
async function handleUninstallClick(event) {
    if (isModpackOperationInProgress) {
        showStatus('Hay una operación en progreso. Por favor, espera...');
        return;
    }
    
    const button = event.currentTarget;
    const modpackId = button.dataset.modpackId;
    const instanceId = button.dataset.instanceId;
    
    // Encontrar el modpack en la lista
    const modpack = allModpacks.find(m => m.id === modpackId);
    
    if (!modpack) {
        showStatus('Modpack no encontrado');
        return;
    }
    
    // Pedir confirmación al usuario usando el modal personalizado
    showConfirmModal(
        'Desinstalar modpack',
        `¿Estás seguro de que deseas desinstalar el modpack ${modpack.name}? Se eliminará la instancia asociada y todos sus archivos.`,
        async () => {
            try {
                // Mostrar estado
                showStatus(`Desinstalando modpack ${modpack.name}...`);
                isModpackOperationInProgress = true;
                
                // Eliminar el modpack y la instancia asociada completamente
                const result = await window.api.uninstallModpack(instanceId);
                
                if (result.success) {
                    showStatus(`Modpack ${modpack.name} desinstalado correctamente`, 5000);
                    
                    // Recargar la lista de modpacks para reflejar el cambio
                    await loadModpacks();
                    
                    // Recargar la lista de instancias para reflejar el cambio
                    if (window.loadInstances) {
                        await window.loadInstances();
                    }
                } else {
                    showStatus(`Error al desinstalar el modpack: ${result.error}`, 5000);
                }
            } catch (error) {
                console.error('Error durante la desinstalación del modpack:', error);
                showStatus('Error durante la desinstalación del modpack', 5000);
            } finally {
                isModpackOperationInProgress = false;
            }
        }
    );
}

// Función para mostrar el modal de confirmación personalizado
function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('modpackConfirmModal');
    const titleElement = document.getElementById('confirmModalTitle');
    const textElement = document.getElementById('confirmModalText');
    const acceptButton = document.getElementById('confirmModalAccept');
    const cancelButton = document.getElementById('confirmModalCancel');
    const closeButton = document.getElementById('closeConfirmModal');
    
    // Establecer título y mensaje
    titleElement.textContent = title;
    textElement.textContent = message;
    
    // Mostrar el modal
    modal.style.display = 'flex';
    
    // Limpiar event listeners anteriores
    const newAcceptButton = acceptButton.cloneNode(true);
    const newCancelButton = cancelButton.cloneNode(true);
    const newCloseButton = closeButton.cloneNode(true);
    
    acceptButton.parentNode.replaceChild(newAcceptButton, acceptButton);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);
    closeButton.parentNode.replaceChild(newCloseButton, closeButton);
    
    // Configurar nuevos event listeners
    newAcceptButton.addEventListener('click', () => {
        modal.style.display = 'none';
        if (onConfirm) onConfirm();
    });
    
    newCancelButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    newCloseButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Cerrar al hace clic fuera del modal
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Exportar funciones para uso global
window.initModpacksModule = initModpacksModule;
window.loadModpacks = loadModpacks;
window.showConfirmModal = showConfirmModal; // Exportar la función de confirmación
