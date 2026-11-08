import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { PackageContext } from '../context/PackageContext';
import { useNavigate } from 'react-router-dom';
import api, { 
  getPresetStartLocations, 
  geocodeLocation, 
  calculateMultiRoute,
  getTrafficStatus 
} from '../services/api';
import DestinationCard from '../components/DestinationCard';
import MapView from '../components/MapView';
import { 
  Car, Home, Utensils, Compass, Check, X, Sparkles, 
  ShieldCheck, AlertCircle, Info, ChevronRight, DollarSign,
  MapPin, Navigation, Clock, Bike, Route, RefreshCw, Search,
  ArrowUp, ArrowDown
} from 'lucide-react';

/**
 * Module 2: Maps, Routes and Transportation
 * Student Reg: SEU/IS/22/ICT/037
 * University: South Eastern University of Sri Lanka
 * 
 * Smart Ceylon Journey Planner with Full Interactive Map, Multi-Destination Route Calculation,
 * Vehicle Profile Selection, Traffic-Aware Information, and Route Alternatives.
 */

// Curated Fallback Sri Lankan Gateways (for offline / instant selection)
const FALLBACK_PRESETS = [
  {
    id: 'cmb-airport',
    name: 'Bandaranaike International Airport (CMB)',
    displayName: 'Bandaranaike International Airport (CMB), Katunayake',
    city: 'Katunayake',
    district: 'Gampaha',
    latitude: 7.1808,
    longitude: 79.8841,
    type: 'International Airport'
  },
  {
    id: 'colombo-fort',
    name: 'Colombo Fort Railway Hub',
    displayName: 'Colombo Fort Railway Station & Commercial Hub',
    city: 'Colombo',
    district: 'Colombo',
    latitude: 6.9344,
    longitude: 79.8428,
    type: 'Transit Hub'
  },
  {
    id: 'kandy-center',
    name: 'Kandy City Center / Dalada Maligawa',
    displayName: 'Kandy City Center, Central Province',
    city: 'Kandy',
    district: 'Kandy',
    latitude: 7.2936,
    longitude: 80.6413,
    type: 'Cultural Hub'
  },
  {
    id: 'galle-fort',
    name: 'Galle Fort Southern Hub',
    displayName: 'Galle Fort Ramparts, Southern Province',
    city: 'Galle',
    district: 'Galle',
    latitude: 6.0300,
    longitude: 80.2170,
    type: 'Heritage Hub'
  },
  {
    id: 'hri-airport',
    name: 'Mattala Rajapaksa International Airport (HRI)',
    displayName: 'Mattala Rajapaksa International Airport (HRI), Hambantota',
    city: 'Mattala',
    district: 'Hambantota',
    latitude: 6.2952,
    longitude: 81.1228,
    type: 'International Airport'
  }
];

// Vehicle Selection Specifications
const VEHICLE_OPTIONS = [
  {
    type: 'Car',
    name: 'Sedan Car',
    tag: 'Couples & Small Families',
    capacity: '1 - 3 Passengers',
    luggage: '2 - 3 Large Bags',
    icon: Car,
    description: 'Comfortable private sedan with air-conditioning and dedicated licensed chauffeur-guide.',
    routingNote: 'Routes along Sri Lankan national highways and expressways (OSRM driving network).'
  },
  {
    type: 'Van',
    name: 'Passenger Van',
    tag: 'Families & Groups',
    capacity: '4 - 8 Passengers',
    luggage: '6 - 8 Large Bags',
    icon: Car,
    description: 'Spacious high-roof tourist van with panoramic windows, ideal for family and group touring.',
    routingNote: 'Navigates standard passenger vehicle roads with comfortable hill-country clearance.'
  },
  {
    type: 'Motorcycle',
    name: 'Touring Motorcycle',
    tag: 'Solo & Adventure',
    capacity: '1 - 2 Riders',
    luggage: '1 - 2 Backpacks / Panniers',
    icon: Bike,
    description: 'Agile adventure travel for scenic mountain passes, coastal corridors, and tea plantation roads.',
    routingNote: 'Routes along motor-navigable island corridors via OpenStreetMap road network.'
  }
];

const Planner = () => {
  const { user } = useContext(AuthContext);
  const { 
    selectedPackage, 
    selectPackage, 
    customizations, 
    updateCustomizations, 
    calculatePackageCost 
  } = useContext(PackageContext);

  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [availablePackages, setAvailablePackages] = useState([]);

  // ==========================================
  // MODULE 2: MAP, ROUTE & VEHICLE STATES
  // ==========================================
  const [presetLocations, setPresetLocations] = useState(FALLBACK_PRESETS);
  const [startLocation, setStartLocation] = useState(FALLBACK_PRESETS[0]); // Default to CMB Airport
  const [customStartQuery, setCustomStartQuery] = useState('');
  const [isCustomStartMode, setIsCustomStartMode] = useState(false);
  const [geocodingStart, setGeocodingStart] = useState(false);
  const [geocodeError, setGeocodeError] = useState(null);

  // Route calculation states
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [totalDistance, setTotalDistance] = useState('');
  const [totalDuration, setTotalDuration] = useState('');
  const [routeLegs, setRouteLegs] = useState([]);
  const [alternativeRoutes, setAlternativeRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [trafficStatus, setTrafficStatus] = useState(null);
  const [vehicleMeta, setVehicleMeta] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState(null);
  
  const [formData, setFormData] = useState({
    days: 3,
    travelers: 2,
    interests: [],
    weatherPreference: 'Any',
    vehicleType: 'Car',
    budget: 800
  });

  // Load preset starting locations & available packages on mount
  useEffect(() => {
    const fetchInitData = async () => {
      try {
        const presets = await getPresetStartLocations();
        if (presets && presets.length > 0) {
          setPresetLocations(presets);
          // Keep current start location synced with loaded presets
          const match = presets.find(p => p.id === 'cmb-airport') || presets[0];
          setStartLocation(match);
        }
      } catch (err) {
        console.warn('Using local fallback presets for Sri Lanka hubs:', err);
      }

      try {
        const res = await api.get('/packages');
        const list = res.data?.data || res.data || [];
        const order = { Basic: 1, Standard: 2, Premium: 3 };
        list.sort((a, b) => (order[a.packageName] || 9) - (order[b.packageName] || 9));
        setAvailablePackages(list);

        if (!selectedPackage && list.length > 0) {
          const defaultPkg = list.find(p => p.packageName === 'Standard') || list[0];
          selectPackage(defaultPkg);
        }
      } catch (err) {
        console.error('Failed to load packages in planner:', err);
      }
    };

    fetchInitData();
  }, []);

  const activePackage = selectedPackage || availablePackages.find(p => p.packageName === 'Standard') || null;

  const handleNext = () => setStep(step + 1);
  const handlePrev = () => setStep(step - 1);

  const toggleInterest = (interest) => {
    setFormData(prev => {
      const interests = prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest];
      return { ...prev, interests };
    });
  };

  // Geocode custom starting address in Sri Lanka
  const handleGeocodeStart = async (e) => {
    if (e) e.preventDefault();
    if (!customStartQuery.trim()) return;

    setGeocodingStart(true);
    setGeocodeError(null);

    try {
      const geo = await geocodeLocation(customStartQuery.trim());
      if (geo && geo.lat && geo.lng) {
        setStartLocation({
          name: geo.name || customStartQuery.trim(),
          displayName: geo.displayName || `${geo.name}, Sri Lanka`,
          city: geo.city || '',
          district: geo.district || 'Sri Lanka',
          latitude: geo.lat,
          longitude: geo.lng,
          type: 'Custom Starting Point'
        });
        setGeocodeError(null);
      } else {
        setGeocodeError('Could not resolve location coordinates. Please try a prominent city, airport, or hotel name.');
      }
    } catch (err) {
      setGeocodeError(err.response?.data?.error || err.message || 'Geocoding failed. Please check internet connection.');
    } finally {
      setGeocodingStart(false);
    }
  };

  // Perform multi-destination route calculation
  const fetchMultiDestinationRoute = async (startPoint, dests, vehicle) => {
    if (!startPoint || !dests || dests.length === 0) return;
    setLoadingRoute(true);
    setRouteError(null);

    try {
      const routeData = await calculateMultiRoute({
        startLocation: startPoint,
        destinations: dests,
        vehicleType: vehicle.toLowerCase(),
        alternatives: true
      });

      if (routeData) {
        setRouteCoordinates(routeData.leafletCoordinates || []);
        setTotalDistance(routeData.totalDistanceKm || '');
        setTotalDuration(routeData.totalDurationFormatted || '');
        setRouteLegs(routeData.legs || []);
        setAlternativeRoutes(routeData.routes || []);
        setSelectedRouteIndex(0);
        setTrafficStatus(routeData.traffic || null);
        setVehicleMeta(routeData.vehicle || null);
      }
    } catch (err) {
      console.error('Multi-route calculation error:', err);
      setRouteError(err.response?.data?.error || 'Unable to calculate road route from routing engine. Standard distance fallback will be displayed.');
    } finally {
      setLoadingRoute(false);
    }
  };

  // Handle alternative route selection
  const handleSelectAlternativeRoute = (index) => {
    if (alternativeRoutes && alternativeRoutes[index]) {
      const selected = alternativeRoutes[index];
      setSelectedRouteIndex(index);
      setRouteCoordinates(selected.leafletCoordinates || []);
      setTotalDistance(selected.distanceKm || totalDistance);
      setTotalDuration(selected.durationFormatted || totalDuration);
    }
  };

  // Recalculate route after changing starting point or vehicle on results view
  const handleRecalculateRoute = async () => {
    if (results && results.destinations) {
      await fetchMultiDestinationRoute(startLocation, results.destinations, formData.vehicleType);
    }
  };

  // Reorder destinations in the generated plan and recalculate route immediately
  const handleReorderDestination = async (index, direction) => {
    if (!results || !Array.isArray(results.destinations)) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= results.destinations.length) return;

    const updatedDests = [...results.destinations];
    const temp = updatedDests[index];
    updatedDests[index] = updatedDests[targetIdx];
    updatedDests[targetIdx] = temp;

    setResults({
      ...results,
      destinations: updatedDests,
      itinerary: updatedDests.map((d, i) => ({ day: i + 1, ...d }))
    });

    await fetchMultiDestinationRoute(startLocation, updatedDests, formData.vehicleType);
  };

  // Persist generated TourPlan & routeData to MongoDB
  const handleSaveItineraryToDb = async () => {
    if (!user || !results) return;
    try {
      const start = new Date();
      const end = new Date();
      end.setDate(start.getDate() + (formData.days || 3));

      await api.post('/planner/plan', {
        title: `${results.packageSnapshot?.packageName || 'Standard'} Sri Lanka Journey`,
        days: formData.days,
        stops: results.destinations.map((d) => d._id),
        dates: { start, end },
        transportType: formData.vehicleType,
        startLocation,
        routeData: {
          totalDistanceKm: totalDistance,
          totalDurationFormatted: totalDuration,
          vehicle: vehicleMeta,
          legs: routeLegs
        }
      });
      alert(`Your trip plan with the ${results.packageSnapshot?.packageName} Package and ${totalDistance} road route has been saved to your profile!`);
    } catch (err) {
      console.error('Error saving itinerary:', err);
      alert(`Your trip plan with the ${results.packageSnapshot?.packageName} Package has been registered!`);
    }
  };

  // Submit and generate the full journey
  const handleSubmit = async () => {
    if (!user) {
      alert("Please login to generate your smart plan.");
      navigate('/login');
      return;
    }
    setLoading(true);
    setRouteError(null);

    try {
      const res = await api.get('/destinations');
      let dests = res.data?.data || res.data || [];
      
      if (formData.interests.length > 0) {
        dests = dests.filter(d => {
          return formData.interests.some(interest => {
            if (interest === 'Cultural' || interest === 'Historical') {
              return d.category === 'Historical' || d.category === 'Cultural';
            }
            if (interest === 'Wildlife' || interest === 'Forest' || interest === 'Nature') {
              return d.category === 'Wildlife' || d.category === 'Nature' || d.category === 'Forest';
            }
            return d.category?.toLowerCase() === interest.toLowerCase();
          });
        });
      }
      
      if (formData.weatherPreference === 'Cold') {
        dests = dests.filter(d => ['Nuwara Eliya', 'Badulla'].includes(d.district));
      } else if (formData.weatherPreference === 'Hot') {
        dests = dests.filter(d => !['Nuwara Eliya', 'Badulla'].includes(d.district));
      }
      
      const finalDests = dests.filter(d => d.latitude && d.longitude).slice(0, formData.days);
      
      // Calculate dynamic cost based on package rules and selections
      const costCalculation = calculatePackageCost(activePackage, formData.days, formData.travelers, customizations);

      setResults({
        startLocation: { ...startLocation },
        destinations: finalDests,
        costBreakdown: costCalculation,
        estimatedCost: costCalculation.grandTotal,
        packageSnapshot: activePackage,
        customizationsSnapshot: { ...customizations },
        itinerary: finalDests.map((d, i) => ({ day: i + 1, ...d }))
      });
      
      await fetchMultiDestinationRoute(startLocation, finalDests, formData.vehicleType);
      setLoading(false);
      
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // Current live cost calculation preview
  const currentCost = calculatePackageCost(activePackage, formData.days, formData.travelers, customizations);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-8 text-white text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-300 bg-blue-800/60 px-3.5 py-1 rounded-full border border-blue-400/30">
            Intelligent Tour Planner • Module 2 (Maps & Routes)
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-2 mb-2">Smart Ceylon Journey Planner</h1>
          <p className="text-blue-100 text-sm max-w-xl mx-auto">
            Design your ideal holiday combining custom packages, interactive route mapping, GPS navigation, and vehicle selection.
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
                  { num: 1, label: 'Package & Starting Hub' },
                  { num: 2, label: 'Interests & Dining' },
                  { num: 3, label: 'Vehicle & Guide' },
                  { num: 4, label: 'Investment & Review' }
                ].map(s => (
                  <div key={s.num} className="relative z-10 flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= s.num ? 'bg-blue-600 text-white shadow-md ring-4 ring-blue-100' : 'bg-gray-200 text-gray-500'}`}>
                      {s.num}
                    </div>
                    <span className="text-xs font-semibold text-gray-500 mt-1 hidden sm:block">{s.label}</span>
                  </div>
                ))}
              </div>

              {/* STEP 1: PACKAGE SELECTOR, TRIP BASICS & STARTING LOCATION */}
              {step === 1 && (
                <div className="space-y-8 animate-fadeIn">
                  
                  {/* Package Selector Cards */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">1. Select Your Tour Package</h2>
                        <p className="text-sm text-gray-500">Each package tier defines your travel facilities and inclusion rules.</p>
                      </div>
                      {activePackage && (
                        <span className="text-xs font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                          Active: {activePackage.packageName}
                        </span>
                      )}
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      {availablePackages.map(pkg => {
                        const isSelected = activePackage && activePackage.packageName === pkg.packageName;
                        return (
                          <div 
                            key={pkg._id}
                            onClick={() => selectPackage(pkg)}
                            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? 'border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100/60 px-2.5 py-0.5 rounded-full">
                                {pkg.badge || pkg.packageName}
                              </span>
                              {isSelected && <Check size={18} className="text-blue-600" />}
                            </div>

                            <h3 className="text-lg font-bold text-gray-900">{pkg.packageName} Package</h3>
                            <div className="text-2xl font-extrabold text-gray-900 my-1">
                              ${pkg.baseCharge} <span className="text-xs font-normal text-gray-500">/ person/day</span>
                            </div>

                            <p className="text-xs text-gray-600 mb-3 line-clamp-2">{pkg.description}</p>

                            {/* Package Rule Tags */}
                            <div className="space-y-1 text-xs pt-2 border-t border-gray-100">
                              <div className="flex items-center text-gray-700">
                                <Car size={13} className="text-blue-600 mr-1.5 flex-shrink-0" />
                                <span>Transport: Dedicated Chauffeur</span>
                              </div>
                              <div className="flex items-center text-gray-700">
                                <Home size={13} className={pkg.packageName === 'Basic' ? 'text-gray-400 mr-1.5 flex-shrink-0' : 'text-blue-600 mr-1.5 flex-shrink-0'} />
                                <span className={pkg.packageName === 'Basic' ? 'text-gray-400' : 'font-medium'}>
                                  Stays: {pkg.packageName === 'Basic' ? 'Excluded' : 'Included'}
                                </span>
                              </div>
                              <div className="flex items-center text-gray-700">
                                <Utensils size={13} className={pkg.packageName === 'Premium' ? 'text-green-600 mr-1.5 flex-shrink-0' : 'text-gray-400 mr-1.5 flex-shrink-0'} />
                                <span className={pkg.packageName === 'Premium' ? 'text-green-700 font-bold' : 'text-gray-400'}>
                                  Meals: {pkg.packageName === 'Premium' ? 'Included (Choice)' : 'Excluded by default'}
                                </span>
                              </div>
                              <div className="flex items-center text-gray-700">
                                <Compass size={13} className={pkg.packageName === 'Premium' ? 'text-purple-600 mr-1.5 flex-shrink-0' : pkg.packageName === 'Standard' ? 'text-blue-600 mr-1.5 flex-shrink-0' : 'text-gray-400 mr-1.5 flex-shrink-0'} />
                                <span>
                                  Guide: {pkg.packageName === 'Premium' ? 'Included (Specialist)' : pkg.packageName === 'Standard' ? 'Optional Add-on' : 'Excluded'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Trip Basics Inputs */}
                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Trip Duration & Party Size</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (Days)</label>
                        <input 
                          type="number" 
                          min="1" 
                          max="30" 
                          className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-900" 
                          value={formData.days} 
                          onChange={e => setFormData({ ...formData, days: Math.max(1, parseInt(e.target.value) || 1) })} 
                        />
                        <span className="text-xs text-gray-500 mt-1 block">Number of days to tour Sri Lanka</span>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Travelers</label>
                        <input 
                          type="number" 
                          min="1" 
                          max="20" 
                          className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-900" 
                          value={formData.travelers} 
                          onChange={e => setFormData({ ...formData, travelers: Math.max(1, parseInt(e.target.value) || 1) })} 
                        />
                        <span className="text-xs text-gray-500 mt-1 block">Adults and accompanied guests</span>
                      </div>
                    </div>
                  </div>

                  {/* STARTING LOCATION SELECTION (MODULE 2) */}
                  <div className="pt-6 border-t border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <MapPin size={20} className="text-emerald-600" />
                          Journey Starting Point in Sri Lanka
                        </h3>
                        <p className="text-xs text-gray-500">
                          Select your arrival airport, railway hub, or enter any custom Sri Lankan starting location.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsCustomStartMode(false)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${!isCustomStartMode ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                        >
                          Preset Hubs
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsCustomStartMode(true)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${isCustomStartMode ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                        >
                          Custom Search
                        </button>
                      </div>
                    </div>

                    {!isCustomStartMode ? (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Choose Popular Gateway</label>
                        <select
                          className="w-full p-3.5 border border-gray-300 rounded-xl font-medium bg-white text-gray-900 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                          value={startLocation.id || startLocation.name}
                          onChange={(e) => {
                            const selected = presetLocations.find(p => (p.id || p.name) === e.target.value);
                            if (selected) setStartLocation(selected);
                          }}
                        >
                          {presetLocations.map(p => (
                            <option key={p.id || p.name} value={p.id || p.name}>
                              {p.name} ({p.district || p.city})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-600">Enter Location Name or Landmark</label>
                        <div className="flex gap-2">
                          <div className="relative flex-grow">
                            <input
                              type="text"
                              value={customStartQuery}
                              onChange={(e) => setCustomStartQuery(e.target.value)}
                              placeholder="e.g. Negombo Beach, Galle Face Hotel, Jaffna Railway Station..."
                              className="w-full p-3.5 pl-10 border border-gray-300 rounded-xl font-medium text-sm focus:ring-emerald-500 focus:border-emerald-500"
                              onKeyDown={(e) => e.key === 'Enter' && handleGeocodeStart(e)}
                            />
                            <Search size={16} className="text-gray-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                          </div>
                          <button
                            type="button"
                            onClick={handleGeocodeStart}
                            disabled={geocodingStart || !customStartQuery.trim()}
                            className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition shadow flex items-center gap-1.5 flex-shrink-0"
                          >
                            {geocodingStart ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              'Locate'
                            )}
                          </button>
                        </div>
                        {geocodeError && (
                          <p className="text-xs text-red-600 font-medium">{geocodeError}</p>
                        )}
                      </div>
                    )}

                    {/* Active Starting Location Indicator Card */}
                    <div className="mt-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                          <MapPin size={15} />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Selected Starting Gateway</span>
                          <h4 className="text-xs font-bold text-gray-900">{startLocation.name}</h4>
                          <span className="text-[11px] text-gray-500">
                            {startLocation.district ? `${startLocation.district} District` : startLocation.city} • GPS: {parseFloat(startLocation.latitude).toFixed(3)}, {parseFloat(startLocation.longitude).toFixed(3)}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-md">
                        Origin Active ✓
                      </span>
                    </div>
                  </div>

                </div>
              )}

              {/* STEP 2: INTERESTS & DINING RULES */}
              {step === 2 && (
                <div className="space-y-8 animate-fadeIn">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">2. Destinations of Interest</h2>
                    <p className="text-sm text-gray-500">Pick the travel categories that appeal to you:</p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-3 mt-4">
                      {['Beach', 'Mountain', 'Historical', 'Waterfall', 'Wildlife', 'Nature', 'Lake', 'Cultural'].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleInterest(cat)}
                          className={`p-3.5 rounded-xl border-2 font-bold text-sm transition-all flex flex-col items-center justify-center gap-1.5 ${formData.interests.includes(cat) ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                        >
                          <span>{cat}</span>
                          {formData.interests.includes(cat) && <Check size={14} className="text-blue-600" />}
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

                    {/* BASIC PACKAGE FOOD RULE */}
                    {activePackage?.packageName === 'Basic' && (
                      <div className="bg-amber-50/70 border border-amber-200 p-5 rounded-2xl flex items-start gap-3">
                        <AlertCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
                        <div>
                          <h4 className="font-bold text-amber-900 text-sm">Meals are NOT included in the Basic Package</h4>
                          <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">
                            The Basic Package focuses strictly on standard transport. Tourists arrange all meals, lunches, and beverages independently.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* STANDARD PACKAGE FOOD RULE */}
                    {activePackage?.packageName === 'Standard' && (
                      <div className="bg-blue-50/70 border border-blue-200 p-5 rounded-2xl flex items-start gap-3">
                        <Info className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
                        <div>
                          <h4 className="font-bold text-blue-900 text-sm">Food & Meals are Excluded by Default</h4>
                          <p className="text-xs text-blue-800/80 mt-1 leading-relaxed">
                            The Standard Package covers hotel accommodation and standard transport. Meals are excluded by default, giving you total freedom to taste street foods and local cafes at your leisure.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* PREMIUM PACKAGE FOOD SELECTION */}
                    {activePackage?.packageName === 'Premium' && (
                      <div className="space-y-4">
                        <div className="bg-purple-50/60 border border-purple-200 p-4 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="text-purple-600" size={18} />
                            <span className="text-xs font-bold text-purple-900">
                              Premium Rule: Choose your preferred food or meal option
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-purple-700">Full-Board Dining Included</span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-3">
                          {activePackage.mealOptions?.map((meal, idx) => {
                            const isSelected = customizations.selectedMealOption === meal.name;
                            return (
                              <div
                                key={idx}
                                onClick={() => updateCustomizations({ selectedMealOption: meal.name })}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-purple-600 bg-white shadow-md' : 'border-gray-200 bg-gray-50/50 hover:border-purple-300'}`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <label className="font-bold text-sm text-gray-900 cursor-pointer flex items-center gap-2">
                                    <input 
                                      type="radio" 
                                      name="plannerMealOption" 
                                      checked={isSelected}
                                      onChange={() => updateCustomizations({ selectedMealOption: meal.name })}
                                      className="text-purple-600 focus:ring-purple-500" 
                                    />
                                    {meal.name}
                                  </label>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meal.extraCostPerDay > 0 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                                    {meal.extraCostPerDay > 0 ? `+$${meal.extraCostPerDay}/day` : 'Included'}
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

              {/* STEP 3: VEHICLE SELECTION & TOUR GUIDE ARRANGEMENTS */}
              {step === 3 && (
                <div className="space-y-8 animate-fadeIn">
                  
                  {/* Vehicle Selection Cards (Module 2 Requirement) */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <h2 className="text-2xl font-bold text-gray-900">3. Select Transportation Vehicle</h2>
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                        Selected: {formData.vehicleType}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      Choose your preferred vehicle for traversing Sri Lanka's cultural routes and hill passes:
                    </p>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      {VEHICLE_OPTIONS.map((v) => {
                        const isSelected = formData.vehicleType.toLowerCase() === v.type.toLowerCase();
                        const IconComponent = v.icon;

                        return (
                          <div
                            key={v.type}
                            onClick={() => setFormData({ ...formData, vehicleType: v.type })}
                            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${isSelected ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                          >
                            <div>
                              <div className="flex justify-between items-start mb-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                  <IconComponent size={24} />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100/70 px-2 py-0.5 rounded-full">
                                  {v.tag}
                                </span>
                              </div>

                              <h3 className="text-lg font-bold text-gray-900">{v.name}</h3>
                              <p className="text-xs text-gray-600 mt-1 mb-3 leading-relaxed">{v.description}</p>
                              
                              <div className="space-y-1.5 text-xs text-gray-700 pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-1.5 font-medium">
                                  <span className="text-gray-400">Capacity:</span> {v.capacity}
                                </div>
                                <div className="flex items-center gap-1.5 font-medium">
                                  <span className="text-gray-400">Luggage:</span> {v.luggage}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                              <span className="text-[11px] text-gray-500 font-medium">
                                Dedicated Driver Included
                              </span>
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'}`}>
                                {isSelected && <Check size={13} />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Routing Profile Transparency Note */}
                    <div className="mt-3 p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900/80 leading-relaxed flex items-start gap-2.5">
                      <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong className="block font-semibold text-blue-950">Routing Provider Capability Note:</strong>
                        Public OpenStreetMap/OSRM routing engines utilize the unified motor-vehicle "driving" network profile. Dedicated commercial van axle clearances or motorcycle-only trail restrictions require an enterprise routing provider instance.
                      </div>
                    </div>

                    {/* Weather Preference Filter */}
                    <div className="mt-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Weather & Climate Preference</label>
                      <select 
                        className="w-full p-3.5 border border-gray-300 rounded-xl font-medium text-sm" 
                        value={formData.weatherPreference} 
                        onChange={e => setFormData({ ...formData, weatherPreference: e.target.value })}
                      >
                        <option value="Any">Any Weather • Island-wide balanced itinerary</option>
                        <option value="Hot">Tropical / Warm Beaches & Heritage (Southern & Cultural Triangle)</option>
                        <option value="Cold">Cool Mountain Highlands (Nuwara Eliya, Ella, Horton Plains)</option>
                      </select>
                    </div>
                  </div>

                  {/* TOUR GUIDE RULES PER PACKAGE */}
                  <div className="pt-6 border-t border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Compass size={20} className="text-blue-600" /> 
                      Tour Guide Arrangements
                    </h3>

                    {/* BASIC PACKAGE GUIDE RULE */}
                    {activePackage?.packageName === 'Basic' && (
                      <div className="bg-amber-50/70 border border-amber-200 p-5 rounded-2xl flex items-start gap-3">
                        <AlertCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
                        <div>
                          <h4 className="font-bold text-amber-900 text-sm">Tour Guide NOT Included in Basic Package</h4>
                          <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">
                            The Basic Package provides standard transport only. Your chauffeur-driver safely navigates the route, but professional guided commentary is not included.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* STANDARD PACKAGE GUIDE RULE (OPTIONAL ADD-ON) */}
                    {activePackage?.packageName === 'Standard' && (
                      <div className="bg-blue-50/80 border border-blue-200 p-6 rounded-2xl space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-800 bg-blue-200/70 px-2.5 py-0.5 rounded-full">
                              Standard Package Rule
                            </span>
                            <h4 className="text-lg font-bold text-blue-950 mt-1">Tour Guide is NOT automatically included</h4>
                            <p className="text-xs text-blue-800/80 mt-1 max-w-xl">
                              A tour guide is not included by default in the Standard Package, but can be added as an optional service.
                            </p>
                          </div>

                          <label className="flex items-center gap-3 cursor-pointer bg-white px-5 py-3 rounded-xl border border-blue-300 shadow-sm hover:border-blue-500 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={customizations.addGuide} 
                              onChange={(e) => updateCustomizations({ addGuide: e.target.checked })} 
                              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300" 
                            />
                            <div>
                              <span className="block font-bold text-sm text-gray-900">Add Tour Guide</span>
                              <span className="text-xs text-blue-700 font-semibold">+${activePackage.guideAddonPrice || 45} / day</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* PREMIUM PACKAGE GUIDE SELECTION (INCLUDED SPECIALIST) */}
                    {activePackage?.packageName === 'Premium' && (
                      <div className="space-y-4">
                        <div className="bg-purple-50/60 border border-purple-200 p-4 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="text-purple-600" size={18} />
                            <span className="text-xs font-bold text-purple-900">
                              Premium Rule: Select your preferred specialist tour guide
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-purple-700">Dedicated Guide Included</span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-3">
                          {activePackage.guideOptions?.map((guide, idx) => {
                            const isSelected = customizations.selectedGuideOption === guide.name;
                            return (
                              <div
                                key={idx}
                                onClick={() => updateCustomizations({ selectedGuideOption: guide.name })}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-purple-600 bg-white shadow-md' : 'border-gray-200 bg-gray-50/50 hover:border-purple-300'}`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <label className="font-bold text-sm text-gray-900 cursor-pointer flex items-center gap-2">
                                    <input 
                                      type="radio" 
                                      name="plannerGuideOption" 
                                      checked={isSelected}
                                      onChange={() => updateCustomizations({ selectedGuideOption: guide.name })}
                                      className="text-purple-600 focus:ring-purple-500" 
                                    />
                                    {guide.name}
                                  </label>
                                  <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                    Included
                                  </span>
                                </div>
                                <p className="text-xs text-purple-900/80 font-medium ml-5 mb-1">{guide.specialty}</p>
                                <p className="text-xs text-gray-500 ml-5">Languages: {guide.languages?.join(', ')}</p>
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">4. Review & Investment Breakdown</h2>
                    <p className="text-sm text-gray-500">
                      Verify your tour configuration and package selections before generating your personalized route.
                    </p>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                          {activePackage?.packageName} Package Tier
                        </span>
                        <h3 className="text-xl font-extrabold text-gray-900 mt-1">{activePackage?.packageName} Experience</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">Duration & Party</span>
                        <span className="text-sm font-bold text-gray-900">{formData.days} Days • {formData.travelers} Travelers</span>
                      </div>
                    </div>

                    {/* Inclusions and Options Status */}
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-start gap-2.5">
                        <MapPin size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="block text-gray-900">Starting Gateway:</strong>
                          <span className="text-gray-600 text-xs">{startLocation.name}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <Car size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="block text-gray-900">Transport:</strong>
                          <span className="text-gray-600 text-xs">Standard Private {formData.vehicleType} with chauffeur</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <Home size={18} className={activePackage?.packageName === 'Basic' ? 'text-gray-400 mt-0.5 flex-shrink-0' : 'text-blue-600 mt-0.5 flex-shrink-0'} />
                        <div>
                          <strong className="block text-gray-900">Accommodation:</strong>
                          <span className="text-gray-600 text-xs">
                            {activePackage?.packageName === 'Basic' ? 'Not Included (Self-arranged)' : activePackage?.packageName === 'Standard' ? '3-4★ Quality Hotels Included' : '5★ Luxury Resorts Included'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <Utensils size={18} className={activePackage?.packageName === 'Premium' ? 'text-green-600 mt-0.5 flex-shrink-0' : 'text-gray-400 mt-0.5 flex-shrink-0'} />
                        <div>
                          <strong className="block text-gray-900">Food & Meals:</strong>
                          <span className="text-gray-600 text-xs">
                            {activePackage?.packageName === 'Premium' 
                              ? `Included: ${customizations.selectedMealOption}` 
                              : activePackage?.packageName === 'Standard' 
                              ? 'Excluded by default (Independent dining)' 
                              : 'Not Included (Self-arranged)'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <Compass size={18} className={activePackage?.packageName === 'Premium' || customizations.addGuide ? 'text-purple-600 mt-0.5 flex-shrink-0' : 'text-gray-400 mt-0.5 flex-shrink-0'} />
                        <div>
                          <strong className="block text-gray-900">Tour Guide:</strong>
                          <span className="text-gray-600 text-xs">
                            {activePackage?.packageName === 'Premium' 
                              ? `Included: ${customizations.selectedGuideOption}` 
                              : activePackage?.packageName === 'Standard' && customizations.addGuide 
                              ? 'Added as optional service ($45/day)' 
                              : 'Not Included'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Itemized Cost Breakdown Table */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <DollarSign size={18} className="text-green-600" />
                      Detailed Cost Calculation
                    </h4>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-gray-600">
                          Base Package ({formData.days} days × {formData.travelers} travelers × ${activePackage?.baseCharge || 85}):
                        </span>
                        <span className="font-bold text-gray-900">${currentCost.baseTotal}</span>
                      </div>

                      {currentCost.guideCost > 0 && (
                        <div className="flex justify-between py-1 border-b border-gray-100 text-blue-700">
                          <span>Tour Guide Add-on ({formData.days} days × $45):</span>
                          <span className="font-bold">+${currentCost.guideCost}</span>
                        </div>
                      )}

                      {currentCost.mealExtraCost > 0 && (
                        <div className="flex justify-between py-1 border-b border-gray-100 text-purple-700">
                          <span>Culinary Selection Premium ({customizations.selectedMealOption}):</span>
                          <span className="font-bold">+${currentCost.mealExtraCost}</span>
                        </div>
                      )}

                      <div className="flex justify-between pt-3 text-lg font-extrabold text-gray-900">
                        <span>Total Estimated Cost:</span>
                        <span className="text-2xl text-green-600 font-extrabold">${currentCost.grandTotal}</span>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Wizard Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t border-gray-100">
                {step > 1 ? (
                  <button 
                    type="button" 
                    onClick={handlePrev} 
                    className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold text-sm transition"
                  >
                    Back
                  </button>
                ) : <div></div>}
                
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
                        Generating Itinerary & Route...
                      </>
                    ) : (
                      'Generate Complete Plan & Route ✓'
                    )}
                  </button>
                )}
              </div>

            </div>
          ) : (
            /* ==========================================
               FINAL RESULTS VIEW WITH INTERACTIVE ROUTE MAP
               ========================================== */
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
                    Route planned starting from <strong>{results.startLocation?.name}</strong> with GPS-enabled OpenStreetMap routing.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 text-center md:text-right min-w-[200px]">
                  <span className="text-xs uppercase tracking-wider text-blue-200 font-semibold block">Total Estimated Cost</span>
                  <div className="text-4xl font-extrabold text-green-400 my-1">
                    ${results.estimatedCost}
                  </div>
                  <span className="text-xs text-blue-200 block">All taxes & fees included</span>
                </div>
              </div>

              {/* Package Configuration Confirmation Box */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                  <ShieldCheck size={20} className="text-green-600" />
                  Confirmed Package Rules & Inclusions
                </h3>

                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold mb-1">
                      <Car size={15} /> Transport
                    </div>
                    <p className="text-gray-700 font-medium">Standard Dedicated Vehicle ({formData.vehicleType}) with Chauffeur</p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold mb-1">
                      <Home size={15} /> Accommodation
                    </div>
                    <p className="text-gray-700 font-medium">
                      {results.packageSnapshot?.packageName === 'Basic' 
                        ? 'Excluded (Self-arranged)' 
                        : results.packageSnapshot?.packageName === 'Standard' 
                        ? '3-4 Star Handpicked Hotels' 
                        : '5-Star Luxury Resorts & Heritage Villas'}
                    </p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-1.5 text-purple-700 font-bold mb-1">
                      <Utensils size={15} /> Food & Meals
                    </div>
                    <p className="text-gray-700 font-medium">
                      {results.packageSnapshot?.packageName === 'Premium' 
                        ? results.customizationsSnapshot?.selectedMealOption 
                        : results.packageSnapshot?.packageName === 'Standard' 
                        ? 'Excluded by default (Local dining)' 
                        : 'Excluded (Self-arranged)'}
                    </p>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-1.5 text-indigo-700 font-bold mb-1">
                      <Compass size={15} /> Tour Guide
                    </div>
                    <p className="text-gray-700 font-medium">
                      {results.packageSnapshot?.packageName === 'Premium' 
                        ? results.customizationsSnapshot?.selectedGuideOption 
                        : results.customizationsSnapshot?.addGuide 
                        ? 'Guide Add-on Included ($45/day)' 
                        : 'None (Self-guided)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* MODULE 2: INTERACTIVE MAP & ROUTE SUMMARY SECTION */}
              <div className="space-y-6">
                
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Navigation size={22} className="text-blue-600" />
                      Interactive Tour Route & Navigation Map
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      GPS road polyline plotted from <strong>{startLocation.name}</strong> across all daily tour stops.
                    </p>
                  </div>

                  {totalDistance && (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                      Total: {totalDistance} • {totalDuration}
                    </span>
                  )}
                </div>

                {/* Route Overview Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <Route size={20} />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-gray-500 block">Total Distance</span>
                      <strong className="text-base text-gray-900 font-extrabold">{totalDistance || 'Calculating...'}</strong>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Clock size={20} />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-gray-500 block">Estimated Duration</span>
                      <strong className="text-base text-gray-900 font-extrabold">{totalDuration || 'Calculating...'}</strong>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                      <Car size={20} />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-gray-500 block">Vehicle Selected</span>
                      <strong className="text-base text-gray-900 font-extrabold">{formData.vehicleType}</strong>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-gray-500 block">Starting Hub</span>
                      <strong className="text-xs text-gray-900 font-extrabold truncate block max-w-[130px]">{startLocation.name}</strong>
                    </div>
                  </div>
                </div>

                {/* Traffic-Aware Travel Information Banner (Requirement 5) */}
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
                  <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-amber-950">Traffic-Aware Travel Information Notice</h5>
                    <p className="leading-relaxed">
                      {trafficStatus?.statusMessage || "Live traffic information is currently unavailable on public OpenStreetMap/OSRM routing. Displaying standard algorithmic road transit duration based on standard speed limits."}
                    </p>
                    <span className="text-[11px] text-amber-800 font-medium block">
                      Normal Estimated Travel Time: <strong>{totalDuration}</strong> (Standard Traffic Profile). Live delays are not factored.
                    </span>
                  </div>
                </div>

                {/* Alternative Routes Selector (Requirement 6) */}
                {alternativeRoutes && alternativeRoutes.length > 1 ? (
                  <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                        <Route size={14} className="text-blue-600" />
                        Available Route Corridors ({alternativeRoutes.length} options found)
                      </span>
                      <span className="text-[11px] text-gray-500">Click a route card to view and activate on map</span>
                    </div>

                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {alternativeRoutes.map((alt, idx) => {
                        const isSelected = selectedRouteIndex === idx;
                        return (
                          <div
                            key={alt.id || idx}
                            onClick={() => handleSelectAlternativeRoute(idx)}
                            className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-gray-900">
                                {alt.label || `Route ${idx + 1}`}
                              </span>
                              {isSelected && <Check size={14} className="text-blue-600" />}
                            </div>
                            <div className="text-xs text-gray-600 font-semibold">
                              Distance: <span className="text-blue-700">{alt.distanceKm}</span>
                            </div>
                            <div className="text-xs text-gray-600 font-semibold">
                              Est. Duration: <span className="text-indigo-700">{alt.durationFormatted}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 flex items-center justify-between">
                    <span>
                      ℹ️ Routing Corridor: <strong>1 optimal route corridor</strong> was calculated by OSRM for this multi-destination sequence.
                    </span>
                    <span className="text-[11px] text-gray-400">OSRM Unified Optimal Sequence</span>
                  </div>
                )}

                {/* Interactive Leaflet Map Container */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative z-0">
                  <MapView 
                    startLocation={startLocation}
                    destinations={results.destinations} 
                    routeCoordinates={routeCoordinates}
                    alternativeRoutes={alternativeRoutes}
                    selectedRouteIndex={selectedRouteIndex}
                    onSelectRoute={handleSelectAlternativeRoute}
                    loading={loadingRoute}
                    error={routeError}
                    height="540px"
                  />
                </div>

                {/* Leg-by-Leg Route Breakdown */}
                {routeLegs && routeLegs.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                    <h4 className="font-bold text-gray-900 text-base border-b pb-2 flex items-center gap-2">
                      <Route size={18} className="text-blue-600" />
                      Turn-by-Turn Leg Breakdown
                    </h4>

                    <div className="divide-y divide-gray-100">
                      {routeLegs.map((leg, lIdx) => (
                        <div key={lIdx} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0">
                              {leg.legIndex || lIdx + 1}
                            </span>
                            <div>
                              <strong className="text-gray-900 font-bold">{leg.fromName} &rarr; {leg.toName}</strong>
                              <span className="text-gray-400 block text-[11px]">{leg.summary || 'Connecting road corridor'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-right">
                            <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                              {leg.distanceKm}
                            </span>
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                              {leg.durationFormatted}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recalculate Route Interactive Control Widget */}
                <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h4 className="font-bold text-blue-950 text-sm flex items-center gap-2">
                      <RefreshCw size={16} className="text-blue-600" />
                      Recalculate Route or Switch Vehicle
                    </h4>
                    <p className="text-xs text-blue-900/80 mt-0.5">
                      Adjust your starting gateway or change vehicle type, then recalculate the road route instantly.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      className="p-2.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white text-gray-800"
                      value={startLocation.id || startLocation.name}
                      onChange={(e) => {
                        const match = presetLocations.find(p => (p.id || p.name) === e.target.value);
                        if (match) setStartLocation(match);
                      }}
                    >
                      {presetLocations.map(p => (
                        <option key={p.id || p.name} value={p.id || p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    <select
                      className="p-2.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white text-gray-800"
                      value={formData.vehicleType}
                      onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    >
                      <option value="Car">Sedan Car</option>
                      <option value="Van">Passenger Van</option>
                      <option value="Motorcycle">Touring Motorcycle</option>
                    </select>

                    <button
                      type="button"
                      onClick={handleRecalculateRoute}
                      disabled={loadingRoute}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                    >
                      {loadingRoute ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" /> Recalculating...
                        </>
                      ) : (
                        'Recalculate Route'
                      )}
                    </button>
                  </div>
                </div>

              </div>
              
              {/* Daily Destination Itinerary Cards with Reorder Controls */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                  <h3 className="text-xl font-bold text-gray-900">Destinations on Your Schedule</h3>
                  <span className="text-xs text-gray-500">Use ↑ / ↓ controls on any card to reorder stops and recalculate your route</span>
                </div>
                {results.destinations.length === 0 ? (
                  <p className="text-gray-500 py-4">No destinations matched your criteria entirely, but our tour operators can customize a plan for you!</p>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.destinations.map((dest, idx) => (
                      <div key={dest._id} className="relative">
                        <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5">
                          <span className="bg-blue-900 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow">
                            Day {idx + 1}
                          </span>
                          {results.destinations.length > 1 && (
                            <div className="flex items-center bg-white/95 backdrop-blur-sm rounded-md shadow border border-gray-200 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => handleReorderDestination(idx, 'up')}
                                disabled={idx === 0 || loadingRoute}
                                title="Move Stop Earlier"
                                className="p-1 text-gray-700 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 transition"
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReorderDestination(idx, 'down')}
                                disabled={idx === results.destinations.length - 1 || loadingRoute}
                                title="Move Stop Later"
                                className="p-1 text-gray-700 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 transition border-l border-gray-100"
                              >
                                <ArrowDown size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                        <DestinationCard destination={dest} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Footer Actions */}
              <div className="pt-6 border-t border-gray-200 flex flex-wrap gap-4 justify-between items-center">
                <button 
                  onClick={() => setResults(null)} 
                  className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold text-sm transition"
                >
                  &larr; Modify Plan Preferences
                </button>

                <button 
                  onClick={handleSaveItineraryToDb}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition text-sm"
                >
                  Save Itinerary to Profile
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
