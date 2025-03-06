const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs'); // Importante: Asegúrate de tener fs importado
const { detectInstalledVersions } = require('./versions');
const { launchMinecraft } = require('./launcher');

let mainWindow;
let customMinecraftPath;

// --- Ruta de Roaming Multiplataforma ---
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
  return customMinecraftPath; // Devuelve customMinecraftPath
});

function createWindow() {
    customMinecraftPath = getCustomMinecraftPath();  // Calcula la ruta ANTES de usarla
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

    // --- Creación de carpetas (ahora en getLauncherBasePath()) ---
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
        await launchMinecraft(options, customMinecraftPath); // Pasa customMinecraftPath
        return { success: true };
    } catch (error) {
        console.error("Error al lanzar el juego:", error);
        return { success: false, error: error.message || error };
    }
});