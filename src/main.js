// --- FILE: main.js ---
const { app, BrowserWindow, screen } = require("electron"); // Import 'screen'
const path = require("path");
const { setupIpcHandlers } = require("./ipcHandlers");
const { ensureAssets } = require("./assetManager");
const { getCustomMinecraftPath } = require('./config');
const { getWindowState, setWindowState } = require('./storage'); // Import window state functions
const { initializeMinecraftFolder } = require('./minecraftInitializer'); // Import minecraft initializer


let mainWindow;

async function createWindow() { //  Make createWindow async

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
        icon: path.join(__dirname, "../assets/pig-logo.png"),
        backgroundColor: "#300a24",
        show: false  // Create window hidden
    });

    mainWindow.loadFile("index.html");
    console.log("Minecraft Path:", getCustomMinecraftPath());

      // Show window when ready-to-show, prevents visual flash
    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
    });


    // Save window state on resize, move, and close.
    mainWindow.on('resize', () => {
        const { width, height, x, y } = mainWindow.getBounds();
        setWindowState({ width, height, x, y });
    });

    mainWindow.on('move', () => {
      const { width, height, x, y } = mainWindow.getBounds();
        setWindowState({ width, height, x, y });
    });

    mainWindow.on('closed', () => {
        mainWindow = null; // Dereference the window object
    });
    ensureAssets(); // Call the asset manager
}


app.whenReady().then(async () => {
    // Initialize the Minecraft folder with default files
    const minecraftPath = getCustomMinecraftPath();
    await initializeMinecraftFolder(minecraftPath);
    
    createWindow();
    setupIpcHandlers(); // Set up IPC handlers

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});