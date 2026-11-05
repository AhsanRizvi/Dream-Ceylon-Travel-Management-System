import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import {
  User,
  Map,
  CreditCard,
  Star,
  Edit2,
  Trash2,
  Building2,
  Compass,
  ShieldAlert
} from 'lucide-react';
import api from '../services/api';
import StarRating from '../components/StarRating';
import ReviewForm from '../components/ReviewForm';
import AdminReportedReviews from '../components/AdminReportedReviews';

const Dashboard = () => {
  const { user, loading } = useContext(AuthContext);
  const [myReviews, setMyReviews] = useState([]);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  const fetchTouristDashboardData = async () => {
    if (!user) return;
    setLoadingReviews(true);
    try {
      const [revRes, bookRes] = await Promise.all([
        api.get('/reviews/my-reviews'),
        api.get('/bookings').catch(() => ({ data: { data: [] } }))
      ]);
      setMyReviews(revRes.data?.data || []);
      setBookingsCount((bookRes.data?.data || []).length);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'tourist') {
      fetchTouristDashboardData();
    }
  }, [user]);

  const handleDeleteMyReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await api.delete(`/reviews/${reviewId}`);
      fetchTouristDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete review');
    }
  };

  if (loading) return <div className="p-12 text-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  const roleLabels = {
    tourist: 'Tourist',
    guide: 'Tour Guide',
    hotel_owner: 'Hotel Partner',
    admin: 'Administrator'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="bg-blue-900 p-8 text-white flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome Back, {user.name}!</h1>
            <p className="text-blue-200">
              Manage your profile, bookings, and service reviews
            </p>
          </div>
          <div className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/30 font-semibold tracking-wide">
            Role: {roleLabels[user.role] || user.role}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center">
              <User size={18} className="mr-2 text-blue-600" /> Quick Navigation
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/hotels" className="text-gray-600 hover:text-blue-600 transition flex items-center gap-2">
                  <Building2 size={15} /> Partner Hotels & Reviews
                </Link>
              </li>
              <li>
                <Link to="/guides" className="text-gray-600 hover:text-blue-600 transition flex items-center gap-2">
                  <Compass size={15} /> Tour Guides & Ratings
                </Link>
              </li>
              <li>
                <Link to="/planner" className="text-gray-600 hover:text-blue-600 transition flex items-center gap-2">
                  <Map size={15} /> Smart Journey Planner
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="col-span-3">
          {user.role === 'tourist' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Your Activity Overview
                </h2>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white shadow-md">
                    <Map className="mb-4 opacity-80" size={32} />
                    <h4 className="text-lg font-bold">Smart Planner</h4>
                    <Link
                      to="/planner"
                      className="text-xs underline text-green-100 mt-2 inline-block"
                    >
                      Create or view itineraries &rarr;
                    </Link>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-md">
                    <CreditCard className="mb-4 opacity-80" size={32} />
                    <h4 className="text-lg font-bold">Bookings</h4>
                    <p className="text-3xl font-extrabold mt-1">{bookingsCount}</p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-400 to-amber-500 p-6 rounded-xl text-white shadow-md">
                    <Star className="mb-4 opacity-80" size={32} />
                    <h4 className="text-lg font-bold">Reviews Given</h4>
                    <p className="text-3xl font-extrabold mt-1">{myReviews.length}</p>
                  </div>
                </div>
              </div>

              {/* My Submitted Reviews Section (Module 5) */}
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

                {loadingReviews ? (
                  <div className="py-8 text-center text-gray-500 text-sm">
                    Loading your reviews...
                  </div>
                ) : myReviews.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Star size={36} className="mx-auto text-gray-300 mb-2" />
                    <h4 className="font-bold text-gray-800">No reviews submitted yet</h4>
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
                          <p className="text-sm text-gray-700 pt-1">{rev.comment}</p>
                        </div>

                        <div className="flex sm:flex-col justify-end gap-2 flex-shrink-0">
                          {rev.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => setEditingReview(rev)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteMyReview(rev._id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {(user.role === 'hotel_owner' || user.role === 'guide') && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">Service Management</h2>
              <div className="bg-blue-50 text-blue-900 p-5 rounded-xl border border-blue-200 flex justify-between items-center">
                <div>
                  <h4 className="font-bold">View Your Public Ratings & Tourist Feedback</h4>
                  <p className="text-xs text-blue-700 mt-1">
                    Check how tourists rate your services on the public directory.
                  </p>
                </div>
                <Link
                  to={user.role === 'guide' ? '/guides' : '/hotels'}
                  className="bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition"
                >
                  Open {user.role === 'guide' ? 'Guides' : 'Hotels'} Directory
                </Link>
              </div>
            </div>
          )}

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
