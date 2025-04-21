const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');
const AdmZip = require('adm-zip');
const unrar = require('node-unrar-js');
const { execSync, exec } = require('child_process');

async function extractRarFile(rarBuffer, destinationDir, keepArchive, savePath, progressCallback) {
    try {
        // Notificar que estamos extrayendo
        if (progressCallback) {
            progressCallback('extracting');
        }
        
        console.log('Iniciando extracción de archivo RAR...');
        
        // Enfoque por lotes para evitar bloquear la UI
        // Primero, obtener la lista de archivos
        const extractor = await unrar.createExtractorFromData({ data: rarBuffer });
        console.log('Obteniendo lista de archivos...');
        const list = extractor.getFileList();
        
        const fileNames = [];
        for (const header of list.fileHeaders) {
            fileNames.push(header.name);
        }
        
        console.log(`Extrayendo ${fileNames.length} archivos...`);
        
        // Configurar un intervalo para mostrar el progreso de extracción
        let filesProcessed = 0;
        const totalFiles = fileNames.length;
        
        // Crear un intervalo para actualizar el progreso
        let extractionInterval;
        
        // Extraer de forma no bloqueante usando setTimeout
        const extracted = extractor.extract();
        
        // Extraer archivos por lotes para no bloquear la UI
        if (progressCallback) {
            extractionInterval = setInterval(() => {
                const percentage = totalFiles > 0 ? filesProcessed / totalFiles : 0;
                progressCallback({ extracting: true, progress: percentage });
            }, 100); // Actualizar más frecuentemente
        }
        
        // Función para procesar archivos en pequeños lotes
        const processFilesInBatches = async () => {
            // Tamaño de batch pequeño para permitir actualizaciones más frecuentes de la UI
            const batchSize = 5;
            let currentIndex = 0;
            
            for (const file of extracted.files) {
                // Permitir que el bucle de eventos se ejecute cada cierto número de archivos
                if (currentIndex % batchSize === 0) {
                    await new Promise(resolve => setTimeout(resolve, 1));
                }
                
                if (file.fileHeader.flags.directory) {
                    filesProcessed++;
                    currentIndex++;
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
                
                filesProcessed++;
                currentIndex++;
                
                // Registrar progreso periódicamente
                if (filesProcessed % 25 === 0) {
                    console.log(`Procesados ${filesProcessed} de ${totalFiles} archivos (${Math.round(filesProcessed / totalFiles * 100)}%)...`);
                }
            }
            
            console.log('Procesamiento de archivos completado.');
        };
        
        // Iniciar el procesamiento por lotes
        await processFilesInBatches();
        
        // Eliminar el archivo comprimido si es necesario
        if (!keepArchive && fs.existsSync(savePath)) {
            fs.unlinkSync(savePath);
        }
        
        // Detener el intervalo de actualizaciones
        if (extractionInterval) {
            clearInterval(extractionInterval);
        }
        
        // Notificar que la extracción ha completado
        if (progressCallback) {
            progressCallback('completed');
        }
        
        console.log('Extracción de RAR completada exitosamente');
        return { success: true, path: destinationDir };
    } catch (error) {
        console.error('Error durante la extracción de RAR:', error);
        
        // Detener el intervalo en caso de error
        if (typeof extractionInterval !== 'undefined') {
            clearInterval(extractionInterval);
        }
        
        // Notificar el error
        if (progressCallback) {
            progressCallback('error');
        }
        
        throw error;
    }
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
        
        // Usar un enfoque más robusto para descargas de Oracle
        const isOracleDownload = url.includes('download.oracle.com');
        
        // Si es una descarga de Oracle, usar un enfoque alternativo
        if (isOracleDownload) {
            // Limpiar el timeout ya que vamos a usar un método alternativo
            clearTimeout(downloadTimeout);
            console.log('Detectada descarga de Oracle, usando método alternativo...');
            
            // Usar fetch para descargar directamente
            const https = require('https');
            const http = require('http');
            const { URL } = require('url');
            
            // Crear directorio de destino si no existe
            if (!fs.existsSync(destinationDir)) {
                fs.mkdirSync(destinationDir, { recursive: true });
            }
            
            // Determinar el nombre del archivo
            // Si saveAs es una ruta completa, extraer solo el nombre del archivo
            let fileName;
            if (saveAs) {
                // Verificar si saveAs ya contiene una ruta completa
                if (path.isAbsolute(saveAs) || saveAs.includes('/') || saveAs.includes('\\')) {
                    // Extraer solo el nombre del archivo de la ruta
                    fileName = path.basename(saveAs);
                } else {
                    fileName = saveAs;
                }
            } else {
                fileName = url.split('/').pop();
            }
            const savePath = path.join(destinationDir, fileName);
            
            // Notificar inicio de descarga
            if (progressCallback) {
                progressCallback(0.01); // Iniciar con un pequeño progreso para mostrar actividad
            }
            
            // Función para manejar redirecciones
            const downloadWithRedirects = (currentUrl, redirectCount = 0) => {
                if (redirectCount > 5) {
                    return reject(new Error('Demasiadas redirecciones'));
                }
                
                console.log(`Intentando descargar desde: ${currentUrl}`);
                
                const urlObj = new URL(currentUrl);
                const protocol = urlObj.protocol === 'https:' ? https : http;
                
                const options = {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'application/octet-stream'
                    }
                };
                
                const req = protocol.get(currentUrl, options, (res) => {
                    // Manejar redirecciones
                    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                        console.log(`Redirigiendo a: ${res.headers.location}`);
                        return downloadWithRedirects(res.headers.location, redirectCount + 1);
                    }
                    
                    // Verificar si la respuesta es exitosa
                    if (res.statusCode !== 200) {
                        return reject(new Error(`Error de descarga: ${res.statusCode}`));
                    }
                    
                    // Obtener el tamaño total si está disponible
                    const totalBytes = parseInt(res.headers['content-length'], 10) || 0;
                    let receivedBytes = 0;
                    
                    // Crear el archivo de salida
                    const fileStream = fs.createWriteStream(savePath);
                    
                    // Manejar eventos de datos
                    res.on('data', (chunk) => {
                        receivedBytes += chunk.length;
                        
                        // Actualizar progreso
                        if (progressCallback && totalBytes > 0) {
                            const progress = receivedBytes / totalBytes;
                            progressCallback(progress);
                        }
                    });
                    
                    // Manejar finalización
                    res.pipe(fileStream);
                    
                    fileStream.on('finish', async () => {
                        fileStream.close();
                        console.log('Descarga completada con éxito');
                        // Asegurarse de que el timeout esté cancelado
                        clearTimeout(downloadTimeout);
                        
                        try {
                            // Verificar el tipo de archivo y extraer
                            const headerBuffer = Buffer.alloc(10);
                            const fd = fs.openSync(savePath, 'r');
                            fs.readSync(fd, headerBuffer, 0, 10, 0);
                            fs.closeSync(fd);
                            
                            // Convertir a hexadecimal para identificación
                            const signature = headerBuffer.toString('hex', 0, 4).toUpperCase();
                            console.log('File signature:', signature);
                            
                            // Verificar extensión del archivo
                            const fileExt = path.extname(savePath).toLowerCase();
                            
                            // Extraer según el tipo de archivo
                            if (signature === '504B0304') {
                                console.log('Extracting ZIP file...');
                                try {
                                    const zip = new AdmZip(savePath);
                                    
                                    // Notificar que estamos extrayendo
                                    if (progressCallback) {
                                        progressCallback('extracting');
                                    }
                                    
                                    zip.extractAllTo(destinationDir, true);
                                    
                                    // Eliminar el archivo comprimido si es necesario
                                    if (!keepArchive && fs.existsSync(savePath)) {
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
                            } else if (signature === '1F8B0800' || fileExt === '.gz' || fileExt === '.tar.gz') {
                                console.log('Extracting tar.gz file...');
                                try {
                                    const result = await extractTarGz(savePath, destinationDir, keepArchive, progressCallback);
                                    resolve(result);
                                } catch (error) {
                                    throw new Error(`tar.gz extraction failed: ${error.message}`);
                                }
                            } else {
                                throw new Error(`Unsupported archive format. Signature: ${signature}, Extension: ${fileExt}`);
                            }
                        } catch (error) {
                            reject(new Error(`Extraction failed: ${error.message}`));
                        }
                    });
                    
                    fileStream.on('error', (error) => {
                        fs.unlink(savePath, () => {}); // Eliminar archivo parcial
                        clearTimeout(downloadTimeout); // Limpiar el timeout en caso de error
                        reject(error);
                    });
                });
                
                req.on('error', (error) => {
                    console.error('Error en la solicitud:', error);
                    reject(error);
                });
                
                // Asegurarse de que el timeout esté cancelado en caso de error
                req.on('abort', () => {
                    console.log('Solicitud abortada, limpiando timeout');
                    clearTimeout(downloadTimeout);
                });
                
                // Establecer un timeout para la solicitud
                req.setTimeout(30000, () => {
                    req.abort();
                    reject(new Error('Timeout de descarga'));
                });
            };
            
            // Iniciar la descarga con manejo de redirecciones
            downloadWithRedirects(url);
            return;
        }
        
        // Para descargas normales, usar el método estándar
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
            // Si saveAs es una ruta completa, extraer solo el nombre del archivo
            let fileName;
            if (saveAs) {
                // Verificar si saveAs ya contiene una ruta completa
                if (path.isAbsolute(saveAs) || saveAs.includes('/') || saveAs.includes('\\')) {
                    // Extraer solo el nombre del archivo de la ruta
                    fileName = path.basename(saveAs);
                } else {
                    fileName = saveAs;
                }
            } else {
                fileName = item.getFilename();
            }
            const savePath = path.join(destinationDir, fileName);
            item.setSavePath(savePath);

            item.once('done', async (event, state) => {
                if (state === 'completed') {
                    try {
                        if (fs.existsSync(savePath)) {
                            // Leer las primeras bytes del archivo para identificar el tipo
                            const headerBuffer = Buffer.alloc(10);
                            const fd = fs.openSync(savePath, 'r');
                            fs.readSync(fd, headerBuffer, 0, 10, 0);
                            fs.closeSync(fd);
                            
                            // Convertir a hexadecimal para identificación
                            const signature = headerBuffer.toString('hex', 0, 4).toUpperCase();
                            console.log('File signature:', signature);
                            
                            // Verificar extensión del archivo
                            const fileExt = path.extname(savePath).toLowerCase();
                            
                            // Extraer según el tipo de archivo
                            if (signature === '504B0304') {
                                console.log('Extracting ZIP file...');
                                try {
                                    const zip = new AdmZip(savePath);
                                    
                                    // Notificar que estamos extrayendo
                                    if (progressCallback) {
                                        progressCallback('extracting');
                                    }
                                    
                                    zip.extractAllTo(destinationDir, true);
                                    
                                    // Eliminar el archivo comprimido si es necesario
                                    if (!keepArchive && fs.existsSync(savePath)) {
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
                            } else if (signature === '1F8B0800' || fileExt === '.gz' || fileExt === '.tar.gz') {
                                console.log('Extracting tar.gz file...');
                                try {
                                    const result = await extractTarGz(savePath, destinationDir, keepArchive, progressCallback);
                                    resolve(result);
                                } catch (error) {
                                    throw new Error(`tar.gz extraction failed: ${error.message}`);
                                }
                            } else {
                                throw new Error(`Unsupported archive format. Signature: ${signature}, Extension: ${fileExt}`);
                            }
                        } else {
                            // Notificar que la descarga ha completado
                            if (progressCallback) {
                                progressCallback('completed');
                            }
                            resolve({ success: true, path: destinationDir });
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

// Función para extraer archivos tar.gz (para Linux)
async function extractTarGz(filePath, destinationDir, keepArchive = false, progressCallback = null) {
    return new Promise((resolve, reject) => {
        try {
            // Notificar que estamos extrayendo
            if (progressCallback) {
                progressCallback('extracting');
            }
            
            console.log(`Extrayendo archivo tar.gz: ${filePath} a ${destinationDir}`);
            
            // Crear la carpeta de destino si no existe
            if (!fs.existsSync(destinationDir)) {
                fs.mkdirSync(destinationDir, { recursive: true });
            }
            
            // Usar tar para extraer (comando nativo en sistemas Linux)
            const command = `tar -xzf "${filePath}" -C "${destinationDir}"`;
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error al extraer tar.gz: ${error}`);
                    reject(error);
                    return;
                }
                
                console.log('Extracción de tar.gz completada exitosamente');
                
                // Eliminar el archivo comprimido si es necesario
                if (!keepArchive && fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                
                // Notificar que la extracción ha completado
                if (progressCallback) {
                    progressCallback('completed');
                }
                
                resolve({ success: true, path: destinationDir });
            });
        } catch (error) {
            console.error('Error durante la extracción de tar.gz:', error);
            
            // Notificar el error
            if (progressCallback) {
                progressCallback('error');
            }
            
            reject(error);
        }
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