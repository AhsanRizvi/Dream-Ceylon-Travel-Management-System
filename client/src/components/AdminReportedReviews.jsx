import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  EyeOff,
  RotateCcw,
  Trash2,
  CheckCircle,
  Flag,
  Filter,
  AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import StarRating from './StarRating';

/**
 * Administrator Review Moderation & Report Management Interface
 */
const AdminReportedReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [moderationNotes, setModerationNotes] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const [feedback, setFeedback] = useState('');

  const fetchReported = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const res = await api.get('/reviews/admin/reported', { params });
      setReviews(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load reported reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReported();
  }, [statusFilter]);

  const handleModerate = async (reviewId, action) => {
    setProcessingId(reviewId);
    setFeedback('');
    try {
      const note = moderationNotes[reviewId] || '';
      const res = await api.patch(`/reviews/admin/${reviewId}/moderate`, {
        action,
        note
      });
      setFeedback(res.data?.message || `Action "${action}" completed.`);
      await fetchReported();
    } catch (err) {
      alert(err.response?.data?.error || 'Moderation action failed');
    } finally {
      setProcessingId(null);
    }
  };

  const statusBadge = (status) => {
    if (status === 'active') {
      return (
        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-800">
          Active
        </span>
      );
    }
    if (status === 'hidden') {
      return (
        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800">
          Hidden
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-800">
        Removed
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="text-red-600" size={22} />
            Review Moderation & Reported Feedback
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Inspect user-reported reviews and hide, restore, dismiss reports, or remove policy-violating content.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter size={15} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold border border-gray-300 rounded-xl px-3 py-2 bg-gray-50"
          >
            <option value="all">All Flagged / Moderated</option>
            <option value="active">Active (Reported)</option>
            <option value="hidden">Hidden</option>
            <option value="removed">Removed</option>
          </select>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle size={15} />
          <span>{feedback}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-500 text-sm">
          Loading moderation queue...
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <CheckCircle size={32} className="mx-auto text-green-500 mb-2" />
          <p className="font-bold text-gray-800 text-sm">Moderation Queue Clear</p>
          <p className="text-xs text-gray-500 mt-1">
            No reported or moderated reviews match the current filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div
              key={rev._id}
              className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-4"
            >
              <div className="flex flex-wrap justify-between items-start gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusBadge(rev.status)}
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                      {rev.targetType}: {rev.targetName}
                    </span>
                    {rev.pendingReportsCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">
                        <Flag size={11} /> {rev.pendingReportsCount} Pending Report
                        {rev.pendingReportsCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Author: <strong className="text-gray-800">{rev.authorId?.name || 'Unknown'}</strong> ({rev.authorId?.email || 'N/A'}) • Posted{' '}
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <StarRating rating={rev.score} size={16} showValue={true} />
              </div>

              {/* Review Content */}
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 text-sm text-gray-800">
                {rev.comment}
              </div>

              {/* Reports list */}
              {rev.reports && rev.reports.length > 0 && (
                <div className="bg-red-50/60 border border-red-100 rounded-xl p-3 space-y-2">
                  <div className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                    <AlertTriangle size={13} />
                    Submitted Reports ({rev.reports.length})
                  </div>
                  <div className="space-y-1.5">
                    {rev.reports.map((rep, idx) => (
                      <div
                        key={idx}
                        className="text-xs bg-white p-2 rounded-lg border border-red-100 flex flex-wrap justify-between gap-2"
                      >
                        <div>
                          <span className="font-bold uppercase text-red-700 mr-2">
                            [{rep.reason}]
                          </span>
                          <span className="text-gray-700">
                            {rep.details || 'No additional details provided'}
                          </span>
                        </div>
                        <span className="text-gray-400">
                          by {rep.reportedBy?.name || 'User'} • Status: {rep.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Moderation Note & Action Buttons */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pt-2 border-t border-gray-200">
                <input
                  type="text"
                  placeholder="Optional moderation note (saved in audit history)..."
                  value={moderationNotes[rev._id] || ''}
                  onChange={(e) =>
                    setModerationNotes({
                      ...moderationNotes,
                      [rev._id]: e.target.value
                    })
                  }
                  className="flex-1 text-xs p-2.5 border border-gray-300 rounded-xl bg-white"
                />

                <div className="flex flex-wrap gap-2">
                  {rev.status !== 'hidden' && (
                    <button
                      type="button"
                      disabled={processingId === rev._id}
                      onClick={() => handleModerate(rev._id, 'hide')}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition disabled:opacity-50"
                    >
                      <EyeOff size={13} /> Hide Review
                    </button>
                  )}

                  {rev.status !== 'active' && (
                    <button
                      type="button"
                      disabled={processingId === rev._id}
                      onClick={() => handleModerate(rev._id, 'restore')}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-700 text-white transition disabled:opacity-50"
                    >
                      <RotateCcw size={13} /> Restore to Active
                    </button>
                  )}

                  {rev.isReported && rev.status === 'active' && (
                    <button
                      type="button"
                      disabled={processingId === rev._id}
                      onClick={() => handleModerate(rev._id, 'dismiss_reports')}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
                    >
                      <CheckCircle size={13} /> Dismiss Reports
                    </button>
                  )}

                  {rev.status !== 'removed' && (
                    <button
                      type="button"
                      disabled={processingId === rev._id}
                      onClick={() => handleModerate(rev._id, 'remove')}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReportedReviews;

