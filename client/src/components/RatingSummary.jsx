import React from 'react';
import { Star } from 'lucide-react';
import StarRating from './StarRating';

/**
 * Displays average rating, total review count, and 1-5 star breakdown bars
 */
const RatingSummary = ({ stats, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-16 bg-gray-200 rounded mb-3"></div>
      </div>
    );
  }

  const averageRating = stats?.averageRating || 0;
  const totalReviews = stats?.totalReviews || 0;
  const distribution = stats?.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  return (
    <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/40 p-5 rounded-2xl border border-blue-100">
      <div className="grid sm:grid-cols-12 gap-6 items-center">
        {/* Left column: Overall score */}
        <div className="sm:col-span-5 text-center sm:border-r border-blue-100 sm:pr-4">
          <div className="text-4xl font-extrabold text-blue-950">
            {totalReviews > 0 ? Number(averageRating).toFixed(1) : '—'}
          </div>
          <div className="my-2 flex justify-center">
            <StarRating rating={averageRating} size={18} />
          </div>
          <p className="text-xs font-medium text-gray-600">
            {totalReviews === 0
              ? 'No ratings yet'
              : `Based on ${totalReviews} verified ${totalReviews === 1 ? 'review' : 'reviews'}`}
          </p>
        </div>

        {/* Right column: 5 to 1 star distribution bars */}
        <div className="sm:col-span-7 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star] || 0;
            const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;

            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-12 flex items-center justify-end gap-1 font-semibold text-gray-700">
                  {star} <Star size={11} className="text-yellow-500 fill-yellow-400" />
                </span>
                <div className="flex-1 h-2 bg-white rounded-full overflow-hidden border border-gray-200">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-right text-gray-500 font-medium">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RatingSummary;

