const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    launchGame: (options) => ipcRenderer.invoke('launch-game', options),
    getVersions: () => ipcRenderer.invoke('get-versions'),
    getMinecraftPath: () => ipcRenderer.invoke('get-minecraft-path'),
    isForgeVersion: (versionId) => ipcRenderer.invoke('is-forge-version', versionId), // Ya existe
    updateMods: (downloadURL) => ipcRenderer.invoke('update-mods', downloadURL), // Recibe solo la URL
});