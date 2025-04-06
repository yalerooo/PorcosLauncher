// --- START OF FILE launcher.js ---
const path = require('path');
const { Client } = require('minecraft-launcher-core');
const crypto = require('crypto');
const { fabric, forge, quilt, neoforge, vanilla, liner } = require('tomate-loaders');
const { getJavaPath } = require('./config');

// Ruta al Java incluido en .porcosland/runtime/jdk-24
const JAVA_PATH = getJavaPath();

const launcher = new Client();

function generateOfflineUUID(username) {
    const data = `OfflinePlayer:${username}`;
    const md5 = crypto.createHash('md5').update(data).digest();
    md5[6] &= 0x0f;
    md5[6] |= 0x30;
    md5[8] &= 0x3f;
    md5[8] |= 0x80;
    return Buffer.from(md5).toString('hex')
        .replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5');
}

async function launchMinecraft(options, customMinecraftPath, customLauncher = null) {
    const baseAuth = {
        access_token: "0",
        client_token: "0",
        uuid: generateOfflineUUID(options.username),
        name: options.username,
        user_properties: "{}",
        meta: {
            type: "mojang",
            demo: false
        }
    };

    // Configuración de memoria base
    let baseMemory = {
        max: options.maxMemory + "G",
        min: options.minMemory + "G"
    };

    const gameVersion = options.versionId.split('-')[0];
    let launchConfig;

    // Determine which loader to use based on the version ID
    if (options.versionId.includes('forge')) {
        const forgeVersion = options.versionId.split('-')[1];
        if (!forgeVersion) {
            throw new Error('Forge version not specified in versionId');
        }
        launchConfig = await forge.getMCLCLaunchConfig({
            gameVersion,
            forgeVersion,
            rootPath: customMinecraftPath
        });
    } else if (options.versionId.includes('fabric')) {
        const versionParts = options.versionId.split('-');
        if (versionParts.length < 4 || versionParts[0] !== 'fabric' || versionParts[1] !== 'loader') {
            throw new Error('Invalid Fabric version format. Expected fabric-loader-<loaderVersion>-<minecraftVersion>');
        }
        const fabricLoaderVersion = versionParts[2];
        const minecraftVersion = versionParts.slice(3).join('-');
        const loaders = await fabric.getLoaders();
        const isValidLoader = loaders.some(loader => loader.version === fabricLoaderVersion);
        if (!isValidLoader) {
            throw new Error(`Fabric loader version ${fabricLoaderVersion} is not available.`);
        }
        launchConfig = await fabric.getMCLCLaunchConfig({
            gameVersion: minecraftVersion,
            fabricLoaderVersion: fabricLoaderVersion,
            rootPath: customMinecraftPath
        });
    } else if (options.versionId.includes('quilt')) {
        launchConfig = await quilt.getMCLCLaunchConfig({
            gameVersion,
            rootPath: customMinecraftPath
        });
    } else if (options.versionId.includes('neoforge')) {
        launchConfig = await neoforge.getMCLCLaunchConfig({
            gameVersion,
            rootPath: customMinecraftPath
        });
    } else {
        // Vanilla Minecraft
        launchConfig = await vanilla.getMCLCLaunchConfig({
            gameVersion,
            rootPath: customMinecraftPath
        });
    }

    // Usar el launcher personalizado si se proporciona, de lo contrario usar el predeterminado
    const gameLauncher = customLauncher || launcher;
    
    // Si no se proporcionó un launcher personalizado, configurar los listeners predeterminados
    if (!customLauncher) {
        gameLauncher.on('debug', (e) => console.log('[Debug]', e));
        gameLauncher.on('data', liner((line) => console.log('[Minecraft]', line)));
    }

    // Launch the game with the configured loader
    // Asegurarse de que la configuración de memoria del usuario tenga prioridad
    // sobre cualquier configuración que pueda venir de los loaders
    if (launchConfig.memory) {
        delete launchConfig.memory; // Eliminar cualquier configuración de memoria que venga del loader
    }
    
    // Usar siempre la configuración de memoria del usuario
    console.log(`Usando configuración de memoria: Min ${options.minMemory} - Max ${options.maxMemory}`);
    // No forzar valores específicos para ningún loader
    
    return gameLauncher.launch({
        ...launchConfig,
        authorization: baseAuth,
        memory: baseMemory, // Usar siempre la memoria configurada por el usuario
        javaPath: options.javaPath || JAVA_PATH
    });
}

module.exports = { launchMinecraft };