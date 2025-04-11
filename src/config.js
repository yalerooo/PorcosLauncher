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
        let sourceDir, targetDir;
        
        if (isWindows) {
            // Para Windows
            sourceDir = path.join(app.getAppPath(), 'assets', 'runtime', 'windows', 'jdk-24');
            targetDir = path.join(getPorcoslandPath(), 'runtime', 'windows', 'jdk-24');
        } else {
            // Para Linux
            const isARM64 = process.arch === 'arm64';
            const jdkFolderName = isARM64 ? 'jdk-24-ARM64' : 'jdk-24-x64';
            
            sourceDir = path.join(app.getAppPath(), 'assets', 'runtime', 'linux', jdkFolderName);
            targetDir = path.join(getPorcoslandPath(), 'runtime', 'linux', jdkFolderName);
        }
        
        // Verificar si el directorio fuente existe
        if (!fs.existsSync(sourceDir)) {
            console.error(`El directorio fuente ${sourceDir} no existe`);
            return false;
        }
        
        // Crear carpetas necesarias
        // Para Windows, crear runtime/windows
        // Para Linux, crear runtime/linux
        const parentDir = path.dirname(targetDir);
        await fsPromises.mkdir(parentDir, { recursive: true });
        
        // Si el JDK ya existe en el destino, no hacer nada
        if (fs.existsSync(targetDir)) {
            console.log(`JDK ya está copiado en ${targetDir}`);
            return true;
        }
        
        // Copiar directorio recursivamente
        await copyDirectory(sourceDir, targetDir);
        console.log(`JDK copiado exitosamente a ${targetDir}`);
        return true;
    } catch (error) {
        console.error('Error al copiar el runtime de Java:', error);
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