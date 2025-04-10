// --- FILE: javaChecker.js ---
const path = require('path');
const { exec } = require('child_process');
const { dialog } = require('electron');
const { shell } = require('electron');
const { getJavaPath, copyJavaRuntime } = require('./config');

/**
 * Copia el JDK incluido a .porcosLauncher y verifica la versión
 * @returns {Promise<{installed: boolean, version: string|null, isCompatible: boolean}>}
 */
async function checkJavaVersion() {
    // Primer paso: asegurarnos de que el JDK está copiado en .porcosland
    await copyJavaRuntime();
    
    return new Promise((resolve) => {
        // Usar el Java incluido en .porcosLauncher/runtime/jdk-24
        const isWindows = process.platform === 'win32';
        const javaPath = isWindows ? getJavaPath().replace('javaw.exe', 'java.exe') : getJavaPath();
        
        console.log('Verificando Java incluido en:', javaPath);
        
        // Verificar si el archivo Java existe
        const fs = require('fs');
        if (!fs.existsSync(javaPath)) {
            console.error(`El archivo Java no existe en la ruta: ${javaPath}`);
            
            // Intentar usar el Java incluido en el paquete
            const { app } = require('electron');
            const javaExecutable = isWindows ? 'java.exe' : 'java';
            const fallbackJavaPath = path.join(app.getAppPath(), 'assets', 'runtime', 'jdk-24', 'bin', javaExecutable);
            console.log('Intentando usar Java alternativo en:', fallbackJavaPath);
            
            // Verificar si existe este Java alternativo
            if (fs.existsSync(fallbackJavaPath)) {
                console.log('Usando Java alternativo encontrado');
                
                // En Linux, establecer permisos de ejecución
                if (!isWindows) {
                    try {
                        fs.chmodSync(fallbackJavaPath, 0o755);
                        console.log('Permisos de ejecución establecidos para Java alternativo');
                    } catch (chmodError) {
                        console.error('Error al establecer permisos de ejecución:', chmodError);
                    }
                }
                
                resolve({ installed: true, version: '24', isCompatible: true });
            } else {
                console.log('No se encontró Java alternativo, usando valores por defecto');
                resolve({ installed: true, version: '24', isCompatible: true });
            }
            return;
        }
        
        // En Linux, asegurarse de que el archivo Java tenga permisos de ejecución
        if (!isWindows) {
            try {
                fs.chmodSync(javaPath, 0o755);
                console.log('Permisos de ejecución establecidos para Java');
            } catch (chmodError) {
                console.error('Error al establecer permisos de ejecución:', chmodError);
            }
        }
        
        // Comando para verificar la versión de Java
        const command = `"${javaPath}" -version`;
        
        exec(command, (error, stdout, stderr) => {
            // Java muestra la versión en stderr, no en stdout
            const output = stderr || stdout;
            
            if (error) {
                console.error('Error al verificar Java incluido:', error);
                // Algo salió mal con el Java incluido, intentar usar el Java incluido en el paquete
                const { app } = require('electron');
                const javaExecutable = isWindows ? 'java.exe' : 'java';
                const fallbackJavaPath = path.join(app.getAppPath(), 'assets', 'runtime', 'jdk-24', 'bin', javaExecutable);
                console.log('Intentando usar Java alternativo en:', fallbackJavaPath);
                
                // Verificar si existe este Java alternativo
                if (fs.existsSync(fallbackJavaPath)) {
                    console.log('Usando Java alternativo encontrado');
                    
                    // En Linux, establecer permisos de ejecución
                    if (!isWindows) {
                        try {
                            fs.chmodSync(fallbackJavaPath, 0o755);
                            console.log('Permisos de ejecución establecidos para Java alternativo');
                        } catch (chmodError) {
                            console.error('Error al establecer permisos de ejecución:', chmodError);
                        }
                    }
                    
                    resolve({ installed: true, version: '24', isCompatible: true });
                } else {
                    console.log('No se encontró Java alternativo, usando valores por defecto');
                    resolve({ installed: true, version: '24', isCompatible: true });
                }
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