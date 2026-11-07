const express = require('express');
const { 
  geocode, 
  getRoute, 
  calculateMultiRoute, 
  getNearby, 
  getPresets, 
  getTrafficStatus,
  calculateRouteEndpoint,
  calculateAlternativesEndpoint,
  getRouteById
} = require('../controllers/mapController');

/**
 * Module 2: Maps, Routes and Transportation
 * Student Reg: SEU/IS/22/ICT/037
 * University: South Eastern University of Sri Lanka
 * 
 * Express Router for Map and Route Operations (Mounted at /api/maps and /api/routes)
 */
const router = express.Router();

router.get('/geocode', geocode);
router.get('/route', getRoute);
router.post('/multi-route', calculateMultiRoute);
router.get('/multi-route', calculateMultiRoute);
router.get('/nearby', getNearby);
router.get('/presets', getPresets);
router.get('/traffic-status', getTrafficStatus);

// Section 6 Route Calculation & Alternatives Endpoints
router.post('/calculate', calculateRouteEndpoint);
router.post('/alternatives', calculateAlternativesEndpoint);
router.get('/:id', getRouteById);

module.exports = router;
