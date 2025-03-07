// --- FILE: src/versions.js ---
const fs = require('fs').promises; // Use fs.promises for async operations
const path = require('path');
const https = require('https'); // For fetching version manifest
const { downloadAndExtract } = require('./downloader'); // Import your downloader
const { getCustomMinecraftPath } = require('./config');

async function fetchVersionManifest() {
    return new Promise((resolve, reject) => {
        https.get('https://launchermeta.mojang.com/mc/game/version_manifest.json', (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const manifest = JSON.parse(data);
                    resolve(manifest);
                } catch (error) {
                    reject(error);
                }
            });
            res.on('error', reject);
        });
    });
}


 // --- FILE: src/versions.js ---

 async function downloadVersion(versionNumber) {
  try {
      const manifest = await fetchVersionManifest();
      const versionData = manifest.versions.find(v => v.id === versionNumber);
 
      if (!versionData) {
          throw new Error(`Version ${versionNumber} not found in manifest.`);
      }
 
      const versionJsonUrl = versionData.url;
       console.log(`versionJsonUrl: ${versionJsonUrl}`);
 
      // Download the version JSON
      const versionJson = await new Promise((resolve, reject) => {
          https.get(versionJsonUrl, (res) => {
              let data = '';
              res.on('data', (chunk) => data += chunk);
              res.on('end', () => resolve(JSON.parse(data)));
              res.on('error', reject);
          });
      });
 
      const minecraftPath = getCustomMinecraftPath();
      const versionsDir = path.join(minecraftPath, 'versions');
      const versionDir = path.join(versionsDir, versionNumber);
      const versionJsonPath = path.join(versionDir, `${versionNumber}.json`);
      const versionJarPath = path.join(versionDir, `${versionNumber}.jar`); //No se usa, pero buena practica
 
      // Create directories if they don't exist
      await fs.mkdir(versionDir, { recursive: true });
 
      // Save the version JSON
      await fs.writeFile(versionJsonPath, JSON.stringify(versionJson, null, 2));
 
      // Download the client JAR (using your downloadAndExtract function)
      const clientDownloadUrl = versionJson.downloads.client.url;
      console.log(`clientDownloadUrl: ${clientDownloadUrl}`);
      const downloadResult = await downloadAndExtract(clientDownloadUrl, versionDir);
 
 
      if (!downloadResult.success) {
        throw new Error("Failed to download client jar" + downloadResult.error)
      }
 
 
    return { success: true }; // Return success if all goes well
  } catch (error) {
      console.error('Error downloading version:', error);
      return { success: false, error: error.message || error };  // Return failure with error message.
  }
 }

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
                //const imageFilePath = path.join(versionsPath, versionFolder, "version-image.png"); // Path to the image

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

                        let versionImage = null;
                        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif']; // Check all extensions
                        for (const ext of imageExtensions) {
                            const imageFilePath = path.join(versionsPath, versionFolder, `version-image${ext}`);
                            if (await fileExists(imageFilePath)) {
                                versionImage = imageFilePath;
                                break; // Stop once an image is found
                            }
                        }



                        versions.push({
                            id: versionFolder,
                            name: versionName,
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
    downloadVersion,  // Export the new function
    fetchVersionManifest //Export the new function
};