// --- START OF FILE versions.js ---
const fs = require('fs').promises; // Use fs.promises for async operations
const path = require('path');

async function detectInstalledVersions(minecraftPath) {
    const versionsPath = path.join(minecraftPath, 'versions');
    const versions = [];

    try {
        console.log('Buscando en:', versionsPath);
        const folders = await fs.readdir(versionsPath, { withFileTypes: true });

        for (const dirent of folders) {
            if (dirent.isDirectory()) {
                const versionFolder = dirent.name;
                const jsonPath = path.join(versionsPath, versionFolder, `${versionFolder}.json`);
                const nameFilePath = path.join(versionsPath, versionFolder, "version-name.txt");

                console.log('Verificando:', jsonPath);

                if (await fileExists(jsonPath)) {
                    try {
                        const data = await fs.readFile(jsonPath, 'utf8');
                        const json = JSON.parse(data);

                        let versionName = json.id;
                        let isForge = false;

                         if (json.id.toLowerCase().includes("forge") || json.id.toLowerCase().includes("fabric")) {
                            isForge = true;
                        }

                        //Prioritize version-name.txt
                        if(await fileExists(nameFilePath)){
                             versionName = (await fs.readFile(nameFilePath, 'utf8')).trim();
                        }


                        versions.push({
                            id: versionFolder,
                            name: versionName,  // Use custom name if available
                            isForge: isForge,
                        });
                    } catch (error) {
                        console.error('Error parseando JSON:', jsonPath, error);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error leyendo directorio de versiones:', error);
    }

    return versions;
}

// Helper function to check if a file exists (asynchronously)
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    detectInstalledVersions,
};