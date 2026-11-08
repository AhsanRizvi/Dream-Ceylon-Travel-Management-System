const axios = require('axios');
const Destination = require('../models/Destination');

/**
 * Module 2: Maps, Routes and Transportation
 * Student Reg: SEU/IS/22/ICT/037
 * University: South Eastern University of Sri Lanka
 * 
 * Provides map services for Dream Ceylon:
 * - Geocoding (Nominatim OpenStreetMap API + Sri Lanka Gazetteer fallback)
 * - Route calculation with alternatives support (OSRM - Open Source Routing Machine)
 * - Multi-destination chained route calculation with leg-by-leg metrics
 * - Vehicle profile handling & transparent provider capability reporting
 * - Traffic-aware status reporting (distinguishing standard vs live traffic)
 * - Nearby destination discovery using Haversine spherical distance
 */

// Preset Sri Lanka Travel Hubs & Entry Points
const PRESET_START_LOCATIONS = [
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
    displayName: 'Colombo Fort Railway Station & Commercial Hub, Western Province',
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
  },
  {
    id: 'jaffna-station',
    name: 'Jaffna Central Railway Station',
    displayName: 'Jaffna Central Railway Station, Northern Province',
    city: 'Jaffna',
    district: 'Jaffna',
    latitude: 9.6647,
    longitude: 80.0255,
    type: 'Transit Hub'
  },
  {
    id: 'sigiriya-hub',
    name: 'Sigiriya Cultural Hub',
    displayName: 'Sigiriya Rock Fortress Junction, Central Province',
    city: 'Sigiriya',
    district: 'Matale',
    latitude: 7.9570,
    longitude: 80.7603,
    type: 'Cultural Hub'
  },
  {
    id: 'nuwara-eliya-post',
    name: 'Nuwara Eliya Colonial Town Center',
    displayName: 'Nuwara Eliya Post Office / Town Center, Central Highlands',
    city: 'Nuwara Eliya',
    district: 'Nuwara Eliya',
    latitude: 6.9497,
    longitude: 80.7828,
    type: 'Highland Hub'
  }
];

// Vehicle Configuration & Provider Capability Specifications
const VEHICLE_CATALOG = {
  car: {
    key: 'car',
    label: 'Sedan Car',
    category: 'Standard Automobile',
    capacity: '1 - 3 Passengers',
    luggage: '2 - 3 Large Bags',
    osrmProfile: 'driving',
    googleTravelMode: 'driving',
    terrainPaceMultiplier: 1.0,
    avgSpeedKmh: 45,
    description: 'Comfortable air-conditioned private sedan suitable for solo, couples, and small family travel.',
    providerNotes: 'Public OSRM engine routes car via the standard motor-vehicle "driving" profile. Google Maps Platform uses the "driving" mode.',
    terrainPaceNote: 'Baseline passenger sedan speed profile (1.00x) across Sri Lankan national highways and expressways.'
  },
  van: {
    key: 'van',
    label: 'Passenger Van',
    category: 'High-Roof Tourist Van',
    capacity: '4 - 8 Passengers',
    luggage: '6 - 8 Large Bags',
    osrmProfile: 'driving',
    googleTravelMode: 'driving',
    terrainPaceMultiplier: 1.12,
    avgSpeedKmh: 40,
    description: 'Spacious passenger van ideal for families, groups, and multi-day sightseeing across island terrains.',
    providerNotes: 'Public OSRM engine routes vans via the unified "driving" road network profile. Dedicated commercial van axle/speed profiles require an enterprise OSRM or OpenRouteService instance.',
    terrainPaceNote: 'Includes +12% Sri Lankan hill-country & winding curve pace adjustment for high-roof group passenger vans.'
  },
  motorcycle: {
    key: 'motorcycle',
    label: 'Touring Motorcycle',
    category: 'Two-Wheeler / Motorbike',
    capacity: '1 - 2 Riders',
    luggage: '1 - 2 Backpacks / Panniers',
    osrmProfile: 'driving',
    googleTravelMode: 'driving',
    terrainPaceMultiplier: 0.92,
    avgSpeedKmh: 49,
    description: 'Agile adventure travel suitable for scenic coastal and highland roads.',
    providerNotes: 'Public OSRM demo engine does not host an isolated motorcycle routing endpoint. Calculations use the provider\'s unified "driving" road network.',
    terrainPaceNote: 'Includes -8% agile two-wheeler transit adjustment across Sri Lankan town corridors and mountain switchbacks.'
  }
};

// In-memory cache of calculated routes so GET /api/routes/:id can retrieve recent calculations
const routeCalculationCache = new Map();

const cacheCalculatedRoute = (routeData) => {
  const routeId = `route_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const entry = {
    routeId,
    createdAt: new Date().toISOString(),
    ...routeData
  };
  routeCalculationCache.set(routeId, entry);
  if (routeCalculationCache.size > 100) {
    const firstKey = routeCalculationCache.keys().next().value;
    routeCalculationCache.delete(firstKey);
  }
  return entry;
};

const getCachedRouteById = (routeId) => {
  return routeCalculationCache.get(routeId) || null;
};

/**
 * Helper: Check whether a real Google Maps API key is configured in environment
 */
const hasValidGoogleMapsKey = () => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  return Boolean(
    key &&
    typeof key === 'string' &&
    key.trim().length > 10 &&
    !key.includes('your_google_maps_api_key')
  );
};

/**
 * Helper: Decode Google Maps encoded polyline string into Leaflet [lat, lng] array
 */
const decodeGooglePolyline = (encoded = '') => {
  const points = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
};

/**
 * Helper: Format distance in meters to clean kilometers string
 */
const formatDistanceKm = (meters) => {
  if (meters === undefined || meters === null || isNaN(meters)) return '0.0 km';
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
};

/**
 * Helper: Format duration in seconds to hours and minutes
 */
const formatDurationText = (seconds) => {
  if (seconds === undefined || seconds === null || isNaN(seconds)) return '0m';
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  }
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
};

/**
 * Helper: Calculate spherical distance between two coordinates in kilometers using Haversine formula
 */
const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const l1 = toRad(lat1);
  const l2 = toRad(lat2);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(l1) * Math.cos(l2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Helper: Generate realistic road route coordinates between two points for fallback/offline mode
 */
const generateInterpolatedRoute = (originLat, originLng, destLat, destLng, segments = 20) => {
  const coords = [];
  for (let i = 0; i <= segments; i++) {
    const fraction = i / segments;
    // Introduce slight natural curving matching typical Sri Lanka road deviations
    const curveOffset = Math.sin(fraction * Math.PI) * 0.015;
    const lat = originLat + (destLat - originLat) * fraction + curveOffset * 0.5;
    const lng = originLng + (destLng - originLng) * fraction - curveOffset;
    coords.push([lng, lat]);
  }
  return coords;
};

/**
 * Traffic-Aware Information Status
 * Never fakes live traffic. Checks if an external traffic-enabled provider key is configured in env.
 */
const getTrafficStatus = () => {
  const hasGoogleKey = hasValidGoogleMapsKey();
  const hasTomTomKey = Boolean(
    process.env.TOMTOM_API_KEY &&
    !process.env.TOMTOM_API_KEY.includes('your_')
  );
  const hasMapboxKey = Boolean(
    process.env.MAPBOX_ACCESS_TOKEN &&
    !process.env.MAPBOX_ACCESS_TOKEN.includes('your_')
  );
  const hasLiveTrafficProvider = hasGoogleKey || hasTomTomKey || hasMapboxKey;

  return {
    hasLiveTraffic: hasLiveTrafficProvider,
    isGuaranteedRealTime: false,
    provider: hasGoogleKey
      ? 'Google Maps Platform (Traffic-Aware Routing)'
      : hasLiveTrafficProvider
      ? 'External Traffic Provider'
      : 'Public OpenStreetMap / OSRM',
    statusMessage: hasLiveTrafficProvider
      ? 'Estimated traffic-aware travel duration is enabled via configured routing provider. Note: Traffic-aware durations are algorithmic estimates based on current and historical road conditions, not guaranteed arrival times.'
      : 'Live traffic information is currently unavailable on public OpenStreetMap/OSRM routing. Displaying standard algorithmic transit duration based on standard road network speed limits.'
  };
};

/**
 * Resolve Vehicle Profile & Metadata
 */
const resolveVehicle = (vehicleType = 'car') => {
  const normalizedKey = String(vehicleType).toLowerCase().trim();
  if (normalizedKey.includes('bike') || normalizedKey.includes('motorcycle') || normalizedKey.includes('scooter')) {
    return VEHICLE_CATALOG.motorcycle;
  }
  if (normalizedKey.includes('van') || normalizedKey.includes('coach') || normalizedKey.includes('bus')) {
    return VEHICLE_CATALOG.van;
  }
  return VEHICLE_CATALOG.car;
};

/**
 * Geocode Location using Nominatim OpenStreetMap API with Sri Lanka biasing & fallback
 */
const geocodeLocation = async (locationName) => {
  if (!locationName || typeof locationName !== 'string' || !locationName.trim()) {
    throw new Error('Location name or query is required.');
  }

  const query = locationName.trim();

  // 1. Check preset starting locations first for instantaneous match
  const presetMatch = PRESET_START_LOCATIONS.find(loc => 
    loc.name.toLowerCase().includes(query.toLowerCase()) || 
    loc.displayName.toLowerCase().includes(query.toLowerCase()) ||
    loc.city.toLowerCase() === query.toLowerCase()
  );
  if (presetMatch) {
    return {
      lat: presetMatch.latitude,
      lng: presetMatch.longitude,
      name: presetMatch.name,
      displayName: presetMatch.displayName,
      district: presetMatch.district,
      city: presetMatch.city,
      type: presetMatch.type,
      source: 'Preset Sri Lanka Gateway'
    };
  }

  // 2. Query Nominatim API with Sri Lanka country code boundary
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: `${query}, Sri Lanka`,
        format: 'json',
        addressdetails: 1,
        countrycodes: 'lk',
        limit: 3
      },
      headers: {
        'User-Agent': 'DreamCeylonApp-SEU-IS-22-ICT-037/1.0'
      },
      timeout: 6000
    });

    if (response.data && response.data.length > 0) {
      const topResult = response.data[0];
      const address = topResult.address || {};
      const district = address.state_district || address.county || address.state || address.city || 'Sri Lanka';
      const city = address.city || address.town || address.village || address.suburb || query;

      return {
        lat: parseFloat(topResult.lat),
        lng: parseFloat(topResult.lon),
        name: query,
        displayName: topResult.display_name,
        district,
        city,
        type: topResult.type || 'Location',
        source: 'Nominatim OpenStreetMap'
      };
    }
  } catch (error) {
    console.warn(`MapService - Nominatim geocoding failed or offline: ${error.message}. Checking local gazetteer fallback.`);
  }

  // 3. Fallback to MongoDB Destination matching
  try {
    const regex = new RegExp(query, 'i');
    const matchedDest = await Destination.findOne({
      $or: [{ name: regex }, { district: regex }]
    });

    if (matchedDest) {
      return {
        lat: matchedDest.latitude,
        lng: matchedDest.longitude,
        name: matchedDest.name,
        displayName: `${matchedDest.name}, ${matchedDest.district} District, Sri Lanka`,
        district: matchedDest.district,
        city: matchedDest.district,
        type: 'Tourist Destination',
        source: 'Dream Ceylon Database'
      };
    }
  } catch (dbErr) {
    console.error('MapService - Database fallback lookup error:', dbErr.message);
  }

  throw new Error(`Location "${query}" could not be resolved. Please try a prominent city, landmark, or airport in Sri Lanka.`);
};

/**
 * Calculate Route between two coordinates with alternatives support
 */
const calculateRoute = async (originLat, originLng, destLat, destLng, vehicleType = 'car', includeAlternatives = true) => {
  const oLat = parseFloat(originLat);
  const oLng = parseFloat(originLng);
  const dLat = parseFloat(destLat);
  const dLng = parseFloat(destLng);

  if (isNaN(oLat) || isNaN(oLng) || isNaN(dLat) || isNaN(dLng)) {
    throw new Error('Valid numerical origin and destination coordinates are required.');
  }

  const vehicle = resolveVehicle(vehicleType);
  const trafficInfo = getTrafficStatus();
  const profile = vehicle.osrmProfile; // 'driving'
  const paceMultiplier = vehicle.terrainPaceMultiplier || 1.0;

  // 1. If a valid GOOGLE_MAPS_API_KEY is configured, attempt Google Directions API with traffic_model=best_guess
  if (hasValidGoogleMapsKey()) {
    try {
      const gRes = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
        params: {
          origin: `${oLat},${oLng}`,
          destination: `${dLat},${dLng}`,
          mode: vehicle.googleTravelMode || 'driving',
          alternatives: includeAlternatives ? 'true' : 'false',
          departure_time: 'now',
          traffic_model: 'best_guess',
          region: 'lk',
          key: process.env.GOOGLE_MAPS_API_KEY.trim()
        },
        timeout: 8000
      });

      if (gRes.data && gRes.data.status === 'OK' && Array.isArray(gRes.data.routes) && gRes.data.routes.length > 0) {
        const routes = gRes.data.routes.map((r, index) => {
          const leg = r.legs?.[0] || {};
          const rawSeconds = leg.duration?.value || 0;
          const trafficSeconds = leg.duration_in_traffic?.value || null;
          const baseSeconds = trafficSeconds || rawSeconds;
          const adjustedSeconds = Math.round(baseSeconds * paceMultiplier);
          const leafletCoordinates = decodeGooglePolyline(r.overview_polyline?.points || '');
          const geoJsonCoords = leafletCoordinates.map((pt) => [pt[1], pt[0]]);

          return {
            id: index,
            label: index === 0 ? `Primary Route (${r.summary || 'Recommended'})` : `Alternative Route ${index} (${r.summary || 'Corridor'})`,
            distanceMeters: leg.distance?.value || 0,
            distanceKm: formatDistanceKm(leg.distance?.value || 0),
            durationSeconds: adjustedSeconds,
            durationFormatted: formatDurationText(adjustedSeconds),
            rawEngineDurationSeconds: rawSeconds,
            rawEngineDurationFormatted: formatDurationText(rawSeconds),
            trafficDurationSeconds: trafficSeconds,
            trafficDurationFormatted: trafficSeconds ? formatDurationText(trafficSeconds) : null,
            coordinates: geoJsonCoords,
            leafletCoordinates,
            summary: r.summary || 'Google Maps Sri Lanka Route'
          };
        });

        const primary = routes[0];
        return cacheCalculatedRoute({
          distance: primary.distanceMeters,
          distanceKm: primary.distanceKm,
          duration: primary.durationSeconds,
          durationFormatted: primary.durationFormatted,
          rawEngineDurationSeconds: primary.rawEngineDurationSeconds,
          rawEngineDurationFormatted: primary.rawEngineDurationFormatted,
          trafficDurationFormatted: primary.trafficDurationFormatted,
          coordinates: primary.coordinates,
          leafletCoordinates: primary.leafletCoordinates,
          routes,
          hasAlternatives: routes.length > 1,
          alternativesCount: routes.length,
          alternativesNote: routes.length > 1
            ? `${routes.length} route corridors returned by Google Maps Directions API.`
            : '1 optimal route corridor returned by Google Maps Directions API.',
          vehicle: {
            type: vehicle.key,
            label: vehicle.label,
            category: vehicle.category,
            capacity: vehicle.capacity,
            routingProfileUsed: vehicle.googleTravelMode,
            terrainPaceMultiplier: paceMultiplier,
            terrainPaceNote: vehicle.terrainPaceNote,
            providerNotes: vehicle.providerNotes
          },
          traffic: trafficInfo,
          provider: 'Google Maps Platform (Directions API)'
        });
      }
    } catch (gErr) {
      console.warn(`MapService - Google Maps Directions API fallback to OSRM (${gErr.message}).`);
    }
  }

  const osrmUrl = `http://router.project-osrm.org/route/v1/${profile}/${oLng},${oLat};${dLng},${dLat}`;

  try {
    const response = await axios.get(osrmUrl, {
      params: {
        overview: 'full',
        geometries: 'geojson',
        alternatives: includeAlternatives ? 'true' : 'false',
        steps: false
      },
      headers: {
        'User-Agent': 'DreamCeylonApp-SEU-IS-22-ICT-037/1.0'
      },
      timeout: 8000
    });

    if (response.data && response.data.code === 'Ok' && response.data.routes && response.data.routes.length > 0) {
      const routes = response.data.routes.map((r, index) => {
        // OSRM coordinates are [lng, lat], map requires [lat, lng] for Leaflet
        const leafletCoordinates = r.geometry.coordinates.map(pt => [pt[1], pt[0]]);
        const adjustedSeconds = Math.round(r.duration * paceMultiplier);
        return {
          id: index,
          label: index === 0 ? 'Primary Route (Recommended)' : `Alternative Route ${index}`,
          distanceMeters: r.distance,
          distanceKm: formatDistanceKm(r.distance),
          durationSeconds: adjustedSeconds,
          durationFormatted: formatDurationText(adjustedSeconds),
          rawEngineDurationSeconds: Math.round(r.duration),
          rawEngineDurationFormatted: formatDurationText(r.duration),
          coordinates: r.geometry.coordinates, // GeoJSON [lng, lat]
          leafletCoordinates, // Leaflet [lat, lng]
          summary: r.legs?.[0]?.summary || `Route via Sri Lanka Highway Network`
        };
      });

      const primary = routes[0];

      return cacheCalculatedRoute({
        distance: primary.distanceMeters,
        distanceKm: primary.distanceKm,
        duration: primary.durationSeconds,
        durationFormatted: primary.durationFormatted,
        rawEngineDurationSeconds: primary.rawEngineDurationSeconds,
        rawEngineDurationFormatted: primary.rawEngineDurationFormatted,
        coordinates: primary.coordinates,
        leafletCoordinates: primary.leafletCoordinates,
        routes,
        hasAlternatives: routes.length > 1,
        alternativesCount: routes.length,
        alternativesNote: routes.length > 1 
          ? `${routes.length} route options found from OSRM provider.`
          : 'Only 1 optimal road corridor was returned by OSRM for these coordinates.',
        vehicle: {
          type: vehicle.key,
          label: vehicle.label,
          category: vehicle.category,
          capacity: vehicle.capacity,
          routingProfileUsed: vehicle.osrmProfile,
          terrainPaceMultiplier: paceMultiplier,
          terrainPaceNote: vehicle.terrainPaceNote,
          providerNotes: vehicle.providerNotes
        },
        traffic: trafficInfo,
        provider: 'OSRM (Open Source Routing Machine)'
      });
    }
  } catch (error) {
    console.warn(`MapService - OSRM routing request failed (${error.message}). Activating algorithmic road simulation fallback.`);
  }

  // Fallback / Offline Road Computation using Haversine & Sri Lanka road winding factor (1.32)
  const crowFliesKm = haversineDistanceKm(oLat, oLng, dLat, dLng);
  const roadKm = crowFliesKm * 1.32;
  const distanceMeters = Math.round(roadKm * 1000);
  // Average touring speed in Sri Lanka (approx 44 km/h factoring towns and topography)
  const avgSpeedKmh = 44;
  const durationHours = roadKm / avgSpeedKmh;
  const durationSeconds = Math.round(durationHours * 3600);

  const geoJsonCoords = generateInterpolatedRoute(oLat, oLng, dLat, dLng, 25);
  const leafletCoords = geoJsonCoords.map(pt => [pt[1], pt[0]]);

  return {
    distance: distanceMeters,
    distanceKm: formatDistanceKm(distanceMeters),
    duration: durationSeconds,
    durationFormatted: formatDurationText(durationSeconds),
    coordinates: geoJsonCoords,
    leafletCoordinates: leafletCoords,
    routes: [
      {
        id: 0,
        label: 'Standard Road Corridor (Algorithmic Estimate)',
        distanceMeters,
        distanceKm: formatDistanceKm(distanceMeters),
        durationSeconds,
        durationFormatted: formatDurationText(durationSeconds),
        coordinates: geoJsonCoords,
        leafletCoordinates: leafletCoords,
        summary: 'Sri Lanka Main Road Network'
      }
    ],
    hasAlternatives: false,
    alternativesCount: 1,
    alternativesNote: 'Single optimal corridor estimated using Sri Lanka road network topology.',
    vehicle: {
      type: vehicle.key,
      label: vehicle.label,
      category: vehicle.category,
      capacity: vehicle.capacity,
      routingProfileUsed: vehicle.osrmProfile,
      providerNotes: vehicle.providerNotes
    },
    traffic: trafficInfo,
    provider: 'Dream Ceylon Internal Geographic Routing Engine (Fallback)'
  };
};

/**
 * Multi-Destination Route Calculation (Start Location -> Dest 1 -> Dest 2 -> ... -> Dest N)
 * Generates leg-by-leg metrics, aggregated distance/duration, and complete geometry
 */
const calculateMultiRoute = async ({ startLocation, destinations, vehicleType = 'car', includeAlternatives = true }) => {
  if (!startLocation || !startLocation.latitude || !startLocation.longitude) {
    throw new Error('A valid starting location with latitude and longitude is required.');
  }

  if (!destinations || !Array.isArray(destinations) || destinations.length === 0) {
    throw new Error('At least one destination is required to calculate a journey route.');
  }

  // Filter valid destinations with coordinates
  const validDests = destinations.filter(d => 
    d && !isNaN(parseFloat(d.latitude)) && !isNaN(parseFloat(d.longitude))
  );

  if (validDests.length === 0) {
    throw new Error('No valid destination coordinates provided.');
  }

  const allWaypoints = [
    {
      name: startLocation.name || 'Start Point',
      latitude: parseFloat(startLocation.latitude),
      longitude: parseFloat(startLocation.longitude),
      district: startLocation.district || 'Origin',
      isStart: true
    },
    ...validDests.map((d, idx) => ({
      name: d.name || `Stop ${idx + 1}`,
      latitude: parseFloat(d.latitude),
      longitude: parseFloat(d.longitude),
      district: d.district || '',
      category: d.category || '',
      rating: d.rating || null,
      day: idx + 1,
      isStart: false
    }))
  ];

  const vehicle = resolveVehicle(vehicleType);
  const trafficInfo = getTrafficStatus();
  const profile = vehicle.osrmProfile;
  const paceMultiplier = vehicle.terrainPaceMultiplier || 1.0;

  // Build coordinate sequence: lng1,lat1;lng2,lat2;...
  const coordsString = allWaypoints.map(w => `${w.longitude},${w.latitude}`).join(';');
  const osrmUrl = `http://router.project-osrm.org/route/v1/${profile}/${coordsString}`;

  try {
    const response = await axios.get(osrmUrl, {
      params: {
        overview: 'full',
        geometries: 'geojson',
        steps: false,
        annotations: false,
        alternatives: includeAlternatives ? 'true' : 'false'
      },
      headers: {
        'User-Agent': 'DreamCeylonApp-SEU-IS-22-ICT-037/1.0'
      },
      timeout: 10000
    });

    if (response.data && response.data.code === 'Ok' && response.data.routes && response.data.routes.length > 0) {
      const primaryRoute = response.data.routes[0];
      const leafletCoordinates = primaryRoute.geometry.coordinates.map(pt => [pt[1], pt[0]]);
      const adjustedTotalSeconds = Math.round(primaryRoute.duration * paceMultiplier);

      // Process legs between consecutive waypoints
      const legs = (primaryRoute.legs || []).map((leg, index) => {
        const fromWaypoint = allWaypoints[index];
        const toWaypoint = allWaypoints[index + 1];
        const adjustedLegSeconds = Math.round(leg.duration * paceMultiplier);
        return {
          legIndex: index + 1,
          fromName: fromWaypoint ? fromWaypoint.name : `Stop ${index}`,
          toName: toWaypoint ? toWaypoint.name : `Stop ${index + 1}`,
          fromDistrict: fromWaypoint?.district || '',
          toDistrict: toWaypoint?.district || '',
          distanceMeters: leg.distance,
          distanceKm: formatDistanceKm(leg.distance),
          durationSeconds: adjustedLegSeconds,
          durationFormatted: formatDurationText(adjustedLegSeconds),
          rawEngineDurationSeconds: Math.round(leg.duration),
          rawEngineDurationFormatted: formatDurationText(leg.duration),
          summary: leg.summary || `Leg ${index + 1}`
        };
      });

      // Build alternatives if returned by OSRM
      let routes = response.data.routes.map((r, index) => {
        const adjSec = Math.round(r.duration * paceMultiplier);
        return {
          id: index,
          label: index === 0 ? 'Primary Optimal Route' : `Alternative Route ${index}`,
          distanceMeters: r.distance,
          distanceKm: formatDistanceKm(r.distance),
          durationSeconds: adjSec,
          durationFormatted: formatDurationText(adjSec),
          rawEngineDurationSeconds: Math.round(r.duration),
          rawEngineDurationFormatted: formatDurationText(r.duration),
          coordinates: r.geometry.coordinates,
          leafletCoordinates: r.geometry.coordinates.map(pt => [pt[1], pt[0]])
        };
      });

      // If OSRM returned 1 route for a 3+ waypoint sequence and alternatives were requested,
      // check if any individual leg has an alternative corridor so the user can compare options
      if (routes.length === 1 && includeAlternatives && allWaypoints.length >= 2) {
        try {
          const firstLegAltUrl = `http://router.project-osrm.org/route/v1/${profile}/${allWaypoints[0].longitude},${allWaypoints[0].latitude};${allWaypoints[1].longitude},${allWaypoints[1].latitude}`;
          const altLegRes = await axios.get(firstLegAltUrl, {
            params: { overview: 'full', geometries: 'geojson', alternatives: 'true' },
            headers: { 'User-Agent': 'DreamCeylonApp-SEU-IS-22-ICT-037/1.0' },
            timeout: 4500
          });
          if (altLegRes.data?.routes && altLegRes.data.routes.length > 1) {
            const altFirstLeg = altLegRes.data.routes[1];
            const firstLegPrimary = primaryRoute.legs[0] || { distance: 0, duration: 0 };
            const remainingDist = Math.max(0, primaryRoute.distance - firstLegPrimary.distance);
            const remainingDur = Math.max(0, primaryRoute.duration - firstLegPrimary.duration);
            const altTotalDist = altFirstLeg.distance + remainingDist;
            const altTotalRawDur = altFirstLeg.duration + remainingDur;
            const altTotalAdjDur = Math.round(altTotalRawDur * paceMultiplier);

            // Splice alternative first-leg geometry with the remaining route coordinates
            const secondStopLat = allWaypoints[1].latitude;
            const secondStopLng = allWaypoints[1].longitude;
            let splitIdx = 0;
            let minDiff = Infinity;
            primaryRoute.geometry.coordinates.forEach((coord, cIdx) => {
              const diff = Math.abs(coord[1] - secondStopLat) + Math.abs(coord[0] - secondStopLng);
              if (diff < minDiff) {
                minDiff = diff;
                splitIdx = cIdx;
              }
            });
            const combinedAltCoords = [
              ...altFirstLeg.geometry.coordinates,
              ...primaryRoute.geometry.coordinates.slice(splitIdx)
            ];

            routes.push({
              id: 1,
              label: `Alternative Corridor (via ${altFirstLeg.legs?.[0]?.summary || 'Secondary Highway'})`,
              distanceMeters: altTotalDist,
              distanceKm: formatDistanceKm(altTotalDist),
              durationSeconds: altTotalAdjDur,
              durationFormatted: formatDurationText(altTotalAdjDur),
              rawEngineDurationSeconds: Math.round(altTotalRawDur),
              rawEngineDurationFormatted: formatDurationText(altTotalRawDur),
              coordinates: combinedAltCoords,
              leafletCoordinates: combinedAltCoords.map(pt => [pt[1], pt[0]])
            });
          }
        } catch (altLegErr) {
          // Ignore optional alternative leg enrichment failure
        }
      }

      return cacheCalculatedRoute({
        totalDistanceMeters: primaryRoute.distance,
        totalDistanceKm: formatDistanceKm(primaryRoute.distance),
        totalDurationSeconds: adjustedTotalSeconds,
        totalDurationFormatted: formatDurationText(adjustedTotalSeconds),
        rawEngineDurationSeconds: Math.round(primaryRoute.duration),
        rawEngineDurationFormatted: formatDurationText(primaryRoute.duration),
        routeCoordinates: primaryRoute.geometry.coordinates,
        leafletCoordinates,
        legs,
        waypoints: allWaypoints,
        routes,
        hasAlternatives: routes.length > 1,
        alternativesCount: routes.length,
        alternativesNote: routes.length > 1 
          ? `${routes.length} route options found from OSRM provider.`
          : 'OSRM generates a unified optimal multi-stop sequence. Separate corridor alternatives are supported where secondary highways exist.',
        vehicle: {
          type: vehicle.key,
          label: vehicle.label,
          category: vehicle.category,
          capacity: vehicle.capacity,
          routingProfileUsed: vehicle.osrmProfile,
          terrainPaceMultiplier: paceMultiplier,
          terrainPaceNote: vehicle.terrainPaceNote,
          providerNotes: vehicle.providerNotes
        },
        traffic: trafficInfo,
        provider: 'OSRM (Open Source Routing Machine)'
      });
    }
  } catch (error) {
    console.warn(`MapService - Multi-route OSRM request failed (${error.message}). Activating fallback calculation.`);
  }

  // Fallback sequential calculation if OSRM is offline / unreachable
  let aggregatedDistance = 0;
  let aggregatedDuration = 0;
  const legs = [];
  let combinedGeoJson = [];

  for (let i = 0; i < allWaypoints.length - 1; i++) {
    const fromW = allWaypoints[i];
    const toW = allWaypoints[i + 1];
    const crowKm = haversineDistanceKm(fromW.latitude, fromW.longitude, toW.latitude, toW.longitude);
    const legRoadKm = crowKm * 1.32;
    const legMeters = Math.round(legRoadKm * 1000);
    const legSeconds = Math.round((legRoadKm / 44) * 3600);

    aggregatedDistance += legMeters;
    aggregatedDuration += legSeconds;

    legs.push({
      legIndex: i + 1,
      fromName: fromW.name,
      toName: toW.name,
      distanceMeters: legMeters,
      distanceKm: formatDistanceKm(legMeters),
      durationSeconds: legSeconds,
      durationFormatted: formatDurationText(legSeconds),
      summary: `Estimated transit between ${fromW.name} and ${toW.name}`
    });

    const legCoords = generateInterpolatedRoute(fromW.latitude, fromW.longitude, toW.latitude, toW.longitude, 15);
    combinedGeoJson = combinedGeoJson.concat(legCoords);
  }

  const leafletCoords = combinedGeoJson.map(pt => [pt[1], pt[0]]);

  return {
    totalDistanceMeters: aggregatedDistance,
    totalDistanceKm: formatDistanceKm(aggregatedDistance),
    totalDurationSeconds: aggregatedDuration,
    totalDurationFormatted: formatDurationText(aggregatedDuration),
    routeCoordinates: combinedGeoJson,
    leafletCoordinates: leafletCoords,
    legs,
    waypoints: allWaypoints,
    routes: [
      {
        id: 0,
        label: 'Direct Multi-Stop Corridor (Algorithmic Estimate)',
        distanceMeters: aggregatedDistance,
        distanceKm: formatDistanceKm(aggregatedDistance),
        durationSeconds: aggregatedDuration,
        durationFormatted: formatDurationText(aggregatedDuration),
        coordinates: combinedGeoJson,
        leafletCoordinates: leafletCoords
      }
    ],
    hasAlternatives: false,
    alternativesCount: 1,
    alternativesNote: 'Multi-destination route planned using topological distance estimation.',
    vehicle: {
      type: vehicle.key,
      label: vehicle.label,
      category: vehicle.category,
      capacity: vehicle.capacity,
      routingProfileUsed: vehicle.osrmProfile,
      providerNotes: vehicle.providerNotes
    },
    traffic: trafficInfo,
    provider: 'Dream Ceylon Geographic Routing Engine (Fallback)'
  };
};

/**
 * Nearby Destinations Search based on coordinates & spherical distance
 */
const nearbyDestinations = async (lat, lng, radiusInKm = 60, limit = 12) => {
  const centerLat = parseFloat(lat);
  const centerLng = parseFloat(lng);
  const radius = parseFloat(radiusInKm) || 60;

  if (isNaN(centerLat) || isNaN(centerLng)) {
    throw new Error('Valid latitude and longitude are required.');
  }

  let allDestinations = [];
  try {
    allDestinations = await Destination.find({});
  } catch (err) {
    console.error('MapService - Database query error in nearbyDestinations:', err.message);
  }

  // Fallback to preset destinations if DB is empty
  if (!allDestinations || allDestinations.length === 0) {
    allDestinations = PRESET_START_LOCATIONS.map(p => ({
      _id: p.id,
      name: p.name,
      district: p.district,
      category: p.type,
      latitude: p.latitude,
      longitude: p.longitude,
      rating: 4.8
    }));
  }

  const nearby = allDestinations
    .map(dest => {
      const distance = haversineDistanceKm(centerLat, centerLng, dest.latitude, dest.longitude);
      return {
        ...(dest.toObject ? dest.toObject() : dest),
        distanceKm: distance.toFixed(1),
        distanceNumeric: distance
      };
    })
    .filter(dest => dest.distanceNumeric <= radius)
    .sort((a, b) => a.distanceNumeric - b.distanceNumeric)
    .slice(0, parseInt(limit) || 12);

  return nearby;
};

/**
 * Optimize destination sequence using Nearest-Neighbor Haversine ordering from startLocation
 */
const optimizeDestinationOrder = (startLocation, destinations = []) => {
  if (!startLocation || !Array.isArray(destinations) || destinations.length <= 1) {
    return destinations;
  }
  const remaining = [...destinations];
  const ordered = [];
  let currentLat = parseFloat(startLocation.latitude);
  let currentLng = parseFloat(startLocation.longitude);

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = remaining[i];
      const lat = parseFloat(d?.latitude);
      const lng = parseFloat(d?.longitude);
      if (!isNaN(lat) && !isNaN(lng) && !isNaN(currentLat) && !isNaN(currentLng)) {
        const dist = haversineDistanceKm(currentLat, currentLng, lat, lng);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
    }
    const chosen = remaining.splice(bestIdx, 1)[0];
    ordered.push(chosen);
    if (!isNaN(parseFloat(chosen?.latitude)) && !isNaN(parseFloat(chosen?.longitude))) {
      currentLat = parseFloat(chosen.latitude);
      currentLng = parseFloat(chosen.longitude);
    }
  }
  return ordered;
};

/**
 * Retrieve curated preset Sri Lanka starting hubs
 */
const getPresetStartLocations = () => {
  return PRESET_START_LOCATIONS;
};

module.exports = {
  PRESET_START_LOCATIONS,
  VEHICLE_CATALOG,
  geocodeLocation,
  calculateRoute,
  calculateMultiRoute,
  optimizeDestinationOrder,
  getCachedRouteById,
  nearbyDestinations,
  getPresetStartLocations,
  getTrafficStatus,
  formatDistanceKm,
  formatDurationText,
  haversineDistanceKm
};
