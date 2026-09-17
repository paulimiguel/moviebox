const fs = require('fs');

const toolbarPath = 'src/components/MovieLibraryToolbar.tsx';
let content = fs.readFileSync(toolbarPath, 'utf-8');

const search = '<h1 className="font-bebas truncate text-xl font-normal text-ink sm:text-2xl">Títulos de {props.ownerName}</h1>\r\n          <p className="mt-0.5 truncate text-xs text-slate-500">Mostrando {props.visibleCount} de {props.totalCount} movies</p>\r\n          ';

const searchLf = '<h1 className="font-bebas truncate text-xl font-normal text-ink sm:text-2xl">Títulos de {props.ownerName}</h1>\n          <p className="mt-0.5 truncate text-xs text-slate-500">Mostrando {props.visibleCount} de {props.totalCount} movies</p>\n          ';

if (content.includes(search)) {
    content = content.replace(search, '');
    fs.writeFileSync(toolbarPath, content, 'utf-8');
    console.log("Fixed with CRLF!");
} else if (content.includes(searchLf)) {
    content = content.replace(searchLf, '');
    fs.writeFileSync(toolbarPath, content, 'utf-8');
    console.log("Fixed with LF!");
} else {
    console.log("Could not find the duplicate header block. Attempting fallback.");
    // Fallback: split by lines and remove the exact strings
    const lines = content.split('\n');
    const filteredLines = lines.filter(line => {
        return !line.includes('Títulos de {props.ownerName}</h1>') && !line.includes('de {props.totalCount} movies</p>');
    });
    fs.writeFileSync(toolbarPath, filteredLines.join('\n'), 'utf-8');
    console.log("Fixed with fallback");
}
