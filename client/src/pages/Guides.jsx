import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Globe,
  Award,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  Sparkles,
  Briefcase,
  Filter,
  UserPlus,
  ExternalLink,
  CalendarCheck,
  RotateCcw
} from 'lucide-react';
import api from '../services/api';
import StarRating from '../components/StarRating';
import ReviewList from '../components/ReviewList';

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80';

const formatGuidePrice = (rate) => {
  const num = Number(rate || 0);
  return num >= 500 ? `LKR ${num.toLocaleString('en-LK')}` : `$${num}`;
};

const Guides = () => {
  const [guides, setGuides] = useState([]);
  const [popularGuides, setPopularGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuideId, setSelectedGuideId] = useState(null);
  const [selectedTripGuideId, setSelectedTripGuideId] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('smartLanka_selectedGuide') || 'null');
      return saved?._id || null;
    } catch {
      return null;
    }
  });

  // Search & Discovery Filters (Module 4 Section 4.D)
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');
  const [minExperienceFilter, setMinExperienceFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // 'all', 'available'
  const [minRatingFilter, setMinRatingFilter] = useState('');
  const [sortBy, setSortBy] = useState('popular'); // 'popular', 'rating', 'price_low', 'experience'

  const fetchGuidesData = async () => {
    setLoading(true);
    try {
      const [guidesRes, popularRes] = await Promise.all([
        api.get('/guides'),
        api.get('/reviews/popular/guide?limit=20').catch(() => ({ data: { data: [] } }))
      ]);

      const rawGuides = guidesRes.data?.data || [];
      const popList = popularRes.data?.data || [];
      setPopularGuides(popList.filter((g) => (g.reviewCount || 0) > 0).slice(0, 3));

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

  const handleSelectGuideForTrip = (guide) => {
    localStorage.setItem(
      'smartLanka_selectedGuide',
      JSON.stringify({
        _id: guide._id,
        name: guide.name || guide.userId?.name,
        dailyRate: guide.dailyRate,
        serviceAreas: guide.serviceAreas,
        languages: guide.languages,
        profilePhoto: guide.profilePhoto
      })
    );
    setSelectedTripGuideId(guide._id);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setDistrictFilter('');
    setLanguageFilter('');
    setMaxPriceFilter('');
    setMinExperienceFilter('');
    setAvailabilityFilter('all');
    setMinRatingFilter('');
    setSortBy('popular');
  };

  const getGuideDisplayName = (guide) =>
    guide.name || guide.userId?.name || 'Certified National Tour Guide';

  // Extract unique districts & languages for filter dropdowns
  const allDistricts = Array.from(
    new Set(guides.flatMap((g) => g.serviceAreas || []))
  ).sort();
  const allLanguages = Array.from(
    new Set(guides.flatMap((g) => g.languages || []))
  ).sort();

  const filteredGuides = guides
    .filter((g) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const nameMatch = getGuideDisplayName(g).toLowerCase().includes(q);
        const bioMatch = (g.bio || '').toLowerCase().includes(q);
        const areaMatch = (g.serviceAreas || []).some((a) => a.toLowerCase().includes(q));
        const langMatch = (g.languages || []).some((l) => l.toLowerCase().includes(q));
        const expMatch = (g.expertise || []).some((e) => e.toLowerCase().includes(q));
        if (!nameMatch && !bioMatch && !areaMatch && !langMatch && !expMatch) return false;
      }

      if (districtFilter) {
        const hasArea = (g.serviceAreas || []).some(
          (a) => a.toLowerCase() === districtFilter.toLowerCase()
        );
        if (!hasArea) return false;
      }

      if (languageFilter) {
        const hasLang = (g.languages || []).some(
          (l) => l.toLowerCase() === languageFilter.toLowerCase()
        );
        if (!hasLang) return false;
      }

      if (maxPriceFilter !== '' && Number(maxPriceFilter) > 0) {
        if ((Number(g.dailyRate) || 0) > Number(maxPriceFilter)) return false;
      }

      if (minExperienceFilter !== '' && Number(minExperienceFilter) > 0) {
        if ((Number(g.experienceYears) || 0) < Number(minExperienceFilter)) return false;
      }

      if (availabilityFilter === 'available') {
        if (!g.availability || g.serviceStatus === 'paused') return false;
      }

      if (minRatingFilter !== '' && Number(minRatingFilter) > 0) {
        if ((Number(g.rating) || 0) < Number(minRatingFilter)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') {
        if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      }
      if (sortBy === 'price_low') {
        return (a.dailyRate || 0) - (b.dailyRate || 0);
      }
      if (sortBy === 'experience') {
        return (b.experienceYears || 0) - (a.experienceYears || 0);
      }
      return (b.weightedScore || 0) - (a.weightedScore || 0);
    });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-10">
      {/* Header & Guide Registration CTA */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-3xl shadow-xs border border-gray-100">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-200">
            Verified Local Experts
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-blue-950 mt-3 mb-2">
            Certified Sri Lankan Tour Guides
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Filter licensed national and regional guides by district, language, experience, and daily rate. View full profiles or request direct bookings for your itinerary.
          </p>
        </div>

        <Link
          to="/guides/register"
          className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold shadow-sm transition flex-shrink-0"
        >
          <UserPlus size={17} />
          Register as a Tour Guide
        </Link>
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
              <Link
                key={g._id}
                to={`/guides/${g._id}`}
                className="bg-white/10 hover:bg-white/15 backdrop-blur-xs border border-white/15 rounded-2xl p-4 cursor-pointer transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold bg-amber-400 text-blue-950 px-2.5 py-0.5 rounded-full">
                      #{idx + 1} Top Rated
                    </span>
                    <span className="text-xs text-blue-200 font-semibold">
                      {formatGuidePrice(g.dailyRate)}/day
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
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Multi-Criteria Discovery Filters */}
      <div className="bg-white p-6 rounded-3xl shadow-xs border border-gray-200 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Filter size={14} className="text-blue-600" /> Filter & Discover Tour Guides
          </h3>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            <RotateCcw size={13} /> Reset Filters
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by guide name, expertise, district, or language..."
              className="w-full pl-10 pr-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* District / Service Area Filter */}
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="text-xs font-semibold border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 text-gray-800"
          >
            <option value="">All Service Districts</option>
            {allDistricts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Language Filter */}
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="text-xs font-semibold border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 text-gray-800"
          >
            <option value="">All Spoken Languages</option>
            {allLanguages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          {/* Max Daily Rate Filter */}
          <select
            value={maxPriceFilter}
            onChange={(e) => setMaxPriceFilter(e.target.value)}
            className="text-xs font-semibold border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 text-gray-800"
          >
            <option value="">Any Daily Rate (LKR)</option>
            <option value="14000">Up to LKR 14,000 / day</option>
            <option value="16000">Up to LKR 16,000 / day</option>
            <option value="18000">Up to LKR 18,000 / day</option>
            <option value="25000">Up to LKR 25,000 / day</option>
          </select>

          {/* Experience Filter */}
          <select
            value={minExperienceFilter}
            onChange={(e) => setMinExperienceFilter(e.target.value)}
            className="text-xs font-semibold border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 text-gray-800"
          >
            <option value="">Any Experience Level</option>
            <option value="3">3+ Years Experience</option>
            <option value="5">5+ Years Experience</option>
            <option value="8">8+ Years Experience</option>
            <option value="10">10+ Years Experience</option>
          </select>

          {/* Minimum Rating Filter */}
          <select
            value={minRatingFilter}
            onChange={(e) => setMinRatingFilter(e.target.value)}
            className="text-xs font-semibold border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 text-gray-800"
          >
            <option value="">Any Tourist Rating</option>
            <option value="4">4.0+ Stars</option>
            <option value="4.5">4.5+ Stars</option>
          </select>

          {/* Availability & Sort */}
          <div className="flex gap-2">
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="flex-1 text-xs font-semibold border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 text-gray-800"
            >
              <option value="all">All Status</option>
              <option value="available">Available Only</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 text-xs font-semibold border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 text-gray-800"
            >
              <option value="popular">Sort: Popular</option>
              <option value="rating">Sort: Rating</option>
              <option value="price_low">Sort: Lowest Rate</option>
              <option value="experience">Sort: Experience</option>
            </select>
          </div>
        </div>
      </div>

      {/* Guides List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
        </div>
      ) : filteredGuides.length === 0 ? (
        <div className="bg-gray-50 p-12 rounded-2xl text-center border-2 border-dashed border-gray-300">
          <p className="text-gray-600 font-semibold text-lg">No matching tour guides found</p>
          <p className="text-gray-400 text-sm mt-1">
            Try clearing one or more filters to view all registered guides.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 items-start">
          {filteredGuides.map((guide) => {
            const displayName = getGuideDisplayName(guide);
            const isExpanded = selectedGuideId === guide._id;
            const isSelectedForTrip = selectedTripGuideId === guide._id;
            const reviewCount = guide.reviewCount || 0;
            const avgRating = guide.rating || 0;
            const avatarSrc = guide.profilePhoto || guide.userId?.profileImage || FALLBACK_AVATAR;

            return (
              <div
                key={guide._id}
                className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md"
              >
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={avatarSrc}
                        alt={displayName}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = FALLBACK_AVATAR;
                        }}
                        className="w-16 h-16 rounded-2xl object-cover border border-gray-200 shadow-2xs flex-shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/guides/${guide._id}`}
                            className="text-xl font-bold text-gray-900 hover:text-blue-700 transition"
                          >
                            {displayName}
                          </Link>
                          {guide.availability && guide.serviceStatus !== 'paused' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full border border-green-200">
                              <CheckCircle2 size={12} /> Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">
                              Paused
                            </span>
                          )}
                        </div>

                        {/* Rating & Experience Summary */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <StarRating rating={avgRating} size={15} />
                          <span className="text-sm font-bold text-gray-800">
                            {reviewCount > 0 ? Number(avgRating).toFixed(1) : 'New'}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                          </span>
                          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Briefcase size={11} /> {guide.experienceYears || 1} yrs exp
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-xl font-extrabold text-blue-900">
                        {formatGuidePrice(guide.dailyRate)}
                      </span>
                      <span className="block text-xs text-gray-500">per day</span>
                    </div>
                  </div>

                  {guide.bio && (
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                      {guide.bio}
                    </p>
                  )}

                  {/* Expertise Chips */}
                  {guide.expertise && guide.expertise.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {guide.expertise.map((exp, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] font-semibold bg-teal-50 text-teal-800 px-2.5 py-0.5 rounded-lg border border-teal-100"
                        >
                          {exp}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-3 pt-1 text-xs text-gray-700">
                    <div className="flex items-start gap-2 bg-gray-50 p-3 rounded-xl">
                      <MapPin size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-gray-900">Service Districts</span>
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

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-gray-100 flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/guides/${guide._id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl transition shadow-2xs"
                      >
                        <CalendarCheck size={14} />
                        View Profile & Book
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleSelectGuideForTrip(guide)}
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl border transition ${
                          isSelectedForTrip
                            ? 'bg-green-50 text-green-700 border-green-300'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        {isSelectedForTrip ? 'Selected for Trip' : 'Select Guide'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedGuideId(isExpanded ? null : guide._id)}
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
