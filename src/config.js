// --- FILE: src/config.js ---
const { app } = require('electron');
const path = require('path');

function getLauncherBasePath() {
    return path.join(app.getPath('appData'), '.porcosLauncher');
}

function getCustomMinecraftPath() {
    return path.join(getLauncherBasePath(), '.minecraft');
}

module.exports = {
    getLauncherBasePath,
    getCustomMinecraftPath
};