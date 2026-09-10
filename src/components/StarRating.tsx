import { Star, X } from 'lucide-react';

export const StarRating = ({ value, onChange, disabled = false, allowClear = true, compact = false }: {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  allowClear?: boolean;
  compact?: boolean;
}) => (
  <div className={`flex items-center ${compact ? 'flex-nowrap gap-0' : 'flex-wrap gap-1'}`} role="group" aria-label="Rate">
    {Array.from({ length: 5 }, (_, index) => index + 1).map((rating) => {
      const selected = value != null && rating <= value;
      return (
        <button
          key={rating}
          type="button"
          disabled={disabled}
          onClick={() => onChange(allowClear && value === rating ? null : rating)}
          className={`grid place-items-center rounded-md transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 ${compact ? 'h-6 w-5' : 'h-10 w-10'} ${selected ? 'text-amber-400' : 'text-slate-300'}`}
          aria-label={`${rating} ${rating === 1 ? 'estrella' : 'estrellas'}`}
          aria-pressed={value === rating}
          title={`${rating} ${rating === 1 ? 'estrella' : 'estrellas'}`}
        >
          <Star className={`${compact ? 'h-4 w-4' : 'h-7 w-7'} ${selected ? 'fill-current' : ''}`} />
        </button>
      );
    })}
    {allowClear && value != null && (
      <button type="button" disabled={disabled} onClick={() => onChange(null)} className={`${compact ? 'ml-0 h-5 w-4' : 'ml-1 h-8 w-8'} grid place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-ink`} title="Quitar puntuación" aria-label="Quitar puntuación">
        <X className={compact ? 'h-2.5 w-2.5' : 'h-4 w-4'} />
      </button>
    )}
  </div>
);
