const mongoose = require('mongoose');
const mapService = require('../services/mapService');
const TourPlan = require('../models/TourPlan');
const Destination = require('../models/Destination');

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

// 7. Unified Route Calculation Endpoint (POST /api/routes/calculate)
exports.calculateRouteEndpoint = async (req, res) => {
  try {
    const {
      startLocation,
      destinations,
      destinationIds,
      originLat,
      originLng,
      destLat,
      destLng,
      vehicleType = 'car',
      alternatives = true,
      optimizeOrder = false,
      tourPlanId = null
    } = req.body || {};

    // Case A: Point-to-point coordinates provided directly
    if (
      originLat !== undefined &&
      originLng !== undefined &&
      destLat !== undefined &&
      destLng !== undefined &&
      (!destinations || destinations.length === 0) &&
      (!destinationIds || destinationIds.length === 0)
    ) {
      const oLat = parseFloat(originLat);
      const oLng = parseFloat(originLng);
      const dLat = parseFloat(destLat);
      const dLng = parseFloat(destLng);

      if (isNaN(oLat) || isNaN(oLng) || isNaN(dLat) || isNaN(dLng)) {
        return res.status(400).json({
          success: false,
          error: 'Coordinates must be valid numerical floating-point numbers.'
        });
      }

      const routeResult = await mapService.calculateRoute(
        oLat,
        oLng,
        dLat,
        dLng,
        vehicleType,
        Boolean(alternatives)
      );

      return res.status(200).json({
        success: true,
        routeId: routeResult.routeId,
        data: routeResult
      });
    }

    // Case B: Multi-destination or destinationIds array provided
    let resolvedDestinations = Array.isArray(destinations) ? [...destinations] : [];
    if (resolvedDestinations.length === 0 && Array.isArray(destinationIds) && destinationIds.length > 0) {
      const validIds = destinationIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
      const docs = await Destination.find({ _id: { $in: validIds } }).lean();
      const docMap = new Map(docs.map((d) => [d._id.toString(), d]));
      resolvedDestinations = validIds.map((id) => docMap.get(id.toString())).filter(Boolean);
    }

    if (resolvedDestinations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least one destination or valid origin/destination coordinates.'
      });
    }

    // Resolve startLocation (defaults to Bandaranaike International Airport CMB if omitted)
    const originObj =
      startLocation && startLocation.latitude !== undefined && startLocation.longitude !== undefined
        ? startLocation
        : mapService.getPresetStartLocations()[0];

    if (optimizeOrder && resolvedDestinations.length > 1) {
      resolvedDestinations = mapService.optimizeDestinationOrder(originObj, resolvedDestinations);
    }

    const multiResult = await mapService.calculateMultiRoute({
      startLocation: originObj,
      destinations: resolvedDestinations,
      vehicleType,
      includeAlternatives: Boolean(alternatives)
    });

    // Optionally persist routeData onto a TourPlan if tourPlanId is supplied
    if (tourPlanId && mongoose.Types.ObjectId.isValid(tourPlanId)) {
      await TourPlan.findByIdAndUpdate(tourPlanId, {
        $set: {
          startLocation: originObj,
          routeData: {
            routeId: multiResult.routeId,
            totalDistanceKm: multiResult.totalDistanceKm,
            totalDurationFormatted: multiResult.totalDurationFormatted,
            vehicle: multiResult.vehicle,
            legs: multiResult.legs,
            calculatedAt: new Date()
          }
        }
      }).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      routeId: multiResult.routeId,
      optimizedOrder: Boolean(optimizeOrder),
      data: multiResult
    });
  } catch (err) {
    console.error('MapController.calculateRouteEndpoint error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to calculate route.'
    });
  }
};

// 8. Route Alternatives Endpoint (POST /api/routes/alternatives)
exports.calculateAlternativesEndpoint = async (req, res) => {
  try {
    req.body = { ...(req.body || {}), alternatives: true };
    return exports.calculateRouteEndpoint(req, res);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to calculate route alternatives.'
    });
  }
};

// 9. Get Saved or Cached Route by ID (GET /api/routes/:id)
exports.getRouteById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Route ID or TourPlan ID is required.' });
    }

    // 1. Check in-memory calculated route cache
    const cached = mapService.getCachedRouteById(id);
    if (cached) {
      return res.status(200).json({
        success: true,
        source: 'routeCache',
        data: cached
      });
    }

    // 2. If valid MongoDB ObjectId, check TourPlan collection
    if (mongoose.Types.ObjectId.isValid(id)) {
      const plan = await TourPlan.findById(id).populate('stops').lean();
      if (plan) {
        if (plan.routeData && plan.routeData.totalDistanceKm) {
          return res.status(200).json({
            success: true,
            source: 'TourPlan',
            tourPlanId: plan._id,
            data: plan.routeData
          });
        }
        // Dynamically compute route for the TourPlan's stops if not yet computed
        if (Array.isArray(plan.stops) && plan.stops.length > 0) {
          const originObj = plan.startLocation || mapService.getPresetStartLocations()[0];
          const computed = await mapService.calculateMultiRoute({
            startLocation: originObj,
            destinations: plan.stops,
            vehicleType: (plan.transportType || 'Car').toLowerCase(),
            includeAlternatives: true
          });
          return res.status(200).json({
            success: true,
            source: 'TourPlanDynamicCalculation',
            tourPlanId: plan._id,
            data: computed
          });
        }
      }
    }

    return res.status(404).json({
      success: false,
      error: `No cached route or TourPlan found for ID "${id}".`
    });
  } catch (err) {
    console.error('MapController.getRouteById error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to retrieve route by ID.'
    });
  }
};
