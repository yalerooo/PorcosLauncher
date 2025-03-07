// --- FILE: script.js ---
document.addEventListener("DOMContentLoaded", async () => {
    let selectedVersionButton = null;
    let currentEditingVersion = null; // Store the ID of the version being edited

    // --- Helper Functions ---

    function showSection(sectionId) {
        document.querySelectorAll(".content-section").forEach((section) => {
            section.classList.remove("active");
            section.style.display = "none";
        });

        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add("active");
            section.style.display = "block";
        }

        const appTitle = document.getElementById("app-title");
        const versionInfoHeader = document.getElementById("version-info-header");
        const versionNameInput = document.getElementById("version-name-input");

        versionNameInput.style.display = "none";
        appTitle.style.display = "inline";

        if (sectionId === "home") {
            appTitle.textContent = "Porcos Launcher";
            versionInfoHeader.textContent = "";
        } else if (sectionId === "version-details") {
            if (selectedVersionButton) {
                const versionId = selectedVersionButton.dataset.version;
                versionInfoHeader.textContent = `Version: ${versionId}`;
                loadUsername(); //  <---- LOAD USERNAME HERE
            }
        } else if (sectionId === "settings") {
            appTitle.textContent = "Settings";
            versionInfoHeader.textContent = "";
        }
    }

        // --- Load and Apply Settings ---
    async function loadSettings() {
        try {
            const settings = await window.api.getSettings();
            //USERNAME IS NOT LOADED HERE
            document.getElementById('downloadURLInput').value = settings.modsURL;
            document.getElementById('minecraftURLInput').value = settings.minecraftURL;
            document.getElementById('minMemory').value = settings.minMemory;
            document.getElementById('maxMemory').value = settings.maxMemory;
        } catch (error) {
            console.error("Error loading settings:", error);
            showStatus("Error loading settings.");
        }
    }
      // --- Load Username ---
      async function loadUsername() {
        try {
            const settings = await window.api.getSettings();
            document.getElementById("username").value = settings.username || ""; // Load into the correct input!
        } catch (error) {
            console.error("Error loading username:", error);
            // Don't show a status here, as it might overwrite other messages.
        }
    }

    // --- Save Settings ---
    function saveCurrentSettings() {
      const settings = {
        username: document.getElementById("username").value, //We get the value from the input
        modsURL: document.getElementById("downloadURLInput").value,
        minecraftURL: document.getElementById("minecraftURLInput").value,
        minMemory: document.getElementById("minMemory").value,
        maxMemory: document.getElementById("maxMemory").value,
      }
      window.api.setSettings(settings)
    }


    async function loadVersionName(versionId) {
        try {
            const storedName = await window.api.getVersionName(versionId);
            const appTitle = document.getElementById("app-title");

            appTitle.textContent = storedName || "Installation Name";
            appTitle.dataset.versionId = versionId;

            if (selectedVersionButton) {
                selectedVersionButton.title = storedName || "Installation Name";
                updateVersionLogo(selectedVersionButton, versionId); // Update logo after loading
            }
        } catch (error) {
            console.error("Error loading version name:", error);
            showStatus("Error loading version name.");
        }
    }

    async function saveVersionName(versionId, newName) {
        try {
            await window.api.setVersionName(versionId, newName);
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
        const storedName = await window.api.getVersionName(versionId) || versionId;

        try {
            const imagePath = await window.api.getVersionImage(versionId);
            if (imagePath) {
                // Use custom image.
                versionLogo.style.backgroundImage = `url('${imagePath}')`;
                versionLogo.classList.add("has-image");
                versionLogo.textContent = ""; // Remove text
            } else {
                // No custom image, use initials or version number
                versionLogo.style.backgroundImage = ""; // Remove background image
                versionLogo.classList.remove("has-image");
                versionLogo.textContent = storedName.substring(0, 2).toUpperCase(); // Display initials
            }

        } catch (error) {
            console.error("Error updating version logo:", error);
            versionLogo.style.backgroundImage = "";
            versionLogo.classList.remove("has-image");
            versionLogo.textContent = storedName.substring(0, 2).toUpperCase(); // Fallback to initials
        }
    }


    // --- Event Handlers ---

    document.querySelector(".sidebar").addEventListener("click", async (event) => {
        const versionButton = event.target.closest(".version-button");

        // Check if the click was on the add button:
        if (event.target.closest(".version-add-icon")) {
            return; // Do nothing else in this event listener.
        }

        if (versionButton) {
            if (selectedVersionButton) {
                selectedVersionButton
                    .querySelector(".version-logo")
                    .classList.remove("selected");
            }
            selectedVersionButton = versionButton;
            versionButton.querySelector(".version-logo").classList.add("selected");

            const versionId = versionButton.dataset.version;
            await loadVersionName(versionId);
            showSection("version-details");
        }
    });


    const launcherLogo = document.getElementById("launcher-logo");
    if (launcherLogo) {
        launcherLogo.addEventListener("click", () => {
            if (selectedVersionButton) {
                selectedVersionButton
                    .querySelector(".version-logo")
                    .classList.remove("selected");
                selectedVersionButton = null;
            }
            showSection("home");
        });
    }

    document.getElementById("settings-icon").addEventListener("click", () => {
        if (selectedVersionButton) {
            selectedVersionButton
                .querySelector(".version-logo")
                .classList.remove("selected");
            selectedVersionButton = null;
        }
        showSection("settings");
    });

    document.getElementById("folder-icon").addEventListener("click", async () => {
        try {
            const minecraftPath = await window.api.getMinecraftPath();
            await window.api.openMinecraftFolder(minecraftPath);
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

    async function loadInitialUI() {
        try {
            const versions = await window.api.getVersions();
            const sidebar = document.querySelector(".sidebar");
            sidebar
                .querySelectorAll(".version-button")
                .forEach((button) => button.remove());

            for (const version of versions) {
                const versionButton = document.createElement("div");
                versionButton.classList.add("version-button");
                versionButton.dataset.version = version.id;
                versionButton.title = version.name;


                const versionLogo = document.createElement("div");
                versionLogo.classList.add("version-logo");
                versionButton.appendChild(versionLogo);

                // Edit button (pencil icon)
                const editButton = document.createElement("div");
                editButton.classList.add("version-edit-button");
                editButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          `;

                versionButton.appendChild(editButton);
                editButton.addEventListener("click", (event) => {
                    event.stopPropagation(); // Prevent triggering the version button click
                    openEditModal(version.id);
                });

                sidebar.appendChild(versionButton);
                await updateVersionLogo(versionButton, version.id); // Update logo after creation

            }
             // Add "+" button
            addCreateVersionButton();

            showSection("home");
            checkForForge();
            document.getElementById("updateMinecraftButton").style.display = "block";
            document.getElementById("minecraftURLInput").style.display =
                "inline-block";
        } catch (error) {
            console.error("Error loading initial UI:", error);
            showStatus(`Error loading versions: ${error.message}`);
        }
    }


     async function addCreateVersionButton() {
        const sidebar = document.querySelector('.sidebar');

        // Create "+" button
        const addButton = document.createElement('div');
        addButton.classList.add('version-button');
        addButton.title = "Crear nueva versión";
        addButton.innerHTML = `
            <div class="version-add-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </div>
        `;
        addButton.addEventListener('click', openCreateVersionModal);
        sidebar.appendChild(addButton);
    }

    async function openCreateVersionModal() {
        let modal = document.getElementById('versionCreateModal'); // Usa let, no const
        if (!modal) {
            createVersionCreateModal(); // Create if doesn't exist yet.
            modal = document.getElementById('versionCreateModal'); // IMP: Re-asignar modal
        }

        // Populate Version Dropdown (esto se queda igual)
        const versionSelect = document.getElementById('modalCreateVersionNumber');
        versionSelect.innerHTML = ''; // Clear previous options

        try {
            const manifest = await window.api.getVersionManifest();
            manifest.versions.forEach(version => {
                //Only release
                if (version.type === 'release') {
                    const option = document.createElement('option');
                    option.value = version.id;
                    option.textContent = version.id;
                    versionSelect.appendChild(option);
                }
            });
        } catch (error) {
            console.error("Error fetching version manifest:", error);
            showStatus("Error fetching available versions.");
            return; // Exit if can't get versions.
        }

        modal.style.display = 'block'; // Show the modal
        setupCreateModal(); // ***LLAMADA AQUI*** Despues de mostrar.
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
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        // setupCreateModal()  <-- ¡NO LLAMAR AQUÍ!
    }


    function setupCreateModal(){
        //console.log("setupCreateModal called");  // Add this for debugging

        document.getElementById('createVersion').addEventListener('click', createNewVersion);
        document.getElementById('cancelVersionCreate').addEventListener('click', closeCreateVersionModal);


      //Close modal
      const modal = document.getElementById("versionCreateModal");
        window.onclick = (event) => {
            if (event.target == modal) {
                closeCreateVersionModal();
            }
        }
    }

    function closeCreateVersionModal() {
       // console.log("closeCreateVersionModal called"); // ADD THIS
        document.getElementById('versionCreateModal').style.display = 'none';
    }


   async function createNewVersion() {
       // console.log("createNewVersion called"); // ADD THIS
        const versionName = document.getElementById('modalCreateVersionName').value.trim();
        const versionNumber = document.getElementById('modalCreateVersionNumber').value;

        if (!versionName || !versionNumber) {
            showStatus("Please enter both name and version.");
            return;
        }

        try {
            // Primero, descarga la versión
            const downloadResult = await window.api.downloadVersion(versionNumber);

            if (downloadResult.success) {
                // Si la descarga fue exitosa, entonces establece el nombre personalizado
                const setNameResult = await window.api.setVersionName(versionNumber, versionName);

                if (setNameResult.success) {
                    showStatus(`Version ${versionNumber} created successfully!`);
                } else {
                    showStatus(`Version ${versionNumber} downloaded, but failed to set name: ${setNameResult.error}`);
                }

               closeCreateVersionModal();
               loadInitialUI(); // Reload the version list
               showSection("home"); // Vuelve a la sección principal.
           } else {
               // Si la descarga falla, muestra el error
               showStatus(`Error downloading version: ${downloadResult.error}`);
           }
       } catch (error) {
           console.error("Error creating version:", error);
           showStatus(`Error creating version: ${error.message}`);
       }
   }

   async function checkForForge() {
    const versions = await window.api.getVersions();
    const updateButton = document.getElementById("updateModsButton");
    const downloadURLInput = document.getElementById("downloadURLInput");
    let hasForge = false;

    for (const version of versions) {
        if (version.isForge) {
            hasForge = true;
            break;
        }
    }
    if (hasForge) {
        updateButton.style.display = "block";
        downloadURLInput.style.display = "block";
    } else {
        updateButton.style.display = "none";
        downloadURLInput.style.display = "none";
    }
}

async function openEditModal(versionId) {
    currentEditingVersion = versionId;
    const modal = document.getElementById("versionEditModal");
    const versionName = await window.api.getVersionName(versionId);
    document.getElementById("modalVersionName").value = versionName || versionId;

    // Load current image (if any)
    try {
        const currentImagePath = await window.api.getVersionImage(versionId);
        const versionImagePreview = document.getElementById("versionImagePreview");
        if (currentImagePath) {
            versionImagePreview.src = currentImagePath;
            versionImagePreview.style.display = "block";
        } else {
            versionImagePreview.src = "";
            versionImagePreview.style.display = "none";
        }
    } catch (error) {
        console.error("Error loading current image:", error);
        // Handle error
    }

    // *** Populate default images DYNAMICALLY ***
    const defaultImagesContainer = document.getElementById("defaultImagesContainer");
    defaultImagesContainer.innerHTML = "";

    try {
        const defaultImages = await window.api.getDefaultVersionImages();
        console.log("Received default image paths from main process:", defaultImages);

        defaultImages.forEach(imagePath => {
            const imgElement = document.createElement("img");
            imgElement.src = imagePath;
            imgElement.classList.add("default-version-image");

            // --- FIX: Extract filename from URL ---
            const url = new URL(imagePath);
            const filename = url.pathname.split('/').pop(); // Get last part of path
            imgElement.title = filename; // Use extracted filename
            // --- END FIX ---

            imgElement.addEventListener("click", () => selectDefaultImage(imagePath));
            imgElement.addEventListener('error', (event) => { //Keep the error listener.
                console.error(`Error loading image at path: ${imagePath}`, event);
                imgElement.src = 'assets/versions/default-minecraft.png'; //Set default in case of error
            });
            defaultImagesContainer.appendChild(imgElement);
        });

    } catch (error) {
        console.error("Error loading default images (outer try/catch):", error);
        // Display an error message to the user in the modal, e.g.,
        defaultImagesContainer.innerHTML = "<p>Error loading default images.</p>";
    }

    modal.style.display = "block";
}

function selectDefaultImage(imagePath) {
    const versionImagePreview = document.getElementById("versionImagePreview");
    versionImagePreview.src = imagePath; // This should be correct now
    versionImagePreview.style.display = "block";

    //Crucially, remove the file from the input
    document.getElementById("versionImage").value = "";
}

function closeEditModal() {
    document.getElementById("versionEditModal").style.display = "none";
    currentEditingVersion = null; // Reset
}

async function saveVersionChanges() {
    const versionId = currentEditingVersion;
    if (!versionId) return;

    const newName = document.getElementById("modalVersionName").value.trim();
    const versionImagePreview = document.getElementById("versionImagePreview");

    // Save name (this part is likely fine)
    if (newName) {
        try {
            await window.api.setVersionName(versionId, newName);
            const versionButton = document.querySelector(`.version-button[data-version="${versionId}"]`);
            if (versionButton) {
                versionButton.title = newName;
            }
            const appTitle = document.getElementById("app-title")
            appTitle.textContent = newName;
        } catch (error) {
            console.error("Error saving version name:", error);
            showStatus("Error saving version name.");
            return;
        }
    }

    // Save image (the likely problem area)
    try {
        // Check if a new image was selected (either uploaded or default)
        if (versionImagePreview.src) { // Simplified check
            await window.api.setVersionImage(versionId, versionImagePreview.src);
        }

        const versionButton = document.querySelector(`.version-button[data-version="${versionId}"]`);
        if (versionButton) {
            await updateVersionLogo(versionButton, versionId);
        }

    } catch (error) {
        console.error("Error saving version image:", error);
        showStatus("Error saving version image.");
    }

    closeEditModal();
    showStatus("Changes saved.");
    loadInitialUI();
}

async function deleteVersion() {
    const versionId = currentEditingVersion;
    if (!versionId) return;

    const confirmDelete = confirm(`Are you sure you want to delete version ${versionId}? This cannot be undone.`);
    if (confirmDelete) {
        try {
            await window.api.deleteVersion(versionId);
            showStatus(`Version ${versionId} deleted.`);
            closeEditModal();
            loadInitialUI(); // Refresh the version list
            //If the deleted is the selected
            showSection("home");
        } catch (error) {
            console.error("Error deleting version:", error);
            showStatus(`Error deleting version: ${error.message}`);
        }
    }
}

function setupEditModal() {
    document.getElementById("saveVersionChanges").addEventListener("click", saveVersionChanges);
    document.getElementById("cancelVersionEdit").addEventListener("click", closeEditModal);
    document.getElementById("deleteVersion").addEventListener("click", deleteVersion);
    document.getElementById("removeVersionImage").addEventListener("click", removeImage);

    //Close modal
    const modal = document.getElementById("versionEditModal");
    window.onclick = (event) => {
        if (event.target == modal) {
            closeEditModal();
        }
    }
}

  async function removeImage() {
    const versionId = currentEditingVersion;
    if (!versionId) return;

    try {
        const result = await window.api.removeVersionImage(versionId);
        if (result.success) {
            // Update UI: Hide preview, update sidebar logo
            document.getElementById("versionImagePreview").src = "";
            document.getElementById("versionImagePreview").style.display = "none";

            const versionButton = document.querySelector(`.version-button[data-version="${versionId}"]`);
            if (versionButton) {
               await updateVersionLogo(versionButton, versionId);
            }

            showStatus("Version image removed.");
        } else {
            showStatus(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error("Error removing version image:", error);
        showStatus(`Error: ${error.message}`);
    }
}


// --- Event Listeners for Input Changes ---
document.getElementById('downloadURLInput').addEventListener('change', saveCurrentSettings);
document.getElementById('minecraftURLInput').addEventListener('change', saveCurrentSettings);
document.getElementById('minMemory').addEventListener('change', saveCurrentSettings);
document.getElementById('maxMemory').addEventListener('change', saveCurrentSettings);
//USERNAME SAVE
document.getElementById('username').addEventListener('blur', saveCurrentSettings);


// --- Modify Launch to Use Loaded Settings ---
async function launch() {
    const username = document.getElementById("username").value;
    let versionId = null;
    if (selectedVersionButton) {
        versionId = selectedVersionButton.dataset.version;
    }

    if (!versionId) {
        showStatus("Please select a version.");
        return;
    }
    if (!username) {
        showStatus("Please enter a username.");
        return;
    }
    //Get the memory from the inputs
    const minMemory = document.getElementById("minMemory").value;
    const maxMemory = document.getElementById("maxMemory").value;


    showStatus("Launching game...");

    try {
        const result = await window.api.launchGame({
            username,
            versionId,
            minMemory, //Use the inputs
            maxMemory, //Use the inputs
        });
        if (result.success) {
            showStatus("Game running!");
        } else {
            showStatus(`Error: ${result.error}`);
        }
    } catch (error) {
        showStatus(`Error: ${error.message}`);
    }
}
// --- Modify Update Mods ---
async function updateMods() {
    //Get the URL
    const downloadURL = document.getElementById("downloadURLInput").value;
    if (!downloadURL) {
        showStatus("Please enter a download URL.");
        return;
    }
    showStatus("Updating mods...");
    try {
        const result = await window.api.updateMods(downloadURL);  //Pass URL to ipc
        if (result.success) {
            showStatus("Mods updated successfully!");
        } else {
            showStatus(`Error updating mods: ${result.error}`);
        }
    } catch (error) {
        showStatus(`Error: ${error.message}`);
    }
}
// --- Modify Update Minecraft ---
async function updateMinecraft() {
    //Get the URL
    const downloadURL = document.getElementById("minecraftURLInput").value;
    if (!downloadURL) {
        showStatus("Please enter a download URL.");
        return;
    }
    showStatus("Updating .minecraft...");
    try {
        const result = await window.api.updateMinecraft(downloadURL); //Pass URL to ipc
        if (result.success) {
            showStatus(".minecraft folder updated!");
            loadInitialUI();
        } else {
            showStatus(`Error: ${result.error}`);
        }
    } catch (error) {
        showStatus(`Error: ${error.message}`);
    }
}
// --- Initialization (Modified) ---

setupPlayControls();
await loadSettings(); // Load settings on startup
loadInitialUI();
setupEditModal();


// --- Expose functions to the window ---

window.launch = launch;
window.updateMods = updateMods;
window.updateMinecraft = updateMinecraft;

function setupPlayControls() {
    const usernameInput = document.getElementById("username")

    usernameInput.addEventListener("keydown", (event) => { //Keep this
        if (event.key === "Enter") {
            launch()
        }
    })
}

// Handle image uploads
document.getElementById('versionImage').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('versionImagePreview').src = e.target.result;
            document.getElementById('versionImagePreview').style.display = 'block'; // Show preview
        };
        reader.readAsDataURL(file);
    }
});
});