const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/NewsPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const toolbarStart = content.indexOf('<MovieLibraryToolbar');
const toolbarEnd = content.indexOf('visibleCount={sortedItems.length}');

if (toolbarStart > -1 && toolbarEnd > -1) {
  const insertion = `titleExtras={
          <div className="mt-4 flex flex-wrap gap-2">
            {PLATFORMS.map((p) => {
              const active = platformIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => setPlatformIds([p.id])}
                  className={\`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors \${
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
        }
        `;
  content = content.slice(0, toolbarEnd) + insertion + content.slice(toolbarEnd);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log("Updated NewsPage.tsx successfully");
} else {
  console.log("Could not find insertion point");
}
