const fs = require('fs');
let c = fs.readFileSync('src/components/TinderSuggestions.tsx', 'utf-8');
c = c.split('\\`').join('`');
c = c.split('\\$').join('$');
fs.writeFileSync('src/components/TinderSuggestions.tsx', c);
console.log('Fixed syntax properly');
