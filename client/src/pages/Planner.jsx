
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { PackageContext } from '../context/PackageContext';
import { useCurrency } from '../context/CurrencyContext';
import { useNavigate } from 'react-router-dom';

import api, {
  getPresetStartLocations,
  geocodeLocation,
  calculateMultiRoute
} from '../services/api';

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
  Calculator,
  MapPin,
  Navigation,
  Clock,
  Bike,
  Route,
  RefreshCw,
  Search,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

/**
 * Module 2: Maps, Routes and Transportation
 * Smart Ceylon Journey Planner
 */

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

const VEHICLE_OPTIONS = [
  {
    type: 'Car',
    name: 'Sedan Car',
    tag: 'Couples & Small Families',
    capacity: '1 - 3 Passengers',
    luggage: '2 - 3 Large Bags',
    icon: Car,
    description: 'Comfortable private sedan with air-conditioning.',
    routingNote: 'Uses the standard motor-vehicle road network.'
  },
  {
    type: 'Van',
    name: 'Passenger Van',
    tag: 'Families & Groups',
    capacity: '4 - 8 Passengers',
    luggage: '6 - 8 Large Bags',
    icon: Car,
    description: 'Spacious passenger van for families and groups.',
    routingNote: 'Uses the standard motor-vehicle road network.'
  },
  {
    type: 'Motorcycle',
    name: 'Touring Motorcycle',
    tag: 'Solo & Adventure',
    capacity: '1 - 2 Riders',
    luggage: '1 - 2 Backpacks',
    icon: Bike,
    description: 'Adventure travel for scenic roads and coastal routes.',
    routingNote: 'Uses the standard motor-vehicle road network.'
  },
  {
    type: 'Bus',
    name: 'Mini Coach',
    tag: 'Large Groups',
    capacity: '9+ Passengers',
    luggage: 'Large Group Luggage',
    icon: Car,
    description: 'Spacious transportation for larger travel groups.',
    routingNote: 'Uses the standard motor-vehicle road network.'
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

  const { currency, formatPrice } = useCurrency();
  const navigate = useNavigate();

  // Main wizard states
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [results, setResults] = useState(null);

  // Package and partner data
  const [availablePackages, setAvailablePackages] = useState([]);
  const [partnerHotels, setPartnerHotels] = useState([]);
  const [partnerGuides, setPartnerGuides] = useState([]);
  const [backendPricing, setBackendPricing] = useState(null);

  // Starting location states
  const [presetLocations, setPresetLocations] = useState(FALLBACK_PRESETS);
  const [startLocation, setStartLocation] = useState(FALLBACK_PRESETS[0]);
  const [customStartQuery, setCustomStartQuery] = useState('');
  const [isCustomStartMode, setIsCustomStartMode] = useState(false);
  const [geocodingStart, setGeocodingStart] = useState(false);
  const [geocodeError, setGeocodeError] = useState(null);

  // Route states
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [totalDistance, setTotalDistance] = useState('');
  const [totalDistanceKmNumeric, setTotalDistanceKmNumeric] = useState(0);
  const [totalDuration, setTotalDuration] = useState('');
  const [routeLegs, setRouteLegs] = useState([]);
  const [alternativeRoutes, setAlternativeRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [trafficStatus, setTrafficStatus] = useState(null);
  const [vehicleMeta, setVehicleMeta] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState(null);

  // Planner form
  const [formData, setFormData] = useState({
    days: 3,
    travelers: 2,
    interests: [],
    weatherPreference: 'Any',
    vehicleType: customizations?.vehicleType || 'Car',
    budget: 240000
  });

  const activePackage =
    selectedPackage ||
    availablePackages.find((p) => p.packageName === 'Standard') ||
    null;

  // Load initial planner data
  useEffect(() => {
    let mounted = true;

    const fetchInitData = async () => {
      try {
        const presets = await getPresetStartLocations();

        if (mounted && presets?.length > 0) {
          setPresetLocations(presets);

          const defaultLocation =
            presets.find((p) => p.id === 'cmb-airport') || presets[0];

          setStartLocation(defaultLocation);
        }
      } catch (err) {
        console.warn('Using fallback starting locations:', err);
      }

      try {
        const [pkgRes, hotelRes, guideRes] = await Promise.all([
          api.get('/packages', { params: { currency } }),
          api.get('/hotels', { params: { currency } }).catch(() => ({
            data: { data: [] }
          })),
          api.get('/guides', { params: { currency } }).catch(() => ({
            data: { data: [] }
          }))
        ]);

        if (!mounted) return;

        const packages = pkgRes.data?.data || pkgRes.data || [];
        const order = { Basic: 1, Standard: 2, Premium: 3 };

        packages.sort(
          (a, b) =>
            (order[a.packageName] || 9) -
            (order[b.packageName] || 9)
        );

        setAvailablePackages(packages);
        setPartnerHotels(hotelRes.data?.data || []);
        setPartnerGuides(guideRes.data?.data || []);

        if (!selectedPackage && packages.length > 0) {
          const defaultPackage =
            packages.find((p) => p.packageName === 'Standard') ||
            packages[0];

          selectPackage(defaultPackage);
        }
      } catch (err) {
        console.error('Failed to load planner resources:', err);
      }
    };

    fetchInitData();

    return () => {
      mounted = false;
    };
  }, [currency]);

  // Geocode custom starting location
  const handleGeocodeStart = async (e) => {
    if (e) e.preventDefault();
    if (!customStartQuery.trim()) return;

    setGeocodingStart(true);
    setGeocodeError(null);

    try {
      const geo = await geocodeLocation(customStartQuery.trim());

      if (
        geo &&
        geo.lat !== undefined &&
        geo.lng !== undefined
      ) {
        setStartLocation({
          id: 'custom-start',
          name: geo.name || customStartQuery.trim(),
          displayName:
            geo.displayName ||
            `${geo.name || customStartQuery.trim()}, Sri Lanka`,
          city: geo.city || '',
          district: geo.district || 'Sri Lanka',
          latitude: Number(geo.lat),
          longitude: Number(geo.lng),
          type: 'Custom Starting Point'
        });

        setGeocodeError(null);
      } else {
        setGeocodeError(
          'Could not find this location. Try a city, airport or landmark name.'
        );
      }
    } catch (err) {
      setGeocodeError(
        err.response?.data?.error ||
          err.message ||
          'Location search failed. Please try again.'
      );
    } finally {
      setGeocodingStart(false);
    }
  };

  // Calculate route between starting point and destinations
  const fetchMultiDestinationRoute = async (
    startPoint,
    destinations,
    vehicle
  ) => {
    if (!destinations || destinations.length === 0) {
      setRouteCoordinates([]);
      setTotalDistance('');
      setTotalDistanceKmNumeric(0);
      setTotalDuration('');
      setRouteLegs([]);
      setAlternativeRoutes([]);
      return 0;
    }

    setLoadingRoute(true);
    setRouteError(null);

    try {
      // The API helper is expected to return the route response.
      const response = await calculateMultiRoute(
        startPoint,
        destinations,
        vehicle,
        { alternatives: true }
      );

      const routeData =
        response?.data?.data ||
        response?.data ||
        response;

      if (!routeData) {
        throw new Error('No route data was returned.');
      }

      const distanceValue = Number.parseFloat(
        routeData.totalDistanceKm ||
          routeData.distanceKm ||
          0
      );

      setRouteCoordinates(routeData.leafletCoordinates || []);
      setTotalDistance(
        routeData.totalDistanceKm ||
          routeData.distanceKm ||
          ''
      );
      setTotalDistanceKmNumeric(distanceValue);
      setTotalDuration(
        routeData.totalDurationFormatted ||
          routeData.durationFormatted ||
          ''
      );
      setRouteLegs(routeData.legs || []);
      setAlternativeRoutes(routeData.routes || []);
      setSelectedRouteIndex(0);
      setTrafficStatus(routeData.traffic || null);
      setVehicleMeta(routeData.vehicle || null);

      return distanceValue;
    } catch (err) {
      console.error('Multi-route calculation error:', err);

      setRouteError(
        err.response?.data?.error ||
          err.message ||
          'Unable to calculate the road route.'
      );

      return 0;
    } finally {
      setLoadingRoute(false);
    }
  };

  // Select an alternative route
  const handleSelectAlternativeRoute = (index) => {
    if (!alternativeRoutes[index]) return;

    const selected = alternativeRoutes[index];

    setSelectedRouteIndex(index);
    setRouteCoordinates(selected.leafletCoordinates || []);
    setTotalDistance(selected.distanceKm || totalDistance);
    setTotalDistanceKmNumeric(
      Number.parseFloat(selected.distanceKm) ||
        totalDistanceKmNumeric
    );
    setTotalDuration(
      selected.durationFormatted || totalDuration
    );
  };

  // Recalculate route
  const handleRecalculateRoute = async () => {
    if (!results?.destinations) return;

    await fetchMultiDestinationRoute(
      startLocation,
      results.destinations,
      formData.vehicleType
    );
  };

  // Reorder destinations
  const handleReorderDestination = async (index, direction) => {
    if (!results || !Array.isArray(results.destinations)) return;

    const targetIndex =
      direction === 'up' ? index - 1 : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= results.destinations.length
    ) {
      return;
    }

    const updatedDestinations = [...results.destinations];

    [
      updatedDestinations[index],
      updatedDestinations[targetIndex]
    ] = [
      updatedDestinations[targetIndex],
      updatedDestinations[index]
    ];

    setResults((prev) => ({
      ...prev,
      destinations: updatedDestinations,
      itinerary: updatedDestinations.map((destination, i) => ({
        day: i + 1,
        ...destination
      }))
    }));

    await fetchMultiDestinationRoute(
      startLocation,
      updatedDestinations,
      formData.vehicleType
    );
  };

  // Toggle destination interests
  const toggleInterest = (interest) => {
    setFormData((prev) => {
      const interests = prev.interests.includes(interest)
        ? prev.interests.filter((item) => item !== interest)
        : [...prev.interests, interest];

      return { ...prev, interests };
    });
  };

  // Backend pricing synchronization
  useEffect(() => {
    if (!activePackage) return;

    let mounted = true;

    const syncBackendPricing = async () => {
      try {
        const response = await api.post('/pricing/calculate', {
          packageId: activePackage._id,
          packageName: activePackage.packageName,
          days: formData.days,
          travelers: formData.travelers,
          vehicleType: formData.vehicleType,
          routeDistanceKm:
            totalDistanceKmNumeric ||
            customizations?.routeDistanceKm ||
            0,
          hotelId:
            activePackage.packageName === 'Basic'
              ? null
              : customizations?.selectedHotelId || null,
          roomType: customizations?.selectedRoomType || null,
          numberOfRooms: customizations?.numberOfRooms || 1,
          mealType: customizations?.selectedMealType || 'Vegetarian',
          selectedMealOption: customizations?.selectedMealOption,
          addGuide:
            activePackage.packageName === 'Premium'
              ? true
              : Boolean(customizations?.addGuide),
          guideId: customizations?.selectedGuideId || null,
          selectedGuideOption: customizations?.selectedGuideOption,
          targetCurrency: currency
        });

        if (mounted && response.data?.success) {
          setBackendPricing(response.data.data);
        }
      } catch (err) {
        console.warn('Using local package pricing:', err);
      }
    };

    syncBackendPricing();

    return () => {
      mounted = false;
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

  const handleNext = () => {
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrev = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  // Generate complete itinerary
  const handleSubmit = async () => {
    if (!user) {
      alert('Please login to generate your smart plan.');
      navigate('/login');
      return;
    }

    if (!activePackage) {
      alert('Please select a tour package first.');
      setStep(1);
      return;
    }

    setLoading(true);
    setSavedNotice('');
    setRouteError(null);

    try {
      const response = await api.get('/destinations');
      let destinations =
        response.data?.data || response.data || [];

      // Filter destination categories
      if (formData.interests.length > 0) {
        destinations = destinations.filter((destination) => {
          return formData.interests.some((interest) => {
            if (
              interest === 'Cultural' ||
              interest === 'Historical'
            ) {
              return (
                destination.category === 'Historical' ||
                destination.category === 'Cultural'
              );
            }

            if (
              interest === 'Wildlife' ||
              interest === 'Forest' ||
              interest === 'Nature'
            ) {
              return (
                destination.category === 'Wildlife' ||
                destination.category === 'Nature' ||
                destination.category === 'Forest'
              );
            }

            return (
              destination.category?.toLowerCase() ===
              interest.toLowerCase()
            );
          });
        });
      }

      // Filter by weather preference
      if (formData.weatherPreference === 'Cold') {
        destinations = destinations.filter((destination) =>
          ['Nuwara Eliya', 'Badulla'].includes(
            destination.district
          )
        );
      } else if (formData.weatherPreference === 'Hot') {
        destinations = destinations.filter(
          (destination) =>
            !['Nuwara Eliya', 'Badulla'].includes(
              destination.district
            )
        );
      }

      const finalDestinations = destinations
        .filter(
          (destination) =>
            destination.latitude != null &&
            destination.longitude != null
        )
        .slice(0, formData.days);

      // Calculate route before final pricing
      const computedDistance = await fetchMultiDestinationRoute(
        startLocation,
        finalDestinations,
        formData.vehicleType
      );

      // Calculate authoritative backend pricing
      let finalPricing = null;

      try {
        const pricingResponse = await api.post(
          '/pricing/calculate',
          {
            packageId: activePackage._id,
            packageName: activePackage.packageName,
            days: formData.days,
            travelers: formData.travelers,
            vehicleType: formData.vehicleType,
            routeDistanceKm: computedDistance,
            hotelId:
              activePackage.packageName === 'Basic'
                ? null
                : customizations?.selectedHotelId || null,
            roomType: customizations?.selectedRoomType || null,
            numberOfRooms: customizations?.numberOfRooms || 1,
            mealType:
              customizations?.selectedMealType || 'Vegetarian',
            selectedMealOption:
              customizations?.selectedMealOption,
            addGuide:
              activePackage.packageName === 'Premium'
                ? true
                : Boolean(customizations?.addGuide),
            guideId: customizations?.selectedGuideId || null,
            selectedGuideOption:
              customizations?.selectedGuideOption,
            targetCurrency: currency
          }
        );

        finalPricing = pricingResponse.data?.data || null;
      } catch (err) {
        console.warn('Backend pricing unavailable:', err);
      }

      // Local pricing fallback
      const costCalculation = calculatePackageCost(
        activePackage,
        formData.days,
        formData.travelers,
        {
          ...customizations,
          vehicleType: formData.vehicleType,
          routeDistanceKm: computedDistance
        }
      );

      setResults({
        startLocation: { ...startLocation },
        destinations: finalDestinations,
        costBreakdown: costCalculation,
        backendPricing: finalPricing || backendPricing,
        estimatedCostLKR:
          finalPricing?.summary?.totalEstimatedCostLKR ||
          costCalculation.grandTotalLKR,
        packageSnapshot: activePackage,
        customizationsSnapshot: { ...customizations },
        itinerary: finalDestinations.map((destination, index) => ({
          day: index + 1,
          ...destination
        }))
      });
    } catch (err) {
      console.error('Planner generation error:', err);
      alert(
        err.response?.data?.error ||
          'Unable to generate the itinerary. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Save complete plan to database
  const handleSavePlanToDatabase = async () => {
    if (!user || !results) {
      alert('Please login before saving your itinerary.');
      return;
    }

    setSavingPlan(true);

    try {
      const payload = {
        title: `${
          results.packageSnapshot?.packageName || 'Standard'
        } Sri Lanka Journey`,
        days: formData.days,
        travelers: formData.travelers,
        stops: results.destinations.map(
          (destination) => destination._id
        ),
        transportType: formData.vehicleType,
        packageId: results.packageSnapshot?._id,
        packageName:
          results.packageSnapshot?.packageName || 'Standard',
        selectedHotelId:
          customizations?.selectedHotelId || null,
        selectedRoomType:
          customizations?.selectedRoomType || '',
        numberOfRooms:
          customizations?.numberOfRooms || 1,
        selectedGuideId:
          customizations?.selectedGuideId || null,
        mealType:
          results.packageSnapshot?.packageName === 'Premium'
            ? customizations?.selectedMealType || 'Vegetarian'
            : 'None',
        customizations,
        startLocation,
        routeData: {
          distanceKm: totalDistanceKmNumeric,
          distanceText: totalDistance,
          durationText: totalDuration,
          vehicle: vehicleMeta,
          legs: routeLegs
        },
        currency
      };

      await api.post('/planner/plan', payload);

      setSavedNotice(
        `Your ${results.packageSnapshot?.packageName} Package itinerary has been saved to your profile.`
      );
    } catch (err) {
      console.error('Error saving itinerary:', err);

      alert(
        err.response?.data?.error ||
          'Failed to save itinerary. Please try again.'
      );
    } finally {
      setSavingPlan(false);
    }
  };

  // Local pricing calculation
  const currentCost = activePackage
    ? calculatePackageCost(
        activePackage,
        formData.days,
        formData.travelers,
        {
          ...customizations,
          vehicleType: formData.vehicleType
        }
      )
    : {
        grandTotalLKR: 0,
        perPersonLKR: 0,
        coordinationLKR: 0,
        transportLKR: 0,
        accommodationLKR: 0,
        mealCostLKR: 0,
        guideCostLKR: 0
      };

  const displayTotalLKR =
    backendPricing?.summary?.totalEstimatedCostLKR ||
    currentCost.grandTotalLKR;

  const displayPerPersonLKR =
    backendPricing?.summary?.costPerPersonLKR ||
    currentCost.perPersonLKR;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-8 text-white text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-300 bg-blue-800/60 px-3.5 py-1 rounded-full border border-blue-400/30">
            Intelligent Tour Planner • Currency: {currency} • Module 2 (Maps & Routes)
          </span>

          <h1 className="text-3xl md:text-4xl font-extrabold mt-3 mb-2">
            Smart Ceylon Journey Planner
          </h1>

          <p className="text-blue-100 text-sm max-w-xl mx-auto">
            Design your ideal holiday combining custom packages,
            interactive route mapping, GPS navigation, dynamic
            pricing and vehicle selection.
          </p>
        </div>

        <div className="p-6 md:p-10">

          {!results ? (
            <div className="space-y-8">

              {/* STEPPER */}
              <div className="flex justify-between items-center relative max-w-2xl mx-auto mb-10">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 z-0" />

                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 z-0 transition-all"
                  style={{ width: `${(step - 1) * 33.33}%` }}
                />

                {[
                  { num: 1, label: 'Package & Starting Hub' },
                  { num: 2, label: 'Interests & Dining' },
                  { num: 3, label: 'Vehicle & Guide' },
                  { num: 4, label: 'Investment & Review' }
                ].map((item) => (
                  <div
                    key={item.num}
                    className="relative z-10 flex flex-col items-center"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        step >= item.num
                          ? 'bg-blue-600 text-white shadow-md ring-4 ring-blue-100'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {item.num}
                    </div>

                    <span className="text-xs font-semibold text-gray-500 mt-1 hidden sm:block">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* STEP 1 */}
              {step === 1 && (
                <div className="space-y-8 animate-fadeIn">

                  {/* PACKAGE SELECTION */}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      1. Select Your Tour Package
                    </h2>

                    <p className="text-sm text-gray-500 mb-4">
                      Select the package that suits your journey.
                    </p>

                    <div className="grid md:grid-cols-3 gap-4">
                      {availablePackages.map((pkg) => {
                        const isSelected =
                          activePackage?.packageName === pkg.packageName;

                        return (
                          <div
                            key={pkg._id}
                            onClick={() => selectPackage(pkg)}
                            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/40 shadow-md'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-bold uppercase text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                                {pkg.badge || pkg.packageName}
                              </span>

                              {isSelected && (
                                <Check size={18} className="text-blue-600" />
                              )}
                            </div>

                            <h3 className="text-lg font-bold text-gray-900">
                              {pkg.packageName} Package
                            </h3>

                            <div className="text-2xl font-extrabold text-gray-900 my-2">
                              {formatPrice(
                                pkg.baseChargeLKR || pkg.baseCharge
                              )}

                              <span className="text-xs font-normal text-gray-500">
                                {' '}/ person/day
                              </span>
                            </div>

                            <p className="text-xs text-gray-600 mb-3">
                              {pkg.description}
                            </p>

                            <div className="space-y-2 text-xs text-gray-700 border-t pt-3">
                              <div className="flex items-center gap-2">
                                <Car size={14} className="text-blue-600" />
                                Transport: Motorcycle / Car / Van / Bus
                              </div>

                              <div className="flex items-center gap-2">
                                <Home size={14} className="text-blue-600" />
                                Stays: {pkg.packageName === 'Basic' ? 'Excluded' : 'Included'}
                              </div>

                              <div className="flex items-center gap-2">
                                <Utensils size={14} className="text-blue-600" />
                                Meals: {pkg.packageName === 'Premium' ? 'Included' : 'Excluded by default'}
                              </div>

                              <div className="flex items-center gap-2">
                                <Compass size={14} className="text-blue-600" />
                                Guide: {pkg.packageName === 'Premium' ? 'Included' : pkg.packageName === 'Standard' ? 'Optional' : 'Excluded'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* HOTEL SELECTION */}
                  {activePackage?.packageName !== 'Basic' &&
                    partnerHotels.length > 0 && (
                      <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
                        <h4 className="font-bold text-sm text-blue-950 flex items-center gap-2">
                          <Home size={16} />
                          Select Partner Hotel
                        </h4>

                        <div className="grid sm:grid-cols-3 gap-4">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold mb-1">
                              Partner Hotel Property
                            </label>

                            <select
                              value={customizations?.selectedHotelId || ''}
                              onChange={(e) => {
                                const hotel = partnerHotels.find(
                                  (item) => item._id === e.target.value
                                );

                                updateCustomizations({
                                  selectedHotelId: e.target.value,
                                  selectedHotelRateLKR:
                                    hotel?.pricePerNightLKR || null,
                                  selectedRoomType:
                                    hotel?.rooms?.[0]?.type || ''
                                });
                              }}
                              className="w-full p-3 border border-gray-300 rounded-xl bg-white text-xs"
                            >
                              <option value="">Default hotel estimate</option>

                              {partnerHotels.map((hotel) => (
                                <option key={hotel._id} value={hotel._id}>
                                  {hotel.name} ({hotel.location}) —{' '}
                                  {formatPrice(
                                    hotel.pricePerNightLKR ||
                                      hotel.pricePerNight
                                  )}/night
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold mb-1">
                              Number of Rooms
                            </label>

                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={customizations?.numberOfRooms || 1}
                              onChange={(e) =>
                                updateCustomizations({
                                  numberOfRooms: Math.max(
                                    1,
                                    parseInt(e.target.value) || 1
                                  )
                                })
                              }
                              className="w-full p-3 border border-gray-300 rounded-xl"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                  {/* TRIP BASICS */}
                  <div className="pt-4 border-t">
                    <h3 className="text-lg font-bold mb-4">
                      Trip Duration & Party Size
                    </h3>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold mb-2">
                          Duration (Days)
                        </label>

                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={formData.days}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              days: Math.max(
                                1,
                                parseInt(e.target.value) || 1
                              )
                            })
                          }
                          className="w-full p-3.5 border rounded-xl font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2">
                          Number of Travelers
                        </label>

                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={formData.travelers}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              travelers: Math.max(
                                1,
                                parseInt(e.target.value) || 1
                              )
                            })
                          }
                          className="w-full p-3.5 border rounded-xl font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* STARTING LOCATION */}
                  <div className="pt-6 border-t">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          <MapPin size={20} className="text-emerald-600" />
                          Journey Starting Point in Sri Lanka
                        </h3>

                        <p className="text-xs text-gray-500">
                          Select a preset hub or search for a custom location.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsCustomStartMode(false)}
                          className={`text-xs font-bold px-3 py-2 rounded-lg border ${
                            !isCustomStartMode
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white text-gray-600'
                          }`}
                        >
                          Preset Hubs
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsCustomStartMode(true)}
                          className={`text-xs font-bold px-3 py-2 rounded-lg border ${
                            isCustomStartMode
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white text-gray-600'
                          }`}
                        >
                          Custom Search
                        </button>
                      </div>
                    </div>

                    {!isCustomStartMode ? (
                      <select
                        className="w-full p-3.5 border rounded-xl bg-white"
                        value={startLocation.id || startLocation.name}
                        onChange={(e) => {
                          const selected = presetLocations.find(
                            (item) =>
                              (item.id || item.name) === e.target.value
                          );

                          if (selected) setStartLocation(selected);
                        }}
                      >
                        {presetLocations.map((location) => (
                          <option
                            key={location.id || location.name}
                            value={location.id || location.name}
                          >
                            {location.name} ({location.district || location.city})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <div className="relative flex-grow">
                            <input
                              type="text"
                              value={customStartQuery}
                              onChange={(e) =>
                                setCustomStartQuery(e.target.value)
                              }
                              onKeyDown={(e) =>
                                e.key === 'Enter' && handleGeocodeStart(e)
                              }
                              placeholder="Enter a Sri Lankan location..."
                              className="w-full p-3.5 pl-10 border rounded-xl"
                            />

                            <Search
                              size={16}
                              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleGeocodeStart}
                            disabled={
                              geocodingStart || !customStartQuery.trim()
                            }
                            className="px-5 py-3 bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-50"
                          >
                            {geocodingStart ? 'Searching...' : 'Locate'}
                          </button>
                        </div>

                        {geocodeError && (
                          <p className="text-xs text-red-600">
                            {geocodeError}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="text-xs font-bold text-emerald-800">
                        Selected Starting Gateway
                      </span>

                      <p className="text-sm font-bold text-gray-900">
                        {startLocation.name}
                      </p>

                      <p className="text-xs text-gray-500">
                        {startLocation.district || startLocation.city}
                        {' '}• GPS: {Number(startLocation.latitude).toFixed(3)},
                        {' '}{Number(startLocation.longitude).toFixed(3)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="space-y-8 animate-fadeIn">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">
                      2. Destinations of Interest
                    </h2>

                    <p className="text-sm text-gray-500">
                      Pick the travel categories that appeal to you.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                      {[
                        'Beach',
                        'Mountain',
                        'Historical',
                        'Waterfall',
                        'Wildlife',
                        'Nature',
                        'Lake',
                        'Cultural',
                        'Forest'
                      ].map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => toggleInterest(category)}
                          className={`p-3.5 rounded-xl border-2 font-bold text-sm ${
                            formData.interests.includes(category)
                              ? 'border-blue-600 bg-blue-50 text-blue-800'
                              : 'border-gray-200 text-gray-700'
                          }`}
                        >
                          {category}

                          {formData.interests.includes(category) && (
                            <Check
                              size={14}
                              className="inline ml-2 text-blue-600"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* MEAL RULES */}
                  <div className="pt-6 border-t">
                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                      <Utensils size={20} className="text-blue-600" />
                      Food and Meal Services
                    </h3>

                    {activePackage?.packageName === 'Basic' && (
                      <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl">
                        <AlertCircle className="inline mr-2 text-amber-600" />
                        <strong>Meals are not included in the Basic Package.</strong>
                        <p className="text-xs mt-2">
                          Tourists arrange their meals independently.
                        </p>
                      </div>
                    )}

                    {activePackage?.packageName === 'Standard' && (
                      <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl">
                        <Info className="inline mr-2 text-blue-600" />
                        <strong>Meals are excluded by default.</strong>
                        <p className="text-xs mt-2">
                          The Standard Package covers accommodation and transport.
                        </p>
                      </div>
                    )}

                    {activePackage?.packageName === 'Premium' && (
                      <div className="space-y-4">
                        <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl">
                          <Sparkles className="inline mr-2 text-purple-600" />
                          <strong>Premium Package: Full-Board Dining Included</strong>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { type: 'Vegetarian', rate: 4500 },
                            { type: 'Vegan', rate: 4800 },
                            { type: 'Seafood', rate: 7500 },
                            { type: 'All meat types', rate: 6500 }
                          ].map((meal) => (
                            <button
                              key={meal.type}
                              type="button"
                              onClick={() =>
                                updateCustomizations({
                                  selectedMealType: meal.type
                                })
                              }
                              className={`p-3 rounded-xl border-2 ${
                                (customizations?.selectedMealType || 'Vegetarian') === meal.type
                                  ? 'border-purple-600 bg-purple-50'
                                  : 'border-gray-200'
                              }`}
                            >
                              <span className="block text-xs font-bold">
                                {meal.type}
                              </span>

                              <span className="block text-xs text-purple-700 mt-1">
                                {formatPrice(meal.rate, {
                                  normalizeLegacy: false
                                })}/day
                              </span>
                            </button>
                          ))}
                        </div>

                        {activePackage.mealOptions?.length > 0 && (
                          <div className="grid md:grid-cols-2 gap-3">
                            {activePackage.mealOptions.map((meal, index) => {
                              const selected =
                                customizations?.selectedMealOption === meal.name;

                              const extraCost =
                                meal.extraCostPerDayLKR ??
                                meal.extraCostPerDay ??
                                0;

                              return (
                                <label
                                  key={index}
                                  className={`p-4 rounded-xl border-2 cursor-pointer ${
                                    selected
                                      ? 'border-purple-600 bg-purple-50'
                                      : 'border-gray-200'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="plannerMealOption"
                                    checked={selected}
                                    onChange={() =>
                                      updateCustomizations({
                                        selectedMealOption: meal.name,
                                        ...(meal.mealType
                                          ? { selectedMealType: meal.mealType }
                                          : {})
                                      })
                                    }
                                    className="mr-2"
                                  />

                                  <strong className="text-sm">
                                    {meal.name}
                                  </strong>

                                  <span className="block text-xs mt-2">
                                    {extraCost > 0
                                      ? `+${formatPrice(extraCost)}/day`
                                      : 'Included'}
                                  </span>

                                  <p className="text-xs text-gray-500 mt-1">
                                    {meal.description}
                                  </p>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="space-y-8 animate-fadeIn">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h2 className="text-2xl font-bold">
                        3. Select Transportation Vehicle
                      </h2>

                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                        Selected: {formData.vehicleType}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500 mb-4">
                      Choose your preferred transportation.
                    </p>

                    <div className="grid md:grid-cols-2 gap-4">
                      {VEHICLE_OPTIONS.map((vehicle) => {
                        const selected =
                          formData.vehicleType === vehicle.type;

                        const IconComponent = vehicle.icon;

                        return (
                          <div
                            key={vehicle.type}
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                vehicleType: vehicle.type
                              }));

                              updateCustomizations({
                                vehicleType: vehicle.type
                              });
                            }}
                            className={`p-5 rounded-2xl border-2 cursor-pointer ${
                              selected
                                ? 'border-blue-600 bg-blue-50 shadow-md'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                                <IconComponent size={24} />
                              </div>

                              {selected && (
                                <Check
                                  size={20}
                                  className="text-blue-600"
                                />
                              )}
                            </div>

                            <h3 className="text-lg font-bold mt-3">
                              {vehicle.name}
                            </h3>

                            <p className="text-xs text-blue-700 font-semibold">
                              {vehicle.tag}
                            </p>

                            <p className="text-xs text-gray-600 mt-2">
                              {vehicle.description}
                            </p>

                            <div className="text-xs text-gray-700 mt-3 space-y-1">
                              <p>Capacity: {vehicle.capacity}</p>
                              <p>Luggage: {vehicle.luggage}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                      <Info size={16} className="inline mr-2" />
                      <strong>Routing Provider Note:</strong>
                      {' '}Public OpenStreetMap/OSRM routing uses a unified
                      motor-vehicle road network. Vehicle selection is used
                      for planner and pricing information.
                    </div>
                  </div>

                  {/* WEATHER */}
                  <div className="pt-5 border-t">
                    <label className="block text-sm font-semibold mb-2">
                      Weather & Climate Preference
                    </label>

                    <select
                      className="w-full p-3.5 border rounded-xl"
                      value={formData.weatherPreference}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          weatherPreference: e.target.value
                        })
                      }
                    >
                      <option value="Any">Any Weather</option>
                      <option value="Hot">
                        Tropical / Warm Beaches & Heritage
                      </option>
                      <option value="Cold">
                        Cool Mountain Highlands
                      </option>
                    </select>
                  </div>

                  {/* GUIDE RULES */}
                  <div className="pt-6 border-t">
                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                      <Compass size={20} className="text-blue-600" />
                      Tour Guide Arrangements
                    </h3>

                    {activePackage?.packageName === 'Basic' && (
                      <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl">
                        <AlertCircle className="inline mr-2 text-amber-600" />
                        <strong>Tour Guide is not included in Basic Package.</strong>
                      </div>
                    )}

                    {activePackage?.packageName === 'Standard' && (
                      <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between gap-3">
                          <div>
                            <h4 className="font-bold">
                              Tour Guide is Optional
                            </h4>
                            <p className="text-xs text-gray-600 mt-1">
                              Add a licensed tour guide to your journey.
                            </p>
                          </div>

                          <label className="flex items-center gap-3 bg-white p-3 rounded-xl border cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(customizations?.addGuide)}
                              onChange={(e) =>
                                updateCustomizations({
                                  addGuide: e.target.checked
                                })
                              }
                              className="w-5 h-5"
                            />

                            <span className="text-sm font-bold">
                              Add Tour Guide
                            </span>
                          </label>
                        </div>

                        {customizations?.addGuide &&
                          partnerGuides.length > 0 && (
                            <div>
                              <label className="block text-xs font-bold mb-2">
                                Select Registered Guide
                              </label>

                              <select
                                value={customizations?.selectedGuideId || ''}
                                onChange={(e) => {
                                  const guide = partnerGuides.find(
                                    (item) => item._id === e.target.value
                                  );

                                  updateCustomizations({
                                    selectedGuideId: e.target.value,
                                    selectedGuideRateLKR:
                                      guide?.dailyRateLKR || null
                                  });
                                }}
                                className="w-full p-3 border rounded-xl bg-white text-xs"
                              >
                                <option value="">
                                  Default Guide Allocation
                                </option>

                                {partnerGuides.map((guide) => (
                                  <option key={guide._id} value={guide._id}>
                                    {guide.name || guide.userId?.name}
                                    {' '}—{' '}
                                    {formatPrice(
                                      guide.dailyRateLKR ||
                                        guide.dailyRate
                                    )}/day
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                      </div>
                    )}

                    {activePackage?.packageName === 'Premium' && (
                      <div className="space-y-4">
                        <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl">
                          <Sparkles className="inline mr-2 text-purple-600" />
                          <strong>Dedicated Specialist Guide Included</strong>
                        </div>

                        <div className="grid md:grid-cols-2 gap-3">
                          {activePackage.guideOptions?.map((guide, index) => {
                            const selected =
                              customizations?.selectedGuideOption === guide.name;

                            return (
                              <label
                                key={index}
                                className={`p-4 rounded-xl border-2 cursor-pointer ${
                                  selected
                                    ? 'border-purple-600 bg-purple-50'
                                    : 'border-gray-200'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="plannerGuideOption"
                                  checked={Boolean(selected)}
                                  onChange={() =>
                                    updateCustomizations({
                                      selectedGuideOption: guide.name,
                                      selectedGuideId: ''
                                    })
                                  }
                                  className="mr-2"
                                />

                                <strong className="text-sm">
                                  {guide.name}
                                </strong>

                                <p className="text-xs text-gray-600 mt-2">
                                  {guide.specialty}
                                </p>

                                <p className="text-xs text-gray-500 mt-1">
                                  Languages: {guide.languages?.join(', ')}
                                </p>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <div className="space-y-8 animate-fadeIn">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">
                      4. Review & Investment Breakdown ({currency})
                    </h2>

                    <p className="text-sm text-gray-500">
                      Review your package selections and estimated costs.
                    </p>
                  </div>

                  {/* SUMMARY */}
                  <div className="bg-gray-50 rounded-2xl p-6 border space-y-4">
                    <div className="flex justify-between items-center border-b pb-4">
                      <div>
                        <span className="text-xs font-bold text-blue-700">
                          {activePackage?.packageName} Package
                        </span>

                        <h3 className="text-xl font-extrabold">
                          {activePackage?.packageName} Experience
                        </h3>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">
                          Duration & Party
                        </span>

                        <strong className="text-sm">
                          {formData.days} Days • {formData.travelers} Travelers
                        </strong>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <MapPin className="inline mr-2 text-emerald-600" />
                        <strong>Starting Gateway:</strong>
                        <p className="text-xs text-gray-600 ml-7">
                          {startLocation.name}
                        </p>
                      </div>

                      <div>
                        <Car className="inline mr-2 text-blue-600" />
                        <strong>Transport:</strong>
                        <p className="text-xs text-gray-600 ml-7">
                          {formData.vehicleType}
                        </p>
                      </div>

                      <div>
                        <Home className="inline mr-2 text-blue-600" />
                        <strong>Accommodation:</strong>
                        <p className="text-xs text-gray-600 ml-7">
                          {activePackage?.packageName === 'Basic'
                            ? 'Not Included'
                            : 'Partner Hotel'}
                        </p>
                      </div>

                      <div>
                        <Utensils className="inline mr-2 text-green-600" />
                        <strong>Meals:</strong>
                        <p className="text-xs text-gray-600 ml-7">
                          {activePackage?.packageName === 'Premium'
                            ? customizations?.selectedMealType || 'Vegetarian'
                            : 'Excluded by default'}
                        </p>
                      </div>

                      <div>
                        <Compass className="inline mr-2 text-purple-600" />
                        <strong>Tour Guide:</strong>
                        <p className="text-xs text-gray-600 ml-7">
                          {activePackage?.packageName === 'Premium' ||
                          customizations?.addGuide
                            ? 'Included / Selected'
                            : 'Not Included'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* COST BREAKDOWN */}
                  <div className="bg-white rounded-2xl border p-6 shadow-sm">
                    <h4 className="font-bold mb-4 flex items-center gap-2">
                      <Calculator size={18} className="text-green-600" />
                      Complete Dynamic Cost Breakdown ({currency})
                    </h4>

                    <div className="space-y-3 text-sm">
                      {[
                        {
                          label: 'Package Planning & Facilities',
                          value:
                            backendPricing?.breakdown?.packageCoordination?.totalLKR ??
                            currentCost.coordinationLKR
                        },
                        {
                          label: 'Transportation',
                          value:
                            backendPricing?.breakdown?.transportation?.totalLKR ??
                            currentCost.transportLKR
                        },
                        {
                          label: 'Accommodation',
                          value:
                            backendPricing?.breakdown?.accommodation?.totalLKR ??
                            currentCost.accommodationLKR
                        },
                        {
                          label: 'Meals',
                          value:
                            backendPricing?.breakdown?.meals?.totalLKR ??
                            currentCost.mealCostLKR
                        },
                        {
                          label: 'Tour Guide',
                          value:
                            backendPricing?.breakdown?.guide?.totalLKR ??
                            currentCost.guideCostLKR
                        }
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex justify-between py-2 border-b border-gray-100"
                        >
                          <span className="text-gray-600">
                            {item.label}
                          </span>

                          <strong>
                            {formatPrice(item.value, {
                              normalizeLegacy: false
                            })}
                          </strong>
                        </div>
                      ))}

                      <div className="flex justify-between pt-3 text-lg font-extrabold">
                        <div>
                          <span>Total Estimated Cost ({currency})</span>

                          <span className="block text-xs font-normal text-gray-500">
                            Cost Per Person:{' '}
                            {formatPrice(displayPerPersonLKR, {
                              normalizeLegacy: false
                            })}
                          </span>
                        </div>

                        <span className="text-2xl text-green-600">
                          {formatPrice(displayTotalLKR, {
                            normalizeLegacy: false
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* WIZARD NAVIGATION */}
              <div className="flex justify-between pt-6 border-t">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-6 py-2.5 border rounded-xl font-semibold text-sm"
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-7 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm"
                  >
                    Next Step →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold disabled:opacity-50"
                  >
                    {loading
                      ? 'Generating Itinerary & Route...'
                      : 'Generate Complete Plan & Route ✓'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* RESULTS VIEW */
            <div className="space-y-8 animate-fadeIn">

              {/* TRIP SUMMARY */}
              <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between gap-6">
                <div>
                  <span className="bg-blue-500/40 text-blue-200 text-xs font-bold px-3 py-1 rounded-full">
                    {results.packageSnapshot?.packageName} Package
                  </span>

                  <p className="text-xs text-blue-200 mt-3">
                    {formData.days} Days • {formData.travelers} Travelers
                  </p>

                  <h2 className="text-3xl font-extrabold mt-2">
                    Your Personalized Sri Lankan Tour
                  </h2>

                  <p className="text-blue-200 text-sm mt-2">
                    Route planned from{' '}
                    <strong>{results.startLocation?.name}</strong>
                    {' '}with GPS-enabled road routing.
                  </p>
                </div>

                <div className="bg-white/10 p-5 rounded-2xl border border-white/20 text-center min-w-[220px]">
                  <span className="text-xs uppercase text-blue-200">
                    Total Estimated Cost ({currency})
                  </span>

                  <div className="text-4xl font-extrabold text-green-400 my-2">
                    {formatPrice(results.estimatedCostLKR, {
                      normalizeLegacy: false
                    })}
                  </div>
                </div>
              </div>

              {/* PACKAGE CONFIRMATION */}
              <div className="bg-white rounded-2xl border p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4 pb-2 border-b flex items-center gap-2">
                  <ShieldCheck size={20} className="text-green-600" />
                  Confirmed Package Rules & Inclusions
                </h3>

                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <strong className="block mb-1">
                      <Car size={14} className="inline mr-1" />
                      Transport
                    </strong>
                    Dedicated {formData.vehicleType}
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl">
                    <strong className="block mb-1">
                      <Home size={14} className="inline mr-1" />
                      Accommodation
                    </strong>
                    {results.packageSnapshot?.packageName === 'Basic'
                      ? 'Excluded'
                      : 'Partner Hotel'}
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl">
                    <strong className="block mb-1">
                      <Utensils size={14} className="inline mr-1" />
                      Meals
                    </strong>
                    {results.packageSnapshot?.packageName === 'Premium'
                      ? results.customizationsSnapshot?.selectedMealType || 'Vegetarian'
                      : 'Excluded by default'}
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl">
                    <strong className="block mb-1">
                      <Compass size={14} className="inline mr-1" />
                      Tour Guide
                    </strong>
                    {results.packageSnapshot?.packageName === 'Premium' ||
                    results.customizationsSnapshot?.addGuide
                      ? 'Selected'
                      : 'Not Included'}
                  </div>
                </div>
              </div>

              {/* INTERACTIVE ROUTE MAP */}
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Navigation size={22} className="text-blue-600" />
                      Interactive Tour Route & Navigation Map
                    </h3>

                    <p className="text-xs text-gray-500 mt-1">
                      GPS road route from {startLocation.name}.
                    </p>
                  </div>

                  {totalDistance && (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                      Total: {totalDistance} • {totalDuration}
                    </span>
                  )}
                </div>

                {/* ROUTE STATS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-4 bg-white rounded-2xl border flex items-center gap-3">
                    <Route size={20} className="text-blue-600" />

                    <div>
                      <span className="text-xs text-gray-500 block">
                        Total Distance
                      </span>

                      <strong>{totalDistance || 'Not available'}</strong>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border flex items-center gap-3">
                    <Clock size={20} className="text-indigo-600" />

                    <div>
                      <span className="text-xs text-gray-500 block">
                        Estimated Duration
                      </span>

                      <strong>{totalDuration || 'Not available'}</strong>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border flex items-center gap-3">
                    <Car size={20} className="text-amber-600" />

                    <div>
                      <span className="text-xs text-gray-500 block">
                        Vehicle
                      </span>

                      <strong>{formData.vehicleType}</strong>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border flex items-center gap-3">
                    <MapPin size={20} className="text-emerald-600" />

                    <div>
                      <span className="text-xs text-gray-500 block">
                        Starting Hub
                      </span>

                      <strong className="text-xs">
                        {startLocation.name}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* TRAFFIC NOTICE */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
                  <AlertCircle size={18} className="text-amber-600" />

                  <div>
                    <strong>Traffic Information</strong>

                    <p className="mt-1">
                      {trafficStatus?.statusMessage ||
                        'Live traffic information is currently unavailable. Displaying standard estimated road travel duration.'}
                    </p>

                    <p className="mt-1">
                      Estimated Travel Time: {totalDuration || 'Not available'}
                    </p>
                  </div>
                </div>

                {/* ROUTE ERRORS */}
                {routeError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                    {routeError}
                  </div>
                )}

                {/* ALTERNATIVE ROUTES */}
                {alternativeRoutes.length > 1 && (
                  <div className="p-4 bg-white rounded-2xl border shadow-sm space-y-3">
                    <strong className="text-sm">
                      Available Route Corridors ({alternativeRoutes.length})
                    </strong>

                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {alternativeRoutes.map((route, index) => {
                        const selected = selectedRouteIndex === index;

                        return (
                          <div
                            key={route.id || index}
                            onClick={() =>
                              handleSelectAlternativeRoute(index)
                            }
                            className={`p-3 rounded-xl border-2 cursor-pointer ${
                              selected
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="flex justify-between">
                              <strong className="text-xs">
                                {route.label || `Route ${index + 1}`}
                              </strong>

                              {selected && (
                                <Check size={14} className="text-blue-600" />
                              )}
                            </div>

                            <p className="text-xs mt-2">
                              Distance: {route.distanceKm}
                            </p>

                            <p className="text-xs mt-1">
                              Duration: {route.durationFormatted}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* MAP */}
                <div className="bg-white rounded-2xl shadow-lg border overflow-hidden relative z-0">
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

                {/* ROUTE LEGS */}
                {routeLegs.length > 0 && (
                  <div className="bg-white rounded-2xl border p-6 shadow-sm space-y-4">
                    <h4 className="font-bold border-b pb-2 flex items-center gap-2">
                      <Route size={18} className="text-blue-600" />
                      Route Breakdown
                    </h4>

                    {routeLegs.map((leg, index) => (
                      <div
                        key={index}
                        className="py-3 border-b last:border-0 flex flex-col sm:flex-row justify-between gap-2 text-xs"
                      >
                        <div>
                          <strong>
                            {leg.fromName} → {leg.toName}
                          </strong>

                          <span className="block text-gray-400 mt-1">
                            {leg.summary || 'Connecting road corridor'}
                          </span>
                        </div>

                        <div className="flex gap-3 font-bold">
                          <span>{leg.distanceKm}</span>
                          <span>{leg.durationFormatted}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* RECALCULATE ROUTE */}
                <div className="p-5 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-sm flex items-center gap-2">
                      <RefreshCw size={16} className="text-blue-600" />
                      Recalculate Route or Switch Vehicle
                    </h4>

                    <p className="text-xs text-gray-600 mt-1">
                      Change the starting location or vehicle and recalculate.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <select
                      className="p-2 border rounded-xl text-xs bg-white"
                      value={startLocation.id || startLocation.name}
                      onChange={(e) => {
                        const selected = presetLocations.find(
                          (item) =>
                            (item.id || item.name) === e.target.value
                        );

                        if (selected) setStartLocation(selected);
                      }}
                    >
                      {presetLocations.map((location) => (
                        <option
                          key={location.id || location.name}
                          value={location.id || location.name}
                        >
                          {location.name}
                        </option>
                      ))}
                    </select>

                    <select
                      className="p-2 border rounded-xl text-xs bg-white"
                      value={formData.vehicleType}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          vehicleType: e.target.value
                        }));

                        updateCustomizations({
                          vehicleType: e.target.value
                        });
                      }}
                    >
                      {VEHICLE_OPTIONS.map((vehicle) => (
                        <option key={vehicle.type} value={vehicle.type}>
                          {vehicle.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleRecalculateRoute}
                      disabled={loadingRoute}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                    >
                      {loadingRoute ? 'Recalculating...' : 'Recalculate Route'}
                    </button>
                  </div>
                </div>
              </div>

              {/* DESTINATION ITINERARY */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between gap-2 border-b pb-2">
                  <h3 className="text-xl font-bold">
                    Destinations on Your Schedule
                  </h3>

                  <span className="text-xs text-gray-500">
                    Use ↑ / ↓ to reorder stops and recalculate your route.
                  </span>
                </div>

                {results.destinations.length === 0 ? (
                  <p className="text-gray-500 py-4">
                    No destinations matched your criteria. Please modify
                    your preferences.
                  </p>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.destinations.map((destination, index) => (
                      <div
                        key={destination._id}
                        className="relative"
                      >
                        <div className="absolute top-2 left-2 z-20 flex items-center gap-1">
                          <span className="bg-blue-900 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                            Day {index + 1}
                          </span>

                          {results.destinations.length > 1 && (
                            <div className="flex bg-white rounded-md shadow border overflow-hidden">
                              <button
                                type="button"
                                onClick={() =>
                                  handleReorderDestination(index, 'up')
                                }
                                disabled={index === 0 || loadingRoute}
                                title="Move stop earlier"
                                className="p-1 hover:bg-blue-50 disabled:opacity-30"
                              >
                                <ArrowUp size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleReorderDestination(index, 'down')
                                }
                                disabled={
                                  index === results.destinations.length - 1 ||
                                  loadingRoute
                                }
                                title="Move stop later"
                                className="p-1 border-l hover:bg-blue-50 disabled:opacity-30"
                              >
                                <ArrowDown size={13} />
                              </button>
                            </div>
                          )}
                        </div>

                        <DestinationCard destination={destination} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SAVE NOTICE */}
              {savedNotice && (
                <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-bold flex items-center gap-2">
                  <Check size={16} className="text-green-600" />
                  {savedNotice}
                </div>
              )}

              {/* FOOTER BUTTONS */}
              <div className="pt-6 border-t flex flex-wrap gap-4 justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    setResults(null);
                    setSavedNotice('');
                    setStep(1);
                  }}
                  className="px-6 py-2.5 border rounded-xl text-gray-700 font-semibold text-sm"
                >
                  ← Modify Plan Preferences
                </button>

                <button
                  type="button"
                  onClick={handleSavePlanToDatabase}
                  disabled={savingPlan}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg text-sm disabled:opacity-50"
                >
                  {savingPlan
                    ? 'Saving Itinerary...'
                    : 'Save Itinerary & Pricing to Profile'}
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
