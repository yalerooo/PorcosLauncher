const fs = require('fs');
const path = require('path');

async function detectInstalledVersions(minecraftPath) {
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
                        let isForge = false; // Añadimos una bandera para Forge

                         if (json.id.toLowerCase().includes("forge") || json.id.toLowerCase().includes("fabric")) {
                            versionName += ` [Forge/Fabric]`; // Simplificado
                            isForge = true; // Si incluye forge o fabric, asumimos que lo es.
                        } else {
                            versionName += ' [Vanilla]';
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

module.exports = {
    detectInstalledVersions,
};