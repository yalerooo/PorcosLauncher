document.addEventListener('DOMContentLoaded', async () => {

    // --- Variables globales ---
    let selectedVersionButton = null;

    // --- Funciones de la UI ---

    function showSection(sectionId) {
      console.log("Showing section:", sectionId);
        document.querySelectorAll('.content-section').forEach(section => {
          console.log("Hiding section:", section.id);
            section.classList.remove('active');
            section.style.display = 'none';
        });
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('active');
            section.style.display = 'block';
             if (sectionId === 'version-details') {
              //Si es la de inicio, mostramos la imagen
              document.getElementById('minecraft-img').style.display = 'block';
            }
        }
    }

    // --- Event Listeners para la barra lateral (versiones) ---
    document.querySelector('.sidebar').addEventListener('click', async (event) => {
        const versionButton = event.target.closest('.version-button');
        if (versionButton) {
            if (selectedVersionButton) {
                selectedVersionButton.querySelector('.version-logo').classList.remove('selected');
            }
            selectedVersionButton = versionButton;
            versionButton.querySelector('.version-logo').classList.add('selected');

            const versionId = versionButton.dataset.version;
            document.getElementById("version-name").textContent = `Version: ${versionId}`;

            // Mostrar y configurar la sección de detalles de la versión
            showSection('version-details');
            document.getElementById('username').style.display = 'block';
            document.getElementById('username').value = '';
            document.getElementById('launch').style.display = 'block';
            document.getElementById('minecraft-img').style.display = 'none'; //Oculta

        }
    });

    // --- Event Listener: Clic en el logo del launcher ---
     const launcherLogo = document.getElementById('launcher-logo');
      if(launcherLogo){
        launcherLogo.addEventListener('click', () => {
          if (selectedVersionButton) {
            selectedVersionButton.querySelector('.version-logo').classList.remove('selected');
            selectedVersionButton = null;
          }
           showSection('version-details');
           document.getElementById("version-name").textContent = ``;
           document.getElementById('username').style.display = 'none';
           document.getElementById('launch').style.display = 'none';
           document.getElementById('minecraft-img').style.display = 'block'; //Muestra
        });
      }

    // --- Event Listener: Clic en el icono de ajustes ---
    document.getElementById('settings-icon').addEventListener('click', () => {
        if (selectedVersionButton) {
            selectedVersionButton.querySelector('.version-logo').classList.remove('selected');
            selectedVersionButton = null;
        }
        showSection('settings');
          //Oculta
        document.getElementById('username').style.display = 'none';
        document.getElementById('launch').style.display = 'none';
        document.getElementById("version-name").textContent = ``;
        document.getElementById('minecraft-img').style.display = 'none';
    });

    // --- Event Listener: Clic en el icono de la carpeta ---
    document.getElementById('folder-icon').addEventListener('click', async () => {
        try {
            const minecraftPath = await window.api.getMinecraftPath();
            await window.api.openMinecraftFolder(minecraftPath);

        } catch (error) {
            console.error("Error al abrir la carpeta:", error);
            document.getElementById('status').textContent = `Error al abrir la carpeta: ${error.message}`;
        }
    });


    // --- Carga inicial de la UI ---
    async function loadInitialUI() {
        try {
            const versions = await window.api.getVersions();
            const sidebar = document.querySelector('.sidebar');

            versions.forEach(version => {
                const versionButton = document.createElement('div');
                versionButton.classList.add('version-button');
                versionButton.dataset.version = version.id;

                const versionLogo = document.createElement('div');
                versionLogo.classList.add('version-logo');
                versionButton.appendChild(versionLogo);
                sidebar.appendChild(versionButton);
            });

            // Mostrar la sección de inicio (imagen)
            showSection('version-details');
            document.getElementById('minecraft-img').style.display = 'block'; //Muestra
            checkForForge();

            // Mostrar el botón de actualización de .minecraft por defecto
            document.getElementById('updateMinecraftButton').style.display = 'block';
            document.getElementById('minecraftURLInput').style.display = 'inline-block';


        } catch (error) {
            console.error("Error al cargar la UI inicial:", error);
            document.getElementById('status').textContent = `Error al cargar las versiones: ${error.message}`;
        }
    }

    // --- Funciones de interacción con el backend (Electron) ---

    async function launch() {
        const username = document.getElementById('username').value;
        let versionId = null;
        if (selectedVersionButton) {
            versionId = selectedVersionButton.dataset.version;
        }

        if (!versionId) {
            document.getElementById('status').textContent = 'Por favor, selecciona una versión.';
            return;
        }
        const minMemory = document.getElementById('minMemory').value;
        const maxMemory = document.getElementById('maxMemory').value;

        document.getElementById('status').textContent = 'Iniciando...';

        try {
            const result = await window.api.launchGame({ username, versionId, minMemory, maxMemory });
            if (result.success) {
                document.getElementById('status').textContent = '¡Juego en ejecución!';
            } else {
                document.getElementById('status').textContent = `Error: ${result.error}`;
            }
        } catch (error) {
            document.getElementById('status').textContent = `Error: ${error.message}`;
        }
    }

    async function updateMods() {
        const downloadURL = document.getElementById('downloadURLInput').value;
        if (!downloadURL) {
            document.getElementById('status').textContent = 'Por favor, introduce la URL de descarga.';
            return;
        }
        document.getElementById('status').textContent = 'Actualizando mods...';
        try {
            const result = await window.api.updateMods(downloadURL);
            if (result.success) {
                document.getElementById('status').textContent = 'Mods actualizados correctamente!';
            } else {
                document.getElementById('status').textContent = `Error al actualizar mods: ${result.error}`;
            }
        } catch (error) {
            document.getElementById('status').textContent = `Error: ${error.message}`;
        }
    }

    async function updateMinecraft() {
        const downloadURL = document.getElementById('minecraftURLInput').value;
        if (!downloadURL) {
            document.getElementById('status').textContent = 'Por favor, introduce la URL de descarga.';
            return;
        }
        document.getElementById('status').textContent = 'Actualizando .minecraft...';
        try {
            const result = await window.api.updateMinecraft(downloadURL);
            if (result.success) {
                document.getElementById('status').textContent = 'Carpeta .minecraft actualizada!';
                // Recargar las versiones (opcional)
                loadInitialUI();
            } else {
                document.getElementById('status').textContent = `Error: ${result.error}`;
            }
        } catch (error) {
            document.getElementById('status').textContent = `Error: ${error.message}`;
        }
    }

    async function checkForForge() {
        const versions = await window.api.getVersions();
        const updateButton = document.getElementById('updateModsButton');
        const downloadURLInput = document.getElementById('downloadURLInput');
        let hasForge = false;

        for (const version of versions) {
            if (version.isForge) {
                hasForge = true;
                break;
            }
        }
      if (hasForge) {
        updateButton.style.display = 'block';
        downloadURLInput.style.display = 'block';
      } else {
        updateButton.style.display = 'none';
        downloadURLInput.style.display = 'none';
      }

    }

    // --- Inicialización ---

    loadInitialUI();



    // ---  Listeners globales ---
    window.launch = launch;
    window.updateMods = updateMods;
    window.updateMinecraft = updateMinecraft;
});