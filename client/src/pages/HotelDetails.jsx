import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Building2,
  BedDouble,
  Wifi,
  Clock,
  Phone,
  Mail,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import ReviewList from '../components/ReviewList';

const FALLBACK_HOTEL_IMAGE =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80';

const formatLKR = (amount) =>
  `LKR ${Number(amount || 0).toLocaleString('en-LK')}`;

const HotelDetails = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [hotel, setHotel] = useState(null);
  const [roomsWithAvail, setRoomsWithAvail] = useState([]);
  const [activePhoto, setActivePhoto] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedForTrip, setSelectedForTrip] = useState(false);

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const threeDaysLater = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

  const [bookingForm, setBookingForm] = useState({
    selectedRoomId: '',
    checkInDate: tomorrow,
    checkOutDate: threeDaysLater,
    roomQuantity: 1,
    guestsCount: 2,
    specialRequests: ''
  });
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingFeedback, setBookingFeedback] = useState({ type: '', message: '' });

  const fetchHotelDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/hotels/${id}`);
      const data = res.data?.data;
      setHotel(data);

      const photos = data?.photos?.length ? data.photos : [FALLBACK_HOTEL_IMAGE];
      setActivePhoto(photos[0]);

      if (data?.rooms?.length > 0) {
        setBookingForm((prev) => ({
          ...prev,
          selectedRoomId: String(data.rooms[0]._id || '')
        }));
      }

      const saved = localStorage.getItem('smartLanka_selectedHotel');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed._id === data._id) setSelectedForTrip(true);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load hotel details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotelDetails();
  }, [id]);

  // Fetch live room availability for the selected checkInDate and checkOutDate
  useEffect(() => {
    const fetchRoomsAvailability = async () => {
      if (!hotel?._id || !bookingForm.checkInDate || !bookingForm.checkOutDate) return;
      try {
        const res = await api.get(
          `/hotels/${hotel._id}/rooms?checkInDate=${bookingForm.checkInDate}&checkOutDate=${bookingForm.checkOutDate}`
        );
        if (res.data?.data) {
          setRoomsWithAvail(res.data.data);
        }
      } catch {
        setRoomsWithAvail(hotel.rooms || []);
      }
    };
    fetchRoomsAvailability();
  }, [hotel?._id, bookingForm.checkInDate, bookingForm.checkOutDate]);

  const displayRooms = roomsWithAvail.length > 0 ? roomsWithAvail : hotel?.rooms || [];

  const selectedRoom =
    displayRooms.find((r) => String(r._id) === String(bookingForm.selectedRoomId)) ||
    displayRooms[0] ||
    null;

  const calculateNights = () => {
    if (!bookingForm.checkInDate || !bookingForm.checkOutDate) return 1;
    const inDate = new Date(bookingForm.checkInDate);
    const outDate = new Date(bookingForm.checkOutDate);
    inDate.setHours(0, 0, 0, 0);
    outDate.setHours(0, 0, 0, 0);
    const diff = Math.round((outDate - inDate) / 86400000);
    return diff > 0 ? diff : 0;
  };

  const nights = calculateNights();
  const roomRate =
    Number(selectedRoom?.pricePerNight ?? selectedRoom?.price) ||
    Number(hotel?.pricePerNight) ||
    0;
  const parsedRoomQty = Math.max(1, Number(bookingForm.roomQuantity) || 1);
  const parsedGuests = Math.max(1, Number(bookingForm.guestsCount) || 1);
  const maxCapacityForSelection = (Number(selectedRoom?.capacity) || 2) * parsedRoomQty;
  const capacityExceeded = parsedGuests > maxCapacityForSelection;
  const estimatedTotalLKR = roomRate * parsedRoomQty * Math.max(0, nights);

  const handleSelectForTrip = () => {
    if (!hotel) return;
    localStorage.setItem(
      'smartLanka_selectedHotel',
      JSON.stringify({
        _id: hotel._id,
        name: hotel.name,
        district: hotel.district || hotel.location,
        pricePerNight: roomRate,
        selectedRoomType: selectedRoom?.type || 'Standard Room',
        photo: hotel.photos?.[0] || FALLBACK_HOTEL_IMAGE
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

    if (nights <= 0) {
      setBookingFeedback({
        type: 'error',
        message: 'Check-out date must be at least 1 night after check-in date.'
      });
      return;
    }

    if (capacityExceeded) {
      setBookingFeedback({
        type: 'error',
        message: `${parsedRoomQty} "${selectedRoom?.type}" room(s) can accommodate at most ${maxCapacityForSelection} guest(s). Please increase room quantity or choose a larger room.`
      });
      return;
    }

    setSubmittingBooking(true);
    try {
      const res = await api.post('/bookings/hotels', {
        hotelId: hotel._id,
        roomId: selectedRoom?._id,
        roomType: selectedRoom?.type,
        roomQuantity: parsedRoomQty,
        checkInDate: bookingForm.checkInDate,
        checkOutDate: bookingForm.checkOutDate,
        guestsCount: parsedGuests,
        specialRequests: bookingForm.specialRequests
      });

      setBookingFeedback({
        type: 'success',
        message:
          res.data?.message ||
          'Hotel booking request submitted! Track your reservation status in your Dashboard.'
      });
      setBookingForm((prev) => ({ ...prev, specialRequests: '' }));
    } catch (err) {
      setBookingFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to submit hotel booking request'
      });
    } finally {
      setSubmittingBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-28">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-red-600 font-bold text-lg">{error || 'Hotel not found'}</p>
        <Link
          to="/hotels"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold"
        >
          <ArrowLeft size={16} /> Back to Partner Hotels
        </Link>
      </div>
    );
  }

  const galleryPhotos =
    hotel.photos && hotel.photos.length > 0 ? hotel.photos : [FALLBACK_HOTEL_IMAGE];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">
      {/* Top Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          to="/hotels"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900"
        >
          <ArrowLeft size={16} /> Back to All Partner Hotels
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
          {selectedForTrip ? 'Selected for Your Trip Plan' : 'Select Hotel for Trip Plan'}
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Columns: Gallery, Property Info, Room Types & Reviews */}
        <div className="lg:col-span-2 space-y-8">
          {/* Property Card & Gallery */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Hero Image */}
            <div className="relative h-80 sm:h-96 bg-gray-900">
              <img
                src={activePhoto || galleryPhotos[0]}
                alt={hotel.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_HOTEL_IMAGE;
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

              <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/90 text-blue-950 px-3.5 py-1.5 rounded-full shadow-xs">
                  <MapPin size={13} className="text-blue-600" />
                  {hotel.district || hotel.location}
                </span>

                {hotel.availability ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-green-500 text-white px-3 py-1 rounded-full shadow-xs">
                    <CheckCircle2 size={12} /> Accepting Reservations
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-500 text-white px-3 py-1 rounded-full">
                    <XCircle size={12} /> Sold Out
                  </span>
                )}
              </div>

              <div className="absolute bottom-6 left-6 right-6 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold drop-shadow-sm">{hotel.name}</h1>
                  {hotel.address && (
                    <p className="text-xs text-gray-200 mt-1 flex items-center gap-1">
                      <MapPin size={12} /> {hotel.address}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <StarRating rating={hotel.rating || 0} size={16} />
                    <span className="text-sm font-bold text-amber-300">
                      {hotel.reviewCount > 0
                        ? `${Number(hotel.rating || 0).toFixed(1)} / 5.0`
                        : 'New Partner Property'}
                    </span>
                    <span className="text-xs text-gray-200">
                      ({hotel.reviewCount || 0} guest{' '}
                      {hotel.reviewCount === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                </div>

                <div className="bg-black/50 backdrop-blur-xs border border-white/20 rounded-2xl px-4 py-3 text-right">
                  <span className="text-[11px] text-gray-300 block">Starting From</span>
                  <span className="text-2xl font-extrabold text-amber-300">
                    {formatLKR(hotel.pricePerNight)}
                  </span>
                  <span className="text-[11px] text-gray-300 block">per night</span>
                </div>
              </div>
            </div>

            {/* Thumbnail Strip */}
            {galleryPhotos.length > 1 && (
              <div className="flex gap-2 p-4 bg-gray-50 border-b border-gray-100 overflow-x-auto">
                {galleryPhotos.map((photoUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePhoto(photoUrl)}
                    className={`w-24 h-16 rounded-xl overflow-hidden border-2 transition flex-shrink-0 ${
                      activePhoto === photoUrl
                        ? 'border-blue-600 scale-105 shadow-xs'
                        : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={photoUrl}
                      alt={`${hotel.name} ${idx + 1}`}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_HOTEL_IMAGE;
                      }}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Property Description & Info */}
            <div className="p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">About This Property</h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {hotel.description ||
                    'Experience warm Sri Lankan hospitality with comfortable rooms and scenic surroundings.'}
                </p>
              </div>

              {/* Facilities */}
              {hotel.facilities && hotel.facilities.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">
                    Property Facilities & Amenities
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {hotel.facilities.map((fac, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-50 text-blue-800 px-3 py-1.5 rounded-xl border border-blue-100"
                      >
                        <Wifi size={12} /> {fac}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Check-in/out, Coordinates & Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100 text-xs text-gray-700">
                <div className="flex items-center gap-2.5 bg-gray-50 p-3.5 rounded-2xl">
                  <Clock size={16} className="text-blue-600 flex-shrink-0" />
                  <div>
                    <span className="text-gray-400 block">Check-In / Check-Out</span>
                    <span className="font-bold">
                      {hotel.checkInTime || '14:00'} / {hotel.checkOutTime || '11:00'}
                    </span>
                  </div>
                </div>

                {hotel.contactNumber && (
                  <div className="flex items-center gap-2.5 bg-gray-50 p-3.5 rounded-2xl">
                    <Phone size={16} className="text-blue-600 flex-shrink-0" />
                    <div>
                      <span className="text-gray-400 block">Front Desk</span>
                      <span className="font-bold">{hotel.contactNumber}</span>
                    </div>
                  </div>
                )}

                {hotel.latitude && hotel.longitude && (
                  <div className="flex items-center gap-2.5 bg-gray-50 p-3.5 rounded-2xl">
                    <MapPin size={16} className="text-blue-600 flex-shrink-0" />
                    <div>
                      <span className="text-gray-400 block">GPS Coordinates</span>
                      <span className="font-bold">
                        {Number(hotel.latitude).toFixed(4)}, {Number(hotel.longitude).toFixed(4)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Available Room Categories Section */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 space-y-5">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                <BedDouble size={22} className="text-blue-600" /> Available Room Types & Rates
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Select a room category below to populate the reservation calculator on the right.
              </p>
            </div>

            <div className="space-y-4">
              {displayRooms.map((room) => {
                const isSelected = String(selectedRoom?._id) === String(room._id);
                const price = Number(room.pricePerNight ?? room.price) || hotel.pricePerNight;
                const remaining =
                  room.remainingRooms !== undefined ? room.remainingRooms : room.count;
                const isRoomAvail = room.availability !== false && remaining > 0;

                return (
                  <div
                    key={room._id || room.type}
                    onClick={() =>
                      setBookingForm((prev) => ({
                        ...prev,
                        selectedRoomId: String(room._id)
                      }))
                    }
                    className={`p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col sm:flex-row justify-between gap-4 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-gray-900">
                          {room.name || room.type}
                        </h3>
                        <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full">
                          Up to {room.capacity} Guests
                        </span>
                        {room.bedConfiguration && (
                          <span className="text-xs font-semibold bg-indigo-50 text-indigo-800 px-2.5 py-0.5 rounded-full">
                            {room.bedConfiguration}
                          </span>
                        )}
                        {isRoomAvail ? (
                          <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
                            {remaining} room(s) left
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full">
                            Sold Out for Selected Dates
                          </span>
                        )}
                      </div>

                      {room.description && (
                        <p className="text-xs text-gray-600">{room.description}</p>
                      )}

                      {room.roomFacilities && room.roomFacilities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {room.roomFacilities.map((rf, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] bg-white text-gray-700 px-2 py-0.5 rounded-md border border-gray-200"
                            >
                              {rf}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex sm:flex-col justify-between items-end text-right flex-shrink-0">
                      <div>
                        <span className="text-xl font-extrabold text-blue-900">
                          {formatLKR(price)}
                        </span>
                        <span className="block text-[11px] text-gray-500">per night</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBookingForm((prev) => ({
                            ...prev,
                            selectedRoomId: String(room._id)
                          }));
                        }}
                        className={`mt-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                          isSelected
                            ? 'bg-blue-700 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                        }`}
                      >
                        {isSelected ? 'Selected Room' : 'Select Room'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Guest Reviews Section */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6">
              Verified Guest Reviews & Ratings
            </h2>
            <ReviewList
              targetType="hotel"
              targetId={hotel._id}
              targetName={hotel.name}
              onRatingUpdated={(_, stats) => {
                setHotel((prev) =>
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

        {/* Right Column: Hotel Booking Request Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl shadow-md border border-gray-200 p-6 sticky top-24 space-y-5">
            <div className="border-b border-gray-100 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Direct Room Reservation
              </span>
              <h2 className="text-xl font-extrabold text-gray-900 mt-1">
                Book Your Hotel Stay
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Choose your check-in/out dates and room count to request a reservation.
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
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Selected Room Type *
                </label>
                <select
                  value={bookingForm.selectedRoomId}
                  onChange={(e) =>
                    setBookingForm({ ...bookingForm, selectedRoomId: e.target.value })
                  }
                  className="w-full px-3 py-2.5 text-xs font-semibold border border-gray-300 rounded-xl bg-white"
                >
                  {displayRooms.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.type} — {formatLKR(r.pricePerNight ?? r.price)}/night (Max {r.capacity}{' '}
                      guests)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Check-In Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingForm.checkInDate}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, checkInDate: e.target.value })
                    }
                    className="w-full px-2.5 py-2 text-xs border border-gray-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Check-Out Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={bookingForm.checkInDate || new Date().toISOString().split('T')[0]}
                    value={bookingForm.checkOutDate}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, checkOutDate: e.target.value })
                    }
                    className="w-full px-2.5 py-2 text-xs border border-gray-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Rooms Needed *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedRoom?.remainingRooms ?? selectedRoom?.count ?? 10}
                    required
                    value={bookingForm.roomQuantity}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, roomQuantity: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Total Guests *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    required
                    value={bookingForm.guestsCount}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, guestsCount: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                  />
                </div>
              </div>

              {capacityExceeded && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                  Max occupancy for {parsedRoomQty} &ldquo;{selectedRoom?.type}&rdquo; room(s) is{' '}
                  {maxCapacityForSelection} guests. Please add another room or reduce guest count.
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Special Requests (Optional)
                </label>
                <textarea
                  rows={2}
                  value={bookingForm.specialRequests}
                  onChange={(e) =>
                    setBookingForm({ ...bookingForm, specialRequests: e.target.value })
                  }
                  placeholder="Early check-in, airport transfer, dietary requirements..."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                />
              </div>

              {/* Price Summary */}
              <div className="bg-blue-50/70 rounded-2xl p-4 border border-blue-100 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Room Rate</span>
                  <span className="font-semibold text-gray-900">
                    {formatLKR(roomRate)} / night
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Stay Duration & Rooms</span>
                  <span className="font-semibold text-gray-900">
                    {nights} {nights === 1 ? 'Night' : 'Nights'} × {parsedRoomQty}{' '}
                    {parsedRoomQty === 1 ? 'Room' : 'Rooms'}
                  </span>
                </div>
                <div className="border-t border-blue-200 pt-2 flex justify-between items-baseline">
                  <span className="font-bold text-blue-950 text-sm">Total Stay Cost</span>
                  <span className="text-lg font-extrabold text-blue-900">
                    {formatLKR(estimatedTotalLKR)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingBooking || nights <= 0 || capacityExceeded}
                className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-sm transition disabled:opacity-50"
              >
                {submittingBooking
                  ? 'Submitting Reservation...'
                  : user
                    ? 'Submit Hotel Booking Request'
                    : 'Log In to Book This Hotel'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelDetails;

