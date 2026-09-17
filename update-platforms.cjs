const fs = require('fs');

const path = 'src/pages/NewsPage.tsx';
let content = fs.readFileSync(path, 'utf-8');

// Ensure import of resolvePlatformLogoUrl
if (!content.includes('resolvePlatformLogoUrl')) {
  content = content.replace(
    "import { MovieLibraryToolbar } from '@/components/MovieLibraryToolbar';",
    "import { MovieLibraryToolbar } from '@/components/MovieLibraryToolbar';\nimport { resolvePlatformLogoUrl } from '@/components/PlatformLogos';"
  );
}

// Change Amazon Prime to Prime Video so it resolves properly
content = content.replace("{ id: 'prime', name: 'Amazon Prime' }", "{ id: 'prime', name: 'Prime Video' }");

// Replace button rendering
const searchStr = `
                return (
                  <button
                    key={p.id}
                    onClick={() => setPlatformIds([p.id])}
                    className={\`inline-flex shrink-0 items-center justify-center rounded-md border px-4 py-2 text-[13px] font-semibold transition-colors \${
                      active
                        ? 'border-coral bg-coral text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }\`}
                  >
                    {p.name}
                  </button>
                );
`;

const replaceStr = `
                const logoUrl = resolvePlatformLogoUrl(p as any);
                return (
                  <button
                    key={p.id}
                    onClick={() => setPlatformIds([p.id])}
                    className={\`inline-flex shrink-0 items-center justify-center rounded-md border p-1.5 transition-colors h-11 min-w-[70px] \${
                      active
                        ? 'border-coral bg-coral/10 ring-1 ring-coral'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }\`}
                    title={p.name}
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt={p.name} className={\`h-full w-auto object-contain \${active ? '' : 'opacity-75 grayscale transition-all duration-300 hover:grayscale-0 hover:opacity-100'}\`} />
                    ) : (
                      <span className="px-2 text-[13px] font-semibold">{p.name === 'JustWatch' ? 'Populares' : p.name}</span>
                    )}
                  </button>
                );
`;

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
} else if (content.includes(searchStr.replace(/\r\n/g, '\n'))) {
  content = content.replace(searchStr.replace(/\r\n/g, '\n'), replaceStr.replace(/\r\n/g, '\n'));
}

fs.writeFileSync(path, content, 'utf-8');
console.log('Platform logos integrated');

