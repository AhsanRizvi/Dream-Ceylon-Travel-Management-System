import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  MapPin,
  Globe,
  Award,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Edit3,
  Save,
  Star,
  Users,
  Briefcase,
  Phone,
  Mail,
  Plus,
  Trash2,
  ExternalLink
} from 'lucide-react';
import api from '../services/api';
import StarRating from './StarRating';
import ImageUploader from './ImageUploader';

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80';

const formatLKR = (amount) =>
  `LKR ${Number(amount || 0).toLocaleString('en-LK')}`;

const GuideDashboardPanel = () => {
  const [guideData, setGuideData] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [completion, setCompletion] = useState({ percentage: 0, missingFields: [] });
  const [stats, setStats] = useState({
    pendingRequests: 0,
    confirmedBookings: 0,
    completedTours: 0,
    totalConfirmedRevenueLKR: 0,
    averageRating: 0,
    reviewCount: 0
  });
  const [bookings, setBookings] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingBookingId, setUpdatingBookingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [profileForm, setProfileForm] = useState({
    name: '',
    contactNumber: '',
    profilePhoto: '',
    bio: '',
    languagesText: '',
    serviceAreasText: '',
    expertiseText: '',
    experienceYears: 5,
    qualificationsText: '',
    dailyRate: 15000,
    availability: true,
    availabilityNotes: ''
  });

  const [newUnavailableRange, setNewUnavailableRange] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });

  const fetchGuideDashboard = async () => {
    setLoading(true);
    try {
      const [profileRes, bookingsRes] = await Promise.all([
        api.get('/guides/profile/me'),
        api.get('/bookings/provider-requests').catch(() => ({ data: { data: [] } }))
      ]);

      const prof = profileRes.data;
      setHasProfile(Boolean(prof.hasProfile));
      setGuideData(prof.data || null);
      setCompletion(prof.profileCompletion || { percentage: 0, missingFields: [] });
      setStats(prof.stats || {});
      setRecentReviews(prof.recentReviews || []);

      const list = bookingsRes.data?.data || prof.recentBookings || [];
      setBookings(list);

      if (prof.data) {
        const g = prof.data;
        setProfileForm({
          name: g.name || '',
          contactNumber: g.contactNumber || '',
          profilePhoto: g.profilePhoto || '',
          bio: g.bio || '',
          languagesText: (g.languages || []).join(', '),
          serviceAreasText: (g.serviceAreas || []).join(', '),
          expertiseText: (g.expertise || []).join(', '),
          experienceYears: g.experienceYears ?? 5,
          qualificationsText: (g.qualifications || []).join('\n'),
          dailyRate: g.dailyRate || 15000,
          availability: Boolean(g.availability),
          availabilityNotes: g.availabilityNotes || ''
        });
      }
    } catch (err) {
      console.error('Error loading guide dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuideDashboard();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setFeedback({ type: '', message: '' });

    try {
      const payload = {
        name: profileForm.name,
        contactNumber: profileForm.contactNumber,
        profilePhoto: profileForm.profilePhoto,
        bio: profileForm.bio,
        languages: profileForm.languagesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        serviceAreas: profileForm.serviceAreasText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        expertise: profileForm.expertiseText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        experienceYears: Number(profileForm.experienceYears) || 0,
        qualifications: profileForm.qualificationsText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        dailyRate: Number(profileForm.dailyRate) || 15000,
        availability: Boolean(profileForm.availability),
        availabilityNotes: profileForm.availabilityNotes
      };

      await api.put('/guides/profile/me', payload);
      setFeedback({ type: 'success', message: 'Guide profile updated successfully!' });
      setEditingProfile(false);
      await fetchGuideDashboard();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to update guide profile'
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleAvailability = async () => {
    if (!guideData) return;
    try {
      const nextAvail = !guideData.availability;
      await api.put('/guides/availability', {
        availability: nextAvail,
        serviceStatus: nextAvail ? 'active' : 'paused'
      });
      await fetchGuideDashboard();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to toggle availability'
      });
    }
  };

  const handleAddUnavailableDates = async (e) => {
    e.preventDefault();
    if (!guideData || !newUnavailableRange.startDate || !newUnavailableRange.endDate) return;
    try {
      const updated = [
        ...(guideData.unavailableDates || []),
        {
          startDate: newUnavailableRange.startDate,
          endDate: newUnavailableRange.endDate,
          reason: newUnavailableRange.reason || 'Personal / Blocked Schedule'
        }
      ];
      await api.put('/guides/availability', { unavailableDates: updated });
      setNewUnavailableRange({ startDate: '', endDate: '', reason: '' });
      await fetchGuideDashboard();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to add unavailable dates'
      });
    }
  };

  const handleRemoveUnavailableRange = async (indexToRemove) => {
    if (!guideData) return;
    try {
      const updated = (guideData.unavailableDates || []).filter((_, i) => i !== indexToRemove);
      await api.put('/guides/availability', { unavailableDates: updated });
      await fetchGuideDashboard();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to remove unavailable dates'
      });
    }
  };

  const handleBookingStatusUpdate = async (bookingId, status) => {
    setUpdatingBookingId(bookingId);
    setFeedback({ type: '', message: '' });
    try {
      await api.put(`/bookings/${bookingId}/status`, { status });
      setFeedback({
        type: 'success',
        message: `Booking request ${status.toLowerCase()} successfully!`
      });
      await fetchGuideDashboard();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to update booking status'
      });
    } finally {
      setUpdatingBookingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-gray-500 text-sm">
        Loading your Tour Guide Dashboard...
      </div>
    );
  }

  if (!hasProfile && !editingProfile) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-xs text-center space-y-4">
        <Compass size={44} className="mx-auto text-blue-600" />
        <h2 className="text-2xl font-extrabold text-gray-900">
          Complete Your Tour Guide Profile
        </h2>
        <p className="text-sm text-gray-600 max-w-lg mx-auto">
          You are registered with a Tour Guide account. Publish your languages, service districts, daily rate, and certifications to appear in the public directory and receive tourist booking requests.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            to="/guides/register"
            className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold shadow-xs transition"
          >
            Set Up Guide Profile
          </Link>
          <button
            type="button"
            onClick={() => setEditingProfile(true)}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-bold hover:bg-gray-50"
          >
            Quick Edit Here
          </button>
        </div>
      </div>
    );
  }

  const pendingList = bookings.filter((b) => b.status === 'Pending');
  const confirmedList = bookings.filter(
    (b) => b.status === 'Confirmed' || b.status === 'Completed'
  );

  return (
    <div className="space-y-8">
      {feedback.message && (
        <div
          className={`p-4 rounded-2xl text-sm font-semibold border ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-bold uppercase text-amber-600">Pending Requests</span>
          <p className="text-3xl font-extrabold text-gray-900 mt-1">{pendingList.length}</p>
          <span className="text-[11px] text-gray-400">Awaiting your confirmation</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-bold uppercase text-green-600">Confirmed / Completed</span>
          <p className="text-3xl font-extrabold text-gray-900 mt-1">{confirmedList.length}</p>
          <span className="text-[11px] text-gray-400">Active & completed tours</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-bold uppercase text-blue-600">Daily Service Rate</span>
          <p className="text-2xl font-extrabold text-blue-900 mt-1">
            {formatLKR(guideData?.dailyRate)}
          </p>
          <span className="text-[11px] text-gray-400">Confirmed Rev: {formatLKR(stats.totalConfirmedRevenueLKR)}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-bold uppercase text-purple-600">Tourist Rating</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-extrabold text-gray-900">
              {Number(guideData?.rating || 0).toFixed(1)}
            </span>
            <Star size={18} className="text-yellow-500 fill-yellow-400" />
          </div>
          <span className="text-[11px] text-gray-400">
            {guideData?.reviewCount || 0} verified review(s)
          </span>
        </div>
      </div>

      {/* Guide Profile & Completion Card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <img
              src={guideData?.profilePhoto || FALLBACK_AVATAR}
              alt={guideData?.name}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = FALLBACK_AVATAR;
              }}
              className="w-16 h-16 rounded-2xl object-cover border border-gray-200"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-extrabold text-gray-900">{guideData?.name}</h2>
                <button
                  type="button"
                  onClick={handleToggleAvailability}
                  className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border transition ${
                    guideData?.availability
                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                      : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {guideData?.availability ? (
                    <>
                      <CheckCircle2 size={12} /> Available (Click to Pause)
                    </>
                  ) : (
                    <>
                      <XCircle size={12} /> Paused (Click to Activate)
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {guideData?.experienceYears || 1} yrs experience •{' '}
                {(guideData?.languages || []).join(', ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {guideData?._id && (
              <Link
                to={`/guides/${guideData._id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                <ExternalLink size={13} /> Public Profile
              </Link>
            )}
            <button
              type="button"
              onClick={() => setEditingProfile(!editingProfile)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition"
            >
              <Edit3 size={13} />
              {editingProfile ? 'Close Editor' : 'Edit Guide Profile'}
            </button>
          </div>
        </div>

        {/* Profile Completion Progress Bar */}
        <div className="px-6 py-3.5 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-xs font-bold text-gray-700">
              Profile Completion: {completion.percentage}%
            </span>
            <div className="flex-1 max-w-xs h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 rounded-full transition-all"
                style={{ width: `${completion.percentage}%` }}
              />
            </div>
          </div>
          {completion.missingFields?.length > 0 && (
            <span className="text-[11px] text-amber-700 font-medium">
              Missing: {completion.missingFields.join(', ')}
            </span>
          )}
        </div>

        {/* Profile Editor Form */}
        {editingProfile ? (
          <form onSubmit={handleSaveProfile} className="p-6 space-y-4 bg-blue-50/20">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Contact Number *
                </label>
                <input
                  type="text"
                  value={profileForm.contactNumber}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, contactNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Daily Service Rate (LKR) *
                </label>
                <input
                  type="number"
                  min="500"
                  required
                  value={profileForm.dailyRate}
                  onChange={(e) => setProfileForm({ ...profileForm, dailyRate: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Languages Spoken (Comma separated)
                </label>
                <input
                  type="text"
                  value={profileForm.languagesText}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, languagesText: e.target.value })
                  }
                  placeholder="English, German, Sinhala"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Service Districts (Comma separated)
                </label>
                <input
                  type="text"
                  value={profileForm.serviceAreasText}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, serviceAreasText: e.target.value })
                  }
                  placeholder="Kandy, Sigiriya, Ella"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  value={profileForm.experienceYears}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, experienceYears: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Areas of Expertise (Comma separated)
              </label>
              <input
                type="text"
                value={profileForm.expertiseText}
                onChange={(e) => setProfileForm({ ...profileForm, expertiseText: e.target.value })}
                placeholder="Cultural, Wildlife, Trekking, Photography"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
              />
            </div>

            <ImageUploader
              label="Profile Photograph"
              value={profileForm.profilePhoto}
              onChange={(url) => setProfileForm({ ...profileForm, profilePhoto: url })}
              multiple={false}
              category="guide"
            />

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Biography</label>
              <textarea
                rows={3}
                value={profileForm.bio}
                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Qualifications / Certifications (One per line)
              </label>
              <textarea
                rows={2}
                value={profileForm.qualificationsText}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, qualificationsText: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold"
              >
                <Save size={14} /> {savingProfile ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">{guideData?.bio}</p>

            <div className="grid sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-gray-50 p-3.5 rounded-2xl">
                <span className="font-bold text-gray-900 block mb-1">Service Areas</span>
                <span className="text-gray-600">
                  {(guideData?.serviceAreas || []).join(', ') || 'All Island'}
                </span>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-2xl">
                <span className="font-bold text-gray-900 block mb-1">Expertise</span>
                <span className="text-gray-600">
                  {(guideData?.expertise || []).join(', ') || 'Cultural & Wildlife'}
                </span>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-2xl">
                <span className="font-bold text-gray-900 block mb-1">Contact Info</span>
                <span className="text-gray-600">
                  {guideData?.contactNumber || 'No phone set'} • {guideData?.email}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Availability & Blocked Dates Manager */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
        <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
          <Calendar size={18} className="text-blue-600" /> Schedule & Blocked Date Ranges
        </h3>

        <form onSubmit={handleAddUnavailableDates} className="grid sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
              From Date
            </label>
            <input
              type="date"
              required
              value={newUnavailableRange.startDate}
              onChange={(e) =>
                setNewUnavailableRange({ ...newUnavailableRange, startDate: e.target.value })
              }
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
              To Date
            </label>
            <input
              type="date"
              required
              min={newUnavailableRange.startDate}
              value={newUnavailableRange.endDate}
              onChange={(e) =>
                setNewUnavailableRange({ ...newUnavailableRange, endDate: e.target.value })
              }
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
              Note / Reason
            </label>
            <input
              type="text"
              value={newUnavailableRange.reason}
              onChange={(e) =>
                setNewUnavailableRange({ ...newUnavailableRange, reason: e.target.value })
              }
              placeholder="e.g. Private Charter"
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold"
          >
            <Plus size={14} /> Block Dates
          </button>
        </form>

        {guideData?.unavailableDates && guideData.unavailableDates.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {guideData.unavailableDates.map((u, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-2 text-xs bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-xl font-medium"
              >
                <span>
                  {new Date(u.startDate).toLocaleDateString()} –{' '}
                  {new Date(u.endDate).toLocaleDateString()} ({u.reason || 'Blocked'})
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveUnavailableRange(idx)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Incoming Booking Requests & Confirmed Bookings */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-5">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900">
            Incoming & Confirmed Guide Bookings
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Review tourist booking requests, verify tour dates, and accept or reject reservations.
          </p>
        </div>

        {bookings.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-500 text-sm">
            No booking requests received yet.
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => {
              const statusColors = {
                Pending: 'bg-amber-100 text-amber-800 border-amber-200',
                Confirmed: 'bg-green-100 text-green-800 border-green-200',
                Completed: 'bg-blue-100 text-blue-800 border-blue-200',
                Rejected: 'bg-red-100 text-red-800 border-red-200',
                Cancelled: 'bg-gray-100 text-gray-700 border-gray-200'
              };

              return (
                <div
                  key={b._id}
                  className="p-4 rounded-2xl border border-gray-200 hover:border-blue-200 transition flex flex-col md:flex-row justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          statusColors[b.status] || statusColors.Pending
                        }`}
                      >
                        {b.status}
                      </span>
                      <span className="font-bold text-gray-900 text-sm">
                        Tourist: {b.touristId?.name || 'Verified Tourist'}
                      </span>
                      {b.touristId?.email && (
                        <span className="text-xs text-gray-500">({b.touristId.email})</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                      {b.startDate && (
                        <span>
                          <strong>Dates:</strong> {new Date(b.startDate).toLocaleDateString()} –{' '}
                          {new Date(b.endDate || b.startDate).toLocaleDateString()} (
                          {b.serviceDays || 1} days)
                        </span>
                      )}
                      <span>
                        <strong>Group Size:</strong> {b.travelersCount || 1} traveler(s)
                      </span>
                      <span className="font-bold text-blue-900">
                        Total: {formatLKR(b.totalAmount)}
                      </span>
                    </div>

                    {b.serviceNotes && (
                      <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <strong>Notes:</strong> {b.serviceNotes}
                      </p>
                    )}
                  </div>

                  {/* Provider Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {b.status === 'Pending' && (
                      <>
                        <button
                          type="button"
                          disabled={updatingBookingId === b._id}
                          onClick={() => handleBookingStatusUpdate(b._id, 'Confirmed')}
                          className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition disabled:opacity-50"
                        >
                          <CheckCircle2 size={14} /> Accept
                        </button>
                        <button
                          type="button"
                          disabled={updatingBookingId === b._id}
                          onClick={() => handleBookingStatusUpdate(b._id, 'Rejected')}
                          className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition disabled:opacity-50"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </>
                    )}

                    {b.status === 'Confirmed' && (
                      <button
                        type="button"
                        disabled={updatingBookingId === b._id}
                        onClick={() => handleBookingStatusUpdate(b._id, 'Completed')}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} /> Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Reviews Summary */}
      {recentReviews.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
          <h3 className="text-lg font-extrabold text-gray-900">Recent Tourist Reviews</h3>
          <div className="space-y-3">
            {recentReviews.map((rev) => (
              <div key={rev._id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">
                    {rev.authorId?.name || 'Verified Tourist'}
                  </span>
                  <StarRating rating={rev.score} size={13} />
                </div>
                <p className="text-xs text-gray-600 mt-1.5">{rev.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GuideDashboardPanel;

