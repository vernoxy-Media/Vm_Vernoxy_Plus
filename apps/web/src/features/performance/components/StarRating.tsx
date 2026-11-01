import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (val: number) => void;
  readonly?: boolean;
  size?: number;
  showLabel?: boolean;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor (1.0)',
  2: 'Fair (2.0)',
  3: 'Good (3.0)',
  4: 'Very Good (4.0)',
  5: 'Excellent (5.0)',
};

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  readonly = false,
  size = 24,
  showLabel = false,
}) => {
  const [hovered, setHovered] = useState<number | null>(null);

  const currentVal = hovered !== null ? hovered : value;

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <div
        onMouseLeave={() => !readonly && setHovered(null)}
        className="inline-flex items-center gap-1 p-1 bg-slate-50/90 border border-slate-200/90 rounded-xl shadow-2xs"
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= currentVal;
          return (
            <button
              type="button"
              key={star}
              disabled={readonly}
              onClick={() => onChange?.(star)}
              onMouseEnter={() => !readonly && setHovered(star)}
              className={`p-1 rounded-lg transition-colors focus:outline-none ${
                readonly
                  ? 'cursor-default'
                  : 'cursor-pointer hover:bg-amber-100/70 active:bg-amber-200/70'
              }`}
              title={`${star} star${star > 1 ? 's' : ''} - ${RATING_LABELS[star] || ''}`}
              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            >
              <Star
                style={{ width: size, height: size }}
                className={`${
                  isFilled
                    ? 'fill-amber-400 text-amber-500 stroke-amber-500 stroke-[1.5]'
                    : 'fill-slate-100 text-slate-400 stroke-slate-400 stroke-[2] hover:text-amber-500 hover:fill-amber-200 hover:stroke-amber-500'
                } transition-colors duration-150 pointer-events-none`}
              />
            </button>
          );
        })}
      </div>
      {showLabel && (
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-lg transition-colors w-[125px] text-center shrink-0 truncate ${
            currentVal > 0
              ? 'text-amber-800 bg-amber-50 border border-amber-200'
              : 'text-slate-400 bg-slate-100/80 border border-slate-200'
          }`}
        >
          {currentVal > 0 ? (RATING_LABELS[currentVal] || `${currentVal}.0`) : 'Click to rate'}
        </span>
      )}
    </div>
  );
};

