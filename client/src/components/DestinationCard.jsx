import React, { useState } from 'react';
import { Star, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const DestinationCard = ({ destination }) => {
  const [imageError, setImageError] = useState(false);
  const imageUrl = destination.image || destination.imageUrl;

  return (
    <Link to={`/destinations/${destination._id || destination.id}`} className="block h-full">
      <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 group cursor-pointer flex flex-col h-full">
        {/* Card Image Area */}
        <div className="h-48 bg-gray-200 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity z-10" />
          
          {imageUrl && !imageError ? (
            <img 
              src={imageUrl} 
              alt={destination.name} 
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900 text-white text-lg font-bold px-4 text-center">
              {destination.name}
            </div>
          )}

          {/* Category Pill Tag */}
          <span className="absolute top-3 right-3 z-20 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full border border-white/20">
            {destination.category}
          </span>
        </div>

        {/* Card Body */}
        <div className="p-5 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-1">
              {destination.name}
            </h3>
            {destination.rating && (
              <span className="flex items-center text-sm font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-100 ml-2 flex-shrink-0">
                <Star size={14} className="mr-1 fill-current" /> {destination.rating}
              </span>
            )}
          </div>

          <p className="flex items-center text-gray-500 text-sm mb-3">
            <MapPin size={14} className="mr-1 text-blue-600 flex-shrink-0" /> {destination.district} • {destination.category}
          </p>

          <p className="text-gray-600 text-sm line-clamp-2 mb-4 flex-grow">
            {destination.description}
          </p>

          <div className="w-full text-center py-2.5 bg-blue-50 text-blue-700 font-medium rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors text-sm">
            View Details
          </div>
        </div>
      </div>
    </Link>
  );
};

export default DestinationCard;
