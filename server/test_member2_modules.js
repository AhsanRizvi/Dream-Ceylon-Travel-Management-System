const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const connectDB = require('./config/db');
const Destination = require('./models/Destination');
const TourPlan = require('./models/TourPlan');
const Review = require('./models/Review');
const User = require('./models/User');

const destinationRoutes = require('./routes/destinationRoutes');
const mapRoutes = require('./routes/mapRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const plannerRoutes = require('./routes/plannerRoutes');
const authRoutes = require('./routes/authRoutes');

/**
 * Member 2 – Complete End-to-End Integration Test Suite
 * Modules Tested:
 *   - Module 2: Route, Map and Transportation Management (/api/maps & /api/routes)
 *   - Module 7: Popular, Most-Viewed and Last-Minute Recommendations (/api/destinations/* & /api/reviews)
 */

async function runMember2Tests() {
  console.log('================================================================');
  console.log('MEMBER 2: MODULE 2 & MODULE 7 END-TO-END INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  await connectDB();

  const app = express();
  app.use(express.json());
  app.use(cors());

  app.use('/api/auth', authRoutes);
  app.use('/api/destinations', destinationRoutes);
  app.use('/api/maps', mapRoutes);
  app.use('/api/routes', mapRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/planner', plannerRoutes);

  let passed = 0;
  let failed = 0;

  const assert = (cond, name, detail = '') => {
    if (cond) {
      console.log(`  [PASS] ${name}${detail ? ` -> ${detail}` : ''}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  };

  const server = app.listen(0, async () => {
    const port = server.address().port;

    const httpRequest = (method, urlPath, body = null, headers = {}) =>
      new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port,
            path: urlPath,
            method,
            headers: {
              'Content-Type': 'application/json',
              ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
              ...headers
            }
          },
          (res) => {
            let raw = '';
            res.on('data', (chunk) => (raw += chunk));
            res.on('end', () => {
              try {
                resolve({ status: res.statusCode, body: JSON.parse(raw) });
              } catch (e) {
                resolve({ status: res.statusCode, raw });
              }
            });
          }
        );
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
      });

    try {
      // ====================================================================
      // PART 1: MODULE 2 – ROUTE, MAP AND TRANSPORTATION MANAGEMENT
      // ====================================================================
      console.log('--- PART 1: Module 2 (Maps, Routes & Transportation) ---');

      // 1.1 POST /api/routes/calculate with Car, Van, Motorcycle
      const sigiriya = await Destination.findOne({ name: 'Sigiriya Rock Fortress' });
      const kandy = await Destination.findOne({ name: 'Temple of the Tooth (Kandy)' });
      const ella = await Destination.findOne({ name: 'Ella' });

      const startHub = {
        name: 'Bandaranaike International Airport (CMB)',
        latitude: 7.1808,
        longitude: 79.8841,
        district: 'Gampaha'
      };

      const carCalc = await httpRequest('POST', '/api/routes/calculate', {
        startLocation: startHub,
        destinations: [sigiriya, kandy, ella],
        vehicleType: 'car',
        alternatives: true
      });
      assert(
        carCalc.status === 200 && carCalc.body.success && carCalc.body.routeId,
        'POST /api/routes/calculate (Car)',
        `RouteId: ${carCalc.body.routeId}, Total: ${carCalc.body.data.totalDistanceKm}, Time: ${carCalc.body.data.totalDurationFormatted}`
      );

      const vanCalc = await httpRequest('POST', '/api/routes/calculate', {
        startLocation: startHub,
        destinations: [sigiriya, kandy, ella],
        vehicleType: 'van',
        alternatives: false
      });
      assert(
        vanCalc.status === 200 &&
          vanCalc.body.data.vehicle.type === 'van' &&
          vanCalc.body.data.totalDurationSeconds > carCalc.body.data.totalDurationSeconds,
        'POST /api/routes/calculate (Van Pace Adjustment)',
        `Van Time: ${vanCalc.body.data.totalDurationFormatted} vs Car: ${carCalc.body.data.totalDurationFormatted} (Engine base: ${vanCalc.body.data.rawEngineDurationFormatted})`
      );

      const bikeCalc = await httpRequest('POST', '/api/routes/calculate', {
        startLocation: startHub,
        destinations: [sigiriya, kandy, ella],
        vehicleType: 'motorcycle',
        alternatives: false
      });
      assert(
        bikeCalc.status === 200 &&
          bikeCalc.body.data.vehicle.type === 'motorcycle' &&
          bikeCalc.body.data.totalDurationSeconds < carCalc.body.data.totalDurationSeconds,
        'POST /api/routes/calculate (Motorcycle Pace Adjustment)',
        `Motorcycle Time: ${bikeCalc.body.data.totalDurationFormatted} vs Car: ${carCalc.body.data.totalDurationFormatted}`
      );

      // 1.2 Destination Reordering & Nearest-Neighbor Optimization
      const unoptimizedCalc = await httpRequest('POST', '/api/routes/calculate', {
        startLocation: startHub,
        destinations: [ella, sigiriya, kandy], // Intentionally zig-zag order
        vehicleType: 'car',
        optimizeOrder: true
      });
      assert(
        unoptimizedCalc.status === 200 && unoptimizedCalc.body.optimizedOrder === true,
        'POST /api/routes/calculate (Optimize Destination Order)',
        `Optimized sequence: ${unoptimizedCalc.body.data.waypoints.map((w) => w.name).join(' -> ')}`
      );

      // 1.3 POST /api/routes/alternatives
      const altCalc = await httpRequest('POST', '/api/routes/alternatives', {
        originLat: 6.9344,
        originLng: 79.8428,
        destLat: 7.2936,
        destLng: 80.6413,
        vehicleType: 'car'
      });
      assert(
        altCalc.status === 200 && Array.isArray(altCalc.body.data.routes) && altCalc.body.data.routes.length >= 1,
        'POST /api/routes/alternatives',
        `${altCalc.body.data.routes.length} corridor(s) returned`
      );

      // 1.4 GET /api/routes/:id (from cached routeId)
      const getByRouteId = await httpRequest('GET', `/api/routes/${carCalc.body.routeId}`);
      assert(
        getByRouteId.status === 200 &&
          getByRouteId.body.success &&
          getByRouteId.body.data.totalDistanceKm === carCalc.body.data.totalDistanceKm,
        'GET /api/routes/:id (Cached Route ID)',
        `Retrieved ${getByRouteId.body.data.totalDistanceKm}`
      );

      // 1.5 GET /api/routes/:id (from saved TourPlan ID)
      const existingPlan = await TourPlan.findOne();
      if (existingPlan) {
        const getByPlanId = await httpRequest('GET', `/api/routes/${existingPlan._id}`);
        assert(
          getByPlanId.status === 200 && getByPlanId.body.success,
          'GET /api/routes/:id (TourPlan MongoDB ID)',
          `Source: ${getByPlanId.body.source}`
        );
      }

      // ====================================================================
      // PART 2: MODULE 7 – POPULAR, MOST-VIEWED & LAST-MINUTE RECOMMENDATIONS
      // ====================================================================
      console.log('\n--- PART 2: Module 7 (Most-Viewed, Top-Rated, Popular & Last-Minute) ---');

      // 2.1 View Tracking & Deduplication (POST /api/destinations/:id/view)
      const beforeViewDest = await Destination.findById(sigiriya._id);
      const initialViewCount = beforeViewDest.viewCount || 0;
      const testSessionId = `test_sess_${Date.now()}`;

      // First explicit user view -> should increment
      const viewRes1 = await httpRequest(
        'POST',
        `/api/destinations/${sigiriya._id}/view`,
        { sessionId: testSessionId }
      );
      assert(
        viewRes1.status === 200 &&
          viewRes1.body.counted === true &&
          viewRes1.body.viewCount === initialViewCount + 1,
        'POST /api/destinations/:id/view (Initial User View)',
        `Incremented from ${initialViewCount} to ${viewRes1.body.viewCount}`
      );

      // Immediate duplicate render with same sessionId -> should be deduplicated
      const viewResDup = await httpRequest(
        'POST',
        `/api/destinations/${sigiriya._id}/view`,
        { sessionId: testSessionId }
      );
      assert(
        viewResDup.status === 200 &&
          viewResDup.body.counted === false &&
          viewResDup.body.deduplicated === true &&
          viewResDup.body.viewCount === initialViewCount + 1,
        'POST /api/destinations/:id/view (Duplicate Render Protection)',
        `Count remained ${viewResDup.body.viewCount}`
      );

      // Background prefetch request -> should not increment
      const viewResBg = await httpRequest(
        'POST',
        `/api/destinations/${sigiriya._id}/view`,
        { sessionId: `other_${Date.now()}` },
        { 'x-background-fetch': 'true' }
      );
      assert(
        viewResBg.status === 200 &&
          viewResBg.body.counted === false &&
          viewResBg.body.viewCount === initialViewCount + 1,
        'POST /api/destinations/:id/view (Background Prefetch Ignored)',
        `Count remained ${viewResBg.body.viewCount}`
      );

      // GET /api/destinations/:id?skipView=true -> should not increment
      const getSkipRes = await httpRequest(
        'GET',
        `/api/destinations/${sigiriya._id}?skipView=true`
      );
      assert(
        getSkipRes.status === 200 && getSkipRes.body.data.viewCount === initialViewCount + 1,
        'GET /api/destinations/:id?skipView=true (No Side-Effect Increment)',
        `Count remained ${getSkipRes.body.data.viewCount}`
      );

      // 2.2 GET /api/destinations/most-viewed
      const mvRes = await httpRequest('GET', '/api/destinations/most-viewed?limit=8');
      const mvList = mvRes.body?.data || [];
      const isSortedByViews = mvList.every(
        (item, i) => i === 0 || (mvList[i - 1].viewCount || 0) >= (item.viewCount || 0)
      );
      assert(
        mvRes.status === 200 && mvList.length === 8 && isSortedByViews,
        'GET /api/destinations/most-viewed (Sorted by Actual viewCount)',
        `Top 3: ${mvList
          .slice(0, 3)
          .map((d) => `${d.name} (${d.viewCount} views)`)
          .join(', ')}`
      );

      // 2.3 GET /api/destinations/top-rated (Integrated with Review model & Bayesian smoothing)
      const trRes = await httpRequest('GET', '/api/destinations/top-rated?limit=8');
      const trList = trRes.body?.data || [];
      const isSortedByBayesian = trList.every(
        (item, i) => i === 0 || trList[i - 1].weightedScore >= item.weightedScore
      );
      assert(
        trRes.status === 200 &&
          trList.length === 8 &&
          isSortedByBayesian &&
          trList[0].reviewCount > 0,
        'GET /api/destinations/top-rated (Bayesian Review Ranking)',
        `#1: ${trList[0].name} (Score: ${trList[0].weightedScore}, Reviews: ${trList[0].reviewCount})`
      );

      // Verify single-review destination does not outrank multi-review 5.0 destination
      const multiReviewDest = trList.find((d) => d.reviewCount >= 3);
      const singleReviewDest = trList.find((d) => d.reviewCount === 1);
      if (multiReviewDest && singleReviewDest) {
        assert(
          multiReviewDest.weightedScore >= singleReviewDest.weightedScore,
          'Single-Review Outlier Protection (Bayesian Smoothing)',
          `${multiReviewDest.name} (${multiReviewDest.reviewCount} revs, W=${multiReviewDest.weightedScore}) >= ${singleReviewDest.name} (1 rev, W=${singleReviewDest.weightedScore})`
        );
      }

      // 2.4 GET /api/destinations/popular
      const popRes = await httpRequest('GET', '/api/destinations/popular?limit=8');
      const popList = popRes.body?.data || [];
      const isSortedByPop = popList.every(
        (item, i) => i === 0 || popList[i - 1].popularityScore >= item.popularityScore
      );
      assert(
        popRes.status === 200 && popList.length === 8 && isSortedByPop,
        'GET /api/destinations/popular (Composite Popularity Index)',
        `#1: ${popList[0].name} (${popList[0].popularityScore}/100 - ${popList[0].popularityBadge})`
      );

      // 2.5 GET /api/destinations/last-minute
      const lmRes = await httpRequest(
        'GET',
        '/api/destinations/last-minute?days=2&startDate=2026-12-15&limit=6'
      );
      const lmList = lmRes.body?.data || [];
      assert(
        lmRes.status === 200 &&
          lmList.length === 6 &&
          lmList.every(
            (d) =>
              d.availabilityInfo &&
              typeof d.availabilityInfo.isConfirmedBooking === 'boolean' &&
              d.availabilityInfo.isConfirmedBooking === false &&
              Array.isArray(d.lastMinuteReasons)
          ),
        'GET /api/destinations/last-minute (Date, Duration & Honest Availability Info)',
        `Top suggestion: ${lmList[0].name} (${lmList[0].lastMinuteScore}% match, ${lmList[0].availabilityInfo.status})`
      );

      // 2.6 GET /api/reviews/destination/:id & GET /api/reviews/ratings/destination/:id
      const revListRes = await httpRequest('GET', `/api/reviews/destination/${sigiriya._id}`);
      const revStatsRes = await httpRequest(
        'GET',
        `/api/reviews/ratings/destination/${sigiriya._id}`
      );
      assert(
        revListRes.status === 200 &&
          revStatsRes.status === 200 &&
          revStatsRes.body.data.totalReviews >= 3,
        'Destination Review & Rating Aggregation (Module 5 + Module 7 Integration)',
        `${sigiriya.name}: ${revStatsRes.body.data.averageRating}★ across ${revStatsRes.body.data.totalReviews} reviews`
      );

      console.log('\n================================================================');
      console.log(`FINAL TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
      console.log('================================================================');

      server.close();
      await mongoose.connection.close();
      if (failed > 0) process.exit(1);
      process.exit(0);
    } catch (err) {
      console.error('Integration Test Error:', err);
      server.close();
      await mongoose.connection.close();
      process.exit(1);
    }
  });
}

runMember2Tests();

