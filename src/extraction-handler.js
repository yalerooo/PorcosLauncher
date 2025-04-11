// Controlador centralizado para manejar los procesos de extracciu00f3n
const { BrowserWindow } = require('electron');

// Variable para mantener la referencia a la ventana principal
let mainWindow = null;

// Funciones para manejar la comunicación de eventos de progreso
function sendExtractionProgress(data) {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('extraction-progress', data);
    }
}

function sendExtractionComplete() {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('extraction-complete');
    }
}

function sendExtractionError(message) {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('extraction-error', message);
    }
}

// Configurar la función de progreso para ser enviada a la interfaz de usuario
function createProgressHandler() {
    return (progress) => {
        if (progress === 'extracting') {
            sendExtractionProgress('extracting');
        } else if (progress === 'completed') {
            sendExtractionComplete();
        } else if (progress === 'error') {
            sendExtractionError('Ocurrió un error durante la extracción');
        } else if (progress && progress.extracting) {
            sendExtractionProgress(progress);
        }
    };
}

// Establecer la referencia a la ventana principal
function setMainWindow(window) {
    mainWindow = window;
}

module.exports = {
    setMainWindow,
    createProgressHandler,
    sendExtractionProgress,
    sendExtractionComplete,
    sendExtractionError
};
