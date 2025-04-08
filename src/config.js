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
    return path.join(getPorcoslandPath(), 'runtime', 'jdk-24', 'bin', javaExecutable);
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
        const sourceDir = path.join(app.getAppPath(), 'assets', 'runtime', 'jdk-24');
        const targetDir = path.join(getPorcoslandPath(), 'runtime', 'jdk-24');
        
        // Verificar si el directorio fuente existe
        if (!fs.existsSync(sourceDir)) {
            console.error(`El directorio fuente ${sourceDir} no existe`);
            return false;
        }
        
        // Crear carpetas necesarias
        await fsPromises.mkdir(path.join(getPorcoslandPath(), 'runtime'), { recursive: true });
        
        // Si el JDK ya existe en el destino, no hacer nada
        if (fs.existsSync(targetDir)) {
            console.log('JDK ya está copiado en .porcosLauncher');
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

module.exports = {
    getLauncherBasePath,
    getCustomMinecraftPath,
    getInstanceMinecraftPath,
    getActiveInstance,
    setActiveInstance,
    getPorcoslandPath,
    getJavaPath,
    copyJavaRuntime
};