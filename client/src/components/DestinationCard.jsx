import React, { useState } from 'react';
import { Star, MapPin, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Dream Ceylon Tourism Management System
 * Destination Card Component
 */

const CATEGORY_COLORS = {
  Beach: 'bg-cyan-700/90 text-white',
  Mountain: 'bg-emerald-700/90 text-white',
  Historical: 'bg-amber-700/90 text-white',
  Cultural: 'bg-purple-700/90 text-white',
  Waterfall: 'bg-blue-700/90 text-white',
  Wildlife: 'bg-orange-700/90 text-white',
  Nature: 'bg-teal-700/90 text-white',
  Lake: 'bg-indigo-700/90 text-white'
};

const DestinationCard = ({ destination }) => {
  const [imageError, setImageError] = useState(false);
  const imageUrl = destination.image || destination.imageUrl;
  const categoryBadgeClass = CATEGORY_COLORS[destination.category] || 'bg-blue-900/90 text-white';

  return (
    <Link 
      to={`/destinations/${destination._id || destination.id}`} 
      className="block h-full group"
    >
      <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col h-full hover:-translate-y-1">
        
        {/* Card Image Area */}
        <div className="h-52 bg-slate-900 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70 group-hover:opacity-40 transition-opacity z-10" />
          
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

          {/* Category Pill Tag */}
          <span className={`absolute top-3 right-3 z-20 backdrop-blur-md text-[11px] font-bold px-3 py-1 rounded-full shadow-sm border border-white/20 uppercase tracking-wider ${categoryBadgeClass}`}>
            {destination.category}
          </span>

          {/* District & Province Tag */}
          <div className="absolute bottom-3 left-3 z-20 flex items-center text-white text-xs font-semibold drop-shadow-md">
            <MapPin size={14} className="mr-1 text-emerald-400 flex-shrink-0" />
            <span>{destination.district}{destination.province ? `, ${destination.province}` : ''}</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 flex flex-col flex-grow justify-between space-y-3">
          <div>
            <div className="flex justify-between items-start gap-2 mb-1.5">
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-1">
                {destination.name}
              </h3>
              {destination.rating && (
                <span className="flex items-center text-xs font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex-shrink-0">
                  <Star size={12} className="mr-1 fill-amber-500 text-amber-500" /> 
                  {destination.rating.toFixed(1)}
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
                <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100 truncate max-w-[170px]" title={destination.bestVisitTime}>
                  Best: {destination.bestVisitTime}
                </span>
              )}
            </div>
          </div>

          {/* Action CTA Button */}
          <div className="pt-2 border-t border-gray-50">
            <div className="w-full text-center py-2.5 px-4 bg-blue-50/80 text-blue-700 font-bold rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all text-xs flex items-center justify-center gap-1.5 shadow-sm">
              <span>View Destination Details</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

        </div>
      </div>
    </Link>
  );
};

export default React.memo(DestinationCard);
