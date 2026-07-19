const https = require('https');

https.get('https://coronavirus-tracker-m.firebaseio.com/live/indices.json', (res) => {
  console.log('STATUS:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('LENGTH:', data.length);
    try {
      const parsed = JSON.parse(data);
      console.log('IS JSON: YES');
      console.log('KEYS:', Object.keys(parsed));
      console.log('MASI DATA:', parsed.MASI);
      console.log('FULL PAYLOAD:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('IS JSON: NO');
      console.log('BODY:', data.substring(0, 1000));
    }
  });
}).on('error', err => console.error(err));
