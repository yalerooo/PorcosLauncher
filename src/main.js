// --- START OF FILE main.js --- (No substantial changes, just formatting)
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { detectInstalledVersions } = require("./versions");
const { launchMinecraft } = require("./launcher");
const { downloadAndExtract } = require("./downloader");

let mainWindow;
let customMinecraftPath;

function getLauncherBasePath() {
    return path.join(app.getPath("appData"), ".porcosLauncher");
}

function getCustomMinecraftPath() {
    return path.join(getLauncherBasePath(), ".minecraft");
}

// --- IPC Handlers ---
ipcMain.handle("get-versions", async () => {
    return await detectInstalledVersions(customMinecraftPath);
});

ipcMain.handle("get-minecraft-path", () => {
    return customMinecraftPath;
});

ipcMain.handle("is-forge-version", async (event, versionId) => {
     return false; //Not used
});

ipcMain.handle("update-mods", async (event, downloadURL) => {
    try {
        const modsFolder = path.join(customMinecraftPath, "mods");
        if (!fs.existsSync(modsFolder)) {
            fs.mkdirSync(modsFolder, { recursive: true });
        }
        const files = fs.readdirSync(modsFolder);
        for (const file of files) {
            const filePath = path.join(modsFolder, file);
            if (fs.statSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
            }
        }
        const result = await downloadAndExtract(downloadURL, modsFolder);
        return result;
    } catch (error) {
        console.error("Error in updateMods:", error);
        return { success: false, error: error.message || error };
    }
});

ipcMain.handle("update-minecraft", async (event, downloadURL) => {
    try {
        const result = await downloadAndExtract(downloadURL, customMinecraftPath);
        return result;
    } catch (error) {
        console.error("Error in updateMinecraft:", error);
        return { success: false, error: error.message || error };
    }
});

ipcMain.handle("open-minecraft-folder", async (event, minecraftPath) => {
    try {
        shell.openPath(minecraftPath);
        return { success: true };
    } catch (error) {
        console.error("Error opening folder:", error);
        return { success: false, error: error.message };
    }
});

// --- Main window functions ---
function createWindow() {
    customMinecraftPath = getCustomMinecraftPath();
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

    console.log("Minecraft Path:", customMinecraftPath);
    mainWindow.loadFile("index.html");

    const launcherDir = getLauncherBasePath();
    const minecraftDir = customMinecraftPath;
    if (!fs.existsSync(launcherDir)) {
        fs.mkdirSync(launcherDir, { recursive: true });
    }
    if (!fs.existsSync(minecraftDir)) {
        fs.mkdirSync(minecraftDir, { recursive: true });
    }

    // Copy assets if they don't exist
    ensureAssets();
}

function ensureAssets() {
  const assetsDir = path.join(app.getAppPath(), "assets")
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true })
  }

  // Create background.png if it doesn't exist
  const backgroundPath = path.join(assetsDir, "background.png")
  if (!fs.existsSync(backgroundPath)) {
    // Create a simple dark purple background
    const { createCanvas } = require("canvas")
    const canvas = createCanvas(1920, 1080)
    const ctx = canvas.getContext("2d")

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 1920, 1080)
    gradient.addColorStop(0, "#300a24")
    gradient.addColorStop(1, "#4a1942")

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1920, 1080)

    // Add some texture
    ctx.globalAlpha = 0.05
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * 1920
      const y = Math.random() * 1080
      const radius = Math.random() * 2
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = "#ffffff"
      ctx.fill()
    }

    // Save the background
    const buffer = canvas.toBuffer("image/png")
    fs.writeFileSync(backgroundPath, buffer)
  }

  // Create pig-logo.png if it doesn't exist
  const logoPath = path.join(assetsDir, "logo.jpg")
  if (!fs.existsSync(logoPath)) {
    // Copy from a default location or create a simple logo
    const defaultLogo = path.join(__dirname, "../assets/logo.jpg")
    if (fs.existsSync(defaultLogo)) {
      fs.copyFileSync(defaultLogo, logoPath)
    }
  }

  // Create minecraft-pig.png if it doesn't exist
  const pigImagePath = path.join(assetsDir, "pigimage.png")
  if (!fs.existsSync(pigImagePath)) {
    const defaultPig = path.join(__dirname, "../assets/pigimage.png")
    if (fs.existsSync(defaultPig)) {
      fs.copyFileSync(defaultPig, pigImagePath)
    }
  }
}

app.whenReady().then(() => {
    createWindow();
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

ipcMain.handle("launch-game", async (event, options) => {
    try {
        await launchMinecraft(options, customMinecraftPath);
        return { success: true };
    } catch (error) {
        console.error("Error launching game:", error);
        return { success: false, error: error.message || error };
    }
});

ipcMain.handle("get-app-path", () => {  //Not used
    return path.join(__dirname, "src");
});

// --- Version name handlers ---
ipcMain.handle("get-version-name", async (event, versionId) => {
    const versionPath = path.join(customMinecraftPath, "versions", versionId);
    const nameFilePath = path.join(versionPath, "version-name.txt");
    try {
        if (fs.existsSync(nameFilePath)) {
            const name = await fs.promises.readFile(nameFilePath, "utf-8"); // Use fs.promises
            return name.trim();
        } else {
          // Create and set default
          await fs.promises.writeFile(nameFilePath, "Nombre de la instalacion", "utf-8");
          return "Nombre de la instalacion";
        }
    } catch (error) {
        console.error("Error reading/creating version name:", error);
        return "Nombre de la instalacion"; // Return default even on error
    }
});

ipcMain.handle("set-version-name", async (event, versionId, newName) => {
    const versionPath = path.join(customMinecraftPath, "versions", versionId);
    const nameFilePath = path.join(versionPath, "version-name.txt");
    try {
        if (!fs.existsSync(versionPath)) {
            await fs.promises.mkdir(versionPath, { recursive: true }); // Use fs.promises
        }
        await fs.promises.writeFile(nameFilePath, newName, "utf-8"); // Use fs.promises
        return { success: true };
    } catch (error) {
        console.error("Error saving version name:", error);
        return { success: false, error: error.message };
    }
});