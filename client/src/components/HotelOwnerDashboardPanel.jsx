import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  BedDouble,
  MapPin,
  Wifi,
  Clock,
  Star,
  Plus,
  Edit3,
  Trash2,
  Save,
  CheckCircle2,
  XCircle,
  ExternalLink
} from 'lucide-react';
import api from '../services/api';
import StarRating from './StarRating';
import ImageUploader from './ImageUploader';

const FALLBACK_HOTEL_IMAGE =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';

const formatLKR = (amount) =>
  `LKR ${Number(amount || 0).toLocaleString('en-LK')}`;

const emptyRoomForm = {
  type: '',
  description: '',
  count: 5,
  capacity: 2,
  bedConfiguration: '1 King Bed',
  roomFacilitiesText: 'Air Conditioning, Free Wi-Fi, Private Balcony',
  pricePerNight: 28000,
  availability: true
};

const HotelOwnerDashboardPanel = () => {
  const [hotels, setHotels] = useState([]);
  const [selectedHotelIndex, setSelectedHotelIndex] = useState(0);
  const [stats, setStats] = useState({
    totalHotels: 0,
    totalRoomsCount: 0,
    pendingRequests: 0,
    confirmedBookings: 0,
    completedStays: 0,
    totalConfirmedRevenueLKR: 0,
    averageRating: 0,
    totalReviews: 0
  });
  const [bookings, setBookings] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingHotel, setEditingHotel] = useState(false);
  const [savingHotel, setSavingHotel] = useState(false);
  const [hotelForm, setHotelForm] = useState({
    name: '',
    district: '',
    address: '',
    latitude: '',
    longitude: '',
    contactNumber: '',
    contactEmail: '',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    description: '',
    facilitiesText: '',
    photos: [],
    availability: true
  });

  // Room CRUD state
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [roomForm, setRoomForm] = useState(emptyRoomForm);
  const [savingRoom, setSavingRoom] = useState(false);
  const [updatingBookingId, setUpdatingBookingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const fetchOwnerDashboard = async () => {
    setLoading(true);
    try {
      const [ownerRes, bookingsRes] = await Promise.all([
        api.get('/hotels/owner/me'),
        api.get('/bookings/provider-requests').catch(() => ({ data: { data: [] } }))
      ]);

      const d = ownerRes.data;
      const hotelList = d.data || [];
      setHotels(hotelList);
      setStats(d.stats || {});
      setRecentReviews(d.recentReviews || []);
      setBookings(bookingsRes.data?.data || d.recentBookings || []);

      const activeHotel = hotelList[selectedHotelIndex] || hotelList[0];
      if (activeHotel) {
        populateHotelEditorForm(activeHotel);
      }
    } catch (err) {
      console.error('Error loading hotel owner dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const populateHotelEditorForm = (h) => {
    if (!h) return;
    setHotelForm({
      name: h.name || '',
      district: h.district || h.location || '',
      address: h.address || '',
      latitude: h.latitude ?? '',
      longitude: h.longitude ?? '',
      contactNumber: h.contactNumber || '',
      contactEmail: h.contactEmail || '',
      checkInTime: h.checkInTime || '14:00',
      checkOutTime: h.checkOutTime || '11:00',
      description: h.description || '',
      facilitiesText: (h.facilities || []).join(', '),
      photos: h.photos || [],
      availability: h.availability !== false
    });
  };

  useEffect(() => {
    fetchOwnerDashboard();
  }, []);

  const activeHotel = hotels[selectedHotelIndex] || hotels[0] || null;

  const handleSelectHotelTab = (idx) => {
    setSelectedHotelIndex(idx);
    setEditingHotel(false);
    setShowRoomModal(false);
    if (hotels[idx]) {
      populateHotelEditorForm(hotels[idx]);
    }
  };

  const handleSaveHotelProfile = async (e) => {
    e.preventDefault();
    if (!activeHotel) return;
    setSavingHotel(true);
    setFeedback({ type: '', message: '' });

    try {
      const payload = {
        name: hotelForm.name,
        district: hotelForm.district,
        location: hotelForm.district,
        address: hotelForm.address,
        latitude: hotelForm.latitude !== '' ? Number(hotelForm.latitude) : null,
        longitude: hotelForm.longitude !== '' ? Number(hotelForm.longitude) : null,
        contactNumber: hotelForm.contactNumber,
        contactEmail: hotelForm.contactEmail,
        checkInTime: hotelForm.checkInTime,
        checkOutTime: hotelForm.checkOutTime,
        description: hotelForm.description,
        facilities: hotelForm.facilitiesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        photos: hotelForm.photos,
        availability: Boolean(hotelForm.availability)
      };

      await api.put(`/hotels/${activeHotel._id}`, payload);
      setFeedback({ type: 'success', message: 'Hotel profile updated successfully!' });
      setEditingHotel(false);
      await fetchOwnerDashboard();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to update hotel profile'
      });
    } finally {
      setSavingHotel(false);
    }
  };

  const openAddRoomForm = () => {
    setEditingRoomId(null);
    setRoomForm(emptyRoomForm);
    setShowRoomModal(true);
  };

  const openEditRoomForm = (room) => {
    setEditingRoomId(room._id);
    setRoomForm({
      type: room.type || room.name || '',
      description: room.description || '',
      count: room.count || 1,
      capacity: room.capacity || 2,
      bedConfiguration: room.bedConfiguration || '1 King Bed',
      roomFacilitiesText: (room.roomFacilities || []).join(', '),
      pricePerNight: room.pricePerNight ?? room.price ?? 25000,
      availability: room.availability !== false
    });
    setShowRoomModal(true);
  };

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    if (!activeHotel) return;
    setSavingRoom(true);
    setFeedback({ type: '', message: '' });

    try {
      const payload = {
        type: roomForm.type.trim(),
        name: roomForm.type.trim(),
        description: roomForm.description,
        count: Math.max(1, Number(roomForm.count) || 1),
        capacity: Math.max(1, Number(roomForm.capacity) || 2),
        bedConfiguration: roomForm.bedConfiguration,
        roomFacilities: roomForm.roomFacilitiesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        pricePerNight: Math.max(500, Number(roomForm.pricePerNight) || 20000),
        availability: Boolean(roomForm.availability)
      };

      if (editingRoomId) {
        await api.put(`/hotels/${activeHotel._id}/rooms/${editingRoomId}`, payload);
        setFeedback({ type: 'success', message: 'Room category updated successfully!' });
      } else {
        await api.post(`/hotels/${activeHotel._id}/rooms`, payload);
        setFeedback({ type: 'success', message: 'New room category added successfully!' });
      }

      setShowRoomModal(false);
      setEditingRoomId(null);
      await fetchOwnerDashboard();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to save room category'
      });
    } finally {
      setSavingRoom(false);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!activeHotel) return;
    if (!window.confirm('Are you sure you want to delete this room category?')) return;
    setFeedback({ type: '', message: '' });

    try {
      await api.delete(`/hotels/${activeHotel._id}/rooms/${roomId}`);
      setFeedback({ type: 'success', message: 'Room category removed.' });
      await fetchOwnerDashboard();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to delete room category'
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
        message: `Reservation ${status.toLowerCase()} successfully!`
      });
      await fetchOwnerDashboard();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to update reservation status'
      });
    } finally {
      setUpdatingBookingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-gray-500 text-sm">
        Loading your Hotel Owner Dashboard...
      </div>
    );
  }

  if (hotels.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-xs text-center space-y-4">
        <Building2 size={44} className="mx-auto text-blue-600" />
        <h2 className="text-2xl font-extrabold text-gray-900">
          Register Your First Hotel Property
        </h2>
        <p className="text-sm text-gray-600 max-w-lg mx-auto">
          You are logged in as a Hotel Owner. Add your hotel details, photos, facilities, and room categories to start receiving tourist reservations.
        </p>
        <div className="pt-2">
          <Link
            to="/hotels/register"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold shadow-xs transition"
          >
            <Plus size={16} /> Register Hotel Property
          </Link>
        </div>
      </div>
    );
  }

  const pendingList = bookings.filter((b) => b.status === 'Pending');

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
          <span className="text-xs font-bold uppercase text-amber-600">Pending Reservations</span>
          <p className="text-3xl font-extrabold text-gray-900 mt-1">{pendingList.length}</p>
          <span className="text-[11px] text-gray-400">Awaiting approval</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-bold uppercase text-blue-600">Total Room Inventory</span>
          <p className="text-3xl font-extrabold text-gray-900 mt-1">
            {stats.totalRoomsCount || 0}
          </p>
          <span className="text-[11px] text-gray-400">
            Across {hotels.length} property(s)
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-bold uppercase text-green-600">Confirmed Revenue</span>
          <p className="text-xl font-extrabold text-blue-900 mt-1">
            {formatLKR(stats.totalConfirmedRevenueLKR)}
          </p>
          <span className="text-[11px] text-gray-400">
            {stats.confirmedBookings || 0} confirmed, {stats.completedStays || 0} completed
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-bold uppercase text-purple-600">Guest Rating</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-extrabold text-gray-900">
              {Number(stats.averageRating || activeHotel?.rating || 0).toFixed(1)}
            </span>
            <Star size={18} className="text-yellow-500 fill-yellow-400" />
          </div>
          <span className="text-[11px] text-gray-400">
            {stats.totalReviews || activeHotel?.reviewCount || 0} guest review(s)
          </span>
        </div>
      </div>

      {/* Property Switcher Bar (if owner has multiple hotels) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200">
        <div className="flex flex-wrap gap-2">
          {hotels.map((h, idx) => (
            <button
              key={h._id}
              type="button"
              onClick={() => handleSelectHotelTab(idx)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                selectedHotelIndex === idx
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {h.name} ({h.district || h.location})
            </button>
          ))}
        </div>

        <Link
          to="/hotels/register"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold"
        >
          <Plus size={14} /> Add Another Property
        </Link>
      </div>

      {/* Active Hotel Profile Card & Editor */}
      {activeHotel && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <img
                src={activeHotel.photos?.[0] || FALLBACK_HOTEL_IMAGE}
                alt={activeHotel.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_HOTEL_IMAGE;
                }}
                className="w-20 h-16 rounded-2xl object-cover border border-gray-200"
              />
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">{activeHotel.name}</h2>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <MapPin size={12} className="text-blue-600" />
                  {activeHotel.address || activeHotel.district || activeHotel.location} • Starting{' '}
                  {formatLKR(activeHotel.pricePerNight)}/night
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/hotels/${activeHotel._id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                <ExternalLink size={13} /> Public Page
              </Link>
              <button
                type="button"
                onClick={() => setEditingHotel(!editingHotel)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition"
              >
                <Edit3 size={13} />
                {editingHotel ? 'Close Editor' : 'Edit Property Info'}
              </button>
            </div>
          </div>

          {editingHotel ? (
            <form onSubmit={handleSaveHotelProfile} className="p-6 space-y-4 bg-blue-50/20">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Hotel Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={hotelForm.name}
                    onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    District / City *
                  </label>
                  <input
                    type="text"
                    required
                    value={hotelForm.district}
                    onChange={(e) => setHotelForm({ ...hotelForm, district: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    value={hotelForm.contactNumber}
                    onChange={(e) =>
                      setHotelForm({ ...hotelForm, contactNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={hotelForm.address}
                    onChange={(e) => setHotelForm({ ...hotelForm, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Check-In Time
                  </label>
                  <input
                    type="text"
                    value={hotelForm.checkInTime}
                    onChange={(e) => setHotelForm({ ...hotelForm, checkInTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Check-Out Time
                  </label>
                  <input
                    type="text"
                    value={hotelForm.checkOutTime}
                    onChange={(e) => setHotelForm({ ...hotelForm, checkOutTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Property Facilities (Comma separated)
                </label>
                <input
                  type="text"
                  value={hotelForm.facilitiesText}
                  onChange={(e) => setHotelForm({ ...hotelForm, facilitiesText: e.target.value })}
                  placeholder="Free Wi-Fi, Infinity Pool, Ayurvedic Spa, Restaurant"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                />
              </div>

              <ImageUploader
                label="Hotel Photographs"
                value={hotelForm.photos}
                onChange={(urls) => setHotelForm({ ...hotelForm, photos: urls })}
                multiple={true}
                category="hotel"
              />

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Property Description
                </label>
                <textarea
                  rows={3}
                  value={hotelForm.description}
                  onChange={(e) => setHotelForm({ ...hotelForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingHotel(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingHotel}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold"
                >
                  <Save size={14} /> {savingHotel ? 'Saving...' : 'Save Property Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">{activeHotel.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {(activeHotel.facilities || []).map((fac, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-semibold bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg border border-blue-100"
                  >
                    {fac}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Room Management Section (Section 5.B) */}
      {activeHotel && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-5">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                <BedDouble size={20} className="text-blue-600" /> Room Categories & Pricing Management
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage room types, nightly LKR rates, maximum occupancy, room count, and availability for {activeHotel.name}.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddRoomForm}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-2xs transition"
            >
              <Plus size={15} /> Add New Room Type
            </button>
          </div>

          {/* Add / Edit Room Form Drawer */}
          {showRoomModal && (
            <form
              onSubmit={handleSaveRoom}
              className="p-5 rounded-2xl bg-blue-50/40 border border-blue-200 space-y-4"
            >
              <h4 className="text-sm font-bold text-blue-950">
                {editingRoomId ? 'Edit Room Category' : 'Add New Room Category'}
              </h4>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                    Room Type / Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={roomForm.type}
                    onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value })}
                    placeholder="e.g. Executive Suite"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                    Nightly Rate (LKR) *
                  </label>
                  <input
                    type="number"
                    min="500"
                    required
                    value={roomForm.pricePerNight}
                    onChange={(e) => setRoomForm({ ...roomForm, pricePerNight: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                    Bed Configuration
                  </label>
                  <input
                    type="text"
                    value={roomForm.bedConfiguration}
                    onChange={(e) =>
                      setRoomForm({ ...roomForm, bedConfiguration: e.target.value })
                    }
                    placeholder="1 King Bed"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                    Room Count *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={roomForm.count}
                    onChange={(e) => setRoomForm({ ...roomForm, count: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                    Max Occupancy *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                    Availability
                  </label>
                  <select
                    value={roomForm.availability ? 'true' : 'false'}
                    onChange={(e) =>
                      setRoomForm({ ...roomForm, availability: e.target.value === 'true' })
                    }
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                  >
                    <option value="true">Available</option>
                    <option value="false">Unavailable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                    Amenities (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={roomForm.roomFacilitiesText}
                    onChange={(e) =>
                      setRoomForm({ ...roomForm, roomFacilitiesText: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                  Room Description
                </label>
                <input
                  type="text"
                  value={roomForm.description}
                  onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRoom}
                  className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold"
                >
                  {savingRoom ? 'Saving...' : editingRoomId ? 'Update Room' : 'Add Room'}
                </button>
              </div>
            </form>
          )}

          {/* Room Cards List */}
          <div className="grid md:grid-cols-2 gap-4">
            {(activeHotel.rooms || []).map((room) => (
              <div
                key={room._id || room.type}
                className="p-4 rounded-2xl border border-gray-200 hover:border-blue-200 transition flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-bold text-gray-900 text-base">{room.type}</h4>
                      <span className="text-xs text-gray-500">
                        {room.bedConfiguration || '1 Queen Bed'} • Max {room.capacity} guests •{' '}
                        {room.count} rooms total
                      </span>
                    </div>
                    <span className="text-base font-extrabold text-blue-900">
                      {formatLKR(room.pricePerNight ?? room.price ?? activeHotel.pricePerNight)}
                      <span className="block text-[10px] font-normal text-gray-400 text-right">
                        / night
                      </span>
                    </span>
                  </div>

                  {room.description && (
                    <p className="text-xs text-gray-600">{room.description}</p>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      room.availability !== false
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {room.availability !== false ? 'Available' : 'Paused'}
                  </span>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditRoomForm(room)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg"
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRoom(room._id)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incoming & Confirmed Hotel Bookings */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-5">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900">
            Incoming & Confirmed Hotel Reservations
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Review guest check-in/out dates, room quantities, and confirm or reject booking requests.
          </p>
        </div>

        {bookings.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-500 text-sm">
            No hotel reservations received yet.
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
                        Guest: {b.touristId?.name || 'Verified Guest'}
                      </span>
                      {b.hotelId?.name && (
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          {b.hotelId.name}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                      {b.roomType && (
                        <span>
                          <strong>Room:</strong> {b.roomType} × {b.roomQuantity || 1}
                        </span>
                      )}
                      {b.checkInDate && (
                        <span>
                          <strong>Stay:</strong> {new Date(b.checkInDate).toLocaleDateString()} –{' '}
                          {new Date(b.checkOutDate).toLocaleDateString()} ({b.nights || 1} nights)
                        </span>
                      )}
                      <span>
                        <strong>Guests:</strong> {b.guestsCount || 2}
                      </span>
                      <span className="font-bold text-blue-900">
                        Total: {formatLKR(b.totalAmount)}
                      </span>
                    </div>

                    {b.specialRequests && (
                      <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <strong>Special Requests:</strong> {b.specialRequests}
                      </p>
                    )}
                  </div>

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

      {/* Recent Guest Reviews */}
      {recentReviews.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
          <h3 className="text-lg font-extrabold text-gray-900">Recent Guest Feedback</h3>
          <div className="space-y-3">
            {recentReviews.map((rev) => (
              <div key={rev._id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">
                    {rev.authorId?.name || 'Verified Guest'}
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

export default HotelOwnerDashboardPanel;

