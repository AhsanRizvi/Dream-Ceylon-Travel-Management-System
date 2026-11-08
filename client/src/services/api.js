import axios from 'axios';

/**
 * Module 2 & Module 7: Maps, Routes, Transportation & Popularity Analytics API Client
 * Student Reg: SEU/IS/22/ICT/037
 * University: South Eastern University of Sri Lanka
 */

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper: Generate or retrieve persistent browser tab session ID for view deduplication
export const getClientSessionId = () => {
  try {
    let sid = sessionStorage.getItem('dc_client_session_id');
    if (!sid) {
      sid = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('dc_client_session_id', sid);
    }
    return sid;
  } catch (e) {
    return 'default_browser_session';
  }
};

// ==========================================
// MODULE 2: MAPS, ROUTES & TRANSPORTATION APIS
// ==========================================

/**
 * Fetch preset Sri Lankan starting hubs and gateways
 */
export const getPresetStartLocations = async () => {
  const res = await api.get('/maps/presets');
  return res.data?.data || [];
};

/**
 * Geocode a custom address or landmark in Sri Lanka
 */
export const geocodeLocation = async (address) => {
  const res = await api.get('/maps/geocode', {
    params: { address }
  });
  return res.data?.data;
};

/**
 * Calculate point-to-point route with optional alternatives
 */
export const getRoute = async (originLat, originLng, destLat, destLng, vehicleType = 'car', alternatives = true) => {
  const res = await api.get('/maps/route', {
    params: {
      originLat,
      originLng,
      destLat,
      destLng,
      vehicleType,
      alternatives
    }
  });
  return res.data?.data;
};

/**
 * Calculate multi-destination chained tour route
 */
export const calculateMultiRoute = async ({ startLocation, destinations, vehicleType = 'car', alternatives = true }) => {
  const res = await api.post('/maps/multi-route', {
    startLocation,
    destinations,
    vehicleType,
    alternatives
  });
  return res.data?.data;
};

/**
 * Unified Route Calculation endpoint (POST /api/routes/calculate)
 */
export const calculateRouteApi = async (payload) => {
  const res = await api.post('/routes/calculate', payload);
  return res.data?.data;
};

/**
 * Route Alternatives endpoint (POST /api/routes/alternatives)
 */
export const calculateRouteAlternativesApi = async (payload) => {
  const res = await api.post('/routes/alternatives', payload);
  return res.data?.data;
};

/**
 * Retrieve cached route or saved TourPlan route by ID (GET /api/routes/:id)
 */
export const getRouteByIdApi = async (routeOrPlanId) => {
  const res = await api.get(`/routes/${routeOrPlanId}`);
  return res.data?.data;
};

/**
 * Find nearby tourist destinations within a given radius in km
 */
export const getNearbyDestinations = async (lat, lng, radius = 60, limit = 12) => {
  const res = await api.get('/maps/nearby', {
    params: { lat, lng, radius, limit }
  });
  return res.data?.data || [];
};

/**
 * Check traffic service provider status
 */
export const getTrafficStatus = async () => {
  const res = await api.get('/maps/traffic-status');
  return res.data?.data;
};

// ==========================================
// MODULE 7: POPULAR, MOST-VIEWED & LAST-MINUTE APIS
// ==========================================

/**
 * Safely record a user view when opening a destination details page
 */
export const recordDestinationView = async (destinationId) => {
  const sessionId = getClientSessionId();
  const res = await api.post(
    `/destinations/${destinationId}/view`,
    { sessionId },
    { headers: { 'x-session-id': sessionId } }
  );
  return res.data;
};

/**
 * Fetch Most-Viewed Destinations sorted by actual viewCount
 */
export const getMostViewedDestinations = async (params = {}) => {
  const res = await api.get('/destinations/most-viewed', { params });
  return res.data;
};

/**
 * Fetch Top-Rated Destinations (Bayesian weighted review ranking)
 */
export const getTopRatedDestinations = async (params = {}) => {
  const res = await api.get('/destinations/top-rated', { params });
  return res.data;
};

/**
 * Fetch Popular Places in Sri Lanka (Composite Popularity Score)
 */
export const getPopularDestinations = async (params = {}) => {
  const res = await api.get('/destinations/popular', { params });
  return res.data;
};

/**
 * Fetch Last-Minute Travel Suggestions
 */
export const getLastMinuteRecommendations = async (params = {}) => {
  const res = await api.get('/destinations/last-minute', { params });
  return res.data;
};

export default api;
