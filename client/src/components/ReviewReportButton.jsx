import React, { useState } from 'react';
import { Flag, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

const REPORT_REASONS = [
  { value: 'inappropriate', label: 'Inappropriate Language or Content' },
  { value: 'abusive', label: 'Abusive or Harassment' },
  { value: 'spam', label: 'Spam or Fake Advertisement' },
  { value: 'irrelevant', label: 'Off-topic / Irrelevant to Service' },
  { value: 'other', label: 'Other Policy Violation' }
];

const ReviewReportButton = ({ reviewId, onReported }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('inappropriate');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reportedSuccess, setReportedSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/reviews/${reviewId}/report`, {
        reason,
        details: details.trim()
      });
      setReportedSuccess(true);
      if (onReported) onReported(reviewId);
      setTimeout(() => {
        setIsOpen(false);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (reportedSuccess) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
        <CheckCircle2 size={12} /> Reported
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition-colors"
        title="Report inappropriate review"
      >
        <Flag size={13} />
        <span>Report</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100 animate-fadeIn">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-red-700 font-bold">
                <AlertTriangle size={18} />
                <h4>Report Review</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Reason for reporting
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide brief context to help our administrators moderate this review..."
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ReviewReportButton;

