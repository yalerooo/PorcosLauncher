// --- FILE: javaChecker.js ---
const { exec } = require('child_process');
const { dialog } = require('electron');
const { shell } = require('electron');

/**
 * Verifica si Java está instalado y si la versión es 21 o superior
 * @returns {Promise<{installed: boolean, version: string|null, isCompatible: boolean}>}
 */
async function checkJavaVersion() {
    return new Promise((resolve) => {
        // Ejecutar el comando para verificar la versión de Java
        exec('java -version', (error, stdout, stderr) => {
            // Java muestra la versión en stderr, no en stdout
            const output = stderr || stdout;
            
            if (error) {
                console.error('Error al verificar Java:', error);
                // Java no está instalado o no está en el PATH
                resolve({ installed: false, version: null, isCompatible: false });
                return;
            }
            
            // Intentar extraer la versión de Java del output
            const versionMatch = output.match(/version "([\d._]+)"/i) || 
                               output.match(/version ([\d._]+)/i);
            
            if (!versionMatch) {
                console.error('No se pudo determinar la versión de Java');
                resolve({ installed: true, version: 'Desconocida', isCompatible: false });
                return;
            }
            
            const versionString = versionMatch[1];
            console.log('Versión de Java detectada:', versionString);
            
            // Extraer el número de versión principal
            // Puede ser formato 1.8.0_XXX (Java 8) o 11.0.X (Java 11+)
            let majorVersion;
            
            if (versionString.startsWith('1.')) {
                // Formato antiguo (Java 8 o anterior): 1.8.0_XXX
                majorVersion = parseInt(versionString.split('.')[1], 10);
            } else {
                // Formato nuevo (Java 9+): 11.0.X, 17.0.X, etc.
                majorVersion = parseInt(versionString.split('.')[0], 10);
            }
            
            console.log('Versión principal de Java:', majorVersion);
            
            // Verificar si la versión es compatible (21 o superior)
            const isCompatible = majorVersion >= 21;
            
            resolve({
                installed: true,
                version: versionString,
                isCompatible: isCompatible
            });
        });
    });
}

/**
 * Muestra un diálogo informando al usuario que necesita instalar Java 21 o superior
 * @param {BrowserWindow} mainWindow - La ventana principal de la aplicación
 * @param {Object} javaInfo - Información sobre la instalación de Java
 * @returns {Promise<number>} - 0 si el usuario elige descargar Java, 1 si elige continuar
 */
async function showJavaRequirementDialog(mainWindow, javaInfo) {
    let message, detail;
    
    if (!javaInfo.installed) {
        message = 'Java no está instalado';
        detail = 'PorcosLauncher requiere Java SDK 21 o superior para funcionar correctamente. ' +
                 '¿Desea descargar e instalar Java ahora?';
    } else {
        message = `Versión de Java incompatible: ${javaInfo.version}`;
        detail = 'PorcosLauncher requiere Java SDK 21 o superior para funcionar correctamente. ' +
                 'La versión instalada es anterior a la requerida. ' +
                 '¿Desea descargar e instalar una versión compatible de Java ahora?';
    }
    
    const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Requisito de Java',
        message: message,
        detail: detail,
        buttons: ['Descargar Java', 'Continuar sin Java'],
        defaultId: 0,
        cancelId: 1
    });
    
    if (response === 0) {
        // Abrir la página de descarga de Java
        await shell.openExternal('https://www.oracle.com/java/technologies/downloads/');
    }
    
    return response;
}

module.exports = {
    checkJavaVersion,
    showJavaRequirementDialog
};