import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, {
  getMostViewedDestinations,
  getTopRatedDestinations,
  getPopularDestinations,
  getLastMinuteRecommendations,
  getRoute
} from '../services/api';
import DestinationCard from '../components/DestinationCard';
import MapView from '../components/MapView';
import {
  Compass,
  Shield,
  Award,
  Car,
  Home as HomeIcon,
  Utensils,
  Sparkles,
  ArrowRight,
  Eye,
  Star,
  TrendingUp,
  Clock,
  Calendar,
  MapPin,
  Map as MapIcon,
  Building2,
  CheckCircle2,
  Info,
  X,
  Navigation,
  Route as RouteIcon
} from 'lucide-react';

/**
 * Dream Ceylon Tourism Management System
 * Home Page (Featuring Module 7: Popular, Most-Viewed & Last-Minute Recommendations
 * and Module 2 Interactive Map Preview Modal)
 */

const Home = () => {
  const navigate = useNavigate();

  // Module 7 Live Database State
  const [mostViewed, setMostViewed] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [popularPlaces, setPopularPlaces] = useState([]);
  const [lastMinute, setLastMinute] = useState([]);
  const [lastMinuteMeta, setLastMinuteMeta] = useState(null);

  const [loadingFeeds, setLoadingFeeds] = useState(true);
  const [loadingLastMinute, setLoadingLastMinute] = useState(false);
  const [feedError, setFeedError] = useState(null);

  // Interactive Last-Minute Filter Controls
  const [lmDays, setLmDays] = useState(2);
  const [lmDate, setLmDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [lmCategory, setLmCategory] = useState('All');

  // Interactive "View on Map" Modal State
  const [mapPreviewDest, setMapPreviewDest] = useState(null);
  const [mapPreviewRoute, setMapPreviewRoute] = useState(null);
  const [loadingMapPreviewRoute, setLoadingMapPreviewRoute] = useState(false);

  // Fetch Most-Viewed, Top-Rated, and Popular sections on mount
  useEffect(() => {
    const fetchDiscoverySections = async () => {
      setLoadingFeeds(true);
      setFeedError(null);
      try {
        const [mvRes, trRes, popRes] = await Promise.all([
          getMostViewedDestinations({ limit: 6 }),
          getTopRatedDestinations({ limit: 6 }),
          getPopularDestinations({ limit: 6 })
        ]);
        setMostViewed(mvRes?.data || []);
        setTopRated(trRes?.data || []);
        setPopularPlaces(popRes?.data || []);
      } catch (err) {
        console.error('Error loading homepage discovery sections:', err);
        setFeedError('Unable to load destination analytics from server.');
      } finally {
        setLoadingFeeds(false);
      }
    };

    fetchDiscoverySections();
  }, []);

  // Fetch Last-Minute Travel Suggestions whenever date, duration, or category changes
  useEffect(() => {
    const fetchLastMinute = async () => {
      setLoadingLastMinute(true);
      try {
        const res = await getLastMinuteRecommendations({
          days: lmDays,
          startDate: lmDate,
          category: lmCategory,
          limit: 6
        });
        setLastMinute(res?.data || []);
        setLastMinuteMeta(res?.meta || null);
      } catch (err) {
        console.error('Error loading last-minute recommendations:', err);
      } finally {
        setLoadingLastMinute(false);
      }
    };

    fetchLastMinute();
  }, [lmDays, lmDate, lmCategory]);

  // Open Interactive Map Modal for any destination card
  const handleOpenMapPreview = async (dest) => {
    setMapPreviewDest(dest);
    setMapPreviewRoute(null);
    if (dest && dest.latitude && dest.longitude) {
      setLoadingMapPreviewRoute(true);
      try {
        // Calculate road route from Bandaranaike International Airport (CMB)
        const rData = await getRoute(7.1808, 79.8841, dest.latitude, dest.longitude, 'car', false);
        setMapPreviewRoute(rData);
      } catch (err) {
        console.warn('Preview route calculation fallback:', err.message);
      } finally {
        setLoadingMapPreviewRoute(false);
      }
    }
  };

  return (
    <div className="space-y-16 pb-16">
      {/* HERO SECTION */}
      <div className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white py-24 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest bg-white/10 backdrop-blur-md text-yellow-300 px-4 py-1.5 rounded-full border border-white/20 mb-5">
            <Sparkles size={14} /> Smart Lanka Tourism Planner & Travel Management System
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight">
            Discover the Pearl of the Indian Ocean
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-3xl mx-auto text-blue-100 leading-relaxed">
            Plan your personalized Sri Lankan vacation with interactive multi-stop road routing, live destination popularity insights, Bayesian review rankings, and last-minute travel suggestions.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/planner"
              className="bg-green-600 hover:bg-green-500 text-white px-7 py-3.5 rounded-xl font-bold text-base transition shadow-lg inline-flex items-center gap-2"
            >
              <Sparkles size={18} /> Start Smart Planner
            </Link>
            <Link
              to="/routes"
              className="bg-blue-600 hover:bg-blue-500 text-white px-7 py-3.5 rounded-xl font-bold text-base transition shadow-lg inline-flex items-center gap-2 border border-blue-400/40"
            >
              <RouteIcon size={18} /> Route & Transport Map
            </Link>
            <Link
              to="/destinations"
              className="bg-white text-blue-950 hover:bg-gray-100 px-7 py-3.5 rounded-xl font-bold text-base transition shadow-lg"
            >
              Explore All 48+ Destinations
            </Link>
          </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION 1: MOST VIEWED DESTINATIONS (Module 7.A & 7.B)
          ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 inline-flex items-center gap-1.5">
              <Eye size={13} className="text-blue-600" /> Live View Analytics • Module 7
            </span>
            <h2 className="text-3xl font-extrabold text-gray-900 mt-2">
              Most Viewed Destinations
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Ranked dynamically by actual tourist detail-page view counts recorded in MongoDB.
            </p>
          </div>
          <Link
            to="/destinations"
            className="text-blue-700 font-bold text-sm hover:underline inline-flex items-center gap-1"
          >
            View All Destinations <ArrowRight size={15} />
          </Link>
        </div>

        {loadingFeeds ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-80 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : feedError ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center text-sm text-red-700">
            {feedError}
          </div>
        ) : mostViewed.length === 0 ? (
          <div className="p-8 bg-gray-50 rounded-2xl text-center text-sm text-gray-500">
            No destination views recorded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mostViewed.map((dest, idx) => (
              <DestinationCard
                key={dest._id}
                destination={dest}
                badgeText={`#${idx + 1} Most Viewed • ${Number(dest.viewCount || 0).toLocaleString()} views`}
                showQuickActions={true}
                onViewOnMap={handleOpenMapPreview}
              />
            ))}
          </div>
        )}
      </section>

      {/* =====================================================================
          SECTION 2: TOP RATED DESTINATIONS (Module 7.C - Review Integrated)
          ===================================================================== */}
      <section className="bg-slate-50 py-14 border-y border-gray-200/80">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-800 bg-amber-100/80 px-3 py-1 rounded-full border border-amber-300 inline-flex items-center gap-1.5">
                <Star size={13} className="fill-amber-500 text-amber-600" /> Bayesian Review Ranking • Module 5 & 7
              </span>
              <h2 className="text-3xl font-extrabold text-gray-900 mt-2">
                Top Rated Destinations
              </h2>
              <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                Calculated from verified tourist reviews using Bayesian weighted smoothing so single-review outliers never outrank consistently well-reviewed destinations.
              </p>
            </div>
            <Link
              to="/destinations"
              className="text-blue-700 font-bold text-sm hover:underline inline-flex items-center gap-1"
            >
              Browse Directory <ArrowRight size={15} />
            </Link>
          </div>

          {loadingFeeds ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-80 bg-gray-200/70 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : topRated.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl text-center text-sm text-gray-500">
              No top-rated destinations available yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {topRated.map((dest, idx) => (
                <div key={dest._id} className="flex flex-col h-full">
                  <DestinationCard
                    destination={dest}
                    badgeText={
                      dest.reviewCount > 0
                        ? `#${idx + 1} Top Rated • ${dest.reviewCount} Verified Review${dest.reviewCount > 1 ? 's' : ''}`
                        : `#${idx + 1} Rated • Baseline`
                    }
                    showQuickActions={true}
                    onViewOnMap={handleOpenMapPreview}
                  />
                  <div className="mt-2 px-3 py-1.5 bg-white rounded-xl border border-gray-200 flex items-center justify-between text-[11px] text-gray-600">
                    <span className="font-semibold truncate">{dest.ratingSource}</span>
                    <span className="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex-shrink-0">
                      Bayesian Score: {dest.weightedScore}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          SECTION 3: POPULAR PLACES IN SRI LANKA (Module 7.C & 7.E)
          ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-purple-800 bg-purple-100 px-3 py-1 rounded-full border border-purple-200 inline-flex items-center gap-1.5">
              <TrendingUp size={13} className="text-purple-700" /> Composite Popularity Index
            </span>
            <h2 className="text-3xl font-extrabold text-gray-900 mt-2">
              Popular Places in Sri Lanka
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Combining tourist view counts (45%), Bayesian review ratings (40%), and itinerary inclusion demand (15%).
            </p>
          </div>
          <Link
            to="/routes"
            className="text-purple-700 font-bold text-sm hover:underline inline-flex items-center gap-1"
          >
            Build Multi-Stop Route <ArrowRight size={15} />
          </Link>
        </div>

        {loadingFeeds ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-80 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : popularPlaces.length === 0 ? (
          <div className="p-8 bg-gray-50 rounded-2xl text-center text-sm text-gray-500">
            No popular destinations found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularPlaces.map((dest) => (
              <DestinationCard
                key={dest._id}
                destination={dest}
                badgeText={`${dest.popularityBadge} • ${dest.popularityScore}/100`}
                showQuickActions={true}
                onViewOnMap={handleOpenMapPreview}
              />
            ))}
          </div>
        )}
      </section>

      {/* =====================================================================
          SECTION 4: LAST-MINUTE TRAVEL SUGGESTIONS (Module 7.D & 7.E)
          ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 rounded-3xl p-6 md:p-10 text-white shadow-xl space-y-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-white/15 pb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-300 bg-emerald-800/60 px-3.5 py-1 rounded-full border border-emerald-400/30 inline-flex items-center gap-1.5">
                <Clock size={13} /> Smart Spontaneous Getaways • Module 7.D
              </span>
              <h2 className="text-3xl font-extrabold mt-2">
                Last-Minute Travel Suggestions
              </h2>
              <p className="text-sm text-emerald-100/90 mt-1 max-w-2xl">
                Tailored to your upcoming travel date, available trip days, road distance from Colombo/CMB Airport, seasonal weather suitability, and verified partner Hotel/Guide presence in MongoDB.
              </p>
            </div>

            {/* Interactive Date, Duration & Category Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-200 mb-1">
                  Travel Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={lmDate}
                    onChange={(e) => setLmDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white text-gray-900 text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-200 mb-1">
                  Available Duration
                </label>
                <select
                  value={lmDays}
                  onChange={(e) => setLmDays(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white text-gray-900 text-xs font-bold focus:outline-none"
                >
                  <option value={1}>1 Day Excursion</option>
                  <option value={2}>2 Days Weekend</option>
                  <option value={3}>3 Days Short Escape</option>
                  <option value={5}>5 Days Island Tour</option>
                  <option value={7}>7 Days Full Week</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-200 mb-1">
                  Interest Category
                </label>
                <select
                  value={lmCategory}
                  onChange={(e) => setLmCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white text-gray-900 text-xs font-bold focus:outline-none"
                >
                  {['All', 'Beach', 'Mountain', 'Historical', 'Waterfall', 'Wildlife', 'Nature', 'Lake'].map(
                    (c) => (
                      <option key={c} value={c}>
                        {c === 'All' ? 'All Categories' : c}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Honest Availability Transparency Banner */}
          <div className="p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-xs text-emerald-100 flex items-start gap-3">
            <Info size={18} className="text-emerald-300 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-white">Availability & Booking Transparency Notice:</strong>{' '}
              {lastMinuteMeta?.availabilityNote ||
                'Recommendations cross-reference active Partner Hotels and Certified Guides in MongoDB by district. Suggested public destinations are clearly distinguished from confirmed date-specific reservations.'}
            </div>
          </div>

          {/* Last-Minute Recommendation Cards */}
          {loadingLastMinute ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-96 bg-white/10 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : lastMinute.length === 0 ? (
            <div className="p-8 bg-white/10 rounded-2xl text-center text-sm text-emerald-100">
              No last-minute suggestions matched the selected filters. Try choosing &ldquo;All Categories&rdquo; or increasing trip duration.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {lastMinute.map((dest) => {
                const avail = dest.availabilityInfo || {};
                const hasServices =
                  (avail.availableHotelsCount || 0) > 0 || (avail.availableGuidesCount || 0) > 0;

                return (
                  <div
                    key={dest._id}
                    className="bg-white text-gray-900 rounded-2xl shadow-lg overflow-hidden flex flex-col justify-between border border-white/20"
                  >
                    <div>
                      {/* Image Header */}
                      <div className="h-48 bg-slate-900 relative overflow-hidden">
                        <img
                          src={dest.image || dest.imageUrl}
                          alt={dest.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                        <span className="absolute top-3 left-3 bg-emerald-500 text-slate-950 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                          Match: {dest.lastMinuteScore}%
                        </span>

                        <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20">
                          {dest.seasonalBadge}
                        </span>

                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-bold">
                          <span className="flex items-center gap-1">
                            <MapPin size={13} className="text-emerald-400" />
                            {dest.district} District
                          </span>
                          {dest.estimatedRoadDistanceKm && (
                            <span className="bg-blue-900/85 px-2 py-0.5 rounded text-[11px]">
                              ~{dest.estimatedRoadDistanceKm} km ({dest.estimatedDriveHours}h drive)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={`/destinations/${dest._id}`}
                            className="text-lg font-extrabold text-gray-900 hover:text-blue-700 line-clamp-1"
                          >
                            {dest.name}
                          </Link>
                          <span className="flex items-center text-xs font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex-shrink-0">
                            <Star size={11} className="fill-amber-500 text-amber-500 mr-1" />
                            {Number(dest.rating || 4.6).toFixed(1)}
                          </span>
                        </div>

                        {/* Why Suitable for Last-Minute */}
                        <ul className="space-y-1 text-[11px] text-gray-600">
                          {(dest.lastMinuteReasons || []).map((reason, rIdx) => (
                            <li key={rIdx} className="flex items-start gap-1.5">
                              <CheckCircle2
                                size={13}
                                className="text-emerald-600 mt-0.5 flex-shrink-0"
                              />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Regional Partner Availability Status Box */}
                        <div
                          className={`p-3 rounded-xl border text-[11px] ${
                            hasServices
                              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                              : 'bg-gray-50 border-gray-200 text-gray-700'
                          }`}
                        >
                          <div className="font-extrabold flex items-center justify-between mb-0.5">
                            <span className="flex items-center gap-1">
                              <Building2 size={12} className="text-emerald-700" />
                              {avail.status}
                            </span>
                            {hasServices && (
                              <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.5 rounded font-bold">
                                {avail.availableHotelsCount} Hotel(s) • {avail.availableGuidesCount} Guide(s)
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] opacity-85 leading-relaxed">{avail.disclaimer}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons: View Details, Explore/Plan Route, View on Map */}
                    <div className="px-5 pb-5 pt-2 border-t border-gray-100 grid grid-cols-3 gap-1.5">
                      <Link
                        to={`/destinations/${dest._id}`}
                        className="text-center py-2 px-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition text-[11px] flex items-center justify-center"
                      >
                        View Details
                      </Link>
                      <button
                        type="button"
                        onClick={() => navigate(`/routes?add=${dest._id}`)}
                        className="text-center py-2 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition text-[11px] border border-indigo-200 flex items-center justify-center gap-1"
                      >
                        <Compass size={12} /> Explore
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenMapPreview(dest)}
                        className="text-center py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl transition text-[11px] border border-emerald-200 flex items-center justify-center gap-1"
                      >
                        <MapIcon size={12} /> On Map
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          THREE-TIER TOUR PACKAGES OVERVIEW (Preserved Existing Section)
          ===================================================================== */}
      <div className="bg-gray-100/80 py-16 px-4 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
              Transparent Travel Tiers
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3 mb-3">
              Choose Your Ideal Travel Package
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm">
              Whether you need simple private transport, comfortable hotel stays, or a complete all-inclusive luxury experience with curated meals and specialist guides.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Basic Tier */}
            <div className="bg-white rounded-3xl p-7 shadow-sm border border-gray-200 flex flex-col justify-between hover:shadow-lg transition">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                  Standard Transport
                </span>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-3">Basic Package</h3>
                <div className="text-3xl font-extrabold text-blue-900 my-2">
                  $85 <span className="text-xs font-normal text-gray-500">/ person / day</span>
                </div>
                <p className="text-xs text-gray-600 mb-6">
                  Designed for independent travellers who only require dedicated standard transport across Sri Lanka.
                </p>

                <ul className="space-y-2.5 text-xs text-gray-700 border-t border-gray-100 pt-4 mb-6">
                  <li className="flex items-center gap-2 font-semibold text-gray-900">
                    <Car size={15} className="text-blue-600 flex-shrink-0" />
                    Standard AC Vehicle & Chauffeur Included
                  </li>
                  <li className="flex items-center gap-2 text-gray-400">
                    <HomeIcon size={15} className="text-gray-300 flex-shrink-0" />
                    Accommodation Not Included
                  </li>
                  <li className="flex items-center gap-2 text-gray-400">
                    <Utensils size={15} className="text-gray-300 flex-shrink-0" />
                    Food & Meals Not Included
                  </li>
                  <li className="flex items-center gap-2 text-gray-400">
                    <Compass size={15} className="text-gray-300 flex-shrink-0" />
                    Tour Guide Not Included
                  </li>
                </ul>
              </div>

              <Link
                to="/packages"
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 transition"
              >
                Explore Basic Tier <ArrowRight size={14} />
              </Link>
            </div>

            {/* Standard Tier */}
            <div className="bg-white rounded-3xl p-7 shadow-xl border-2 border-blue-600 flex flex-col justify-between relative transform md:-translate-y-2">
              <div className="absolute -top-3.5 right-6 bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow">
                Most Popular
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                  Accommodation & Non-Food
                </span>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-3">Standard Package</h3>
                <div className="text-3xl font-extrabold text-blue-900 my-2">
                  $180 <span className="text-xs font-normal text-gray-500">/ person / day</span>
                </div>
                <p className="text-xs text-gray-600 mb-6">
                  Includes quality 3-4★ hotels, standard transport, and non-food travel facilities. Optional guide add-on available.
                </p>

                <ul className="space-y-2.5 text-xs text-gray-700 border-t border-gray-100 pt-4 mb-6">
                  <li className="flex items-center gap-2 font-semibold text-gray-900">
                    <Car size={15} className="text-blue-600 flex-shrink-0" />
                    Standard AC Vehicle & Non-Food Facilities
                  </li>
                  <li className="flex items-center gap-2 font-semibold text-gray-900">
                    <HomeIcon size={15} className="text-blue-600 flex-shrink-0" />
                    3-4★ Handpicked Hotel Stays Included
                  </li>
                  <li className="flex items-center gap-2 text-amber-700 font-medium">
                    <Utensils size={15} className="text-amber-500 flex-shrink-0" />
                    Food Excluded by Default (Pay as you dine)
                  </li>
                  <li className="flex items-center gap-2 text-blue-700 font-semibold">
                    <Compass size={15} className="text-blue-600 flex-shrink-0" />
                    Tour Guide Optional Add-on (+$45/day)
                  </li>
                </ul>
              </div>

              <Link
                to="/packages"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 transition shadow-md"
              >
                Configure Standard Tier <ArrowRight size={14} />
              </Link>
            </div>

            {/* Premium Tier */}
            <div className="bg-white rounded-3xl p-7 shadow-sm border border-purple-200 flex flex-col justify-between hover:shadow-lg transition">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-800 bg-purple-100 px-3 py-1 rounded-full inline-flex items-center gap-1">
                  <Sparkles size={11} /> Complete Experience
                </span>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-3">Premium Package</h3>
                <div className="text-3xl font-extrabold text-purple-900 my-2">
                  $350 <span className="text-xs font-normal text-gray-500">/ person / day</span>
                </div>
                <p className="text-xs text-gray-600 mb-6">
                  All-inclusive luxury 5★ resorts, luxury transport, custom meal plan selection, and dedicated specialist tour guide.
                </p>

                <ul className="space-y-2.5 text-xs text-gray-700 border-t border-gray-100 pt-4 mb-6">
                  <li className="flex items-center gap-2 font-semibold text-gray-900">
                    <Car size={15} className="text-purple-600 flex-shrink-0" />
                    Luxury Private SUV / Executive Coach
                  </li>
                  <li className="flex items-center gap-2 font-semibold text-gray-900">
                    <HomeIcon size={15} className="text-purple-600 flex-shrink-0" />
                    5★ Luxury Resorts & Boutique Villas
                  </li>
                  <li className="flex items-center gap-2 font-bold text-green-700">
                    <Utensils size={15} className="text-green-600 flex-shrink-0" />
                    Full-Board Dining (Select Preferred Menu)
                  </li>
                  <li className="flex items-center gap-2 font-bold text-purple-800">
                    <Compass size={15} className="text-purple-600 flex-shrink-0" />
                    Specialist Tour Guide Included (Your Choice)
                  </li>
                </ul>
              </div>

              <Link
                to="/packages"
                className="w-full py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 transition"
              >
                Customize Premium Tier <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          INTERACTIVE "VIEW ON MAP" MODAL (Module 2 + Module 7.E Integration)
          ===================================================================== */}
      {mapPreviewDest && (
        <div className="fixed inset-0 z-[2000] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-gray-200 animate-fadeIn">
            <div className="p-5 bg-gradient-to-r from-blue-950 to-indigo-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 block">
                  Interactive Sri Lanka Map & Route Preview
                </span>
                <h3 className="text-xl font-extrabold flex items-center gap-2">
                  <MapPin size={18} className="text-emerald-400" />
                  {mapPreviewDest.name} ({mapPreviewDest.district} District)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMapPreviewDest(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {mapPreviewRoute && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs text-emerald-950">
                  <div className="flex items-center gap-2">
                    <Navigation size={15} className="text-emerald-600" />
                    <span>
                      Route from <strong>Bandaranaike International Airport (CMB)</strong> to{' '}
                      <strong>{mapPreviewDest.name}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-extrabold">
                    <span className="bg-white px-2.5 py-1 rounded-lg border border-emerald-200 text-blue-700">
                      Distance: {mapPreviewRoute.distanceKm}
                    </span>
                    <span className="bg-white px-2.5 py-1 rounded-lg border border-emerald-200 text-indigo-700">
                      Est. Drive: {mapPreviewRoute.durationFormatted}
                    </span>
                  </div>
                </div>
              )}

              <MapView
                startLocation={{
                  name: 'Bandaranaike International Airport (CMB)',
                  latitude: 7.1808,
                  longitude: 79.8841,
                  district: 'Gampaha'
                }}
                destinations={[mapPreviewDest]}
                routeCoordinates={mapPreviewRoute?.leafletCoordinates || []}
                loading={loadingMapPreviewRoute}
                height="400px"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-xs text-gray-500">
                  GPS: {Number(mapPreviewDest.latitude).toFixed(4)}° N,{' '}
                  {Number(mapPreviewDest.longitude).toFixed(4)}° E • Category: {mapPreviewDest.category}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/destinations/${mapPreviewDest._id}`}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition"
                  >
                    Full Destination Details
                  </Link>
                  <Link
                    to={`/routes?add=${mapPreviewDest._id}`}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    <RouteIcon size={13} /> Open in Multi-Stop Route Planner
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
