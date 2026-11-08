import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  MapPin,
  Clock,
  Sun,
  CheckCircle2,
  Plus,
  Trash2,
  Navigation,
  Eye,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';

const RecommendationCard = ({
  item,
  isSelected,
  selectionOrder,
  onToggleSelect,
  onViewOnMap,
  onViewDetails
}) => {
  const [imageError, setImageError] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const destination = item.destination || item;
  const matchScore = item.matchScore ?? 85;
  const reasons = Array.isArray(item.reasons) ? item.reasons : [];
  const breakdown = item.scoreBreakdown || null;
  const imageUrl = destination.image || destination.imageUrl;

  const getScoreBadgeColor = (score) => {
    if (score >= 85) return 'bg-emerald-600 text-white border-emerald-400';
    if (score >= 70) return 'bg-blue-600 text-white border-blue-400';
    return 'bg-amber-600 text-white border-amber-400';
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border-2 flex flex-col h-full overflow-hidden ${
        isSelected
          ? 'border-blue-600 ring-2 ring-blue-100'
          : 'border-gray-100 hover:border-blue-200'
      }`}
    >
      {/* Image Header */}
      <div className="h-52 bg-slate-900 relative overflow-hidden group">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={destination.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900 text-white text-xl font-bold px-4 text-center">
            {destination.name}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

        {/* Top Left: Match Score Badge */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-full border shadow-lg ${getScoreBadgeColor(
              matchScore
            )}`}
          >
            <Sparkles size={13} />
            {matchScore}% Match
          </span>
          {isSelected && (
            <span className="bg-blue-900/95 text-yellow-300 text-xs font-extrabold px-2.5 py-1 rounded-full border border-yellow-400/40 shadow">
              Stop #{selectionOrder}
            </span>
          )}
        </div>

        {/* Top Right: Category Badge */}
        <span className="absolute top-3 right-3 z-20 bg-black/65 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/20">
          {destination.category}
        </span>

        {/* Bottom Overlay: Name, District, Rating */}
        <div className="absolute bottom-3 left-4 right-4 z-20 flex justify-between items-end text-white">
          <div>
            <h3 className="text-xl font-extrabold tracking-tight drop-shadow">
              {destination.name}
            </h3>
            <p className="text-xs text-blue-200 flex items-center gap-1 mt-0.5">
              <MapPin size={12} /> {destination.district} District
              {item.distanceFromAnchorKm !== null &&
                item.distanceFromAnchorKm !== undefined &&
                item.distanceFromAnchorKm > 0 && (
                  <span className="text-emerald-300 font-semibold ml-1">
                    • {item.distanceFromAnchorKm} km from {item.anchorDestinationName}
                  </span>
                )}
            </p>
          </div>
          {destination.rating && (
            <span className="flex items-center text-xs font-bold bg-yellow-400/95 text-slate-950 px-2.5 py-1 rounded-lg shadow">
              <Star size={12} className="mr-1 fill-slate-950" /> {destination.rating}
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex flex-col flex-grow space-y-4">
        {/* Environments Tags */}
        {Array.isArray(destination.environments) && destination.environments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {destination.environments.map((env, idx) => {
              const isMatched = item.matchedEnvironments?.includes(env);
              return (
                <span
                  key={idx}
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    isMatched
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  {isMatched ? `✓ ${env}` : env}
                </span>
              );
            })}
          </div>
        )}

        {/* Description */}
        <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">
          {destination.description}
        </p>

        {/* Visiting Metadata Row */}
        <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
          <div className="flex items-center gap-1.5 text-gray-700">
            <Clock size={14} className="text-blue-600 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-gray-400 block uppercase font-bold">
                Est. Duration
              </span>
              <span className="font-semibold">
                ~{destination.estimatedDurationHours || 3.5} Hours
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-gray-700">
            <Sun size={14} className="text-amber-500 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-gray-400 block uppercase font-bold">
                Best Visit Time
              </span>
              <span className="font-semibold">{destination.bestVisitTime || 'Morning'}</span>
            </div>
          </div>
        </div>

        {/* Why Recommended Section */}
        {reasons.length > 0 && (
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-900 flex items-center gap-1">
                <Sparkles size={12} className="text-blue-600" /> Why Recommended
              </span>
              {breakdown && (
                <button
                  type="button"
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                >
                  Score Details
                  {showBreakdown ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              )}
            </div>
            <ul className="space-y-1">
              {reasons.slice(0, 3).map((reason, idx) => (
                <li
                  key={idx}
                  className="text-xs text-blue-950/90 flex items-start gap-1.5 leading-snug"
                >
                  <CheckCircle2
                    size={13}
                    className="text-emerald-600 mt-0.5 flex-shrink-0"
                  />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>

            {/* Transparent Rule-Based Score Breakdown */}
            {showBreakdown && breakdown && (
              <div className="pt-2 mt-2 border-t border-blue-200/60 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-blue-900">
                <div className="flex justify-between">
                  <span>Interest ({breakdown.weights?.interest || 40}%):</span>
                  <strong>{breakdown.interestScore} pts</strong>
                </div>
                <div className="flex justify-between">
                  <span>Proximity ({breakdown.weights?.proximity || 20}%):</span>
                  <strong>{breakdown.proximityScore} pts</strong>
                </div>
                <div className="flex justify-between">
                  <span>Rating ({breakdown.weights?.rating || 15}%):</span>
                  <strong>{breakdown.ratingScore} pts</strong>
                </div>
                <div className="flex justify-between">
                  <span>Popularity ({breakdown.weights?.popularity || 10}%):</span>
                  <strong>{breakdown.popularityScore} pts</strong>
                </div>
                <div className="flex justify-between">
                  <span>Weather ({breakdown.weights?.weather || 10}%):</span>
                  <strong>{breakdown.weatherScore} pts</strong>
                </div>
                <div className="flex justify-between">
                  <span>Visit Time ({breakdown.weights?.visitTime || 5}%):</span>
                  <strong>{breakdown.visitTimeScore} pts</strong>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Interactive Actions Footer */}
        <div className="pt-2 mt-auto space-y-2">
          <button
            type="button"
            onClick={() => onToggleSelect(destination)}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm ${
              isSelected
                ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSelected ? (
              <>
                <Trash2 size={14} /> Remove from Trip
              </>
            ) : (
              <>
                <Plus size={14} /> Add to Trip
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-2">
            {onViewDetails ? (
              <button
                type="button"
                onClick={() => onViewDetails(destination, item)}
                className="py-2 px-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Eye size={13} className="text-blue-600" /> View Details
              </button>
            ) : (
              <Link
                to={`/destinations/${destination._id}`}
                className="py-2 px-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <ExternalLink size={13} className="text-blue-600" /> View Details
              </Link>
            )}

            <button
              type="button"
              onClick={() => onViewOnMap && onViewOnMap(destination)}
              className="py-2 px-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Navigation size={13} className="text-emerald-600" /> View on Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationCard;

