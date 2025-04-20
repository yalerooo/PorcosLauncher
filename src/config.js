// --- FILE: src/config.js ---
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;

function getLauncherBasePath() {
    return path.join(app.getPath('appData'), '.porcosLauncher');
}

function getPorcoslandPath() {
    return path.join(app.getPath('appData'), '.porcosLauncher');
}

function getJavaPath() {
    const isWindows = process.platform === 'win32';
    const javaExecutable = isWindows ? 'javaw.exe' : 'java';
    
    // Determinar la ruta correcta basada en el sistema operativo y arquitectura
    let jdkFolderName = 'jdk-24';
    
    if (isWindows) {
        // Para Windows, usar la carpeta jdk-24 en runtime/windows
        return path.join(getPorcoslandPath(), 'runtime', 'windows', jdkFolderName, 'bin', javaExecutable);
    } else {
        // Para Linux, determinar la arquitectura
        const isARM64 = process.arch === 'arm64';
        jdkFolderName = isARM64 ? 'jdk-24-ARM64' : 'jdk-24-x64';
        
        return path.join(getPorcoslandPath(), 'runtime', 'linux', jdkFolderName, 'bin', javaExecutable);
    }
}

function getCustomMinecraftPath() {
    return path.join(getLauncherBasePath(), '.minecraft');
}

// Función para obtener la ruta de una instancia específica
function getInstanceMinecraftPath(instanceId) {
    if (!instanceId) {
        return getCustomMinecraftPath(); // Retrocompatibilidad
    }
    return path.join(getLauncherBasePath(), 'instances', instanceId, '.minecraft');
}

// Función para obtener la instancia activa
function getActiveInstance() {
    const configPath = path.join(getLauncherBasePath(), 'active_instance.json');
    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(data).activeInstance;
        }
    } catch (error) {
        console.error('Error reading active instance:', error);
    }
    return null;
}

// Función para establecer la instancia activa
function setActiveInstance(instanceId) {
    const configPath = path.join(getLauncherBasePath(), 'active_instance.json');
    try {
        fs.writeFileSync(configPath, JSON.stringify({ activeInstance: instanceId }), 'utf8');
        return true;
    } catch (error) {
        console.error('Error setting active instance:', error);
        return false;
    }
}

// Función para copiar el JDK incluido a la carpeta .porcosLauncher
async function copyJavaRuntime() {
    try {
        const { app } = require('electron');
        const isWindows = process.platform === 'win32';
        const isARM64 = process.arch === 'arm64';
        let targetDir;
        
        // Determinar directorio destino según el sistema operativo
        if (isWindows) {
            // Para Windows
            targetDir = path.join(getPorcoslandPath(), 'runtime', 'windows', 'jdk-24');
        } else {
            // Para Linux
            const jdkFolderName = isARM64 ? 'jdk-24-ARM64' : 'jdk-24-x64';
            targetDir = path.join(getPorcoslandPath(), 'runtime', 'linux', jdkFolderName);
        }
        
        // Verificar si el JDK ya existe en el destino
        if (fs.existsSync(targetDir)) {
            console.log(`JDK ya está instalado en ${targetDir}`);
            return true;
        }
        
        // Si no existe, debemos descargarlo
        console.log('JDK no encontrado, se procederá a descargar...');
        
        // Crear carpeta de destino
        const parentDir = path.dirname(targetDir);
        await fsPromises.mkdir(parentDir, { recursive: true });
        
        // Obtener URL de descarga según el sistema operativo
        let downloadUrl, fileExt;
        if (isWindows) {
            downloadUrl = 'https://download.oracle.com/java/24/latest/jdk-24_windows-x64_bin.zip';
            fileExt = 'zip';
        } else {
            if (isARM64) {
                downloadUrl = 'https://download.oracle.com/java/24/latest/jdk-24_linux-aarch64_bin.tar.gz';
                fileExt = 'tar.gz';
            } else {
                downloadUrl = 'https://download.oracle.com/java/24/latest/jdk-24_linux-x64_bin.tar.gz';
                fileExt = 'tar.gz';
            }
        }
        
        // Notificar a la ventana principal que se está descargando el JDK
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
            // Enviar mensaje a la ventana principal para mostrar el popup
            mainWindow.webContents.send('jdk-download-started');
            
            // Esperar un momento para asegurar que el popup se muestre
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Descargar y extraer el JDK
        try {
            const { downloadAndExtract } = require('./downloader');
            const tempDir = path.join(app.getPath('temp'), 'jdk-download');
            
            // Asegurarse de que el directorio temporal existe
            await fsPromises.mkdir(tempDir, { recursive: true });
            
            // Notificar progreso
            const progressCallback = (progress) => {
                if (mainWindow) {
                    if (typeof progress === 'number') {
                        mainWindow.webContents.send('jdk-download-progress', { progress });
                    } else if (progress === 'extracting') {
                        mainWindow.webContents.send('jdk-extracting');
                    } else if (progress === 'completed') {
                        mainWindow.webContents.send('jdk-install-completed');
                    } else if (progress === 'error') {
                        mainWindow.webContents.send('jdk-install-error');
                    }
                }
            };
            
            // Nombre de archivo temporal específico según el sistema
            const tempFile = path.join(tempDir, `jdk-download.${fileExt}`);
            
            console.log(`Descargando JDK desde ${downloadUrl} a ${tempFile}`);
            
            // Descargar y extraer el JDK
            const result = await downloadAndExtract(
                downloadUrl,
                tempDir,
                false, // No mantener el archivo comprimido
                tempFile, // Especificar el nombre del archivo temporal
                progressCallback
            );
            
            if (!result.success) {
                throw new Error(`Error al descargar o extraer el JDK: ${result.error || 'Unknown error'}`);
            }
            
            // Mover los archivos extraídos a la ubicación final
            const extractedFiles = await fsPromises.readdir(tempDir);
            let sourceJdkDir = tempDir;
            
            // Encontrar la carpeta del JDK si existe (normalmente el archivo se extrae en una subcarpeta)
            for (const file of extractedFiles) {
                const filePath = path.join(tempDir, file);
                const stat = await fsPromises.stat(filePath);
                if (stat.isDirectory() && file.includes('jdk')) {
                    sourceJdkDir = filePath;
                    break;
                }
            }
            
            console.log(`Copiando desde ${sourceJdkDir} a ${targetDir}`);
            
            // Copiar el JDK a la ubicación final
            await copyDirectory(sourceJdkDir, targetDir);
            
            // Eliminar el directorio temporal
            await fsPromises.rm(tempDir, { recursive: true, force: true }).catch(err => {
                console.error('Error al eliminar directorio temporal:', err);
                // No interrumpir el proceso por un error al limpiar
            });
            
            console.log(`JDK descargado y copiado exitosamente a ${targetDir}`);
            return true;
        } catch (error) {
            console.error('Error al descargar el JDK:', error);
            
            // Notificar el error
            if (mainWindow) {
                mainWindow.webContents.send('jdk-install-error', { error: error.message });
            }
            
            return false;
        }
    } catch (error) {
        console.error('Error al gestionar el runtime de Java:', error);
        return false;
    }
}

// Función auxiliar para copiar directorios recursivamente
async function copyDirectory(source, target) {
    // Crear el directorio destino
    await fsPromises.mkdir(target, { recursive: true });
    
    // Leer el contenido del directorio fuente
    const entries = await fsPromises.readdir(source, { withFileTypes: true });
    
    // Copiar cada entrada
    for (const entry of entries) {
        const srcPath = path.join(source, entry.name);
        const destPath = path.join(target, entry.name);
        
        if (entry.isDirectory()) {
            // Es un directorio, copiar recursivamente
            await copyDirectory(srcPath, destPath);
        } else {
            // Es un archivo, copiarlo directamente
            await fsPromises.copyFile(srcPath, destPath);
        }
    }
}

// Función para copiar las carpetas de runtime (windows y linux) a .porcosLauncher
async function copyRuntimeFolders() {
    try {
        const { app } = require('electron');
        const runtimeFolders = ['windows', 'linux'];
        const runtimeTargetDir = path.join(getPorcoslandPath(), 'runtime');
        
        // Crear carpeta runtime en destino si no existe
        await fsPromises.mkdir(runtimeTargetDir, { recursive: true });
        
        // Copiar cada carpeta de runtime
        for (const folder of runtimeFolders) {
            const sourceDir = path.join(app.getAppPath(), 'assets', 'runtime', folder);
            const targetDir = path.join(runtimeTargetDir, folder);
            
            // Verificar si el directorio fuente existe
            if (!fs.existsSync(sourceDir)) {
                console.error(`El directorio fuente ${sourceDir} no existe`);
                continue;
            }
            
            // Si la carpeta ya existe en el destino, no hacer nada
            if (fs.existsSync(targetDir)) {
                console.log(`La carpeta ${folder} ya está copiada en .porcosLauncher/runtime`);
                continue;
            }
            
            // Copiar directorio recursivamente
            await copyDirectory(sourceDir, targetDir);
            console.log(`Carpeta ${folder} copiada exitosamente a ${targetDir}`);
        }
        
        return true;
    } catch (error) {
        console.error('Error al copiar las carpetas de runtime:', error);
        return false;
    }
}

module.exports = {
    getLauncherBasePath,
    getCustomMinecraftPath,
    getInstanceMinecraftPath,
    getActiveInstance,
    setActiveInstance,
    getPorcoslandPath,
    getJavaPath,
    copyJavaRuntime,
    copyRuntimeFolders
};