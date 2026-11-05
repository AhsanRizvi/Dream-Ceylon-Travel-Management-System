import React, { useState, useEffect } from 'react';
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
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import StarRating from '../components/StarRating';
import ReviewList from '../components/ReviewList';

const Hotels = () => {
  const [hotels, setHotels] = useState([]);
  const [popularHotels, setPopularHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHotelId, setSelectedHotelId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('popular'); // 'popular', 'rating', 'price_low'

  const fetchHotelsData = async () => {
    setLoading(true);
    try {
      const [hotelsRes, popularRes] = await Promise.all([
        api.get('/hotels'),
        api.get('/reviews/popular/hotel?limit=20')
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

  const filteredHotels = hotels
    .filter((h) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const nameMatch = (h.name || '').toLowerCase().includes(q);
      const locMatch = (h.location || '').toLowerCase().includes(q);
      const facMatch = (h.facilities || []).some((f) => f.toLowerCase().includes(q));
      return nameMatch || locMatch || facMatch;
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
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-200">
          Curated Sri Lankan Stays
        </span>
        <h1 className="text-4xl font-extrabold text-blue-950 mt-3 mb-3">
          Partner Hotels & Resorts
        </h1>
        <p className="text-gray-600 text-base">
          Explore handpicked hotels across Sri Lanka, compare guest ratings, and write reviews for your completed stays.
        </p>
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
          <div className="grid md:grid-cols-3 gap-4">
            {popularHotels.map((h, idx) => (
              <div
                key={h._id}
                onClick={() => setSelectedHotelId(h._id)}
                className="bg-white/10 hover:bg-white/15 backdrop-blur-xs border border-white/15 rounded-2xl p-4 cursor-pointer transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold bg-amber-400 text-blue-950 px-2.5 py-0.5 rounded-full">
                      #{idx + 1} Guest Pick
                    </span>
                    <span className="text-xs text-blue-200 font-semibold">
                      ${h.pricePerNight}/night
                    </span>
                  </div>
                  <h3 className="font-bold text-base mt-2">{h.name}</h3>
                  <p className="text-xs text-blue-200 mt-1 flex items-center gap-1">
                    <MapPin size={12} /> {h.location}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                  <StarRating rating={h.rating || 0} size={14} />
                  <span className="text-xs font-bold text-amber-300">
                    {Number(h.rating || 0).toFixed(1)} ({h.reviewCount || 0}{' '}
                    {h.reviewCount === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white p-4 rounded-2xl shadow-xs border border-gray-100">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search hotels by name, city/district, or facility (e.g. Pool, Spa)..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase">Sort By:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm font-semibold border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 text-gray-800"
          >
            <option value="popular">Recommended (Rating & Review Count)</option>
            <option value="rating">Highest Average Rating</option>
            <option value="price_low">Lowest Price per Night</option>
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
          <p className="text-gray-600 font-semibold text-lg">No partner hotels found</p>
          <p className="text-gray-400 text-sm mt-1">
            Try adjusting your search keywords or check back soon.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 items-start">
          {filteredHotels.map((hotel) => {
            const isExpanded = selectedHotelId === hotel._id;
            const reviewCount = hotel.reviewCount || 0;
            const avgRating = hotel.rating || 0;

            return (
              <div
                key={hotel._id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md"
              >
                {/* Top visual banner */}
                <div className="h-36 bg-gradient-to-r from-blue-900 via-indigo-900 to-teal-800 p-6 flex flex-col justify-between text-white relative">
                  <div className="flex justify-between items-center">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full">
                      <MapPin size={12} /> {hotel.location}
                    </span>
                    {hotel.availability && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-green-500/90 text-white px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 size={11} /> Available
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-end">
                    <h3 className="text-2xl font-extrabold drop-shadow-xs">{hotel.name}</h3>
                    <div className="text-right">
                      <span className="text-2xl font-extrabold text-amber-300">
                        ${hotel.pricePerNight}
                      </span>
                      <span className="block text-[11px] text-blue-100">per night</span>
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
                        {reviewCount > 0 ? Number(avgRating).toFixed(1) : 'No ratings yet'}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                      </span>
                    </div>

                    {hotel.ownerId?.name && (
                      <span className="text-xs text-gray-400">
                        Partner: {hotel.ownerId.name}
                      </span>
                    )}
                  </div>

                  {hotel.description && (
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {hotel.description}
                    </p>
                  )}

                  {/* Facilities chips */}
                  {hotel.facilities && hotel.facilities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {hotel.facilities.map((fac, idx) => (
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
                      <span>
                        <strong>Rooms:</strong>{' '}
                        {hotel.rooms
                          .map((r) => `${r.type} (${r.capacity} guests)`)
                          .join(' • ')}
                      </span>
                    </div>
                  )}

                  {/* Action bar */}
                  <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Building2 size={14} className="text-blue-600" />
                      Verified Partner Property
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedHotelId(isExpanded ? null : hotel._id)
                      }
                      className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl transition"
                    >
                      <MessageSquare size={14} />
                      {isExpanded
                        ? 'Hide Guest Reviews'
                        : `Guest Reviews (${reviewCount})`}
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
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
