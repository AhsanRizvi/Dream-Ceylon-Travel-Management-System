const mapService = require('../services/mapService');

/**
 * Module 2: Maps, Routes and Transportation
 * Student Reg: SEU/IS/22/ICT/037
 * University: South Eastern University of Sri Lanka
 * 
 * Map Controller handling HTTP endpoints for geocoding, single and multi-destination routing,
 * vehicle selection metadata, alternatives, and traffic status.
 */

// 1. Geocode Location Address
exports.geocode = async (req, res) => {
  try {
    const address = req.query.address || req.query.q;
    if (!address || typeof address !== 'string' || !address.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Address parameter is required (e.g. ?address=Bandaranaike Airport or ?address=Kandy).'
      });
    }

    const location = await mapService.geocodeLocation(address.trim());
    return res.status(200).json({
      success: true,
      data: location
    });
  } catch (err) {
    console.error('MapController.geocode error:', err.message);
    return res.status(err.message.includes('not be resolved') ? 404 : 500).json({
      success: false,
      error: err.message || 'Failed to geocode location.'
    });
  }
};

// 2. Point-to-Point Route Calculation
exports.getRoute = async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng, vehicleType, alternatives } = req.query;

    if (!originLat || !originLng || !destLat || !destLng) {
      return res.status(400).json({
        success: false,
        error: 'Origin coordinates (originLat, originLng) and destination coordinates (destLat, destLng) are required.'
      });
    }

    const parsedOriginLat = parseFloat(originLat);
    const parsedOriginLng = parseFloat(originLng);
    const parsedDestLat = parseFloat(destLat);
    const parsedDestLng = parseFloat(destLng);

    if (isNaN(parsedOriginLat) || isNaN(parsedOriginLng) || isNaN(parsedDestLat) || isNaN(parsedDestLng)) {
      return res.status(400).json({
        success: false,
        error: 'Coordinates must be valid numerical floating-point numbers.'
      });
    }

    const includeAlternatives = alternatives === 'true' || alternatives === true || alternatives === '1';

    const routeData = await mapService.calculateRoute(
      parsedOriginLat,
      parsedOriginLng,
      parsedDestLat,
      parsedDestLng,
      vehicleType || 'car',
      includeAlternatives
    );

    return res.status(200).json({
      success: true,
      data: routeData
    });
  } catch (err) {
    console.error('MapController.getRoute error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to calculate route.'
    });
  }
};

// 3. Multi-Destination Route Calculation
exports.calculateMultiRoute = async (req, res) => {
  try {
    // Support either POST body or GET query (e.g., if passed as JSON string in query)
    let payload = req.body;
    if ((!payload || Object.keys(payload).length === 0) && req.query.data) {
      try {
        payload = JSON.parse(req.query.data);
      } catch (parseErr) {
        return res.status(400).json({ success: false, error: 'Invalid JSON format in query parameter.' });
      }
    }

    const { startLocation, destinations, vehicleType, alternatives } = payload || {};

    if (!startLocation || !startLocation.latitude || !startLocation.longitude) {
      return res.status(400).json({
        success: false,
        error: 'startLocation object with latitude and longitude is required.'
      });
    }

    if (!destinations || !Array.isArray(destinations) || destinations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'destinations array containing at least 1 destination is required.'
      });
    }

    const includeAlternatives = alternatives === true || alternatives === 'true';

    const multiRouteResult = await mapService.calculateMultiRoute({
      startLocation,
      destinations,
      vehicleType: vehicleType || 'car',
      includeAlternatives
    });

    return res.status(200).json({
      success: true,
      data: multiRouteResult
    });
  } catch (err) {
    console.error('MapController.calculateMultiRoute error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to calculate multi-destination route.'
    });
  }
};

// 4. Nearby Destinations Search
exports.getNearby = async (req, res) => {
  try {
    const { lat, lng, radius, limit } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude (lat) and longitude (lng) query parameters are required.'
      });
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const parsedRadius = radius ? parseFloat(radius) : 60;
    const parsedLimit = limit ? parseInt(limit) : 10;

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return res.status(400).json({
        success: false,
        error: 'Coordinates must be valid numbers.'
      });
    }

    const results = await mapService.nearbyDestinations(parsedLat, parsedLng, parsedRadius, parsedLimit);
    return res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (err) {
    console.error('MapController.getNearby error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to find nearby destinations.'
    });
  }
};

// 5. Preset Sri Lanka Starting Hubs
exports.getPresets = async (req, res) => {
  try {
    const presets = mapService.getPresetStartLocations();
    return res.status(200).json({
      success: true,
      count: presets.length,
      data: presets
    });
  } catch (err) {
    console.error('MapController.getPresets error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve preset start locations.'
    });
  }
};

// 6. Traffic Provider Status
exports.getTrafficStatus = async (req, res) => {
  try {
    const status = mapService.getTrafficStatus();
    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (err) {
    console.error('MapController.getTrafficStatus error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve traffic status.'
    });
  }
};
