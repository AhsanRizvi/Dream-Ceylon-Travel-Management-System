import React, { useState, useEffect, useContext, useCallback } from 'react';
import { MessageSquare, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import RatingSummary from './RatingSummary';
import ReviewForm from './ReviewForm';
import ReviewCard from './ReviewCard';

/**
 * Complete review and rating panel for a single Guide or Hotel.
 * Fetches rating statistics and individual reviews, and lets authenticated tourists submit/edit/delete their review.
 */
const ReviewList = ({
  targetType,
  targetId,
  targetName,
  onRatingUpdated
}) => {
  const { user } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingReview, setEditingReview] = useState(null);

  const fetchReviewsAndStats = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const [reviewsRes, statsRes] = await Promise.all([
        api.get(`/reviews/${targetType}/${targetId}`),
        api.get(`/reviews/ratings/${targetType}/${targetId}`)
      ]);
      const fetchedReviews = reviewsRes.data?.data || [];
      const fetchedStats = statsRes.data?.data || null;
      setReviews(fetchedReviews);
      setStats(fetchedStats);
      if (onRatingUpdated && fetchedStats) {
        onRatingUpdated(targetId, fetchedStats);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId]);

  useEffect(() => {
    fetchReviewsAndStats();
  }, [fetchReviewsAndStats]);

  const currentUserId = user?.id || user?._id;
  const userExistingReview = reviews.find((r) => {
    const rAuthor = r.authorId?._id || r.authorId;
    return currentUserId && rAuthor && rAuthor.toString() === currentUserId.toString();
  });

  const handleReviewSuccess = () => {
    setEditingReview(null);
    fetchReviewsAndStats();
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await api.delete(`/reviews/${reviewId}`);
      fetchReviewsAndStats();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete review');
    }
  };

  return (
    <div className="space-y-6">
      {/* Rating Summary & Distribution */}
      <RatingSummary stats={stats} loading={loading} />

      {/* Review Submission / Edit Form */}
      {user ? (
        user.role === 'tourist' ? (
          editingReview ? (
            <ReviewForm
              targetType={targetType}
              targetId={targetId}
              targetName={targetName}
              initialReview={editingReview}
              onSuccess={handleReviewSuccess}
              onCancelEdit={() => setEditingReview(null)}
            />
          ) : !userExistingReview ? (
            <ReviewForm
              targetType={targetType}
              targetId={targetId}
              targetName={targetName}
              onSuccess={handleReviewSuccess}
            />
          ) : (
            <div className="bg-blue-50/70 border border-blue-200 px-4 py-3 rounded-xl flex justify-between items-center text-xs text-blue-900">
              <span>You have already reviewed this {targetType}.</span>
              <button
                type="button"
                onClick={() => setEditingReview(userExistingReview)}
                className="font-bold text-blue-700 hover:underline"
              >
                Edit Your Review
              </button>
            </div>
          )
        ) : (
          <div className="bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-xs text-gray-600">
            Only registered Tourist accounts can submit new service reviews.
          </div>
        )
      ) : (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex items-center justify-between">
          <span className="text-xs text-gray-600">
            Sign in with a Tourist account to rate and review this {targetType}.
          </span>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-600 text-white px-3.5 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <LogIn size={13} /> Login to Review
          </Link>
        </div>
      )}

      {/* Individual Reviews List */}
      <div className="space-y-3">
        <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
          <MessageSquare size={16} className="text-blue-600" />
          Tourist Reviews ({reviews.length})
        </h4>

        {loading ? (
          <div className="text-center py-8 text-sm text-gray-500">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-8 text-center">
            <MessageSquare size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-700">No reviews yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Be the first tourist to share your experience with {targetName || `this ${targetType}`}!
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {reviews.map((rev) => (
              <ReviewCard
                key={rev._id}
                review={rev}
                currentUser={user}
                onEdit={(r) => setEditingReview(r)}
                onDelete={handleDeleteReview}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewList;

