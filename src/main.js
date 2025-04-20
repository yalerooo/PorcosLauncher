// --- FILE: main.js ---
const { app, BrowserWindow, screen } = require("electron"); // Import 'screen'
const path = require("path");
const { setupIpcHandlers } = require("./ipcHandlers");
const { ensureAssets } = require("./assetManager");
const { getCustomMinecraftPath, getInstanceMinecraftPath, getActiveInstance, copyJavaRuntime, copyRuntimeFolders, getPorcoslandPath } = require('./config');
const fs = require('fs');
const { getWindowState, setWindowState } = require('./storage'); // Import window state functions
const { initializeMinecraftFolder } = require('./minecraftInitializer'); // Import minecraft initializer
const { listInstances, createInstance } = require('./instances'); // Import instances functions
const { checkForUpdates, showUpdateDialog } = require('./updater'); // Import updater functions
const { checkJavaVersion, showJavaRequirementDialog } = require('./javaChecker'); // Import Java checker functions


let mainWindow;

async function createWindow() { //  Make createWindow async
    // Importar el módulo downloader para establecer la referencia a la ventana principal
    const { setMainWindow } = require('./downloader');
    
    // Get saved window state (or defaults)
    const savedWindowState = await getWindowState();

    // Get primary display dimensions
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    // Default width and height (70% of screen)
    let defaultWidth = Math.round(screenWidth * 0.7);
    let defaultHeight = Math.round(screenHeight * 0.7);


    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: savedWindowState.width || defaultWidth,
        height: savedWindowState.height || defaultHeight,
        x: savedWindowState.x,  // Might be undefined, which is OK
        y: savedWindowState.y,  // Might be undefined, which is OK
        minWidth: 600,
        minHeight: 500,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
        },
        frame: false,
        autoHideMenuBar: true,
        icon: path.join(__dirname, "../assets/pig-logo.png"),
        backgroundColor: "#300a24",
        show: false  // Create window hidden
    });

    mainWindow.loadFile("index.html");
    
    // Establecer la referencia a la ventana principal en el módulo downloader
    setMainWindow(mainWindow);
    
    // Inicializar la instancia activa o la carpeta .minecraft por defecto
    const activeInstance = getActiveInstance();
    const minecraftPath = activeInstance ? getInstanceMinecraftPath(activeInstance) : getCustomMinecraftPath();
    console.log("Minecraft Path:", minecraftPath);
    
    // Setup IPC handlers with mainWindow reference
    setupIpcHandlers(mainWindow);

    // Show window when ready-to-show, prevents visual flash
    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
        
        // Verificar Java DESPUÉS de que la ventana sea visible
        setTimeout(async () => {
            await initializeJavaRuntime(mainWindow);
        }, 1000); // Esperar 1 segundo para asegurar que la interfaz se haya cargado
    });

    // Save window state and clear active instance when closing
    mainWindow.on('close', async () => {
        const bounds = mainWindow.getBounds();
        await setWindowState(bounds);
        // Clear active instance when closing the application
        const { setActiveInstance } = require('./config');
        setActiveInstance(null);
    });

    // Ensure assets are available
    await ensureAssets();

    // Initialize Minecraft folder
    await initializeMinecraftFolder(minecraftPath);
    
    // Inicializar instancias
    await initializeInstances();
    
    return mainWindow;
}

// Nueva función para inicializar el runtime de Java
async function initializeJavaRuntime(mainWindow) {
    try {
        // Primero, asegurarse de que existe la carpeta .porcosLauncher
        const porcoslandPath = getPorcoslandPath();
        if (!fs.existsSync(porcoslandPath)) {
            fs.mkdirSync(porcoslandPath, { recursive: true });
            console.log(`Carpeta ${porcoslandPath} creada correctamente`);
        }
        
        // Verificar Java incluido en .porcosLauncher/runtime/jdk-24
        console.log('Verificando Java incluido en .porcosLauncher...');
        const javaInfo = await checkJavaVersion();
        console.log(`Usando Java incluido. Versión: ${javaInfo.version}`);
    } catch (error) {
        console.error('Error al verificar Java incluido:', error);
    }
}

async function initializeInstances() {
    try {
        // Verificar si hay instancias existentes
        const instances = await listInstances();
        
        // Si no hay instancias, crear una por defecto
        if (instances.length === 0) {
            await createInstance('Default');
        }
    } catch (error) {
        console.error('Error initializing instances:', error);
    }
}

app.whenReady().then(async () => {
    // Verificar carpeta de miniaturas
    try {
        const { generateThumbnails } = require('./thumbnailGenerator');
        await generateThumbnails();
        console.log('Carpeta de miniaturas verificada correctamente');
    } catch (error) {
        console.error('Error al verificar carpeta de miniaturas:', error);
    }
    
    await createWindow();

    // Verificar actualizaciones al iniciar
    try {
        const currentVersion = app.getVersion();
        console.log(`Versión actual del launcher: ${currentVersion}`);
        
        const updateInfo = await checkForUpdates(currentVersion);
        if (updateInfo.hasUpdate) {
            console.log(`Nueva versión disponible: ${updateInfo.latestVersion}`);
            showUpdateDialog(mainWindow, updateInfo);
        } else {
            console.log('El launcher está actualizado');
        }
    } catch (error) {
        console.error('Error al verificar actualizaciones:', error);
    }

    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") app.quit();
});