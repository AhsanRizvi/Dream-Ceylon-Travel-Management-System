import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { PackageContext } from '../context/PackageContext';
import { useCurrency } from '../context/CurrencyContext';
import {
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  Car,
  Home,
  Utensils,
  Compass,
  Sparkles,
  Globe,
  Calculator
} from 'lucide-react';

const PackageDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { selectPackage, customizations, updateCustomizations } = useContext(PackageContext);
  const { currency, formatPrice, formatDualPrice } = useCurrency();

  // Interactive customization states
  const [addGuide, setAddGuide] = useState(customizations.addGuide || false);
  const [selectedMealType, setSelectedMealType] = useState(
    customizations.selectedMealType || 'Vegetarian'
  );
  const [selectedMeal, setSelectedMeal] = useState(
    customizations.selectedMealOption || 'Authentic Sri Lankan Culinary Experience'
  );
  const [selectedGuide, setSelectedGuide] = useState(
    customizations.selectedGuideOption || 'Cultural & Heritage Historian Guide'
  );
  const [selectedGuideId, setSelectedGuideId] = useState(customizations.selectedGuideId || '');
  const [selectedHotelId, setSelectedHotelId] = useState(customizations.selectedHotelId || '');
  const [selectedRoomType, setSelectedRoomType] = useState(customizations.selectedRoomType || '');
  const [numberOfRooms, setNumberOfRooms] = useState(customizations.numberOfRooms || 1);
  const [vehicleType, setVehicleType] = useState(customizations.vehicleType || 'Car');
  const [previewDays, setPreviewDays] = useState(3);
  const [previewTravelers, setPreviewTravelers] = useState(2);
  const [backendPricing, setBackendPricing] = useState(null);

  useEffect(() => {
    const fetchPackageAndPartners = async () => {
      try {
        setLoading(true);
        const [pkgRes, hotelRes, guideRes] = await Promise.all([
          api.get(`/packages/${id}`, { params: { currency } }),
          api.get('/hotels', { params: { currency } }).catch(() => ({ data: { data: [] } })),
          api.get('/guides', { params: { currency } }).catch(() => ({ data: { data: [] } }))
        ]);
        setPkg(pkgRes.data.data);
        setHotels(hotelRes.data?.data || []);
        setGuides(guideRes.data?.data || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch package details');
      } finally {
        setLoading(false);
      }
    };
    fetchPackageAndPartners();
  }, [id, currency]);

  useEffect(() => {
    if (!pkg) return;
    let active = true;
    const fetchLiveEstimate = async () => {
      try {
        const res = await api.post('/pricing/calculate', {
          packageId: pkg._id,
          packageName: pkg.packageName,
          days: previewDays,
          travelers: previewTravelers,
          vehicleType,
          hotelId: pkg.packageName === 'Basic' ? null : selectedHotelId || null,
          roomType: selectedRoomType || null,
          numberOfRooms,
          mealType: selectedMealType,
          selectedMealOption: selectedMeal,
          addGuide: pkg.packageName === 'Premium' ? true : addGuide,
          guideId: selectedGuideId || null,
          selectedGuideOption: selectedGuide,
          targetCurrency: currency
        });
        if (active && res.data?.success) {
          setBackendPricing(res.data.data);
        }
      } catch (e) {
        // Ignore preview error
      }
    };
    fetchLiveEstimate();
    return () => {
      active = false;
    };
  }, [
    pkg,
    previewDays,
    previewTravelers,
    vehicleType,
    selectedHotelId,
    selectedRoomType,
    numberOfRooms,
    selectedMealType,
    selectedMeal,
    addGuide,
    selectedGuideId,
    selectedGuide,
    currency
  ]);

  const handleApplyAndContinue = async () => {
    if (!pkg) return;
    const hotelObj = hotels.find((h) => h._id === selectedHotelId);
    const guideObj = guides.find((g) => g._id === selectedGuideId);

    updateCustomizations({
      addGuide: pkg.packageName === 'Standard' ? addGuide : pkg.packageName === 'Premium',
      selectedMealType,
      selectedMealOption: selectedMeal,
      selectedGuideOption: selectedGuide,
      selectedGuideId,
      selectedGuideRateLKR: guideObj?.dailyRateLKR || null,
      selectedHotelId: pkg.packageName === 'Basic' ? '' : selectedHotelId,
      selectedHotelRateLKR: hotelObj?.pricePerNightLKR || null,
      selectedRoomType,
      numberOfRooms,
      vehicleType
    });

    await selectPackage(pkg, {
      days: previewDays,
      travelers: previewTravelers,
      vehicleType,
      hotelId: selectedHotelId || null,
      guideId: selectedGuideId || null,
      mealType: selectedMealType,
      addGuide
    });
    navigate('/planner');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">{error || 'Package not found'}</h2>
        <button onClick={() => navigate('/packages')} className="text-blue-600 hover:underline">
          &larr; Back to Packages
        </button>
      </div>
    );
  }

  const baseDual = formatDualPrice(pkg.baseChargeLKR || pkg.baseCharge);
  const selectedHotelObj = hotels.find((h) => h._id === selectedHotelId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <button
        onClick={() => navigate('/packages')}
        className="flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors font-medium"
      >
        <ArrowLeft size={18} className="mr-2" /> Back to All Packages
      </button>

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        {/* Hero Header */}

{/* Hero Header */}
<div className="relative p-8 md:p-12 text-white overflow-hidden bg-slate-900">
  {(pkg.image || pkg.imageUrl) ? (
    <img
      src={pkg.image || pkg.imageUrl}
      alt={pkg.packageName}
      className="absolute inset-0 w-full h-full object-cover"
    />
  ) : (
    <div className="absolute inset-0 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900" />
  )}

  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/30" />

  <div className="relative z-10">
    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
      <span className="bg-blue-500/50 backdrop-blur-sm text-blue-100 border border-blue-400/40 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full">
        {pkg.badge || `${pkg.packageName} Tier`}
      </span>

      <div className="flex items-center gap-3">
        {pkg.packageName === 'Premium' && (
          <span className="flex items-center bg-amber-400/30 backdrop-blur-sm text-amber-200 border border-amber-400/40 text-xs font-bold px-3 py-1 rounded-full">
            <Sparkles size={14} className="mr-1.5" />
            All-Inclusive VIP Experience
          </span>
        )}

        <span className="bg-white/20 backdrop-blur-sm text-yellow-300 border border-white/30 text-xs font-bold px-3 py-1 rounded-full">
          Starting: {baseDual.primary}/person/day
        </span>
      </div>
    </div>

    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
      {pkg.packageName} Tour Package
    </h1>

    <p className="text-blue-100 text-lg max-w-3xl leading-relaxed drop-shadow">
      {pkg.description}
    </p>
  </div>
</div>

        </div>

        {/* Content Body */}
        <div className="p-8 md:p-12 space-y-12">
          {/* 4 Pillars Overview */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-100">
              <div className="flex items-center gap-2.5 text-blue-900 font-bold mb-1">
                <Car size={18} className="text-blue-600" /> Transport
              </div>
              <p className="text-sm text-gray-700">
                {pkg.features?.transport || 'Motorcycle, Car, or Van included'}
              </p>
            </div>

            <div
              className={`p-5 rounded-2xl border ${
                pkg.packageName === 'Basic'
                  ? 'bg-amber-50/50 border-amber-100'
                  : 'bg-blue-50/60 border-blue-100'
              }`}
            >
              <div className="flex items-center gap-2.5 text-gray-900 font-bold mb-1">
                <Home
                  size={18}
                  className={pkg.packageName === 'Basic' ? 'text-amber-600' : 'text-blue-600'}
                />{' '}
                Accommodation
              </div>
              <p className="text-sm text-gray-700">
                {pkg.features?.accommodation ||
                  (pkg.packageName === 'Basic' ? 'Not Included (Self-arranged)' : 'Included')}
              </p>
            </div>

            <div
              className={`p-5 rounded-2xl border ${
                pkg.packageName === 'Premium'
                  ? 'bg-purple-50/60 border-purple-100'
                  : 'bg-amber-50/50 border-amber-100'
              }`}
            >
              <div className="flex items-center gap-2.5 text-gray-900 font-bold mb-1">
                <Utensils
                  size={18}
                  className={pkg.packageName === 'Premium' ? 'text-purple-600' : 'text-amber-600'}
                />{' '}
                Meals &amp; Dining
              </div>
              <p className="text-sm text-gray-700">
                {pkg.features?.meals ||
                  (pkg.packageName === 'Premium'
                    ? 'Full-Board Gourmet Meals Included'
                    : 'Not Included by default')}
              </p>
            </div>

            <div
              className={`p-5 rounded-2xl border ${
                pkg.packageName === 'Premium'
                  ? 'bg-purple-50/60 border-purple-100'
                  : pkg.packageName === 'Standard'
                  ? 'bg-blue-50/60 border-blue-100'
                  : 'bg-amber-50/50 border-amber-100'
              }`}
            >
              <div className="flex items-center gap-2.5 text-gray-900 font-bold mb-1">
                <Compass
                  size={18}
                  className={pkg.packageName === 'Premium' ? 'text-purple-600' : 'text-blue-600'}
                />{' '}
                Tour Guide
              </div>
              <p className="text-sm text-gray-700">
                {pkg.features?.tourGuide ||
                  (pkg.packageName === 'Premium'
                    ? 'Dedicated Specialist Guide'
                    : pkg.packageName === 'Standard'
                    ? 'Optional Add-on'
                    : 'Not Included')}
              </p>
            </div>
          </div>

          {/* Included vs Excluded Comparison */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-50/80 p-6 rounded-2xl border border-gray-200/80">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                  <Check size={16} />
                </span>
                Included Facilities &amp; Services
              </h3>
              <ul className="space-y-3">
                {pkg.includedFacilities?.map((item, idx) => (
                  <li key={idx} className="flex items-start text-sm text-gray-700">
                    <Check size={16} className="text-green-600 mr-2.5 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gray-50/80 p-6 rounded-2xl border border-gray-200/80">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center">
                  <X size={16} />
                </span>
                Excluded Services (Clear Notice)
              </h3>
              <ul className="space-y-3">
                {pkg.excludedFacilities?.map((item, idx) => (
                  <li key={idx} className="flex items-start text-sm text-gray-600">
                    <X size={16} className="text-gray-400 mr-2.5 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* PARTNER HOTEL SELECTION FOR STANDARD & PREMIUM */}
          {pkg.packageName !== 'Basic' && (
            <div className="bg-blue-50/60 border border-blue-200 p-6 rounded-2xl space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <span className="bg-blue-200 text-blue-900 text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    Accommodation Selection
                  </span>
                  <h4 className="text-xl font-bold text-blue-950 mt-1">
                    Select Partner Hotel &amp; Room Type
                  </h4>
                  <p className="text-xs text-blue-800/80 mt-0.5">
                    Choose a verified partner hotel from MongoDB to calculate exact accommodation charges, or keep the default tier estimate.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Partner Hotel</label>
                  <select
                    value={selectedHotelId}
                    onChange={(e) => {
                      setSelectedHotelId(e.target.value);
                      const h = hotels.find((item) => item._id === e.target.value);
                      setSelectedRoomType(h?.rooms?.[0]?.type || '');
                    }}
                    className="w-full p-3 border border-blue-200 rounded-xl bg-white text-sm font-semibold"
                  >
                    <option value="">
                      -- Default {pkg.packageName} Tier Hotel Estimate (
                      {formatPrice(pkg.packageName === 'Premium' ? 63000 : 36000)}/night) --
                    </option>
                    {hotels.map((h) => (
                      <option key={h._id} value={h._id}>
                        {h.name} ({h.location}) — {formatPrice(h.pricePerNightLKR || h.pricePerNight)}/night
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Rooms Required</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={numberOfRooms}
                    onChange={(e) => setNumberOfRooms(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-3 border border-blue-200 rounded-xl bg-white text-sm font-bold"
                  />
                </div>

                {selectedHotelObj && selectedHotelObj.rooms?.length > 0 && (
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Room Category</label>
                    <select
                      value={selectedRoomType}
                      onChange={(e) => setSelectedRoomType(e.target.value)}
                      className="w-full p-3 border border-blue-200 rounded-xl bg-white text-sm font-semibold"
                    >
                      {selectedHotelObj.rooms.map((r, i) => (
                        <option key={i} value={r.type}>
                          {r.type} (Capacity: {r.capacity} guests • Available: {r.count} rooms)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STANDARD PACKAGE OPTIONAL GUIDE ADD-ON */}
          {pkg.packageName === 'Standard' && (
            <div className="bg-blue-50/80 border border-blue-200 p-6 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="bg-blue-200 text-blue-900 text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    Optional Add-on Service
                  </span>
                  <h4 className="text-xl font-bold text-blue-950 mt-1">
                    Professional Tour Guide Service
                  </h4>
                  <p className="text-sm text-blue-800/80 max-w-xl mt-1">
                    By default, the Standard package includes hotel stays and transport without a tour guide. You can optionally add a licensed guide.
                  </p>
                </div>
                <label className="flex items-center gap-3 cursor-pointer bg-white px-5 py-3 rounded-xl border border-blue-300 shadow-sm hover:border-blue-500 transition-colors">
                  <input
                    type="checkbox"
                    checked={addGuide}
                    onChange={(e) => setAddGuide(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                  />
                  <div className="text-left">
                    <span className="block font-bold text-sm text-gray-900">Include Tour Guide</span>
                    <span className="text-xs text-blue-700 font-semibold">
                      +{formatPrice(pkg.guideAddonPriceLKR || pkg.guideAddonPrice || 13500)} / day
                    </span>
                  </div>
                </label>
              </div>

              {addGuide && guides.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Choose a Specific Licensed Guide (Optional)
                  </label>
                  <select
                    value={selectedGuideId}
                    onChange={(e) => setSelectedGuideId(e.target.value)}
                    className="w-full p-3 border border-blue-200 rounded-xl bg-white text-sm font-semibold"
                  >
                    <option value="">
                      -- Standard Package Licensed Guide Allocation ({formatPrice(13500)}/day) --
                    </option>
                    {guides.map((g) => (
                      <option key={g._id} value={g._id}>
                        {g.name || g.userId?.name} ({(g.languages || []).join(', ')}) —{' '}
                        {formatPrice(g.dailyRateLKR || g.dailyRate)}/day
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* PREMIUM PACKAGE SELECTIONS (FOOD & GUIDE) */}
          {pkg.packageName === 'Premium' && (
            <div className="space-y-8 bg-purple-50/50 p-8 rounded-3xl border border-purple-200/80">
              <div>
                <span className="bg-purple-200 text-purple-900 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Step 1 • Dietary &amp; Culinary Customization
                </span>
                <h3 className="text-2xl font-bold text-gray-900 mt-2 mb-1">
                  Select Your Meal Type &amp; Culinary Plan
                </h3>
                <p className="text-gray-600 text-sm">
                  The Premium Package includes full-board dining (Breakfast, Lunch &amp; Dinner). Choose your primary meal type and gourmet style:
                </p>

                {/* Primary Meal Type Selector (Vegetarian, Vegan, Seafood, All meat types) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {[
                    { type: 'Vegetarian', rateLKR: 4500 },
                    { type: 'Vegan', rateLKR: 4800 },
                    { type: 'Seafood', rateLKR: 7500 },
                    { type: 'All meat types', rateLKR: 6500 }
                  ].map((m) => (
                    <button
                      key={m.type}
                      type="button"
                      onClick={() => setSelectedMealType(m.type)}
                      className={`p-3 rounded-xl border-2 text-left transition ${
                        selectedMealType === m.type
                          ? 'border-purple-600 bg-white shadow-sm'
                          : 'border-gray-200 bg-white/70 hover:border-purple-300'
                      }`}
                    >
                      <span className="block text-xs font-bold text-gray-900">{m.type}</span>
                      <span className="block text-[11px] text-purple-700 font-semibold">
                        {formatPrice(m.rateLKR, { normalizeLegacy: false })}/pax/day
                      </span>
                    </button>
                  ))}
                </div>

                {/* Gourmet Culinary Experience Options */}
                <div className="grid md:grid-cols-2 gap-4 mt-5">
                  {pkg.mealOptions?.map((meal, idx) => {
                    const extraLKR = meal.extraCostPerDayLKR ?? meal.extraCostPerDay ?? 0;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedMeal(meal.name);
                          if (meal.mealType) setSelectedMealType(meal.mealType);
                        }}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedMeal === meal.name
                            ? 'border-purple-600 bg-white shadow-md'
                            : 'border-gray-200 bg-white/70 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <input
                              type="radio"
                              name="mealOption"
                              checked={selectedMeal === meal.name}
                              onChange={() => setSelectedMeal(meal.name)}
                              className="text-purple-600 focus:ring-purple-500"
                            />
                            {meal.name}
                          </span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              extraLKR > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {extraLKR > 0 ? `+${formatPrice(extraLKR)}/day` : 'Included'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 ml-5">{meal.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-6 border-t border-purple-200">
                <span className="bg-purple-200 text-purple-900 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Step 2 • Specialist Guide Selection
                </span>
                <h3 className="text-2xl font-bold text-gray-900 mt-2 mb-1">
                  Choose Your Specialist Tour Guide
                </h3>
                <p className="text-gray-600 text-sm">
                  A dedicated licensed National Guide is included. Select a specialist profile or choose a registered guide from our directory:
                </p>

                <div className="grid md:grid-cols-2 gap-4 mt-5">
                  {pkg.guideOptions?.map((guide, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedGuide(guide.name);
                        setSelectedGuideId('');
                      }}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedGuide === guide.name && !selectedGuideId
                          ? 'border-purple-600 bg-white shadow-md'
                          : 'border-gray-200 bg-white/70 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <input
                            type="radio"
                            name="guideOption"
                            checked={selectedGuide === guide.name && !selectedGuideId}
                            onChange={() => {
                              setSelectedGuide(guide.name);
                              setSelectedGuideId('');
                            }}
                            className="text-purple-600 focus:ring-purple-500"
                          />
                          {guide.name}
                        </span>
                        <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                          Included
                        </span>
                      </div>
                      <p className="text-xs text-purple-900/80 font-medium ml-5 mb-1.5">
                        {guide.specialty}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-5">
                        <Globe size={12} className="text-gray-400" />
                        <span>Languages: {guide.languages?.join(', ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Live Dynamic Cost Calculator Box */}
          <div className="bg-gradient-to-br from-gray-900 to-blue-950 text-white p-8 rounded-3xl shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-4 flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-300 bg-blue-900/60 px-3 py-1 rounded-full border border-blue-400/30 inline-flex items-center gap-1.5">
                <Calculator size={13} /> Authoritative Cost Preview ({currency})
              </span>
              <h3 className="text-2xl font-bold">Estimated Trip Investment</h3>

              <div className="flex flex-wrap gap-4 text-xs text-gray-300 pt-1">
                <div className="flex items-center gap-2">
                  <span>Days:</span>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={previewDays}
                    onChange={(e) => setPreviewDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white font-bold"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span>Travelers:</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={previewTravelers}
                    onChange={(e) =>
                      setPreviewTravelers(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-16 px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white font-bold"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span>Transport:</span>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="px-2.5 py-1.5 bg-blue-900 border border-white/20 rounded-lg text-white font-bold"
                  >
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="Car">Car</option>
                    <option value="Van">Van</option>
                  </select>
                </div>
              </div>

              {backendPricing && (
                <div className="grid sm:grid-cols-2 gap-2 text-xs text-blue-200 pt-2">
                  <div>
                    • Transport ({backendPricing.breakdown.transportation.vehicleType}):{' '}
                    <strong>
                      {formatPrice(backendPricing.breakdown.transportation.totalLKR, {
                        normalizeLegacy: false
                      })}
                    </strong>
                  </div>
                  <div>
                    • Accommodation:{' '}
                    <strong>
                      {formatPrice(backendPricing.breakdown.accommodation.totalLKR, {
                        normalizeLegacy: false
                      })}
                    </strong>
                  </div>
                  <div>
                    • Meals ({backendPricing.breakdown.meals.mealType}):{' '}
                    <strong>
                      {formatPrice(backendPricing.breakdown.meals.totalLKR, {
                        normalizeLegacy: false
                      })}
                    </strong>
                  </div>
                  <div>
                    • Tour Guide:{' '}
                    <strong>
                      {formatPrice(backendPricing.breakdown.guide.totalLKR, {
                        normalizeLegacy: false
                      })}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            <div className="text-left lg:text-right flex flex-col items-start lg:items-end">
              <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                Total Estimated Cost ({currency})
              </span>
              <div className="text-4xl md:text-5xl font-extrabold text-green-400 my-1">
                {backendPricing
                  ? formatPrice(backendPricing.summary.totalEstimatedCostLKR, {
                      normalizeLegacy: false
                    })
                  : baseDual.primary}
              </div>
              {backendPricing && currency !== 'LKR' && (
                <span className="text-xs text-blue-200">
                  Stored LKR Base: {backendPricing.summary.formattedTotalLKR}
                </span>
              )}
              {backendPricing && (
                <span className="text-xs text-green-300 font-semibold mt-0.5">
                  Cost Per Person:{' '}
                  {formatPrice(backendPricing.summary.costPerPersonLKR, {
                    normalizeLegacy: false
                  })}
                </span>
              )}
              <button
                onClick={handleApplyAndContinue}
                className="mt-4 flex items-center bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 text-sm"
              >
                Select Package &amp; Continue to Trip Planner <ArrowRight size={18} className="ml-2" />
              </button>
            </div>
          </div>
        </div>
    </div>
  );
};

export default PackageDetails;
