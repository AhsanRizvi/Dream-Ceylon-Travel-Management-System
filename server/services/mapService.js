const axios = require('axios');
const Destination = require('../models/Destination');

// Geocoding using Nominatim OpenStreetMap API
const geocodeLocation = async (locationName) => {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: locationName,
        format: 'json',
        limit: 1
      },
      headers: {
        'User-Agent': 'DreamCeylonApp/1.0'
      }
    });

    if (response.data && response.data.length > 0) {
      return {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon),
        name: response.data[0].display_name
      };
    } else {
      throw new Error('Location not found.');
    }
  } catch (error) {
    console.error('MapService - geocodeLocation:', error.message);
    throw new Error('Failed to geocode location.');
  }
};

// Routing using OSRM API
const calculateRoute = async (originLat, originLng, destLat, destLng, vehicleType = 'car') => {
  try {
    let mode = 'driving';
    if (vehicleType === 'bike') mode = 'cycling';
    if (vehicleType === 'walking' || vehicleType === 'foot') mode = 'foot';

    // OSRM coordinates are in longitude,latitude order
    const osrmUrl = `http://router.project-osrm.org/route/v1/${mode}/${originLng},${originLat};${destLng},${destLat}`;
    const response = await axios.get(osrmUrl, {
      params: {
        overview: 'full',
        geometries: 'geojson'
      }
    });

    if (response.data.code === 'Ok' && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      return {
        distance: route.distance, // in meters
        duration: route.duration, // in seconds
        coordinates: route.geometry.coordinates // Array of [lng, lat]
      };
    } else {
      throw new Error('No route found.');
    }
  } catch (error) {
    console.error('MapService - calculateRoute:', error.message);
    throw new Error('Failed to calculate route.');
  }
};

// Find nearby destinations based on coordinates
const nearbyDestinations = async (lat, lng, radiusInKm = 50) => {
  try {
    const allDestinations = await Destination.find({});

    // Manual haversine formula to find nearby since we don't have GeoJSON index setup yet
    const toRad = (value) => (value * Math.PI) / 180;

    const nearby = allDestinations.filter(dest => {
      const R = 6371; // km
      const dLat = toRad(dest.latitude - lat);
      const dLon = toRad(dest.longitude - lng);
      const l1 = toRad(lat);
      const l2 = toRad(dest.latitude);

      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(l1) * Math.cos(l2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const d = R * c;
      return d <= radiusInKm;
    });

    return nearby;
  } catch (error) {
    console.error('MapService - nearbyDestinations:', error.message);
    throw new Error('Failed to find nearby destinations.');
  }
};

module.exports = {
  geocodeLocation,
  calculateRoute,
  nearbyDestinations
};
