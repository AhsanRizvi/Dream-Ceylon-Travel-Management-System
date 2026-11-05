import React from 'react';
import { Calendar, Edit2, Trash2, ShieldCheck } from 'lucide-react';
import StarRating from './StarRating';
import ReviewReportButton from './ReviewReportButton';

/**
 * Displays a single review with author info, rating, date, verified booking badge,
 * edit/delete controls for the author (or admin), and a report button for other authenticated users.
 */
const ReviewCard = ({
  review,
  currentUser,
  onEdit,
  onDelete,
  onReported
}) => {
  const authorName = review.authorId?.name || 'Verified Tourist';
  const authorId = review.authorId?._id || review.authorId;
  const currentUserId = currentUser?.id || currentUser?._id;

  const isOwner =
    Boolean(currentUserId && authorId) &&
    currentUserId.toString() === authorId.toString();
  const isAdmin = currentUser?.role === 'admin';

  const formattedDate = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : '';

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs hover:border-gray-200 transition-all">
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-900 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
            {authorName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-gray-900">{authorName}</span>
              {review.verifiedBooking && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                  <ShieldCheck size={11} /> Verified Booking
                </span>
              )}
              {isOwner && (
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  You
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
              <Calendar size={11} />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        <StarRating rating={review.score} size={15} />
      </div>

      <p className="text-sm text-gray-700 mt-3 leading-relaxed whitespace-pre-line">
        {review.comment}
      </p>

      {/* Action footer */}
      {currentUser && (
        <div className="flex justify-end items-center gap-3 mt-3 pt-2 border-t border-gray-50">
          {isOwner && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(review)}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition"
            >
              <Edit2 size={12} /> Edit
            </button>
          )}

          {(isOwner || isAdmin) && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(review._id)}
              className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 transition"
            >
              <Trash2 size={12} /> Delete
            </button>
          )}

          {!isOwner && (
            <ReviewReportButton reviewId={review._id} onReported={onReported} />
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewCard;

