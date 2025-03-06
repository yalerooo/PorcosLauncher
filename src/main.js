const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { detectInstalledVersions, isForgeVersion } = require('./versions');
const { launchMinecraft } = require('./launcher');
const { downloadAndExtract } = require('./downloader'); // Ya lo tenemos importado


let mainWindow;
let customMinecraftPath;

function getLauncherBasePath() {
    return path.join(app.getPath('appData'), '.porcosLauncher');
}

function getCustomMinecraftPath() {
    return path.join(getLauncherBasePath(), '.minecraft');
}

ipcMain.handle('get-versions', async () => {
    return await detectInstalledVersions(customMinecraftPath);
});

ipcMain.handle('get-minecraft-path', () => {
    return customMinecraftPath;
});

ipcMain.handle('is-forge-version', async (event, versionId) => {
    return isForgeVersion(versionId, customMinecraftPath);
});

ipcMain.handle('update-mods', async (event, downloadURL) => {
    try {
        const modsFolder = path.join(customMinecraftPath, 'mods');

        // 1. Crear la carpeta 'mods' si no existe
        if (!fs.existsSync(modsFolder)) {
            fs.mkdirSync(modsFolder, { recursive: true });
        }

        // 2. Eliminar mods existentes
        const files = fs.readdirSync(modsFolder);
        for (const file of files) {
            const filePath = path.join(modsFolder, file);
            if (fs.statSync(filePath).isFile()) {
               fs.unlinkSync(filePath);
            }
        }

        // 3. Descargar y extraer
        const result = await downloadAndExtract(downloadURL, modsFolder);
        return result;

    } catch (error) {
        console.error("Error general en updateMods:", error);
        return { success: false, error: error.message || error };
    }
});

// Nuevo manejador para updateMinecraft
ipcMain.handle('update-minecraft', async (event, downloadURL) => {
  try {
    // 1. Descargar y extraer directamente a .minecraft
    const result = await downloadAndExtract(downloadURL, customMinecraftPath);
    return result;

  } catch (error) {
    console.error("Error en updateMinecraft:", error);
    return { success: false, error: error.message || error };
  }
});



function createWindow() {
    customMinecraftPath = getCustomMinecraftPath();
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    console.log('Ruta Minecraft:', customMinecraftPath);

    mainWindow.loadFile('index.html');

    const launcherDir = getLauncherBasePath();
    const minecraftDir = customMinecraftPath;
    if (!fs.existsSync(launcherDir)) {
        fs.mkdirSync(launcherDir, { recursive: true });
    }
    if (!fs.existsSync(minecraftDir)) {
        fs.mkdirSync(minecraftDir, { recursive: true });
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.handle('launch-game', async (event, options) => {
    try {
        await launchMinecraft(options, customMinecraftPath);
        return { success: true };
    } catch (error) {
        console.error("Error al lanzar el juego:", error);
        return { success: false, error: error.message || error };
    }
});