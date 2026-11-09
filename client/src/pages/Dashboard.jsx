
import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navigate, Link, useNavigate } from 'react-router-dom';

import {
  User,
  Map,
  CreditCard,
  Star,
  Edit2,
  Trash2,
  Building2,
  Compass,
  ShieldAlert,
  Calendar,
  XCircle,
  ExternalLink
} from 'lucide-react';

import api from '../services/api';
import StarRating from '../components/StarRating';
import ReviewForm from '../components/ReviewForm';
import AdminReportedReviews from '../components/AdminReportedReviews';
import SavedPlansList from '../components/SavedPlansList';
import GuideDashboardPanel from '../components/GuideDashboardPanel';
import HotelOwnerDashboardPanel from '../components/HotelOwnerDashboardPanel';

// Format booking amount
const formatLKR = (amount) => {
  const num = Number(amount || 0);

  return num >= 500
    ? `LKR ${num.toLocaleString('en-LK')}`
    : `$${num}`;
};

const Dashboard = () => {
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  // Dashboard states
  const [myReviews, setMyReviews] = useState([]);
  const [myItineraries, setMyItineraries] = useState([]);
  const [myBookings, setMyBookings] = useState([]);

  const [loadingReviews, setLoadingReviews] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  // Fetch tourist dashboard data
  const fetchTouristDashboardData = async () => {
    if (!user) return;

    setLoadingReviews(true);

    try {
      const [revRes, bookRes, itinRes] = await Promise.all([
        api.get('/reviews/my-reviews').catch(() => ({
          data: { data: [] }
        })),

        api.get('/bookings/my-requests').catch(() => ({
          data: { data: [] }
        })),

        api.get('/itineraries').catch(() => ({
          data: { data: [] }
        }))
      ]);

      setMyReviews(revRes.data?.data || []);
      setMyBookings(bookRes.data?.data || []);
      setMyItineraries(itinRes.data?.data || []);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Load data when tourist logs in
  useEffect(() => {
    if (user && user.role === 'tourist') {
      fetchTouristDashboardData();
    }
  }, [user]);

  // Delete review
  const handleDeleteMyReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      await api.delete(`/reviews/${reviewId}`);
      fetchTouristDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete review');
    }
  };

  // Cancel booking
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking request?')) {
      return;
    }

    try {
      await api.put(`/bookings/${bookingId}/status`, {
        status: 'Cancelled'
      });

      fetchTouristDashboardData();
    } catch (err) {
      alert(
        err.response?.data?.error ||
        'Failed to cancel booking request'
      );
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-12 text-center">
        Loading...
      </div>
    );
  }

  // Authentication check
  if (!user) {
    return <Navigate to="/login" />;
  }

  // User role labels
  const roleLabels = {
    tourist: 'Tourist',
    guide: 'Tour Guide',
    hotel_owner: 'Hotel Partner',
    admin: 'Administrator'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">

      {/* Welcome Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">

        <div className="bg-blue-900 p-8 text-white flex flex-wrap justify-between items-center gap-4">

          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome Back, {user.name}!
            </h1>

            <p className="text-blue-200">
              Manage your profile, service bookings, and verified reviews
            </p>
          </div>

          <div className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/30 font-semibold tracking-wide">
            Role: {roleLabels[user.role] || user.role}
          </div>

        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        {/* Left Navigation */}
        <div className="col-span-1 space-y-6">

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">

            <h3 className="font-bold text-gray-800 mb-4 flex items-center">
              <User size={18} className="mr-2 text-blue-600" />
              Quick Navigation
            </h3>

            <ul className="space-y-3 text-sm">

              <li>
                <Link
                  to="/hotels"
                  className="text-gray-600 hover:text-blue-600 transition flex items-center gap-2"
                >
                  <Building2 size={15} />
                  Partner Hotels & Rooms
                </Link>
              </li>

              <li>
                <Link
                  to="/guides"
                  className="text-gray-600 hover:text-blue-600 transition flex items-center gap-2"
                >
                  <Compass size={15} />
                  Certified Tour Guides
                </Link>
              </li>

              <li>
                <Link
                  to="/planner"
                  className="text-gray-600 hover:text-blue-600 transition flex items-center gap-2"
                >
                  <Map size={15} />
                  Smart Journey Planner
                </Link>
              </li>

              <li>
                <Link
                  to="/calendar"
                  className="text-gray-600 hover:text-blue-600 transition flex items-center gap-2"
                >
                  <Calendar size={15} />
                  Travel & Holiday Calendar
                </Link>
              </li>

              <li>
                <Link
                  to="/routes"
                  className="text-gray-600 hover:text-blue-600 transition flex items-center gap-2"
                >
                  <Map size={15} />
                  Routes & Map
                </Link>
              </li>

            </ul>
          </div>
        </div>

        {/* Right Dashboard Content */}
        <div className="col-span-3">

          {/* TOURIST DASHBOARD */}
          {user.role === 'tourist' && (

            <div className="space-y-8">

              {/* Activity Overview */}
              <div>

                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Your Activity Overview
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  {/* Saved Plans */}
                  <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white shadow-md">

                    <Map className="mb-4 opacity-80" size={32} />

                    <h4 className="text-lg font-bold">
                      Saved Travel Plans
                    </h4>

                    <p className="text-3xl font-extrabold mt-1">
                      {myItineraries.length}
                    </p>

                    <Link
                      to="/planner"
                      className="text-xs underline text-green-100 mt-2 inline-block"
                    >
                      Create or edit itineraries →
                    </Link>

                  </div>

                  {/* Bookings */}
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-md">

                    <CreditCard className="mb-4 opacity-80" size={32} />

                    <h4 className="text-lg font-bold">
                      Service Bookings
                    </h4>

                    <p className="text-3xl font-extrabold mt-1">
                      {myBookings.length}
                    </p>

                  </div>

                  {/* Reviews */}
                  <div className="bg-gradient-to-br from-yellow-400 to-amber-500 p-6 rounded-xl text-white shadow-md">

                    <Star className="mb-4 opacity-80" size={32} />

                    <h4 className="text-lg font-bold">
                      Reviews Given
                    </h4>

                    <p className="text-3xl font-extrabold mt-1">
                      {myReviews.length}
                    </p>

                  </div>

                </div>
              </div>

              {/* Saved Travel Plans Section */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">

                <div className="flex justify-between items-center border-b border-gray-100 pb-4 flex-wrap gap-2">

                  <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Map size={20} className="text-blue-600" />
                      My Saved Travel Plans & Itineraries ({myItineraries.length})
                    </h3>

                    <p className="text-xs text-gray-500 mt-0.5">
                      Access your personalized day-by-day Sri Lankan schedules and calendar plans.
                    </p>
                  </div>

                  <div className="flex gap-2">

                    <Link
                      to="/calendar"
                      className="text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-2 rounded-xl transition"
                    >
                      Open Calendar
                    </Link>

                    <Link
                      to="/planner"
                      className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-2 rounded-xl transition"
                    >
                      + Plan New Trip
                    </Link>

                  </div>
                </div>

                <SavedPlansList
                  savedPlans={myItineraries}
                  loading={loadingReviews}
                  onLoadPlan={() => navigate('/planner?tab=saved')}
                  onViewInCalendar={() => navigate('/calendar')}
                  onDeletePlan={async (planId) => {
                    if (!window.confirm('Delete this saved travel plan?')) {
                      return;
                    }

                    try {
                      await api.delete(`/itineraries/${planId}`);
                      fetchTouristDashboardData();
                    } catch (err) {
                      alert(
                        err.response?.data?.error ||
                        'Failed to delete travel plan'
                      );
                    }
                  }}
                  onCreateNew={() => navigate('/planner')}
                />

              </div>

              {/* Guide & Hotel Booking Requests Section */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">

                <div className="flex justify-between items-center border-b border-gray-100 pb-4 flex-wrap gap-2">

                  <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Calendar size={20} className="text-blue-600" />
                      My Guide & Hotel Booking Requests
                    </h3>

                    <p className="text-xs text-gray-500 mt-0.5">
                      Track the confirmation status of your tour guide and hotel room reservations.
                    </p>
                  </div>

                  <div className="flex gap-2">

                    <Link
                      to="/guides"
                      className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition"
                    >
                      Book a Guide
                    </Link>

                    <Link
                      to="/hotels"
                      className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition"
                    >
                      Book a Hotel
                    </Link>

                  </div>
                </div>

                {myBookings.length === 0 ? (

                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">

                    <p className="text-sm font-semibold text-gray-700">
                      No guide or hotel bookings yet
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      Explore our verified Tour Guides and Partner Hotels to request a reservation.
                    </p>

                  </div>

                ) : (

                  <div className="space-y-3">

                    {myBookings.map((b) => {

                      const statusColors = {
                        Pending: 'bg-amber-100 text-amber-800 border-amber-200',
                        Confirmed: 'bg-green-100 text-green-800 border-green-200',
                        Completed: 'bg-blue-100 text-blue-800 border-blue-200',
                        Rejected: 'bg-red-100 text-red-800 border-red-200',
                        Cancelled: 'bg-gray-100 text-gray-700 border-gray-200'
                      };

                      const isGuide =
                        b.bookingType === 'guide' ||
                        (b.guideId && !b.hotelId);

                      const targetTitle = isGuide
                        ? b.guideId?.name || 'Certified Tour Guide'
                        : b.hotelId?.name || 'Partner Hotel';

                      const targetLink = isGuide
                        ? b.guideId?._id
                          ? `/guides/${b.guideId._id}`
                          : '/guides'
                        : b.hotelId?._id
                          ? `/hotels/${b.hotelId._id}`
                          : '/hotels';

                      return (

                        <div
                          key={b._id}
                          className="p-4 rounded-xl border border-gray-200 hover:border-blue-200 transition flex flex-col sm:flex-row justify-between gap-4"
                        >

                          <div className="space-y-1">

                            <div className="flex items-center gap-2 flex-wrap">

                              <span
                                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                                  statusColors[b.status] || statusColors.Pending
                                }`}
                              >
                                {b.status}
                              </span>

                              <span className="text-xs font-bold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                                {isGuide ? 'Guide Service' : 'Hotel Stay'}
                              </span>

                              <Link
                                to={targetLink}
                                className="font-bold text-gray-900 text-sm hover:text-blue-700 inline-flex items-center gap-1"
                              >
                                {targetTitle}
                                <ExternalLink size={12} />
                              </Link>

                            </div>

                            <div className="text-xs text-gray-600 flex flex-wrap gap-3 pt-1">

                              {isGuide && b.startDate && (
                                <span>
                                  Dates: {new Date(b.startDate).toLocaleDateString()} –{' '}
                                  {new Date(b.endDate || b.startDate).toLocaleDateString()} (
                                  {b.serviceDays || 1} days)
                                </span>
                              )}

                              {!isGuide && b.checkInDate && (
                                <span>
                                  Stay: {new Date(b.checkInDate).toLocaleDateString()} –{' '}
                                  {b.checkOutDate
                                    ? new Date(b.checkOutDate).toLocaleDateString()
                                    : 'N/A'}{' '}
                                  ({b.nights || 1} nights • {b.roomType || 'Standard Room'} ×{' '}
                                  {b.roomQuantity || 1})
                                </span>
                              )}

                              <span className="font-bold text-blue-900">
                                Total: {formatLKR(b.totalAmount)}
                              </span>

                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">

                            {b.status === 'Pending' && (
                              <button
                                type="button"
                                onClick={() => handleCancelBooking(b._id)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition"
                              >
                                <XCircle size={13} />
                                Cancel Request
                              </button>
                            )}

                          </div>

                        </div>
                      );
                    })}

                  </div>
                )}

              </div>

              {/* My Submitted Reviews Section */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">

                <div className="flex justify-between items-center border-b border-gray-100 pb-4">

                  <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Star size={20} className="text-yellow-500 fill-yellow-400" />
                      My Reviews & Ratings
                    </h3>

                    <p className="text-xs text-gray-500 mt-0.5">
                      Manage the reviews you have shared for tour guides and partner hotels.
                    </p>
                  </div>

                  <div className="flex gap-2">

                    <Link
                      to="/guides"
                      className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition"
                    >
                      Review a Guide
                    </Link>

                    <Link
                      to="/hotels"
                      className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition"
                    >
                      Review a Hotel
                    </Link>

                  </div>
                </div>

                {/* Edit Review Form */}
                {editingReview && (
                  <ReviewForm
                    targetType={editingReview.targetType}
                    targetId={editingReview.targetId}
                    targetName={editingReview.targetName}
                    initialReview={editingReview}
                    onSuccess={() => {
                      setEditingReview(null);
                      fetchTouristDashboardData();
                    }}
                    onCancelEdit={() => setEditingReview(null)}
                  />
                )}

                {/* Reviews Loading */}
                {loadingReviews ? (

                  <div className="py-8 text-center text-gray-500 text-sm">
                    Loading your reviews...
                  </div>

                ) : myReviews.length === 0 ? (

                  <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">

                    <Star size={36} className="mx-auto text-gray-300 mb-2" />

                    <h4 className="font-bold text-gray-800">
                      No reviews submitted yet
                    </h4>

                    <p className="text-xs text-gray-500 mt-1 mb-4">
                      Visit the Guides or Hotels directory to rate services you have experienced.
                    </p>

                    <div className="flex justify-center gap-3">

                      <Link
                        to="/guides"
                        className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                      >
                        Browse Guides
                      </Link>

                      <Link
                        to="/hotels"
                        className="bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-green-700 transition"
                      >
                        Browse Hotels
                      </Link>

                    </div>
                  </div>

                ) : (

                  <div className="space-y-3">

                    {myReviews.map((rev) => (

                      <div
                        key={rev._id}
                        className="p-4 rounded-xl border border-gray-200 hover:border-blue-200 transition flex flex-col sm:flex-row justify-between gap-4"
                      >

                        <div className="space-y-1.5">

                          <div className="flex items-center gap-2 flex-wrap">

                            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                              {rev.targetType}
                            </span>

                            <span className="font-bold text-gray-900 text-sm">
                              {rev.targetName}
                            </span>

                            {rev.status === 'hidden' && (
                              <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                Hidden by Moderator
                              </span>
                            )}

                            <span className="text-xs text-gray-400">
                              • {new Date(rev.createdAt).toLocaleDateString()}
                            </span>

                          </div>

                          <StarRating rating={rev.score} size={15} />

                          <p className="text-sm text-gray-700 pt-1">
                            {rev.comment}
                          </p>

                        </div>

                        <div className="flex sm:flex-col justify-end gap-2 flex-shrink-0">

                          {rev.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => setEditingReview(rev)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
                            >
                              <Edit2 size={13} />
                              Edit
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteMyReview(rev._id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition"
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>

                        </div>

                      </div>
                    ))}

                  </div>
                )}

              </div>

            </div>
          )}

          {/* GUIDE DASHBOARD */}
          {user.role === 'guide' && (
            <GuideDashboardPanel />
          )}

          {/* HOTEL OWNER DASHBOARD */}
          {user.role === 'hotel_owner' && (
            <HotelOwnerDashboardPanel />
          )}

          {/* ADMIN DASHBOARD */}
          {user.role === 'admin' && (

            <div className="space-y-6">

              <div className="flex items-center justify-between">

                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <ShieldAlert size={24} className="text-blue-900" />
                  Administrator Moderation Panel
                </h2>

              </div>

              <AdminReportedReviews />

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Dashboard;

