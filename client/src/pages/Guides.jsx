import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Globe,
  DollarSign,
  Award,
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

const Guides = () => {
  const [guides, setGuides] = useState([]);
  const [popularGuides, setPopularGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuideId, setSelectedGuideId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('popular'); // 'popular', 'rating', 'price_low'

  const fetchGuidesData = async () => {
    setLoading(true);
    try {
      const [guidesRes, popularRes] = await Promise.all([
        api.get('/guides'),
        api.get('/reviews/popular/guide?limit=20')
      ]);

      const rawGuides = guidesRes.data?.data || [];
      const popList = popularRes.data?.data || [];
      setPopularGuides(popList.filter((g) => (g.reviewCount || 0) > 0).slice(0, 3));

      // Merge weightedScore and live rating/reviewCount from popular endpoint
      const popMap = new Map(popList.map((item) => [item._id, item]));
      const merged = rawGuides.map((g) => {
        const pop = popMap.get(g._id);
        return {
          ...g,
          rating: pop ? pop.rating : g.rating || 0,
          reviewCount: pop ? pop.reviewCount : g.reviewCount || 0,
          weightedScore: pop ? pop.weightedScore : g.rating || 0
        };
      });

      setGuides(merged);
    } catch (err) {
      console.error('Error fetching guides:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuidesData();
  }, []);

  const handleRatingUpdated = (guideId, stats) => {
    setGuides((prev) =>
      prev.map((g) =>
        g._id === guideId
          ? {
              ...g,
              rating: stats.averageRating,
              reviewCount: stats.totalReviews
            }
          : g
      )
    );
  };

  const getGuideDisplayName = (guide) =>
    guide.name || guide.userId?.name || 'Certified National Tour Guide';

  const filteredGuides = guides
    .filter((g) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const nameMatch = getGuideDisplayName(g).toLowerCase().includes(q);
      const areaMatch = (g.serviceAreas || []).some((a) => a.toLowerCase().includes(q));
      const langMatch = (g.languages || []).some((l) => l.toLowerCase().includes(q));
      return nameMatch || areaMatch || langMatch;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') {
        if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      }
      if (sortBy === 'price_low') {
        return (a.dailyRate || 0) - (b.dailyRate || 0);
      }
      // default 'popular': Bayesian weightedScore
      return (b.weightedScore || 0) - (a.weightedScore || 0);
    });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-10">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-200">
          Verified Local Experts
        </span>
        <h1 className="text-4xl font-extrabold text-blue-950 mt-3 mb-3">
          Certified Sri Lankan Tour Guides
        </h1>
        <p className="text-gray-600 text-base">
          Browse licensed tour guides, inspect verified tourist ratings, and share your own feedback after your journey.
        </p>
      </div>

      {/* Top Rated Banner (Popular-Item Statistics) */}
      {popularGuides.length > 0 && (
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-lg">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles size={15} /> Top-Rated Guides (Review-Based Ranking)
          </div>
          <h2 className="text-xl md:text-2xl font-bold mb-4">
            Most Trusted Guides by Verified Tourists
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {popularGuides.map((g, idx) => (
              <div
                key={g._id}
                onClick={() => setSelectedGuideId(g._id)}
                className="bg-white/10 hover:bg-white/15 backdrop-blur-xs border border-white/15 rounded-2xl p-4 cursor-pointer transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold bg-amber-400 text-blue-950 px-2.5 py-0.5 rounded-full">
                      #{idx + 1} Top Rated
                    </span>
                    <span className="text-xs text-blue-200 font-semibold">
                      ${g.dailyRate}/day
                    </span>
                  </div>
                  <h3 className="font-bold text-base mt-2">{getGuideDisplayName(g)}</h3>
                  <p className="text-xs text-blue-200 mt-1 line-clamp-1">
                    Areas: {(g.serviceAreas || []).join(', ') || 'Island-wide'}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                  <StarRating rating={g.rating || 0} size={14} />
                  <span className="text-xs font-bold text-amber-300">
                    {Number(g.rating || 0).toFixed(1)} ({g.reviewCount || 0}{' '}
                    {g.reviewCount === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter Controls */}
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
            placeholder="Search guides by name, service area (e.g. Kandy, Ella), or language..."
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
            <option value="price_low">Lowest Daily Rate</option>
          </select>
        </div>
      </div>

      {/* Guides List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
        </div>
      ) : filteredGuides.length === 0 ? (
        <div className="bg-gray-50 p-12 rounded-2xl text-center border-2 border-dashed border-gray-300">
          <p className="text-gray-600 font-semibold text-lg">No tour guides found</p>
          <p className="text-gray-400 text-sm mt-1">
            Try clearing your search filter or check back soon.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 items-start">
          {filteredGuides.map((guide) => {
            const displayName = getGuideDisplayName(guide);
            const isExpanded = selectedGuideId === guide._id;
            const reviewCount = guide.reviewCount || 0;
            const avgRating = guide.rating || 0;

            return (
              <div
                key={guide._id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md"
              >
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-800 text-white font-extrabold text-xl flex items-center justify-center shadow-xs">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl font-bold text-gray-900">{displayName}</h3>
                          {guide.availability && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full border border-green-200">
                              <CheckCircle2 size={12} /> Available
                            </span>
                          )}
                        </div>

                        {/* Rating Display Summary */}
                        <div className="flex items-center gap-2 mt-1">
                          <StarRating rating={avgRating} size={16} />
                          <span className="text-sm font-bold text-gray-800">
                            {reviewCount > 0 ? Number(avgRating).toFixed(1) : 'No ratings yet'}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-2xl font-extrabold text-blue-900">
                        ${guide.dailyRate}
                      </span>
                      <span className="block text-xs text-gray-500">per day</span>
                    </div>
                  </div>

                  {guide.bio && (
                    <p className="text-sm text-gray-600 leading-relaxed">{guide.bio}</p>
                  )}

                  <div className="grid sm:grid-cols-2 gap-3 pt-2 text-xs text-gray-700">
                    <div className="flex items-start gap-2 bg-gray-50 p-3 rounded-xl">
                      <MapPin size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-gray-900">Service Areas</span>
                        <span>{(guide.serviceAreas || []).join(', ') || 'All Island'}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-gray-50 p-3 rounded-xl">
                      <Globe size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-gray-900">Languages</span>
                        <span>{(guide.languages || []).join(', ') || 'English, Sinhala'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Reviews Button */}
                  <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Award size={14} className="text-amber-500" />
                      Licensed SLTD Guide
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedGuideId(isExpanded ? null : guide._id)
                      }
                      className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl transition"
                    >
                      <MessageSquare size={14} />
                      {isExpanded
                        ? 'Hide Reviews & Ratings'
                        : `Reviews & Ratings (${reviewCount})`}
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {/* Expandable Review & Rating Drawer */}
                {isExpanded && (
                  <div className="bg-gray-50/70 border-t border-gray-200 p-6 animate-fadeIn">
                    <ReviewList
                      targetType="guide"
                      targetId={guide._id}
                      targetName={displayName}
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

export default Guides;
