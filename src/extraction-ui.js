// Controles de UI para manejar la extracciu00f3n de modpacks
const { ipcRenderer } = require('electron');

// Crear y gestionar un modal para mostrar el progreso de extracciu00f3n
class ExtractionUI {
    constructor() {
        this.modal = null;
        this.progressBar = null;
        this.statusText = null;
        this.fileInfo = null;
        this.cancelButton = null;
        this.isExtracting = false;
        this.createModal();
        this.setupEventListeners();
    }

    createModal() {
        // Crear el modal si no existe ya
        if (document.getElementById('extraction-modal')) return;

        // Crear elementos del modal
        this.modal = document.createElement('div');
        this.modal.id = 'extraction-modal';
        this.modal.className = 'extraction-modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'extraction-content';

        // Tu00edtulo
        const title = document.createElement('h2');
        title.className = 'extraction-title';
        title.innerHTML = `
            <div class="extraction-spinner"></div>
            Extrayendo Modpack
        `;

        // Detalles
        const details = document.createElement('div');
        details.className = 'extraction-details';

        this.statusText = document.createElement('div');
        this.statusText.className = 'extraction-status';
        this.statusText.textContent = 'Preparando archivos...';

        this.fileInfo = document.createElement('div');
        this.fileInfo.className = 'extraction-file-info';
        this.fileInfo.innerHTML = `<span>0 de 0 archivos</span><span>0%</span>`;

        // Barra de progreso
        const progressBarContainer = document.createElement('div');
        progressBarContainer.className = 'extraction-progress-bar';

        this.progressBar = document.createElement('div');
        this.progressBar.className = 'extraction-progress-fill';
        progressBarContainer.appendChild(this.progressBar);

        // Botu00f3n de cancelar (opcional)
        this.cancelButton = document.createElement('button');
        this.cancelButton.className = 'extraction-cancel';
        this.cancelButton.textContent = 'Minimizar';
        this.cancelButton.onclick = () => {
            // Minimizar la ventana para poder hacer otras cosas mientras se extrae
            ipcRenderer.send('minimize-window');
        };

        // Ensamblar elementos
        details.appendChild(this.statusText);
        details.appendChild(this.fileInfo);
        details.appendChild(progressBarContainer);

        modalContent.appendChild(title);
        modalContent.appendChild(details);
        modalContent.appendChild(this.cancelButton);

        this.modal.appendChild(modalContent);
        document.body.appendChild(this.modal);
    }

    setupEventListeners() {
        // Escuchar eventos de la extracciu00f3n desde el proceso principal
        ipcRenderer.on('extraction-progress', (_, data) => {
            this.updateProgress(data);
        });

        ipcRenderer.on('extraction-complete', () => {
            this.hideModal();
            this.isExtracting = false;
        });

        ipcRenderer.on('extraction-error', (_, message) => {
            this.statusText.textContent = `Error: ${message}`;
            this.progressBar.style.backgroundColor = '#ff3860';
            
            // Cambiar el botu00f3n a "Cerrar" despuu00e9s de un error
            this.cancelButton.textContent = 'Cerrar';
            this.cancelButton.onclick = () => this.hideModal();

            // Auto-ocultar despuu00e9s de 5 segundos
            setTimeout(() => this.hideModal(), 5000);
        });

        // Tecla Escape para minimizar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isExtracting) {
                ipcRenderer.send('minimize-window');
            }
        });
    }

    showModal() {
        this.isExtracting = true;
        if (this.modal) {
            this.modal.classList.add('active');
        }
    }

    hideModal() {
        if (this.modal) {
            this.modal.classList.remove('active');
        }
    }

    updateProgress(data) {
        if (!this.isExtracting) {
            this.showModal();
        }

        if (data.extracting) {
            // Actualizar texto de estado
            this.statusText.textContent = 'Extrayendo archivos...';
            
            // Actualizar informaciu00f3n de archivos
            if (data.filesProcessed && data.totalFiles) {
                const percent = Math.round((data.filesProcessed / data.totalFiles) * 100);
                this.fileInfo.innerHTML = `
                    <span>${data.filesProcessed} de ${data.totalFiles} archivos</span>
                    <span>${percent}%</span>
                `;
                this.progressBar.style.width = `${percent}%`;
            } else if (data.progress) {
                const percent = Math.round(data.progress * 100);
                this.fileInfo.innerHTML = `<span>Progreso</span><span>${percent}%</span>`;
                this.progressBar.style.width = `${percent}%`;
            }
        } else if (data === 'extracting') {
            this.statusText.textContent = 'Iniciando extracciu00f3n...';
            this.progressBar.style.width = '5%'; // Indicar que algo estu00e1 pasando
        }
    }
}

// Exportar la clase para usarla en otros archivos
module.exports = ExtractionUI;
