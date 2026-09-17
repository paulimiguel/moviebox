const fs = require('fs');
let c = fs.readFileSync('src/components/TinderSuggestions.tsx', 'utf-8');
c = c.replace(/\\`/g, '`');
c = c.replace(/\\\$/g, '$');
fs.writeFileSync('src/components/TinderSuggestions.tsx', c);
console.log('Fixed TinderSuggestions');
