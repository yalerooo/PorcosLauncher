// --- FILE: src/ipcHandlers.js ---
const { ipcMain, shell, app } = require('electron');
const { detectInstalledVersions, downloadVersion, fetchVersionManifest } = require('./versions');
const { launchMinecraft } = require('./launcher');
const { liner } = require('tomate-loaders');
const { downloadAndExtract } = require('./downloader');
const fs = require('fs');
const path = require('path');
const { getCustomMinecraftPath, getInstanceMinecraftPath, getActiveInstance, setActiveInstance } = require('./config');
const { getSettings, setSettings } = require('./storage');
const { listInstances, createInstance, updateInstance, deleteInstance } = require('./instances');
const { checkForUpdates, showUpdateDialog, downloadUpdate } = require('./updater');

function setupIpcHandlers(mainWindow) {
    // Window control handlers
    ipcMain.handle('minimize-window', () => {
        if (mainWindow) mainWindow.minimize();
        return true;
    });
    
    ipcMain.handle('maximize-window', () => {
        if (mainWindow) {
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            } else {
                mainWindow.maximize();
            }
        }
        return true;
    });

    // Manejar cambios de estado de la ventana
    mainWindow.on('maximize', () => {
        mainWindow.webContents.send('window-state-change', true);
    });

    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send('window-state-change', false);
    });
    
    ipcMain.handle('close-window', () => {
        if (mainWindow) {
            // Primero cerramos la ventana principal
            mainWindow.close();
            // Luego forzamos el cierre completo de la aplicación
            app.exit(0);
        }
        return true;
    });
    // --- Get and set all settings ---
    ipcMain.handle('get-settings', async () => {
        return await getSettings();
    });

    ipcMain.handle('set-settings', async (event, settings) => {
        await setSettings(settings);
    });

    // --- Instance handlers ---
    ipcMain.handle('list-instances', async () => {
        return await listInstances();
    });

    ipcMain.handle('create-instance', async (event, name) => {
        return await createInstance(name);
    });

    ipcMain.handle('update-instance', async (event, instanceId, config) => {
        return await updateInstance(instanceId, config);
    });

    ipcMain.handle('delete-instance', async (event, instanceId) => {
        return await deleteInstance(instanceId);
    });

    ipcMain.handle('get-active-instance', () => {
        return getActiveInstance();
    });

    ipcMain.handle('set-active-instance', async (event, instanceId) => {
        return setActiveInstance(instanceId);
    });

    // --- Existing handlers ---

    ipcMain.handle("update-minecraft", async (event, downloadURL, instanceId) => {
        try {
            const minecraftPath = instanceId ? getInstanceMinecraftPath(instanceId) : getCustomMinecraftPath();
            
            // Add progress callback to send download progress to renderer
            const progressCallback = (progress) => {
                // Si progress es un número, es el progreso de descarga
                // Si es 'extracting' o 'completed', es el estado de extracción
                event.sender.send('download-progress', { progress });
            };
            
            const result = await downloadAndExtract(downloadURL, minecraftPath, false, null, progressCallback);
            return result;
        } catch (error) {
            console.error("Error in updateMinecraft:", error);
            return { success: false, error: error.message || error };
        }
    });

   ipcMain.handle("launch-game", async (event, options) => {
        try {
            const instanceId = options.instanceId || getActiveInstance();
            const minecraftPath = instanceId ? getInstanceMinecraftPath(instanceId) : getCustomMinecraftPath();
            
            // Configurar captura de mensajes de consola
            const { Client } = require('minecraft-launcher-core');
            const launcher = new Client();
            
            // Configurar listeners para capturar mensajes
            launcher.on('debug', (e) => {
                console.log('[Debug]', e);
                event.sender.send('console-output', { type: 'debug', message: e });
            });
            
            launcher.on('data', liner((line) => {
                console.log('[Minecraft]', line);
                event.sender.send('console-output', { type: 'minecraft', message: line });
            }));
            
            await launchMinecraft(options, minecraftPath, launcher);
            return { success: true };
        } catch (error) {
            console.error("Error launching game:", error);
            return { success: false, error: error.message || error };
        }
    });

    ipcMain.handle("get-app-path", () => {
        return path.join(__dirname, "src");
    });

    ipcMain.handle("get-versions", async (event, instanceId) => {
        const minecraftPath = instanceId ? getInstanceMinecraftPath(instanceId) : getCustomMinecraftPath();
        return await detectInstalledVersions(minecraftPath);
    });

    ipcMain.handle("get-minecraft-path", (event, instanceId) => {
        return instanceId ? getInstanceMinecraftPath(instanceId) : getCustomMinecraftPath();
    });

    ipcMain.handle("is-forge-version", async (event, versionId) => {
        return false; //Not used
    });
    
    ipcMain.handle("open-minecraft-folder", async (event, instanceId) => {
        try {
            const minecraftPath = instanceId ? getInstanceMinecraftPath(instanceId) : getCustomMinecraftPath();
            shell.openPath(minecraftPath);
            return { success: true };
        } catch (error) {
            console.error("Error opening folder:", error);
            return { success: false, error: error.message };
        }
    });

    // --- Version name handlers ---
    ipcMain.handle("get-version-name", async (event, versionId, instanceId) => {
        const minecraftPath = instanceId ? getInstanceMinecraftPath(instanceId) : getCustomMinecraftPath();
        const versionPath = path.join(minecraftPath, "versions", versionId);
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

    ipcMain.handle("set-version-name", async (event, versionId, newName, instanceId) => {
        const minecraftPath = instanceId ? getInstanceMinecraftPath(instanceId) : getCustomMinecraftPath();
        const versionPath = path.join(minecraftPath, "versions", versionId);
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
    ipcMain.handle("set-version-image", async (event, versionId, imageDataURL, instanceId) => {
        const minecraftPath = instanceId ? getInstanceMinecraftPath(instanceId) : getCustomMinecraftPath();
        const versionPath = path.join(minecraftPath, "versions", versionId);
        const versionAssetsPath = path.join(minecraftPath, "assets", "versions");

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

     ipcMain.handle("get-version-image", async (event, versionId, instanceId) => {
        const minecraftPath = instanceId ? getInstanceMinecraftPath(instanceId) : getCustomMinecraftPath();
        const versionPath = path.join(minecraftPath, "versions", versionId);
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif']; // Check all extensions

        try {
            for (const ext of imageExtensions) {
                const imagePath = path.join(versionPath, `version-image${ext}`);
                if (fs.existsSync(imagePath)) {
                    const data = await fs.promises.readFile(imagePath);
                    const base64Image = data.toString('base64');
                    const mimeType = `image/${ext.substring(1)}`;
                    const dataURL = `data:${mimeType};base64,${base64Image}`;
                    return dataURL;
                }
            }
            return null;
        } catch (error) {
            console.error("Error getting version image:", error);
            return null;
        }
    });

    ipcMain.handle("get-version-manifest", async () => {
        try {
            return await fetchVersionManifest();
        } catch (error) {
            console.error("Error fetching version manifest:", error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("download-version", async (event, versionNumber, instanceId) => {
        try {
            const minecraftPath = instanceId ? getInstanceMinecraftPath(instanceId) : getCustomMinecraftPath();
            
            // Create a progress handler that sends updates to the renderer
            const progressHandler = (progress) => {
                event.sender.send('download-progress', { progress });
            };
            
            // Pass the progress handler to downloadVersion
            const result = await downloadVersion(versionNumber, minecraftPath, progressHandler);
            
            return result;
        } catch (error) {
            console.error("Error downloading version:", error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("delete-version", async (event, versionId, instanceId) => {
        try {
            const minecraftPath = instanceId ? getInstanceMinecraftPath(instanceId) : getCustomMinecraftPath();
            const versionPath = path.join(minecraftPath, "versions", versionId);
            
            if (fs.existsSync(versionPath)) {
                await fs.promises.rm(versionPath, { recursive: true, force: true });
                return { success: true };
            } else {
                return { success: false, error: "Version not found" };
            }
        } catch (error) {
            console.error("Error deleting version:", error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("get-version-background", async (event, versionId, instanceId) => {
        const minecraftPath = instanceId ? getInstanceMinecraftPath(instanceId) : getCustomMinecraftPath();
        const versionPath = path.join(minecraftPath, "versions", versionId);
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif']; // Check all extensions

        try {
            for (const ext of imageExtensions) {
                const imagePath = path.join(versionPath, `version-background${ext}`);
                if (fs.existsSync(imagePath)) {
                    const data = await fs.promises.readFile(imagePath);
                    const base64Image = data.toString('base64');
                    const mimeType = `image/${ext.substring(1)}`;
                    const dataURL = `data:${mimeType};base64,${base64Image}`;
                    return dataURL;
                }
            }
            return null;
        } catch (error) {
            console.error("Error getting version background:", error);
            return null;
        }
    });

    ipcMain.handle("set-version-background", async (event, versionId, imageDataURL, instanceId) => {
        const minecraftPath = instanceId ? getInstanceMinecraftPath(instanceId) : getCustomMinecraftPath();
        const versionPath = path.join(minecraftPath, "versions", versionId);

        try {
            if (!fs.existsSync(versionPath)) {
                fs.mkdirSync(versionPath, { recursive: true });
            }

            // 1. Delete any existing background image files
            const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif'];
            for (const ext of imageExtensions) {
                const existingImagePath = path.join(versionPath, `version-background${ext}`);
                if (fs.existsSync(existingImagePath)) {
                    try {
                        await fs.promises.unlink(existingImagePath);
                        console.log(`Deleted existing background image: ${existingImagePath}`);
                    } catch (deleteError) {
                        console.error(`Error deleting existing background image ${existingImagePath}:`, deleteError);
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
                const imagePath = path.join(versionPath, `version-background${fileExtension}`);
                const base64Data = imageDataURL.replace(/^data:image\/(png|jpeg|gif);base64,/, "");
                const imageBuffer = Buffer.from(base64Data, 'base64');
                await fs.promises.writeFile(imagePath, imageBuffer);

            } else if (imageDataURL.startsWith('file:///')) {
                // File Path: Copy the file
                const originalFilePath = decodeURI(imageDataURL.substring(8));
                const fileExtension = path.extname(originalFilePath).toLowerCase();
                const imagePath = path.join(versionPath, `version-background${fileExtension}`);

                // Copy the file
                try {
                    await fs.promises.copyFile(originalFilePath, imagePath);
                    console.log(`Copied background image from ${originalFilePath} to ${imagePath}`);
                } catch (copyError) {
                    console.error(`Error copying background image from ${originalFilePath} to ${imagePath}:`, copyError);
                    return { success: false, error: `Error copying background image: ${copyError.message}` };
                }
            } else {
                return { success: false, error: 'Invalid image data provided.' };
            }

            return { success: true };

        } catch (error) {
            console.error("Error saving version background:", error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("get-default-version-images", async () => {
        try {
            const imagesPath = path.join(__dirname, "..", "assets", "versions");
            const images = [];
            
            if (fs.existsSync(imagesPath)) {
                const files = await fs.promises.readdir(imagesPath);
                for (const file of files) {
                    if (file.match(/\.(png|jpg|jpeg|gif)$/i)) {
                        const imagePath = path.join(imagesPath, file);
                        const data = await fs.promises.readFile(imagePath);
                        const base64Image = data.toString('base64');
                        const ext = path.extname(file).substring(1).toLowerCase();
                        const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
                        const dataURL = `data:${mimeType};base64,${base64Image}`;
                        images.push({
                            name: path.basename(file, path.extname(file)),
                            path: imagePath,
                            dataURL: dataURL
                        });
                    }
                }
            }
            return images;
        } catch (error) {
            console.error("Error getting default version images:", error);
            return [];
        }
    });

    ipcMain.handle("remove-version-image", async (event, versionId, instanceId) => {
        try {
            const minecraftPath = instanceId ? getInstanceMinecraftPath(instanceId) : getCustomMinecraftPath();
            const versionPath = path.join(minecraftPath, "versions", versionId);
            const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif'];
            
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

    // Add new handler for instance icons
    ipcMain.handle('get-instance-icon', async (event, iconPath) => {
        if (!iconPath) return null;
        try {
            const data = await fs.promises.readFile(iconPath);
            const ext = path.extname(iconPath).toLowerCase();
            const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 
                            ext === '.png' ? 'image/png' : 
                            ext === '.gif' ? 'image/gif' : 'image/png';
            return `data:${mimeType};base64,${data.toString('base64')}`;
        } catch (error) {
            console.error('Error reading instance icon:', error);
            return null;
        }
    });
    
    // --- Update handlers ---
    ipcMain.handle("check-for-updates", async () => {
        try {
            const currentVersion = app.getVersion();
            const updateInfo = await checkForUpdates(currentVersion);
            
            if (updateInfo.hasUpdate) {
                showUpdateDialog(mainWindow, updateInfo);
            }
            
            return updateInfo;
        } catch (error) {
            console.error("Error checking for updates:", error);
            return { hasUpdate: false, error: error.message };
        }
    });
}

module.exports = { setupIpcHandlers };