const mapService = require('./services/mapService');
const mapController = require('./controllers/mapController');

/**
 * Module 2: Comprehensive Automated Verification Suite
 * Student Reg: SEU/IS/22/ICT/037
 * University: South Eastern University of Sri Lanka
 */

const mockRes = () => {
  const res = { statusCode: 200, data: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.data = data; return res; };
  return res;
};

const runTests = async () => {
  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, detail = '') => {
    if (condition) {
      console.log(`[PASS] ${testName} ${detail ? `(${detail})` : ''}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  };

  console.log('====================================================');
  console.log('MODULE 2: MAPS, ROUTES & TRANSPORTATION TEST SUITE');
  console.log('Student Registration: SEU/IS/22/ICT/037');
  console.log('====================================================\n');

  // Test 1: Presets
  try {
    const presets = mapService.getPresetStartLocations();
    assert(Array.isArray(presets) && presets.length >= 5, 'Preset Start Locations', `${presets.length} presets loaded`);
    const airport = presets.find(p => p.id === 'cmb-airport');
    assert(airport && airport.latitude > 7 && airport.longitude > 79, 'CMB Airport Preset Validation', `Lat: ${airport.latitude}, Lng: ${airport.longitude}`);
  } catch (err) {
    assert(false, 'Preset Start Locations', err.message);
  }

  // Test 2: Geocoding Known Preset
  try {
    const geo = await mapService.geocodeLocation('Bandaranaike');
    assert(geo && geo.lat === 7.1808 && geo.lng === 79.8841, 'Geocoding Preset Gateway', geo.displayName);
  } catch (err) {
    assert(false, 'Geocoding Preset Gateway', err.message);
  }

  // Test 3: Geocoding Empty / Invalid Input
  try {
    await mapService.geocodeLocation('');
    assert(false, 'Geocoding Empty String Validation', 'Should have thrown error');
  } catch (err) {
    assert(true, 'Geocoding Empty String Validation', err.message);
  }

  // Test 4: Traffic-Aware Travel Information Status
  try {
    const traffic = mapService.getTrafficStatus();
    assert(traffic && typeof traffic.hasLiveTraffic === 'boolean', 'Traffic Status Structure');
    assert(traffic.statusMessage.includes('Live traffic information is currently unavailable') || traffic.hasLiveTraffic === true, 'Traffic Notice Transparency', traffic.statusMessage.slice(0, 60) + '...');
  } catch (err) {
    assert(false, 'Traffic Status Check', err.message);
  }

  // Test 5: Vehicle Selection & Routing Profile
  try {
    const carRoute = await mapService.calculateRoute(7.1808, 79.8841, 7.2936, 80.6413, 'car', true);
    assert(carRoute && carRoute.vehicle.type === 'car', 'Vehicle Selection (Car)', `Distance: ${carRoute.distanceKm}, Time: ${carRoute.durationFormatted}`);

    const vanRoute = await mapService.calculateRoute(7.1808, 79.8841, 7.2936, 80.6413, 'van', true);
    assert(vanRoute && vanRoute.vehicle.type === 'van', 'Vehicle Selection (Van)', `Profile: ${vanRoute.vehicle.routingProfileUsed}`);
    assert(vanRoute.vehicle.providerNotes.includes('driving'), 'Honest Provider Capability Note (Van)');

    const bikeRoute = await mapService.calculateRoute(7.1808, 79.8841, 7.2936, 80.6413, 'motorcycle', true);
    assert(bikeRoute && bikeRoute.vehicle.type === 'motorcycle', 'Vehicle Selection (Motorcycle)', `Category: ${bikeRoute.vehicle.category}`);
  } catch (err) {
    assert(false, 'Vehicle Routing Tests', err.message);
  }

  // Test 6: Multi-Destination Route Calculation (Airport -> Sigiriya -> Kandy -> Nuwara Eliya)
  try {
    const startLocation = { name: 'Bandaranaike International Airport (CMB)', latitude: 7.1808, longitude: 79.8841, district: 'Gampaha' };
    const destinations = [
      { name: 'Sigiriya Rock Fortress', latitude: 7.9570, longitude: 80.7603, district: 'Matale', category: 'Cultural' },
      { name: 'Kandy Temple of Tooth', latitude: 7.2906, longitude: 80.6337, district: 'Kandy', category: 'Cultural' },
      { name: 'Nuwara Eliya Highlands', latitude: 6.9497, longitude: 80.7828, district: 'Nuwara Eliya', category: 'Mountain' }
    ];

    const multi = await mapService.calculateMultiRoute({
      startLocation,
      destinations,
      vehicleType: 'van',
      includeAlternatives: true
    });

    assert(multi && multi.totalDistanceMeters > 0, 'Multi-Destination Route Calculation', `Total: ${multi.totalDistanceKm}`);
    assert(multi.legs && multi.legs.length === 3, 'Leg-by-Leg Breakdown Integrity', `${multi.legs.length} legs calculated`);
    assert(multi.leafletCoordinates && multi.leafletCoordinates.length > 0, 'Polyline Coordinates Generated', `${multi.leafletCoordinates.length} coordinate points`);
    
    multi.legs.forEach((leg, i) => {
      console.log(`    Leg ${i + 1}: ${leg.fromName} -> ${leg.toName} [${leg.distanceKm}, ${leg.durationFormatted}]`);
    });
  } catch (err) {
    assert(false, 'Multi-Destination Route Calculation', err.message);
  }

  // Test 7: Controller Endpoints & Input Validation
  try {
    // Missing coords validation
    const resErr = mockRes();
    await mapController.getRoute({ query: { originLat: '7.18' } }, resErr);
    assert(resErr.statusCode === 400, 'Controller Coordinate Validation (Missing Params)', resErr.data.error);

    // Invalid non-numeric coords
    const resBadCoords = mockRes();
    await mapController.getRoute({ query: { originLat: 'abc', originLng: '79.88', destLat: '7.29', destLng: '80.64' } }, resBadCoords);
    assert(resBadCoords.statusCode === 400, 'Controller Coordinate Validation (Non-Numeric)', resBadCoords.data.error);

    // Multi-route controller endpoint
    const resMulti = mockRes();
    await mapController.calculateMultiRoute({
      body: {
        startLocation: { name: 'Colombo Fort', latitude: 6.9344, longitude: 79.8428 },
        destinations: [{ name: 'Galle Fort', latitude: 6.0300, longitude: 80.2170 }],
        vehicleType: 'car'
      }
    }, resMulti);
    assert(resMulti.statusCode === 200 && resMulti.data.success === true, 'Controller Multi-Route Endpoint', `Total: ${resMulti.data.data.totalDistanceKm}`);

    // Presets controller endpoint
    const resPresets = mockRes();
    await mapController.getPresets({}, resPresets);
    assert(resPresets.statusCode === 200 && resPresets.data.count >= 5, 'Controller Presets Endpoint', `${resPresets.data.count} hubs`);

    // Traffic controller endpoint
    const resTraffic = mockRes();
    await mapController.getTrafficStatus({}, resTraffic);
    assert(resTraffic.statusCode === 200, 'Controller Traffic Status Endpoint', `Live traffic: ${resTraffic.data.data.hasLiveTraffic}`);
  } catch (err) {
    assert(false, 'Controller Endpoints & Validation', err.message);
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
};

runTests();

