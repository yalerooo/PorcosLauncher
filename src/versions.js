const fs = require('fs');
const path = require('path');

// Función para obtener la ruta de .minecraft (corregida y mejorada)
function getMinecraftPath() {
    if (process.platform === 'win32') {
        return path.join(process.env.APPDATA, '.minecraft');
    } else if (process.platform === 'darwin') {
        return path.join(process.env.HOME, 'Library', 'Application Support', 'minecraft');
    } else { // Linux
        return path.join(process.env.HOME, '.minecraft');
    }
}

async function detectInstalledVersions() {
    const versionsPath = path.join(getMinecraftPath(), 'versions');
    const versions = [];

    try {
        console.log('Buscando en:', versionsPath); // Debug
        const folders = fs.readdirSync(versionsPath, { withFileTypes: true });

        for (const dirent of folders) {
            if (dirent.isDirectory()) {
                const versionFolder = dirent.name;
                const jsonPath = path.join(versionsPath, versionFolder, `${versionFolder}.json`);
                console.log('Verificando:', jsonPath); // Debug

                if (fs.existsSync(jsonPath)) {
                    try {
                        const data = fs.readFileSync(jsonPath, 'utf8');
                        const json = JSON.parse(data);

                        // Mejor detección de Forge/Fabric/Vanilla
                        let versionName = json.id;  // Usamos el ID del JSON
                        if (json.inheritsFrom) {
                            versionName += ` [Forge/Fabric ${json.inheritsFrom}]`; // Indica modificado
                        } else {
                          versionName += ' [Vanilla]';
                        }

                        versions.push({
                            id: versionFolder,  // Usamos el nombre de la carpeta
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
    getMinecraftPath
};