import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { MapPin, Star, Calendar, ArrowLeft, Navigation, Plus, Eye, Compass } from 'lucide-react';
import MapView from '../components/MapView';

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (error || !destination) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">{error || 'Destination not found'}</h2>
        <button onClick={() => navigate('/destinations')} className="text-blue-600 hover:underline">
          &larr; Back to Destinations
        </button>
      </div>
    );
  }

  const imageUrl = destination.image || destination.imageUrl;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <button 
        onClick={() => navigate('/destinations')} 
        className="flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors font-medium"
      >
        <ArrowLeft size={20} className="mr-2" /> Back to Destinations
      </button>

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        {/* Header Image Hero Area */}
        <div className="h-80 md:h-96 relative flex items-end justify-start bg-slate-900 overflow-hidden">
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
          {/* Gradient Overlay for Readable Text */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
          
          <div className="relative z-10 p-8 md:p-12 text-white max-w-4xl">
            <span className="inline-block bg-blue-600/90 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full mb-3 border border-blue-400/30">
              {destination.category} Destination
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow-lg mb-2">
              {destination.name}
            </h1>
            <p className="text-blue-200 text-sm md:text-base flex items-center gap-2">
              <MapPin size={16} /> {destination.district} District, Sri Lanka
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 p-8 md:p-12">
          <div className="md:col-span-2 space-y-6">
            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3 items-center">
              {destination.rating && (
                <span className="flex items-center text-sm font-bold text-yellow-700 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-200">
                  <Star size={16} className="mr-1.5 fill-current text-yellow-500" /> {destination.rating} / 5 Rating
                </span>
              )}
              <span className="flex items-center text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                <MapPin size={16} className="mr-1.5 text-blue-600" /> {destination.district} District
              </span>
              <span className="flex items-center text-sm font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                <Compass size={16} className="mr-1.5 text-green-600" /> {destination.category}
              </span>
              {destination.bestVisitTime && (
                <span className="flex items-center text-sm font-medium text-purple-700 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100">
                  <Calendar size={16} className="mr-1.5 text-purple-600" /> Best Time: {destination.bestVisitTime}
                </span>
              )}
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">About {destination.name}</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                {destination.description}
              </p>
            </div>

            <div className="pt-4 flex flex-wrap gap-4">
              <button 
                onClick={() => document.getElementById('map-view').scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-xl shadow transition-colors"
              >
                <Navigation size={18} className="mr-2" /> View on Map
              </button>
              <button 
                onClick={() => navigate('/planner')}
                className="flex items-center bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-xl shadow transition-colors"
              >
                <Plus size={18} className="mr-2" /> Create Trip Plan
              </button>
            </div>
          </div>

          {/* Quick Info Sidebar Card */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 h-fit space-y-4">
            <h4 className="text-lg font-bold text-gray-800 border-b pb-2 flex items-center justify-between">
              <span>Quick Info</span>
              <span className="text-xs font-normal text-gray-400">Sri Lanka</span>
            </h4>
            <ul className="space-y-3.5 text-sm text-gray-600">
              <li className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">District</span>
                <span className="font-medium text-blue-900">{destination.district}</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Category</span>
                <span className="font-medium text-gray-900">{destination.category}</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Best Visit Time</span>
                <span className="font-medium text-gray-900">{destination.bestVisitTime || 'Anytime'}</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Latitude</span>
                <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-gray-200">{destination.latitude}</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Longitude</span>
                <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-gray-200">{destination.longitude}</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                  <Eye size={14} className="text-gray-400" /> Total Views
                </span>
                <span className="font-bold text-gray-800">{destination.viewCount || 0}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Interactive Map Section */}
        <div id="map-view" className="border-t border-gray-100 p-8 md:p-12 bg-gray-50/60">
          <div className="text-center max-w-xl mx-auto mb-6">
            <h3 className="text-2xl font-bold text-gray-800">Geographic Location</h3>
            <p className="text-gray-500 text-sm mt-1">Live OpenStreetMap coordinates for {destination.name}</p>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200">
            <MapView 
              destinations={[{
                name: destination.name,
                district: destination.district,
                category: destination.category,
                rating: destination.rating,
                latitude: destination.latitude,
                longitude: destination.longitude
              }]} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestinationDetails;
