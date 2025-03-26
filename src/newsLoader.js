// newsLoader.js - Puente para cargar el módulo de noticias

// Importar el módulo de noticias directamente desde el archivo
// No usamos require() porque no está disponible en el navegador

// Definimos un objeto global para almacenar las funciones
window.githubNewsUI = {};

// Cargamos el módulo de noticias usando fetch y eval (alternativa a require)
fetch('./src/news.js')
    .then(response => response.text())
    .then(code => {
        // Envolvemos el código en una función para evitar contaminación del ámbito global
        const moduleFunction = new Function('exports', code + '\nreturn exports;');
        const newsModule = moduleFunction({});
        
        // Asignamos las funciones exportadas al objeto global
        window.githubNewsUI.loadNews = newsModule.loadNews;
        window.githubNewsUI.fetchNews = newsModule.fetchNews;
    })
    .catch(error => {
        console.error('Error al cargar el módulo de noticias:', error);
    });

// Cargar noticias automáticamente cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    // Esperar un momento para asegurar que los contenedores estén listos y que el módulo esté cargado
    setTimeout(() => {
        // Verificamos que la función loadNews esté disponible en el objeto global
        if (window.githubNewsUI && typeof window.githubNewsUI.loadNews === 'function') {
            window.githubNewsUI.loadNews().catch(error => {
                console.error('Error al cargar noticias:', error);
            });
        } else {
            console.error('El módulo de noticias aún no está cargado');
        }
    }, 1000); // Aumentamos el tiempo de espera para asegurar que el módulo esté cargado
});