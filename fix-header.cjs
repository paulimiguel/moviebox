const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/Header.tsx');
let content = fs.readFileSync(filePath, 'utf-8');
const toolbarPath = 'src/components/MovieLibraryToolbar.tsx';
let content = fs.readFileSync(toolbarPath, 'utf-8');

// Find the bad block and replace it
const searchString = `<nav className="main-navigation hidden h-full items-end xl:flex">
            <div ref={libraryMenuRef} className="relative h-full">
              <button type="button" onClick={() => { setLibraryMenuOpen((current) => !current); setPlatformMenuOpen(false); setGenreMenuOpen(false); setCollectionMenuOpen(false); }} className={\`flex h-full items-center gap-1.5 border-b-2 px-3 text-sm font-semibold \${libraryMenuOpen || location.pathname === '/' ? 'border-coral text-ink' : 'border-transparent text-slate-500 hover:text-ink'}\`} aria-expanded={libraryMenuOpen}>BIBLIOTECA<ChevronDown className="h-4 w-4" /></button>
            <div ref={libraryMenuRef} className="relative h-full" onMouseEnter={() => setLibraryMenuOpen(true)} onMouseLeave={() => setLibraryMenuOpen(false)}>
              <button type="button" onClick={() => { filterLibrary('all'); setPlatformMenuOpen(false); setGenreMenuOpen(false); setCollectionMenuOpen(false); }} className={\`flex h-full items-center gap-1.5 border-b-2 px-3 text-sm font-semibold \${libraryMenuOpen || location.pathname === '/' ? 'border-coral text-ink' : 'border-transparent text-slate-500 hover:text-ink'}\`} aria-expanded={libraryMenuOpen}>BIBLIOTECA<ChevronDown className="h-4 w-4" /></button>`;
const search = '<h1 className="font-bebas truncate text-xl font-normal text-ink sm:text-2xl">Títulos de {props.ownerName}</h1>\r\n          <p className="mt-0.5 truncate text-xs text-slate-500">Mostrando {props.visibleCount} de {props.totalCount} movies</p>\r\n          ';

const replaceString = `<nav className="main-navigation hidden h-full items-end xl:flex">
            <div ref={libraryMenuRef} className="relative h-full" onMouseEnter={() => setLibraryMenuOpen(true)} onMouseLeave={() => setLibraryMenuOpen(false)}>
              <button type="button" onClick={() => { filterLibrary('all'); setPlatformMenuOpen(false); setGenreMenuOpen(false); setCollectionMenuOpen(false); }} className={\`flex h-full items-center gap-1.5 border-b-2 px-3 text-sm font-semibold \${libraryMenuOpen || location.pathname === '/' ? 'border-coral text-ink' : 'border-transparent text-slate-500 hover:text-ink'}\`} aria-expanded={libraryMenuOpen}>BIBLIOTECA<ChevronDown className="h-4 w-4" /></button>`;
const searchLf = '<h1 className="font-bebas truncate text-xl font-normal text-ink sm:text-2xl">Títulos de {props.ownerName}</h1>\n          <p className="mt-0.5 truncate text-xs text-slate-500">Mostrando {props.visibleCount} de {props.totalCount} movies</p>\n          ';

content = content.replace(searchString, replaceString);

fs.writeFileSync(filePath, content);
console.log('Header.tsx fixed successfully');

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
