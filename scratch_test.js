const fs = require('fs');

const css = fs.readFileSync('c:/Users/user/Desktop/Création Site Web/Agents/src/app/globals.css', 'utf8');

const matches = [];
const lines = css.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('circle') || line.includes('progress') || line.includes('terminal') || line.includes('loader') || line.includes('term-')) {
    matches.push(`${idx + 1}: ${line.trim()}`);
  }
});

console.log("MATCHING LINES IN globals.css:");
console.log(matches.slice(0, 50));
