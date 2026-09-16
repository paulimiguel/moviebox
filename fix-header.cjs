const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/Header.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Find the bad block and replace it
const searchString = `<nav className="main-navigation hidden h-full items-end xl:flex">
            <div ref={libraryMenuRef} className="relative h-full">
              <button type="button" onClick={() => { setLibraryMenuOpen((current) => !current); setPlatformMenuOpen(false); setGenreMenuOpen(false); setCollectionMenuOpen(false); }} className={\`flex h-full items-center gap-1.5 border-b-2 px-3 text-sm font-semibold \${libraryMenuOpen || location.pathname === '/' ? 'border-coral text-ink' : 'border-transparent text-slate-500 hover:text-ink'}\`} aria-expanded={libraryMenuOpen}>BIBLIOTECA<ChevronDown className="h-4 w-4" /></button>
            <div ref={libraryMenuRef} className="relative h-full" onMouseEnter={() => setLibraryMenuOpen(true)} onMouseLeave={() => setLibraryMenuOpen(false)}>
              <button type="button" onClick={() => { filterLibrary('all'); setPlatformMenuOpen(false); setGenreMenuOpen(false); setCollectionMenuOpen(false); }} className={\`flex h-full items-center gap-1.5 border-b-2 px-3 text-sm font-semibold \${libraryMenuOpen || location.pathname === '/' ? 'border-coral text-ink' : 'border-transparent text-slate-500 hover:text-ink'}\`} aria-expanded={libraryMenuOpen}>BIBLIOTECA<ChevronDown className="h-4 w-4" /></button>`;

const replaceString = `<nav className="main-navigation hidden h-full items-end xl:flex">
            <div ref={libraryMenuRef} className="relative h-full" onMouseEnter={() => setLibraryMenuOpen(true)} onMouseLeave={() => setLibraryMenuOpen(false)}>
              <button type="button" onClick={() => { filterLibrary('all'); setPlatformMenuOpen(false); setGenreMenuOpen(false); setCollectionMenuOpen(false); }} className={\`flex h-full items-center gap-1.5 border-b-2 px-3 text-sm font-semibold \${libraryMenuOpen || location.pathname === '/' ? 'border-coral text-ink' : 'border-transparent text-slate-500 hover:text-ink'}\`} aria-expanded={libraryMenuOpen}>BIBLIOTECA<ChevronDown className="h-4 w-4" /></button>`;

content = content.replace(searchString, replaceString);

fs.writeFileSync(filePath, content);
console.log('Header.tsx fixed successfully');
