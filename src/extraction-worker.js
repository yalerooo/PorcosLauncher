// Trabajador para manejar las extracciones de archivos en segundo plano
const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const unrar = require('node-unrar-js');

async function extractRarFile(rarBuffer, destinationDir) {
    try {
        // Iniciar proceso de extraccin
        parentPort.postMessage({ type: 'status', message: 'Iniciando extraccin de archivo RAR...' });
        
        const extractor = await unrar.createExtractorFromData({ data: rarBuffer });
        parentPort.postMessage({ type: 'status', message: 'Obteniendo lista de archivos...' });
        
        const list = extractor.getFileList();
        const fileNames = [];
        for (const header of list.fileHeaders) {
            fileNames.push(header.name);
        }
        
        parentPort.postMessage({ 
            type: 'status', 
            message: `Extrayendo ${fileNames.length} archivos...` 
        });
        
        let filesProcessed = 0;
        const totalFiles = fileNames.length;
        
        // Extraer los archivos
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
            
            filesProcessed++;
            
            // Informar sobre el progreso cada 10 archivos
            if (filesProcessed % 10 === 0) {
                const percentComplete = Math.round(filesProcessed / totalFiles * 100);
                parentPort.postMessage({ 
                    type: 'progress', 
                    filesProcessed, 
                    totalFiles, 
                    percentComplete 
                });
            }
        }
        
        // Completado
        parentPort.postMessage({ 
            type: 'complete', 
            message: 'Extraccin de RAR completada exitosamente',
            path: destinationDir 
        });
        
    } catch (error) {
        parentPort.postMessage({ 
            type: 'error', 
            message: `Error durante la extraccin: ${error.message}` 
        });
    }
}

// Iniciar extraccin al recibir los datos del hilo principal
try {
    const { rarBuffer, destinationDir } = workerData;
    extractRarFile(rarBuffer, destinationDir);
} catch (err) {
    parentPort.postMessage({ 
        type: 'error', 
        message: `Error al iniciar el trabajador: ${err.message}` 
    });
}
