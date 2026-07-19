const https = require('https');

function queryTradingView(symbol) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      symbols: {
        tickers: [`CSEMA:${symbol.toUpperCase()}`],
        query: { types: [] }
      },
      columns: [
        "name",
        "close",
        "market_cap_basic",
        "price_earnings_ttm",
        "dividends_yield",
        "return_on_equity_fq",
        "net_income",
        "operating_margin",
        "total_revenue",
        "revenue_growth_yoy",
        "net_income_growth_yoy"
      ]
    });

    const options = {
      hostname: 'scanner.tradingview.com',
      port: 443,
      path: '/global/scan',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        'User-Agent': 'Mozilla/5.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  const result = await queryTradingView('IAM');
  console.log("IAM Result:", JSON.stringify(result, null, 2));
}

run();
