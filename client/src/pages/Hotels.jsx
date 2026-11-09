import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Building2,
  BedDouble,
  Wifi,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  Sparkles,
  Filter,
  RotateCcw,
  PlusCircle,
  CalendarCheck
} from 'lucide-react';
import api from '../services/api';
import StarRating from '../components/StarRating';
import ReviewList from '../components/ReviewList';
import { useCurrency } from '../context/CurrencyContext';

const FALLBACK_HOTEL_IMAGE =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80';

const formatHotelPrice = (price) => {
  const num = Number(price || 0);
  return num >= 1000 ? `LKR ${num.toLocaleString('en-LK')}` : `$${num}`;
};

const Hotels = () => {
  const { formatPrice, formatDualPrice } = useCurrency();
  const [hotels, setHotels] = useState([]);
  const [popularHotels, setPopularHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHotelId, setSelectedHotelId] = useState(null);
  const [selectedTripHotelId, setSelectedTripHotelId] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('smartLanka_selectedHotel') || 'null');
      return saved?._id || null;
    } catch {
      return null;
    }
  });

  // Discovery Filters (Module 4 Section 5.D)
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  const [minRatingFilter, setMinRatingFilter] = useState('');
  const [sortBy, setSortBy] = useState('popular'); // 'popular', 'rating', 'price_low'

  const fetchHotelsData = async () => {
    setLoading(true);
    try {
      const [hotelsRes, popularRes] = await Promise.all([
        api.get('/hotels'),
        api.get('/reviews/popular/hotel?limit=20').catch(() => ({ data: { data: [] } }))
      ]);

      const rawHotels = hotelsRes.data?.data || [];
      const popList = popularRes.data?.data || [];
      setPopularHotels(popList.filter((h) => (h.reviewCount || 0) > 0).slice(0, 3));

      const popMap = new Map(popList.map((item) => [item._id, item]));
      const merged = rawHotels.map((h) => {
        const pop = popMap.get(h._id);
        return {
          ...h,
          rating: pop ? pop.rating : h.rating || 0,
          reviewCount: pop ? pop.reviewCount : h.reviewCount || 0,
          weightedScore: pop ? pop.weightedScore : h.rating || 0
        };
      });

      setHotels(merged);
    } catch (err) {
      console.error('Error fetching hotels:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotelsData();
  }, []);

  const handleRatingUpdated = (hotelId, stats) => {
    setHotels((prev) =>
      prev.map((h) =>
        h._id === hotelId
          ? {
              ...h,
              rating: stats.averageRating,
              reviewCount: stats.totalReviews
            }
          : h
      )
    );
  };

  const handleSelectHotelForTrip = (hotel) => {
    localStorage.setItem(
      'smartLanka_selectedHotel',
      JSON.stringify({
        _id: hotel._id,
        name: hotel.name,
        district: hotel.district || hotel.location,
        pricePerNight: hotel.pricePerNight,
        photo: hotel.photos?.[0] || FALLBACK_HOTEL_IMAGE
      })
    );
    setSelectedTripHotelId(hotel._id);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setDistrictFilter('');
    setMaxPriceFilter('');
    setFacilityFilter('');
    setRoomTypeFilter('');
    setMinRatingFilter('');
    setSortBy('popular');
  };

  // Unique values for dropdowns
  const allDistricts = Array.from(
    new Set(hotels.map((h) => h.district || h.location).filter(Boolean))
  ).sort();
  const allFacilities = Array.from(
    new Set(hotels.flatMap((h) => h.facilities || []))
  ).sort();
  const allRoomTypes = Array.from(
    new Set(hotels.flatMap((h) => (h.rooms || []).map((r) => r.type)).filter(Boolean))
  ).sort();

  const filteredHotels = hotels
    .filter((h) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const nameMatch = (h.name || '').toLowerCase().includes(q);
        const locMatch = (h.district || h.location || '').toLowerCase().includes(q);
        const facMatch = (h.facilities || []).some((f) => f.toLowerCase().includes(q));
        if (!nameMatch && !locMatch && !facMatch) return false;
      }

      if (districtFilter) {
        const hotelLoc = (h.district || h.location || '').toLowerCase();
        if (hotelLoc !== districtFilter.toLowerCase()) return false;
      }

      if (maxPriceFilter !== '' && Number(maxPriceFilter) > 0) {
        if ((Number(h.pricePerNight) || 0) > Number(maxPriceFilter)) return false;
      }

      if (facilityFilter) {
        const hasFac = (h.facilities || []).some(
          (f) => f.toLowerCase() === facilityFilter.toLowerCase()
        );
        if (!hasFac) return false;
      }

      if (roomTypeFilter) {
        const hasRoom = (h.rooms || []).some(
          (r) => (r.type || '').toLowerCase() === roomTypeFilter.toLowerCase()
        );
        if (!hasRoom) return false;
      }

      if (minRatingFilter !== '' && Number(minRatingFilter) > 0) {
        if ((Number(h.rating) || 0) < Number(minRatingFilter)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') {
        if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      }
      if (sortBy === 'price_low') {
        return (a.pricePerNight || 0) - (b.pricePerNight || 0);
      }
      return (b.weightedScore || 0) - (a.weightedScore || 0);
    });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-10">
      {/* Header & Register CTA */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-3xl shadow-xs border border-gray-100">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-200">
            Curated Sri Lankan Stays
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-blue-950 mt-3 mb-2">
            Partner Hotels & Boutique Resorts
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Filter verified properties by district, nightly room rate, amenities, room categories, and guest ratings. Inspect room availability and reserve directly.
          </p>
        </div>

        <Link
          to="/hotels/register"
          className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold shadow-sm transition flex-shrink-0"
        >
          <PlusCircle size={17} />
          Register Your Hotel
        </Link>
      </div>

      {/* Top Rated Banner (Popular-Item Statistics) */}
      {popularHotels.length > 0 && (
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-lg">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles size={15} /> Highest Rated Stays (Review-Based Ranking)
          </div>
          <h2 className="text-xl md:text-2xl font-bold mb-4">
            Guest-Favorite Partner Hotels
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {popularHotels.map((h, idx) => (
              <Link
                key={h._id}
                to={`/hotels/${h._id}`}
                className="bg-white/10 hover:bg-white/15 backdrop-blur-xs border border-white/15 rounded-2xl p-4 cursor-pointer transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold bg-amber-400 text-blue-950 px-2.5 py-0.5 rounded-full">
                      #{idx + 1} Guest Pick
                    </span>
                    <span className="text-xs text-blue-200 font-semibold">
<span className="text-xs text-blue-200 font-semibold">
  {formatPrice(h.pricePerNightLKR || h.pricePerNight)}/night
</span>
                    </span>
                  </div>
                  <h3 className="font-bold text-base mt-2">{h.name}</h3>
                  <p className="text-xs text-blue-200 mt-1 flex items-center gap-1">
                    <MapPin size={12} /> {h.district || h.location}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                  <StarRating rating={h.rating || 0} size={14} />
                  <span className="text-xs font-bold text-amber-300">
                    {Number(h.rating || 0).toFixed(1)} ({h.reviewCount || 0}{' '}
                    {h.reviewCount === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Multi-Criteria Discovery Filters */}
      <div className="bg-white p-6 rounded-3xl shadow-xs border border-gray-200 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Filter size={14} className="text-blue-600" /> Search & Filter Partner Hotels
          </h3>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            <RotateCcw size={13} /> Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search by Name */}
          <div className="relative sm:col-span-2">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search hotels by name, city/district, or amenity..."
              className="w-full pl-10 pr-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* District Filter */}
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="text-xs font-semibold border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 text-gray-800"
          >
            <option value="">All Districts / Cities</option>
            {allDistricts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Max Price Range Filter */}
          <select
            value={maxPriceFilter}
            onChange={(e) => setMaxPriceFilter(e.target.value)}
            className="text-xs font-semibold border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 text-gray-800"
          >
            <option value="">Any Starting Price (LKR)</option>
            <option value="25000">Up to LKR 25,000 / night</option>
            <option value="35000">Up to LKR 35,000 / night</option>
            <option value="45000">Up to LKR 45,000 / night</option>
            <option value="65000">Up to LKR 65,000 / night</option>
          </select>

          {/* Facility Filter */}
          <select
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
            className="text-xs font-semibold border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 text-gray-800"
          >
            <option value="">Any Facility</option>
            {allFacilities.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          {/* Room Type Filter */}
          <select
            value={roomTypeFilter}
            onChange={(e) => setRoomTypeFilter(e.target.value)}
            className="text-xs font-semibold border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 text-gray-800"
          >
            <option value="">Any Room Category</option>
            {allRoomTypes.map((rt) => (
              <option key={rt} value={rt}>
                {rt}
              </option>
            ))}
          </select>

          {/* Minimum Rating Filter */}
          <select
            value={minRatingFilter}
            onChange={(e) => setMinRatingFilter(e.target.value)}
            className="text-xs font-semibold border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 text-gray-800"
          >
            <option value="">Any Guest Rating</option>
            <option value="4">4.0+ Stars</option>
            <option value="4.5">4.5+ Stars</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs font-semibold border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 text-gray-800"
          >
            <option value="popular">Sort: Recommended</option>
            <option value="rating">Sort: Highest Rating</option>
            <option value="price_low">Sort: Lowest Price</option>
          </select>
        </div>
      </div>

      {/* Hotels Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
        </div>
      ) : filteredHotels.length === 0 ? (
        <div className="bg-gray-50 p-12 rounded-2xl text-center border-2 border-dashed border-gray-300">
          <p className="text-gray-600 font-semibold text-lg">No matching partner hotels found</p>
          <p className="text-gray-400 text-sm mt-1">
            Try resetting your filters or search criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {filteredHotels.map((hotel) => {
            const isExpanded = selectedHotelId === hotel._id;
            const isSelectedForTrip = selectedTripHotelId === hotel._id;
            const reviewCount = hotel.reviewCount || 0;
            const avgRating = hotel.rating || 0;
            const coverPhoto = hotel.photos?.[0] || FALLBACK_HOTEL_IMAGE;

            return (
              <div
                key={hotel._id}
                className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md"
              >
                {/* Top visual banner with hotel photograph */}
                <div className="h-52 bg-gray-900 relative overflow-hidden">
                  <img
                    src={coverPhoto}
                    alt={hotel.name}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = FALLBACK_HOTEL_IMAGE;
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                  <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/90 text-blue-950 px-3 py-1 rounded-full">
                      <MapPin size={12} className="text-blue-600" />
                      {hotel.district || hotel.location}
                    </span>
                    {hotel.availability && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-green-500/90 text-white px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 size={11} /> Available
                      </span>
                    )}
                  </div>

<div className="absolute bottom-4 left-5 right-5 flex justify-between items-end text-white">
  <div>
    <Link
      to={`/hotels/${hotel._id}`}
      className="text-2xl font-extrabold hover:text-amber-300 transition drop-shadow-xs"
    >
      {hotel.name}
    </Link>

    {hotel.address && (
      <p className="text-[11px] text-gray-200 line-clamp-1">
        {hotel.address}
      </p>
    )}
  </div>

  <div className="text-right flex-shrink-0">
    <span className="text-xl font-extrabold text-amber-300">
      {formatPrice(hotel.pricePerNightLKR || hotel.pricePerNight)}
    </span>
    <span className="block text-[11px] text-blue-100">
      starting / night
    </span>
  </div>
</div>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-4">
                  {/* Rating summary bar */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <StarRating rating={avgRating} size={16} />
                      <span className="text-sm font-bold text-gray-900">
                        {reviewCount > 0 ? Number(avgRating).toFixed(1) : 'New Stay'}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                      </span>
                    </div>

                    {(hotel.ownerName || hotel.ownerId?.name) && (
                      <span className="text-xs text-gray-400">
                        Partner: {hotel.ownerName || hotel.ownerId?.name}
                      </span>
                    )}
                  </div>

                  {hotel.description && (
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                      {hotel.description}
                    </p>
                  )}

                  {/* Facilities chips */}
                  {hotel.facilities && hotel.facilities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {hotel.facilities.slice(0, 6).map((fac, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg border border-blue-100"
                        >
                          <Wifi size={11} /> {fac}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Room summary */}
                  {hotel.rooms && hotel.rooms.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-xl text-xs text-gray-700 flex items-center gap-2">
                      <BedDouble size={15} className="text-blue-600 flex-shrink-0" />
                      <span className="line-clamp-1">
                        <strong>Rooms ({hotel.rooms.length} types):</strong>{' '}
                        {hotel.rooms
                          .map((r) => `${r.type} (${r.capacity} guests)`)
                          .join(' • ')}
                      </span>
                    </div>
                  )}

                  {/* Action bar */}
                  <div className="pt-3 border-t border-gray-100 flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/hotels/${hotel._id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl transition shadow-2xs"
                      >
                        <CalendarCheck size={14} />
                        View Rooms & Book
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleSelectHotelForTrip(hotel)}
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl border transition ${
                          isSelectedForTrip
                            ? 'bg-green-50 text-green-700 border-green-300'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        {isSelectedForTrip ? 'Selected for Trip' : 'Select Hotel'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedHotelId(isExpanded ? null : hotel._id)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-2.5 rounded-xl transition"
                    >
                      <MessageSquare size={14} />
                      {isExpanded ? 'Hide Reviews' : `Reviews (${reviewCount})`}
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Expandable Review & Rating Drawer */}
                {isExpanded && (
                  <div className="bg-gray-50/70 border-t border-gray-200 p-6 animate-fadeIn">
                    <ReviewList
                      targetType="hotel"
                      targetId={hotel._id}
                      targetName={hotel.name}
                      onRatingUpdated={handleRatingUpdated}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Hotels;
