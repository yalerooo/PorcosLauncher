// --- FILE: src/minecraftInitializer.js ---
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

async function initializeMinecraftFolder(minecraftPath) {
    try {
        // Create .minecraft directory if it doesn't exist
        if (!fs.existsSync(minecraftPath)) {
            fs.mkdirSync(minecraftPath, { recursive: true });
        }

        // Copy default files from assets/minecraft_default if they exist
        const defaultFilesPath = path.join(app.getAppPath(), 'assets', 'minecraft_default');
        if (fs.existsSync(defaultFilesPath)) {
            const copyFiles = (source, destination) => {
                if (!fs.existsSync(destination)) {
                    fs.mkdirSync(destination, { recursive: true });
                }

                const items = fs.readdirSync(source);
                for (const item of items) {
                    const sourcePath = path.join(source, item);
                    const destPath = path.join(destination, item);

                    if (fs.statSync(sourcePath).isDirectory()) {
                        copyFiles(sourcePath, destPath);
                    } else {
                        fs.copyFileSync(sourcePath, destPath);
                    }
                }
            };

            copyFiles(defaultFilesPath, minecraftPath);
            console.log('Default Minecraft files copied successfully');
        } else {
            console.log('No default Minecraft files found in assets/minecraft_default');
        }

        return { success: true };
    } catch (error) {
        console.error('Error initializing Minecraft folder:', error);
        return { success: false, error: error.message };
    }
}

module.exports = { initializeMinecraftFolder };