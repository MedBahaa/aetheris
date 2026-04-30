const axios = require('axios');
const cheerio = require('cheerio');

async function testFetch() {
    const url = 'https://www.bmcecapitalbourse.com/bkbbourse/details/123429130,102,608';
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(response.data);
        const price = $('.valeur').text().trim();
        const variation = $('.variation').text().trim();
        console.log({ price, variation });
    } catch (e) {
        console.error(e.message);
    }
}
testFetch();
