document.addEventListener("DOMContentLoaded", async () => {
    let selectedVersionButton = null
  
    function showSection(sectionId) {
      document.querySelectorAll(".content-section").forEach((section) => {
        section.classList.remove("active")
        section.style.display = "none"
      })
  
      const section = document.getElementById(sectionId)
      if (section) {
        section.classList.add("active")
        section.style.display = "block"
      }
  
      const appTitle = document.getElementById("app-title")
      const versionInfoHeader = document.getElementById("version-info-header")
      const versionNameInput = document.getElementById("version-name-input")
  
      // Reset all relevant UI elements
      versionNameInput.style.display = "none"
      appTitle.style.display = "inline" // Ensure appTitle is visible
  
      if (sectionId === "home") {
        appTitle.textContent = "Porcos Launcher"
        versionInfoHeader.textContent = ""
      } else if (sectionId === "version-details") {
        // version-details ahora solo muestra la interfaz de juego
        if (selectedVersionButton) {
          const versionId = selectedVersionButton.dataset.version
          versionInfoHeader.textContent = `Version: ${versionId}`
          document.getElementById("username").value = "" // Clear username field
        }
      } else if (sectionId === "settings") {
        appTitle.textContent = "Settings"
        versionInfoHeader.textContent = ""
      }
    }
  
    async function loadVersionName(versionId) {
      try {
        const storedName = await window.api.getVersionName(versionId)
        const appTitle = document.getElementById("app-title")
  
        // Ya no actualizamos el version-id porque lo hemos eliminado
        // Solo actualizamos el título en la barra superior
        appTitle.textContent = storedName || "Installation Name"
        appTitle.dataset.versionId = versionId // Store on the title
  
        if (selectedVersionButton) {
          selectedVersionButton.title = storedName || "Installation Name"
        }
      } catch (error) {
        console.error("Error loading version name:", error)
        showStatus("Error loading version name.")
      }
    }
  
    async function saveVersionName(versionId, newName) {
      try {
        await window.api.setVersionName(versionId, newName)
        const appTitle = document.getElementById("app-title")
        appTitle.textContent = newName // Update top-bar title
  
        if (selectedVersionButton) {
          selectedVersionButton.title = newName
        }
      } catch (error) {
        console.error("Error saving version name:", error)
        showStatus("Error saving version name.")
      }
    }
  
    // Click-to-edit handler
    function setupNameEditing() {
      const appTitle = document.getElementById("app-title")
      const nameInput = document.getElementById("version-name-input")
  
      appTitle.addEventListener("click", () => {
        // Only allow editing when in version details
        if (document.getElementById("version-details").classList.contains("active")) {
          nameInput.value = appTitle.textContent
          appTitle.style.display = "none"
          nameInput.style.display = "inline-block"
          nameInput.focus()
        }
      })
  
      nameInput.addEventListener("blur", async () => {
        const newName = nameInput.value.trim()
        if (newName && newName !== appTitle.textContent) {
          await saveVersionName(appTitle.dataset.versionId, newName)
        }
        nameInput.style.display = "none"
        appTitle.style.display = "inline"
      })
  
      nameInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          nameInput.blur() // Trigger blur to save
        }
      })
    }
  
    document.querySelector(".sidebar").addEventListener("click", async (event) => {
      const versionButton = event.target.closest(".version-button")
      if (versionButton) {
        if (selectedVersionButton) {
          selectedVersionButton.querySelector(".version-logo").classList.remove("selected")
        }
        selectedVersionButton = versionButton
        versionButton.querySelector(".version-logo").classList.add("selected")
  
        const versionId = versionButton.dataset.version
        await loadVersionName(versionId) // Load before showing
        showSection("version-details")
      }
    })
  
    const launcherLogo = document.getElementById("launcher-logo")
    if (launcherLogo) {
      launcherLogo.addEventListener("click", () => {
        if (selectedVersionButton) {
          selectedVersionButton.querySelector(".version-logo").classList.remove("selected")
          selectedVersionButton = null
        }
        showSection("home")
      })
    }
  
    document.getElementById("settings-icon").addEventListener("click", () => {
      if (selectedVersionButton) {
        selectedVersionButton.querySelector(".version-logo").classList.remove("selected")
        selectedVersionButton = null
      }
      showSection("settings")
    })
  
    document.getElementById("folder-icon").addEventListener("click", async () => {
      try {
        const minecraftPath = await window.api.getMinecraftPath()
        await window.api.openMinecraftFolder(minecraftPath)
      } catch (error) {
        console.error("Error opening folder:", error)
        showStatus(`Error opening folder: ${error.message}`)
      }
    })
  
    function showStatus(message, duration = 3000) {
      const statusElement = document.getElementById("status")
      statusElement.textContent = message
      statusElement.style.display = "block"
  
      // Add animation
      statusElement.style.animation = "none"
      setTimeout(() => {
        statusElement.style.animation = "slideUp 0.3s ease"
      }, 10)
  
      setTimeout(() => {
        statusElement.style.display = "none"
      }, duration)
    }
  
    async function loadInitialUI() {
      try {
        const versions = await window.api.getVersions()
        const sidebar = document.querySelector(".sidebar")
        sidebar.querySelectorAll(".version-button").forEach((button) => button.remove())
  
        for (const version of versions) {
          const versionButton = document.createElement("div")
          versionButton.classList.add("version-button")
          versionButton.dataset.version = version.id
          versionButton.title = version.name
  
          const versionLogo = document.createElement("div")
          versionLogo.classList.add("version-logo")
          versionButton.appendChild(versionLogo)
          sidebar.appendChild(versionButton)
        }
  
        showSection("home")
        checkForForge()
        document.getElementById("updateMinecraftButton").style.display = "block"
        document.getElementById("minecraftURLInput").style.display = "inline-block"
      } catch (error) {
        console.error("Error loading initial UI:", error)
        showStatus(`Error loading versions: ${error.message}`)
      }
    }
  
    async function launch() {
      const username = document.getElementById("username").value
      let versionId = null
      if (selectedVersionButton) {
        versionId = selectedVersionButton.dataset.version
      }
  
      if (!versionId) {
        showStatus("Please select a version.")
        return
      }
      if (!username) {
        showStatus("Please enter a username.")
        return
      }
      const minMemory = document.getElementById("minMemory").value
      const maxMemory = document.getElementById("maxMemory").value
  
      showStatus("Launching game...")
  
      try {
        const result = await window.api.launchGame({ username, versionId, minMemory, maxMemory })
        if (result.success) {
          showStatus("Game running!")
        } else {
          showStatus(`Error: ${result.error}`)
        }
      } catch (error) {
        showStatus(`Error: ${error.message}`)
      }
    }
  
    async function updateMods() {
      const downloadURL = document.getElementById("downloadURLInput").value
      if (!downloadURL) {
        showStatus("Please enter a download URL.")
        return
      }
      showStatus("Updating mods...")
      try {
        const result = await window.api.updateMods(downloadURL)
        if (result.success) {
          showStatus("Mods updated successfully!")
        } else {
          showStatus(`Error updating mods: ${result.error}`)
        }
      } catch (error) {
        showStatus(`Error: ${error.message}`)
      }
    }
  
    async function updateMinecraft() {
      const downloadURL = document.getElementById("minecraftURLInput").value
      if (!downloadURL) {
        showStatus("Please enter a download URL.")
        return
      }
      showStatus("Updating .minecraft...")
      try {
        const result = await window.api.updateMinecraft(downloadURL)
        if (result.success) {
          showStatus(".minecraft folder updated!")
          loadInitialUI()
        } else {
          showStatus(`Error: ${result.error}`)
        }
      } catch (error) {
        showStatus(`Error: ${error.message}`)
      }
    }
  
    async function checkForForge() {
      const versions = await window.api.getVersions()
      const updateButton = document.getElementById("updateModsButton")
      const downloadURLInput = document.getElementById("downloadURLInput")
      let hasForge = false
  
      for (const version of versions) {
        if (version.isForge) {
          hasForge = true
          break
        }
      }
      if (hasForge) {
        updateButton.style.display = "block"
        downloadURLInput.style.display = "block"
      } else {
        updateButton.style.display = "none"
        downloadURLInput.style.display = "none"
      }
    }
  
    setupNameEditing()
  
    // Add this after setupNameEditing() in your initialization code
    function setupPlayControls() {
      const usernameInput = document.getElementById("username")
  
      usernameInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          launch()
        }
      })
    }
  
    // Then call this function in your initialization
    setupPlayControls()
  
    loadInitialUI()
  
    window.launch = launch
    window.updateMods = updateMods
    window.updateMinecraft = updateMinecraft
  })
  
  