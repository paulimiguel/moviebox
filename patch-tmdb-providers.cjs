const fs = require('fs');

const path = 'backend/src/routes/tmdb.ts';
let content = fs.readFileSync(path, 'utf-8');

const providerStr = `const providerId = platform === 'prime' ? 119 : platform === 'apple' ? 350 : platform === 'disney' ? 337 : 8;`;
const replacementProvider = `
    let providerId = 8;
    if (platform === 'prime') providerId = 119;
    else if (platform === 'apple') providerId = 350;
    else if (platform === 'disney') providerId = 337;
    else if (platform === 'max') providerId = 1899;
    else if (platform === 'paramount') providerId = 531;
    else if (platform === 'claro') providerId = 167;
    else if (platform === 'flow') providerId = 339; // Movistar fallback
    
    const providerQuery = (platform === 'justwatch' || platform === 'stremio') ? '' : \`&with_watch_providers=\${providerId}&watch_region=AR\`;
`;

content = content.replace(providerStr, replacementProvider);

content = content.replace(/&with_watch_providers=\${providerId}&watch_region=AR/g, '${providerQuery}');

fs.writeFileSync(path, content, 'utf-8');
console.log('Patched tmdb.ts providers');

