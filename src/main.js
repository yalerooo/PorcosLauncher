// --- FILE: main.js ---
const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path"); // Make sure path is imported
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
    const assetsDir = path.join(app.getAppPath(), "assets");
    const versionsAssetsDir = path.join(assetsDir, "versions"); // Subdirectory for version images

    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }
    if (!fs.existsSync(versionsAssetsDir)) {
        fs.mkdirSync(versionsAssetsDir, { recursive: true });
    }

    // Create background.png if it doesn't exist
    const backgroundPath = path.join(assetsDir, "background.png");
    if (!fs.existsSync(backgroundPath)) {
        // Create a simple dark purple background
        const { createCanvas } = require("canvas");
        const canvas = createCanvas(1920, 1080);
        const ctx = canvas.getContext("2d");

        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, 1920, 1080);
        gradient.addColorStop(0, "#300a24");
        gradient.addColorStop(1, "#4a1942");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1920, 1080);

        // Add some texture
        ctx.globalAlpha = 0.05;
        for (let i = 0; i < 1000; i++) {
            const x = Math.random() * 1920;
            const y = Math.random() * 1080;
            const radius = Math.random() * 2;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
        }

        // Save the background
        const buffer = canvas.toBuffer("image/png");
        fs.writeFileSync(backgroundPath, buffer);
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
    // Copy default version images (if you have any)
    const defaultVersionImages = [
        "default1.png",
        "default2.png",
        "default3.jpg",
        "logo.jpg" // Example default images.  Add your filenames here.
    ];
    defaultVersionImages.forEach(imageName => {
        const srcPath = path.join(__dirname, "../assets/versions", imageName); // Assuming they are in project assets
        const destPath = path.join(versionsAssetsDir, imageName);
        if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
            fs.copyFileSync(srcPath, destPath);
        }
    });
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

// --- Version image handlers ---

ipcMain.handle("set-version-image", async (event, versionId, imageDataURL) => {
    const versionPath = path.join(customMinecraftPath, "versions", versionId);

    try {
        if (!fs.existsSync(versionPath)) {
            fs.mkdirSync(versionPath, { recursive: true });
        }

        // 1. ***DELETE ANY EXISTING IMAGE FILES***
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif'];
        for (const ext of imageExtensions) {
            const existingImagePath = path.join(versionPath, `version-image${ext}`);
            if (fs.existsSync(existingImagePath)) {
                try {
                    await fs.promises.unlink(existingImagePath); // Asynchronously delete
                    console.log(`Deleted existing image: ${existingImagePath}`);
                } catch (deleteError) {
                    console.error(`Error deleting existing image ${existingImagePath}:`, deleteError);
                    //  Decide:  Do you want to STOP if deletion fails?  Probably not.
                    // return { success: false, error: `Failed to delete existing image: ${deleteError.message}` };
                }
            }
        }


        // 2. Determine MIME type and extension
        let mimeType;
        let fileExtension;

        if (imageDataURL.startsWith('data:image/jpeg')) {
            mimeType = 'image/jpeg';
            fileExtension = '.jpg';
        } else if (imageDataURL.startsWith('data:image/png')) {
            mimeType = 'image/png';
            fileExtension = '.png';
        } else if (imageDataURL.startsWith('data:image/gif')) {
            mimeType = 'image/gif';
            fileExtension = '.gif';
        } else {
            return { success: false, error: 'Unsupported image format.' };
        }

        const imagePath = path.join(versionPath, `version-image${fileExtension}`);


        // 3. Convert data URL to buffer and save
        const base64Data = imageDataURL.replace(/^data:image\/(png|jpeg|gif);base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');

        await fs.promises.writeFile(imagePath, imageBuffer);
        return { success: true };

    } catch (error) {
        console.error("Error saving version image:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle("get-version-image", async (event, versionId) => {
    const versionPath = path.join(customMinecraftPath, "versions", versionId);
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif']; // Include .jpeg

    try {
        for (const ext of imageExtensions) {
            const imagePath = path.join(versionPath, `version-image${ext}`);
            if (fs.existsSync(imagePath)) {
                const data = await fs.promises.readFile(imagePath);
                const base64Image = data.toString('base64');
                const mimeType = `image/${ext.substring(1)}`; // Correct MIME type
                const dataURL = `data:${mimeType};base64,${base64Image}`;
                return dataURL;
            }
        }
        return null;

    } catch (error) {
        console.error("Error reading version image:", error);
        return null;
    }
});

ipcMain.handle("remove-version-image", async (event, versionId) => {
    const versionPath = path.join(customMinecraftPath, "versions", versionId);
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif'];

    try {
        for (const ext of imageExtensions) {
            const imagePath = path.join(versionPath, `version-image${ext}`);
            if (fs.existsSync(imagePath)) {
                await fs.promises.unlink(imagePath); // Asynchronously delete the file
            }
        }
        return { success: true };
    } catch (error) {
        console.error("Error removing version image:", error);
        return { success: false, error: error.message };
    }
});

// --- Delete version handler ---
ipcMain.handle("delete-version", async (event, versionId) => {
    const versionPath = path.join(customMinecraftPath, "versions", versionId);
    try {
        if (fs.existsSync(versionPath)) {
            await fs.promises.rm(versionPath, { recursive: true, force: true });
            return { success: true };
        } else {
            return { success: false, error: "Version folder not found." };
        }
    } catch (error) {
        console.error("Error deleting version:", error);
        return { success: false, error: error.message };
    }
});

// --- FILE: main.js ---

// --- FILE: main.js ---

ipcMain.handle('get-default-version-images', async () => {
    // Use __dirname (directory of main.js) + path.resolve + path.join
    const defaultImagesDir = path.join(__dirname, '../assets', 'versions'); // Corrected path
    console.log("Attempting to read default images from:", defaultImagesDir);

    try {
        const files = await fs.promises.readdir(defaultImagesDir);
        console.log("Files found (raw):", files);

        const imageFiles = files.filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file));
        console.log("Image files found (filtered):", imageFiles);

        const imagePaths = imageFiles.map(file => {
            const absolutePath = path.join(defaultImagesDir, file);
            console.log("  - Absolute path:", absolutePath);
            // Convert to file:// URI (REQUIRED for security in Electron)
            const fileURI = 'file://' + path.normalize(absolutePath).replace(/\\/g, '/'); // Add file://
            console.log("    - file:// URI:", fileURI);

            return fileURI;
        });
        console.log("Returning image paths:", imagePaths);
        return imagePaths;

    } catch (error) {
        console.error('Error reading default version images:', error);
        return [];
    }
});