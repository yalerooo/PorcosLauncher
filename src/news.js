// news.js - Module for fetching and displaying news

// URLs for fetching news data and images
const NEWS_JSON_URL = "https://raw.githubusercontent.com/yalerooo/myApis/refs/heads/main/porcosLauncher/news.json";
const NEWS_IMAGES_BASE_URL = "https://raw.githubusercontent.com/yalerooo/myApis/main/porcosLauncher/images/";
const DEFAULT_IMAGE_PATH = "assets/default/default.jpg";

// Function to fetch news data from GitHub
async function fetchNews() {
    try {
        const response = await fetch(NEWS_JSON_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch news: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching news:", error);
        return [];
    }
}

// Function to format date in a readable format
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Function to create a news card element
function createNewsCard(newsItem) {
    const card = document.createElement("div");
    card.classList.add("news-card");
    
    // Create image section with date overlay
    const imageUrl = `${NEWS_IMAGES_BASE_URL}${newsItem.image}`;
    const imageSection = document.createElement("div");
    imageSection.classList.add("news-card-image");
    
    // Set initial background image with error handling
    const img = new Image();
    img.onload = () => {
        imageSection.style.backgroundImage = `url('${imageUrl}')`;
    };
    img.onerror = () => {
        imageSection.style.backgroundImage = `url('${DEFAULT_IMAGE_PATH}')`;
        console.warn(`Failed to load news image: ${imageUrl}, using default image instead`);
    };
    img.src = imageUrl;
    
    // Set default image initially while the actual image loads
    imageSection.style.backgroundImage = `url('${DEFAULT_IMAGE_PATH}')`;
    
    const dateElement = document.createElement("div");
    dateElement.classList.add("news-card-date");
    dateElement.textContent = formatDate(newsItem.date);
    imageSection.appendChild(dateElement);
    
    // Create content section
    const contentSection = document.createElement("div");
    contentSection.classList.add("news-card-content");
    
    const title = document.createElement("h3");
    title.classList.add("news-card-title");
    title.textContent = newsItem.title;
    
    const text = document.createElement("div");
    text.classList.add("news-card-text");
    // Strip HTML tags for the preview text
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = newsItem.content;
    text.textContent = tempDiv.textContent || tempDiv.innerText || "";
    
    const button = document.createElement("a");
    button.classList.add("news-card-button");
    button.textContent = "Open";
    button.href = "#";
    button.addEventListener("click", (e) => {
        e.preventDefault();
        showNewsModal(newsItem);
    });
    
    contentSection.appendChild(title);
    contentSection.appendChild(text);
    contentSection.appendChild(button);
    
    card.appendChild(imageSection);
    card.appendChild(contentSection);
    
    return card;
}

// Function to create a major update card
function createMajorUpdateCard(updateItem) {
    const card = document.createElement("div");
    card.classList.add("update-card");
    
    // Set background image with error handling
    const imageUrl = `${NEWS_IMAGES_BASE_URL}${updateItem.image}`;
    
    // Set default image initially
    card.style.backgroundImage = `url('${DEFAULT_IMAGE_PATH}')`;
    
    // Try to load the actual image
    const img = new Image();
    img.onload = () => {
        card.style.backgroundImage = `url('${imageUrl}')`;
    };
    img.onerror = () => {
        console.warn(`Failed to load update image: ${imageUrl}, using default image instead`);
        // Default image is already set
    };
    img.src = imageUrl;
    
    // Create overlay with title and subtitle
    const overlay = document.createElement("div");
    overlay.classList.add("update-overlay");
    
    const title = document.createElement("div");
    title.classList.add("update-title");
    title.textContent = updateItem.title;
    
    const subtitle = document.createElement("div");
    subtitle.classList.add("update-subtitle");
    subtitle.textContent = updateItem.subtitle || formatDate(updateItem.date);
    
    overlay.appendChild(title);
    overlay.appendChild(subtitle);
    
    // Create button
    const button = document.createElement("a");
    button.classList.add("news-update-button");
    button.href = "#";
    button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
    `;
    button.addEventListener("click", (e) => {
        e.preventDefault();
        showNewsModal(updateItem);
    });
    
    card.appendChild(overlay);
    card.appendChild(button);
    
    return card;
}

// Function to show a modal with the full news content
function showNewsModal(newsItem) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('newsModal');
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "newsModal";
        modal.classList.add("modal");
        
        const modalContent = document.createElement("div");
        modalContent.classList.add("modal-content");
        
        const closeButton = document.createElement("span");
        closeButton.classList.add("close-button");
        closeButton.innerHTML = "&times;";
        closeButton.addEventListener("click", () => {
            modal.style.display = "none";
        });
        
        const modalTitle = document.createElement("h2");
        modalTitle.id = "news-modal-title";
        
        const modalDate = document.createElement("div");
        modalDate.id = "news-modal-date";
        modalDate.classList.add("news-modal-date");
        
        const modalContent2 = document.createElement("div");
        modalContent2.id = "news-modal-content";
        
        modalContent.appendChild(closeButton);
        modalContent.appendChild(modalTitle);
        modalContent.appendChild(modalDate);
        modalContent.appendChild(modalContent2);
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        window.addEventListener("click", (event) => {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        });
    }
    
    // Update modal content
    document.getElementById("news-modal-title").textContent = newsItem.title;
    document.getElementById("news-modal-date").textContent = formatDate(newsItem.date);
    document.getElementById("news-modal-content").innerHTML = newsItem.content;
    
    // Show modal
    modal.style.display = "block";
}

// Function to load and display news
async function loadNews() {
    const newsContainer = document.getElementById("news-container");
    const majorUpdatesContainer = document.getElementById("major-updates-container");
    
    if (!newsContainer || !majorUpdatesContainer) {
        console.error("News containers not found in the DOM");
        return;
    }
    
    try {
        const newsData = await fetchNews();
        
        if (newsData && newsData.length > 0) {
            // Clear existing content
            newsContainer.innerHTML = "";
            majorUpdatesContainer.innerHTML = "";
            
            // Filter news by type
            const regularNews = newsData
                .filter(item => !item.type || item.type === 'news')
                .slice(0, 8)
                .reverse(); // Invertir el orden para que las más recientes aparezcan primero
                
            regularNews.forEach(newsItem => {
                const newsCard = createNewsCard(newsItem);
                newsContainer.appendChild(newsCard);
            });
            
            // Filter major updates by type
            const majorUpdates = newsData
                .filter(item => item.type === 'major_update')
                .slice(0, 20)
                .reverse(); // Invertir el orden para que las más recientes aparezcan primero
                
            if (majorUpdates.length > 0) {
                majorUpdates.forEach(updateItem => {
                    const updateCard = createMajorUpdateCard(updateItem);
                    majorUpdatesContainer.appendChild(updateCard);
                });
            }
        } else {
            console.warn("No news data available");
        }
    } catch (error) {
        console.error("Error loading news:", error);
    }
}

// Export functions for use in other modules
// Cambiamos module.exports por una asignación directa al objeto exports
// que será capturado por la función en newsLoader.js
exports.loadNews = loadNews;
exports.fetchNews = fetchNews;