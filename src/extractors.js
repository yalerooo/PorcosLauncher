const fs = require('fs');
const path = require('path');
const tar = require('tar');
const { promisify } = require('util');
const fsPromises = fs.promises;
const os = require('os');

/**
 * Extrae un archivo tar.gz en el directorio de destino
 * @param {string} tarGzFilePath - Ruta al archivo tar.gz
 * @param {string} destinationDir - Directorio donde extraer
 * @param {boolean} keepArchive - Si se debe mantener el archivo comprimido después de extraer
 * @returns {Promise<boolean>} - Resultado de la operación
 */
async function extractTarGz(tarGzFilePath, destinationDir, keepArchive = false) {
    try {
        console.log(`Extrayendo ${tarGzFilePath} en ${destinationDir}...`);
        
        // Asegurarse de que el directorio de destino exista
        await fsPromises.mkdir(destinationDir, { recursive: true });
        
        // Extraer el archivo tar.gz
        await tar.extract({
            file: tarGzFilePath,
            cwd: destinationDir,
            sync: false
        });
        
        console.log('Extracción completada exitosamente');
        
        // Eliminar el archivo comprimido si no se debe mantener
        if (!keepArchive && fs.existsSync(tarGzFilePath)) {
            await fsPromises.unlink(tarGzFilePath);
            console.log(`Archivo comprimido ${tarGzFilePath} eliminado`);
        }
        
        return true;
    } catch (error) {
        console.error('Error al extraer archivo tar.gz:', error);
        return false;
    }
}

/**
 * Detecta la arquitectura del sistema
 * @returns {string} - 'x64' o 'arm64'
 */
function detectArchitecture() {
    const arch = os.arch();
    console.log(`Arquitectura detectada: ${arch}`);
    return arch;
}

module.exports = {
    extractTarGz,
    detectArchitecture
};