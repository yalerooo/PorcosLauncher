const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    launchGame: (options) => ipcRenderer.invoke('launch-game', options),
    getVersions: () => ipcRenderer.invoke('get-versions'),
    getMinecraftPath: () => ipcRenderer.invoke('get-minecraft-path'),
    isForgeVersion: (versionId) => ipcRenderer.invoke('is-forge-version', versionId),  // No se usa, pero se mantiene
    updateMods: (downloadURL) => ipcRenderer.invoke('update-mods', downloadURL),
    updateMinecraft: (downloadURL) => ipcRenderer.invoke('update-minecraft', downloadURL),
    openMinecraftFolder: (path) => ipcRenderer.invoke('open-minecraft-folder', path),
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
});