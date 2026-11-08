const axios = require('axios');
const http = require('http');
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const plannerRoutes = require('./routes/plannerRoutes');
const itineraryRoutes = require('./routes/itineraryRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const { getHolidaysList } = require('./controllers/calendarController');
const destinationRoutes = require('./routes/destinationRoutes');
const packageRoutes = require('./routes/packageRoutes');

const runTests = async () => {
  console.log('=== STARTING MEMBER 1 (MODULE 1 & MODULE 6) INTEGRATION TESTS ===\n');
  await connectDB();

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/planner', plannerRoutes);
  app.use('/api/itineraries', itineraryRoutes);
  app.use('/api/calendar', calendarRoutes);
  app.get('/api/holidays', getHolidaysList);
  app.use('/api/destinations', destinationRoutes);
  app.use('/api/packages', packageRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseURL = `http://localhost:${port}/api`;
  const client = axios.create({ baseURL, validateStatus: () => true });

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      passed++;
      console.log(`✅ [PASS] ${testName}`);
    } else {
      failed++;
      console.error(`❌ [FAIL] ${testName} ${details ? '-> ' + details : ''}`);
    }
  };

  try {
    // 1. Authenticate Tourist A & Tourist B
    const loginResA = await client.post('/auth/login', {
      email: 'kasun.tourist@dreamceylon.lk',
      password: 'Password123!'
    });
    assert(loginResA.status === 200 && loginResA.data.token, 'Tourist A Login (kasun.tourist@dreamceylon.lk)');
    const tokenA = loginResA.data.token;
    const headersA = { Authorization: `Bearer ${tokenA}` };

    const loginResB = await client.post('/auth/login', {
      email: 'emma.tourist@dreamceylon.lk',
      password: 'Password123!'
    });
    assert(loginResB.status === 200 && loginResB.data.token, 'Tourist B Login (emma.tourist@dreamceylon.lk)');
    const tokenB = loginResB.data.token;
    const headersB = { Authorization: `Bearer ${tokenB}` };

    // 2. Test Form Validation Rejections (Module 1.A)
    const invalidDaysRes = await client.post(
      '/planner/preferences',
      {
        travelDays: 0,
        travelers: 2,
        mealType: 'Vegetarian',
        environments: ['Mountains'],
        weatherPreference: 'Cool',
        transportation: 'Car',
        guideRequirement: 'Required',
        packageLevel: 'Standard'
      },
      { headers: headersA }
    );
    assert(invalidDaysRes.status === 400, 'Reject invalid trip duration (0 days)');

    const invalidTravelersRes = await client.post(
      '/planner/preferences',
      {
        travelDays: 3,
        travelers: 0,
        mealType: 'Vegetarian',
        environments: ['Mountains'],
        weatherPreference: 'Cool',
        transportation: 'Car',
        guideRequirement: 'Required',
        packageLevel: 'Standard'
      },
      { headers: headersA }
    );
    assert(invalidTravelersRes.status === 400, 'Reject zero travellers');

    const emptyEnvRes = await client.post(
      '/planner/preferences',
      {
        travelDays: 3,
        travelers: 2,
        mealType: 'Vegetarian',
        environments: [],
        weatherPreference: 'Cool',
        transportation: 'Car',
        guideRequirement: 'Required',
        packageLevel: 'Standard'
      },
      { headers: headersA }
    );
    assert(emptyEnvRes.status === 400, 'Reject empty travel environments');

    // 3. Test Valid Preference Saving & Retrieval (Module 1.A)
    const validPrefs = {
      travelDays: 3,
      travelers: 2,
      mealType: 'Seafood',
      environments: ['Mountains', 'Hiking', 'Waterfalls'],
      weatherPreference: 'Cool',
      transportation: 'Car',
      guideRequirement: 'Required',
      packageLevel: 'Premium',
      startDate: '2026-11-10'
    };

    const savePrefRes = await client.post('/planner/preferences', validPrefs, {
      headers: headersA
    });
    assert(
      savePrefRes.status === 200 && savePrefRes.data.data?.mealType === 'Seafood',
      'Save valid tourist preferences to TouristProfile'
    );

    const getPrefRes = await client.get('/planner/preferences', { headers: headersA });
    assert(
      getPrefRes.status === 200 &&
        getPrefRes.data.data?.environments.includes('Mountains') &&
        getPrefRes.data.data?.packageLevel === 'Premium',
      'Retrieve saved tourist preferences'
    );

    // 4. Test Destination Recommendation Engine (Module 1.B)
    const recRes = await client.post('/planner/recommendations', validPrefs, {
      headers: headersA
    });
    const recs = recRes.data?.data || [];
    assert(
      recRes.status === 200 && recs.length > 0,
      `Generate ranked recommendations (${recs.length} matches returned)`
    );

    const topRec = recs[0];
    assert(
      topRec &&
        typeof topRec.matchScore === 'number' &&
        Array.isArray(topRec.reasons) &&
        topRec.reasons.length > 0 &&
        topRec.scoreBreakdown,
      `Top recommendation (${topRec?.destination?.name}) has matchScore (${topRec?.matchScore}%), breakdown, and reasons`
    );

    // Verify no duplicate destinations in recommendations
    const recIds = recs.map((r) => r.destination._id.toString());
    assert(
      new Set(recIds).size === recIds.length,
      'Recommendation results contain zero duplicate destinations'
    );

    // Test Seaside + Hot weather filtering
    const beachRecRes = await client.post(
      '/planner/recommendations',
      {
        ...validPrefs,
        environments: ['Seaside'],
        weatherPreference: 'Hot'
      },
      { headers: headersA }
    );
    const beachRecs = beachRecRes.data?.data || [];
    assert(
      beachRecRes.status === 200 &&
        beachRecs.length > 0 &&
        beachRecs.every((r) => r.destination.environments.includes('Seaside')),
      `Seaside filter strictly recommends Seaside destinations (${beachRecs.map((r) => r.destination.name).join(', ')})`
    );

    // 5. Test Day-by-Day Itinerary Generation (Module 6.A)
    const selectedDests = recs.slice(0, 4).map((r) => r.destination);
    const genRes = await client.post(
      '/itineraries/generate',
      {
        destinations: selectedDests,
        days: 3,
        travelers: 2,
        startDate: '2026-11-10',
        preferences: validPrefs
      },
      { headers: headersA }
    );

    const generatedPlan = genRes.data?.data;
    assert(
      genRes.status === 200 &&
        generatedPlan &&
        Array.isArray(generatedPlan.dailyItinerary) &&
        generatedPlan.dailyItinerary.length === 3,
      'Generate 3-day structured itinerary with daily schedules'
    );

    // Verify every day has activities including a meal break and no duplicate visit destinations
    const scheduledVisitIds = [];
    let allDaysHaveLunch = true;
    for (const day of generatedPlan.dailyItinerary) {
      const hasMeal = day.activities.some((a) => a.type === 'meal');
      if (!hasMeal) allDaysHaveLunch = false;
      for (const act of day.activities) {
        if (act.type === 'visit' && act.destinationId) {
          scheduledVisitIds.push(act.destinationId.toString());
        }
      }
    }
    assert(allDaysHaveLunch, 'Every generated day includes a scheduled dining/lunch break');
    assert(
      new Set(scheduledVisitIds).size === scheduledVisitIds.length,
      'Generated itinerary assigns each destination at most once (zero duplicates)'
    );

    // 6. Test Saving, Updating, Authorization & Deleting Itineraries (Module 6.B)
    const createItinRes = await client.post(
      '/itineraries',
      {
        title: 'Test Highland Adventure Plan',
        days: generatedPlan.days,
        travelers: 2,
        stops: generatedPlan.stops,
        dates: generatedPlan.dates,
        transportType: 'Car',
        preferences: validPrefs,
        dailyItinerary: generatedPlan.dailyItinerary,
        costEstimate: { baseTotal: 2100, guideCost: 0, mealExtraCost: 0, grandTotal: 2100 }
      },
      { headers: headersA }
    );

    const savedItin = createItinRes.data?.data;
    assert(
      createItinRes.status === 201 && savedItin?._id,
      `Save itinerary to MongoDB (ID: ${savedItin?._id})`
    );

    // Verify Tourist B CANNOT access or modify Tourist A's private itinerary
    const unauthorizedGet = await client.get(`/itineraries/${savedItin._id}`, {
      headers: headersB
    });
    assert(
      unauthorizedGet.status === 403,
      'Privacy check: Tourist B is forbidden (403) from viewing Tourist A private itinerary'
    );

    // Update itinerary (reschedule & title update) by owner Tourist A
    const updatedDaily = [...savedItin.dailyItinerary];
    updatedDaily[0].activities[0].startTime = '07:45 AM';
    updatedDaily[0].activities[0].notes = 'Updated early morning departure';

    const updateRes = await client.put(
      `/itineraries/${savedItin._id}`,
      {
        title: 'Updated Highland Adventure Plan',
        dailyItinerary: updatedDaily
      },
      { headers: headersA }
    );
    assert(
      updateRes.status === 200 &&
        updateRes.data.data.title === 'Updated Highland Adventure Plan' &&
        updateRes.data.data.dailyItinerary[0].activities[0].startTime === '07:45 AM',
      'Update & reschedule itinerary activities in MongoDB'
    );

    // 7. Test Calendar & Sri Lankan Public Holidays (Module 6.C)
    const holidaysRes = await client.get('/holidays?year=2026');
    assert(
      holidaysRes.status === 200 &&
        Array.isArray(holidaysRes.data.data) &&
        holidaysRes.data.data.length >= 20,
      `Fetch official 2026 Sri Lankan Public Holidays (${holidaysRes.data.data?.length} holidays returned)`
    );

    const calRes = await client.get('/calendar/2026/11', { headers: headersA });
    const calData = calRes.data?.data;
    assert(
      calRes.status === 200 &&
        calData &&
        calData.holidays.length >= 2 &&
        calData.scheduledDays.length >= 3,
      `Fetch Calendar Month (Nov 2026): ${calData?.holidays?.length} Sri Lankan holidays & ${calData?.scheduledDays?.length} scheduled travel days`
    );

    // Clean up test itinerary
    const delRes = await client.delete(`/itineraries/${savedItin._id}`, {
      headers: headersA
    });
    assert(delRes.status === 200, 'Delete test itinerary cleanly');

    console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  } catch (err) {
    console.error('Unexpected Test Error:', err);
    failed++;
  } finally {
    server.close();
    await mongoose.connection.close();
    process.exit(failed > 0 ? 1 : 0);
  }
};

runTests();

