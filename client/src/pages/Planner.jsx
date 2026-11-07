import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { PackageContext } from '../context/PackageContext';
import { useCurrency } from '../context/CurrencyContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import DestinationCard from '../components/DestinationCard';
import MapView from '../components/MapView';
import {
  Car,
  Home,
  Utensils,
  Compass,
  Check,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Info,
  DollarSign,
  Calculator
} from 'lucide-react';

const Planner = () => {
  const { user } = useContext(AuthContext);
  const {
    selectedPackage,
    selectPackage,
    customizations,
    updateCustomizations,
    calculatePackageCost
  } = useContext(PackageContext);
  const { currency, formatPrice } = useCurrency();

  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [results, setResults] = useState(null);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [partnerHotels, setPartnerHotels] = useState([]);
  const [partnerGuides, setPartnerGuides] = useState([]);
  const [backendPricing, setBackendPricing] = useState(null);

  // Map integration states
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [totalDistance, setTotalDistance] = useState('');
  const [totalDistanceKmNumeric, setTotalDistanceKmNumeric] = useState(0);
  const [totalDuration, setTotalDuration] = useState('');
  const [loadingRoute, setLoadingRoute] = useState(false);

  const [formData, setFormData] = useState({
    days: 3,
    travelers: 2,
    interests: [],
    weatherPreference: 'Any',
    vehicleType: customizations.vehicleType || 'Car',
    budget: 240000
  });

  // Fetch all packages, hotels, and guides
  useEffect(() => {
    const fetchAllResources = async () => {
      try {
        const [pkgRes, hotelRes, guideRes] = await Promise.all([
          api.get('/packages', { params: { currency } }),
          api.get('/hotels', { params: { currency } }).catch(() => ({ data: { data: [] } })),
          api.get('/guides', { params: { currency } }).catch(() => ({ data: { data: [] } }))
        ]);

        const list = pkgRes.data?.data || pkgRes.data || [];
        const order = { Basic: 1, Standard: 2, Premium: 3 };
        list.sort((a, b) => (order[a.packageName] || 9) - (order[b.packageName] || 9));
        setAvailablePackages(list);
        setPartnerHotels(hotelRes.data?.data || []);
        setPartnerGuides(guideRes.data?.data || []);

        if (!selectedPackage && list.length > 0) {
          const defaultPkg = list.find((p) => p.packageName === 'Standard') || list[0];
          selectPackage(defaultPkg);
        }
      } catch (err) {
        console.error('Failed to load planner resources:', err);
      }
    };
    fetchAllResources();
  }, [currency]);

  const activePackage =
    selectedPackage || availablePackages.find((p) => p.packageName === 'Standard') || null;

  // Fetch authoritative backend pricing whenever wizard inputs change
  useEffect(() => {
    if (!activePackage) return;
    let active = true;
    const syncBackendPricing = async () => {
      try {
        const res = await api.post('/pricing/calculate', {
          packageId: activePackage._id,
          packageName: activePackage.packageName,
          days: formData.days,
          travelers: formData.travelers,
          vehicleType: formData.vehicleType,
          routeDistanceKm: totalDistanceKmNumeric || customizations.routeDistanceKm || 0,
          hotelId:
            activePackage.packageName === 'Basic' ? null : customizations.selectedHotelId || null,
          roomType: customizations.selectedRoomType || null,
          numberOfRooms: customizations.numberOfRooms || 1,
          mealType: customizations.selectedMealType || 'Vegetarian',
          selectedMealOption: customizations.selectedMealOption,
          addGuide:
            activePackage.packageName === 'Premium' ? true : Boolean(customizations.addGuide),
          guideId: customizations.selectedGuideId || null,
          selectedGuideOption: customizations.selectedGuideOption,
          targetCurrency: currency
        });
        if (active && res.data?.success) {
          setBackendPricing(res.data.data);
        }
      } catch (e) {
        // Fallback to synchronous calculation
      }
    };
    syncBackendPricing();
    return () => {
      active = false;
    };
  }, [
    activePackage,
    formData.days,
    formData.travelers,
    formData.vehicleType,
    totalDistanceKmNumeric,
    customizations,
    currency
  ]);

  const handleNext = () => setStep(step + 1);
  const handlePrev = () => setStep(step - 1);

  const toggleInterest = (interest) => {
    setFormData((prev) => {
      const interests = prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest];
      return { ...prev, interests };
    });
  };

  const fetchRoute = async (dests) => {
    if (dests.length > 1) {
      setLoadingRoute(true);
      let aggregatedCoordinates = [];
      let totalDist = 0;
      let totalDur = 0;

      try {
        for (let i = 0; i < dests.length - 1; i++) {
          const origin = dests[i];
          const dest = dests[i + 1];

          const res = await api.get('/maps/route', {
            params: {
              originLat: origin.latitude,
              originLng: origin.longitude,
              destLat: dest.latitude,
              destLng: dest.longitude,
              vehicleType: formData.vehicleType.toLowerCase()
            }
          });

          if (res.data.success) {
            const routeData = res.data.data;
            totalDist += routeData.distance;
            totalDur += routeData.duration;

            const leafletCoords = routeData.coordinates.map((coord) => [coord[1], coord[0]]);
            aggregatedCoordinates = [...aggregatedCoordinates, ...leafletCoords];
          }
        }

        const distKm = Number((totalDist / 1000).toFixed(2));
        setRouteCoordinates(aggregatedCoordinates);
        setTotalDistance(`${distKm} km`);
        setTotalDistanceKmNumeric(distKm);

        const hours = Math.floor(totalDur / 3600);
        const minutes = Math.floor((totalDur % 3600) / 60);
        setTotalDuration(`${hours}h ${minutes}m`);
        return distKm;
      } catch (err) {
        console.error('Route fetching error:', err);
        return 0;
      } finally {
        setLoadingRoute(false);
      }
    }
    return 0;
  };

  const handleSubmit = async () => {
    if (!user) {
      alert('Please login to generate your smart plan.');
      navigate('/login');
      return;
    }
    setLoading(true);
    setSavedNotice('');
    try {
      const res = await api.get('/destinations');
      let dests = res.data?.data || res.data || [];

      if (formData.interests.length > 0) {
        dests = dests.filter((d) => formData.interests.includes(d.category));
      }

      if (formData.weatherPreference === 'Cold') {
        dests = dests.filter((d) => ['Nuwara Eliya', 'Badulla'].includes(d.district));
      } else if (formData.weatherPreference === 'Hot') {
        dests = dests.filter((d) => !['Nuwara Eliya', 'Badulla'].includes(d.district));
      }

      const finalDests = dests.filter((d) => d.latitude && d.longitude).slice(0, formData.days);
      const computedDistKm = await fetchRoute(finalDests);

      // Authoritative backend pricing with actual route distance
      let finalPricing = null;
      try {
        const pricingRes = await api.post('/pricing/calculate', {
          packageId: activePackage?._id,
          packageName: activePackage?.packageName || 'Standard',
          days: formData.days,
          travelers: formData.travelers,
          vehicleType: formData.vehicleType,
          routeDistanceKm: computedDistKm,
          hotelId:
            activePackage?.packageName === 'Basic' ? null : customizations.selectedHotelId || null,
          roomType: customizations.selectedRoomType || null,
          numberOfRooms: customizations.numberOfRooms || 1,
          mealType: customizations.selectedMealType || 'Vegetarian',
          selectedMealOption: customizations.selectedMealOption,
          addGuide:
            activePackage?.packageName === 'Premium' ? true : Boolean(customizations.addGuide),
          guideId: customizations.selectedGuideId || null,
          selectedGuideOption: customizations.selectedGuideOption,
          targetCurrency: currency
        });
        finalPricing = pricingRes.data?.data;
      } catch (e) {
        // Fallback if offline
      }

      const costCalculation = calculatePackageCost(
        activePackage,
        formData.days,
        formData.travelers,
        {
          ...customizations,
          vehicleType: formData.vehicleType,
          routeDistanceKm: computedDistKm
        }
      );

      setResults({
        destinations: finalDests,
        costBreakdown: costCalculation,
        backendPricing: finalPricing || backendPricing,
        estimatedCostLKR:
          finalPricing?.summary?.totalEstimatedCostLKR || costCalculation.grandTotalLKR,
        packageSnapshot: activePackage,
        customizationsSnapshot: { ...customizations },
        itinerary: finalDests.map((d, i) => ({ day: i + 1, ...d }))
      });

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleSavePlanToDatabase = async () => {
    if (!results) return;
    setSavingPlan(true);
    try {
      const payload = {
        days: formData.days,
        travelers: formData.travelers,
        stops: results.destinations.map((d) => d._id),
        transportType: formData.vehicleType,
        packageId: results.packageSnapshot?._id,
        packageName: results.packageSnapshot?.packageName || 'Standard',
        selectedHotelId: customizations.selectedHotelId || null,
        selectedRoomType: customizations.selectedRoomType || '',
        numberOfRooms: customizations.numberOfRooms || 1,
        selectedGuideId: customizations.selectedGuideId || null,
        mealType:
          results.packageSnapshot?.packageName === 'Premium'
            ? customizations.selectedMealType || 'Vegetarian'
            : 'None',
        customizations,
        routeData: {
          distanceKm: totalDistanceKmNumeric,
          distanceText: totalDistance,
          durationText: totalDuration
        },
        currency
      };

      await api.post('/planner/plan', payload);
      setSavedNotice(
        `Your ${results.packageSnapshot?.packageName} Package itinerary has been saved to your profile with full LKR pricing!`
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save itinerary');
    } finally {
      setSavingPlan(false);
    }
  };

  const currentCost = calculatePackageCost(activePackage, formData.days, formData.travelers, {
    ...customizations,
    vehicleType: formData.vehicleType
  });

  const displayTotalLKR =
    backendPricing?.summary?.totalEstimatedCostLKR || currentCost.grandTotalLKR;
  const displayPerPersonLKR =
    backendPricing?.summary?.costPerPersonLKR || currentCost.perPersonLKR;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-8 text-white text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-300 bg-blue-800/60 px-3.5 py-1 rounded-full border border-blue-400/30">
            Intelligent Tour Planner • Currency: {currency}
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-2 mb-2">
            Smart Ceylon Journey Planner
          </h1>
          <p className="text-blue-100 text-sm max-w-xl mx-auto">
            Design your ideal holiday combining custom packages, interactive route mapping, dynamic LKR pricing, and multi-currency conversion.
          </p>
        </div>

        <div className="p-6 md:p-10">
          {!results ? (
            <div className="space-y-8">
              {/* Stepper Wizard Indicator */}
              <div className="flex justify-between items-center relative max-w-2xl mx-auto mb-10">
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 z-0"></div>
                <div
                  className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-blue-600 z-0 transition-all duration-300"
                  style={{ width: `${(step - 1) * 33.33}%` }}
                ></div>

                {[
                  { num: 1, label: 'Package & Stays' },
                  { num: 2, label: 'Interests & Dining' },
                  { num: 3, label: 'Transport & Guide' },
                  { num: 4, label: 'Investment & Review' }
                ].map((s) => (
                  <div key={s.num} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                        step >= s.num
                          ? 'bg-blue-600 text-white shadow-md ring-4 ring-blue-100'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {s.num}
                    </div>
                    <span className="text-xs font-semibold text-gray-500 mt-1 hidden sm:block">
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* STEP 1: PACKAGE SELECTOR, ACCOMMODATION & TRIP BASICS */}
              {step === 1 && (
                <div className="space-y-8 animate-fadeIn">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          1. Select Your Tour Package
                        </h2>
                        <p className="text-sm text-gray-500">
                          Each package tier defines your travel facilities and inclusion rules.
                        </p>
                      </div>
                      {activePackage && (
                        <span className="text-xs font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                          Active: {activePackage.packageName}
                        </span>
                      )}
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      {availablePackages.map((pkg) => {
                        const isSelected =
                          activePackage && activePackage.packageName === pkg.packageName;
                        return (
                          <div
                            key={pkg._id}
                            onClick={() => selectPackage(pkg)}
                            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-100'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100/60 px-2.5 py-0.5 rounded-full">
                                {pkg.badge || pkg.packageName}
                              </span>
                              {isSelected && <Check size={18} className="text-blue-600" />}
                            </div>

                            <h3 className="text-lg font-bold text-gray-900">
                              {pkg.packageName} Package
                            </h3>
                            <div className="text-2xl font-extrabold text-gray-900 my-1">
                              {formatPrice(pkg.baseChargeLKR || pkg.baseCharge)}{' '}
                              <span className="text-xs font-normal text-gray-500">/ person/day</span>
                            </div>

                            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                              {pkg.description}
                            </p>

                            <div className="space-y-1 text-xs pt-2 border-t border-gray-100">
                              <div className="flex items-center text-gray-700">
                                <Car size={13} className="text-blue-600 mr-1.5 flex-shrink-0" />
                                <span>Transport: Motorcycle / Car / Van</span>
                              </div>
                              <div className="flex items-center text-gray-700">
                                <Home
                                  size={13}
                                  className={
                                    pkg.packageName === 'Basic'
                                      ? 'text-gray-400 mr-1.5 flex-shrink-0'
                                      : 'text-blue-600 mr-1.5 flex-shrink-0'
                                  }
                                />
                                <span
                                  className={
                                    pkg.packageName === 'Basic' ? 'text-gray-400' : 'font-medium'
                                  }
                                >
                                  Stays: {pkg.packageName === 'Basic' ? 'Excluded' : 'Included'}
                                </span>
                              </div>
                              <div className="flex items-center text-gray-700">
                                <Utensils
                                  size={13}
                                  className={
                                    pkg.packageName === 'Premium'
                                      ? 'text-green-600 mr-1.5 flex-shrink-0'
                                      : 'text-gray-400 mr-1.5 flex-shrink-0'
                                  }
                                />
                                <span
                                  className={
                                    pkg.packageName === 'Premium'
                                      ? 'text-green-700 font-bold'
                                      : 'text-gray-400'
                                  }
                                >
                                  Meals:{' '}
                                  {pkg.packageName === 'Premium'
                                    ? 'Included (Choice)'
                                    : 'Excluded by default'}
                                </span>
                              </div>
                              <div className="flex items-center text-gray-700">
                                <Compass
                                  size={13}
                                  className={
                                    pkg.packageName === 'Premium'
                                      ? 'text-purple-600 mr-1.5 flex-shrink-0'
                                      : pkg.packageName === 'Standard'
                                      ? 'text-blue-600 mr-1.5 flex-shrink-0'
                                      : 'text-gray-400 mr-1.5 flex-shrink-0'
                                  }
                                />
                                <span>
                                  Guide:{' '}
                                  {pkg.packageName === 'Premium'
                                    ? 'Included (Specialist)'
                                    : pkg.packageName === 'Standard'
                                    ? 'Optional Add-on'
                                    : 'Excluded'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Partner Hotel Selector for Standard & Premium */}
                  {activePackage?.packageName !== 'Basic' && partnerHotels.length > 0 && (
                    <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
                      <h4 className="font-bold text-sm text-blue-950 flex items-center gap-2">
                        <Home size={16} className="text-blue-600" />
                        Select Partner Hotel for Accommodation Cost Calculation
                      </h4>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Partner Hotel Property
                          </label>
                          <select
                            value={customizations.selectedHotelId || ''}
                            onChange={(e) => {
                              const hotelObj = partnerHotels.find((h) => h._id === e.target.value);
                              updateCustomizations({
                                selectedHotelId: e.target.value,
                                selectedHotelRateLKR: hotelObj?.pricePerNightLKR || null,
                                selectedRoomType: hotelObj?.rooms?.[0]?.type || ''
                              });
                            }}
                            className="w-full p-2.5 border border-gray-300 rounded-xl bg-white text-xs font-semibold"
                          >
                            <option value="">
                              -- Default {activePackage?.packageName} Tier Hotel Estimate (
                              {formatPrice(activePackage?.packageName === 'Premium' ? 63000 : 36000)}
                              /night) --
                            </option>
                            {partnerHotels.map((h) => (
                              <option key={h._id} value={h._id}>
                                {h.name} ({h.location}) —{' '}
                                {formatPrice(h.pricePerNightLKR || h.pricePerNight)}/night
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
                            value={customizations.numberOfRooms || 1}
                            onChange={(e) =>
                              updateCustomizations({
                                numberOfRooms: Math.max(1, parseInt(e.target.value) || 1)
                              })
                            }
                            className="w-full p-2.5 border border-gray-300 rounded-xl bg-white text-xs font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trip Basics Inputs */}
                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Trip Duration &amp; Party Size
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Duration (Days)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-900"
                          value={formData.days}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              days: Math.max(1, parseInt(e.target.value) || 1)
                            })
                          }
                        />
                        <span className="text-xs text-gray-500 mt-1 block">
                          Number of days to tour Sri Lanka
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Number of Travelers
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-900"
                          value={formData.travelers}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              travelers: Math.max(1, parseInt(e.target.value) || 1)
                            })
                          }
                        />
                        <span className="text-xs text-gray-500 mt-1 block">
                          Adults and accompanied guests
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: INTERESTS & DINING RULES */}
              {step === 2 && (
                <div className="space-y-8 animate-fadeIn">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                      2. Destinations of Interest
                    </h2>
                    <p className="text-sm text-gray-500">
                      Pick the travel categories that appeal to you:
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">
                      {['Cultural', 'Mountain', 'Beach', 'Wildlife', 'Forest'].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleInterest(cat)}
                          className={`p-3.5 rounded-xl border-2 font-bold text-sm transition-all flex flex-col items-center justify-center gap-1.5 ${
                            formData.interests.includes(cat)
                              ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm'
                              : 'border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <span>{cat}</span>
                          {formData.interests.includes(cat) && (
                            <Check size={14} className="text-blue-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* FOOD & DINING SECTION - RULE SPECIFIC */}
                  <div className="pt-6 border-t border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <Utensils size={20} className="text-blue-600" />
                      Food and Meal Services
                    </h3>

                    {activePackage?.packageName === 'Basic' && (
                      <div className="bg-amber-50/70 border border-amber-200 p-5 rounded-2xl flex items-start gap-3">
                        <AlertCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
                        <div>
                          <h4 className="font-bold text-amber-900 text-sm">
                            Meals are NOT included in the Basic Package (Rs. 0 Meal Charge)
                          </h4>
                          <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">
                            The Basic Package focuses strictly on route planning and transport. Tourists arrange all meals independently.
                          </p>
                        </div>
                      </div>
                    )}

                    {activePackage?.packageName === 'Standard' && (
                      <div className="bg-blue-50/70 border border-blue-200 p-5 rounded-2xl flex items-start gap-3">
                        <Info className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
                        <div>
                          <h4 className="font-bold text-blue-900 text-sm">
                            Food &amp; Meals are Excluded by Default (Rs. 0 Meal Charge)
                          </h4>
                          <p className="text-xs text-blue-800/80 mt-1 leading-relaxed">
                            The Standard Package covers hotel accommodation and transport without charging for unincluded meals.
                          </p>
                        </div>
                      </div>
                    )}

                    {activePackage?.packageName === 'Premium' && (
                      <div className="space-y-4">
                        <div className="bg-purple-50/60 border border-purple-200 p-4 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="text-purple-600" size={18} />
                            <span className="text-xs font-bold text-purple-900">
                              Premium Rule: Choose your meal type (Vegetarian, Vegan, Seafood, All meat types)
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-purple-700">
                            Full-Board Dining Included
                          </span>
                        </div>

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
                              onClick={() => updateCustomizations({ selectedMealType: m.type })}
                              className={`p-3 rounded-xl border-2 text-left transition ${
                                (customizations.selectedMealType || 'Vegetarian') === m.type
                                  ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold'
                                  : 'border-gray-200 bg-white text-gray-700'
                              }`}
                            >
                              <span className="block text-xs font-bold">{m.type}</span>
                              <span className="block text-[11px] text-purple-700">
                                {formatPrice(m.rateLKR, { normalizeLegacy: false })}/pax/day
                              </span>
                            </button>
                          ))}
                        </div>

                        <div className="grid md:grid-cols-2 gap-3">
                          {activePackage.mealOptions?.map((meal, idx) => {
                            const isSelected = customizations.selectedMealOption === meal.name;
                            const extraLKR = meal.extraCostPerDayLKR ?? meal.extraCostPerDay ?? 0;
                            return (
                              <div
                                key={idx}
                                onClick={() =>
                                  updateCustomizations({
                                    selectedMealOption: meal.name,
                                    ...(meal.mealType ? { selectedMealType: meal.mealType } : {})
                                  })
                                }
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-purple-600 bg-white shadow-md'
                                    : 'border-gray-200 bg-gray-50/50 hover:border-purple-300'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <label className="font-bold text-sm text-gray-900 cursor-pointer flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name="plannerMealOption"
                                      checked={isSelected}
                                      onChange={() =>
                                        updateCustomizations({ selectedMealOption: meal.name })
                                      }
                                      className="text-purple-600 focus:ring-purple-500"
                                    />
                                    {meal.name}
                                  </label>
                                  <span
                                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                      extraLKR > 0
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-green-100 text-green-800'
                                    }`}
                                  >
                                    {extraLKR > 0
                                      ? `+${formatPrice(extraLKR)}/day`
                                      : 'Included'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 ml-5">{meal.description}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: TRANSPORT & TOUR GUIDE SELECTION */}
              {step === 3 && (
                <div className="space-y-8 animate-fadeIn">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                      3. Transport &amp; Guide Arrangements
                    </h2>
                    <p className="text-sm text-gray-500">
                      Configure your vehicle type (Motorcycle, Car, Van) and tour guide according to package rules:
                    </p>

                    <div className="grid md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Transportation Vehicle Type
                        </label>
                        <select
                          className="w-full p-3.5 border border-gray-300 rounded-xl font-medium bg-white"
                          value={formData.vehicleType}
                          onChange={(e) => {
                            setFormData({ ...formData, vehicleType: e.target.value });
                            updateCustomizations({ vehicleType: e.target.value });
                          }}
                        >
                          <option value="Motorcycle">
                            Motorcycle / Touring Scooter (1–2 pax • {formatPrice(6500, { normalizeLegacy: false })}/day)
                          </option>
                          <option value="Car">
                            Sedan Car with Chauffeur (1–3 pax • {formatPrice(15000, { normalizeLegacy: false })}/day)
                          </option>
                          <option value="Van">
                            KDH Passenger Van with Chauffeur (4–8 pax • {formatPrice(24000, { normalizeLegacy: false })}/day)
                          </option>
                          <option value="Bus">
                            Mini-Coach (9+ pax • {formatPrice(36000, { normalizeLegacy: false })}/day)
                          </option>
                        </select>
                        <span className="text-xs text-gray-500 mt-1 block">
                          Vehicle capacity and route distance automatically scale transportation costs.
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Weather Preference
                        </label>
                        <select
                          className="w-full p-3.5 border border-gray-300 rounded-xl font-medium bg-white"
                          value={formData.weatherPreference}
                          onChange={(e) =>
                            setFormData({ ...formData, weatherPreference: e.target.value })
                          }
                        >
                          <option value="Any">Any Weather</option>
                          <option value="Hot">Tropical / Warm Beaches &amp; Heritage</option>
                          <option value="Cold">Cool Mountain Highlands (Nuwara Eliya / Ella)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* TOUR GUIDE RULES PER PACKAGE */}
                  <div className="pt-6 border-t border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Compass size={20} className="text-blue-600" />
                      Tour Guide Arrangements
                    </h3>

                    {activePackage?.packageName === 'Basic' && (
                      <div className="bg-amber-50/70 border border-amber-200 p-5 rounded-2xl flex items-start gap-3">
                        <AlertCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
                        <div>
                          <h4 className="font-bold text-amber-900 text-sm">
                            Tour Guide NOT Included in Basic Package
                          </h4>
                          <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">
                            The Basic Package provides transportation only without guided commentary.
                          </p>
                        </div>
                      </div>
                    )}

                    {activePackage?.packageName === 'Standard' && (
                      <div className="bg-blue-50/80 border border-blue-200 p-6 rounded-2xl space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-800 bg-blue-200/70 px-2.5 py-0.5 rounded-full">
                              Standard Package Rule
                            </span>
                            <h4 className="text-lg font-bold text-blue-950 mt-1">
                              Tour Guide is Optional
                            </h4>
                            <p className="text-xs text-blue-800/80 mt-1 max-w-xl">
                              Add a licensed national tour guide to your Standard Package itinerary.
                            </p>
                          </div>

                          <label className="flex items-center gap-3 cursor-pointer bg-white px-5 py-3 rounded-xl border border-blue-300 shadow-sm hover:border-blue-500 transition-colors">
                            <input
                              type="checkbox"
                              checked={customizations.addGuide}
                              onChange={(e) =>
                                updateCustomizations({ addGuide: e.target.checked })
                              }
                              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                            />
                            <div>
                              <span className="block font-bold text-sm text-gray-900">
                                Add Tour Guide
                              </span>
                              <span className="text-xs text-blue-700 font-semibold">
                                +
                                {formatPrice(
                                  activePackage.guideAddonPriceLKR ||
                                    activePackage.guideAddonPrice ||
                                    13500
                                )}{' '}
                                / day
                              </span>
                            </div>
                          </label>
                        </div>

                        {customizations.addGuide && partnerGuides.length > 0 && (
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">
                              Select Registered Guide from Database (Optional)
                            </label>
                            <select
                              value={customizations.selectedGuideId || ''}
                              onChange={(e) => {
                                const gObj = partnerGuides.find((g) => g._id === e.target.value);
                                updateCustomizations({
                                  selectedGuideId: e.target.value,
                                  selectedGuideRateLKR: gObj?.dailyRateLKR || null
                                });
                              }}
                              className="w-full p-2.5 border border-blue-200 rounded-xl bg-white text-xs font-semibold"
                            >
                              <option value="">
                                -- Standard Package Guide Allocation ({formatPrice(13500)}/day) --
                              </option>
                              {partnerGuides.map((g) => (
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

                    {activePackage?.packageName === 'Premium' && (
                      <div className="space-y-4">
                        <div className="bg-purple-50/60 border border-purple-200 p-4 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="text-purple-600" size={18} />
                            <span className="text-xs font-bold text-purple-900">
                              Premium Rule: Select your preferred specialist tour guide
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-purple-700">
                            Dedicated Guide Included
                          </span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-3">
                          {activePackage.guideOptions?.map((guide, idx) => {
                            const isSelected = customizations.selectedGuideOption === guide.name;
                            return (
                              <div
                                key={idx}
                                onClick={() =>
                                  updateCustomizations({
                                    selectedGuideOption: guide.name,
                                    selectedGuideId: ''
                                  })
                                }
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-purple-600 bg-white shadow-md'
                                    : 'border-gray-200 bg-gray-50/50 hover:border-purple-300'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <label className="font-bold text-sm text-gray-900 cursor-pointer flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name="plannerGuideOption"
                                      checked={isSelected}
                                      onChange={() =>
                                        updateCustomizations({ selectedGuideOption: guide.name })
                                      }
                                      className="text-purple-600 focus:ring-purple-500"
                                    />
                                    {guide.name}
                                  </label>
                                  <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                    Included
                                  </span>
                                </div>
                                <p className="text-xs text-purple-900/80 font-medium ml-5 mb-1">
                                  {guide.specialty}
                                </p>
                                <p className="text-xs text-gray-500 ml-5">
                                  Languages: {guide.languages?.join(', ')}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW & LIVE ESTIMATED COST BREAKDOWN */}
              {step === 4 && (
                <div className="space-y-8 animate-fadeIn">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                      4. Review &amp; Investment Breakdown ({currency})
                    </h2>
                    <p className="text-sm text-gray-500">
                      Verify your tour configuration and itemized dynamic cost calculation before generating your personalized route.
                    </p>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                          {activePackage?.packageName} Package Tier
                        </span>
                        <h3 className="text-xl font-extrabold text-gray-900 mt-1">
                          {activePackage?.packageName} Experience
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">Duration &amp; Party</span>
                        <span className="text-sm font-bold text-gray-900">
                          {formData.days} Days • {formData.travelers} Travelers
                        </span>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-start gap-2.5">
                        <Car size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="block text-gray-900">Transport:</strong>
                          <span className="text-gray-600 text-xs">
                            {backendPricing?.breakdown?.transportation?.vehicleLabel ||
                              `Dedicated ${formData.vehicleType}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <Home
                          size={18}
                          className={
                            activePackage?.packageName === 'Basic'
                              ? 'text-gray-400 mt-0.5 flex-shrink-0'
                              : 'text-blue-600 mt-0.5 flex-shrink-0'
                          }
                        />
                        <div>
                          <strong className="block text-gray-900">Accommodation:</strong>
                          <span className="text-gray-600 text-xs">
                            {backendPricing?.breakdown?.accommodation?.hotelName ||
                              (activePackage?.packageName === 'Basic'
                                ? 'Not Included (Self-arranged)'
                                : 'Partner Hotel Included')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <Utensils
                          size={18}
                          className={
                            activePackage?.packageName === 'Premium'
                              ? 'text-green-600 mt-0.5 flex-shrink-0'
                              : 'text-gray-400 mt-0.5 flex-shrink-0'
                          }
                        />
                        <div>
                          <strong className="block text-gray-900">Food &amp; Meals:</strong>
                          <span className="text-gray-600 text-xs">
                            {activePackage?.packageName === 'Premium'
                              ? `Included (${customizations.selectedMealType || 'Vegetarian'}): ${customizations.selectedMealOption}`
                              : 'Excluded by default (Rs. 0 meal charge)'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <Compass
                          size={18}
                          className={
                            activePackage?.packageName === 'Premium' || customizations.addGuide
                              ? 'text-purple-600 mt-0.5 flex-shrink-0'
                              : 'text-gray-400 mt-0.5 flex-shrink-0'
                          }
                        />
                        <div>
                          <strong className="block text-gray-900">Tour Guide:</strong>
                          <span className="text-gray-600 text-xs">
                            {backendPricing?.breakdown?.guide?.guideName || 'Not Included'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Itemized Cost Breakdown Table */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Calculator size={18} className="text-green-600" />
                      Complete Dynamic Cost Breakdown ({currency})
                    </h4>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-1.5 border-b border-gray-100">
                        <span className="text-gray-600">
                          {backendPricing?.breakdown?.packageCoordination?.breakdownText ||
                            `Package Planning & Non-Food Facilities (${formData.days}d × ${formData.travelers} pax)`}
                        </span>
                        <span className="font-bold text-gray-900">
                          {formatPrice(
                            backendPricing?.breakdown?.packageCoordination?.totalLKR ||
                              currentCost.coordinationLKR,
                            { normalizeLegacy: false }
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between py-1.5 border-b border-gray-100">
                        <span className="text-gray-600">
                          {backendPricing?.breakdown?.transportation?.breakdownText ||
                            `Transportation (${formData.vehicleType})`}
                        </span>
                        <span className="font-bold text-gray-900">
                          {formatPrice(
                            backendPricing?.breakdown?.transportation?.totalLKR ||
                              currentCost.transportLKR,
                            { normalizeLegacy: false }
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between py-1.5 border-b border-gray-100">
                        <span className="text-gray-600">
                          {backendPricing?.breakdown?.accommodation?.breakdownText ||
                            'Accommodation Charges'}
                        </span>
                        <span className="font-bold text-gray-900">
                          {formatPrice(
                            backendPricing?.breakdown?.accommodation?.totalLKR ||
                              currentCost.accommodationLKR,
                            { normalizeLegacy: false }
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between py-1.5 border-b border-gray-100">
                        <span className="text-gray-600">
                          {backendPricing?.breakdown?.meals?.breakdownText || 'Food & Meal Charges'}
                        </span>
                        <span className="font-bold text-gray-900">
                          {formatPrice(
                            backendPricing?.breakdown?.meals?.totalLKR || currentCost.mealCostLKR,
                            { normalizeLegacy: false }
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between py-1.5 border-b border-gray-100">
                        <span className="text-gray-600">
                          {backendPricing?.breakdown?.guide?.breakdownText || 'Tour Guide Charges'}
                        </span>
                        <span className="font-bold text-gray-900">
                          {formatPrice(
                            backendPricing?.breakdown?.guide?.totalLKR || currentCost.guideCostLKR,
                            { normalizeLegacy: false }
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between pt-3 text-lg font-extrabold text-gray-900">
                        <div>
                          <span>Total Estimated Cost ({currency}):</span>
                          <span className="block text-xs font-normal text-gray-500">
                            Cost Per Person:{' '}
                            {formatPrice(displayPerPersonLKR, { normalizeLegacy: false })}
                            {currency !== 'LKR' &&
                              ` • Stored Base: Rs. ${Math.round(displayTotalLKR).toLocaleString('en-US')}`}
                          </span>
                        </div>
                        <span className="text-2xl text-green-600 font-extrabold">
                          {formatPrice(displayTotalLKR, { normalizeLegacy: false })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Wizard Nav Buttons */}
              <div className="flex justify-between pt-6 border-t border-gray-100">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold text-sm transition"
                  >
                    Back
                  </button>
                ) : (
                  <div></div>
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-7 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-bold text-sm shadow-md transition"
                  >
                    Next Step &rarr;
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-xl text-white font-bold text-base shadow-lg transition flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Generating Itinerary...
                      </>
                    ) : (
                      'Generate Complete Plan ✓'
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* FINAL RESULTS VIEW */
            <div className="space-y-8 animate-fadeIn">
              {/* Trip Summary Card */}
              <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-500/40 text-blue-200 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-blue-400/30">
                      {results.packageSnapshot?.packageName} Package
                    </span>
                    <span className="text-xs text-blue-200">
                      {formData.days} Days • {formData.travelers} Travelers
                    </span>
                  </div>
                  <h2 className="text-3xl font-extrabold">Your Personalized Sri Lankan Tour</h2>
                  <p className="text-blue-200 text-sm mt-1">
                    Route planned with GPS-enabled coordinates, dynamic LKR pricing, and multi-currency conversion.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 text-center md:text-right min-w-[220px]">
                  <span className="text-xs uppercase tracking-wider text-blue-200 font-semibold block">
                    Total Estimated Cost ({currency})
                  </span>
                  <div className="text-4xl font-extrabold text-green-400 my-1">
                    {formatPrice(results.estimatedCostLKR, { normalizeLegacy: false })}
                  </div>
                  {currency !== 'LKR' && (
                    <span className="text-xs text-blue-200 block">
                      Base Stored Price: Rs. {Math.round(results.estimatedCostLKR).toLocaleString('en-US')}
                    </span>
                  )}
                </div>
              </div>

              {/* Package Configuration Confirmation Box */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                  <ShieldCheck size={20} className="text-green-600" />
                  Confirmed Package Rules &amp; Inclusions
                </h3>

                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold mb-1">
                      <Car size={15} /> Transport
                    </div>
                    <p className="text-gray-700 font-medium">
                      Dedicated {formData.vehicleType} with Chauffeur
                    </p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold mb-1">
                      <Home size={15} /> Accommodation
                    </div>
                    <p className="text-gray-700 font-medium">
                      {results.backendPricing?.breakdown?.accommodation?.hotelName ||
                        (results.packageSnapshot?.packageName === 'Basic'
                          ? 'Excluded (Self-arranged)'
                          : 'Included Partner Hotel')}
                    </p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-1.5 text-purple-700 font-bold mb-1">
                      <Utensils size={15} /> Food &amp; Meals
                    </div>
                    <p className="text-gray-700 font-medium">
                      {results.packageSnapshot?.packageName === 'Premium'
                        ? `${ results.customizationsSnapshot?.selectedMealType || 'Vegetarian' } (${ results.customizationsSnapshot?.selectedMealOption })`
                        : 'Excluded by default (Rs. 0)'}
                    </p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-1.5 text-indigo-700 font-bold mb-1">
                      <Compass size={15} /> Tour Guide
                    </div>
                    <p className="text-gray-700 font-medium">
                      {results.backendPricing?.breakdown?.guide?.guideName || 'None (Self-guided)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mapped Itinerary */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 border-b pb-2">
                  Your Interactive Map Route
                </h3>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative z-0">
                  <MapView
                    destinations={results.destinations}
                    routeCoordinates={routeCoordinates}
                  />
                </div>
                {totalDistance && (
                  <div className="flex flex-wrap gap-6 p-4 bg-blue-50 rounded-xl text-sm border border-blue-100">
                    <div className="text-blue-900">
                      <strong>Total Driving Distance:</strong> {totalDistance}
                    </div>
                    <div className="text-blue-900">
                      <strong>Estimated Road Duration:</strong> {totalDuration}
                    </div>
                  </div>
                )}
              </div>

              {/* Daily Destination Itinerary */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 border-b pb-2">
                  Destinations on Your Schedule
                </h3>
                {results.destinations.length === 0 ? (
                  <p className="text-gray-500 py-4">
                    No destinations matched your criteria entirely, but our tour operators can customize a plan for you!
                  </p>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.destinations.map((dest, idx) => (
                      <div key={dest._id} className="relative">
                        <div className="absolute top-2 left-2 z-20 bg-blue-900 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow">
                          Day {idx + 1}
                        </div>
                        <DestinationCard destination={dest} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {savedNotice && (
                <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-bold flex items-center gap-2">
                  <Check size={16} className="text-green-600" />
                  {savedNotice}
                </div>
              )}

              {/* Footer Actions */}
              <div className="pt-6 border-t border-gray-200 flex flex-wrap gap-4 justify-between items-center">
                <button
                  onClick={() => setResults(null)}
                  className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold text-sm transition"
                >
                  &larr; Modify Plan Preferences
                </button>

                <button
                  onClick={handleSavePlanToDatabase}
                  disabled={savingPlan}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition text-sm"
                >
                  {savingPlan ? 'Saving Itinerary...' : 'Save Itinerary & Pricing to Profile'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Planner;
