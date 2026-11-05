import React, { useState, useEffect } from 'react';
import { Send, AlertCircle, CheckCircle2, Edit3, X } from 'lucide-react';
import StarRating from './StarRating';
import api from '../services/api';

/**
 * Form for creating or editing a review for a guide or hotel.
 */
const ReviewForm = ({
  targetType,
  targetId,
  targetName,
  initialReview = null,
  onSuccess,
  onCancelEdit
}) => {
  const [score, setScore] = useState(initialReview?.score || 0);
  const [comment, setComment] = useState(initialReview?.comment || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (initialReview) {
      setScore(initialReview.score || 0);
      setComment(initialReview.comment || '');
      setError('');
    }
  }, [initialReview]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Frontend validation
    if (!Number.isInteger(Number(score)) || score < 1 || score > 5) {
      setError('Please select a star rating between 1 and 5 stars.');
      return;
    }

    const trimmedComment = comment.trim();
    if (trimmedComment.length < 3) {
      setError('Please write a review comment (at least 3 characters).');
      return;
    }

    if (trimmedComment.length > 1000) {
      setError('Review comment cannot exceed 1000 characters.');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (initialReview && initialReview._id) {
        res = await api.put(`/reviews/${initialReview._id}`, {
          score: Number(score),
          comment: trimmedComment
        });
        setSuccessMsg('Your review has been updated!');
      } else {
        res = await api.post('/reviews', {
          targetType,
          targetId,
          score: Number(score),
          comment: trimmedComment
        });
        setSuccessMsg('Thank you! Your review has been published.');
        setScore(0);
        setComment('');
      }

      if (onSuccess) {
        onSuccess(res.data);
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to submit review. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4"
    >
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
          {initialReview ? (
            <>
              <Edit3 size={16} className="text-blue-600" />
              Edit Your Review {targetName ? `for ${targetName}` : ''}
            </>
          ) : (
            <>Write a Review {targetName ? `for ${targetName}` : ''}</>
          )}
        </h4>
        {initialReview && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1"
          >
            <X size={14} /> Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 font-medium">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-start gap-2 text-xs text-green-700 font-medium">
          <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
          Your Rating <span className="text-red-500">*</span>
        </label>
        <StarRating
          rating={score}
          interactive={true}
          onChange={(val) => setScore(val)}
          size={24}
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
            Your Feedback <span className="text-red-500">*</span>
          </label>
          <span className="text-xs text-gray-400">{comment.length}/1000</span>
        </div>
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with hospitality, punctuality, service quality..."
          className="w-full p-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition disabled:opacity-50"
        >
          <Send size={14} />
          {loading
            ? 'Saving...'
            : initialReview
            ? 'Update Review'
            : 'Submit Review'}
        </button>
      </div>
    </form>
  );
};

export default ReviewForm;

