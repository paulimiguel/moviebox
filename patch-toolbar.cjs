const fs = require('fs');

const path = 'src/components/MovieLibraryToolbar.tsx';
let content = fs.readFileSync(path, 'utf-8');

if (!content.includes('hideActiveFilters?: boolean;')) {
  content = content.replace(
    'ownerName?: string;',
    'ownerName?: string;\n  hideActiveFilters?: boolean;'
  );
  
  const searchStr = `            {(selectedGenreNames.length > 0 || selectedPlatformNames.length > 0 || props.years.length > 0 || props.type !== 'all' || props.watched !== 'all' || props.favorite !== 'all' || props.watchlist !== 'all' || props.emptyFieldsCount > 0) && (
              <div className="mt-2 flex flex-wrap gap-1">`;
  const replaceStr = `            {!props.hideActiveFilters && (selectedGenreNames.length > 0 || selectedPlatformNames.length > 0 || props.years.length > 0 || props.type !== 'all' || props.watched !== 'all' || props.favorite !== 'all' || props.watchlist !== 'all' || props.emptyFieldsCount > 0) && (
              <div className="mt-2 flex flex-wrap gap-1">`;
              
  if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
  } else {
    // try removing indentation
    const searchStrFallback = `(selectedGenreNames.length > 0 || selectedPlatformNames.length > 0 || props.years.length > 0 || props.type !== 'all' || props.watched !== 'all' || props.favorite !== 'all' || props.watchlist !== 'all' || props.emptyFieldsCount > 0) && (`;
    const replaceStrFallback = `!props.hideActiveFilters && (selectedGenreNames.length > 0 || selectedPlatformNames.length > 0 || props.years.length > 0 || props.type !== 'all' || props.watched !== 'all' || props.favorite !== 'all' || props.watchlist !== 'all' || props.emptyFieldsCount > 0) && (`;
    content = content.replace(searchStrFallback, replaceStrFallback);
  }

  fs.writeFileSync(path, content, 'utf-8');
  console.log('Patched MovieLibraryToolbar');
}

