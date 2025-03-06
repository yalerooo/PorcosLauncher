const path = require('path');
const { Client } = require('minecraft-launcher-core');
const crypto = require('crypto');

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

function launchMinecraft(options, customMinecraftPath) {
    const opts = {
        authorization: {
            access_token: "0",
            client_token: "0",
            uuid: generateOfflineUUID(options.username),
            name: options.username,
            user_properties: "{}",
            meta: {
                type: "mojang",
                demo: false
            }
        },
        root: customMinecraftPath,
        version: {
            number: options.versionId.split('-')[0],
            type: "release",
            custom: options.versionId
        },
        memory: {
            max: options.maxMemory,  // Usar el valor del parámetro
            min: options.minMemory   // Usar el valor del parámetro
        }
    };

    launcher.on('debug', (e) => console.log(e));
    launcher.on('data', (e) => console.log(e));

    return launcher.launch(opts);
}

module.exports = { launchMinecraft };