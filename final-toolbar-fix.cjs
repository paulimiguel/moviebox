const fs = require('fs');
const filePath = 'src/components/MovieLibraryToolbar.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// The broken snippet
const broken = `              <button type="button" onClick={() => { props.onClearFilters(); setGenreSearch(''); setPlatformSearch(''); setYearDraft(''); setOpenMenu(null); }} className="ml-1 px-1 py-0.5 text-[11px] font-semibold uppercase text-coral hover:underline">Limpiar</button>\r\n            </div>\r\n      {props.titleExtras}\r\n          )}\r\n        </div>`;

const fixed = `              <button type="button" onClick={() => { props.onClearFilters(); setGenreSearch(''); setPlatformSearch(''); setYearDraft(''); setOpenMenu(null); }} className="ml-1 px-1 py-0.5 text-[11px] font-semibold uppercase text-coral hover:underline">Limpiar</button>\r\n            </div>\r\n          )}\r\n        </div>`;

if (content.includes(broken)) {
    content = content.replace(broken, fixed);
} else {
    // try LF
    const brokenLf = broken.replace(/\r\n/g, '\n');
    const fixedLf = fixed.replace(/\r\n/g, '\n');
    if (content.includes(brokenLf)) {
        content = content.replace(brokenLf, fixedLf);
    }
}

// Ensure titleExtras is inserted right before </section>
const insertTitleExtras = `      {props.titleExtras}\n    </section>`;
if (!content.includes(insertTitleExtras)) {
    content = content.replace('    </section>', insertTitleExtras);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed MovieLibraryToolbar');

