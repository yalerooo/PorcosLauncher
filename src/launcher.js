const path = require('path');
const { Client } = require('minecraft-launcher-core');
const crypto = require('crypto');
const { getMinecraftPath } = require('./versions');

const launcher = new Client();

// Función para generar UUID offline (Correcta y necesaria)
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

function launchMinecraft(options) {
    const opts = {
        // Autenticación Offline (NECESARIA)
        authorization: {
            access_token: "0", // Token falso, no se usa en offline
            client_token: "0",   // Token falso
            uuid: generateOfflineUUID(options.username), // UUID generado
            name: options.username,
            user_properties: "{}", // Propiedades vacías
            meta: {
                type: "mojang", // Tipo de cuenta (mojang para offline)
                demo: false      // No es una cuenta demo
            }
        },
        root: getMinecraftPath(),       // Ruta de .minecraft
        version: {
            number: options.versionId.split('-')[0],  // Versión numérica (ej: "1.12.2")
            type: "release",         // Tipo de versión (release, snapshot, etc.)
            custom: options.versionId   // ID completo para Forge/Fabric
        },
        memory: {
            max: "4G",  // Memoria máxima (ajusta según tus preferencias)
            min: "2G"   // Memoria mínima
        }
    };
    
     launcher.on('debug', (e) => console.log(e));
     launcher.on('data', (e) => console.log(e));

    return launcher.launch(opts); // Lanzar el juego
}

module.exports = { launchMinecraft };