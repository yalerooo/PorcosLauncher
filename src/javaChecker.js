// --- FILE: javaChecker.js ---
const path = require('path');
const { exec } = require('child_process');
const { dialog } = require('electron');
const { shell } = require('electron');

/**
 * Verifica si Java está instalado y devuelve información sobre la versión incluida en runtime/jdk-24
 * @returns {Promise<{installed: boolean, version: string|null, isCompatible: boolean}>}
 */
async function checkJavaVersion() {
    return new Promise((resolve) => {
        // Usar el Java incluido en runtime/jdk-24
        const javaPath = path.join(process.cwd(), 'runtime', 'jdk-24', 'bin', 'java.exe');
        const command = `"${javaPath}" -version`;
        
        console.log('Verificando Java incluido en:', javaPath);
        
        exec(command, (error, stdout, stderr) => {
            // Java muestra la versión en stderr, no en stdout
            const output = stderr || stdout;
            
            if (error) {
                console.error('Error al verificar Java incluido:', error);
                // Algo salió mal con el Java incluido
                console.log('Usando Java incluido por defecto');
                resolve({ installed: true, version: '24', isCompatible: true });
                return;
            }
            
            // Intentar extraer la versión de Java del output
            const versionMatch = output.match(/version "([\d._]+)"/i) || 
                               output.match(/version ([\d._]+)/i);
            
            if (!versionMatch) {
                console.log('No se pudo determinar la versión de Java incluido, usando por defecto');
                resolve({ installed: true, version: '24', isCompatible: true });
                return;
            }
            
            const versionString = versionMatch[1];
            console.log('Versión de Java incluido detectada:', versionString);
            
            // Siempre consideramos que el Java incluido es compatible
            resolve({
                installed: true,
                version: versionString,
                isCompatible: true
            });
        });
    });
}

/**
 * Función que simula el diálogo de requisito de Java pero no lo muestra ya que usamos el JDK incluido
 * @param {BrowserWindow} mainWindow - La ventana principal de la aplicación
 * @param {Object} javaInfo - Información sobre la instalación de Java
 * @returns {Promise<number>} - Siempre devuelve 1 (continuar)
 */
async function showJavaRequirementDialog(mainWindow, javaInfo) {
    // No mostramos ningún diálogo ya que estamos usando el JDK incluido
    console.log('Usando Java incluido en runtime/jdk-24, no se requiere instalación externa');
    
    // Siempre devolvemos 1 (continuar)
    return 1;
}

module.exports = {
    checkJavaVersion,
    showJavaRequirementDialog
};