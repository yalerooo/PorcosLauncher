const fs = require('fs');
const path = require('path');

// ---  Ya no necesitamos getMinecraftPath() aquí, se pasa como parámetro ---

async function detectInstalledVersions(minecraftPath) { // Recibe la ruta
    const versionsPath = path.join(minecraftPath, 'versions');
    const versions = [];

    try {
        console.log('Buscando en:', versionsPath);
        const folders = fs.readdirSync(versionsPath, { withFileTypes: true });

        for (const dirent of folders) {
            if (dirent.isDirectory()) {
                const versionFolder = dirent.name;
                const jsonPath = path.join(versionsPath, versionFolder, `${versionFolder}.json`);
                console.log('Verificando:', jsonPath);

                if (fs.existsSync(jsonPath)) {
                    try {
                        const data = fs.readFileSync(jsonPath, 'utf8');
                        const json = JSON.parse(data);

                         let versionName = json.id;
                        if (json.inheritsFrom) {
                            versionName += ` [Forge/Fabric ${json.inheritsFrom}]`;
                        } else {
                          versionName += ' [Vanilla]';
                        }

                        versions.push({
                            id: versionFolder,
                            name: versionName
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


module.exports = {
    detectInstalledVersions,
};