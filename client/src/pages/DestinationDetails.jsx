import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  MapPin, Star, Calendar, ArrowLeft, Navigation, Plus, Eye, 
  Compass, Clock, DollarSign, Tag, ShieldCheck, Share2 
} from 'lucide-react';
import MapView from '../components/MapView';

/**
 * Dream Ceylon Tourism Management System
 * Destination Details Page
 */

const CATEGORY_COLORS = {
  Beach: 'bg-cyan-600 text-white',
  Mountain: 'bg-emerald-600 text-white',
  Historical: 'bg-amber-600 text-white',
  Cultural: 'bg-purple-600 text-white',
  Waterfall: 'bg-blue-600 text-white',
  Wildlife: 'bg-orange-600 text-white',
  Nature: 'bg-teal-600 text-white',
  Lake: 'bg-indigo-600 text-white'
};

const DestinationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const fetchDestination = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/destinations/${id}`);
        setDestination(res.data?.data || res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch destination details');
      } finally {
        setLoading(false);
      }
    };
    fetchDestination();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !destination) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-red-50 p-8 rounded-3xl border border-red-200">
          <h2 className="text-2xl font-bold text-red-700 mb-2">{error || 'Destination not found'}</h2>
          <p className="text-sm text-gray-600 mb-6">The requested destination may have been moved or updated.</p>
          <button 
            onClick={() => navigate('/destinations')} 
            className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm rounded-xl transition shadow"
          >
            &larr; Back to Destinations
          </button>
        </div>
      </div>
    );
  }

  const imageUrl = destination.image || destination.imageUrl;
  const categoryColor = CATEGORY_COLORS[destination.category] || 'bg-blue-900 text-white';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/destinations')} 
          className="flex items-center text-blue-700 hover:text-blue-900 transition-colors font-bold text-sm group"
        >
          <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to All Destinations
        </button>

        <span className="text-xs font-semibold text-gray-500">
          {destination.province ? `${destination.province} Province • ` : ''}{destination.district} District
        </span>
      </div>

      {/* Main Destination Card Container */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Full Hero Image Banner */}
        <div className="h-80 md:h-[420px] relative flex items-end justify-start bg-slate-900 overflow-hidden">
          {imageUrl && !imgError ? (
            <img 
              src={imageUrl} 
              alt={destination.name}
              onError={() => setImgError(true)}
              className="absolute inset-0 w-full h-full object-cover" 
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900" />
          )}
          
          {/* Subtle Multi-Layer Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          
          <div className="relative z-10 p-8 md:p-12 text-white max-w-4xl space-y-2">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md border border-white/20 ${categoryColor}`}>
                {destination.category} Destination
              </span>
              {destination.province && (
                <span className="bg-white/20 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/30">
                  {destination.province} Province
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight drop-shadow-md text-white">
              {destination.name}
            </h1>

            <p className="text-blue-200 text-sm md:text-base flex items-center gap-2">
              <MapPin size={17} className="text-emerald-400 flex-shrink-0" />
              <span>{destination.location || `${destination.district} District, Sri Lanka`}</span>
            </p>
          </div>
        </div>

        {/* Content & Quick Facts Grid */}
        <div className="grid md:grid-cols-3 gap-8 p-6 md:p-10">
          
          {/* Left 2 Columns: Description, Tags, and CTAs */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Quick Status Tags */}
            <div className="flex flex-wrap gap-2.5 items-center">
              {destination.rating && (
                <span className="flex items-center text-xs font-extrabold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 shadow-sm">
                  <Star size={14} className="mr-1.5 fill-amber-500 text-amber-500" /> {destination.rating.toFixed(1)} / 5.0 Rating
                </span>
              )}
              <span className="flex items-center text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
                <MapPin size={14} className="mr-1.5 text-blue-600" /> {destination.district} District
              </span>
              <span className="flex items-center text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                <Compass size={14} className="mr-1.5 text-emerald-600" /> {destination.category}
              </span>
              <span className="flex items-center text-xs font-medium text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                <Eye size={14} className="mr-1.5 text-gray-500" /> {destination.viewCount || 1} Views
              </span>
            </div>

            {/* About Narrative */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">About {destination.name}</h2>
              <p className="text-gray-700 leading-relaxed text-base md:text-lg">
                {destination.description}
              </p>
            </div>

            {/* Tags Section */}
            {destination.tags && destination.tags.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                  <Tag size={13} /> Relevant Travel Tags:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {destination.tags.map((t, idx) => (
                    <span 
                      key={idx} 
                      className="text-xs font-semibold px-3 py-1 bg-gray-100 text-gray-700 rounded-lg border border-gray-200"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 flex flex-wrap gap-3 border-t border-gray-100">
              <button 
                onClick={() => document.getElementById('map-view').scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs md:text-sm px-6 py-3 rounded-xl shadow transition-colors"
              >
                <Navigation size={17} className="mr-2" /> View Geographic Map
              </button>
              
              <button 
                onClick={() => navigate('/planner')}
                className="flex items-center bg-green-600 hover:bg-green-700 text-white font-bold text-xs md:text-sm px-6 py-3 rounded-xl shadow transition-colors"
              >
                <Plus size={17} className="mr-2" /> Plan a Tour with this Destination
              </button>
            </div>
          </div>

          {/* Right Column: Quick Travel Info Sidebar */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 h-fit space-y-4 shadow-sm">
            <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-200 pb-2.5 flex items-center justify-between">
              <span>Visitor Information</span>
              <ShieldCheck size={18} className="text-emerald-600" />
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-start gap-2 py-1 border-b border-gray-100">
                <span className="font-semibold text-gray-500">District:</span>
                <span className="font-bold text-gray-900 text-right">{destination.district}</span>
              </div>

              <div className="flex justify-between items-start gap-2 py-1 border-b border-gray-100">
                <span className="font-semibold text-gray-500">Province:</span>
                <span className="font-bold text-gray-900 text-right">{destination.province || 'Sri Lanka'}</span>
              </div>

              <div className="flex justify-between items-start gap-2 py-1 border-b border-gray-100">
                <span className="font-semibold text-gray-500">Category:</span>
                <span className="font-bold text-blue-900 text-right">{destination.category}</span>
              </div>

              <div className="flex justify-between items-start gap-2 py-1 border-b border-gray-100">
                <span className="font-semibold text-gray-500">Best Visiting Time:</span>
                <span className="font-bold text-gray-900 text-right">{destination.bestVisitTime || 'Year-round'}</span>
              </div>

              <div className="flex justify-between items-start gap-2 py-1 border-b border-gray-100">
                <span className="font-semibold text-gray-500">Estimated Duration:</span>
                <span className="font-bold text-indigo-900 text-right">{destination.estimatedVisitDuration || '2 - 3 hours'}</span>
              </div>

              <div className="flex justify-between items-start gap-2 py-1 border-b border-gray-100">
                <span className="font-semibold text-gray-500">Entry Fee:</span>
                <span className="font-bold text-emerald-800 text-right">{destination.entryFee || 'Free Entry / Standard'}</span>
              </div>

              <div className="pt-2">
                <span className="font-semibold text-gray-500 block mb-1">GPS Coordinates:</span>
                <div className="bg-white p-2 rounded-lg border border-gray-200 font-mono text-[11px] text-gray-700 text-center">
                  Lat: {destination.latitude} • Lng: {destination.longitude}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Interactive Map Section */}
        <div id="map-view" className="border-t border-gray-100 p-6 md:p-10 bg-gray-50/70">
          <div className="text-center max-w-xl mx-auto mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Geographic Location on OpenStreetMap</h3>
            <p className="text-gray-500 text-xs md:text-sm mt-1">
              Live OpenStreetMap GPS plot for {destination.name} ({destination.district} District)
            </p>
          </div>
          
          <div className="rounded-3xl overflow-hidden shadow-lg border border-gray-200">
            <MapView 
              destinations={[{
                name: destination.name,
                district: destination.district,
                province: destination.province,
                category: destination.category,
                rating: destination.rating,
                latitude: destination.latitude,
                longitude: destination.longitude,
                description: destination.description
              }]} 
              height="480px"
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default DestinationDetails;
