const fs = require('fs');

const newsPagePath = 'src/pages/NewsPage.tsx';
let content = fs.readFileSync(newsPagePath, 'utf-8');

const search = `        titleExtras={
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 -mb-1 no-scrollbar">
            {PLATFORMS.map((p) => {
              const active = platformIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => setPlatformIds([p.id])}
                  className={\`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors \${
                    active
                      ? 'border-coral bg-red-50 text-coral'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }\`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        }`;

const replacement = `        titleExtras={
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

let replaced = false;
if (content.includes(search)) {
    content = content.replace(search, replacement);
    replaced = true;
} else if (content.includes(search.replace(/\r\n/g, '\n'))) {
    content = content.replace(search.replace(/\r\n/g, '\n'), replacement.replace(/\r\n/g, '\n'));
    replaced = true;
}

if (replaced) {
    fs.writeFileSync(newsPagePath, content, 'utf-8');
    console.log("Buttons updated successfully");
} else {
    console.log("Could not find the target block to replace.");
}
