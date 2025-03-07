// --- FILE: src/ipcHandlers.js ---
const { ipcMain, shell } = require('electron');
const { detectInstalledVersions, downloadVersion, fetchVersionManifest } = require('./versions');
const { launchMinecraft } = require('./launcher');
const { downloadAndExtract } = require('./downloader');
const fs = require('fs');
const path = require('path');
const { getCustomMinecraftPath } = require('./config');
const { getSettings, setSettings } = require('./storage');

function setupIpcHandlers() {
    // --- Get and set all settings ---
    ipcMain.handle('get-settings', async () => {
        return await getSettings();
    });

    ipcMain.handle('set-settings', async (event, settings) => {
        await setSettings(settings);
    });

    // --- Existing handlers ---
    ipcMain.handle("update-mods", async (event, downloadURL) => {
        try {
            const modsFolder = path.join(getCustomMinecraftPath(), "mods");
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
            const result = await downloadAndExtract(downloadURL, getCustomMinecraftPath());
            return result;
        } catch (error) {
            console.error("Error in updateMinecraft:", error);
            return { success: false, error: error.message || error };
        }
    });

   ipcMain.handle("launch-game", async (event, options) => {
        try {
            await launchMinecraft(options, getCustomMinecraftPath());
            return { success: true };
        } catch (error) {
            console.error("Error launching game:", error);
            return { success: false, error: error.message || error };
        }
    });

    ipcMain.handle("get-app-path", () => {
        return path.join(__dirname, "src");
    });

    ipcMain.handle("get-versions", async () => {
        return await detectInstalledVersions(getCustomMinecraftPath());
    });

    ipcMain.handle("get-minecraft-path", () => {
        return getCustomMinecraftPath();
    });

    ipcMain.handle("is-forge-version", async (event, versionId) => {
        return false; //Not used
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

    // --- Version name handlers ---
    ipcMain.handle("get-version-name", async (event, versionId) => {
        const versionPath = path.join(getCustomMinecraftPath(), "versions", versionId);
        const nameFilePath = path.join(versionPath, "version-name.txt");
        try {
            if (fs.existsSync(nameFilePath)) {
                const name = await fs.promises.readFile(nameFilePath, "utf-8");
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
        const versionPath = path.join(getCustomMinecraftPath(), "versions", versionId);
        const nameFilePath = path.join(versionPath, "version-name.txt");
        try {
            if (!fs.existsSync(versionPath)) {
                await fs.promises.mkdir(versionPath, { recursive: true });
            }
            await fs.promises.writeFile(nameFilePath, newName, "utf-8");
            return { success: true };
        } catch (error) {
            console.error("Error saving version name:", error);
            return { success: false, error: error.message };
        }
    });

    // --- Version image handlers ---
    ipcMain.handle("set-version-image", async (event, versionId, imageDataURL) => {
        const versionPath = path.join(getCustomMinecraftPath(), "versions", versionId);
        const versionAssetsPath = path.join(getCustomMinecraftPath(), "assets", "versions");

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
                        await fs.promises.unlink(existingImagePath);
                        console.log(`Deleted existing image: ${existingImagePath}`);
                    } catch (deleteError) {
                        console.error(`Error deleting existing image ${existingImagePath}:`, deleteError);
                    }
                }
            }

            // 2. Determine if it's a data URL or a file path
            if (imageDataURL.startsWith('data:')) {
                // Data URL: Process as before
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
                const base64Data = imageDataURL.replace(/^data:image\/(png|jpeg|gif);base64,/, "");
                const imageBuffer = Buffer.from(base64Data, 'base64');
                await fs.promises.writeFile(imagePath, imageBuffer);

            } else if (imageDataURL.startsWith('file:///')) {
                // File Path: Copy the file
                const originalFilePath = decodeURI(imageDataURL.substring(8));
                const fileExtension = path.extname(originalFilePath).toLowerCase();
                const imagePath = path.join(versionPath, `version-image${fileExtension}`);

                // Copy the file
                try {
                    await fs.promises.copyFile(originalFilePath, imagePath);
                    console.log(`Copied image from ${originalFilePath} to ${imagePath}`);
                } catch (copyError) {
                    console.error(`Error copying image from ${originalFilePath} to ${imagePath}:`, copyError);
                    return { success: false, error: `Error copying image: ${copyError.message}` };
                }
            } else {
                return { success: false, error: 'Invalid image data provided.' };
            }

            return { success: true };

        } catch (error) {
            console.error("Error saving version image:", error);
            return { success: false, error: error.message };
        }
    });

     ipcMain.handle("get-version-image", async (event, versionId) => {
        const versionPath = path.join(getCustomMinecraftPath(), "versions", versionId);
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif']; // Check all extensions

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
        const versionPath = path.join(getCustomMinecraftPath(), "versions", versionId);
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif'];

        try {
            for (const ext of imageExtensions) {
                const imagePath = path.join(versionPath, `version-image${ext}`);
                if (fs.existsSync(imagePath)) {
                    await fs.promises.unlink(imagePath);
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
        const versionPath = path.join(getCustomMinecraftPath(), "versions", versionId);
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

    ipcMain.handle('get-default-version-images', async () => {
        const defaultImagesDir = path.join(__dirname, '../assets', 'versions');
        console.log("Attempting to read default images from:", defaultImagesDir);

        try {
            const files = await fs.promises.readdir(defaultImagesDir);
            console.log("Files found (raw):", files);

            const imageFiles = files.filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file));
            console.log("Image files found (filtered):", imageFiles);

            const imagePaths = imageFiles.map(file => {
                const absolutePath = path.join(defaultImagesDir, file);
                console.log("  - Absolute path:", absolutePath);
                const fileURI = 'file://' + path.normalize(absolutePath).replace(/\\/g, '/');
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

    // New handler for downloading a version
    ipcMain.handle('download-version', async (event, versionNumber) => {
      console.log("Received request to download version:", versionNumber);
      return await downloadVersion(versionNumber);
    });

    //Get version manifest
    ipcMain.handle('get-version-manifest', async () => {
      const manifest = await fetchVersionManifest();
      return manifest;
    });
}

module.exports = { setupIpcHandlers };