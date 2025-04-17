const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');
const AdmZip = require('adm-zip');
const unrar = require('node-unrar-js');
const { Worker } = require('worker_threads');

async function extractRarFile(rarBuffer, destinationDir, keepArchive, savePath, progressCallback) {
    return new Promise((resolve, reject) => {
        try {
            // Notificar que estamos extrayendo
            if (progressCallback) {
                progressCallback('extracting');
            }
            
            console.log('Iniciando extracción de archivo RAR en segundo plano...');
            
            // Crear un trabajador para manejar la extracción en segundo plano
            const { app } = require('electron');
            const workerPath = path.join(app.getAppPath(), 'src', 'extraction-worker.js');
            const worker = new Worker(workerPath, {
                workerData: {
                    rarBuffer,
                    destinationDir
                }
            });
            
            // Escuchar mensajes del trabajador
            worker.on('message', (message) => {
                switch(message.type) {
                    case 'status':
                        console.log(message.message);
                        break;
                    
                    case 'progress':
                        console.log(`Procesados ${message.filesProcessed} de ${message.totalFiles} archivos (${message.percentComplete}%)...`);
                        if (progressCallback) {
                            progressCallback({ 
                                extracting: true, 
                                progress: message.filesProcessed / message.totalFiles,
                                filesProcessed: message.filesProcessed,
                                totalFiles: message.totalFiles
                            });
                        }
                        break;
                    
                    case 'complete':
                        console.log(message.message);
                        
                        // Eliminar el archivo RAR si no queremos conservarlo
                        if (!keepArchive && fs.existsSync(savePath)) {
                            fs.unlinkSync(savePath);
                        }
                        
                        // Notificar que la extracción ha completado
                        if (progressCallback) {
                            progressCallback('completed');
                        }
                        
                        resolve({ success: true, path: message.path });
                        break;
                    
                    case 'error':
                        console.error(message.message);
                        if (progressCallback) {
                            progressCallback('error');
                        }
                        reject(new Error(message.message));
                        break;
                }
            });
            
            // Manejar errores del trabajador
            worker.on('error', (err) => {
                console.error('Error en el trabajador de extracción:', err.message);
                if (progressCallback) {
                    progressCallback('error');
                }
                reject(err);
            });
            
            // Manejar terminación del trabajador
            worker.on('exit', (code) => {
                if (code !== 0) {
                    console.error(`El trabajador de extracción terminó con código de salida ${code}`);
                    if (progressCallback) {
                        progressCallback('error');
                    }
                    reject(new Error(`Proceso de extracción terminado con código: ${code}`));
                }
            });
            
        } catch (error) {
            console.error('Error al iniciar la extracción de RAR:', error);
            // Notificar el error
            if (progressCallback) {
                progressCallback('error');
            }
            reject(error);
        }
    });
}

async function downloadAndExtract(url, destinationDir, keepArchive = false, saveAs = null, progressCallback = null) {
    // Convertir url a array si es una cadena
    const urls = Array.isArray(url) ? url : [url];
    
    // Resultado final
    let finalResult = { success: true, path: destinationDir };
    
    // Procesar cada URL secuencialmente
    for (let i = 0; i < urls.length; i++) {
        const currentUrl = urls[i];
        const currentIndex = i;
        const totalUrls = urls.length;
        
        try {
            // Notificar progreso de múltiples archivos
            if (progressCallback && totalUrls > 1) {
                progressCallback({ multipart: true, current: currentIndex + 1, total: totalUrls, status: 'downloading' });
            }
            
            // Descargar y extraer el archivo actual
            const result = await downloadSingleFile(currentUrl, destinationDir, keepArchive, saveAs, progressCallback);
            
            // Si hay un error en cualquier archivo, fallar toda la operación
            if (!result.success) {
                return result;
            }
            
            // Actualizar el resultado con información adicional si es necesario
            if (result.isExecutable) {
                finalResult.isExecutable = true;
                finalResult.filePath = result.filePath;
            }
        } catch (error) {
            return { success: false, error: `Error en parte ${currentIndex + 1}/${totalUrls}: ${error.message}` };
        }
    }
    
    return finalResult;
}

async function downloadSingleFile(url, destinationDir, keepArchive = false, saveAs = null, progressCallback = null) {
    return new Promise((resolve, reject) => {
        // Usar la ventana principal en lugar de la ventana enfocada para evitar problemas cuando se minimiza
        const win = mainWindow || BrowserWindow.getAllWindows()[0] || BrowserWindow.getFocusedWindow();
        if (!win) {
            return reject(new Error('No se pudo obtener una referencia a la ventana'));
        }
        
        // Configurar un timeout para detectar si la descarga no inicia
        const downloadTimeout = setTimeout(() => {
            console.log('Timeout de descarga alcanzado, reintentando...');
            try {
                win.webContents.downloadURL(url);
            } catch (error) {
                console.error('Error al reintentar descarga:', error);
            }
        }, 30000); // 30 segundos
        
        win.webContents.downloadURL(url);

        win.webContents.session.once('will-download', (event, item) => {
            // Limpiar el timeout de descarga ya que la descarga ha comenzado
            clearTimeout(downloadTimeout);
            // Set up progress reporting
            if (progressCallback) {
                item.on('updated', (event, state) => {
                    if (state === 'progressing') {
                        const received = item.getReceivedBytes();
                        const total = item.getTotalBytes();
                        // Enviar progreso como decimal (0-1) en lugar de porcentaje (0-100)
                        const progress = total > 0 ? received / total : 0;
                        progressCallback(progress);
                    }
                });
            }
            let fileName = saveAs || item.getFilename();
            const savePath = path.join(destinationDir, fileName);
            item.setSavePath(savePath);

            item.once('done', async (event, state) => {
                if (state === 'completed') {
                    try {
                        const buffer = Buffer.alloc(4);
                        const fd = fs.openSync(savePath, 'r');
                        fs.readSync(fd, buffer, 0, 4, 0);
                        fs.closeSync(fd);

                        const signature = buffer.toString('hex').toUpperCase();
                        console.log(`File signature: ${signature}`);

                        if (signature.startsWith('4D5A')) {
                            console.log('Detected EXE file, keeping for installation...');
                            try {
                                // Notificar que la descarga ha completado
                                if (progressCallback) {
                                    progressCallback('completed');
                                }
                                // Don't execute the file, just keep it for later installation
                                resolve({ success: true, path: destinationDir, filePath: savePath, isExecutable: true });
                            } catch (error) {
                                throw new Error(`EXE execution failed: ${error.message}`);
                            }
                        } else if (['504B0304', '504B0506'].includes(signature)) {
                            console.log('Extracting ZIP file...');
                            try {
                                // Notificar que estamos extrayendo
                                if (progressCallback) {
                                    progressCallback('extracting');
                                }
                                
                                // Configurar un intervalo para enviar actualizaciones periódicas
                                const extractionInterval = setInterval(() => {
                                    if (progressCallback) {
                                        progressCallback('extracting');
                                    }
                                }, 2000); // Cada 2 segundos
                                
                                console.log('Iniciando extracción de archivo ZIP...');
                                const zip = new AdmZip(savePath);
                                
                                // Obtener la lista de entradas para poder mostrar progreso
                                const zipEntries = zip.getEntries();
                                console.log(`Extrayendo ${zipEntries.length} archivos...`);
                                
                                // Extraer todos los archivos
                                zip.extractAllTo(destinationDir, true);
                                
                                if (!keepArchive) {
                                    fs.unlinkSync(savePath);
                                }
                                
                                // Detener el intervalo de actualizaciones
                                clearInterval(extractionInterval);
                                
                                // Notificar que la extracción ha completado
                                if (progressCallback) {
                                    progressCallback('completed');
                                }
                                
                                console.log('Extracción de ZIP completada exitosamente');
                                resolve({ success: true, path: destinationDir });
                            } catch (error) {
                                throw new Error(`ZIP extraction failed: ${error.message}`);
                            }
                        } else if (signature === '52617221') {
                            console.log('Extracting RAR file...');
                            try {
                                const rarBuffer = fs.readFileSync(savePath);
                                const result = await extractRarFile(rarBuffer, destinationDir, keepArchive, savePath, progressCallback);
                                resolve(result);
                            } catch (error) {
                                throw new Error(`RAR extraction failed: ${error.message}`);
                            }
                        } else {
                            throw new Error(`Unsupported archive format. Signature: ${signature}`);
                        }
                    } catch (error) {
                        reject(new Error(`Extraction failed: ${error.message}`));
                    }
                } else if (state === 'interrupted') {
                    console.log('Download interrupted, retrying...');
                    item.resume();
                } else {
                    reject(new Error(`Download failed: ${state}`));
                }
            });
        });
    });
}


// Variable global para mantener referencia a la ventana principal
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    show: false
  });

  mainWindow.loadFile('index.html');

  return mainWindow;
}

app.whenReady().then(() => {
  mainWindow = createWindow();

  const args = process.argv.slice(2);
  if (args.length > 0) {
    const downloadLink = args[0];
    console.log('Enlace proporcionado:', downloadLink);
    if (downloadLink.includes('drive.google.com')) {
      handleGoogleDriveWarning(downloadLink);
    } else if (downloadLink.includes('mediafire.com')) {
      handleMediafireDownload(downloadLink);
    } else {
      console.log('El enlace proporcionado no es de Google Drive ni Mediafire.');
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('download-status', 'El enlace proporcionado no es compatible.');
      }
    }
  } else {
    console.log('No se proporcionó ningún enlace.');
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('download-status', 'No se proporcionó ningún enlace.');
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

async function handleGoogleDriveWarning(driveLink) {
  mainWindow.loadURL(driveLink);

  mainWindow.webContents.on('did-finish-load', async () => {
    console.log('Página de Google Drive cargada.');
    const script = `
      const buttons = document.querySelectorAll('input.jfk-button-action');
      for (const button of buttons) {
        if (button.value === 'Descargar de todos modos') {
          button.click();
          break;
        }
      }
    `;
    try {
      await mainWindow.webContents.executeJavaScript(script);
      console.log('Se intentó hacer clic en el botón de descarga de Google Drive.');
    } catch (error) {
      console.error('Error al intentar hacer clic en el botón de Google Drive:', error);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('download-status', 'Error al interactuar con la página de descarga de Google Drive.');
      }
    }
  });
}

async function handleMediafireDownload(mediafireLink) {
  mainWindow.loadURL(mediafireLink);

  mainWindow.webContents.on('did-finish-load', async () => {
    console.log('Página de Mediafire cargada.');
    const script = `
      const downloadButton = document.querySelector('a#downloadButton');
      if (downloadButton) {
        downloadButton.click();
      } else {
        console.log('No se encontró el botón de descarga en Mediafire.');
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('download-status', 'No se encontró el botón de descarga en Mediafire.');
        }
      }
    `;
    try {
      await mainWindow.webContents.executeJavaScript(script);
      console.log('Se intentó hacer clic en el botón de descarga de Mediafire.');
    } catch (error) {
      console.error('Error al intentar hacer clic en el botón de Mediafire:', error);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('download-status', 'Error al interactuar con la página de descarga de Mediafire.');
      }
    }
  });
}

app.on('will-download', (event, item, webContents) => {
  const suggestedFilename = item.getFilename();
  const downloadPath = path.join(app.getPath('downloads'), suggestedFilename);

  event.preventDefault();
  item.setSavePath(downloadPath);

  item.on('updated', (event, state) => {
    if (state === 'progressing') {
      const received = item.getReceivedBytes();
      const total = item.getTotalBytes();
      const progress = total > 0 ? (received / total) * 100 : 0;
      console.log(`Descargando: ${progress.toFixed(2)}%`);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('download-status', `Descargando: ${progress.toFixed(2)}%`);
      }
    }
  });

  item.once('done', async (event, state) => {
    if (state === 'completed') {
      console.log('Descarga completada en:', downloadPath);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('download-status', `Descarga completada en: ${downloadPath}`);
      }
    } else if (state === 'interrupted') {
      console.log('Download interrupted, retrying...');
      item.resume();
    } else {
      reject(new Error(`Download failed: ${state}`));
    }
  });

  item.resume();
});

// Función para establecer la referencia a la ventana principal desde otros módulos
function setMainWindow(window) {
  mainWindow = window;
}

module.exports = {
  downloadAndExtract,
  setMainWindow
};