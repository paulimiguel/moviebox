const fs = require('fs');

const modalPath = 'src/components/MovieDetailModal.tsx';
let content = fs.readFileSync(modalPath, 'utf-8');

// 1. Add Plus icon to imports
content = content.replace("Trash2, X", "Trash2, X, Plus");

// 2. Add onAdd to props
content = content.replace(
  "onNext?: () => void;\n}) => {",
  "onNext?: () => void;\n  onAdd?: (movie: MovieItem) => void;\n}) => {"
);
content = content.replace(
  "export const MovieDetailModal = ({ movie, onClose, onEdit, onDelete, onPersonal, onRating, onCollections, onPrevious, onNext }: {",
  "export const MovieDetailModal = ({ movie, onClose, onEdit, onDelete, onPersonal, onRating, onCollections, onPrevious, onNext, onAdd }: {"
);

// 3. Add the button next to the top right controls
const topControlsSearch = `            <div className="ml-auto flex shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">`;
const topControlsReplace = `            {onAdd && (
              <button
                type="button"
                onClick={() => onAdd(movie)}
                className="primary-button ml-auto mr-3 h-8 gap-1.5 px-3 py-0 text-[11px] uppercase shadow-card"
              >
                <Plus className="h-4 w-4" />
                Agregar
              </button>
            )}
            <div className="flex shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-card ${!content.includes('ml-auto flex') ? '' : 'ml-auto'}">`;

content = content.replace(topControlsSearch, topControlsReplace);
// Remove ml-auto from the old container since onAdd now takes it if present
content = content.replace(/ml-auto flex shrink-0/g, 'flex shrink-0');

fs.writeFileSync(modalPath, content, 'utf-8');
console.log('MovieDetailModal patched with onAdd');
