// --- START OF FILE launcher.js ---
const path = require('path');
const { Client } = require('minecraft-launcher-core');
const crypto = require('crypto');
const { fabric, forge, quilt, neoforge, vanilla, liner } = require('tomate-loaders');

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

async function launchMinecraft(options, customMinecraftPath) {
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

    const baseMemory = {
        max: options.maxMemory,
        min: options.minMemory
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
        const loaders = await fabric.getLoaders();
        launchConfig = await fabric.getMCLCLaunchConfig({
            gameVersion,
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

    // Set up event listeners with liner for better output handling
    launcher.on('debug', (e) => console.log('[Debug]', e));
    launcher.on('data', liner((line) => console.log('[Minecraft]', line)));

    // Launch the game with the configured loader
    return launcher.launch({
        ...launchConfig,
        authorization: baseAuth,
        memory: baseMemory,
        javaPath: options.javaPath || 'javaw'
    });
}

module.exports = { launchMinecraft };