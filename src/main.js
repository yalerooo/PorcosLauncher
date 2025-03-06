const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { detectInstalledVersions, getMinecraftPath } = require('./versions');
const { launchMinecraft } = require('./launcher'); // Importar launchMinecraft


let mainWindow;

// Manejador IPC para obtener versiones
ipcMain.handle('get-versions', async () => { // Usa async aquí
    return await detectInstalledVersions(); // y await aquí
});

//Manejador para obtener la ruta
ipcMain.handle('get-minecraft-path', () => {
   return getMinecraftPath()
})

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Debug de la ruta (opcional, pero útil)
    console.log('Ruta Minecraft:', getMinecraftPath());

    // Cargar la interfaz
    mainWindow.loadFile('index.html');
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

// Manejador del lanzamiento
ipcMain.handle('launch-game', async (event, options) => { // Usa async
    try {
        await launchMinecraft(options); // Usa await
        return { success: true }; // Indica éxito
    } catch (error) {
        console.error("Error al lanzar el juego:", error);
        return { success: false, error: error.message || error }; // Devuelve el error
    }
});