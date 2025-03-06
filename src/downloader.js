const https = require('https'); // O 'http'
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

async function downloadAndExtract(url, destinationFolder) {
    return new Promise((resolve, reject) => {
        function handleRequest(currentUrl, redirectCount = 0, maxRedirects = 5) {
            if (redirectCount > maxRedirects) {
                reject(new Error(`Demasiadas redirecciones (${maxRedirects})`));
                return;
            }

            const request = https.get(currentUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
                }
            }, (response) => {
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    // Descarga y extracción directa con unzipper
                    response.pipe(unzipper.Extract({ path: destinationFolder }))
                        .on('close', () => {
                            console.log('Archivo ZIP descargado y extraído correctamente.');
                            resolve({ success: true });
                        })
                        .on('error', (err) => {
                            console.error('Error al extraer con unzipper:', err);
                            reject({ success: false, error: 'Error al extraer el ZIP: ' + err.message });
                        });

                } else if (response.statusCode >= 300 && response.statusCode < 400) {
                    // Redirección
                    const newURL = response.headers.location;
                    if (!newURL) {
                        reject(new Error(`Redirección sin URL (código ${response.statusCode})`));
                        return;
                    }
                    console.log(`Redirigiendo a: ${newURL}`);
                    handleRequest(newURL, redirectCount + 1); // Llamada recursiva

                } else if (response.statusCode === 404) {
                     reject({ success: false, error: `Error 404: Recurso no encontrado en ${currentUrl}` });

                }else {
                    reject({ success: false, error: `Error al descargar mods (código ${response.statusCode})` });
                }
            });

            request.on('error', (err) => {
                console.error("Error de conexión:", err);
                reject({ success: false, error: 'Error de conexión: ' + err.message });
            });
        }

        handleRequest(url); // Inicia la petición
    });
}


module.exports = { downloadAndExtract };