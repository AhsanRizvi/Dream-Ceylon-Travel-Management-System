import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Globe,
  Award,
  Briefcase,
  Phone,
  Mail,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Sparkles,
  ShieldCheck,
  Clock
} from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import ReviewList from '../components/ReviewList';

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80';

const formatLKR = (amount) =>
  `LKR ${Number(amount || 0).toLocaleString('en-LK')}`;

const GuideDetails = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Booking Request Form state
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const threeDaysLater = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

  const [bookingForm, setBookingForm] = useState({
    startDate: tomorrow,
    endDate: threeDaysLater,
    travelersCount: 2,
    serviceNotes: '',
    tourPlanId: ''
  });
  const [availabilityStatus, setAvailabilityStatus] = useState(null);
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingFeedback, setBookingFeedback] = useState({ type: '', message: '' });
  const [selectedForTrip, setSelectedForTrip] = useState(false);

  const fetchGuideDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/guides/${id}`);
      const data = res.data?.data;
      setGuide(data);

      const saved = localStorage.getItem('smartLanka_selectedGuide');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed._id === data._id) setSelectedForTrip(true);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load tour guide details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuideDetails();
  }, [id]);

  // Check date availability whenever startDate or endDate changes
  useEffect(() => {
    const checkDates = async () => {
      if (!guide || !bookingForm.startDate || !bookingForm.endDate) return;
      setCheckingAvail(true);
      try {
        const res = await api.get(
          `/guides/${guide._id}/availability?startDate=${bookingForm.startDate}&endDate=${bookingForm.endDate}`
        );
        setAvailabilityStatus(res.data?.data || null);
      } catch {
        setAvailabilityStatus(null);
      } finally {
        setCheckingAvail(false);
      }
    };
    checkDates();
  }, [guide?._id, bookingForm.startDate, bookingForm.endDate]);

  const calculateServiceDays = () => {
    if (!bookingForm.startDate || !bookingForm.endDate) return 1;
    const s = new Date(bookingForm.startDate);
    const e = new Date(bookingForm.endDate);
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    const diff = Math.round((e - s) / 86400000) + 1;
    return diff > 0 ? diff : 0;
  };

  const serviceDays = calculateServiceDays();
  const estimatedTotalLKR = (Number(guide?.dailyRate) || 0) * Math.max(0, serviceDays);

  const handleSelectForTrip = () => {
    if (!guide) return;
    localStorage.setItem(
      'smartLanka_selectedGuide',
      JSON.stringify({
        _id: guide._id,
        name: guide.name,
        dailyRate: guide.dailyRate,
        serviceAreas: guide.serviceAreas,
        languages: guide.languages,
        profilePhoto: guide.profilePhoto
      })
    );
    setSelectedForTrip(true);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingFeedback({ type: '', message: '' });

    if (!user) {
      navigate('/login');
      return;
    }

    if (serviceDays <= 0) {
      setBookingFeedback({
        type: 'error',
        message: 'End date must be on or after the start date.'
      });
      return;
    }

    setBookingSubmitting(true);
    try {
      const res = await api.post('/bookings/guides', {
        guideId: guide._id,
        startDate: bookingForm.startDate,
        endDate: bookingForm.endDate,
        travelersCount: Number(bookingForm.travelersCount) || 1,
        serviceNotes: bookingForm.serviceNotes,
        tourPlanId: bookingForm.tourPlanId || undefined
      });

      setBookingFeedback({
        type: 'success',
        message:
          res.data?.message ||
          'Guide booking request submitted! You can track its confirmation status in your Dashboard.'
      });
      setBookingForm((prev) => ({ ...prev, serviceNotes: '' }));
    } catch (err) {
      setBookingFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to submit guide booking request'
      });
    } finally {
      setBookingSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-28">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-red-600 font-bold text-lg">{error || 'Guide not found'}</p>
        <Link
          to="/guides"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold"
        >
          <ArrowLeft size={16} /> Back to Guides
        </Link>
      </div>
    );
  }

  const displayName = guide.name || guide.userId?.name || 'Certified Tour Guide';
  const isAvailable = Boolean(guide.availability) && guide.serviceStatus !== 'paused';

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          to="/guides"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900"
        >
          <ArrowLeft size={16} /> Back to All Tour Guides
        </Link>

        <button
          type="button"
          onClick={handleSelectForTrip}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition ${
            selectedForTrip
              ? 'bg-green-50 text-green-700 border-green-300'
              : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
          }`}
        >
          <CheckCircle2 size={15} />
          {selectedForTrip ? 'Selected for Your Trip Plan' : 'Select Guide for Trip Plan'}
        </button>
      </div>

      {/* Main Profile & Booking Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Columns: Full Guide Details */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-8 text-white">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <img
                  src={guide.profilePhoto || guide.userId?.profileImage || FALLBACK_AVATAR}
                  alt={displayName}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_AVATAR;
                  }}
                  className="w-28 h-28 rounded-3xl object-cover border-4 border-white/20 shadow-lg flex-shrink-0"
                />

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider bg-amber-400 text-blue-950 px-3 py-0.5 rounded-full">
                      <ShieldCheck size={13} /> Licensed National Guide
                    </span>
                    {isAvailable ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-green-500/90 text-white px-3 py-0.5 rounded-full">
                        <CheckCircle2 size={12} /> Available for Booking
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-500/90 text-white px-3 py-0.5 rounded-full">
                        <XCircle size={12} /> Currently Unavailable
                      </span>
                    )}
                  </div>

                  <h1 className="text-3xl font-extrabold">{displayName}</h1>

                  <div className="flex items-center gap-3 flex-wrap pt-1">
                    <StarRating rating={guide.rating || 0} size={18} />
                    <span className="text-sm font-bold text-amber-300">
                      {guide.reviewCount > 0
                        ? `${Number(guide.rating || 0).toFixed(1)} / 5.0`
                        : 'New Guide'}
                    </span>
                    <span className="text-xs text-blue-200">
                      ({guide.reviewCount || 0} verified{' '}
                      {guide.reviewCount === 1 ? 'review' : 'reviews'})
                    </span>
                    <span className="text-xs text-blue-200 flex items-center gap-1">
                      • <Briefcase size={13} /> {guide.experienceYears || 1}+ Years Experience
                    </span>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-4 text-right min-w-[150px]">
                  <span className="text-xs text-blue-200 block">Daily Service Rate</span>
                  <span className="text-2xl font-extrabold text-amber-300">
                    {formatLKR(guide.dailyRate)}
                  </span>
                  <span className="text-[11px] text-blue-200 block">per day (up to 8 hrs)</span>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* Biography */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">About {displayName}</h2>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {guide.bio ||
                    'Experienced Sri Lankan tour guide ready to customize cultural, wildlife, and scenic tours across the island.'}
                </p>
              </div>

              {/* Service Areas & Languages */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 mb-2.5">
                    <MapPin size={14} className="text-blue-600" /> Service Districts Covered
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(guide.serviceAreas || []).map((area, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-semibold bg-blue-50 text-blue-800 px-3 py-1 rounded-lg border border-blue-100"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 mb-2.5">
                    <Globe size={14} className="text-blue-600" /> Spoken Languages
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(guide.languages || []).map((lang, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-semibold bg-indigo-50 text-indigo-800 px-3 py-1 rounded-lg border border-indigo-100"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Expertise & Qualifications */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {guide.expertise && guide.expertise.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 mb-2.5">
                      <Sparkles size={14} className="text-teal-600" /> Areas of Expertise
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {guide.expertise.map((exp, idx) => (
                        <span
                          key={idx}
                          className="text-xs font-semibold bg-teal-50 text-teal-800 px-3 py-1 rounded-lg border border-teal-100"
                        >
                          {exp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 mb-2.5">
                    <Award size={14} className="text-amber-600" /> Licenses & Qualifications
                  </h3>
                  {guide.qualifications && guide.qualifications.length > 0 ? (
                    <ul className="space-y-1.5 text-xs text-gray-700">
                      {guide.qualifications.map((q, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-500">SLTDA Registered National Tour Guide</p>
                  )}
                </div>
              </div>

              {/* Contact & Availability Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100 text-xs text-gray-700">
                {guide.contactNumber && (
                  <div className="flex items-center gap-2">
                    <Phone size={15} className="text-blue-600" />
                    <div>
                      <span className="text-gray-400 block">Phone / WhatsApp</span>
                      <span className="font-bold">{guide.contactNumber}</span>
                    </div>
                  </div>
                )}
                {(guide.email || guide.userId?.email) && (
                  <div className="flex items-center gap-2">
                    <Mail size={15} className="text-blue-600" />
                    <div>
                      <span className="text-gray-400 block">Email</span>
                      <span className="font-bold">{guide.email || guide.userId?.email}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-blue-600" />
                  <div>
                    <span className="text-gray-400 block">Schedule Note</span>
                    <span className="font-semibold">
                      {guide.availabilityNotes || 'Flexible island-wide schedule'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reviews & Ratings Section */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6">
              Verified Tourist Reviews & Ratings
            </h2>
            <ReviewList
              targetType="guide"
              targetId={guide._id}
              targetName={displayName}
              onRatingUpdated={(_, stats) => {
                setGuide((prev) =>
                  prev
                    ? {
                        ...prev,
                        rating: stats.averageRating,
                        reviewCount: stats.totalReviews
                      }
                    : prev
                );
              }}
            />
          </div>
        </div>

        {/* Right Column: Guide Booking Request Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl shadow-md border border-gray-200 p-6 sticky top-24 space-y-5">
            <div className="border-b border-gray-100 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Direct Service Reservation
              </span>
              <h2 className="text-xl font-extrabold text-gray-900 mt-1">
                Request Guide Booking
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Select your tour dates and group size to send a booking request to {displayName}.
              </p>
            </div>

            {bookingFeedback.message && (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold border ${
                  bookingFeedback.type === 'success'
                    ? 'bg-green-50 text-green-800 border-green-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {bookingFeedback.message}
                {bookingFeedback.type === 'success' && (
                  <div className="mt-2">
                    <Link
                      to="/dashboard"
                      className="underline font-bold text-green-900 hover:text-green-700"
                    >
                      View in My Dashboard &rarr;
                    </Link>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <div className="relative">
                    <Calendar
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={bookingForm.startDate}
                      onChange={(e) =>
                        setBookingForm({ ...bookingForm, startDate: e.target.value })
                      }
                      className="w-full pl-9 pr-2.5 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    End Date *
                  </label>
                  <div className="relative">
                    <Calendar
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="date"
                      required
                      min={bookingForm.startDate || new Date().toISOString().split('T')[0]}
                      value={bookingForm.endDate}
                      onChange={(e) =>
                        setBookingForm({ ...bookingForm, endDate: e.target.value })
                      }
                      className="w-full pl-9 pr-2.5 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Real-time Availability Indicator */}
              {bookingForm.startDate && bookingForm.endDate && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                    checkingAvail
                      ? 'bg-gray-50 text-gray-600 border-gray-200'
                      : availabilityStatus?.dateRangeAvailable === false
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-green-50 text-green-800 border-green-200'
                  }`}
                >
                  {checkingAvail ? (
                    <span>Checking guide schedule...</span>
                  ) : availabilityStatus?.dateRangeAvailable === false ? (
                    <>
                      <XCircle size={15} className="flex-shrink-0" />
                      <span>{availabilityStatus.conflictReason || 'Unavailable on selected dates'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} className="flex-shrink-0" />
                      <span>Guide is available for these {serviceDays} day(s)!</span>
                    </>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Number of Travelers *
                </label>
                <div className="relative">
                  <Users
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={bookingForm.travelersCount}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, travelersCount: e.target.value })
                    }
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Trip Notes / Special Guiding Requests
                </label>
                <textarea
                  rows={3}
                  value={bookingForm.serviceNotes}
                  onChange={(e) =>
                    setBookingForm({ ...bookingForm, serviceNotes: e.target.value })
                  }
                  placeholder="Mention pickup city, preferred attractions, language preference, or special interests..."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Price Calculation Summary */}
              <div className="bg-blue-50/70 rounded-2xl p-4 border border-blue-100 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Daily Service Rate</span>
                  <span className="font-semibold text-gray-900">
                    {formatLKR(guide.dailyRate)} / day
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Duration</span>
                  <span className="font-semibold text-gray-900">
                    {serviceDays} {serviceDays === 1 ? 'Day' : 'Days'}
                  </span>
                </div>
                <div className="border-t border-blue-200 pt-2 flex justify-between items-baseline">
                  <span className="font-bold text-blue-950 text-sm">Total Estimated Cost</span>
                  <span className="text-lg font-extrabold text-blue-900">
                    {formatLKR(estimatedTotalLKR)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  bookingSubmitting ||
                  !isAvailable ||
                  availabilityStatus?.dateRangeAvailable === false ||
                  serviceDays <= 0
                }
                className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-sm transition disabled:opacity-50"
              >
                {bookingSubmitting
                  ? 'Sending Request...'
                  : user
                    ? 'Submit Guide Booking Request'
                    : 'Log In to Book This Guide'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuideDetails;

