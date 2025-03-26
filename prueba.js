const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https'); //For TLS/SSL options

// Configuration for retries and delays
const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000; // 1 second
const PROXY_URL = null; // Replace with your proxy URL if needed (e.g., 'http://user:pass@host:port')

async function scrapeMinecraftNews() {
  const url = 'https://www.minecraft.net/en-us/articles';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const axiosConfig = {
        httpsAgent: new https.Agent({  //Handle TLS/SSL issues
          rejectUnauthorized: false,  //Disable certificate verification (use with caution!)
        }),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MyScraper/1.0; +http://example.com)', // Add a descriptive User-Agent
        },
        timeout: 10000, // Set a timeout (10 seconds) to prevent indefinite hanging
      };

      if (PROXY_URL) {
        const proxyUrl = new URL(PROXY_URL);
        axiosConfig.proxy = {
          host: proxyUrl.hostname,
          port: parseInt(proxyUrl.port),
          username: proxyUrl.username,
          password: proxyUrl.password,
        };
      }

      const response = await axios.get(url, axiosConfig);
      const html = response.data;
      const $ = cheerio.load(html);

      const newsItems = [];
      let idCounter = 1;

      $('ul.MC_imageGridA_grid > li.MC_imageGridA_tile').each((index, element) => {
        const $element = $(element);
        const link = $element.find('a').attr('href');
        const imageUrl = $element.find('picture > img').attr('src');
        const category = $element.find('.MC_imageGridA_text_category').text().trim();
        const title = $element.find('h3.MC_Heading_4').text().trim();
        const blurb = $element.find('p.MC_imageGridA_blurb').text().trim();

        const newsItem = {
          "id": idCounter++,
          "title": title,
          "content": `<p>${blurb}</p>`,
          "date": new Date().toISOString().slice(0, 10),
          "image": imageUrl,
          "type": category.toLowerCase() === "news" ? "news" : category.toLowerCase()
        };

        newsItems.push(newsItem);
      });

      console.log(JSON.stringify(newsItems, null, 2));
      return; // Exit the function if successful

    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error.message);  // Log the error message
      if (attempt === MAX_RETRIES) {
        console.error('Max retries reached.  Failed to scrape Minecraft news.');
        return; // Exit if max retries reached
      }

      const delay = INITIAL_DELAY * Math.pow(2, attempt); // Exponential backoff
      console.log(`Retrying in ${delay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));  // Wait before retrying
    }
  }
}

scrapeMinecraftNews();