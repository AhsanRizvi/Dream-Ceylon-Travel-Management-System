import React, { useState } from 'react';
import { Star, MapPin, Clock, ArrowRight, Eye, Map as MapIcon, Compass } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Dream Ceylon Tourism Management System
 * Destination Card Component (Module 2 & Module 7 Enhanced)
 */

const CATEGORY_COLORS = {
  Beach: 'bg-cyan-700/90 text-white',
  Mountain: 'bg-emerald-700/90 text-white',
  Mountains: 'bg-emerald-700/90 text-white',
  Historical: 'bg-amber-700/90 text-white',
  Cultural: 'bg-purple-700/90 text-white',
  Waterfall: 'bg-blue-700/90 text-white',
  Wildlife: 'bg-orange-700/90 text-white',
  Nature: 'bg-teal-700/90 text-white',
  Lake: 'bg-indigo-700/90 text-white'
};

const DestinationCard = ({
  destination,
  badgeText = null,
  onViewOnMap = null,
  showQuickActions = false
}) => {
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();
  const imageUrl = destination.image || destination.imageUrl;
  const categoryBadgeClass = CATEGORY_COLORS[destination.category] || 'bg-blue-900/90 text-white';
  const destId = destination._id || destination.id;

  const handleViewOnMapClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onViewOnMap) {
      onViewOnMap(destination);
    } else {
      navigate(`/routes?focus=${destId}`);
    }
  };

  const handleExploreClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/routes?add=${destId}`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col h-full hover:-translate-y-1 group">
      
      {/* Card Image Area */}
      <Link to={`/destinations/${destId}`} className="block h-52 bg-slate-900 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent opacity-75 group-hover:opacity-45 transition-opacity z-10" />
        
        {imageUrl && !imageError ? (
          <img 
            src={imageUrl} 
            alt={destination.name} 
            onError={() => setImageError(true)}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 text-white p-4 text-center">
            <span className="text-sm font-bold opacity-80 uppercase tracking-widest">{destination.category}</span>
            <span className="text-lg font-extrabold mt-1">{destination.name}</span>
          </div>
        )}

        {/* Top Left Rank / Custom Badge */}
        {badgeText && (
          <span className="absolute top-3 left-3 z-20 bg-amber-500 text-slate-950 text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider">
            {badgeText}
          </span>
        )}

        {/* Category Pill Tag */}
        <span className={`absolute top-3 right-3 z-20 backdrop-blur-md text-[11px] font-bold px-3 py-1 rounded-full shadow-sm border border-white/20 uppercase tracking-wider ${categoryBadgeClass}`}>
          {destination.category}
        </span>

        {/* District & View Count Row */}
        <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between text-white text-xs font-semibold drop-shadow-md">
          <div className="flex items-center truncate">
            <MapPin size={14} className="mr-1 text-emerald-400 flex-shrink-0" />
            <span className="truncate">{destination.district}{destination.province ? `, ${destination.province}` : ''}</span>
          </div>
          {destination.viewCount !== undefined && (
            <span className="flex items-center gap-1 bg-black/45 backdrop-blur-sm px-2 py-0.5 rounded-full text-[11px] font-bold text-gray-100 flex-shrink-0">
              <Eye size={11} className="text-blue-300" />
              {Number(destination.viewCount || 0).toLocaleString()}
            </span>
          )}
        </div>
      </Link>

      {/* Card Body */}
      <div className="p-5 flex flex-col flex-grow justify-between space-y-3">
        <div>
          <div className="flex justify-between items-start gap-2 mb-1.5">
            <Link to={`/destinations/${destId}`} className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-1">
              {destination.name}
            </Link>
            {destination.rating ? (
              <span className="flex items-center text-xs font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex-shrink-0">
                <Star size={12} className="mr-1 fill-amber-500 text-amber-500" /> 
                {Number(destination.rating).toFixed(1)}
                {destination.reviewCount > 0 && (
                  <span className="text-[10px] text-amber-800/80 ml-1 font-semibold">({destination.reviewCount})</span>
                )}
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                Unrated
              </span>
            )}
          </div>

          <p className="text-gray-600 text-xs leading-relaxed line-clamp-2 mb-3">
            {destination.description}
          </p>

          {/* Quick Metadata Snippet */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 mb-2">
            {destination.estimatedVisitDuration && (
              <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                <Clock size={11} className="text-blue-600" />
                {destination.estimatedVisitDuration}
              </span>
            )}
            {destination.bestVisitTime && (
              <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100 truncate max-w-[175px]" title={destination.bestVisitTime}>
                Best: {destination.bestVisitTime}
              </span>
            )}
          </div>
        </div>

        {/* Action CTA Buttons */}
        <div className="pt-2 border-t border-gray-50 space-y-2">
          {showQuickActions ? (
            <div className="grid grid-cols-3 gap-1.5">
              <Link
                to={`/destinations/${destId}`}
                className="text-center py-2 px-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition text-[11px] flex items-center justify-center gap-1 shadow-sm"
              >
                <span>View Details</span>
              </Link>
              <button
                type="button"
                onClick={handleExploreClick}
                className="text-center py-2 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition text-[11px] flex items-center justify-center gap-1 border border-indigo-200"
              >
                <Compass size={12} />
                <span>Plan Route</span>
              </button>
              <button
                type="button"
                onClick={handleViewOnMapClick}
                className="text-center py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl transition text-[11px] flex items-center justify-center gap-1 border border-emerald-200"
              >
                <MapIcon size={12} />
                <span>On Map</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link 
                to={`/destinations/${destId}`} 
                className="flex-grow text-center py-2.5 px-4 bg-blue-50/80 text-blue-700 font-bold rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>View Destination Details</span>
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              {onViewOnMap && (
                <button
                  type="button"
                  onClick={handleViewOnMapClick}
                  title="Preview on Map"
                  className="p-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-xl border border-emerald-200 transition flex-shrink-0"
                >
                  <MapIcon size={14} />
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default React.memo(DestinationCard);
