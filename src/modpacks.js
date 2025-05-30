// --- FILE: src/modpacks.js ---
const fs = require('fs').promises;
const path = require('path');
const { getLauncherBasePath } = require('./config');
const { getInstanceMinecraftPath } = require('./config');
const { downloadAndExtract } = require('./downloader');
const axios = require('axios');

// Función para obtener la ruta del registro de modpacks
function getModpacksRegistryPath() {
    return path.join(getLauncherBasePath(), 'modpacks-registry.json');
}

// Función para obtener el registro de modpacks instalados
async function getInstalledModpacks() {
    const registryPath = getModpacksRegistryPath();
    try {
        const data = await fs.readFile(registryPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Si el archivo no existe o hay un error al leerlo, crear uno nuevo
        const emptyRegistry = { installedModpacks: [] };
        await fs.writeFile(registryPath, JSON.stringify(emptyRegistry, null, 2));
        return emptyRegistry;
    }
}

// Función para guardar el registro de modpacks
async function saveModpacksRegistry(registry) {
    const registryPath = getModpacksRegistryPath();
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
}

// Función para obtener todos los modpacks disponibles
async function fetchModpacks() {
    try {
        const response = await axios.get('https://raw.githubusercontent.com/yalerooo/myApis/refs/heads/main/porcosLauncher/modpacks.json');
        return response.data;
    } catch (error) {
        console.error('Error fetching modpacks:', error);
        return { modpacks: [] };
    }
}

// Función para obtener solo la versión más reciente de cada modpack
function filterLatestModpacks(modpacks) {
    const modpackMap = new Map();
    
    // Ordenar modpacks por versión (de mayor a menor)
    modpacks.sort((a, b) => compareVersions(b.version, a.version));
    
    // Guardar solo la versión más reciente de cada modpack
    for (const modpack of modpacks) {
        if (!modpackMap.has(modpack.id)) {
            modpackMap.set(modpack.id, modpack);
        }
    }
    
    return Array.from(modpackMap.values());
}

// Función para comparar versiones semánticas (e.g., 1.0.0 vs 1.1.0)
function compareVersions(v1, v2) {
    const v1Parts = v1.split('.').map(Number);
    const v2Parts = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const v1Part = i < v1Parts.length ? v1Parts[i] : 0;
        const v2Part = i < v2Parts.length ? v2Parts[i] : 0;
        
        if (v1Part > v2Part) return 1;
        if (v1Part < v2Part) return -1;
    }
    
    return 0; // Las versiones son iguales
}

// Función para instalar un modpack en una nueva instancia
async function installModpack(modpack, instanceId, progressCallback) {
    try {
        const minecraftPath = getInstanceMinecraftPath(instanceId);
        
        // Recopilar todas las URLs de descarga disponibles
        const downloadUrls = [];
        
        // Añadir la URL principal
        if (modpack.downloadUrl) {
            downloadUrls.push(modpack.downloadUrl);
        }
        
        // Añadir URLs adicionales (downloadUrl2, downloadUrl3, etc.)
        for (let i = 2; i <= 10; i++) { // Soportar hasta 10 partes
            const urlKey = `downloadUrl${i}`;
            if (modpack[urlKey]) {
                downloadUrls.push(modpack[urlKey]);
            }
        }
        
        // Descargar y extraer el modpack
        const downloadResult = await downloadAndExtract(
            downloadUrls, 
            minecraftPath, 
            false, 
            null, 
            progressCallback
        );
        
        if (!downloadResult || !downloadResult.success) {
            return { success: false, error: downloadResult?.error || 'Error al descargar el modpack' };
        }
        
        // Agregar el modpack al registro
        const registry = await getInstalledModpacks();
        registry.installedModpacks.push({
            id: modpack.id,
            instanceId: instanceId,
            version: modpack.version,
            installedDate: new Date().toISOString()
        });
        
        await saveModpacksRegistry(registry);
        
        // Establecer el icono del modpack como icono de la instancia
        if (modpack.icon) {
            try {
                // Descargar la imagen y convertirla a base64
                const iconResponse = await axios.get(modpack.icon, { responseType: 'arraybuffer' });
                const contentType = iconResponse.headers['content-type'];
                const iconBase64 = `data:${contentType};base64,${Buffer.from(iconResponse.data).toString('base64')}`;
                
                const { updateInstance } = require('./instances');
                await updateInstance(instanceId, { icon: iconBase64 });
            } catch (iconError) {
                console.error('Error al establecer el icono del modpack:', iconError);
                // No interrumpimos la instalación si falla el establecimiento del icono
            }
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error installing modpack:', error);
        return { success: false, error: error.message };
    }
}

// Función para verificar actualizaciones de modpacks
async function checkModpackUpdates() {
    try {
        const registry = await getInstalledModpacks();
        const modpacksData = await fetchModpacks();
        const installedModpacks = registry.installedModpacks;
        const updates = [];
        
        for (const installed of installedModpacks) {
            // Buscar todas las versiones del modpack instalado
            const allVersions = modpacksData.modpacks.filter(m => m.id === installed.id);
            
            // Ordenar versiones de mayor a menor
            allVersions.sort((a, b) => compareVersions(b.version, a.version));
            
            // Si hay una versión más reciente que la instalada
            if (allVersions.length > 0 && compareVersions(allVersions[0].version, installed.version) > 0) {
                updates.push({
                    modpackId: installed.id,
                    instanceId: installed.instanceId,
                    currentVersion: installed.version,
                    latestVersion: allVersions[0].version,
                    modpack: allVersions[0]
                });
            }
        }
        
        return updates;
    } catch (error) {
        console.error('Error checking modpack updates:', error);
        return [];
    }
}

// Función para actualizar un modpack a la versión más reciente
async function updateModpack(instanceId, modpackId, progressCallback) {
    try {
        const registry = await getInstalledModpacks();
        const modpacksData = await fetchModpacks();
        
        // Encontrar el modpack instalado
        const installedIndex = registry.installedModpacks.findIndex(
            m => m.id === modpackId && m.instanceId === instanceId
        );
        
        if (installedIndex === -1) {
            return { success: false, error: 'El modpack no está instalado en esta instancia' };
        }
        
        // Encontrar la versión más reciente
        const modpackVersions = modpacksData.modpacks.filter(m => m.id === modpackId);
        modpackVersions.sort((a, b) => compareVersions(b.version, a.version));
        
        if (modpackVersions.length === 0) {
            return { success: false, error: 'No se encontró información del modpack' };
        }
        
        const latestVersion = modpackVersions[0];
        const installedVersion = registry.installedModpacks[installedIndex].version;
        
        // Comprobar si ya está actualizado
        if (compareVersions(latestVersion.version, installedVersion) <= 0) {
            return { success: true, message: 'El modpack ya está actualizado' };
        }
        
        const minecraftPath = getInstanceMinecraftPath(instanceId);
        
        // Eliminar archivos o carpetas que se especifican para ser eliminados
        if (latestVersion.filesToDelete && latestVersion.filesToDelete.length > 0) {
            for (const fileToDelete of latestVersion.filesToDelete) {
                const fullPath = path.join(minecraftPath, fileToDelete);
                try {
                    // Verificar si es un directorio o un archivo
                    const stat = await fs.stat(fullPath).catch(() => null);
                    
                    if (stat) {
                        if (stat.isDirectory()) {
                            // Es un directorio, eliminarlo recursivamente
                            await fs.rm(fullPath, { recursive: true, force: true });
                            console.log(`Carpeta eliminada: ${fileToDelete}`);
                        } else {
                            // Es un archivo, eliminarlo
                            await fs.unlink(fullPath);
                            console.log(`Archivo eliminado: ${fileToDelete}`);
                        }
                    }
                } catch (err) {
                    // Ignorar errores si el archivo o carpeta no existe
                    if (err.code !== 'ENOENT') {
                        console.warn(`No se pudo eliminar ${fileToDelete}:`, err.message);
                    }
                }
            }
        }
        
        // Recopilar todas las URLs de descarga disponibles
        const downloadUrls = [];
        
        // Añadir la URL principal
        if (latestVersion.downloadUrl) {
            downloadUrls.push(latestVersion.downloadUrl);
        }
        
        // Añadir URLs adicionales (downloadUrl2, downloadUrl3, etc.)
        for (let i = 2; i <= 10; i++) { // Soportar hasta 10 partes
            const urlKey = `downloadUrl${i}`;
            if (latestVersion[urlKey]) {
                downloadUrls.push(latestVersion[urlKey]);
            }
        }
        
        // Descargar y extraer la nueva versión
        const downloadResult = await downloadAndExtract(
            downloadUrls, 
            minecraftPath, 
            false, 
            null, 
            progressCallback
        );
        
        if (!downloadResult || !downloadResult.success) {
            return { success: false, error: downloadResult?.error || 'Error al descargar la actualización' };
        }
        
        // Actualizar el registro
        registry.installedModpacks[installedIndex].version = latestVersion.version;
        registry.installedModpacks[installedIndex].installedDate = new Date().toISOString();
        
        await saveModpacksRegistry(registry);
        
        // Actualizar el icono de la instancia con el icono del modpack actualizado
        if (latestVersion.icon) {
            try {
                // Descargar la imagen y convertirla a base64
                const iconResponse = await axios.get(latestVersion.icon, { responseType: 'arraybuffer' });
                const contentType = iconResponse.headers['content-type'];
                const iconBase64 = `data:${contentType};base64,${Buffer.from(iconResponse.data).toString('base64')}`;
                
                const { updateInstance } = require('./instances');
                await updateInstance(instanceId, { icon: iconBase64 });
            } catch (iconError) {
                console.error('Error al actualizar el icono del modpack:', iconError);
                // No interrumpimos la actualización si falla el establecimiento del icono
            }
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error updating modpack:', error);
        return { success: false, error: error.message };
    }
}

// Función para verificar si un modpack está instalado
async function isModpackInstalled(modpackId) {
    const registry = await getInstalledModpacks();
    return registry.installedModpacks.some(m => m.id === modpackId);
}

// Función para obtener información de un modpack instalado por ID
async function getInstalledModpackByID(modpackId) {
    const registry = await getInstalledModpacks();
    return registry.installedModpacks.find(m => m.id === modpackId);
}

// Función para eliminar un modpack del registro (al eliminar una instancia)
async function removeModpackFromRegistry(instanceId) {
    try {
        // Primero obtenemos el registro actual
        const registry = await getInstalledModpacks();
        
        // Filtramos los modpacks para eliminar el que corresponde a la instancia
        const modpackToRemove = registry.installedModpacks.find(m => m.instanceId === instanceId);
        registry.installedModpacks = registry.installedModpacks.filter(
            m => m.instanceId !== instanceId
        );
        
        // Guardamos el registro actualizado
        await saveModpacksRegistry(registry);
        
        // Devolvemos información sobre el modpack eliminado para posibles usos posteriores
        return { 
            success: true, 
            removedModpack: modpackToRemove || null 
        };
    } catch (error) {
        console.error('Error removing modpack from registry:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    fetchModpacks,
    filterLatestModpacks,
    installModpack,
    checkModpackUpdates,
    updateModpack,
    isModpackInstalled,
    getInstalledModpackByID,
    getInstalledModpacks,
    removeModpackFromRegistry,
    compareVersions
};
