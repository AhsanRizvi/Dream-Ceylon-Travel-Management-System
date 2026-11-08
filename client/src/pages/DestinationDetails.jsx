import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { getRoute, getNearbyDestinations, recordDestinationView } from '../services/api';
import MapView from '../components/MapView';
import ReviewList from '../components/ReviewList';
import { 
  MapPin, Star, Clock, Navigation, Compass, DollarSign, 
  Eye, Tag, ArrowLeft, Sparkles, Car, Route as RouteIcon, MessageSquare
} from 'lucide-react';

/**
 * Dream Ceylon Tourism Management System
 * Destination Details Page (Module 2 & Module 7 Integrated)
 * - Safely records destination view via POST /api/destinations/:id/view (StrictMode deduplicated)
 * - Interactive road route calculator from Colombo / CMB Airport
 * - Nearby destinations discovery (Haversine radius)
 * - Community Reviews & Ratings (Module 5 / Module 7.C integration)
 */

const DestinationDetails = () => {
  const { id } = useParams();
  const [destination, setDestination] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Track which destination ID has already had its view recorded in this mount lifecycle
  const recordedViewIdRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        setRouteInfo(null);
        setImageError(false);

        // 1. Fetch destination details without automatic GET increment (skipView=true)
        const res = await api.get(`/destinations/${id}`, {
          params: { skipView: 'true' }
        });
        const destData = res.data?.data || res.data;
        if (!isMounted) return;
        setDestination(destData);

        // 2. Safely record the user view once per destination visit via POST /api/destinations/:id/view
        if (destData && destData._id && recordedViewIdRef.current !== destData._id) {
          recordedViewIdRef.current = destData._id;
          recordDestinationView(destData._id)
            .then((viewRes) => {
              if (isMounted && viewRes?.viewCount !== undefined) {
                setDestination((prev) =>
                  prev ? { ...prev, viewCount: viewRes.viewCount } : prev
                );
              }
            })
            .catch((err) => console.warn('View tracking notice:', err.message));
        }

        // 3. Fetch nearby destinations within 75km
        if (destData && destData.latitude && destData.longitude) {
          const nearbyList = await getNearbyDestinations(destData.latitude, destData.longitude, 75);
          if (isMounted) {
            setNearby((nearbyList || []).filter((d) => d._id !== destData._id).slice(0, 6));
          }
        }
        if (isMounted) setLoading(false);
      } catch (err) {
        console.error('Error loading destination details:', err);
        if (isMounted) setLoading(false);
      }
    };

    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Calculate route from Colombo (6.9271, 79.8612) to this destination
  const handleCalculateFromColombo = async () => {
    if (!destination) return;
    setCalculatingRoute(true);
    try {
      const colomboLat = 6.9271;
      const colomboLng = 79.8612;
      const rData = await getRoute(colomboLat, colomboLng, destination.latitude, destination.longitude);
      setRouteInfo(rData);
    } catch (err) {
      console.error('Route calculation failed:', err);
    } finally {
      setCalculatingRoute(false);
    }
  };

  if (loading) {
    return (
      <div className="p-24 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-gray-600">Loading destination details...</span>
      </div>
    );
  }

  if (!destination) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-red-50 rounded-3xl border border-red-200 text-center">
        <h2 className="text-xl font-bold text-red-900 mb-2">Destination Not Found</h2>
        <p className="text-xs text-red-700 mb-6">The requested Sri Lankan destination could not be found.</p>
        <Link to="/destinations" className="bg-blue-900 text-white text-xs font-bold px-6 py-3 rounded-xl">
          &larr; Back to Destinations
        </Link>
      </div>
    );
  }

  const heroImage = destination.image || destination.imageUrl;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* Back Navigation Breadcrumb */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link 
          to="/destinations" 
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-blue-900 transition bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm"
        >
          <ArrowLeft size={15} /> Back to All Destinations
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to={`/routes?add=${destination._id}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl border border-emerald-200 transition shadow-sm"
          >
            <RouteIcon size={14} className="text-emerald-600" />
            Add to Multi-Stop Route Planner
          </Link>
        </div>
      </div>

      {/* Hero Banner Header */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-10 border border-gray-100">
        <div className="h-[420px] bg-slate-900 relative flex items-end p-8 md:p-10 overflow-hidden">
          {heroImage && !imageError ? (
            <img 
              src={heroImage} 
              alt={destination.name} 
              onError={() => setImageError(true)}
              className="absolute inset-0 w-full h-full object-cover opacity-85" 
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          
          <div className="relative z-10 text-white w-full flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="bg-blue-600 text-xs font-extrabold px-3.5 py-1 rounded-full uppercase tracking-wider shadow">
                  {destination.category}
                </span>
                {destination.province && (
                  <span className="bg-white/20 backdrop-blur-md text-xs font-semibold px-3 py-1 rounded-full border border-white/30">
                    {destination.province} Province
                  </span>
                )}
                <span className="bg-black/40 backdrop-blur-md text-xs font-semibold px-3 py-1 rounded-full border border-white/20 flex items-center gap-1">
                  <Eye size={12} className="text-blue-300" />
                  {Number(destination.viewCount || 0).toLocaleString()} Views
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight drop-shadow">
                {destination.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-gray-200 text-sm">
                <span className="flex items-center font-medium">
                  <MapPin size={16} className="mr-1.5 text-emerald-400" /> 
                  {destination.location ? `${destination.location} (${destination.district} District)` : `${destination.district} District, Sri Lanka`}
                </span>
                {destination.rating && (
                  <span className="flex items-center text-amber-400 font-bold bg-black/40 px-2.5 py-0.5 rounded-lg backdrop-blur-sm">
                    <Star size={15} className="mr-1 fill-amber-400" /> {Number(destination.rating).toFixed(1)} / 5.0
                    {destination.reviewCount > 0 && (
                      <span className="text-xs text-gray-200 ml-1.5">({destination.reviewCount} reviews)</span>
                    )}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link 
                to={`/routes?add=${destination._id}`} 
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-2xl font-extrabold shadow-lg transition flex items-center gap-2 text-sm whitespace-nowrap"
              >
                <RouteIcon size={17} /> Plan Route Here
              </Link>
              <Link 
                to="/planner" 
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl font-extrabold shadow-lg transition flex items-center gap-2 text-sm whitespace-nowrap"
              >
                <Sparkles size={17} /> Smart Tour Package
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="p-6 md:p-10 grid lg:grid-cols-3 gap-10">
          
          {/* Left 2 Columns: About, Tags, Interactive Map & Reviews */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-3">About {destination.name}</h2>
              <p className="text-gray-700 leading-relaxed text-base">
                {destination.description}
              </p>

              {/* Tags */}
              {destination.tags && destination.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-5 pt-5 border-t border-gray-100">
                  <span className="text-xs font-bold text-gray-400 flex items-center gap-1 mr-1">
                    <Tag size={13} /> Highlights:
                  </span>
                  {destination.tags.map((tag, idx) => (
                    <span 
                      key={idx} 
                      className="text-xs font-semibold bg-blue-50 text-blue-800 px-3 py-1 rounded-full border border-blue-100"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Location & Route Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900">Interactive Location & Route</h2>
                  <p className="text-xs text-gray-500">
                    Exact GPS Coordinates: {destination.latitude?.toFixed(4)}° N, {destination.longitude?.toFixed(4)}° E
                  </p>
                </div>
                <button 
                  onClick={handleCalculateFromColombo}
                  disabled={calculatingRoute}
                  className="flex items-center gap-1.5 text-xs bg-blue-900 text-white px-4 py-2.5 rounded-xl hover:bg-blue-800 transition font-bold shadow-sm disabled:opacity-50"
                >
                  <Navigation size={14} /> 
                  {calculatingRoute ? 'Calculating Road Route...' : 'Show Route from Colombo'}
                </button>
              </div>
              
              {routeInfo && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-wrap gap-6 items-center text-emerald-900 text-sm">
                  <div>
                    <strong className="font-bold">Road Distance from Colombo:</strong> {routeInfo.distanceKm}
                  </div>
                  <div>
                    <strong className="font-bold">Est. Drive Time:</strong> {routeInfo.durationFormatted}
                  </div>
                  <div className="flex items-center gap-1 text-xs bg-emerald-100 px-2.5 py-1 rounded-md font-bold text-emerald-800">
                    <Car size={13} /> Via Sri Lanka Highway Network
                  </div>
                </div>
              )}

              <div className="rounded-2xl overflow-hidden shadow-md border border-gray-200">
                <MapView 
                  startLocation={routeInfo ? { name: 'Colombo Gateway', latitude: 6.9271, longitude: 79.8612, district: 'Colombo' } : null}
                  destinations={[destination]} 
                  routeCoordinates={routeInfo ? routeInfo.leafletCoordinates : []}
                  height="420px"
                />
              </div>
            </div>

            {/* Community Reviews & Ratings Section (Module 5 & Module 7.C Integration) */}
            <div className="pt-8 border-t border-gray-200 space-y-4">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                  <MessageSquare size={22} className="text-blue-600" />
                  Tourist Reviews & Ratings for {destination.name}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Verified ratings from travellers directly power Dream Ceylon&apos;s Top-Rated & Popular destination rankings.
                </p>
              </div>

              <ReviewList
                targetType="destination"
                targetId={destination._id}
                targetName={destination.name}
                onRatingUpdated={(_id, stats) => {
                  if (stats && stats.totalReviews > 0) {
                    setDestination((prev) =>
                      prev
                        ? {
                            ...prev,
                            rating: stats.averageRating,
                            reviewCount: stats.totalReviews
                          }
                        : prev
                    );
                  }
                }}
              />
            </div>
          </div>

          {/* Right Column: Visitor Information & Nearby Attractions */}
          <div className="space-y-6">
            
            {/* Visitor Essentials Card */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 space-y-4">
              <h3 className="text-lg font-extrabold text-gray-900 border-b border-gray-200 pb-3">
                Visitor Information
              </h3>
              
              <div className="space-y-3.5 text-sm">
                <div className="flex items-start gap-3">
                  <Clock size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Best Time to Visit</span>
                    <strong className="text-gray-900 font-semibold">{destination.bestVisitTime || 'Year-round (Morning)'}</strong>
                  </div>
                </div>

                {destination.estimatedVisitDuration && (
                  <div className="flex items-start gap-3">
                    <Compass size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Recommended Duration</span>
                      <strong className="text-gray-900 font-semibold">{destination.estimatedVisitDuration}</strong>
                    </div>
                  </div>
                )}

                {destination.entryFee && (
                  <div className="flex items-start gap-3">
                    <DollarSign size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Entry & Ticket Info</span>
                      <strong className="text-gray-900 font-semibold">{destination.entryFee}</strong>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Eye size={18} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Popularity & Views</span>
                    <strong className="text-gray-900 font-semibold">{Number(destination.viewCount || 0).toLocaleString()} Tourist Views</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Nearby Destinations (within 75km) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-extrabold text-gray-900 mb-1 flex items-center gap-2">
                <Compass size={18} className="text-blue-600" />
                Nearby Attractions
              </h3>
              <p className="text-xs text-gray-500 mb-4">Destinations within 75 km of {destination.name}</p>
              
              {nearby.length === 0 ? (
                <p className="text-gray-500 text-xs py-4">No other destinations found within a 75 km radius.</p>
              ) : (
                <div className="space-y-3">
                  {nearby.map(item => (
                    <Link 
                      key={item._id} 
                      to={`/destinations/${item._id}`}
                      className="block p-3.5 bg-gray-50 hover:bg-blue-50/60 rounded-xl border border-gray-100 hover:border-blue-200 transition group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-sm text-gray-900 group-hover:text-blue-700 transition">
                          {item.name}
                        </h4>
                        <span className="text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                          {item.distanceKm} km
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{item.category} • {item.district} District</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default DestinationDetails;
