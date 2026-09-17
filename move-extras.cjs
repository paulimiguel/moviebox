const fs = require('fs');

// 1. Modify MovieLibraryToolbar.tsx
const toolbarPath = 'src/components/MovieLibraryToolbar.tsx';
let toolbarContent = fs.readFileSync(toolbarPath, 'utf-8');

// Remove props.titleExtras from inside the grid
toolbarContent = toolbarContent.replace('          {props.titleExtras}\r\n', '');
toolbarContent = toolbarContent.replace('          {props.titleExtras}\n', '');

// Add it right before </section>
toolbarContent = toolbarContent.replace('    </section>', '      {props.titleExtras}\n    </section>');

fs.writeFileSync(toolbarPath, toolbarContent, 'utf-8');
console.log('Toolbar updated properly');

// 2. Modify NewsPage.tsx
const newsPagePath = 'src/pages/NewsPage.tsx';
let newsPageContent = fs.readFileSync(newsPagePath, 'utf-8');

const search = `        titleExtras={
          <div className="mt-4 flex items-center gap-1.5">
            {PLATFORMS.map((p) => {
              const active = platformIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => setPlatformIds([p.id])}
                  className={\`inline-flex shrink-0 items-center justify-center rounded-md border px-2 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors \${
                    active
                      ? 'border-coral bg-coral text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }\`}
                >
                  {p.name === 'Amazon Prime' ? 'Prime' : p.name}
                </button>
              );
            })}
          </div>
        }`;

const replacement = `        titleExtras={
          <div className="mx-auto max-w-[1500px] px-4 pb-3 sm:px-6">
            <div className="mt-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {PLATFORMS.map((p) => {
                const active = platformIds.includes(p.id);
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
              })}
            </div>
          </div>
        }`;

let replaced = false;
if (newsPageContent.includes(search)) {
    newsPageContent = newsPageContent.replace(search, replacement);
    replaced = true;
} else if (newsPageContent.includes(search.replace(/\r\n/g, '\n'))) {
    newsPageContent = newsPageContent.replace(search.replace(/\r\n/g, '\n'), replacement.replace(/\r\n/g, '\n'));
    replaced = true;
}

if (replaced) {
    fs.writeFileSync(newsPagePath, newsPageContent, 'utf-8');
    console.log("NewsPage buttons updated");
} else {
    console.log("Could not find the target block to replace in NewsPage.");
}

