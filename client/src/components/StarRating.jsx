import React, { useState } from 'react';
import { Star } from 'lucide-react';

/**
 * Reusable StarRating component
 * @param {number} rating - Current rating value (0 to 5, supports decimals in read-only mode)
 * @param {number} maxStars - Total number of stars (default 5)
 * @param {boolean} interactive - Whether user can click/hover to select rating
 * @param {function} onChange - Callback when star is clicked (receives 1..5 integer)
 * @param {number} size - Icon size in pixels
 * @param {boolean} showValue - Whether to show numeric rating label next to stars
 */
const StarRating = ({
  rating = 0,
  maxStars = 5,
  interactive = false,
  onChange,
  size = 18,
  showValue = false,
  className = ''
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const displayValue = interactive && hoverRating > 0 ? hoverRating : Number(rating) || 0;

  const ratingLabels = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div
        className="flex items-center gap-0.5"
        role={interactive ? 'radiogroup' : 'img'}
        aria-label={`Rating: ${ Number(rating || 0).toFixed(1) } out of ${maxStars} stars`}
      >
        {Array.from({ length: maxStars }, (_, idx) => {
          const starNumber = idx + 1;
          const isFilled = displayValue >= starNumber - 0.25;

          return (
            <button
              key={starNumber}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onChange && onChange(starNumber)}
              onMouseEnter={() => interactive && setHoverRating(starNumber)}
              onMouseLeave={() => interactive && setHoverRating(0)}
              aria-label={`${starNumber} Star${starNumber > 1 ? 's' : ''}`}
              className={`${
                interactive
                  ? 'cursor-pointer transform hover:scale-110 transition-transform focus:outline-none p-0.5'
                  : 'cursor-default'
              }`}
            >
              <Star
                size={size}
                className={`transition-colors ${
                  isFilled
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300 fill-gray-100'
                }`}
              />
            </button>
          );
        })}
      </div>

      {showValue && (
        <span className="text-sm font-bold text-gray-800 ml-1">
          {Number(rating) > 0 ? Number(rating).toFixed(1) : 'New'}
        </span>
      )}

      {interactive && displayValue > 0 && (
        <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 ml-2">
          {displayValue} / 5 • {ratingLabels[displayValue]}
        </span>
      )}
    </div>
  );
};

export default StarRating;

