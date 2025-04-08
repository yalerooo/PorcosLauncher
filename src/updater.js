// --- FILE: src/updater.js ---
const { app, dialog, shell } = require('electron');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { downloadAndExtract } = require('./downloader');

// URL del archivo JSON que contiene la información de la última versión
const UPDATE_URL = 'https://raw.githubusercontent.com/yalerooo/PorcosLauncher/refs/heads/main/version.json';

/**
 * Compara dos versiones en formato semántico (x.y.z)
 * @param {string} currentVersion - Versión actual del launcher
 * @param {string} latestVersion - Última versión disponible
 * @returns {boolean} - true si latestVersion es mayor que currentVersion
 */
function isNewerVersion(currentVersion, latestVersion) {
    if (!currentVersion || !latestVersion) return false;
    
    const current = currentVersion.split('.').map(Number);
    const latest = latestVersion.split('.').map(Number);
    
    for (let i = 0; i < Math.max(current.length, latest.length); i++) {
        const currentPart = current[i] || 0;
        const latestPart = latest[i] || 0;
        
        if (latestPart > currentPart) return true;
        if (latestPart < currentPart) return false;
    }
    
    return false; // Versiones iguales
}

/**
 * Verifica si hay una nueva versión disponible
 * @param {string} currentVersion - Versión actual del launcher
 * @returns {Promise<{hasUpdate: boolean, latestVersion: string, downloadUrl: string, releaseNotes: string}>}
 */
async function checkForUpdates(currentVersion) {
    return new Promise((resolve, reject) => {
        https.get(UPDATE_URL, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const updateInfo = JSON.parse(data);
                    const hasUpdate = isNewerVersion(currentVersion, updateInfo.version);
                    
                    resolve({
                        hasUpdate,
                        latestVersion: updateInfo.version,
                        downloadUrl: updateInfo.downloadUrl,
                        releaseNotes: updateInfo.releaseNotes
                    });
                } catch (error) {
                    console.error('Error parsing update info:', error);
                    reject(error);
                }
            });
        }).on('error', (error) => {
            console.error('Error checking for updates:', error);
            reject(error);
        });
    });
}

/**
 * Muestra un diálogo de actualización disponible
 * @param {BrowserWindow} mainWindow - Ventana principal de la aplicación
 * @param {Object} updateInfo - Información de la actualización
 */
function showUpdateDialog(mainWindow, updateInfo) {
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Actualización Disponible',
        message: `Hay una nueva versión disponible: ${updateInfo.latestVersion}`,
        detail: updateInfo.releaseNotes || 'Notas de la versión no disponibles',
        buttons: ['Descargar ahora', 'Recordar más tarde'],
        cancelId: 1
    }).then(({ response }) => {
        if (response === 0) {
            // El usuario eligió descargar ahora
            mainWindow.webContents.send('show-update-progress');
            downloadUpdate(mainWindow, updateInfo.downloadUrl);
        }
    });
}

/**
 * Descarga e instala la actualización
 * @param {BrowserWindow} mainWindow - Ventana principal de la aplicación
 * @param {string} downloadUrl - URL de descarga de la actualización
 */
async function downloadUpdate(mainWindow, downloadUrl) {
    try {
        // Directorio temporal para la descarga
        const tempDir = path.join(app.getPath('temp'), 'porcos-launcher-update');
        
        // Asegurarse de que el directorio existe
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Descargar el archivo de actualización
        const progressCallback = (progress) => {
            // Asegurarse de que el progreso sea un número para la barra de progreso
            if (typeof progress === 'number') {
                // Enviar el progreso actualizado al proceso de renderizado
                console.log('Enviando progreso de descarga:', progress);
                mainWindow.webContents.send('update-download-progress', { progress });
            } else {
                // Si es un estado como 'extracting' o 'completed', enviarlo también
                console.log('Enviando estado de descarga:', progress);
                mainWindow.webContents.send('update-download-progress', { progress });
            }
        };
        
        const isWindows = process.platform === 'win32';
        const updateFileName = isWindows ? 'update.exe' : 'update.AppImage';
        const result = await downloadAndExtract(downloadUrl, tempDir, true, updateFileName, progressCallback);
        
        if (result.success) {
            const updateFilePath = path.join(tempDir, updateFileName);
            
            // Mostrar diálogo de confirmación para instalar
            dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Instalar Actualización',
                message: 'La actualización se ha descargado correctamente',
                detail: '¿Desea instalar la actualización ahora? La aplicación se cerrará durante la instalación.',
                buttons: ['Instalar ahora', 'Instalar más tarde'],
                cancelId: 1
            }).then(({ response }) => {
                if (response === 0) {
                    // Ejecutar el instalador y cerrar la aplicación
                    shell.openPath(updateFilePath).then(() => {
                        app.quit();
                    });
                }
            });
        } else {
            throw new Error(result.error || 'Error desconocido al descargar la actualización');
        }
    } catch (error) {
        console.error('Error downloading update:', error);
        mainWindow.webContents.send('update-download-error', { error: error.message });
        
        dialog.showMessageBox(mainWindow, {
            type: 'error',
            title: 'Error de Actualización',
            message: 'No se pudo descargar la actualización',
            detail: error.message || 'Error desconocido',
            buttons: ['OK']
        });
    }
}

module.exports = {
    checkForUpdates,
    showUpdateDialog,
    downloadUpdate
};