// --- FILE: src/instances.js ---
const fs = require('fs').promises;
const path = require('path');
const { getLauncherBasePath } = require('./config');

// Función para obtener la ruta base de las instancias
function getInstancesPath() {
    return path.join(getLauncherBasePath(), 'instances');
}

// Función para obtener la ruta de una instancia específica
function getInstancePath(instanceId) {
    return path.join(getInstancesPath(), instanceId);
}

// Función para listar todas las instancias disponibles
async function listInstances() {
    const instancesPath = getInstancesPath();
    try {
        await fs.mkdir(instancesPath, { recursive: true });
        const instances = await fs.readdir(instancesPath, { withFileTypes: true });
        
        const instancesList = [];
        for (const dirent of instances) {
            if (dirent.isDirectory()) {
                const instanceId = dirent.name;
                const configPath = path.join(instancesPath, instanceId, 'instance.json');
                try {
                    const configData = await fs.readFile(configPath, 'utf8');
                    const config = JSON.parse(configData);
                    instancesList.push({
                        id: instanceId,
                        name: config.name || instanceId,
                        path: getInstancePath(instanceId),
                        icon: config.icon || null
                    });
                } catch (error) {
                    // Si no hay archivo de configuración, usar valores por defecto
                    instancesList.push({
                        id: instanceId,
                        name: instanceId,
                        path: getInstancePath(instanceId),
                        icon: null
                    });
                }
            }
        }
        return instancesList;
    } catch (error) {
        console.error('Error listing instances:', error);
        return [];
    }
}

// Función para crear una nueva instancia
async function createInstance(name) {
    const instancesPath = getInstancesPath();
    const instanceId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const instancePath = getInstancePath(instanceId);
    const configPath = path.join(instancePath, 'instance.json');
    const minecraftPath = path.join(instancePath, '.minecraft');

    try {
        // Crear directorio de la instancia
        await fs.mkdir(instancePath, { recursive: true });

        // Crear archivo de configuración
        const config = {
            name: name,
            created: new Date().toISOString(),
            icon: null
        };

        await fs.writeFile(configPath, JSON.stringify(config, null, 2));

        // Crear directorio .minecraft
        await fs.mkdir(minecraftPath, { recursive: true });

        // Crear estructura básica de carpetas de Minecraft
        const minecraftFolders = ['versions', 'assets', 'libraries', 'mods'];
        for (const folder of minecraftFolders) {
            await fs.mkdir(path.join(minecraftPath, folder), { recursive: true });
        }
        
        // Copiar archivos por defecto desde minecraft_default
        const { initializeMinecraftFolder } = require('./minecraftInitializer');
        await initializeMinecraftFolder(minecraftPath);

        return {
            success: true,
            instance: {
                id: instanceId,
                name: name,
                path: instancePath,
                icon: null
            }
        };
    } catch (error) {
        console.error('Error creating instance:', error);
        return { success: false, error: error.message };
    }
}

// Función para actualizar la configuración de una instancia
async function updateInstance(instanceId, config) {
    const configPath = path.join(getInstancePath(instanceId), 'instance.json');
    try {
        // Leer la configuración actual
        const currentConfig = JSON.parse(await fs.readFile(configPath, 'utf8'));
        
        // Actualizar nombre si ha cambiado
        if (config.name && config.name !== currentConfig.name) {
            currentConfig.name = config.name;
        }
        
        // Manejar icono
        if (config.icon) {
            // Si es una URL de datos o una ruta de archivo
            if (config.icon.startsWith('data:')) {
                // Determinar el tipo de imagen y extensión
                let fileExtension;
                if (config.icon.startsWith('data:image/jpeg')) {
                    fileExtension = '.jpg';
                } else if (config.icon.startsWith('data:image/png')) {
                    fileExtension = '.png';
                } else if (config.icon.startsWith('data:image/gif')) {
                    fileExtension = '.gif';
                } else {
                    return { success: false, error: 'Unsupported image format.' };
                }
                
                // Eliminar cualquier icono existente
                const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif'];
                for (const ext of imageExtensions) {
                    const existingIconPath = path.join(getInstancePath(instanceId), `icon${ext}`);
                    if (await fileExists(existingIconPath)) {
                        await fs.unlink(existingIconPath);
                    }
                }
                
                // Guardar el nuevo icono
                const iconPath = path.join(getInstancePath(instanceId), `icon${fileExtension}`);
                const base64Data = config.icon.replace(/^data:image\/(png|jpeg|gif);base64,/, "");
                const imageBuffer = Buffer.from(base64Data, 'base64');
                await fs.writeFile(iconPath, imageBuffer);
                
                // Actualizar la ruta en la configuración
                currentConfig.icon = iconPath;
            }
        }
        
        // Guardar la configuración actualizada
        await fs.writeFile(configPath, JSON.stringify(currentConfig, null, 2));
        return { success: true };
    } catch (error) {
        console.error('Error updating instance:', error);
        return { success: false, error: error.message };
    }
}

// Helper function to check if a file exists
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// Función para eliminar una instancia
async function deleteInstance(instanceId) {
    const instancePath = getInstancePath(instanceId);
    try {
        await fs.rm(instancePath, { recursive: true, force: true });
        return { success: true };
    } catch (error) {
        console.error('Error deleting instance:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    getInstancesPath,
    getInstancePath,
    listInstances,
    createInstance,
    updateInstance,
    deleteInstance
};