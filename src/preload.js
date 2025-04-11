// --- FILE: preload.js ---
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Window control functions
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    onWindowStateChange: (callback) => ipcRenderer.on('window-state-change', callback),
    launchGame: (options) => ipcRenderer.invoke('launch-game', options),
    getVersions: (instanceId) => ipcRenderer.invoke('get-versions', instanceId),
    getMinecraftPath: (instanceId) => ipcRenderer.invoke('get-minecraft-path', instanceId),
    isForgeVersion: (versionId) => ipcRenderer.invoke('is-forge-version', versionId),

    updateMinecraft: (downloadURL, instanceId) => ipcRenderer.invoke('update-minecraft', downloadURL, instanceId),
    updateMods: (downloadURL, instanceId) => ipcRenderer.invoke('update-mods', downloadURL, instanceId),
    openMinecraftFolder: (instanceId) => ipcRenderer.invoke('open-minecraft-folder', instanceId),
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
    getVersionName: (versionId, instanceId) => ipcRenderer.invoke('get-version-name', versionId, instanceId),
    setVersionName: (versionId, name, instanceId) => ipcRenderer.invoke('set-version-name', versionId, name, instanceId),
    getVersionManifest: () => ipcRenderer.invoke('get-version-manifest'),
    getVersionImage: (versionId, instanceId) => ipcRenderer.invoke('get-version-image', versionId, instanceId),
    setVersionImage: (versionId, imageDataURL, instanceId) => ipcRenderer.invoke('set-version-image', versionId, imageDataURL, instanceId),
    getVersionBackground: (versionId, instanceId) => ipcRenderer.invoke('get-version-background', versionId, instanceId),
    setVersionBackground: (versionId, imageDataURL, instanceId) => ipcRenderer.invoke('set-version-background', versionId, imageDataURL, instanceId),
    deleteVersion: (versionId, instanceId) => ipcRenderer.invoke('delete-version', versionId, instanceId),
    getDefaultVersionImages: () => ipcRenderer.invoke('get-default-version-images'),
    getDefaultBackgroundImages: () => ipcRenderer.invoke('get-default-background-images'),
    removeVersionImage: (versionId, instanceId) => ipcRenderer.invoke('remove-version-image', versionId, instanceId),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    setSettings: (settings) => ipcRenderer.invoke('set-settings', settings),
    downloadVersion: (versionNumber, instanceId) => ipcRenderer.invoke('download-version', versionNumber, instanceId),
    
    // Nuevas funciones para instancias
    listInstances: () => ipcRenderer.invoke('list-instances'),
    createInstance: (name) => ipcRenderer.invoke('create-instance', name),
    updateInstance: (instanceId, config) => ipcRenderer.invoke('update-instance', instanceId, config),
    deleteInstance: (instanceId) => ipcRenderer.invoke('delete-instance', instanceId),
    getActiveInstance: () => ipcRenderer.invoke('get-active-instance'),
    setActiveInstance: (instanceId) => ipcRenderer.invoke('set-active-instance', instanceId),
    
    // Add new method for instance icons
    getInstanceIcon: (iconPath) => ipcRenderer.invoke('get-instance-icon', iconPath),
    
    // Modpack functions
    fetchModpacks: () => ipcRenderer.invoke('fetch-modpacks'),
    installModpack: (modpackId, instanceName) => ipcRenderer.invoke('install-modpack', modpackId, instanceName),
    checkModpackUpdates: () => ipcRenderer.invoke('check-modpack-updates'),
    updateModpack: (instanceId, modpackId) => ipcRenderer.invoke('update-modpack', instanceId, modpackId),
    uninstallModpack: (instanceId) => ipcRenderer.invoke('uninstall-modpack', instanceId),
    
    // Progress event handlers
    onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
    offDownloadProgress: (callback) => ipcRenderer.removeListener('download-progress', callback),
    
    // Console output handlers
    onConsoleOutput: (callback) => ipcRenderer.on('console-output', callback),
    offConsoleOutput: (callback) => ipcRenderer.removeListener('console-output', callback),
    
    // Update handlers
    onShowUpdateProgress: (callback) => ipcRenderer.on('show-update-progress', callback),
    onUpdateDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', callback),
    onUpdateDownloadError: (callback) => ipcRenderer.on('update-download-error', callback),
    
    // Modpack event handlers
    onModpackInstallProgress: (callback) => ipcRenderer.on('modpack-install-progress', callback),
    offModpackInstallProgress: (callback) => ipcRenderer.removeListener('modpack-install-progress', callback),
    onModpackUpdateProgress: (callback) => ipcRenderer.on('modpack-update-progress', callback),
    offModpackUpdateProgress: (callback) => ipcRenderer.removeListener('modpack-update-progress', callback),
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    checkJavaVersion: () => ipcRenderer.invoke('check-java-version')
});