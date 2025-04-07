const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');
const AdmZip = require('adm-zip');
const unrar = require('node-unrar-js');

async function extractRarFile(rarBuffer, destinationDir, keepArchive, savePath, progressCallback) {
    // Notificar que estamos extrayendo
    if (progressCallback) {
        progressCallback('extracting');
    }
    
    const extractor = await unrar.createExtractorFromData({ data: rarBuffer });
    const list = extractor.getFileList();
    const fileNames = [];
    for (const header of list.fileHeaders) {
        fileNames.push(header.name);
    }
    const extracted = extractor.extract({ files: fileNames });
    for (const file of extracted.files) {
        if (file.fileHeader.flags.directory) {
            continue;
        }
        const filePath = path.join(destinationDir, file.fileHeader.name);
        const dirPath = path.dirname(filePath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        if (file.extraction) {
            fs.writeFileSync(filePath, Buffer.from(file.extraction));
        }
    }
    if (!keepArchive) {
        fs.unlinkSync(savePath);
    }
    
    // Notificar que la extracción ha completado
    if (progressCallback) {
        progressCallback('completed');
    }
    
    return { success: true, path: destinationDir };
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
        const win = BrowserWindow.getFocusedWindow();
        win.webContents.downloadURL(url);

        win.webContents.session.once('will-download', (event, item) => {
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
                                
                                const zip = new AdmZip(savePath);
                                zip.extractAllTo(destinationDir, true);
                                if (!keepArchive) {
                                    fs.unlinkSync(savePath);
                                }
                                
                                // Notificar que la extracción ha completado
                                if (progressCallback) {
                                    progressCallback('completed');
                                }
                                
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

module.exports = {
  downloadAndExtract
};