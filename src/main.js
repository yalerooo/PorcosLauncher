// --- FILE: main.js ---
const { app, BrowserWindow } = require("electron");
const path = require("path");
const { setupIpcHandlers } = require("./ipcHandlers");
const { ensureAssets } = require("./assetManager");
const { getCustomMinecraftPath } = require('./config');


let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 600,
        minWidth: 600,
        minHeight: 500,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path.join(__dirname, "../assets/pig-logo.png"),
        backgroundColor: "#300a24"
    });

    mainWindow.loadFile("index.html");
    console.log("Minecraft Path:", getCustomMinecraftPath());
    ensureAssets(); // Call the asset manager
}


app.whenReady().then(() => {
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