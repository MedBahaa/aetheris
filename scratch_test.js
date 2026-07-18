const https = require('https');

https.get('https://www.leboursier.ma/', (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', JSON.stringify(res.headers));
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('LENGTH:', data.length);
    console.log('CONTAINS TABLE:', data.includes('<table') || data.includes('<TABLE'));
  });
}).on('error', err => console.error(err));
