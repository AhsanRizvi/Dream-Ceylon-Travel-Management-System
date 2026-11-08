
import React, { useState, useEffect, useContext, useRef } from 'react';

import { AuthContext } from '../context/AuthContext';
import { PackageContext } from '../context/PackageContext';
import { useCurrency } from '../context/CurrencyContext';

import {
  useNavigate,
  useSearchParams,
  Link
} from 'react-router-dom';

import api, {
  getPresetStartLocations,
  geocodeLocation,
  calculateMultiRoute
} from '../services/api';

import RecommendationCard from '../components/RecommendationCard';
import DestinationCard from '../components/DestinationCard';
import ItineraryManager from '../components/ItineraryManager';
import TravelCalendar from '../components/TravelCalendar';
import SavedPlansList from '../components/SavedPlansList';
import MapView from '../components/MapView';

import {
  Car,
  Home,
  Utensils,
  Compass,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Info,
  ChevronRight,
  DollarSign,
  Calendar as CalendarIcon,
  Sliders,
  MapPin,
  ArrowUp,
  ArrowDown,
  Trash2,
  FolderOpen,
  CheckCircle2,
  Star,
  Clock,
  Sun,
  Navigation,
  Users,
  CloudSun,
  Mountain,
  Trees,
  Waves,
  Bike,
  Calculator,
  Route,
  RefreshCw,
  Search
} from 'lucide-react';

/**
 * Smart Ceylon Journey Planner
 * Module 2: Maps, Routes and Transportation
 */

const ENVIRONMENT_OPTIONS = [
  {
    name: 'Seaside',
    desc: 'Golden beaches, surf bays & coastal forts',
    icon: Waves
  },
  {
    name: 'Forest and Nature',
    desc: 'Rainforests, cloud forests & wildlife parks',
    icon: Trees
  },
  {
    name: 'Hiking',
    desc: 'Scenic mountain peaks, rock fortresses & trails',
    icon: Compass
  },
  {
    name: 'Mountains',
    desc: 'Misty tea highlands & cool hill-country valleys',
    icon: Mountain
  },
  {
    name: 'Waterfalls',
    desc: 'Cascading highland falls & crystal streams',
    icon: Sparkles
  },
  {
    name: 'Lakes',
    desc: 'Sacred Kandy Lake, highland reservoirs & lagoons',
    icon: Waves
  },
  {
    name: 'Plains',
    desc: 'Open safari plains, plateaus & heritage gardens',
    icon: Sun
  }
];

const MEAL_OPTIONS = [
  {
    name: 'Vegetarian',
    desc: 'Plant-based & dairy vegetarian curries'
  },
  {
    name: 'Vegan',
    desc: '100% plant-based organic Sri Lankan & tropical fare'
  },
  {
    name: 'Seafood',
    desc: 'Fresh Indian Ocean crab, prawns & coastal catch'
  },
  {
    name: 'All meat types',
    desc: 'Full Sri Lankan & international culinary variety'
  }
];

const WEATHER_OPTIONS = [
  {
    name: 'Cool',
    desc: 'Misty hill country (14°C–22°C) — Nuwara Eliya, Ella'
  },
  {
    name: 'Hot',
    desc: 'Sunny tropical coasts & ancient plains (27°C–32°C)'
  },
  {
    name: 'Cloudy',
    desc: 'Mild overcast mountain & central highland breeze'
  }
];

const TRANSPORT_OPTIONS = [
  {
    name: 'Motorcycle',
    desc: '1–2 riders • Agile scenic touring',
    maxTravelers: 2
  },
  {
    name: 'Car',
    desc: '1–3 passengers • Private A/C Sedan',
    maxTravelers: 4
  },
  {
    name: 'Van',
    desc: '4–12+ passengers • Spacious A/C Passenger Van',
    maxTravelers: 50
  }
];

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

  const [searchParams] = useSearchParams();
  const mapSectionRef = useRef(null);

  // Active workspace tab
  // preferences | recommendations | schedule | calendar | saved
  const initialTab = searchParams.get('tab') || 'preferences';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Main wizard states
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [results, setResults] = useState(null);

  // Catalog, packages and partner data
  const [availablePackages, setAvailablePackages] = useState([]);
  const [allDestinations, setAllDestinations] = useState([]);
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

  // Default tomorrow date string (YYYY-MM-DD)
  const defaultTomorrow = new Date(Date.now() + 86400000)
    .toISOString()
    .split('T')[0];

  // Tourist Preferences State
  const [formData, setFormData] = useState({
    travelDays: 3,
    travelers: 2,
    startDate: defaultTomorrow,
    mealType: 'All meat types',
    environments: ['Mountains', 'Hiking', 'Waterfalls'],
    weatherPreference: 'Cool',
    transportation: 'Car',
    guideRequirement: 'Not required',
    packageLevel: selectedPackage?.packageName || 'Standard'
  });

  // Rule-based Scoring Weights
  const [showWeightsConfig, setShowWeightsConfig] = useState(false);
  const [scoringWeights, setScoringWeights] = useState({
    interest: 40,
    proximity: 20,
    rating: 15,
    popularity: 10,
    weather: 10,
    visitTime: 5
  });

  // Validation & Status Feedback
  const [validationError, setValidationError] = useState('');
  const [statusBanner, setStatusBanner] = useState(null);

  // Recommendations & Selected Destinations
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedDestinations, setSelectedDestinations] = useState([]);
  const [focusedMapDestination, setFocusedMapDestination] = useState(null);
  const [detailModalDest, setDetailModalDest] = useState(null);

  // Day-by-Day Itinerary State
  const [itineraryData, setItineraryData] = useState(null);
  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [savingItinerary, setSavingItinerary] = useState(false);

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

  // Saved Travel Plans State
  const [savedPlans, setSavedPlans] = useState([]);
  const [loadingSavedPlans, setLoadingSavedPlans] = useState(false);

  // Route Error State
  const [routeError, setRouteError] = useState(null);

  // Load Packages, All Destinations, Saved Preferences, and Saved Plans on mount
  useEffect(() => {
    const initPlannerData = async () => {
      try {
        const [pkgRes, destRes] = await Promise.all([
          api.get('/packages'),
          api.get('/destinations')
        ]);

        const pkgList = pkgRes.data?.data || pkgRes.data || [];
        const order = { Basic: 1, Standard: 2, Premium: 3 };
        pkgList.sort((a, b) => (order[a.packageName] || 9) - (order[b.packageName] || 9));
        setAvailablePackages(pkgList);

        if (!selectedPackage && pkgList.length > 0) {
          const defaultPkg = pkgList.find((p) => p.packageName === 'Standard') || pkgList[0];
          selectPackage(defaultPkg);
        }

        const destList = destRes.data?.data || destRes.data || [];
        setAllDestinations(Array.isArray(destList) ? destList : []);
      } catch (err) {

        console.error('Error initializing planner catalog:', err);
      }
    };

    initPlannerData();
  }, []);

  // Load user's saved preferences and saved itineraries when logged in
  const fetchSavedPlans = async () => {
    if (!user) return;
    setLoadingSavedPlans(true);
    try {
      const res = await api.get('/itineraries');
      setSavedPlans(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load saved itineraries:', err);
    } finally {
      setLoadingSavedPlans(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSavedPlans();
      api
        .get('/planner/preferences')
        .then((res) => {
          const prof = res.data?.data;
          if (prof) {
            setFormData((prev) => ({
              ...prev,
              travelDays: prof.travelDays || prev.travelDays,
              travelers: prof.travelers || prof.groupSize || prev.travelers,
              mealType: prof.mealType || prev.mealType,
              environments:
                Array.isArray(prof.environments) && prof.environments.length > 0
                  ? prof.environments
                  : Array.isArray(prof.interests) && prof.interests.length > 0
                    ? prof.interests
                    : prev.environments,
              weatherPreference: prof.weatherPreference || prev.weatherPreference,
              transportation: prof.transportation || prev.transportation,
              guideRequirement: prof.guideRequirement || prev.guideRequirement,
              packageLevel: prof.packageLevel || prev.packageLevel
            }));
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const activePackage =
    availablePackages.find((p) => p.packageName === formData.packageLevel) ||
    selectedPackage ||
    availablePackages[0] ||
    null;

  const handleSelectPackageLevel = (pkg) => {
    selectPackage(pkg);
    const nextGuideReq =
      pkg.packageName === 'Premium'
        ? 'Required'
        : pkg.packageName === 'Basic'
          ? 'Not required'
          : formData.guideRequirement;

    if (pkg.packageName === 'Standard') {
      updateCustomizations({ addGuide: nextGuideReq === 'Required' });
    }

    setFormData((prev) => ({
      ...prev,
      packageLevel: pkg.packageName,
      guideRequirement: nextGuideReq
    }));
  };

  const toggleEnvironment = (envName) => {
    setValidationError('');
    setFormData((prev) => {
      const exists = prev.environments.includes(envName);
      const next = exists
        ? prev.environments.filter((e) => e !== envName)
        : [...prev.environments, envName];
      return { ...prev, environments: next };
    });
  };

  // Validate preferences strictly before generating recommendations
  const validateForm = () => {
    const days = Number(formData.travelDays);
    if (!Number.isInteger(days) || days < 1 || days > 30) {
      setValidationError('Please enter a valid trip duration between 1 and 30 days.');
      return false;
    }
    const travelers = Number(formData.travelers);
    if (!Number.isInteger(travelers) || travelers < 1 || travelers > 50) {
      setValidationError('Number of travellers must be at least 1 (maximum 50).');
      return false;
    }
    if (!formData.mealType) {
      setValidationError('Please select a preferred meal type.');
      return false;
    }
    if (!Array.isArray(formData.environments) || formData.environments.length === 0) {
      setValidationError('Please select at least one preferred travel environment.');
      return false;
    }
    if (!formData.weatherPreference) {
      setValidationError('Please select your preferred weather.');
      return false;
    }
    if (!formData.transportation) {
      setValidationError('Please select your preferred transportation mode.');
      return false;
    }
    if (!formData.guideRequirement) {
      setValidationError('Please select whether a tour guide is required.');
      return false;
    }
    if (!formData.packageLevel) {
      setValidationError('Please select a package level (Basic, Standard, or Premium).');
      return false;
    }
    setValidationError('');
    return true;
  };

  // Fetch OSRM Road Route Polyline for a list of destinations
  const fetchRoadRoute = async (dests) => {
    if (!Array.isArray(dests) || dests.length < 2) {
      setRouteCoordinates([]);
      setTotalDistance('');
      setTotalDuration('');
      return;
    }

    setLoadingRoute(true);
    let aggregatedCoordinates = [];
    let totalDist = 0;
    let totalDur = 0;

    try {
      const vehicleParam =
        formData.transportation === 'Motorcycle'
          ? 'bike'
          : formData.transportation.toLowerCase();

      for (let i = 0; i < dests.length - 1; i++) {
        const origin = dests[i];
        const dest = dests[i + 1];
        if (!origin.latitude || !dest.latitude) continue;

        const res = await api.get('/maps/route', {
          params: {
            originLat: origin.latitude,
            originLng: origin.longitude,
            destLat: dest.latitude,
            destLng: dest.longitude,
            vehicleType: vehicleParam
          }
        });

        if (res.data?.success && res.data.data) {
          const routeData = res.data.data;
          totalDist += routeData.distance || 0;
          totalDur += routeData.duration || 0;
          const leafletCoords = (routeData.coordinates || []).map((coord) => [
            coord[1],
            coord[0]
          ]);
          aggregatedCoordinates = [...aggregatedCoordinates, ...leafletCoords];
        }
      }

      setRouteCoordinates(aggregatedCoordinates);
      if (totalDist > 0) {
        setTotalDistance(`${(totalDist / 1000).toFixed(1)} km`);
        const hours = Math.floor(totalDur / 3600);
        const minutes = Math.floor((totalDur % 3600) / 60);
        setTotalDuration(`${hours}h ${minutes}m`);
      }
    } catch (err) {
      console.error('OSRM route calculation fallback:', err);
    } finally {
      setLoadingRoute(false);
    }
  };

  // STEP 1 -> STEP 2: Submit Preferences & Generate Smart Recommendations
  const handleGetRecommendations = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    if (!user) {
      setStatusBanner({
        type: 'error',
        text: 'Please log in to save preferences and generate personalized recommendations.'
      });
      navigate('/login');
      return;
    }

    setLoadingRecs(true);
    setStatusBanner(null);

    try {
      const res = await api.post('/planner/recommendations', {
        ...formData,
        weights: scoringWeights
      });

      const recList = res.data?.data || [];
      setRecommendations(recList);

      // Pre-select the top N recommended destinations (up to travelDays + 1) so the user has an immediate curated set
      const initialCount = Math.min(recList.length, Math.max(2, Number(formData.travelDays) + 1));
      const autoSelected = recList.slice(0, initialCount).map((r) => r.destination);
      setSelectedDestinations(autoSelected);

      setActiveTab('recommendations');
      setStatusBanner({
        type: 'success',
        text: `Found ${recList.length} personalized Sri Lankan destination(s) matching your preferences!`
      });
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Failed to generate destination recommendations.';
      setValidationError(msg);
    } finally {
      setLoadingRecs(false);
    }
  };

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
            packages.find((p) => p.packageName === 'Standard') || packages[0];

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


    setLoadingRecs(true);
    setStatusBanner(null);

    try {
      const res = await api.post('/planner/recommendations', {
        ...formData,
        weights: scoringWeights
      });

      const recList = res.data?.data || [];
      setRecommendations(recList);

      // Pre-select the top N recommended destinations (up to travelDays + 1) so the user has an immediate curated set
      const initialCount = Math.min(recList.length, Math.max(2, Number(formData.travelDays) + 1));
      const autoSelected = recList.slice(0, initialCount).map((r) => r.destination);
      setSelectedDestinations(autoSelected);

      setActiveTab('recommendations');
      setStatusBanner({
        type: 'success',
        text: `Found ${recList.length} personalized Sri Lankan destination(s) matching your preferences!`
      });
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Failed to generate destination recommendations.';
      setValidationError(msg);
    } finally {
      setLoadingRecs(false);
    }
  };

  // Toggle destination in Selected Trip Stops
  const handleToggleSelectDestination = (dest) => {
    setSelectedDestinations((prev) => {
      const exists = prev.some((d) => d._id === dest._id);
      if (exists) {
        return prev.filter((d) => d._id !== dest._id);
      }
      return [...prev, dest];
    });
  };

  // Reorder selected destinations in Trip Tray
  const handleMoveSelectedStop = (index, direction) => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= selectedDestinations.length) return;
    const copy = [...selectedDestinations];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setSelectedDestinations(copy);
  };

  // View a specific destination on the interactive map
  const handleViewOnMap = (dest) => {
    setFocusedMapDestination(dest);
    if (mapSectionRef.current) {
      mapSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // STEP 2 -> STEP 3: Generate Day-by-Day Itinerary from Selected Destinations
  const handleGenerateSchedule = async ({ saveImmediately = false, preserveOrder = false } = {}) => {
    if (selectedDestinations.length === 0) {
      setStatusBanner({
        type: 'error',
        text: 'Please select at least one destination to generate your day-by-day itinerary.'
      });
      return;
    }

    setGeneratingSchedule(true);
    setStatusBanner(null);

    try {
      const costCalc = calculatePackageCost(
        activePackage,
        formData.travelDays,
        formData.travelers,
        customizations
      );

      const res = await api.post('/itineraries/generate', {
        destinations: selectedDestinations,
        days: Number(formData.travelDays),
        travelers: Number(formData.travelers),
        startDate: formData.startDate,
        preserveOrder,
        saveToDb: saveImmediately,
        title: `Sri Lanka ${formData.travelDays}-Day ${formData.packageLevel} Tour`,
        preferences: {
          ...formData,
          selectedMealOption: customizations.selectedMealOption,
          selectedGuideOption: customizations.selectedGuideOption,
          addGuide: customizations.addGuide
        },
        costEstimate: costCalc
      });

      const generatedPlan = res.data?.data;
      setItineraryData({
        ...generatedPlan,
        costEstimate: costCalc
      });

      const orderedDests =
        generatedPlan.orderedDestinations ||
        (Array.isArray(generatedPlan.stops) && typeof generatedPlan.stops[0] === 'object'
          ? generatedPlan.stops
          : selectedDestinations);

      fetchRoadRoute(orderedDests);

      if (saveImmediately) {
        fetchSavedPlans();
        setStatusBanner({
          type: 'success',
          text: 'Recommended travel plan generated and saved to your profile!'
        });
      } else {
        setStatusBanner({
          type: 'success',
          text: `Generated practical ${formData.travelDays}-day schedule across ${selectedDestinations.length} destination(s).`
        });
      }

      setActiveTab('schedule');
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text: err.response?.data?.error || 'Failed to generate day-by-day schedule.'
      });
    } finally {
      setGeneratingSchedule(false);
    }
  };

  // Save or Update Itinerary in MongoDB
  const handleSaveItinerary = async () => {
    if (!itineraryData) return;
    if (!user) {
      navigate('/login');
      return;
    }

    setSavingItinerary(true);
    setStatusBanner(null);

    try {
      const costCalc = calculatePackageCost(
        activePackage,
        itineraryData.days || formData.travelDays,
        itineraryData.travelers || formData.travelers,
        customizations
      );

      // Extract unique destination IDs from visit activities or stops
      const visitIds = [];
      (itineraryData.dailyItinerary || []).forEach((d) => {
        (d.activities || []).forEach((act) => {
          if (act.destinationId && !visitIds.includes(act.destinationId.toString())) {
            visitIds.push(act.destinationId.toString());
          }
        });
      });

      const payload = {
        title: itineraryData.title || `Sri Lanka ${formData.travelDays}-Day Smart Tour`,
        days: itineraryData.dailyItinerary?.length || Number(formData.travelDays),
        travelers: Number(formData.travelers),
        stops: visitIds.length > 0 ? visitIds : selectedDestinations.map((d) => d._id),
        dates: itineraryData.dates,
        transportType: formData.transportation,
        preferences: {
          ...formData,
          selectedMealOption: customizations.selectedMealOption,
          selectedGuideOption: customizations.selectedGuideOption,
          addGuide: customizations.addGuide
        },
        dailyItinerary: itineraryData.dailyItinerary,
        costEstimate: costCalc,
        routeData: {
          totalDistance,
          totalDuration
        },
        status: 'Saved'
      };

      let res;
      if (itineraryData._id) {
        res = await api.put(`/itineraries/${itineraryData._id}`, payload);
      } else {
        res = await api.post('/itineraries', payload);
      }

      const savedDoc = res.data?.data;
      setItineraryData(savedDoc);
      await fetchSavedPlans();

      setStatusBanner({
        type: 'success',
        text: itineraryData._id
          ? 'Your itinerary changes have been saved to MongoDB!'
          : 'Your personalized itinerary has been saved to your profile!'
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text: err.response?.data?.error || 'Failed to save itinerary.'
      });
    } finally {
      setSavingItinerary(false);
    }
  };

  // Load a saved plan into the active editor or calendar
  const handleLoadSavedPlan = (plan, targetTab = 'schedule') => {
    setItineraryData(plan);
    if (Array.isArray(plan.stops) && plan.stops.length > 0 && typeof plan.stops[0] === 'object') {
      setSelectedDestinations(plan.stops);
      fetchRoadRoute(plan.stops);
    }
    if (plan.preferences) {
      setFormData((prev) => ({
        ...prev,
        travelDays: plan.days || prev.travelDays,
        travelers: plan.travelers || prev.travelers,
        mealType: plan.preferences.mealType || prev.mealType,
        environments:
          plan.preferences.environments?.length > 0
            ? plan.preferences.environments
            : prev.environments,
        weatherPreference: plan.preferences.weatherPreference || prev.weatherPreference,
        transportation: plan.preferences.transportation || plan.transportType || prev.transportation,
        guideRequirement: plan.preferences.guideRequirement || prev.guideRequirement,
        packageLevel: plan.preferences.packageLevel || prev.packageLevel
      }));
    }
    setActiveTab(targetTab);
    setStatusBanner({
      type: 'success',
      text: `Loaded "${plan.title}" into your workspace.`
    });
  };

  // Delete a saved plan
  const handleDeleteSavedPlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this saved travel plan?')) return;
    try {
      await api.delete(`/itineraries/${planId}`);
      if (itineraryData?._id === planId) {
        setItineraryData(null);
      }
      await fetchSavedPlans();
      setStatusBanner({
        type: 'success',
        text: 'Travel plan deleted successfully.'
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text: err.response?.data?.error || 'Failed to delete travel plan.'
      });
    }
  };

  // Live package cost calculation
  const currentCost = calculatePackageCost(
    activePackage,
    formData.travelDays,
    formData.travelers,
    customizations
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 rounded-3xl p-8 text-white shadow-xl mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-yellow-300 bg-blue-800/70 px-3.5 py-1 rounded-full border border-yellow-400/30">
              Smart Lanka Tourism Planner
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold mt-2">
              Personalized Sri Lankan Vacation & Schedule Builder
            </h1>
            <p className="text-blue-200 text-sm mt-1 max-w-2xl">
              Enter your travel preferences, discover rule-scored Sri Lankan destinations, customize your day-by-day schedule, and plan around official Sri Lankan holidays.
            </p>
          </div>

          {/* Live Trip Summary Pill */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 min-w-[240px]">
            <div className="flex justify-between items-center text-xs text-blue-200 mb-1">
              <span>{formData.packageLevel} Package</span>
              <span>
                {formData.travelDays} Days • {formData.travelers} Guests
              </span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-400">
              ${currentCost.grandTotal}{' '}
              <span className="text-xs font-normal text-blue-200">Est. Total</span>
            </div>
            <div className="text-[11px] text-blue-200 mt-1 truncate">
              {formData.transportation} • {formData.mealType} • {formData.weatherPreference} Weather
            </div>
          </div>
        </div>

        {/* Navigation Tabs for the 5 Core Views */}
        <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-white/15">
          {[
            { id: 'preferences', label: '1. Tourist Preferences', icon: Sliders },
            {
              id: 'recommendations',
              label: `2. Recommendations (${recommendations.length})`,
              icon: Sparkles
            },
            {
              id: 'schedule',
              label: `3. Day-by-Day Schedule`,
              icon: Compass
            },
            { id: 'calendar', label: '4. Travel Calendar', icon: CalendarIcon },
            {
              id: 'saved',
              label: `5. Saved Plans (${savedPlans.length})`,
              icon: FolderOpen
            }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-yellow-400 text-slate-950 shadow-lg scale-[1.02]'
                    : 'bg-white/10 text-blue-100 hover:bg-white/20'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Global Notification / Status Banner */}
      {statusBanner && (
        <div
          className={`mb-6 p-4 rounded-2xl border flex justify-between items-center gap-4 text-sm font-medium ${
            statusBanner.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusBanner.type === 'error' ? (
              <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
            ) : (
              <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            )}
            <span>{statusBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* =====================================================================
          TAB 1: TOURIST PREFERENCES COLLECTION (MODULE 1.A)
         ===================================================================== */}
      {activeTab === 'preferences' && (
        <form
          onSubmit={handleGetRecommendations}
          className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 md:p-10 space-y-10"
        >
          {validationError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm flex items-center gap-2.5 font-semibold">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* SECTION 1: Trip Duration, Start Date & Travellers */}
          <div className="space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600">
                Step 1 of 5
              </span>
              <h2 className="text-2xl font-extrabold text-gray-900">
                Trip Duration, Dates & Party Size
              </h2>
              <p className="text-xs text-gray-500">
                Specify your number of travel days (1–30), planned start date, and number of travellers.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <label className="block text-xs font-extrabold uppercase text-gray-700 mb-2">
                  1. Number of Travel Days *
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={formData.travelDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      travelDays: e.target.value === '' ? '' : parseInt(e.target.value, 10)
                    })
                  }
                  className="w-full p-3 bg-white border border-gray-300 rounded-xl font-extrabold text-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[11px] text-gray-500 mt-1 block">
                  Valid range: 1 to 30 days
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <label className="block text-xs font-extrabold uppercase text-gray-700 mb-2">
                  2. Number of Travellers *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={formData.travelers}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      travelers: e.target.value === '' ? '' : parseInt(e.target.value, 10)
                    })
                  }
                  className="w-full p-3 bg-white border border-gray-300 rounded-xl font-extrabold text-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[11px] text-gray-500 mt-1 block">
                  Adults & accompanied guests (1–50)
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <label className="block text-xs font-extrabold uppercase text-gray-700 mb-2">
                  Planned Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full p-3 bg-white border border-gray-300 rounded-xl font-bold text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[11px] text-gray-500 mt-1 block">
                  Used for calendar & holiday alignment
                </span>

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
            </div>
          </div>


          {/* SECTION 2: Preferred Travel Environments (Multi-Select) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-gray-100 pb-3 gap-2">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600">
                  Step 2 of 5
                </span>
                <h2 className="text-2xl font-extrabold text-gray-900">
                  4. Preferred Travel Environments (Multiple Selection) *
                </h2>
                <p className="text-xs text-gray-500">
                  Select all Sri Lankan landscapes you want our recommendation engine to prioritize.
                </p>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                {formData.environments.length} Selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {ENVIRONMENT_OPTIONS.map((env) => {
                const Icon = env.icon;
                const isSelected = formData.environments.includes(env.name);
                return (
                  <button
                    key={env.name}
                    type="button"
                    onClick={() => toggleEnvironment(env.name)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 shadow-sm ring-2 ring-blue-100'
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full mb-2">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <Icon size={18} />
                      </div>
                      {isSelected && (
                        <span className="bg-blue-600 text-white rounded-full p-0.5">
                          <Check size={13} />
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">{env.name}</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{env.desc}</p>

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
                  </button>
                );
              })}
            </div>
          </div>


          {/* SECTION 3: Preferred Meal Type & Preferred Weather */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* 3. Preferred Meal Type */}
            <div className="space-y-3">
              <div className="border-b border-gray-100 pb-2">
                <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                  <Utensils size={18} className="text-blue-600" />
                  3. Preferred Meal Type *
                </h3>
                <p className="text-xs text-gray-500">
                  Used for daily itinerary dining recommendations and package meal planning.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {MEAL_OPTIONS.map((meal) => {
                  const isSelected = formData.mealType === meal.name;
                  return (
                    <div
                      key={meal.name}
                      onClick={() => setFormData({ ...formData, mealType: meal.name })}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-gray-900">{meal.name}</span>
                        {isSelected && <Check size={16} className="text-blue-600" />}

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
                      <p className="text-[11px] text-gray-500 mt-1">{meal.desc}</p>
                    </div>

                  );
                })}
              </div>
            </div>

            {/* 5. Preferred Weather */}
            <div className="space-y-3">
              <div className="border-b border-gray-100 pb-2">
                <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                  <CloudSun size={18} className="text-blue-600" />
                  5. Preferred Weather *
                </h3>
                <p className="text-xs text-gray-500">
                  Matches Sri Lanka’s climatic zones (Cool hill country vs Hot tropical coast).
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {WEATHER_OPTIONS.map((w) => {
                  const isSelected = formData.weatherPreference === w.name;
                  return (
                    <div
                      key={w.name}
                      onClick={() => setFormData({ ...formData, weatherPreference: w.name })}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-gray-900">{w.name}</span>
                        {isSelected && <Check size={16} className="text-blue-600" />}
                      </div>
                      <p className="text-[11px] text-gray-500 leading-snug">{w.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 4: Transportation & Guide Requirement */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* 6. Transportation */}
            <div className="space-y-3">
              <div className="border-b border-gray-100 pb-2">
                <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                  <Car size={18} className="text-blue-600" />
                  6. Transportation Mode *
                </h3>
                <p className="text-xs text-gray-500">
                  Determines road travel time estimates and route calculations.
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {TRANSPORT_OPTIONS.map((tr) => {
                  const isSelected = formData.transportation === tr.name;
                  return (
                    <div
                      key={tr.name}
                      onClick={() => setFormData({ ...formData, transportation: tr.name })}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-gray-900">{tr.name}</span>
                        {isSelected && <Check size={16} className="text-blue-600" />}
                      </div>
                      <p className="text-[11px] text-gray-500 leading-snug">{tr.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 7. Guide Requirement */}
            <div className="space-y-3">
              <div className="border-b border-gray-100 pb-2">
                <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                  <Compass size={18} className="text-blue-600" />
                  7. Tour Guide Requirement *
                </h3>
                <p className="text-xs text-gray-500">
                  Choose whether you require a licensed Sri Lankan tour guide.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  {
                    name: 'Required',
                    desc: 'Accompanied by a licensed National/Chauffeur Tour Guide'
                  },
                  {
                    name: 'Not required',
                    desc: 'Independent exploration with dedicated transport driver'
                  }
                ].map((gOpt) => {
                  const isSelected = formData.guideRequirement === gOpt.name;
                  return (
                    <div
                      key={gOpt.name}
                      onClick={() => {
                        setFormData({ ...formData, guideRequirement: gOpt.name });
                        updateCustomizations({ addGuide: gOpt.name === 'Required' });
                      }}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-gray-900">{gOpt.name}</span>
                        {isSelected && <Check size={16} className="text-blue-600" />}
                      </div>
                      <p className="text-[11px] text-gray-500 leading-snug">{gOpt.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 5: Package Level (Basic, Standard, Premium) */}
          <div className="space-y-4">
            <div className="border-b border-gray-100 pb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600">
                Step 5 of 5
              </span>
              <h2 className="text-2xl font-extrabold text-gray-900">
                8. Select Package Level (Basic, Standard, or Premium) *
              </h2>
              <p className="text-xs text-gray-500">
                Compatible with Module 3 Tour Packages & Pricing rules.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {availablePackages.map((pkg) => {
                const isSelected = formData.packageLevel === pkg.packageName;
                return (
                  <div
                    key={pkg._id}
                    onClick={() => handleSelectPackageLevel(pkg)}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-100'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full">
                        {pkg.badge || pkg.packageName}
                      </span>
                      {isSelected && <Check size={18} className="text-blue-600" />}
                    </div>

                    <h3 className="text-lg font-extrabold text-gray-900">
                      {pkg.packageName} Package

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
                    <div className="text-2xl font-extrabold text-gray-900 my-1">
                      ${pkg.baseCharge}{' '}
                      <span className="text-xs font-normal text-gray-500">/ person/day</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">{pkg.description}</p>
                  </div>
                );
              })}
            </div>
          </div>


          {/* Optional: Transparent Rule-Based Scoring Weights Configurator */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Sliders size={15} className="text-blue-600" />
                <span>
                  Recommendation Engine Scoring Weights (Interest {scoringWeights.interest}% • Proximity {scoringWeights.proximity}% • Rating {scoringWeights.rating}% • Popularity {scoringWeights.popularity}% • Weather {scoringWeights.weather}% • Visit Time {scoringWeights.visitTime}%)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowWeightsConfig(!showWeightsConfig)}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                {showWeightsConfig ? 'Hide Weights' : 'Customize Weights'}
              </button>
            </div>

            {showWeightsConfig && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-4 pt-3 border-t border-slate-200 text-xs">
                {[
                  { key: 'interest', label: 'Interest Match (%)' },
                  { key: 'proximity', label: 'Proximity (%)' },
                  { key: 'rating', label: 'Rating (%)' },
                  { key: 'popularity', label: 'Popularity (%)' },
                  { key: 'weather', label: 'Weather (%)' },
                  { key: 'visitTime', label: 'Visit Time (%)' }
                ].map((w) => (
                  <div key={w.key}>
                    <label className="block font-semibold text-gray-600 mb-1">{w.label}</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={scoringWeights[w.key]}
                      onChange={(e) =>
                        setScoringWeights({
                          ...scoringWeights,
                          [w.key]: Math.max(0, parseInt(e.target.value, 10) || 0)
                        })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg font-bold"
                    />

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
                ))}
              </div>
            )}
          </div>

          {/* Preference Confirmation Summary Box & Submit Button */}
          <div className="bg-blue-950 text-white p-6 rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-400">
                Selected Preference Summary
              </span>
              <h4 className="text-lg font-extrabold">
                {formData.travelDays || 0} Days • {formData.travelers || 0} Travellers •{' '}
                {formData.packageLevel} Package (${currentCost.grandTotal} Est.)
              </h4>
              <p className="text-xs text-blue-200">
                <strong>Environments:</strong>{' '}
                {formData.environments.length > 0
                  ? formData.environments.join(', ')
                  : 'None selected'}{' '}
                | <strong>Meal:</strong> {formData.mealType} | <strong>Weather:</strong>{' '}
                {formData.weatherPreference} | <strong>Transport:</strong>{' '}
                {formData.transportation} | <strong>Guide:</strong> {formData.guideRequirement}
              </p>
            </div>

            <button
              type="submit"
              disabled={loadingRecs}
              className="px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-extrabold rounded-xl shadow-lg transition flex items-center gap-2 whitespace-nowrap text-sm"
            >
              {loadingRecs ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
                  Scoring Destinations...
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Get Personalized Recommendations &rarr;
                </>
              )}
            </button>
          </div>
        </form>
      )}


      {/* =====================================================================
          TAB 2: RECOMMENDATION RESULTS & DESTINATION SELECTION (MODULE 1.B & 1.C)
         ===================================================================== */}
      {activeTab === 'recommendations' && (
        <div className="space-y-8">
          {/* Selected Trip Stops Tray & Reordering Bar */}
          <div className="bg-white rounded-3xl border-2 border-blue-600 p-6 shadow-md space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                  Your Selected Trip Stops ({selectedDestinations.length})
                </span>
                <h2 className="text-2xl font-extrabold text-gray-900 mt-1">
                  Organize Your Destinations Before Scheduling
                </h2>
                <p className="text-xs text-gray-500">
                  Add, remove, or reorder destinations below, then generate your day-by-day itinerary or save your recommended plan.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('preferences')}
                  className="px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-bold text-xs transition"
                >
                  &larr; Edit Preferences
                </button>

                <button
                  type="button"
                  disabled={selectedDestinations.length === 0 || generatingSchedule}
                  onClick={() => handleGenerateSchedule({ saveImmediately: true, preserveOrder: true })}
                  className="px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl font-bold text-xs transition disabled:opacity-40"
                >
                  Save Recommended Plan
                </button>

                <button
                  type="button"
                  disabled={selectedDestinations.length === 0 || generatingSchedule}
                  onClick={() => handleGenerateSchedule({ saveImmediately: false, preserveOrder: false })}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-40"
                >
                  <Compass size={15} />
                  {generatingSchedule
                    ? 'Building Schedule...'
                    : 'Generate Day-by-Day Itinerary →'}
                </button>
              </div>
            </div>

            {selectedDestinations.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-500">
                No destinations selected yet. Click <strong>"Add to Trip"</strong> on any recommended destination card below.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {selectedDestinations.map((dest, idx) => (
                  <div
                    key={dest._id}
                    className="flex items-center gap-2 bg-blue-50/80 border border-blue-200 rounded-xl px-3 py-2 text-xs"
                  >
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-gray-900">{dest.name}</span>
                    <span className="text-gray-500">({dest.district})</span>

                    <div className="flex items-center gap-1 ml-1 border-l border-blue-200 pl-1.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveSelectedStop(idx, 'up')}
                        title="Move Earlier"
                        className="text-gray-500 hover:text-blue-700 disabled:opacity-30"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === selectedDestinations.length - 1}
                        onClick={() => handleMoveSelectedStop(idx, 'down')}
                        title="Move Later"
                        className="text-gray-500 hover:text-blue-700 disabled:opacity-30"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSelectDestination(dest)}
                        title="Remove from Trip"
                        className="text-red-500 hover:text-red-700 ml-0.5"
                      >
                        <X size={14} />
                      </button>

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
                ))}
              </div>
            )}
          </div>


          {/* Recommendations Grid or Empty State */}
          {recommendations.length === 0 ? (
            <div className="text-center py-16 px-6 bg-white rounded-3xl border border-gray-200 shadow-sm max-w-xl mx-auto space-y-4">
              <Compass size={48} className="mx-auto text-gray-300" />
              <h3 className="text-xl font-extrabold text-gray-900">
                No Matching Destinations Found
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                We couldn’t find any destinations matching your exact combination of environments and weather. Try selecting additional travel environments in the Preferences tab.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('preferences')}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow"
              >
                Adjust Preferences
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="text-xl font-extrabold text-gray-900">
                  Ranked Destination Recommendations ({recommendations.length})
                </h3>
                <span className="text-xs text-gray-500">
                  Scored using Interest Match, Haversine Proximity, Rating, Popularity, Weather & Visit Time
                </span>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations.map((recItem) => {
                  const dest = recItem.destination;
                  const selIdx = selectedDestinations.findIndex((d) => d._id === dest._id);
                  const isSelected = selIdx !== -1;

                  return (
                    <RecommendationCard
                      key={dest._id}
                      item={recItem}
                      isSelected={isSelected}
                      selectionOrder={isSelected ? selIdx + 1 : null}
                      onToggleSelect={handleToggleSelectDestination}
                      onViewOnMap={handleViewOnMap}
                      onViewDetails={(d, rItem) => setDetailModalDest({ dest: d, rec: rItem })}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive Map Preview of Recommended & Selected Destinations */}
          {(selectedDestinations.length > 0 || focusedMapDestination) && (
            <div
              ref={mapSectionRef}
              className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                    <Navigation size={18} className="text-blue-600" />
                    {focusedMapDestination
                      ? `Map View: ${focusedMapDestination.name} (${focusedMapDestination.district})`
                      : 'Selected Trip Destinations Map'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Inspect GPS locations across Sri Lanka via OpenStreetMap.
                  </p>
                </div>
                {focusedMapDestination && (
                  <button
                    type="button"
                    onClick={() => setFocusedMapDestination(null)}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Show All Selected Stops ({selectedDestinations.length})
                  </button>
                )}
              </div>

              <div className="h-[420px] rounded-2xl overflow-hidden border border-gray-200">
                <MapView
                  destinations={
                    focusedMapDestination ? [focusedMapDestination] : selectedDestinations
                  }
                  routeCoordinates={focusedMapDestination ? [] : routeCoordinates}
                />

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
            </div>
          )}
        </div>
      )}


      {/* =====================================================================
          TAB 3: DAY-BY-DAY SCHEDULE & INTERACTIVE ITINERARY (MODULE 6.A & 6.B)
         ===================================================================== */}
      {activeTab === 'schedule' && (
        <ItineraryManager
          itineraryData={itineraryData}
          setItineraryData={setItineraryData}
          allDestinations={allDestinations}
          preferences={formData}
          routeCoordinates={routeCoordinates}
          totalDistance={totalDistance}
          totalDuration={totalDuration}
          loadingRoute={loadingRoute}
          saving={savingItinerary}
          regenerating={generatingSchedule}
          onSaveItinerary={handleSaveItinerary}
          onRegenerateItinerary={() =>
            handleGenerateSchedule({ saveImmediately: false, preserveOrder: true })
          }
          onOpenCalendar={() => setActiveTab('calendar')}
        />
      )}

      {/* =====================================================================
          TAB 4: TRAVEL CALENDAR & SRI LANKAN PUBLIC HOLIDAYS (MODULE 6.C)
         ===================================================================== */}
      {activeTab === 'calendar' && (
        <TravelCalendar
          activeItinerary={itineraryData}
          onSelectPlanToEdit={(planId) => {
            const found = savedPlans.find((p) => p._id === planId);
            if (found) handleLoadSavedPlan(found, 'schedule');
          }}
        />
      )}

      {/* =====================================================================
          TAB 5: SAVED TRAVEL PLANS VIEW
         ===================================================================== */}
      {activeTab === 'saved' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Private Travel Plans
              </span>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-0.5">
                My Saved Sri Lankan Itineraries ({savedPlans.length})
              </h2>
              <p className="text-xs text-gray-500">
                Persisted in MongoDB. Open any saved plan to customize its schedule or view it on the Travel Calendar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('preferences')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow transition"
            >
              + Create New Plan
            </button>
          </div>

          <SavedPlansList
            savedPlans={savedPlans}
            loading={loadingSavedPlans}
            onLoadPlan={(plan) => handleLoadSavedPlan(plan, 'schedule')}
            onViewInCalendar={(plan) => handleLoadSavedPlan(plan, 'calendar')}
            onDeletePlan={handleDeleteSavedPlan}
            onCreateNew={() => setActiveTab('preferences')}
          />
        </div>
      )}

      {/* Destination Details Modal from Recommendations */}
      {detailModalDest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-2xl w-full overflow-hidden">
            <div className="h-60 bg-slate-900 relative">
              <img
                src={detailModalDest.dest.image || detailModalDest.dest.imageUrl}
                alt={detailModalDest.dest.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <button
                type="button"
                onClick={() => setDetailModalDest(null)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/75 text-white p-2 rounded-full"
              >
                <X size={18} />
              </button>
              <div className="absolute bottom-4 left-6 right-6 text-white flex justify-between items-end">
                <div>
                  <span className="text-xs font-bold uppercase bg-emerald-600 px-3 py-1 rounded-full">
                    {detailModalDest.rec?.matchScore || 90}% Match •{' '}
                    {detailModalDest.dest.category}
                  </span>
                  <h3 className="text-3xl font-extrabold mt-1.5">
                    {detailModalDest.dest.name}
                  </h3>
                  <p className="text-xs text-blue-200 flex items-center gap-1">
                    <MapPin size={13} /> {detailModalDest.dest.district} District, Sri Lanka
                  </p>
                </div>
                {detailModalDest.dest.rating && (
                  <span className="bg-yellow-400 text-slate-950 font-extrabold text-sm px-3 py-1 rounded-xl flex items-center gap-1">
                    <Star size={14} className="fill-slate-950" /> {detailModalDest.dest.rating}
                  </span>

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

            </div>

            <div className="p-6 space-y-4 text-sm">
              <p className="text-gray-700 leading-relaxed">
                {detailModalDest.dest.description}
              </p>

              <div className="grid grid-cols-3 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-xs">
                <div>
                  <span className="text-gray-400 block">Best Visit Time</span>
                  <strong className="text-gray-900">
                    {detailModalDest.dest.bestVisitTime || 'Morning'}
                  </strong>
                </div>
                <div>
                  <span className="text-gray-400 block">Est. Duration</span>
                  <strong className="text-gray-900">
                    ~{detailModalDest.dest.estimatedDurationHours || 3.5} Hours
                  </strong>
                </div>
                <div>
                  <span className="text-gray-400 block">Opening Hours</span>
                  <strong className="text-gray-900">
                    {detailModalDest.dest.openingHours || '06:00 AM - 06:00 PM'}
                  </strong>
                </div>
              </div>

              {detailModalDest.rec?.reasons && (
                <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-100 space-y-1.5">
                  <span className="text-xs font-extrabold uppercase text-blue-900 block">
                    Why Our Engine Recommended {detailModalDest.dest.name}:
                  </span>
                  {detailModalDest.rec.reasons.map((r, i) => (
                    <div key={i} className="text-xs text-blue-950 flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t">
                <Link
                  to={`/destinations/${detailModalDest.dest._id}`}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Open Full Destination Page &rarr;
                </Link>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleSelectDestination(detailModalDest.dest);
                      setDetailModalDest(null);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                  >
                    {selectedDestinations.some((d) => d._id === detailModalDest.dest._id)
                      ? 'Remove from Trip'
                      : 'Add to Trip'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailModalDest(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold"
                  >
                    Close
                  </button>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default Planner;
