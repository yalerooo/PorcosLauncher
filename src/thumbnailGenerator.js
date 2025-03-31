const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * Genera miniaturas para todas las imágenes en la carpeta backgrounds
 * y las guarda en la carpeta thumbnail con el mismo nombre
 */
async function generateThumbnails() {
    try {
        const thumbnailPath = path.join(__dirname, '..', 'assets', 'thumbnail');
        
        // Crear la carpeta thumbnail si no existe
        if (!fs.existsSync(thumbnailPath)) {
            fs.mkdirSync(thumbnailPath, { recursive: true });
            console.log('Carpeta thumbnail creada');
        }
        
        // Ya no generamos miniaturas automáticamente
        // Las miniaturas serán creadas manualmente por el usuario
        
        console.log('Verificación de carpeta de miniaturas completada');
        return true;
    } catch (error) {
        console.error('Error verificando carpeta de miniaturas:', error);
        return false;
    }
}

module.exports = { generateThumbnails };