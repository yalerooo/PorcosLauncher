// --- FILE: script.js ---
document.addEventListener("DOMContentLoaded", async () => {
    // Configurar manejadores de eventos para actualizaciones
    setupUpdateHandlers(); // Configura los manejadores para el sistema de actualización automática
    setupMinecraftUpdateHandlers(); // Configura los manejadores para la actualización de Minecraft
    // Definir temas predefinidos
    const themes = {
        default: {
            primaryColor: '#ff6b8b',
            primaryHoverColor: '#ff4d73',
            secondaryColor: '#ff8fa3',
            secondaryHoverColor: '#ff7a91'
        },
        blue: {
            primaryColor: '#4285F4',
            primaryHoverColor: '#2A75F3',
            secondaryColor: '#5C9CFF',
            secondaryHoverColor: '#4A8DF5'
        },
        green: {
            primaryColor: '#34A853',
            primaryHoverColor: '#2D9249',
            secondaryColor: '#5CBA7D',
            secondaryHoverColor: '#4CAA6D'
        },
        purple: {
            primaryColor: '#9C27B0',
            primaryHoverColor: '#7B1FA2',
            secondaryColor: '#BA68C8',
            secondaryHoverColor: '#AB47BC'
        }
    };
    
    // Configurar event listener para el selector de temas
    document.getElementById('themeSelector').addEventListener('change', function() {
        const selectedTheme = this.value;
        applyTheme(selectedTheme);
        saveCurrentSettings(); // Guardar automáticamente
    });
    
    // Función para aplicar un tema
    function applyTheme(themeName) {
        if (themes[themeName]) {
            const theme = themes[themeName];
            
            // Actualizar los valores de los inputs de color
            document.getElementById('primaryColor').value = theme.primaryColor;
            document.getElementById('primaryHoverColor').value = theme.primaryHoverColor;
            document.getElementById('secondaryColor').value = theme.secondaryColor;
            document.getElementById('secondaryHoverColor').value = theme.secondaryHoverColor;
            
            // Aplicar los colores al CSS
            document.documentElement.style.setProperty('--primary', theme.primaryColor);
            document.documentElement.style.setProperty('--primary-hover', theme.primaryHoverColor);
            document.documentElement.style.setProperty('--secondary', theme.secondaryColor);
            document.documentElement.style.setProperty('--secondary-hover', theme.secondaryHoverColor);
            
            // Guardar la configuración
            const settings = {
                theme: themeName,
                primaryColor: theme.primaryColor,
                primaryHoverColor: theme.primaryHoverColor,
                secondaryColor: theme.secondaryColor,
                secondaryHoverColor: theme.secondaryHoverColor
            };
            window.api.setSettings(settings);
            
            showStatus(`Theme changed to ${themeName}.`);
        }
    }
    
    // Configurar event listeners para los controles de color
    document.getElementById('primaryColor').addEventListener('input', function() {
        document.documentElement.style.setProperty('--primary', this.value);
        saveCurrentSettings(); // Guardar automáticamente
    });
    
    document.getElementById('primaryHoverColor').addEventListener('input', function() {
        document.documentElement.style.setProperty('--primary-hover', this.value);
        saveCurrentSettings(); // Guardar automáticamente
    });
    
    document.getElementById('secondaryColor').addEventListener('input', function() {
        document.documentElement.style.setProperty('--secondary', this.value);
        saveCurrentSettings(); // Guardar automáticamente
    });
    
    document.getElementById('secondaryHoverColor').addEventListener('input', function() {
        document.documentElement.style.setProperty('--secondary-hover', this.value);
        saveCurrentSettings(); // Guardar automáticamente
    });
    
    // Configurar el botón de reset de colores
    document.getElementById('resetColorsButton').addEventListener('click', function() {
        document.getElementById('themeSelector').value = 'default';
        applyTheme('default');
        saveCurrentSettings(); // Guardar automáticamente
    });
    
    // Configurar el botón de verificar actualizaciones
    document.getElementById('checkUpdatesButton').addEventListener('click', async function() {
        showStatus('Verificando actualizaciones...');
        try {
            const updateInfo = await window.api.checkForUpdates();
            if (!updateInfo.hasUpdate) {
                showStatus('El launcher está actualizado', 5000);
            }
        } catch (error) {
            showStatus(`Error al verificar actualizaciones: ${error.message}`, 5000);
        }
    });
    
    // Configurar el botón de verificar Java (si existe)
    const checkJavaButton = document.getElementById('checkJavaButton');
    if (checkJavaButton) {
        checkJavaButton.addEventListener('click', async function() {
            showStatus('Verificando instalación de Java...');
            try {
                const javaInfo = await window.api.checkJavaVersion();
                if (javaInfo.installed && javaInfo.isCompatible) {
                    showStatus(`Java ${javaInfo.version} está instalado correctamente`, 5000);
                } else if (javaInfo.installed && !javaInfo.isCompatible) {
                    showStatus(`Java ${javaInfo.version} está instalado pero no es compatible. Se requiere Java 21 o superior.`, 5000);
                } else {
                    showStatus('Java no está instalado. Se requiere Java 21 o superior.', 5000);
                }
            } catch (error) {
                showStatus(`Error al verificar Java: ${error.message}`, 5000);
            }
        });
    }
    // Window control buttons functionality
    document.getElementById('minimize-button').addEventListener('click', () => {
        window.api.minimizeWindow();
    });
    
    // Función para actualizar el icono de maximizar
function updateMaximizeIcon(isMaximized) {
    const maximizeButton = document.getElementById('maximize-button');
    const maximizeIcon = maximizeButton.querySelector('img');
    maximizeIcon.src = isMaximized ? 'assets/window-controls/maximize2.png' : 'assets/window-controls/maximize.png';
}

// Escuchar eventos de cambio de estado de la ventana
window.api.onWindowStateChange((event, isMaximized) => {
    const maximizeButton = document.getElementById('maximize-button');
    const maximizeIcon = maximizeButton.querySelector('img');
    maximizeIcon.src = isMaximized ? 'assets/window-controls/maximize2.png' : 'assets/window-controls/maximize.png';
});

document.getElementById('maximize-button').addEventListener('click', () => {
    window.api.maximizeWindow();
    });
    
    document.getElementById('close-button').addEventListener('click', () => {
        window.api.closeWindow();
    });
    // Configurar el manejador de eventos para la consola
    window.api.onConsoleOutput((event, data) => {
        addConsoleMessage(data.type, data.message);
    });
    
    // Configurar el botón de limpiar consola
    document.getElementById("clear-console").addEventListener("click", () => {
        clearConsole();
    });
    let selectedInstanceButton = null;
    let selectedVersionButton = null;
    let currentEditingVersion = null;
    let activeInstanceId = null;

    // --- Helper Functions ---
window.showSection = function showSection(sectionId) {
        // Ocultar todas las secciones
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });
        
        // Mostrar la sección seleccionada
        const selectedSection = document.getElementById(sectionId);
        if (selectedSection) {
            selectedSection.classList.add('active');
            selectedSection.style.display = 'block';
            
            // Actualizar el título de la aplicación según la sección
            const appTitle = document.getElementById('app-title');
            if (appTitle) {
                if (sectionId === "home") {
                    appTitle.textContent = "Porcos Launcher";
                    document.getElementById('version-info-header').textContent = '';
                } else if (sectionId === "settings") {
                    appTitle.textContent = "Settings";
                    document.getElementById('version-info-header').textContent = '';
                } else if (sectionId === "modpacks") {
                    appTitle.textContent = "Modpacks";
                    document.getElementById('version-info-header').textContent = '';
                } else if (sectionId === "version-details" && selectedVersionButton) {
                    // Si es la sección de detalles de versión y hay una versión seleccionada
                    // No modificamos el título aquí ya que loadVersionName se encarga de eso
                    // Solo cargamos el fondo si es necesario
                    const versionId = selectedVersionButton.dataset.version; // Usar dataset.version que sabemos que existe
                    if (versionId) {
                        loadVersionBackground(versionId, activeInstanceId);
                    }
                }
            }
        }
        
        // Ocultar la barra lateral de versiones si no estamos en la vista de instancia
        const versionsSidebar = document.getElementById('versions-sidebar');
        if (sectionId !== "version-details") {
            versionsSidebar.classList.remove('active');
        }
    }
    
    // --- Settings Sidebar Navigation ---
    function setupSettingsSidebar() {
        const sidebarItems = document.querySelectorAll('.settings-nav-item');
        const settingsSections = document.querySelectorAll('.settings-section');
        
        // Add click event to each sidebar item
        sidebarItems.forEach(item => {
            item.addEventListener('click', () => {
                // Remove active class from all sidebar items
                sidebarItems.forEach(i => i.classList.remove('active'));
                
                // Add active class to clicked item
                item.classList.add('active');
                
                // Hide all settings sections
                settingsSections.forEach(section => {
                    section.style.display = 'none';
                });
                
                // Show the corresponding section
                const targetSection = item.getAttribute('data-section');
                document.getElementById(targetSection).style.display = 'block';
            });
        });
        
        // Activate the first sidebar item by default
        if (sidebarItems.length > 0) {
            sidebarItems[0].click();
        }
    }
    
    // --- Load and Apply Settings ---
    async function loadSettings() {
        try {
            const settings = await window.api.getSettings();
            
            // Update URLs in System settings
            document.getElementById('minecraftURLInput').value = settings.minecraftURL;
            document.getElementById('modsURLInput').value = settings.modsURL || '';
            
            // Extract numeric memory values (remove the 'G')
            const minMemoryValue = parseInt(settings.minMemory);
            const maxMemoryValue = parseInt(settings.maxMemory);
            
            // Update memory sliders
            document.getElementById('minMemory').value = minMemoryValue;
            document.getElementById('maxMemory').value = maxMemoryValue;
            
            // Update displayed memory values
            document.getElementById('minMemoryValue').textContent = settings.minMemory;
            document.getElementById('maxMemoryValue').textContent = settings.maxMemory;
            
            // Load selected theme in Appearance settings
            if (settings.theme) {
                document.getElementById('themeSelector').value = settings.theme;
            }
            
            // Load primary colors
            if (settings.primaryColor) {
                document.getElementById('primaryColor').value = settings.primaryColor;
                document.documentElement.style.setProperty('--primary', settings.primaryColor);
            }
            
            if (settings.primaryHoverColor) {
                document.getElementById('primaryHoverColor').value = settings.primaryHoverColor;
                document.documentElement.style.setProperty('--primary-hover', settings.primaryHoverColor);
            }
            
            // Load secondary colors
            if (settings.secondaryColor) {
                document.getElementById('secondaryColor').value = settings.secondaryColor;
                document.documentElement.style.setProperty('--secondary', settings.secondaryColor);
            }
            
            if (settings.secondaryHoverColor) {
                document.getElementById('secondaryHoverColor').value = settings.secondaryHoverColor;
                document.documentElement.style.setProperty('--secondary-hover', settings.secondaryHoverColor);
            }
            
            // Setup memory slider event listeners
            document.getElementById('minMemory').addEventListener('input', function() {
                const value = this.value + 'G';
                document.getElementById('minMemoryValue').textContent = value;
                
                // Ensure minMemory is not greater than maxMemory
                const maxMemory = parseInt(document.getElementById('maxMemory').value);
                if (parseInt(this.value) > maxMemory) {
                    document.getElementById('maxMemory').value = this.value;
                    document.getElementById('maxMemoryValue').textContent = value;
                }
                
                // Guardar automáticamente
                saveCurrentSettings();
            });

            document.getElementById('maxMemory').addEventListener('input', function() {
                const value = this.value + 'G';
                document.getElementById('maxMemoryValue').textContent = value;
                
                // Ensure maxMemory is not less than minMemory
                const minMemory = parseInt(document.getElementById('minMemory').value);
                if (parseInt(this.value) < minMemory) {
                    document.getElementById('minMemory').value = this.value;
                    document.getElementById('minMemoryValue').textContent = value;
                }
                
                // Guardar automáticamente
                saveCurrentSettings();
            });
            
            // Setup color picker event listeners
            document.querySelectorAll('.settings-color-picker input[type="color"]').forEach(colorPicker => {
                colorPicker.addEventListener('input', function() {
                    const colorVar = this.dataset.colorVar;
                    if (colorVar) {
                        document.documentElement.style.setProperty(colorVar, this.value);
                        saveCurrentSettings(); // Guardar automáticamente
                    }
                });
            });
            
            // Setup URL input event listeners for auto-save
            document.getElementById('minecraftURLInput').addEventListener('input', function() {
                saveCurrentSettings(); // Guardar automáticamente
            });
            
            document.getElementById('modsURLInput').addEventListener('input', function() {
                saveCurrentSettings(); // Guardar automáticamente
            });
        } catch (error) {
            console.error("Error loading settings:", error);
            showStatus("Error loading settings.");
        }
    }

    async function loadUsername() {
        try {
            const settings = await window.api.getSettings();
            const username = settings.username || "";
            document.getElementById("username").value = username;
            
            // Actualizar la visualización del nombre de usuario y la cabeza
            updatePlayerDisplay(username);
            
            // Añadir event listener para guardar automáticamente el username al escribir
            document.getElementById("username").addEventListener("input", function() {
                const username = this.value.trim();
                window.api.setSettings({ username: username });
                updatePlayerDisplay(username);
            });
        } catch (error) {
            console.error("Error loading username:", error);
        }
    }
    
    // Función para actualizar la visualización del nombre y la cabeza del jugador
    function updatePlayerDisplay(username) {
        // Actualizar el texto del nombre de usuario
        const usernameDisplay = document.getElementById("player-username-display");
        if (usernameDisplay) {
            usernameDisplay.textContent = username || "Selecciona tu usuario";
        }
        
        // Actualizar la cabeza del jugador
        const playerHead = document.getElementById("player-head");
        if (playerHead) {
            if (username) {
                // Usar la API de mcheads.org para obtener la cabeza del jugador - endpoint /head/
                playerHead.innerHTML = `<img src="https://api.mcheads.org/head/${username}/250" alt="${username}" onerror="this.onerror=null; this.src='https://minecraftfaces.com/wp-content/bigfaces/big-steve-face.png';" />`;
                playerHead.classList.add('has-player');
            } else {
                // Si no hay nombre de usuario, mostrar un MHF (Minecraft Head Format) aleatorio
                // Estos son cabezas especiales de Minecraft como Creeper, Zombie, etc.
                const mhfHeads = [
                    'MHF_Steve', 'MHF_Alex', 'MHF_Creeper', 'MHF_Zombie', 
                    'MHF_Skeleton', 'MHF_Blaze', 'MHF_Enderman', 'MHF_Herobrine'
                ];
                const randomMHF = mhfHeads[Math.floor(Math.random() * mhfHeads.length)];
                
                playerHead.innerHTML = `<img src="https://api.mcheads.org/head/${randomMHF}/250" alt="${randomMHF}" onerror="this.onerror=null; this.src='https://minecraftfaces.com/wp-content/bigfaces/big-steve-face.png';" />`;
                playerHead.classList.add('has-player');
                playerHead.classList.add('mhf-head');
            }
        }
    }
    
    // --- Save Settings ---
    function saveCurrentSettings() {
        const settings = {
            username: document.getElementById("username").value,
            minecraftURL: document.getElementById("minecraftURLInput").value,
            modsURL: document.getElementById("modsURLInput").value,
            minMemory: document.getElementById("minMemoryValue").textContent,
            maxMemory: document.getElementById("maxMemoryValue").textContent,
            theme: document.getElementById("themeSelector").value,
            primaryColor: document.getElementById("primaryColor").value,
            primaryHoverColor: document.getElementById("primaryHoverColor").value,
            secondaryColor: document.getElementById("secondaryColor").value,
            secondaryHoverColor: document.getElementById("secondaryHoverColor").value,
        }
        window.api.setSettings(settings);
        
        // Aplicar colores inmediatamente
        document.documentElement.style.setProperty('--primary', settings.primaryColor);
        document.documentElement.style.setProperty('--primary-hover', settings.primaryHoverColor);
        document.documentElement.style.setProperty('--secondary', settings.secondaryColor);
        document.documentElement.style.setProperty('--secondary-hover', settings.secondaryHoverColor);
        // No mostramos notificación para el guardado automático
    }

    async function loadVersionName(versionId) {
        try {
            const storedName = await window.api.getVersionName(versionId, activeInstanceId);
            const appTitle = document.getElementById("app-title");
            const versionInfoHeader = document.getElementById("version-info-header");

            appTitle.textContent = storedName || "Installation Name";
            appTitle.dataset.versionId = versionId;
            
            // Mostrar el nombre amigable en el encabezado
            let friendlyName = versionId;
            if (versionId.startsWith("fabric-loader-")) {
                const parts = versionId.split("-");
                if (parts.length >= 4 && parts[0] === "fabric" && parts[1] === "loader") {
                    const mcVersion = parts.slice(3).join("-");
                    friendlyName = `Fabric ${mcVersion}`;
                }
            } else if (versionId.startsWith("forge-")) {
                const parts = versionId.split("-");
                if (parts.length >= 3 && parts[0] === "forge") {
                    friendlyName = `Forge ${parts[1]}`;
                }
            } else if (versionId.startsWith("neoforge-")) {
                const parts = versionId.split("-");
                if (parts.length >= 3 && parts[0] === "neoforge") {
                    friendlyName = `NeoForge ${parts[1]}`;
                }
            } else if (versionId.startsWith("quilt-loader-")) {
                const parts = versionId.split("-");
                if (parts.length >= 4 && parts[0] === "quilt" && parts[1] === "loader") {
                    const mcVersion = parts.slice(3).join("-");
                    friendlyName = `Quilt ${mcVersion}`;
                }
            } else if (versionId.startsWith("vanilla-")) {
                const parts = versionId.split("-");
                if (parts.length >= 2 && parts[0] === "vanilla") {
                    friendlyName = `Vanilla ${parts[1]}`;
                }
            }
            versionInfoHeader.textContent = `Version: ${friendlyName}`;

            if (selectedVersionButton) {
                selectedVersionButton.title = storedName || "Installation Name";
                updateVersionLogo(selectedVersionButton, versionId);
            }
            
            // Cargar el fondo personalizado para esta versión
            await loadVersionBackground(versionId);
        } catch (error) {
            console.error("Error loading version name:", error);
            showStatus("Error loading version name.");
        }
    }
    
    async function loadVersionBackground(versionId) {
        try {
            const versionDetailsElement = document.getElementById("version-details");
            const backgroundImage = await window.api.getVersionBackground(versionId, activeInstanceId);
            
            // Añadir clase para iniciar la transición
            versionDetailsElement.classList.add('changing-background');
            
            if (backgroundImage) {
                // Pequeña pausa para que la transición sea visible
                setTimeout(() => {
                    versionDetailsElement.style.backgroundImage = `url('${backgroundImage}')`;
                    versionDetailsElement.classList.remove('no-background');
                    // Quitar la clase después de completar la transición
                    setTimeout(() => {
                        versionDetailsElement.classList.remove('changing-background');
                    }, 500);
                }, 50);
            } else {
                // Si no hay imagen de fondo, usar el gradiente predeterminado
                setTimeout(() => {
                    versionDetailsElement.style.backgroundImage = '';
                    versionDetailsElement.classList.add('no-background');
                    // Quitar la clase después de completar la transición
                    setTimeout(() => {
                        versionDetailsElement.classList.remove('changing-background');
                    }, 500);
                }, 50);
            }
        } catch (error) {
            console.error("Error loading version background:", error);
            // En caso de error, usar el fondo predeterminado
            const versionDetailsElement = document.getElementById("version-details");
            versionDetailsElement.style.backgroundImage = '';
            versionDetailsElement.classList.add('no-background');
        }
    }

    async function saveVersionName(versionId, newName) {
        try {
            await window.api.setVersionName(versionId, newName, activeInstanceId);
            const appTitle = document.getElementById("app-title");
            appTitle.textContent = newName;

            if (selectedVersionButton) {
                selectedVersionButton.title = newName;
                updateVersionLogo(selectedVersionButton, versionId);
            }
        } catch (error) {
            console.error("Error saving version name:", error);
            showStatus("Error saving version name.");
        }
    }

    async function updateVersionLogo(versionButton, versionId) {
        const versionLogo = versionButton.querySelector(".version-logo");
        const storedName = await window.api.getVersionName(versionId, activeInstanceId) || versionId;

        try {
            const imagePath = await window.api.getVersionImage(versionId, activeInstanceId);
            if (imagePath) {
                versionLogo.style.backgroundImage = `url('${imagePath}')`;
                versionLogo.classList.add("has-image");
                versionLogo.textContent = "";
            } else {
                versionLogo.style.backgroundImage = "";
                versionLogo.classList.remove("has-image");
                versionLogo.textContent = storedName.substring(0, 2).toUpperCase();
            }

        } catch (error) {
            console.error("Error updating version logo:", error);
            versionLogo.style.backgroundImage = "";
            versionLogo.classList.remove("has-image");
            versionLogo.textContent = storedName.substring(0, 2).toUpperCase();
        }
    }

    // --- Event Handlers ---
    document.getElementById("launcher-logo").addEventListener("click", async () => {
        // Añadir clase de animación de pulsación
        const logo = document.getElementById("launcher-logo");
        logo.classList.add("pulse-click");
        
        // Quitar la clase después de que termine la animación
        setTimeout(() => {
            logo.classList.remove("pulse-click");
        }, 500); // 500ms es la duración de la animación
        
        if (selectedInstanceButton) {
            selectedInstanceButton.querySelector(".instance-logo").classList.remove("selected");
        }
        if (selectedVersionButton) {
            selectedVersionButton.querySelector(".version-logo").classList.remove("selected");
        }
        selectedInstanceButton = null;
        selectedVersionButton = null;
        activeInstanceId = null;
        await window.api.setActiveInstance(null);
        document.getElementById("versions-sidebar").classList.remove("active");
        showSection("home");
    });

    document.getElementById("settings-icon").addEventListener("click", () => {
        if (selectedVersionButton) {
            selectedVersionButton.querySelector(".version-logo").classList.remove("selected");
            selectedVersionButton = null;
        }
        showSection("settings");
    });

    document.getElementById("folder-icon").addEventListener("click", async () => {
        try {
            await window.api.openMinecraftFolder(activeInstanceId);
        } catch (error) {
            console.error("Error opening folder:", error);
            showStatus(`Error opening folder: ${error.message}`);
        }
    });

    function showStatus(message, duration = 3000) {
        const statusElement = document.getElementById("status");
        statusElement.textContent = message;
        statusElement.style.display = "block";

        statusElement.style.animation = "none";
        setTimeout(() => {
            statusElement.style.animation = "slideUp 0.3s ease";
        }, 10);

        setTimeout(() => {
            statusElement.style.display = "none";
        }, duration);
    }
    
    // Configurar manejadores de eventos para actualizaciones
    function setupUpdateHandlers() {
        const updateProgressContainer = document.getElementById('updateProgressContainer');
        const updateProgressBar = document.getElementById('updateProgressBar');
        const updateProgressStatus = document.getElementById('updateProgressStatus');
        const closeUpdateProgress = document.getElementById('closeUpdateProgress');
        const cancelUpdateButton = document.getElementById('cancelUpdateButton');
        
        // Mostrar el contenedor de progreso de actualización
        window.api.onShowUpdateProgress(() => {
            updateProgressContainer.style.display = 'flex';
            updateProgressBar.style.width = '0%';
            updateProgressStatus.textContent = 'Iniciando descarga...';
        });
        
        // Actualizar el progreso de la descarga
        window.api.onUpdateDownloadProgress((event, data) => {
            console.log('Progreso de actualización recibido:', data);
            const progress = data.progress;
            
            if (typeof progress === 'number') {
                const progressValue = Math.max(0, Math.min(100, progress));
                updateProgressBar.style.width = `${progressValue}%`;
                updateProgressStatus.textContent = `Descargando: ${progressValue.toFixed(1)}%`;
            } else if (progress === 'extracting') {
                updateProgressStatus.textContent = 'Extrayendo archivos...';
            } else if (progress === 'completed') {
                updateProgressStatus.textContent = 'Descarga completada';
                updateProgressBar.style.width = '100%';
            }
        });
        
        // Manejar errores de descarga
        window.api.onUpdateDownloadError(({ error }) => {
            updateProgressStatus.textContent = `Error: ${error}`;
            updateProgressBar.style.backgroundColor = 'var(--danger)';
        });
        
        // Cerrar el contenedor de progreso
        closeUpdateProgress.addEventListener('click', () => {
            updateProgressContainer.style.display = 'none';
        });
        
        // Cancelar la actualización
        cancelUpdateButton.addEventListener('click', () => {
            updateProgressContainer.style.display = 'none';
        });
    }
    
    // Configurar manejadores para la actualización de Minecraft
    function setupMinecraftUpdateHandlers() {
        const updateProgressContainer = document.getElementById('updateProgressContainer');
        const updateProgressBar = document.getElementById('updateProgressBar');
        const updateProgressStatus = document.getElementById('updateProgressStatus');
        const closeUpdateProgress = document.getElementById('closeUpdateProgress');
        const cancelUpdateButton = document.getElementById('cancelUpdateButton');
        
        // Cerrar el contenedor de progreso
        closeUpdateProgress.addEventListener('click', () => {
            updateProgressContainer.style.display = 'none';
            // Limpiar el intervalo de extracción si existe
            if (window.extractionInterval) {
                clearInterval(window.extractionInterval);
                window.extractionInterval = null;
            }
            // Intentar eliminar los event listeners de progreso
            try {
                window.api.offDownloadProgress();
            } catch (error) {
                console.error('Error removing download progress listeners:', error);
            }
        });
        
        // Cancelar la actualización
        cancelUpdateButton.addEventListener('click', () => {
            updateProgressContainer.style.display = 'none';
            // Limpiar el intervalo de extracción si existe
            if (window.extractionInterval) {
                clearInterval(window.extractionInterval);
                window.extractionInterval = null;
            }
            // Intentar eliminar los event listeners de progreso
            try {
                window.api.offDownloadProgress();
            } catch (error) {
                console.error('Error removing download progress listeners:', error);
            }
            showStatus('Update cancelled');
        });
        
        // Manejar eventos de progreso de descarga y extracción
        window.api.onDownloadProgress((event, data) => {
            if (data.progress === 'extracting' || (typeof data.progress === 'object' && data.progress.extracting)) {
                // Verificar si tenemos información de progreso de extracción
                if (typeof data.progress === 'object' && data.progress.extracting && typeof data.progress.progress === 'number') {
                    // Mostrar el progreso de extracción como porcentaje
                    updateProgressBar.style.display = 'block';
                    const percentage = Math.min(Math.round(data.progress.progress * 100), 100);
                    updateProgressBar.style.width = `${percentage}%`;
                    updateProgressStatus.textContent = `Extrayendo archivos... ${percentage}%`;
                    
                    // No necesitamos el spinner ni el intervalo si tenemos progreso real
                    const spinner = document.querySelector('.update-progress-spinner');
                    if (spinner) {
                        spinner.style.display = 'none';
                    }
                    
                    // Limpiar el intervalo si existe
                    if (window.extractionInterval) {
                        clearInterval(window.extractionInterval);
                        window.extractionInterval = null;
                    }
                } else {
                    // Comportamiento anterior para cuando no hay progreso detallado
                    updateProgressBar.style.display = 'none';
                    
                    // Crear spinner si no existe
                    let spinner = document.querySelector('.update-progress-spinner');
                    if (!spinner) {
                        spinner = document.createElement('div');
                        spinner.className = 'loading-spinner update-progress-spinner';
                        updateProgressBar.parentNode.insertBefore(spinner, updateProgressBar);
                    }
                    
                    // Mostrar spinner
                    spinner.style.display = 'block';
                    updateProgressStatus.textContent = 'Instalando...'
                    
                    // Configurar un intervalo para mantener la aplicación respondiendo
                    if (!window.extractionInterval) {
                        window.extractionInterval = setInterval(() => {
                            console.log('Manteniendo la aplicación activa durante la extracción...');
                            // Forzar una pequeña actualización en la UI para mantener la aplicación respondiendo
                            updateProgressStatus.textContent = 'Instalando...' + (new Date().getSeconds() % 2 ? '.' : '');
                        }, 1000);
                    }
                }
            } else if (data.progress === 'completed') {
                // Extracción completada
                const spinner = document.querySelector('.update-progress-spinner');
                if (spinner) {
                    spinner.style.display = 'none';
                }
                updateProgressStatus.textContent = 'Installation completed!';
                
                // Limpiar el intervalo de extracción si existe
                if (window.extractionInterval) {
                    clearInterval(window.extractionInterval);
                    window.extractionInterval = null;
                }
                
                // Mostrar el botón de cerrar
                setTimeout(() => {
                    updateProgressContainer.style.display = 'none';
                }, 2000);
            } else if (data.progress === 'error') {
                // Error durante la extracción
                const spinner = document.querySelector('.update-progress-spinner');
                if (spinner) {
                    spinner.style.display = 'none';
                }
                updateProgressBar.style.display = 'block';
                updateProgressBar.style.backgroundColor = 'var(--danger)';
                updateProgressStatus.textContent = 'Error during installation';
                
                // Limpiar el intervalo de extracción si existe
                if (window.extractionInterval) {
                    clearInterval(window.extractionInterval);
                    window.extractionInterval = null;
                }
            } else {
                // Progreso normal de descarga
                updateProgressBar.style.display = 'block';
                const spinner = document.querySelector('.update-progress-spinner');
                if (spinner) {
                    spinner.style.display = 'none';
                }
                updateProgressBar.style.width = `${data.progress}%`;
                updateProgressStatus.textContent = `Descargando: ${data.progress.toFixed(1)}%`;
            }
        });
    }

    // --- Instancias ---
    async function loadInstances() {
        try {
            const instances = await window.api.listInstances();
            const instancesSidebar = document.getElementById("instances-sidebar");
            
            // Limpiar instancias existentes excepto el logo
            const buttons = instancesSidebar.querySelectorAll(".instance-button");
            buttons.forEach(button => button.remove());
            
            // Obtener la instancia activa
            activeInstanceId = await window.api.getActiveInstance();
            
            // Añadir botones de instancias
            for (const instance of instances) {
                const instanceButton = document.createElement("div");
                instanceButton.classList.add("instance-button");
                instanceButton.dataset.instance = instance.id;
                instanceButton.title = instance.name;
                
                const instanceLogo = document.createElement("div");
                instanceLogo.classList.add("instance-logo");
                instanceLogo.setAttribute("data-name", instance.name);
                
                // Check if instance has an icon
                if (instance.icon) {
                    try {
                        const iconDataUrl = await window.api.getInstanceIcon(instance.icon);
                        if (iconDataUrl) {
                            instanceLogo.style.backgroundImage = `url('${iconDataUrl}')`;
                            instanceLogo.classList.add("has-image");
                            instanceLogo.textContent = "";
                        } else {
                            instanceLogo.classList.remove("has-image");
                            instanceLogo.textContent = instance.name.substring(0, 2).toUpperCase();
                        }
                    } catch (error) {
                        console.error("Error loading instance icon:", error);
                        instanceLogo.classList.remove("has-image");
                        instanceLogo.textContent = instance.name.substring(0, 2).toUpperCase();
                    }
                } else {
                    instanceLogo.classList.remove("has-image");
                    instanceLogo.textContent = instance.name.substring(0, 2).toUpperCase();
                }
                
                instanceButton.appendChild(instanceLogo);
                
                // Botón de edición
                const editButton = document.createElement("div");
                editButton.classList.add("instance-edit-button");
                editButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                `;
                instanceButton.appendChild(editButton);
                
                // Marcar la instancia activa
                if (instance.id === activeInstanceId) {
                    instanceLogo.classList.add("selected");
                    selectedInstanceButton = instanceButton;
                }
                
                // Evento de clic en la instancia
                instanceButton.addEventListener("click", (event) => {
                    // Ignorar si se hizo clic en el botón de edición
                    if (event.target.closest(".instance-edit-button")) {
                        event.stopPropagation();
                        openInstanceEditModal(instance.id, instance.name);
                        return;
                    }
                    
                    // Seleccionar instancia
                    if (selectedInstanceButton) {
                        selectedInstanceButton.querySelector(".instance-logo").classList.remove("selected");
                    }
                    selectedInstanceButton = instanceButton;
                    instanceLogo.classList.add("selected");
                    
                    // Establecer como instancia activa
                    activeInstanceId = instance.id;
                    window.api.setActiveInstance(instance.id);
                    
                    // Cargar versiones de esta instancia
                    loadVersions(instance.id);
                    
                    // Mostrar la barra lateral de versiones
                    document.getElementById("versions-sidebar").classList.add("active");
                });
                
                // Añadir a la barra lateral
                instancesSidebar.appendChild(instanceButton);
            }
            
            // Añadir botón para crear nueva instancia
            addCreateInstanceButton();
            
            // No cargar automáticamente las versiones al inicio
            // Esto asegura que siempre se inicie en la pantalla de inicio
            
        } catch (error) {
            console.error("Error loading instances:", error);
            showStatus("Error loading instances.");
        }
    }
    
    // Exponer la función loadInstances al objeto window para que pueda ser llamada desde otros módulos
    window.loadInstances = loadInstances;
    
    function addCreateInstanceButton() {
        const instancesSidebar = document.getElementById("instances-sidebar");
        
        // Crear botón de añadir
        const addButton = document.createElement("div");
        addButton.classList.add("instance-button");
        addButton.title = "Create new instance";
        addButton.innerHTML = `
            <div class="instance-add-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </div>
        `;
        
        // Evento de clic para crear nueva instancia
        addButton.addEventListener("click", openCreateInstanceModal);
        
        // Añadir a la barra lateral
        instancesSidebar.appendChild(addButton);
    }
    
    function openCreateInstanceModal() {
        // Create the modal if it doesn't exist
        let modal = document.getElementById('instanceCreateModal');
        if (!modal) {
            createInstanceCreateModal();
            modal = document.getElementById('instanceCreateModal');
        }
    
        // Show the modal
        modal.style.display = 'flex';
        setupInstanceCreateModal();
    }
    
    function createInstanceCreateModal() {
        const modalHTML = `
        <div id="instanceCreateModal" class="modal">
            <div class="modal-content">
                <h2>Create New Instance</h2>
                <label for="modalCreateInstanceName">Name:</label>
                <input type="text" id="modalCreateInstanceName" placeholder="Enter instance name">
                <div class="modal-buttons">
                    <button id="createInstance">Create</button>
                    <button id="cancelInstanceCreate">Cancel</button>
                </div>
            </div>
        </div>
        `;
    
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    function setupInstanceCreateModal() {
        document.getElementById('createInstance').addEventListener('click', createInstanceFromModal);
        document.getElementById('cancelInstanceCreate').addEventListener('click', closeInstanceCreateModal);
    
        const modal = document.getElementById("instanceCreateModal");
        window.onclick = (event) => {
            if (event.target == modal) {
                closeInstanceCreateModal();
            }
        }
    }
    
    function closeInstanceCreateModal() {
        document.getElementById('instanceCreateModal').style.display = 'none';
    }
    
    // --- Instance Edit Modal Functions ---
    let currentEditingInstance = null;
    
    function openInstanceEditModal(instanceId, instanceName) {
        currentEditingInstance = instanceId;
        
        let modal = document.getElementById('instanceEditModal');
        if (!modal) {
            createInstanceEditModal();
            modal = document.getElementById('instanceEditModal');
        }
        
        // Load current instance data
        loadInstanceDataForEdit(instanceId, instanceName);
        
        // Show the modal
        modal.style.display = 'flex';
        setupInstanceEditModal();
    }
    
    function createInstanceEditModal() {
        const modalHTML = `
        <div id="instanceEditModal" class="modal">
            <div class="modal-content">
                <h2>Edit Instance</h2>
                
                <div class="instance-image-preview" id="instanceImagePreview"></div>
                
                <label for="modalEditInstanceName">Name:</label>
                <input type="text" id="modalEditInstanceName" placeholder="Enter instance name">
                
                <div class="image-upload-container">
                    <label for="instanceImageUpload">Instance Image:</label>
                    <input type="file" id="instanceImageUpload" accept="image/*">
                </div>
                
                <label>Or select from default images:</label>
                <div class="default-images-container" id="defaultInstanceImagesContainer">
                    <!-- Default images will be loaded here -->
                </div>
                
                <div class="modal-buttons">
                    <button id="saveInstanceChanges">Save</button>
                    <button id="cancelInstanceEdit">Cancel</button>
                    <button id="deleteInstance">Delete</button>
                </div>
            </div>
        </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    function setupInstanceEditModal() {
        document.getElementById('saveInstanceChanges').addEventListener('click', saveInstanceChanges);
        document.getElementById('cancelInstanceEdit').addEventListener('click', closeInstanceEditModal);
        document.getElementById('deleteInstance').addEventListener('click', deleteSelectedInstance);
        document.getElementById('instanceImageUpload').addEventListener('change', handleInstanceImageUpload);
        
        // Load default images
        loadDefaultInstanceImages();
        
        const modal = document.getElementById("instanceEditModal");
        window.onclick = (event) => {
            if (event.target == modal) {
                closeInstanceEditModal();
            }
        }
    }
    
    async function loadInstanceDataForEdit(instanceId, instanceName) {
        try {
            document.getElementById('modalEditInstanceName').value = instanceName;
            
            // Get current instance icon
            const imagePreview = document.getElementById('instanceImagePreview');
            const instances = await window.api.listInstances();
            const instance = instances.find(i => i.id === instanceId);
            
            if (instance && instance.icon) {
                // Get icon through the IPC bridge
                const iconDataUrl = await window.api.getInstanceIcon(instance.icon);
                if (iconDataUrl) {
                    imagePreview.style.backgroundImage = `url('${iconDataUrl}')`;
                    imagePreview.classList.add('has-image');
                    imagePreview.textContent = "";
                } else {
                    imagePreview.classList.remove('has-image');
                    imagePreview.textContent = instance.name.substring(0, 2).toUpperCase();
                }
            }
            
            // If no icon, show initials
            imagePreview.style.backgroundImage = '';
            imagePreview.classList.remove('has-image');
            imagePreview.textContent = instanceName.substring(0, 2).toUpperCase();
            
        } catch (error) {
            console.error("Error loading instance data for edit:", error);
            showStatus("Error loading instance data.");
        }
    }
    
    function loadDefaultInstanceImages() {
        const container = document.getElementById('defaultInstanceImagesContainer');
        container.innerHTML = '';
        
        // Load images from assets/versions folder (same as version images)
        window.api.getDefaultVersionImages().then(images => {
            images.forEach(image => {
                const imgElement = document.createElement('img');
                imgElement.src = image.dataURL;
                imgElement.classList.add('default-version-image');
                imgElement.title = image.name;
                imgElement.addEventListener('click', () => selectDefaultInstanceImage(image.dataURL));
                container.appendChild(imgElement);
            });
        }).catch(error => {
            console.error("Error loading default images:", error);
        });
    }
    
    function selectDefaultInstanceImage(imagePath) {
        // Remove selection from all images
        document.querySelectorAll('.default-version-image').forEach(img => {
            img.classList.remove('selected-image');
        });
        
        // Add selection to clicked image
        const clickedImage = Array.from(document.querySelectorAll('.default-version-image')).find(img => img.src === imagePath);
        if (clickedImage) {
            clickedImage.classList.add('selected-image');
        }
        
        // Update preview
        const imagePreview = document.getElementById('instanceImagePreview');
        imagePreview.style.backgroundImage = `url('${imagePath}')`;
        imagePreview.textContent = '';
        
        // Remove selection from default images
        document.querySelectorAll('.default-version-image').forEach(img => {
            img.classList.remove('selected-image');
        });
    }
    
    function handleInstanceImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                // Update preview
                const imagePreview = document.getElementById('instanceImagePreview');
                imagePreview.style.backgroundImage = `url('${e.target.result}')`;
                imagePreview.textContent = '';
                
                // Remove selection from default images
                document.querySelectorAll('.default-version-image').forEach(img => {
                    img.classList.remove('selected-image');
                });
            };
            reader.readAsDataURL(file);
        }
    }
    
    async function saveInstanceChanges() {
        const newName = document.getElementById('modalEditInstanceName').value.trim();
        if (!newName) {
            showStatus("Please enter an instance name.");
            return;
        }
        
        try {
            // Prepare config object
            const config = {
                name: newName,
                icon: null
            };
            
            // Handle image selection
            const imageUpload = document.getElementById('instanceImageUpload').files[0];
            const selectedDefaultImage = document.querySelector('.default-version-image.selected-image');
            
            if (imageUpload) {
                // For file uploads, create a FileReader to get the data URL
                const reader = new FileReader();
                reader.onload = async function(e) {
                    config.icon = e.target.result;
                    await updateInstanceWithConfig(config);
                };
                reader.readAsDataURL(imageUpload);
                return; // Exit early as we'll finish in the onload callback
            } else if (selectedDefaultImage) {
                config.icon = selectedDefaultImage.src;
            }
            
            await updateInstanceWithConfig(config);
        } catch (error) {
            console.error("Error saving instance changes:", error);
            showStatus("Error saving instance changes.");
        }
    }
    
    async function updateInstanceWithConfig(config) {
        const result = await window.api.updateInstance(currentEditingInstance, config);
        if (result.success) {
            showStatus("Instance updated successfully!");
            closeInstanceEditModal();
            
            // If the instance ID changed (due to name change), update the active instance
            if (result.newInstanceId && result.newInstanceId !== currentEditingInstance) {
                if (activeInstanceId === currentEditingInstance) {
                    activeInstanceId = result.newInstanceId;
                    await window.api.setActiveInstance(result.newInstanceId);
                }
            }
            
            // Reload instances to reflect changes
            await loadInstances();
        } else {
            showStatus(`Error updating instance: ${result.error}`);
        }
    }
    
    function closeInstanceEditModal() {
        document.getElementById('instanceEditModal').style.display = 'none';
    }
    
    async function deleteSelectedInstance() {
        // Primero cerrar el modal de edición para evitar que quede por encima
        closeInstanceEditModal();
        
        // Usar el modal personalizado para la confirmación
        window.showConfirmModal(
            'Eliminar instancia',
            `¿Estás seguro de que deseas eliminar esta instancia? Esta acción no se puede deshacer.`,
            async () => {
                try {
                    const result = await window.api.deleteInstance(currentEditingInstance);
                    if (result.success) {
                        showStatus("Instancia eliminada correctamente");
                        
                        // Si esta era la instancia activa, limpiarla
                        if (activeInstanceId === currentEditingInstance) {
                            activeInstanceId = null;
                            await window.api.setActiveInstance(null);
                            document.getElementById("versions-sidebar").classList.remove("active");
                            showSection("home");
                        }
                        
                        // Recargar instancias
                        await loadInstances();
                    } else {
                        showStatus(`Error al eliminar instancia: ${result.error}`);
                    }
                } catch (error) {
                    console.error("Error al eliminar instancia:", error);
                    showStatus("Error al eliminar instancia.");
                }
            }
        );
    }
    
    async function createInstanceFromModal() {
        const instanceName = document.getElementById('modalCreateInstanceName').value.trim();
    
        if (!instanceName) {
            showStatus("Please enter an instance name.");
            return;
        }
    
        closeInstanceCreateModal();
        await createNewInstance(instanceName);
    }
    
    async function createNewInstance(name) {
        try {
            const result = await window.api.createInstance(name);
            if (result.success) {
                showStatus(`Instance "${name}" created successfully`);
                loadInstances(); // Recargar instancias
            } else {
                showStatus(`Error creating instance: ${result.error}`);
            }
        } catch (error) {
            console.error("Error creating instance:", error);
            showStatus("Error creating instance.");
        }
    }

    // --- Versiones ---
    async function loadVersions(instanceId) {
        try {
            const versions = await window.api.getVersions(instanceId);
            const versionsSidebar = document.getElementById("versions-sidebar");
            
            // Limpiar versiones existentes
            versionsSidebar.innerHTML = "";
            
            console.log("Loading versions for instance:", instanceId, "Found versions:", versions.length);
            
            // Filtrar versiones: excluir solo la versión básica de fabric (ej: fabric-1.21.4), mostrar el resto
            const filteredVersions = versions.filter(v => {
                // Excluir solo si es exactamente 'fabric-' seguido de la versión de MC, sin loader
                if (/^fabric-\d/.test(v.id)) return false;
                return true;
            });
            filteredVersions.forEach(version => {
                // Usar el nombre almacenado como base
                let displayName = version.name;
                // Si no hay nombre almacenado, construir uno amigable según el tipo
                if (!displayName || displayName.trim() === "") {
                    if (version.id.startsWith("fabric-loader-")) {
                        // Formato: fabric-loader-<loaderVersion>-<mcVersion>
                        const parts = version.id.split("-");
                        if (parts.length >= 4 && parts[0] === "fabric" && parts[1] === "loader") {
                            const loaderVersion = parts[2];
                            const mcVersion = parts.slice(3).join("-");
                            displayName = `Fabric ${mcVersion} (Loader ${loaderVersion})`;
                        }
                    } else if (version.id.startsWith("forge-")) {
                        // Formato: forge-<mcVersion>-<forgeVersion>
                        const parts = version.id.split("-");
                        if (parts.length >= 3 && parts[0] === "forge") {
                            const mcVersion = parts[1];
                            const forgeVersion = parts[2];
                            displayName = `Forge ${mcVersion} (${forgeVersion})`;
                        }
                    } else if (version.id.startsWith("neoforge-")) {
                        // Formato: neoforge-<mcVersion>-<neoforgeVersion>
                        const parts = version.id.split("-");
                        if (parts.length >= 3 && parts[0] === "neoforge") {
                            const mcVersion = parts[1];
                            const neoForgeVersion = parts[2];
                            displayName = `NeoForge ${mcVersion} (${neoForgeVersion})`;
                        }
                    } else if (version.id.startsWith("quilt-loader-")) {
                        // Formato: quilt-loader-<loaderVersion>-<mcVersion>
                        const parts = version.id.split("-");
                        if (parts.length >= 4 && parts[0] === "quilt" && parts[1] === "loader") {
                            const loaderVersion = parts[2];
                            const mcVersion = parts.slice(3).join("-");
                            displayName = `Quilt ${mcVersion} (Loader ${loaderVersion})`;
                        }
                    } else if (version.id.startsWith("vanilla-")) {
                        // Formato: vanilla-<mcVersion>
                        const parts = version.id.split("-");
                        if (parts.length >= 2 && parts[0] === "vanilla") {
                            displayName = `Vanilla ${parts[1]}`;
                        }
                    } else {
                        displayName = version.id;
                    }
                }
                // Crear el botón de versión como antes, pero usando displayName
                const versionButton = document.createElement("div");
                versionButton.classList.add("version-button");
                versionButton.dataset.version = version.id;
                versionButton.title = displayName;
                
                const versionLogo = document.createElement("div");
                versionLogo.classList.add("version-logo");
                versionButton.appendChild(versionLogo);
                
                // Añadir el nombre de la versión
                const versionName = document.createElement("span");
                versionName.classList.add("version-name");
                versionName.textContent = displayName;
                versionButton.appendChild(versionName);
                
                // Botón de edición
                const editButton = document.createElement("div");
                editButton.classList.add("version-edit-button");
                editButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                `;
                versionButton.appendChild(editButton);
                
                // Evento de clic en la versión
                versionButton.addEventListener("click", async (event) => {
                    // Ignorar si se hizo clic en el botón de edición
                    if (event.target.closest(".version-edit-button")) {
                        event.stopPropagation();
                        openEditModal(version.id);
                        return;
                    }
                    
                    // Seleccionar versión
                    if (selectedVersionButton) {
                        selectedVersionButton.querySelector(".version-logo").classList.remove("selected");
                    }
                    selectedVersionButton = versionButton;
                    versionLogo.classList.add("selected");
                    
                    // Cargar detalles de la versión
                    await loadVersionName(version.id);
                    showSection("version-details");
                });
                
                // Actualizar logo
                updateVersionLogo(versionButton, version.id);
                
                // Añadir a la barra lateral
                versionsSidebar.appendChild(versionButton);
            });
            
            // Añadir botón para crear nueva versión
            addCreateVersionButton();
            
        } catch (error) {
            console.error("Error loading versions:", error);
            showStatus("Error loading versions.");
        }
    }
    
    function addCreateVersionButton() {
        const versionsSidebar = document.getElementById("versions-sidebar");
        
        // Crear botón de añadir
        const addButton = document.createElement("div");
        addButton.classList.add("version-button");
        addButton.title = "Create new version";
        addButton.innerHTML = `
            <div class="version-add-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </div>
            <span class="version-name">Nueva versión</span>
        `;
        
        // Evento de clic para crear nueva versión
        addButton.addEventListener("click", openCreateVersionModal);
        
        // Añadir a la barra lateral
        versionsSidebar.appendChild(addButton);
    }

    // --- Funciones para modales ---
    function openCreateVersionModal() {
        let modal = document.getElementById('versionCreateModal');
        if (!modal) {
            createVersionCreateModal();
            modal = document.getElementById('versionCreateModal');
        }

        // Populate Version Dropdown
        const versionSelect = document.getElementById('modalCreateVersionNumber');
        versionSelect.innerHTML = '';

        try {
            window.api.getVersionManifest().then(manifest => {
                manifest.versions.forEach(version => {
                    if (version.type === 'release') {
                        const option = document.createElement('option');
                        option.value = version.id;
                        option.textContent = version.id;
                        versionSelect.appendChild(option);
                    }
                });
            }).catch(error => {
                console.error("Error fetching version manifest:", error);
                showStatus("Error fetching available versions.");
            });
        } catch (error) {
            console.error("Error fetching version manifest:", error);
            showStatus("Error fetching available versions.");
            return;
        }

        modal.style.display = 'flex';
        setupCreateModal();
    }

    function createVersionCreateModal() {
        const modalHTML = `
        <div id="versionCreateModal" class="modal">
            <div class="modal-content">
                <h2>Crear nueva versión</h2>
                <label for="modalCreateVersionName">Nombre:</label>
                <input type="text" id="modalCreateVersionName">
                <label for="modalCreateVersionNumber">Versión de Minecraft:</label>
                <select id="modalCreateVersionNumber"></select>
                <div class="modal-buttons">
                    <button id="createVersion">Crear</button>
                    <button id="cancelVersionCreate">Cancelar</button>
                </div>
                <div id="createVersionProgress" class="progress-container" style="display: none;">
                    <div id="createVersionProgressBar" class="progress-bar"></div>
                </div>
                <div id="createVersionLoadingText" class="loading-text" style="display: none;">Descargando versión...</div>
            </div>
        </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    function setupCreateModal() {
        document.getElementById('createVersion').addEventListener('click', createNewVersion);
        document.getElementById('cancelVersionCreate').addEventListener('click', closeCreateVersionModal);

        const modal = document.getElementById("versionCreateModal");
        window.onclick = (event) => {
            if (event.target == modal) {
                closeCreateVersionModal();
            }
        }
    }

    function closeCreateVersionModal() {
        document.getElementById('versionCreateModal').style.display = 'none';
        if (document.getElementById('createVersionProgress')) {
            document.getElementById('createVersionProgress').style.display = 'none';
        }
        if (document.getElementById('createVersionLoadingText')) {
            document.getElementById('createVersionLoadingText').style.display = 'none';
        }
        if (document.getElementById('createVersionProgressBar')) {
            document.getElementById('createVersionProgressBar').style.width = '0%';
        }
        if (document.getElementById('createVersion')) {
            document.getElementById('createVersion').disabled = false;
        }
        if (document.getElementById('cancelVersionCreate')) {
            document.getElementById('cancelVersionCreate').disabled = false;
        }
    }

    async function createNewVersion() {
        const versionName = document.getElementById('modalCreateVersionName').value.trim();
        const versionNumber = document.getElementById('modalCreateVersionNumber').value;

        if (!versionName || !versionNumber) {
            showStatus("Por favor, ingresa nombre y versión.");
            return;
        }

        // Mostrar indicadores de carga
        const progress = document.getElementById('createVersionProgress');
        const progressBar = document.getElementById('createVersionProgressBar');
        const loadingText = document.getElementById('createVersionLoadingText');
        const createButton = document.getElementById('createVersion');
        const cancelButton = document.getElementById('cancelVersionCreate');

        progress.style.display = 'block';
        loadingText.style.display = 'block';
        progressBar.style.width = '0%';
        createButton.disabled = true;
        cancelButton.disabled = true;

        // Set up progress listener
        const progressListener = (event, data) => {
            if (data && typeof data.progress === 'number') {
                progressBar.style.width = `${data.progress}%`;
                loadingText.textContent = `Downloading version... ${data.progress}%`;
            }
        };

        // Register the progress listener
        window.api.onDownloadProgress(progressListener);

        try {
            // Descargar la versión
            const result = await window.api.downloadVersion(versionNumber, activeInstanceId);
            // Remove the progress listener
            window.api.offDownloadProgress(progressListener);
            
            if (result.success) {
                // Establecer el nombre personalizado
                await window.api.setVersionName(versionNumber, versionName, activeInstanceId);
                showStatus(`Version ${versionName} created successfully`);
                closeCreateVersionModal();
                loadVersions(activeInstanceId); // Recargar versiones
            } else {
                showStatus(`Error creating version: ${result.error}`);
                createButton.disabled = false;
                cancelButton.disabled = false;
            }
        } catch (error) {
            // Remove the progress listener on error too
            window.api.offDownloadProgress(progressListener);
            console.error("Error creating version:", error);
            showStatus("Error creating version.");
            createButton.disabled = false;
            cancelButton.disabled = false;
        }
    }

    function openEditModal(versionId) {
        currentEditingVersion = versionId;
        
        let modal = document.getElementById('versionEditModal');
        if (!modal) {
            createVersionEditModal();
            modal = document.getElementById('versionEditModal');
        }
        
        // Load current version data
        loadVersionDataForEdit(versionId);
        
        // Show the modal
        modal.style.display = 'flex';
        setupVersionEditModal();
    }
    
    function createVersionEditModal() {
        const modalHTML = `
        <div id="versionEditModal" class="modal">
            <div class="modal-content">
                <h2>Edit Version</h2>
                
                <div class="version-image-preview" id="versionImagePreview"></div>
                
                <div class="input-group">
                    <label for="modalEditVersionName">Version Name:</label>
                    <input type="text" id="modalEditVersionName" placeholder="Enter version name">
                </div>
                
                <div class="image-upload-container">
                    <label for="versionImageUpload">Version Image:</label>
                    <input type="file" id="versionImageUpload" accept="image/*">
                </div>
                
                <label>Or select from default images:</label>
                <div class="default-images-container" id="defaultImagesContainer">
                    <!-- Default images will be loaded here -->
                </div>
                
                <div class="background-section">
                    <h3>Background Image</h3>
                    <div class="version-background-preview" id="versionBackgroundPreview"></div>
                    
                    <button id="selectBackgroundBtn" class="btn">Select Background</button>
                </div>
                
                <div class="modal-buttons">
                    <button id="saveVersionChanges">Save</button>
                    <button id="cancelVersionEdit">Cancel</button>
                    <button id="deleteVersion">Delete</button>
                </div>
            </div>
        </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    function setupVersionEditModal() {
        document.getElementById('saveVersionChanges').addEventListener('click', saveVersionChanges);
        document.getElementById('cancelVersionEdit').addEventListener('click', closeVersionEditModal);
        document.getElementById('deleteVersion').addEventListener('click', deleteSelectedVersion);
        document.getElementById('versionImageUpload').addEventListener('change', handleVersionImageUpload);
        document.getElementById('selectBackgroundBtn').addEventListener('click', openBackgroundsPopup);
        
        // Load default images
        loadDefaultVersionImages();
        
        const modal = document.getElementById("versionEditModal");
        window.onclick = (event) => {
            if (event.target == modal) {
                closeVersionEditModal();
            }
        };
    }
    
    async function loadVersionDataForEdit(versionId) {
        try {
            // Get current version name
            const versionName = await window.api.getVersionName(versionId, activeInstanceId) || versionId;
            document.getElementById('modalEditVersionName').value = versionName;
            
            // Get current version image
            const imagePath = await window.api.getVersionImage(versionId, activeInstanceId);
            const imagePreview = document.getElementById('versionImagePreview');
            
            if (imagePath) {
                // Guardar referencia a la imagen actual
                window.currentVersionImagePath = imagePath;
                imagePreview.style.backgroundImage = `url('${imagePath}')`;
                imagePreview.textContent = '';
                
                // Buscar y seleccionar la imagen predeterminada que coincida con la imagen actual
                setTimeout(() => {
                    const defaultImages = document.querySelectorAll('#defaultImagesContainer .default-version-image');
                    defaultImages.forEach(img => {
                        const imgFilename = img.src.split('/').pop();
                        const currentFilename = imagePath.split('/').pop();
                        
                        if (imgFilename === currentFilename || img.src === imagePath) {
                            img.classList.add('selected-image');
                        }
                    });
                }, 300);
            } else {
                window.currentVersionImagePath = null;
                imagePreview.style.backgroundImage = '';
                imagePreview.textContent = versionName.substring(0, 2).toUpperCase();
            }
            
            // Get current version background
            const backgroundPath = await window.api.getVersionBackground(versionId, activeInstanceId);
            const backgroundPreview = document.getElementById('versionBackgroundPreview');
            
            if (backgroundPath) {
                // Guardar referencia al fondo actual
                window.currentVersionBackgroundPath = backgroundPath;
                backgroundPreview.style.backgroundImage = `url('${backgroundPath}')`;
                backgroundPreview.textContent = '';
                
                setTimeout(() => {
                    const defaultBackgrounds = document.querySelectorAll('#defaultBackgroundsContainer .default-version-image');
                    defaultBackgrounds.forEach(img => {
                        const originalImage = img.dataset.originalImage || img.src;
                        const imgFilename = originalImage.split('/').pop();
                        const currentFilename = backgroundPath.split('/').pop();
                        
                        if (imgFilename === currentFilename || originalImage === backgroundPath || img.src === backgroundPath) {
                            img.classList.add('selected-image');
                        }
                    });
                }, 300);
            } else {
                window.currentVersionBackgroundPath = null;
                backgroundPreview.style.backgroundImage = '';
                backgroundPreview.textContent = 'No background image selected';
            }
        } catch (error) {
            console.error("Error loading version data for edit:", error);
            showStatus("Error loading version data.");
        }
    }
    
    function loadDefaultVersionImages() {
        const container = document.getElementById('defaultImagesContainer');
        container.innerHTML = '';
        
        // Load images from assets/versions folder
        window.api.getDefaultVersionImages().then(images => {
            images.forEach(image => {
                const imgElement = document.createElement('img');
                imgElement.src = image.dataURL;
                imgElement.classList.add('default-version-image');
                imgElement.title = image.name;
                imgElement.addEventListener('click', () => selectDefaultImage(image.dataURL));
                container.appendChild(imgElement);
            });
        }).catch(error => {
            console.error("Error loading default images:", error);
        });
    }
    
    function selectDefaultImage(imagePath) {
        // Remove selection from all images
        document.querySelectorAll('.default-version-image').forEach(img => {
            img.classList.remove('selected-image');
        });
        
        // Add selection to clicked image
        const clickedImage = Array.from(document.querySelectorAll('.default-version-image')).find(img => img.src === imagePath);
        if (clickedImage) {
            clickedImage.classList.add('selected-image');
        }
        
        // Update preview
        const imagePreview = document.getElementById('versionImagePreview');
        imagePreview.style.backgroundImage = `url('${imagePath}')`;
        imagePreview.textContent = '';
        
        // Remove selection from default images
        document.querySelectorAll('.default-version-image').forEach(img => {
            img.classList.remove('selected-image');
        });
    }
    
    function handleVersionImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                // Update preview
                const selectedPreviews = document.querySelectorAll('#defaultImagesContainer .default-version-image.selected-image');
                selectedPreviews.forEach(preview => {
                    preview.classList.remove('selected-image');
                });
                
                // Guardar temporalmente el fondo seleccionado para previsualización
                window.tempSelectedBackgroundFile = e.target.result;
                
                // Si estamos en el modal de confirmación, actualizar también la vista previa ahí
                if (document.getElementById('backgroundsPopup').style.display === 'flex') {
                    // En este punto no actualizamos la vista previa principal hasta que se confirme
                }
            };
            reader.readAsDataURL(file);
        }
    }
    
    async function saveVersionChanges() {
        const newName = document.getElementById('modalEditVersionName').value.trim();
        if (!newName) {
            showStatus("Please enter a version name.");
            return;
        }
        
        try {
            // Mostrar información de depuración
            console.log("=== DEBUG: GUARDANDO CAMBIOS DE VERSIÓN ===");
            console.log("- currentVersionBackgroundPath:", window.currentVersionBackgroundPath);
            console.log("- tempSelectedBackground:", window.tempSelectedBackground);
            console.log("- tempSelectedBackgroundFile:", window.tempSelectedBackgroundFile);
            
            // Verificar si hay un fondo seleccionado en el DOM
            const backgroundPreview = document.getElementById('versionBackgroundPreview');
            const backgroundFromDOM = backgroundPreview ? backgroundPreview.dataset.selectedBackground : null;
            console.log("- backgroundFromDOM:", backgroundFromDOM);
            
            // Verificar si hay un fondo seleccionado en el botón
            const selectBackgroundBtn = document.getElementById('selectBackgroundBtn');
            const hasBackground = selectBackgroundBtn ? selectBackgroundBtn.getAttribute('data-has-background') === 'true' : false;
            const backgroundFromBtn = selectBackgroundBtn ? selectBackgroundBtn.getAttribute('data-background-path') : null;
            console.log("- hasBackground:", hasBackground);
            console.log("- backgroundFromBtn:", backgroundFromBtn);
            
            // Save new name
            await window.api.setVersionName(currentEditingVersion, newName, activeInstanceId);
            
            // Save image if selected
            const imageUpload = document.getElementById('versionImageUpload').files[0];
            const selectedDefaultImage = document.querySelector('#defaultImagesContainer .default-version-image.selected-image');
            
            // Variables para controlar el flujo asíncrono
            let pendingOperations = 0;
            let completedOperations = 0;
            
            // Función para verificar si todas las operaciones han terminado
            function checkCompletion() {
                completedOperations++;
                if (completedOperations === pendingOperations) {
                    finishSaving();
                }
            }
            
            // Procesar imagen de versión
            if (imageUpload) {
                pendingOperations++;
                const reader = new FileReader();
                reader.onload = async function(e) {
                    await window.api.setVersionImage(currentEditingVersion, e.target.result, activeInstanceId);
                    checkCompletion();
                };
                reader.readAsDataURL(imageUpload);
            } else if (selectedDefaultImage) {
                pendingOperations++;
                await window.api.setVersionImage(currentEditingVersion, selectedDefaultImage.src, activeInstanceId);
                checkCompletion();
            } else if (window.currentVersionImagePath) {
                pendingOperations++;
                await window.api.setVersionImage(currentEditingVersion, window.currentVersionImagePath, activeInstanceId);
                checkCompletion();
            }
            
            // Procesar imagen de fondo - intentar con todos los posibles lugares donde se podría haber guardado
            let backgroundToUse = window.currentVersionBackgroundPath || 
                                  window.tempSelectedBackground || 
                                  window.tempSelectedBackgroundFile ||
                                  backgroundFromDOM ||
                                  backgroundFromBtn;
            
            // Verificar si el fondo a usar es válido (debe ser un string no vacío)
            if (backgroundToUse && typeof backgroundToUse === 'string' && backgroundToUse.trim() !== '') {
                pendingOperations++;
                console.log("Guardando fondo, ruta final:", backgroundToUse);
                
                try {
                    // Asegurarnos de pasar la URL de la imagen ORIGINAL, nunca la miniatura
                    await window.api.setVersionBackground(currentEditingVersion, backgroundToUse, activeInstanceId);
                    checkCompletion();
                } catch (error) {
                    console.error("Error al guardar el fondo:", error);
                    checkCompletion();
                }
            } else if (hasBackground) {
                // Si el botón indica que hay un fondo pero no tenemos la ruta, intentar ver si hay un fondo seleccionado
                const selectedBackground = document.querySelector('#defaultBackgroundsContainer .default-version-image.selected-image');
                if (selectedBackground && selectedBackground.dataset.originalImage) {
                    pendingOperations++;
                    console.log("Usando fondo del elemento seleccionado:", selectedBackground.dataset.originalImage);
                    
                    try {
                        await window.api.setVersionBackground(currentEditingVersion, selectedBackground.dataset.originalImage, activeInstanceId);
                        checkCompletion();
                    } catch (error) {
                        console.error("Error al guardar el fondo desde elemento seleccionado:", error);
                        checkCompletion();
                    }
                } else {
                    console.log("El botón indica que hay un fondo pero no se pudo encontrar la ruta");
                }
            } else {
                console.log("No hay imagen de fondo seleccionada para guardar");
            }
            
            // Si no hay operaciones pendientes, terminar inmediatamente
            if (pendingOperations === 0) {
                finishSaving();
            }
        } catch (error) {
            console.error("Error saving version changes:", error);
            showStatus("Error saving version changes.");
        }
        
        function finishSaving() {
            showStatus("Version updated successfully!");
            
            // Guardar la versión que estaba seleccionada
            const wasSelectedVersion = currentEditingVersion;
            const wasSelectedButton = selectedVersionButton;
            
            closeVersionEditModal();
            
            // Reload versions to reflect changes
            loadVersions(activeInstanceId).then(() => {
                // Si había una versión seleccionada, volver a seleccionarla
                if (wasSelectedVersion) {
                    // Buscar el botón de la versión que estaba seleccionada
                    const versionButtons = document.querySelectorAll('.version-button');
                    let newSelectedButton = null;
                    
                    versionButtons.forEach(button => {
                        if (button.dataset.version === wasSelectedVersion) {
                            newSelectedButton = button;
                        }
                    });
                    
                    // Si se encontró el botón, seleccionarlo
                    if (newSelectedButton) {
                        // Simular un clic en el botón para seleccionarlo
                        newSelectedButton.click();
                    }
                }
            });
            
            // Limpiar variables temporales
            window.tempSelectedBackground = null;
            window.tempSelectedBackgroundFile = null;
            window.currentVersionImagePath = null;
            window.currentVersionBackgroundPath = null;
        }
    }
    
    function closeVersionEditModal() {
        document.getElementById('versionEditModal').style.display = 'none';
    }
    
    async function deleteSelectedVersion() {
        if (!currentEditingVersion) return;
        
        if (confirm(`Are you sure you want to delete this version? This action cannot be undone.`)) {
            try {
                const result = await window.api.deleteVersion(currentEditingVersion, activeInstanceId);
                if (result.success) {
                    showStatus("Version deleted successfully!");
                    closeVersionEditModal();
                    
                    // If the deleted version was selected, go back to home
                    if (selectedVersionButton && selectedVersionButton.dataset.version === currentEditingVersion) {
                        selectedVersionButton = null;
                        showSection("home");
                    }
                    
                    // Reload versions
                    loadVersions(activeInstanceId);
                } else {
                    showStatus(`Error deleting version: ${result.error}`);
                }
            } catch (error) {
                console.error("Error deleting version:", error);
                showStatus("Error deleting version.");
            }
        }
    }

    // --- Función de lanzamiento ---
    window.launch = async function() {
        if (!selectedVersionButton) {
            showStatus("Please select a version first.");
            return;
        }

        const versionId = selectedVersionButton.dataset.version;
        const username = document.getElementById("username").value.trim();

        if (!username) {
            showStatus("Please enter a username.");
            return;
        }

        // Guardar configuración
        saveCurrentSettings();

        // Obtener configuración de memoria
        const minMemory = document.getElementById("minMemory").value;
        const maxMemory = document.getElementById("maxMemory").value;

        // Limpiar la consola antes de iniciar
        clearConsole();
        addConsoleMessage("info", "Iniciando Minecraft...");
        addConsoleMessage("info", `Versión: ${versionId}, Usuario: ${username}`);
        addConsoleMessage("info", `Memoria: Min ${minMemory} - Max ${maxMemory}`);

        try {
            showStatus("Launching game...");
            const result = await window.api.launchGame({
                versionId: versionId,
                username: username,
                minMemory: minMemory,
                maxMemory: maxMemory,
                instanceId: activeInstanceId
            });

            if (result.success) {
                showStatus("Game launched successfully!");
                addConsoleMessage("info", "Juego iniciado correctamente");
            } else {
                showStatus(`Error launching game: ${result.error}`);
                addConsoleMessage("error", `Error al iniciar el juego: ${result.error}`);
            }
        } catch (error) {
            console.error("Error launching game:", error);
            showStatus(`Error launching game: ${error.message}`);
            addConsoleMessage("error", `Error al iniciar el juego: ${error.message}`);
        }
    };

    // --- Funciones para la consola ---
    function addConsoleMessage(type, message) {
        const consoleContent = document.getElementById("console-content");
        const messageElement = document.createElement("div");
        messageElement.classList.add("console-line", type);
        messageElement.textContent = message;
        consoleContent.appendChild(messageElement);
        
        // Auto-scroll al final
        consoleContent.scrollTop = consoleContent.scrollHeight;
    }

    function clearConsole() {
        const consoleContent = document.getElementById("console-content");
        consoleContent.innerHTML = "";
    }

    // --- Funciones de actualización ---

    window.updateMinecraft = async function() {
        const downloadURL = document.getElementById("minecraftURLInput").value.trim();
        if (!downloadURL) {
            showStatus("Please enter a download URL.");
            return;
        }

        try {
            const instances = await window.api.listInstances();
            
            // Si solo hay una instancia, actualizar directamente
            if (instances.length === 1) {
                await performMinecraftUpdate(downloadURL, instances[0].id);
                return;
            }
            
            // Si hay múltiples instancias, mostrar modal de selección
            await showInstanceSelectionModal('Update Minecraft', 'Select instance to update:', async (selectedInstanceId) => {
                await performMinecraftUpdate(downloadURL, selectedInstanceId);
            });
        } catch (error) {
            console.error("Error in updateMinecraft:", error);
            showStatus(`Error updating Minecraft: ${error.message}`);
        }
    };
    
    window.updateMods = async function() {
        const downloadURL = document.getElementById("modsURLInput").value.trim();
        if (!downloadURL) {
            showStatus("Please enter a mods download URL.");
            return;
        }

        try {
            const instances = await window.api.listInstances();
            
            // Si solo hay una instancia, actualizar directamente
            if (instances.length === 1) {
                await performModsUpdate(downloadURL, instances[0].id);
                return;
            }
            
            // Si hay múltiples instancias, mostrar modal de selección
            await showInstanceSelectionModal('Update Mods', 'Select instance to update mods:', async (selectedInstanceId) => {
                await performModsUpdate(downloadURL, selectedInstanceId);
            });
        } catch (error) {
            console.error("Error in updateMods:", error);
            showStatus(`Error updating mods: ${error.message}`);
        }
    };

    // Funciones auxiliares para la actualización

    async function performMinecraftUpdate(downloadURL, instanceId) {
        showStatus("Updating Minecraft...");
        
        // Show the update progress container
        const updateProgressContainer = document.getElementById('updateProgressContainer');
        const updateProgressBar = document.getElementById('updateProgressBar');
        const updateProgressStatus = document.getElementById('updateProgressStatus');
        
        // Update the title and initial status
        document.querySelector('.update-progress-title').textContent = 'Updating Minecraft';
        updateProgressStatus.textContent = 'Starting download...';
        updateProgressBar.style.width = '0%';
        updateProgressContainer.style.display = 'flex';
        
        // Set up progress event handler
        const handleProgress = (event, data) => {
            const progress = data.progress;
            updateProgressBar.style.width = `${progress}%`;
            updateProgressStatus.textContent = `Downloading: ${progress.toFixed(1)}%`;
        };
        
        // Register the event handler
        window.api.onDownloadProgress(handleProgress);
        
        // Start the update process
        const result = await window.api.updateMinecraft(downloadURL, instanceId);
        
        // Remove the event handler
        window.api.offDownloadProgress(handleProgress);
        
        // Hide the progress container
        updateProgressContainer.style.display = 'none';
        
        if (result.success) {
            showStatus("Minecraft updated successfully!");
            loadVersions(instanceId);
        } else {
            showStatus(`Error updating Minecraft: ${result.error}`);
        }
    }
    
    async function performModsUpdate(downloadURL, instanceId) {
        showStatus("Updating Mods...");
        
        // Show the update progress container
        const updateProgressContainer = document.getElementById('updateProgressContainer');
        const updateProgressBar = document.getElementById('updateProgressBar');
        const updateProgressStatus = document.getElementById('updateProgressStatus');
        
        // Update the title and initial status
        document.querySelector('.update-progress-title').textContent = 'Updating Mods';
        updateProgressStatus.textContent = 'Starting download...';
        updateProgressBar.style.width = '0%';
        updateProgressContainer.style.display = 'flex';
        
        // Set up progress event handler
        const handleProgress = (event, data) => {
            const progress = data.progress;
            if (progress === 'extracting') {
                updateProgressStatus.textContent = 'Extracting mods...';
            } else if (progress === 'completed') {
                updateProgressStatus.textContent = 'Mods updated successfully!';
            } else {
                updateProgressBar.style.width = `${progress}%`;
                updateProgressStatus.textContent = `Downloading: ${progress.toFixed(1)}%`;
            }
        };
        
        // Register the event handler
        window.api.onDownloadProgress(handleProgress);
        
        // Start the update process
        const result = await window.api.updateMods(downloadURL, instanceId);
        
        // Remove the event handler
        window.api.offDownloadProgress(handleProgress);
        
        // Hide the progress container after a delay
        setTimeout(() => {
            updateProgressContainer.style.display = 'none';
        }, 2000);
        
        if (result.success) {
            showStatus("Mods updated successfully!");
        } else {
            showStatus(`Error updating mods: ${result.error}`);
        }
    }

    async function showInstanceSelectionModal(title, message, onSelect) {
        let modal = document.getElementById('instanceSelectionModal');
        if (!modal) {
            const modalHTML = `
                <div id="instanceSelectionModal" class="modal">
                    <div class="modal-content">
                        <h2>${title}</h2>
                        <p>${message}</p>
                        <div class="instance-selection-list" id="instanceSelectionList"></div>
                        <div class="modal-buttons">
                            <button id="confirmInstanceSelection" disabled>Update</button>
                            <button id="cancelInstanceSelection">Cancel</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            modal = document.getElementById('instanceSelectionModal');
        }

        const instances = await window.api.listInstances();
        const listContainer = document.getElementById('instanceSelectionList');
        listContainer.innerHTML = '';
        
        let selectedInstanceId = null;

        for (const instance of instances) {
            const option = document.createElement('div');
            option.className = 'instance-option';
            
            const iconDiv = document.createElement('div');
            iconDiv.className = 'instance-option-icon';
            
            if (instance.icon) {
                const iconDataUrl = await window.api.getInstanceIcon(instance.icon);
                if (iconDataUrl) {
                    iconDiv.style.backgroundImage = `url('${iconDataUrl}')`;
                } else {
                    iconDiv.textContent = instance.name.substring(0, 2).toUpperCase();
                }
            } else {
                iconDiv.textContent = instance.name.substring(0, 2).toUpperCase();
            }
            
            option.appendChild(iconDiv);
            option.appendChild(document.createTextNode(instance.name));
            
            option.addEventListener('click', () => {
                document.querySelectorAll('.instance-option').forEach(opt => opt.classList.remove('selected'));
                
                option.classList.add('selected');
                selectedInstanceId = instance.id;
                document.getElementById('confirmInstanceSelection').disabled = false;
            });
            
            listContainer.appendChild(option);
        }

        return new Promise((resolve) => {
            modal.style.display = 'flex';
            
            document.getElementById('confirmInstanceSelection').onclick = async () => {
                if (selectedInstanceId) {
                    modal.style.display = 'none';
                    await onSelect(selectedInstanceId);
                }
            };

            document.getElementById('cancelInstanceSelection').onclick = () => {
                modal.style.display = 'none';
            };

            window.onclick = (event) => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            };
        });
    }

    window.saveSettings = function() {
        saveCurrentSettings();
        showStatus("Settings saved successfully!");
    };

    // --- Inicialización ---
    async function init() {
        await loadSettings();
        await loadUsername(); // Añadir carga del nombre de usuario
        await loadInstances();
        
        // Inicializar el módulo de modpacks
        if (typeof window.initModpacksModule === 'function') {
            window.initModpacksModule();
        }
        
        // Configurar la navegación de la barra lateral de configuraciones
        setupSettingsSidebar();
        
        // Asegurar que siempre se inicie en la pantalla de inicio
        showSection("home");
        
        // Resetear selecciones de instancia y versión
        selectedInstanceButton = null;
        selectedVersionButton = null;
        document.getElementById("versions-sidebar").classList.remove("active");
        
        // Configurar manejadores para eventos de descarga del JDK
        setupJdkDownloadHandlers();
    }
    
    // Función para configurar los manejadores de eventos de descarga del JDK
    function setupJdkDownloadHandlers() {
        const jdkDownloadModal = document.getElementById('jdkDownloadModal');
        const jdkProgressFill = document.getElementById('jdkProgressFill');
        const jdkProgressText = document.getElementById('jdkProgressText');
        const jdkDownloadStatus = document.getElementById('jdkDownloadStatus');
        
        // Cuando comienza la descarga del JDK
        window.api.onJdkDownloadStarted(() => {
            // Mostrar el modal de descarga
            jdkDownloadModal.classList.add('visible');
            jdkProgressFill.style.width = '0%';
            jdkProgressText.textContent = '0%';
            jdkDownloadStatus.textContent = 'Iniciando descarga...';
            
            // Agregar mensaje a la consola
            addConsoleMessage('info', 'Descargando Java Development Kit (JDK)...');
        });
        
        // Actualizar el progreso de la descarga
        window.api.onJdkDownloadProgress((event, data) => {
            const progress = data.progress;
            jdkProgressFill.style.width = `${progress}%`;
            jdkProgressText.textContent = `${progress}%`;
            jdkDownloadStatus.textContent = `Descargando... ${progress}%`;
            
            // Actualizar la consola periódicamente (cada 10%)
            if (progress % 10 === 0) {
                addConsoleMessage('info', `Descarga del JDK: ${progress}%`);
            }
        });
        
        // Cuando comienza la extracción
        window.api.onJdkExtracting(() => {
            jdkProgressFill.style.width = '100%';
            jdkProgressText.textContent = '100%';
            jdkDownloadStatus.textContent = 'Extrayendo archivos...';
            addConsoleMessage('info', 'Extrayendo archivos del JDK...');
        });
        
        // Cuando se completa la instalación
        window.api.onJdkInstallCompleted(() => {
            // Ocultar el modal después de un breve retraso
            jdkDownloadStatus.textContent = 'Instalación completada';
            addConsoleMessage('success', 'Instalación del JDK completada con éxito.');
            
            setTimeout(() => {
                jdkDownloadModal.classList.remove('visible');
            }, 2000);
        });
        
        // Cuando hay un error en la instalación
        window.api.onJdkInstallError((event, data) => {
            jdkDownloadStatus.textContent = `Error: ${data?.error || 'Error desconocido'}`;
            addConsoleMessage('error', `Error en la instalación del JDK: ${data?.error || 'Error desconocido'}`);
            
            // Ocultar el modal después de un retraso mayor
            setTimeout(() => {
                jdkDownloadModal.classList.remove('visible');
            }, 5000);
        });
    }

    // Crear el modal para seleccionar fondos
    function createBackgroundsPopup() {
        // Verificar si ya existe el popup
        if (document.getElementById('backgroundsPopup')) {
            return;
        }
        
        const popupHTML = `
        <div id="backgroundsPopup" class="modal">
            <div class="modal-content backgrounds-popup-content">
                <h2>Select Background</h2>
                
                <div class="image-upload-container">
                    <label for="versionBackgroundUpload">Upload Background Image:</label>
                    <input type="file" id="versionBackgroundUpload" accept="image/*">
                </div>
                
                <label>Or select from default backgrounds:</label>
                <div class="default-images-container" id="defaultBackgroundsContainer">
                    <!-- Default backgrounds will be loaded here -->
                </div>
                
                <div class="modal-buttons">
                    <button id="confirmBackgroundSelection">Confirm</button>
                    <button id="cancelBackgroundSelection">Cancel</button>
                </div>
            </div>
        </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', popupHTML);
        setupBackgroundsPopup();
    }

    // Configurar el popup de selección de fondos
    function setupBackgroundsPopup() {
        // Cargar imágenes predeterminadas
        loadDefaultBackgroundImages();
        
        // Configurar manejadores de eventos
        document.getElementById('versionBackgroundUpload').addEventListener('change', handleVersionBackgroundUpload);
        document.getElementById('confirmBackgroundSelection').addEventListener('click', confirmBackgroundSelection);
        document.getElementById('cancelBackgroundSelection').addEventListener('click', closeBackgroundsPopup);
        
        // Configurar cierre con clic fuera del popup
        const popup = document.getElementById("backgroundsPopup");
        popup.addEventListener('click', (event) => {
            if (event.target === popup) {
                closeBackgroundsPopup();
            }
        });
    }

    // Mostrar el popup de selección de fondos
    function openBackgroundsPopup() {
        // Crear el popup si no existe
        if (!document.getElementById('backgroundsPopup')) {
            createBackgroundsPopup();
        }

        // Mostrar el popup
        document.getElementById('backgroundsPopup').style.display = 'flex';
    }
    
    // Cerrar el popup de selección de fondos
    function closeBackgroundsPopup() {
        const popup = document.getElementById('backgroundsPopup');
        if (popup) {
            popup.style.display = 'none';
        }
    }
    
    // Confirmar selección de fondo
    function confirmBackgroundSelection() {
        const selectedBackground = document.querySelector('#defaultBackgroundsContainer .default-version-image.selected-image');
        const fileInput = document.getElementById('versionBackgroundUpload');
        const backgroundPreview = document.getElementById('versionBackgroundPreview');
        
        let backgroundSelected = false;
        
        if (selectedBackground) {
            // Lo más importante: obtener la URL de la imagen original de alta calidad
            const originalImageURL = selectedBackground.dataset.originalImage;
            
            if (!originalImageURL) {
                console.error("ERROR: No se encontró la URL de la imagen original");
                return;
            }
            
            console.log("Confirmando selección de fondo");
            console.log("- Miniatura:", selectedBackground.src);
            console.log("- Original:", originalImageURL);
            
            // Guardar en TODAS las posibles ubicaciones para mayor seguridad
            window.currentVersionBackgroundPath = originalImageURL;
            window.tempSelectedBackground = originalImageURL;
            backgroundSelected = true;
            
            // Para la vista previa en el modal usamos la miniatura (mejor rendimiento)
            backgroundPreview.style.backgroundImage = `url('${selectedBackground.src}')`;
            backgroundPreview.textContent = '';
            
            // Vista previa en la UI principal con la imagen original
            previewBackgroundInMainUI(originalImageURL);
            
            // Guardar en el elemento del DOM para persistencia adicional
            backgroundPreview.dataset.selectedBackground = originalImageURL;
            
            // Forzar guardado inmediato de la selección (esto es crítico)
            document.getElementById('selectBackgroundBtn').setAttribute('data-has-background', 'true');
            document.getElementById('selectBackgroundBtn').setAttribute('data-background-path', originalImageURL);
        } else if (fileInput.files.length > 0) {
            // Para imágenes subidas por el usuario
            if (window.tempSelectedBackgroundFile) {
                backgroundPreview.style.backgroundImage = `url('${window.tempSelectedBackgroundFile}')`;
                backgroundPreview.textContent = '';
                
                window.currentVersionBackgroundPath = window.tempSelectedBackgroundFile;
                window.tempSelectedBackground = window.tempSelectedBackgroundFile; // Guardar también aquí
                backgroundSelected = true;
                
                previewBackgroundInMainUI(window.tempSelectedBackgroundFile);
                
                // Guardar en el elemento del DOM para persistencia adicional
                backgroundPreview.dataset.selectedBackground = window.tempSelectedBackgroundFile;
                
                // Forzar guardado inmediato de la selección (esto es crítico)
                document.getElementById('selectBackgroundBtn').setAttribute('data-has-background', 'true');
                document.getElementById('selectBackgroundBtn').setAttribute('data-background-path', window.tempSelectedBackgroundFile);
            }
        }
        
        // Mantener un registro de que se seleccionó un fondo
        if (backgroundSelected) {
            console.log("Fondo seleccionado correctamente - será guardado cuando se guarde la versión");
            document.getElementById('selectBackgroundBtn').classList.add('background-selected');
            document.getElementById('selectBackgroundBtn').textContent = 'Change Background';
        }
        
        // Cerrar el popup
        closeBackgroundsPopup();
    }
    
    // Aplicar vista previa del fondo en la UI principal
    function previewBackgroundInMainUI(imagePath) {
        // Solo si la versión que se está editando es la misma que está seleccionada actualmente
        if (currentEditingVersion && selectedVersionButton && 
            selectedVersionButton.dataset.version === currentEditingVersion) {
            const versionDetailsElement = document.getElementById("version-details");
            versionDetailsElement.classList.add('changing-background');
            
            // Guardar el camino original para usarlo más tarde si es necesario
            versionDetailsElement.dataset.originalBackgroundPath = imagePath;
            
            setTimeout(() => {
                // Siempre usar la imagen original de alta calidad para el fondo principal
                versionDetailsElement.style.backgroundImage = `url('${imagePath}')`;
                versionDetailsElement.classList.remove('no-background');
                
                setTimeout(() => {
                    versionDetailsElement.classList.remove('changing-background');
                }, 500);
            }, 50);
        }
    }
    
    function selectDefaultBackground(imagePath, originalImagePath) {
        console.log("Seleccionando fondo:");
        console.log("- Miniatura:", imagePath);
        console.log("- Original:", originalImagePath);
        
        // Remove selection from all images
        document.querySelectorAll('#defaultBackgroundsContainer .default-version-image').forEach(img => {
            img.classList.remove('selected-image');
        });
        
        // Add selection to clicked image
        const clickedImage = Array.from(document.querySelectorAll('#defaultBackgroundsContainer .default-version-image')).find(img => img.src === imagePath);
        if (clickedImage) {
            clickedImage.classList.add('selected-image');
            // Guardar la imagen original en el atributo de datos
            clickedImage.dataset.originalImage = originalImagePath;
        }
        
        // Guardar referencias temporales - siempre usar la imagen original, no la miniatura
        window.tempSelectedBackground = originalImagePath;
    }

    function loadDefaultBackgroundImages() {
        const container = document.getElementById('defaultBackgroundsContainer');
        container.innerHTML = '';
        
        // Load images from assets/backgrounds folder
        window.api.getDefaultBackgroundImages().then(images => {
            images.forEach(image => {
                const imgElement = document.createElement('img');
                imgElement.src = image.dataURL; // Usar la miniatura para la vista previa
                imgElement.classList.add('default-version-image');
                imgElement.title = image.name;
                imgElement.dataset.originalImage = image.originalDataURL; // Guardar la URL de la imagen original
                imgElement.addEventListener('click', () => selectDefaultBackground(image.dataURL, image.originalDataURL));
                container.appendChild(imgElement);
            });
        }).catch(error => {
            console.error("Error loading default background images:", error);
        });
    }
    
    function handleVersionBackgroundUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                // Update preview
                const selectedPreviews = document.querySelectorAll('#defaultBackgroundsContainer .default-version-image.selected-image');
                selectedPreviews.forEach(preview => {
                    preview.classList.remove('selected-image');
                });
                
                // Guardar temporalmente el fondo seleccionado para previsualización
                window.tempSelectedBackgroundFile = e.target.result;
                
                // Si estamos en el modal de confirmación, actualizar también la vista previa ahí
                if (document.getElementById('backgroundsPopup').style.display === 'flex') {
                    // En este punto no actualizamos la vista previa principal hasta que se confirme
                }
            };
            reader.readAsDataURL(file);
        }
    }
    
    init();
});
