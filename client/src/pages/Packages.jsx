import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PackageCard from '../components/PackageCard';
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PackageCard from '../components/PackageCard';
import { PackageContext } from '../context/PackageContext';
import { useCurrency } from '../context/CurrencyContext';
import {
  Car,
  Home,
  Sparkles,
  Check,
  X,
  Calculator,
  Globe,
  Utensils,
  Compass,
  ShieldCheck,
  Info,
  ArrowRight
} from 'lucide-react';

const Packages = () => {
  const navigate = useNavigate();
  const { selectedPackage, selectPackage, updateCustomizations } = useContext(PackageContext);
  const { currency, formatPrice, formatDualPrice, rateDate, rates } = useCurrency();

  const [packages, setPackages] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPackages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/packages');
      const data = res.data?.data || res.data || [];
      // Ensure consistent order: Basic -> Standard -> Premium
      const order = { Basic: 1, Standard: 2, Premium: 3 };
      data.sort((a, b) => (order[a.packageName] || 9) - (order[b.packageName] || 9));
      setPackages(data);
    } catch (err) {
      console.error('Failed to fetch packages:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load tour packages.');
    } finally {
      setLoading(false);
    }
  };

  // Interactive Dynamic Pricing Simulator State
  const [calcPackageName, setCalcPackageName] = useState('Standard');
  const [calcDays, setCalcDays] = useState(4);
  const [calcTravelers, setCalcTravelers] = useState(2);
  const [calcVehicle, setCalcVehicle] = useState('Car');
  const [calcDistanceKm, setCalcDistanceKm] = useState(450);
  const [calcHotelId, setCalcHotelId] = useState('');
  const [calcRoomType, setCalcRoomType] = useState('');
  const [calcRoomsCount, setCalcRoomsCount] = useState(1);
  const [calcMealType, setCalcMealType] = useState('Vegetarian');
  const [calcAddGuide, setCalcAddGuide] = useState(false);
  const [calcGuideId, setCalcGuideId] = useState('');
  const [livePricing, setLivePricing] = useState(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [pkgRes, hotelRes, guideRes] = await Promise.all([
          api.get('/packages', { params: { currency } }),
          api.get('/hotels', { params: { currency } }).catch(() => ({ data: { data: [] } })),
          api.get('/guides', { params: { currency } }).catch(() => ({ data: { data: [] } }))
        ]);

        const pkgData = pkgRes.data?.data || [];
        const order = { Basic: 1, Standard: 2, Premium: 3 };

        pkgData.sort(
          (a, b) => (order[a.packageName] || 9) - (order[b.packageName] || 9)
        );

        setPackages(pkgData);
        setHotels(hotelRes.data?.data || []);
        setGuides(guideRes.data?.data || []);

        if (selectedPackage?.packageName) {
          setCalcPackageName(selectedPackage.packageName);
        }
      } catch (err) {
        console.error('Failed to fetch packages data:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load tour packages.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [currency]);

  // Run authoritative backend pricing calculation whenever inputs change
  useEffect(() => {
    let active = true;

    const runPricingCalculation = async () => {
      setCalculating(true);

      try {
        const res = await api.post('/pricing/calculate', {
          packageName: calcPackageName,
          days: calcDays,
          travelers: calcTravelers,
          vehicleType: calcVehicle,
          routeDistanceKm: calcDistanceKm,
          hotelId: calcPackageName === 'Basic' ? null : calcHotelId || null,
          roomType: calcRoomType || null,
          numberOfRooms: calcRoomsCount,
          mealType: calcMealType,
          addGuide: calcPackageName === 'Premium' ? true : calcAddGuide,
          guideId:
            calcPackageName === 'Basic'
              ? null
              : calcPackageName === 'Standard' && !calcAddGuide
              ? null
              : calcGuideId || null,
          targetCurrency: currency
        });

        if (active && res.data?.success) {
          setLivePricing(res.data.data);
        }
      } catch (err) {
        console.error('Dynamic pricing error:', err);
      } finally {
        if (active) {
          setCalculating(false);
        }
      }
    };

    runPricingCalculation();

    return () => {
      active = false;
    };
  }, [
    calcPackageName,
    calcDays,
    calcTravelers,
    calcVehicle,
    calcDistanceKm,
    calcHotelId,
    calcRoomType,
    calcRoomsCount,
    calcMealType,
    calcAddGuide,
    calcGuideId,
    currency
  ]);

  const selectedHotelObj = hotels.find((h) => h._id === calcHotelId) || null;

  const handleApplyCalculatorToPlanner = async () => {
    const matchedPkg =
      packages.find((p) => p.packageName === calcPackageName) || packages[1];

    const selectedGuideObj = guides.find((g) => g._id === calcGuideId);

    updateCustomizations({
      vehicleType: calcVehicle,
      routeDistanceKm: calcDistanceKm,
      selectedHotelId: calcPackageName === 'Basic' ? '' : calcHotelId,
      selectedHotelRateLKR: selectedHotelObj?.pricePerNightLKR || null,
      selectedRoomType: calcRoomType,
      numberOfRooms: calcRoomsCount,
      selectedMealType: calcMealType,
      addGuide: calcPackageName === 'Standard'
        ? calcAddGuide
        : calcPackageName === 'Premium',
      selectedGuideId: calcGuideId,
      selectedGuideRateLKR: selectedGuideObj?.dailyRateLKR || null
    });

    if (matchedPkg) {
      await selectPackage(matchedPkg, {
        days: calcDays,
        travelers: calcTravelers,
        vehicleType: calcVehicle,
        hotelId: calcHotelId || null,
        guideId: calcGuideId || null,
        mealType: calcMealType,
        addGuide: calcAddGuide
      });
    }

    navigate('/planner');
  };
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-16">
      {/* Title & Introduction */}
      <div className="text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-200">
          Module 3 &amp; Module 8 • Dynamic Pricing &amp; Multi-Currency
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-950 mt-3 mb-4 tracking-tight">
          Dream Ceylon Tour Packages
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Choose the exact level of travel assistance that fits your style. All prices are stored in{' '}
          <strong>LKR (Sri Lankan Rupees)</strong> and dynamically converted to{' '}
          <strong>{currency}</strong> using live exchange rates.
        </p>
      </div>

      {/* Quick Tier Comparison Summary Pill Bar */}
      <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-xl flex items-start gap-3">
          <Car className="text-amber-700 mt-0.5 flex-shrink-0" size={20} />
          <div>
            <h4 className="font-bold text-sm text-amber-950">1. Basic Package</h4>
            <p className="text-xs text-amber-800/80">
              Destination recommendations, travel route, day-by-day itinerary &amp; transport costs. No hotel, food, or guide.
            </p>
          </div>
        </div>

        <div className="bg-blue-50/70 border border-blue-200/80 p-4 rounded-xl flex items-start gap-3">
          <Home className="text-blue-700 mt-0.5 flex-shrink-0" size={20} />
          <div>
            <h4 className="font-bold text-sm text-blue-950">2. Standard Package</h4>
            <p className="text-xs text-blue-800/80">
              All Basic features + partner hotel selection, non-food facilities &amp; stay cost calculation. Optional guide add-on.
            </p>
          </div>
        </div>

        <div className="bg-purple-50/70 border border-purple-200/80 p-4 rounded-xl flex items-start gap-3">
          <Sparkles className="text-purple-700 mt-0.5 flex-shrink-0" size={20} />
          <div>
            <h4 className="font-bold text-sm text-purple-950">3. Premium Package</h4>
            <p className="text-xs text-purple-800/80">
              All Standard features + full-board meal plans (Vegetarian, Vegan, Seafood, All meat) &amp; specialist tour guide.
            </p>
          </div>
        </div>
      </div>

{/* Packages Cards Grid / Loading and Error States */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-20 space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
          <p className="text-sm text-gray-500 font-medium">Loading tour packages...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 px-6 bg-red-50 rounded-2xl border border-red-200 max-w-xl mx-auto mb-8">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 font-bold text-xl">
            !
          </div>
          <h3 className="text-xl font-bold text-red-900 mb-2">Unable to Load Packages</h3>
          <p className="text-red-700 text-sm mb-6">{error}</p>
          <button
            onClick={fetchPackages}
            className="bg-blue-900 hover:bg-blue-800 text-white font-medium px-6 py-2.5 rounded-lg shadow transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 max-w-xl mx-auto">
          <p className="text-gray-700 text-lg font-semibold mb-2">No packages found in database.</p>
          <p className="text-gray-500 text-sm mb-6">
            The packages collection is currently empty. Run the safe recovery script to restore package tiers.
          </p>
          <button
            onClick={fetchPackages}
            className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            Refresh
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg._id}
              pkg={pkg}
              previewDays={calcDays}
              previewTravelers={calcTravelers}
            />
          ))}
        </div>
      )}

      {/* Side-by-Side Package Feature Comparison Table */}
      <div className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-950 to-indigo-900 p-6 md:p-8 text-white">
          <h2 className="text-2xl font-extrabold">Complete Package Feature Comparison</h2>
          <p className="text-blue-200 text-sm mt-1">
            Transparent side-by-side matrix of included services, optional add-ons, and pricing rules across all 3 tiers.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-900 font-extrabold">
                <th className="p-4 min-w-[220px]">Feature / Service Category</th>
                <th className="p-4 text-center text-amber-900 bg-amber-50/40">Basic Package</th>
                <th className="p-4 text-center text-blue-900 bg-blue-50/40">Standard Package</th>
                <th className="p-4 text-center text-purple-900 bg-purple-50/40">Premium Package</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
              <tr>
                <td className="p-4 font-semibold text-gray-800">Destination Recommendations &amp; Travel Route</td>
                <td className="p-4 text-center text-green-700 font-bold">✓ Included</td>
                <td className="p-4 text-center text-green-700 font-bold">✓ Included</td>
                <td className="p-4 text-center text-green-700 font-bold">✓ Included</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-gray-800">Day-by-Day Itinerary &amp; Basic Trip Planning</td>
                <td className="p-4 text-center text-green-700 font-bold">✓ Included</td>
                <td className="p-4 text-center text-green-700 font-bold">✓ Included</td>
                <td className="p-4 text-center text-green-700 font-bold">✓ Included</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-gray-800">Transportation (Motorcycle, Car, Van)</td>
                <td className="p-4 text-center text-green-700 font-bold">✓ Estimated Transport Cost</td>
                <td className="p-4 text-center text-green-700 font-bold">✓ Dedicated Chauffeur Vehicle</td>
                <td className="p-4 text-center text-green-700 font-bold">✓ Executive VIP Transport</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-gray-800">Hotel Accommodation &amp; Room Selection</td>
                <td className="p-4 text-center text-red-500 font-medium">✕ Not Included (Self-Arranged)</td>
                <td className="p-4 text-center text-green-700 font-bold">✓ 3–4★ Partner Hotel Selection</td>
                <td className="p-4 text-center text-green-700 font-bold">✓ 5★ Luxury Resorts &amp; Villas</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-gray-800">Relevant Non-Food Facilities</td>
                <td className="p-4 text-center text-gray-600">Road Hotline &amp; Route Map</td>
                <td className="p-4 text-center text-blue-700 font-semibold">Wi-Fi, Water, Porterage &amp; Tolls</td>
                <td className="p-4 text-center text-purple-700 font-semibold">VIP Lounge, Safari &amp; Spa Passes</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-gray-800">
                  Food &amp; Meal Plans (Vegetarian, Vegan, Seafood, All Meat)
                </td>
                <td className="p-4 text-center text-red-500 font-medium">✕ Excluded (Rs. 0 Meal Charge)</td>
                <td className="p-4 text-center text-red-500 font-medium">✕ Excluded by Default (Rs. 0)</td>
                <td className="p-4 text-center text-green-700 font-bold">✓ Full-Board Included (Choice of 4 Types)</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-gray-800">Licensed Tour Guide Services</td>
                <td className="p-4 text-center text-red-500 font-medium">✕ Not Included</td>
                <td className="p-4 text-center text-blue-700 font-bold">⊕ Optional Add-On Service</td>
                <td className="p-4 text-center text-green-700 font-bold">✓ Specialist / Partner Guide Included</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Authoritative Interactive Dynamic Pricing & Currency Calculator */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden" id="pricing-calculator">
        <div className="bg-gradient-to-r from-gray-900 via-blue-950 to-indigo-950 p-6 md:p-8 text-white flex flex-wrap justify-between items-center gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/30">
              Interactive Dynamic Pricing Engine
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold mt-2 flex items-center gap-2">
              <Calculator size={26} className="text-green-400" />
              Real-Time Tour Cost &amp; Currency Estimator
            </h2>
            <p className="text-blue-200 text-sm mt-1">
              Configure your package, transport vehicle, partner hotel, meal preference, and tour guide to compute exact LKR and {currency} costs.
            </p>
          </div>
          <div className="bg-white/10 border border-white/20 px-4 py-2.5 rounded-2xl text-right text-xs">
            <span className="text-blue-200 block">Active Display Currency</span>
            <strong className="text-lg text-yellow-400">{currency}</strong>
            {currency !== 'LKR' && (
              <span className="block text-[11px] text-blue-200">
                1 LKR = {(rates[currency] || 0).toFixed(5)} {currency} ({rateDate || 'Latest'})
              </span>
            )}
          </div>
        </div>

        <div className="p-6 md:p-8 grid lg:grid-cols-12 gap-8">
          {/* Left Column: Configuration Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Package Tier Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                1. Choose Package Tier
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['Basic', 'Standard', 'Premium'].map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => {
                      setCalcPackageName(tier);
                      if (tier === 'Basic') {
                        setCalcHotelId('');
                        setCalcGuideId('');
                        setCalcAddGuide(false);
                      }
                    }}
                    className={`py-3 px-4 rounded-xl font-bold text-sm border-2 transition ${
                      calcPackageName === tier
                        ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Duration, Travelers, Transport & Route Distance */}
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Travel Days</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={calcDays}
                  onChange={(e) => setCalcDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-bold text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Travelers</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={calcTravelers}
                  onChange={(e) => setCalcTravelers(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-bold text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Transport Mode</label>
                <select
                  value={calcVehicle}
                  onChange={(e) => setCalcVehicle(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-bold text-sm bg-white"
                >
                  <option value="Motorcycle">Motorcycle (1–2 pax)</option>
                  <option value="Car">Car (1–3 pax)</option>
                  <option value="Van">Van (4–8 pax)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Route Distance (km)</label>
                <input
                  type="number"
                  min="0"
                  max="5000"
                  value={calcDistanceKm}
                  onChange={(e) => setCalcDistanceKm(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-bold text-sm"
                />
              </div>
            </div>

            {/* 3. Accommodation Selection (Standard & Premium) */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <Home size={15} className="text-blue-600" />
                  2. Accommodation &amp; Partner Hotel Selection
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    calcPackageName === 'Basic'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {calcPackageName === 'Basic' ? 'Excluded in Basic' : 'Included in Package'}
                </span>
              </div>

              {calcPackageName === 'Basic' ? (
                <p className="text-xs text-gray-500">
                  The Basic Package does not include hotel stays. Switch to Standard or Premium to select a partner hotel and calculate accommodation costs.
                </p>
              ) : (
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Select Partner Hotel (or use Tier Estimate)
                    </label>
                    <select
                      value={calcHotelId}
                      onChange={(e) => {
                        setCalcHotelId(e.target.value);
                        const h = hotels.find((item) => item._id === e.target.value);
                        setCalcRoomType(h?.rooms?.[0]?.type || '');
                      }}
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white"
                    >
                      <option value="">
                        -- Use {calcPackageName} Tier Estimate ({formatPrice(calcPackageName === 'Premium' ? 63000 : 36000)}/night) --
                      </option>
                      {hotels.map((h) => (
                        <option key={h._id} value={h._id}>
                          {h.name} ({h.location}) — {formatPrice(h.pricePerNightLKR || h.pricePerNight)}/night
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Number of Rooms
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={calcRoomsCount}
                      onChange={(e) => setCalcRoomsCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-bold bg-white"
                    />
                  </div>

                  {selectedHotelObj && selectedHotelObj.rooms?.length > 0 && (
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Room Type at {selectedHotelObj.name}
                      </label>
                      <select
                        value={calcRoomType}
                        onChange={(e) => setCalcRoomType(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-xl text-xs font-semibold bg-white"
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
              )}
            </div>

            {/* 4. Food & Meal Selection (Premium only by default) */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <Utensils size={15} className="text-purple-600" />
                  3. Food &amp; Meal Plan Preference
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    calcPackageName === 'Premium'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {calcPackageName === 'Premium' ? 'Full-Board Included' : 'Excluded (Rs. 0)'}
                </span>
              </div>

              {calcPackageName !== 'Premium' ? (
                <p className="text-xs text-gray-500">
                  {calcPackageName} Package does not charge for unincluded meals (Rs. 0 meal cost). Select the Premium Package to include full-board dining.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { type: 'Vegetarian', rateLKR: 4500 },
                    { type: 'Vegan', rateLKR: 4800 },
                    { type: 'Seafood', rateLKR: 7500 },
                    { type: 'All meat types', rateLKR: 6500 }
                  ].map((m) => (
                    <button
                      key={m.type}
                      type="button"
                      onClick={() => setCalcMealType(m.type)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        calcMealType === m.type
                          ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                      }`}
                    >
                      <span className="block text-xs font-bold">{m.type}</span>
                      <span className="block text-[11px] text-gray-500">
                        {formatPrice(m.rateLKR, { normalizeLegacy: false })}/pax/day
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Tour Guide Selection (Standard Optional Add-On & Premium Included) */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <Compass size={15} className="text-indigo-600" />
                  4. Licensed Tour Guide Selection
                </span>
                {calcPackageName === 'Standard' && (
                  <label className="flex items-center gap-2 text-xs font-bold text-blue-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={calcAddGuide}
                      onChange={(e) => setCalcAddGuide(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    Add Optional Guide
                  </label>
                )}
              </div>

              {calcPackageName === 'Basic' ? (
                <p className="text-xs text-gray-500">
                  Tour guide services are not included in the Basic Package.
                </p>
              ) : calcPackageName === 'Standard' && !calcAddGuide ? (
                <p className="text-xs text-gray-500">
                  Check &ldquo;Add Optional Guide&rdquo; above to include a licensed national tour guide in your Standard Package.
                </p>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Select Registered Tour Guide (or use Package Specialist Allocation)
                  </label>
                  <select
                    value={calcGuideId}
                    onChange={(e) => setCalcGuideId(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white"
                  >
                    <option value="">
                      -- Package Specialist Guide Allocation ({formatPrice(calcPackageName === 'Premium' ? 18000 : 13500)}/day) --
                    </option>
                    {guides.map((g) => (
                      <option key={g._id} value={g._id}>
                        {g.name || g.userId?.name} ({(g.languages || []).join(', ')}) — {formatPrice(g.dailyRateLKR || g.dailyRate)}/day
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Itemized Cost Summary (5 cols) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b border-white/15 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-green-400 block">
                    Complete Cost Summary
                  </span>
                  <h3 className="text-xl font-extrabold">
                    {calcPackageName} Package Breakdown
                  </h3>
                  <span className="text-xs text-blue-200">
                    {calcDays} Days • {calcTravelers} Traveler(s) • {calcVehicle}
                  </span>
                </div>
                {calculating && (
                  <span className="text-xs text-blue-300 animate-pulse">Updating...</span>
                )}
              </div>

              {livePricing && (
                <div className="space-y-3 text-xs">
                  {/* 1. Package Coordination & Non-Food Facilities */}
                  <div className="flex justify-between items-start py-1.5 border-b border-white/10">
                    <div>
                      <span className="font-bold text-white block">
                        Package Planning &amp; Non-Food Facilities
                      </span>
                      <span className="text-[11px] text-blue-200">
                        {livePricing.breakdown.packageCoordination.breakdownText}
                      </span>
                    </div>
                    <span className="font-bold text-white whitespace-nowrap ml-3">
                      {formatPrice(livePricing.breakdown.packageCoordination.totalLKR, {
                        normalizeLegacy: false
                      })}
                    </span>
                  </div>

                  {/* 2. Transportation */}
                  <div className="flex justify-between items-start py-1.5 border-b border-white/10">
                    <div>
                      <span className="font-bold text-white block">
                        Transportation ({livePricing.breakdown.transportation.vehicleType})
                      </span>
                      <span className="text-[11px] text-blue-200">
                        {livePricing.breakdown.transportation.breakdownText}
                      </span>
                    </div>
                    <span className="font-bold text-white whitespace-nowrap ml-3">
                      {formatPrice(livePricing.breakdown.transportation.totalLKR, {
                        normalizeLegacy: false
                      })}
                    </span>
                  </div>

                  {/* 3. Accommodation */}
                  <div className="flex justify-between items-start py-1.5 border-b border-white/10">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">Accommodation</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            livePricing.breakdown.accommodation.pricingType === 'confirmed'
                              ? 'bg-green-500/30 text-green-300'
                              : livePricing.breakdown.accommodation.pricingType === 'excluded'
                              ? 'bg-red-500/30 text-red-300'
                              : 'bg-amber-500/30 text-amber-300'
                          }`}
                        >
                          {livePricing.breakdown.accommodation.pricingType}
                        </span>
                      </div>
                      <span className="text-[11px] text-blue-200 block">
                        {livePricing.breakdown.accommodation.breakdownText}
                      </span>
                    </div>
                    <span className="font-bold text-white whitespace-nowrap ml-3">
                      {formatPrice(livePricing.breakdown.accommodation.totalLKR, {
                        normalizeLegacy: false
                      })}
                    </span>
                  </div>

                  {/* 4. Food & Meals */}
                  <div className="flex justify-between items-start py-1.5 border-b border-white/10">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">Food &amp; Meal Plan</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            livePricing.breakdown.meals.included
                              ? 'bg-purple-500/30 text-purple-200'
                              : 'bg-gray-500/30 text-gray-300'
                          }`}
                        >
                          {livePricing.breakdown.meals.included ? 'Included' : 'Excluded'}
                        </span>
                      </div>
                      <span className="text-[11px] text-blue-200 block">
                        {livePricing.breakdown.meals.breakdownText}
                      </span>
                    </div>
                    <span className="font-bold text-white whitespace-nowrap ml-3">
                      {formatPrice(livePricing.breakdown.meals.totalLKR, {
                        normalizeLegacy: false
                      })}
                    </span>
                  </div>

                  {/* 5. Tour Guide */}
                  <div className="flex justify-between items-start py-1.5 border-b border-white/10">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">Tour Guide Charges</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            livePricing.breakdown.guide.pricingType === 'confirmed'
                              ? 'bg-green-500/30 text-green-300'
                              : livePricing.breakdown.guide.pricingType === 'excluded'
                              ? 'bg-gray-500/30 text-gray-300'
                              : 'bg-blue-500/30 text-blue-200'
                          }`}
                        >
                          {livePricing.breakdown.guide.pricingType}
                        </span>
                      </div>
                      <span className="text-[11px] text-blue-200 block">
                        {livePricing.breakdown.guide.breakdownText}
                      </span>
                    </div>
                    <span className="font-bold text-white whitespace-nowrap ml-3">
                      {formatPrice(livePricing.breakdown.guide.totalLKR, {
                        normalizeLegacy: false
                      })}
                    </span>
                  </div>

                  {/* Subtotal & Additional Charges */}
                  <div className="pt-2 space-y-1 text-blue-200">
                    <div className="flex justify-between">
                      <span>Core Package Charges:</span>
                      <span>
                        {formatPrice(livePricing.summary.corePackageServicesLKR, {
                          normalizeLegacy: false
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Optional / Excess Add-On Charges:</span>
                      <span>
                        {formatPrice(livePricing.summary.additionalChargesLKR, {
                          normalizeLegacy: false
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Grand Total & Action Button */}
            {livePricing && (
              <div className="mt-6 pt-4 border-t border-white/20 space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-blue-200 font-bold block">
                      Total Estimated Tour Cost
                    </span>
                    <span className="text-xs text-green-300 font-semibold">
                      Per Person:{' '}
                      {formatPrice(livePricing.summary.costPerPersonLKR, {
                        normalizeLegacy: false
                      })}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-extrabold text-green-400">
                      {formatPrice(livePricing.summary.totalEstimatedCostLKR, {
                        normalizeLegacy: false
                      })}
                    </div>
                    {currency !== 'LKR' && (
                      <div className="text-xs text-blue-200">
                        Authoritative Base: {livePricing.summary.formattedTotalLKR}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white/10 rounded-xl p-2.5 text-[11px] text-blue-100 flex items-start gap-2">
                  <Info size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span>{livePricing.chargeClassification?.disclaimer}</span>
                </div>

                <button
                  type="button"
                  onClick={handleApplyCalculatorToPlanner}
                  className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm"
                >
                  Apply Configuration &amp; Open Smart Planner <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Packages;
