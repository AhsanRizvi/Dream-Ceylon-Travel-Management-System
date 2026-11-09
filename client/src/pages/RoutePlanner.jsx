import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api, {
  getPresetStartLocations,
  geocodeLocation,
  calculateRouteApi,
  getTrafficStatus
} from '../services/api';
import MapView from '../components/MapView';
import {
  MapPin,
  Navigation,
  Car,
  Bike,
  Clock,
  Route as RouteIcon,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  AlertCircle,
  Check,
  Info,
  Compass,
  ArrowUpDown,
  Save,
  Star
} from 'lucide-react';

/**
 * Module 2: Route, Map and Transportation Management
 * Dedicated Interactive Transportation & Multi-Stop Route Planner
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
    name: 'Kandy City Center / Temple of Tooth',
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
    latitude: 6.03,
    longitude: 80.217,
    type: 'Heritage Hub'
  }
];

const VEHICLE_MODES = [
  {
    type: 'Motorcycle',
    key: 'motorcycle',
    label: 'Touring Motorcycle',
    badge: 'Solo & Adventure',
    capacity: '1 - 2 Riders',
    luggage: '1 - 2 Backpacks',
    icon: Bike,
    paceBadge: '-8% Agile Pace',
    routingModeStatus: 'Uses OSRM/Google motor-vehicle road network + agile mountain/urban pace estimate',
    description: 'Ideal for solo or duo riders navigating scenic coastal roads and hill-country switchbacks.'
  },
  {
    type: 'Car',
    key: 'car',
    label: 'Sedan Car',
    badge: 'Couples & Small Families',
    capacity: '1 - 3 Passengers',
    luggage: '2 - 3 Large Bags',
    icon: Car,
    paceBadge: '1.0x Standard Pace',
    routingModeStatus: 'Direct Supported Mode: Standard Motor-Vehicle ("driving") Profile',
    description: 'Private air-conditioned sedan with licensed chauffeur along national highways & expressways.'
  },
  {
    type: 'Van',
    key: 'van',
    label: 'Passenger Van',
    badge: 'Families & Groups',
    capacity: '4 - 8 Passengers',
    luggage: '6 - 8 Large Bags',
    icon: Car,
    paceBadge: '+12% Group Van Pace',
    routingModeStatus: 'Uses standard "driving" road geometry + hill-country high-roof van pace adjustment',
    description: 'High-roof tourist van with panoramic windows for comfortable multi-day group touring.'
  }
];

const RoutePlanner = () => {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Catalog & Presets
  const [allDestinations, setAllDestinations] = useState([]);
  const [loadingDestinations, setLoadingDestinations] = useState(true);
  const [presetLocations, setPresetLocations] = useState(FALLBACK_PRESETS);

  // Starting Gateway state
  const [startLocation, setStartLocation] = useState(FALLBACK_PRESETS[0]);
  const [isCustomStartMode, setIsCustomStartMode] = useState(false);
  const [customStartQuery, setCustomStartQuery] = useState('');
  const [geocodingStart, setGeocodingStart] = useState(false);
  const [geocodeError, setGeocodeError] = useState(null);

  // Selected Stops & Vehicle state
  const [selectedStops, setSelectedStops] = useState([]);
  const [vehicleType, setVehicleType] = useState('Car');

  // Destination Picker search/filter state
  const [destSearch, setDestSearch] = useState('');
  const [destCategory, setDestCategory] = useState('All');

  // Route Calculation results state
  const [routeData, setRouteData] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [alternativeRoutes, setAlternativeRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [savingRoute, setSavingRoute] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  // Load destinations & preset hubs on mount
  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingDestinations(true);
      try {
        const [destRes, presets] = await Promise.all([
          api.get('/destinations'),
          getPresetStartLocations().catch(() => FALLBACK_PRESETS)
        ]);

        const list = destRes.data?.data || [];
        setAllDestinations(list);

        if (presets && presets.length > 0) {
          setPresetLocations(presets);
          setStartLocation(presets[0]);
        }

        // Check if query params requested adding or focusing a specific destination
        const addId = searchParams.get('add') || searchParams.get('focus');
        if (addId && list.length > 0) {
          const target = list.find((d) => d._id === addId);
          if (target) {
            // Also add a nearby companion stop if only 1 stop is selected for a richer initial route
            const secondStop = list.find(
              (d) => d._id !== target._id && d.district === target.district && d.latitude && d.longitude
            );
            setSelectedStops(secondStop ? [target, secondStop] : [target]);
            return;
          }
        }

        // Default initial route: Sigiriya -> Temple of the Tooth (Kandy) -> Ella
        if (list.length > 0) {
          const defaultNames = ['Sigiriya Rock Fortress', 'Temple of the Tooth (Kandy)', 'Ella'];
          const defaults = defaultNames
            .map((name) => list.find((d) => d.name === name))
            .filter(Boolean);
          if (defaults.length >= 2) {
            setSelectedStops(defaults);
          } else {
            setSelectedStops(list.slice(0, 3));
          }
        }
      } catch (err) {
        console.error('Error loading RoutePlanner data:', err);
        setRouteError('Failed to load destination catalog from server.');
      } finally {
        setLoadingDestinations(false);
      }
    };

    loadInitialData();
  }, []);

  // Automatically recalculate route whenever startLocation, selectedStops, or vehicleType changes
  useEffect(() => {
    if (!startLocation || selectedStops.length === 0) {
      setRouteData(null);
      setRouteCoordinates([]);
      setAlternativeRoutes([]);
      return;
    }

    let isCancelled = false;
    const runCalculation = async () => {
      setLoadingRoute(true);
      setRouteError(null);
      try {
        const result = await calculateRouteApi({
          startLocation,
          destinations: selectedStops,
          vehicleType: vehicleType.toLowerCase(),
          alternatives: true
        });

        if (!isCancelled && result) {
          setRouteData(result);
          setRouteCoordinates(result.leafletCoordinates || []);
          setAlternativeRoutes(result.routes || []);
          setSelectedRouteIndex(0);
        }
      } catch (err) {
        if (!isCancelled) {
          setRouteError(
            err.response?.data?.error ||
              'Unable to calculate route from routing service. Please verify destination coordinates.'
          );
        }
      } finally {
        if (!isCancelled) {
          setLoadingRoute(false);
        }
      }
    };

    runCalculation();
    return () => {
      isCancelled = true;
    };
  }, [startLocation, selectedStops, vehicleType]);

  // Geocode custom starting point
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
          type: 'Custom Geocode Origin'
        });
      } else {
        setGeocodeError('Location could not be resolved in Sri Lanka.');
      }
    } catch (err) {
      setGeocodeError(err.response?.data?.error || 'Could not resolve custom address.');
    } finally {
      setGeocodingStart(false);
    }
  };

  // Add a destination to the route
  const handleAddStop = (dest) => {
    if (selectedStops.some((s) => s._id === dest._id)) return;
    setSelectedStops((prev) => [...prev, dest]);
  };

  // Remove a stop from the route
  const handleRemoveStop = (index) => {
    setSelectedStops((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Move stop up in sequence
  const handleMoveUp = (index) => {
    if (index <= 0) return;
    setSelectedStops((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // Move stop down in sequence
  const handleMoveDown = (index) => {
    if (index >= selectedStops.length - 1) return;
    setSelectedStops((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // Reverse destination order
  const handleReverseStops = () => {
    if (selectedStops.length <= 1) return;
    setSelectedStops((prev) => [...prev].reverse());
  };

  // Nearest-neighbor geographic optimization from startLocation
  const handleOptimizeStops = async () => {
    if (selectedStops.length <= 1) return;
    setLoadingRoute(true);
    try {
      const result = await calculateRouteApi({
        startLocation,
        destinations: selectedStops,
        vehicleType: vehicleType.toLowerCase(),
        alternatives: true,
        optimizeOrder: true
      });
      if (result && Array.isArray(result.waypoints)) {
        // Re-map waypoints (excluding index 0 which is startLocation) back to destination objects
        const stopWaypoints = result.waypoints.slice(1);
        const reordered = stopWaypoints
          .map((wp) => selectedStops.find((s) => s.name === wp.name))
          .filter(Boolean);
        if (reordered.length === selectedStops.length) {
          setSelectedStops(reordered);
        }
        setRouteData(result);
        setRouteCoordinates(result.leafletCoordinates || []);
        setAlternativeRoutes(result.routes || []);
        setSelectedRouteIndex(0);
      }
    } catch (err) {
      setRouteError('Failed to optimize destination sequence.');
    } finally {
      setLoadingRoute(false);
    }
  };

  // Switch active alternative route corridor on map
  const handleSelectAlternative = (idx) => {
    if (alternativeRoutes && alternativeRoutes[idx]) {
      const chosen = alternativeRoutes[idx];
      setSelectedRouteIndex(idx);
      setRouteCoordinates(chosen.leafletCoordinates || []);
    }
  };

  // Load curated template route
  const handleLoadTemplate = (templateNames) => {
    const stops = templateNames
      .map((n) => allDestinations.find((d) => d.name.toLowerCase().includes(n.toLowerCase())))
      .filter(Boolean);
    if (stops.length > 0) {
      setSelectedStops(stops);
    }
  };

  // Save route to user's TourPlan in MongoDB
  const handleSaveRouteToTourPlan = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (selectedStops.length === 0) return;

    setSavingRoute(true);
    setSaveMessage(null);
    try {
      const start = new Date();
      const end = new Date();
      end.setDate(start.getDate() + Math.max(1, selectedStops.length));

      await api.post('/planner/plan', {
        title: `${startLocation.name} to ${selectedStops[selectedStops.length - 1].name} (${vehicleType} Route)`,
        days: Math.max(1, selectedStops.length),
        stops: selectedStops.map((s) => s._id),
        dates: { start, end },
        transportType: vehicleType,
        startLocation,
        routeData: {
          routeId: routeData?.routeId,
          totalDistanceKm: activeRouteMetrics.distanceKm,
          totalDurationFormatted: activeRouteMetrics.durationFormatted,
          rawEngineDurationFormatted: activeRouteMetrics.rawEngineDurationFormatted,
          vehicle: routeData?.vehicle,
          legs: routeData?.legs,
          provider: routeData?.provider
        }
      });
      setSaveMessage('Route and transportation plan saved to your profile!');
      setTimeout(() => setSaveMessage(null), 5000);
    } catch (err) {
      setRouteError(err.response?.data?.error || 'Could not save route plan.');
    } finally {
      setSavingRoute(false);
    }
  };

  // Filtered destination catalog for adding stops
  const filteredCatalog = useMemo(() => {
    const q = destSearch.trim().toLowerCase();
    return allDestinations
      .filter((d) => {
        const matchesCat =
          destCategory === 'All' || d.category?.toLowerCase() === destCategory.toLowerCase();
        const matchesSearch =
          !q ||
          d.name?.toLowerCase().includes(q) ||
          d.district?.toLowerCase().includes(q) ||
          d.category?.toLowerCase().includes(q);
        return matchesCat && matchesSearch;
      })
      .slice(0, 18);
  }, [allDestinations, destSearch, destCategory]);

  // Active route summary metrics (reflecting selected alternative if switched)
  const activeRouteMetrics = useMemo(() => {
    const selectedAlt = alternativeRoutes?.[selectedRouteIndex];
    return {
      distanceKm: selectedAlt?.distanceKm || routeData?.totalDistanceKm || '0.0 km',
      durationFormatted: selectedAlt?.durationFormatted || routeData?.totalDurationFormatted || '0m',
      rawEngineDurationFormatted:
        selectedAlt?.rawEngineDurationFormatted ||
        routeData?.rawEngineDurationFormatted ||
        routeData?.totalDurationFormatted ||
        '0m'
    };
  }, [alternativeRoutes, selectedRouteIndex, routeData]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
      {/* Page Hero Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 rounded-3xl p-8 text-white shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300 bg-emerald-900/50 px-3.5 py-1 rounded-full border border-emerald-400/30">
            <Navigation size={13} /> Module 2 • Interactive Route, Map & Transportation Management
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-2">
            Sri Lanka Multi-Stop Route & Transport Planner
          </h1>
          <p className="text-blue-200 text-sm mt-1 max-w-2xl">
            Select your starting gateway, add and reorder destinations, compare Motorcycle, Car, and Van transportation modes, and inspect turn-by-turn road routes across Sri Lanka.
          </p>
        </div>

        {/* Quick Curated Route Templates */}
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 space-y-2 w-full lg:w-auto">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200 block">
            Quick-Load Sample Sri Lanka Corridors:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                handleLoadTemplate([
                  'Sigiriya Rock Fortress',
                  'Dambulla Cave Temple',
                  'Temple of the Tooth (Kandy)',
                  'Nuwara Eliya',
                  'Ella'
                ])
              }
              className="text-xs font-bold bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-xl transition border border-white/20"
            >
              Cultural & Hill Country (5 Stops)
            </button>
            <button
              type="button"
              onClick={() =>
                handleLoadTemplate([
                  'Bentota Beach',
                  'Galle Fort',
                  'Unawatuna Beach',
                  'Mirissa Beach',
                  'Yala National Park'
                ])
              }
              className="text-xs font-bold bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-xl transition border border-white/20"
            >
              Southern Coast & Safari (5 Stops)
            </button>
            <button
              type="button"
              onClick={() =>
                handleLoadTemplate(['Ravana Falls', 'Diyaluma Falls', 'Bambarakanda Falls'])
              }
              className="text-xs font-bold bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-xl transition border border-white/20"
            >
              Waterfall Trail (3 Stops)
            </button>
          </div>
        </div>
      </div>

      {/* Transportation Mode Selection Bar (Requirement 4.B) */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <Car size={20} className="text-blue-600" />
              1. Select Transportation Mode (Motorcycle, Car, or Van)
            </h2>
            <p className="text-xs text-gray-500">
              Switching transportation updates your estimated travel duration while transparently reporting routing API capabilities.
            </p>
          </div>
          <span className="text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 self-start sm:self-center">
            Active Mode: {vehicleType}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {VEHICLE_MODES.map((v) => {
            const isSelected = vehicleType.toLowerCase() === v.type.toLowerCase();
            const IconComp = v.icon;
            return (
              <div
                key={v.type}
                onClick={() => setVehicleType(v.type)}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-100'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <IconComp size={22} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {v.paceBadge}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-gray-900">{v.label}</h3>
                    {isSelected && <Check size={16} className="text-blue-600" />}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 mb-3 leading-relaxed">{v.description}</p>

                  <div className="text-[11px] text-gray-600 space-y-1 pt-2 border-t border-gray-100">
                    <div>
                      <strong className="text-gray-800">Capacity:</strong> {v.capacity} • {v.luggage}
                    </div>
                    <div className="text-blue-800 font-medium">{v.routingModeStatus}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Honest Provider Capability Notice */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
          <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Supported Travel Mode vs Vehicle-Specific Profile Transparency:</strong>{' '}
            {routeData?.vehicle?.providerNotes ||
              'Public OSRM and standard Google Directions APIs compute road geometry using the unified motor-vehicle ("driving") network profile.'}{' '}
            <span className="text-blue-800">
              {routeData?.vehicle?.terrainPaceNote ||
                'Dream Ceylon displays both the raw routing engine duration and the Sri Lankan terrain pace estimate for your selected vehicle.'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Route Planning Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN (5 cols): Origin Hub + Selected Stops Ordering + Destination Picker */}
        <div className="lg:col-span-5 space-y-6">
          {/* Starting Gateway Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <MapPin size={18} className="text-emerald-600" />
                2. Starting Gateway
              </h3>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsCustomStartMode(false)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition ${
                    !isCustomStartMode
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  Preset Hubs
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomStartMode(true)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition ${
                    isCustomStartMode
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  Geocode Search
                </button>
              </div>
            </div>

            {!isCustomStartMode ? (
              <select
                className="w-full p-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                value={startLocation.id || startLocation.name}
                onChange={(e) => {
                  const found = presetLocations.find((p) => (p.id || p.name) === e.target.value);
                  if (found) setStartLocation(found);
                }}
              >
                {presetLocations.map((p) => (
                  <option key={p.id || p.name} value={p.id || p.name}>
                    {p.name} ({p.district || p.city})
                  </option>
                ))}
              </select>
            ) : (
              <form onSubmit={handleGeocodeStart} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customStartQuery}
                    onChange={(e) => setCustomStartQuery(e.target.value)}
                    placeholder="Search Sri Lankan city, airport, hotel..."
                    className="flex-grow p-2.5 border border-gray-300 rounded-xl text-xs font-medium"
                  />
                  <button
                    type="submit"
                    disabled={geocodingStart || !customStartQuery.trim()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
                  >
                    {geocodingStart ? 'Locating...' : 'Locate'}
                  </button>
                </div>
                {geocodeError && <p className="text-xs text-red-600 font-semibold">{geocodeError}</p>}
              </form>
            )}

            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                  Origin Coordinates
                </span>
                <strong className="text-gray-900">{startLocation.name}</strong>
              </div>
              <span className="font-mono text-[11px] text-emerald-800 bg-white px-2 py-1 rounded border border-emerald-200">
                {Number(startLocation.latitude).toFixed(3)}, {Number(startLocation.longitude).toFixed(3)}
              </span>
            </div>
          </div>

          {/* Selected Destinations Sequence & Reordering Panel (Requirement 4.C & 4.E) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <RouteIcon size={18} className="text-blue-600" />
                  3. Selected Route Stops ({selectedStops.length})
                </h3>
                <p className="text-[11px] text-gray-500">
                  Reorder stops to automatically recalculate the road route.
                </p>
              </div>

              {selectedStops.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleOptimizeStops}
                    disabled={loadingRoute}
                    title="Optimize stop sequence by geographic proximity"
                    className="text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded-lg border border-indigo-200 transition flex items-center gap-1"
                  >
                    <Sparkles size={12} /> Optimize Order
                  </button>
                  <button
                    type="button"
                    onClick={handleReverseStops}
                    disabled={loadingRoute}
                    title="Reverse stop order"
                    className="text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
                  >
                    <ArrowUpDown size={12} /> Reverse
                  </button>
                </div>
              )}
            </div>

            {selectedStops.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-4">
                <Compass className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-700">No destinations selected yet</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Click &ldquo;+ Add&rdquo; on any destination below to build your route.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {selectedStops.map((stop, idx) => (
                  <div
                    key={stop._id || `${stop.name}-${idx}`}
                    className="p-3 rounded-2xl border border-gray-200 bg-gray-50/70 hover:bg-white transition flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <Link
                          to={`/destinations/${stop._id}`}
                          className="text-xs font-bold text-gray-900 hover:text-blue-600 truncate block"
                        >
                          {stop.name}
                        </Link>
                        <span className="text-[11px] text-gray-500 block truncate">
                          {stop.district} District • {stop.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        title="Move Stop Up"
                        className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-blue-600 disabled:opacity-30 transition"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === selectedStops.length - 1}
                        title="Move Stop Down"
                        className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-blue-600 disabled:opacity-30 transition"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStop(idx)}
                        title="Remove Stop"
                        className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Destinations from Catalog Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 space-y-4">
            <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <Plus size={18} className="text-blue-600" />
              4. Add Sri Lankan Destinations to Route
            </h3>

            <div className="flex gap-2">
              <div className="relative flex-grow">
                <Search
                  size={14}
                  className="text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                />
                <input
                  type="text"
                  value={destSearch}
                  onChange={(e) => setDestSearch(e.target.value)}
                  placeholder="Filter by name or district..."
                  className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                />
              </div>
              <select
                value={destCategory}
                onChange={(e) => setDestCategory(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700"
              >
                {['All', 'Beach', 'Mountain', 'Historical', 'Waterfall', 'Wildlife', 'Nature', 'Lake'].map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  )
                )}
              </select>
            </div>

            {loadingDestinations ? (
              <div className="py-6 text-center text-xs text-gray-500">Loading destinations...</div>
            ) : (
              <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                {filteredCatalog.map((dest) => {
                  const alreadyAdded = selectedStops.some((s) => s._id === dest._id);
                  return (
                    <div
                      key={dest._id}
                      className="p-2.5 rounded-xl border border-gray-100 hover:border-gray-200 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 truncate">{dest.name}</div>
                        <div className="text-[11px] text-gray-500">
                          {dest.district} • {dest.category}{' '}
                          {dest.rating ? `• ★ ${Number(dest.rating).toFixed(1)}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddStop(dest)}
                        disabled={alreadyAdded}
                        className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition flex items-center gap-1 flex-shrink-0 ${
                          alreadyAdded
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                        }`}
                      >
                        {alreadyAdded ? (
                          <>
                            <Check size={12} /> Added
                          </>
                        ) : (
                          <>
                            <Plus size={12} /> Add Stop
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (7 cols): Interactive Map + Route Details Panel + Alternatives + Legs */}
        <div className="lg:col-span-7 space-y-6 min-w-0">
          {/* Route Summary Metrics Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-[11px] font-semibold text-gray-500 block">Total Distance</span>
              <strong className="text-lg font-extrabold text-blue-700">
                {activeRouteMetrics.distanceKm}
              </strong>
              <span className="text-[10px] text-gray-400 block mt-0.5">
                {selectedStops.length} Stop(s)
              </span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-[11px] font-semibold text-gray-500 block">
                Est. Travel Time ({vehicleType})
              </span>
              <strong className="text-lg font-extrabold text-indigo-700">
                {activeRouteMetrics.durationFormatted}
              </strong>
              <span className="text-[10px] text-gray-400 block mt-0.5">
                Engine base: {activeRouteMetrics.rawEngineDurationFormatted}
              </span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-[11px] font-semibold text-gray-500 block">Transport Mode</span>
              <strong className="text-base font-extrabold text-gray-900">{vehicleType}</strong>
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                Profile: {routeData?.vehicle?.routingProfileUsed || 'driving'}
              </span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-gray-500 block">Actions</span>
              <button
                type="button"
                onClick={handleSaveRouteToTourPlan}
                disabled={savingRoute || selectedStops.length === 0}
                className="mt-1 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Save size={13} />
                {savingRoute ? 'Saving...' : 'Save Route'}
              </button>
            </div>
          </div>

          {saveMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
              <Check size={16} className="text-emerald-600" />
              <span>{saveMessage}</span>
            </div>
          )}

          {/* Interactive Map Visualization */}
          <div className="bg-white rounded-3xl shadow-md border border-gray-200 overflow-hidden">
            <MapView
              startLocation={startLocation}
              destinations={selectedStops}
              routeCoordinates={routeCoordinates}
              alternativeRoutes={alternativeRoutes}
              selectedRouteIndex={selectedRouteIndex}
              onSelectRoute={handleSelectAlternative}
              loading={loadingRoute}
              error={routeError}
              height="520px"
            />
          </div>

          {/* Traffic-Aware Routing Status Banner (Requirement 4.D) */}
          <div className="p-4 bg-amber-50/85 border border-amber-200 rounded-2xl text-xs text-amber-950 flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="font-extrabold text-amber-950">
                  Traffic-Aware Routing & Travel Duration Notice
                </strong>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900">
                  {routeData?.traffic?.hasLiveTraffic
                    ? 'Traffic-Aware Estimate Active'
                    : 'Live Traffic Unavailable • Standard Road Profile'}
                </span>
              </div>
              <p className="leading-relaxed text-amber-900/90">
                {routeData?.traffic?.statusMessage ||
                  'Live traffic information is currently unavailable on public OpenStreetMap/OSRM routing. Displaying algorithmic transit duration based on road network speed limits.'}
              </p>
              <div className="text-[11px] text-amber-800 font-semibold pt-1">
                Vehicle-Adjusted Time ({vehicleType}): <strong>{activeRouteMetrics.durationFormatted}</strong> • Raw Routing Engine Baseline: <strong>{activeRouteMetrics.rawEngineDurationFormatted}</strong>
              </div>
            </div>
          </div>

          {/* Route Alternatives Selector (Requirement 4.C & 4.E) */}
          {alternativeRoutes && alternativeRoutes.length > 1 && (
            <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                  <RouteIcon size={16} className="text-blue-600" />
                  Route Corridor Alternatives ({alternativeRoutes.length} Available)
                </h4>
                <span className="text-[11px] text-gray-500">Click to switch active corridor on map</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {alternativeRoutes.map((alt, idx) => {
                  const isSelected = selectedRouteIndex === idx;
                  return (
                    <div
                      key={alt.id || idx}
                      onClick={() => handleSelectAlternative(idx)}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-extrabold text-gray-900">
                          {alt.label || `Route Option ${idx + 1}`}
                        </span>
                        {isSelected && <Check size={14} className="text-blue-600" />}
                      </div>
                      <div className="text-xs text-gray-600">
                        Distance: <strong className="text-blue-700">{alt.distanceKm}</strong> • Est. Time:{' '}
                        <strong className="text-indigo-700">{alt.durationFormatted}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Turn-by-Turn Leg-by-Leg Details Panel */}
          {routeData?.legs && routeData.legs.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <Navigation size={18} className="text-blue-600" />
                  Leg-by-Leg Journey Breakdown
                </h4>
                <span className="text-xs font-semibold text-gray-500">
                  Provider: {routeData.provider}
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {routeData.legs.map((leg, idx) => (
                  <div
                    key={idx}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-extrabold flex items-center justify-center flex-shrink-0">
                        {leg.legIndex || idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-gray-900">
                          {leg.fromName} &rarr; {leg.toName}
                        </div>
                        <span className="text-[11px] text-gray-500">
                          {leg.summary || 'Sri Lanka National Highway Corridor'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold">
                        {leg.distanceKm}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold">
                        {leg.durationFormatted}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoutePlanner;

