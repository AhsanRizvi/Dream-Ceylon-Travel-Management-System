import React, { useContext } from 'react';
import { Check, X, Car, Home, Utensils, Compass, ArrowRight, ShieldCheck, Sparkles, Calculator } from 'lucide-react';
import { PackageContext } from '../context/PackageContext';
import { useCurrency } from '../context/CurrencyContext';
import { useNavigate } from 'react-router-dom';

const PackageCard = ({ pkg, previewDays = 3, previewTravelers = 2 }) => {
  const { selectedPackage, selectPackage, calculatePackageCost } = useContext(PackageContext);
  const { formatDualPrice, formatPrice, currency } = useCurrency();
  const navigate = useNavigate();

  const isSelected =
    selectedPackage &&
    (selectedPackage._id === pkg._id || selectedPackage.packageName === pkg.packageName);

  const handleSelect = async () => {
    await selectPackage(pkg, {
      days: previewDays,
      travelers: previewTravelers
    });
  };

  // Distinct theme styling per tier
  const tierThemes = {
    Basic: {
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      headerBg: 'from-amber-600 to-amber-700',
      accentColor: 'text-amber-600',
      borderFocus: 'border-amber-500 ring-amber-200',
      tag: 'Route & Transport'
    },
    Standard: {
      badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
      headerBg: 'from-blue-600 to-blue-700',
      accentColor: 'text-blue-600',
      borderFocus: 'border-blue-500 ring-blue-200',
      tag: 'Stays + Non-Food Facilities'
    },
    Premium: {
      badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
      headerBg: 'from-purple-700 to-indigo-800',
      accentColor: 'text-purple-600',
      borderFocus: 'border-purple-500 ring-purple-200',
      tag: 'All-Inclusive Luxury'
    }
  };

  const theme = tierThemes[pkg.packageName] || tierThemes.Standard;
  const startingDual = formatDualPrice(pkg.baseChargeLKR || pkg.baseCharge);
  const estimatedTrip = calculatePackageCost(pkg, previewDays, previewTravelers);

  return (
    <div
      className={`rounded-2xl shadow-lg border p-6 flex flex-col h-full transform transition-all duration-300 hover:-translate-y-1.5 bg-white relative ${
        isSelected
          ? 'border-green-500 ring-4 ring-green-100 shadow-xl'
          : 'border-gray-200 hover:shadow-xl'
      }`}
    >
      {isSelected && (
        <div className="absolute -top-3.5 right-6 bg-green-600 text-white text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md flex items-center gap-1">
          <Check size={14} /> Active Selection
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${theme.badgeBg}`}>
            {pkg.badge || theme.tag}
          </span>
          {pkg.packageName === 'Premium' && (
            <span className="flex items-center text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              <Sparkles size={12} className="mr-1" /> VIP Experience
            </span>
          )}
        </div>
        <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">
          {pkg.packageName} Package
        </h3>
        <p className="text-gray-500 text-sm mt-1 line-clamp-2 min-h-[40px]">
          {pkg.tagline || pkg.description}
        </p>
      </div>

      {/* Starting Price & Estimated Trip Price */}
      <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
            Starting Reference Rate
          </span>
          <div className="flex items-baseline flex-wrap gap-1.5">
            <span className="text-3xl font-extrabold text-gray-900">{startingDual.primary}</span>
            <span className="text-xs font-medium text-gray-500">/ person per day</span>
          </div>
          {!startingDual.isLKR && (
            <span className="text-[11px] text-gray-400 block">
              Base Stored Price: {startingDual.lkrFormatted} LKR
            </span>
          )}
        </div>

        <div className="pt-2 border-t border-gray-200/80 flex items-center justify-between text-xs">
          <span className="text-gray-600 flex items-center gap-1 font-medium">
            <Calculator size={13} className="text-blue-600" />
            Est. ({previewDays}d / {previewTravelers} pax):
          </span>
          <span className="font-extrabold text-blue-900">
            {formatPrice(estimatedTrip.grandTotalLKR, { normalizeLegacy: false })}
          </span>
        </div>

        <p className="text-[11px] text-gray-400">
          {pkg.packageName === 'Basic' && 'Includes itinerary, route & transport only (no hotel/food/guide)'}
          {pkg.packageName === 'Standard' && 'Includes 3–4★ hotels, non-food facilities & transport'}
          {pkg.packageName === 'Premium' && 'All-inclusive: 5★ stays, full-board meals & specialist guide'}
        </p>
      </div>

      {/* Quick Feature Grid */}
      <div className="grid grid-cols-2 gap-2 mb-6 text-xs font-medium">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
          <Car size={16} className="text-blue-600 flex-shrink-0" />
          <span className="text-gray-700 truncate">
            Transport: <strong>Included</strong>
          </span>
        </div>

        <div
          className={`flex items-center gap-2 p-2 rounded-lg border ${
            pkg.packageName === 'Basic'
              ? 'bg-red-50/50 border-red-100 text-red-700'
              : 'bg-gray-50 border-gray-100 text-gray-700'
          }`}
        >
          <Home
            size={16}
            className={
              pkg.packageName === 'Basic'
                ? 'text-red-500 flex-shrink-0'
                : 'text-blue-600 flex-shrink-0'
            }
          />
          <span className="truncate">
            Stays: <strong>{pkg.packageName === 'Basic' ? 'Excluded' : 'Included'}</strong>
          </span>
        </div>

        <div
          className={`flex items-center gap-2 p-2 rounded-lg border ${
            pkg.packageName === 'Premium'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50/50 border-red-100 text-red-700'
          }`}
        >
          <Utensils
            size={16}
            className={
              pkg.packageName === 'Premium'
                ? 'text-green-600 flex-shrink-0'
                : 'text-red-500 flex-shrink-0'
            }
          />
          <span className="truncate">
            Meals: <strong>{pkg.packageName === 'Premium' ? 'Included' : 'Excluded'}</strong>
          </span>
        </div>

        <div
          className={`flex items-center gap-2 p-2 rounded-lg border ${
            pkg.packageName === 'Premium'
              ? 'bg-green-50 border-green-200 text-green-800'
              : pkg.packageName === 'Standard'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-red-50/50 border-red-100 text-red-700'
          }`}
        >
          <Compass
            size={16}
            className={
              pkg.packageName === 'Premium'
                ? 'text-green-600 flex-shrink-0'
                : pkg.packageName === 'Standard'
                ? 'text-blue-600 flex-shrink-0'
                : 'text-red-500 flex-shrink-0'
            }
          />
          <span className="truncate">
            Guide:{' '}
            <strong>
              {pkg.packageName === 'Premium'
                ? 'Included'
                : pkg.packageName === 'Standard'
                ? 'Optional Add-on'
                : 'Excluded'}
            </strong>
          </span>
        </div>
      </div>

      {/* Included Facilities */}
      <div className="mb-4">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center">
          <ShieldCheck size={14} className="text-green-600 mr-1.5" /> What&apos;s Included
        </h4>
        <ul className="space-y-2">
          {pkg.includedFacilities &&
            pkg.includedFacilities.slice(0, 4).map((facility, idx) => (
              <li key={idx} className="flex items-start text-xs text-gray-700 leading-snug">
                <Check size={14} className="text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                <span>{facility}</span>
              </li>
            ))}
        </ul>
      </div>

      {/* Excluded Facilities - Explicit Communication */}
      <div className="mb-6 pt-3 border-t border-gray-100 flex-grow">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center">
          <X size={14} className="text-gray-400 mr-1.5" /> What&apos;s Excluded
        </h4>
        <ul className="space-y-2">
          {pkg.excludedFacilities &&
            pkg.excludedFacilities.slice(0, 3).map((facility, idx) => (
              <li key={idx} className="flex items-start text-xs text-gray-500 leading-snug">
                <X size={14} className="text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                <span>{facility}</span>
              </li>
            ))}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={handleSelect}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${
            isSelected
              ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-200'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isSelected ? 'Selected Package ✓' : `Select ${pkg.packageName}`}
        </button>

        <button
          type="button"
          onClick={() => navigate(`/packages/${pkg._id}`)}
          className="w-full py-2.5 rounded-xl font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors flex items-center justify-center gap-1.5"
        >
          Customize &amp; View Details <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default PackageCard;
