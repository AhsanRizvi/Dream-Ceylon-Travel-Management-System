import axios from 'axios';

/**
 * Module 2: Maps, Routes and Transportation
 * Student Reg: SEU/IS/22/ICT/037
 * University: South Eastern University of Sri Lanka
 * 
 * Central API Client and Map Services Integration
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

export default api;
