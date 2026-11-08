const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const connectDB = require('./config/db');
const Package = require('./models/Package');
const Hotel = require('./models/Hotel');
const Guide = require('./models/Guide');
const TourPlan = require('./models/TourPlan');
const CurrencyRate = require('./models/CurrencyRate');
const User = require('./models/User');

const packageRoutes = require('./routes/packageRoutes');
const pricingRoutes = require('./routes/pricingRoutes');
const currencyRoutes = require('./routes/currencyRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const guideRoutes = require('./routes/guideRoutes');

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${testName} ${details ? `— ${details}` : ''}`);
  }
}

async function runTests() {
  await connectDB();

  const app = express();
  app.use(express.json());
  app.use('/api/packages', packageRoutes);
  app.use('/api/pricing', pricingRoutes);
  app.use('/api/currency', currencyRoutes);
  app.use('/api/hotels', hotelRoutes);
  app.use('/api/guides', guideRoutes);

  const server = app.listen(0);
  const port = server.address().port;
  const api = axios.create({
    baseURL: `http://localhost:${port}/api`,
    validateStatus: () => true
  });

  console.log(`\n=============================================================`);
  console.log(`🧪 RUNNING MEMBER 3 TEST SUITE (MODULE 3 & MODULE 8)`);
  console.log(`=============================================================\n`);

  try {
    // ---------------------------------------------------------
    // 1. PACKAGE LOADING & HIERARCHY TESTS
    // ---------------------------------------------------------
    console.log(`--- 1. Package Loading & Package Rules (GET /api/packages) ---`);
    const pkgRes = await api.get('/packages');
    assert(pkgRes.status === 200 && pkgRes.data.success, 'GET /api/packages returns 200 OK');
    assert(pkgRes.data.count === 3, 'Exactly 3 packages exist (Basic, Standard, Premium)');
    assert(pkgRes.data.baseCurrency === 'LKR', 'Authoritative base currency is LKR');

    const [basicPkg, standardPkg, premiumPkg] = pkgRes.data.data;
    assert(
      basicPkg.packageName === 'Basic' &&
        standardPkg.packageName === 'Standard' &&
        premiumPkg.packageName === 'Premium',
      'Packages are ordered Basic -> Standard -> Premium'
    );
    assert(
      basicPkg.baseChargeLKR === 25500 &&
        standardPkg.baseChargeLKR === 54000 &&
        premiumPkg.baseChargeLKR === 105000,
      'Packages store authoritative LKR starting base charges (25,500 / 54,000 / 105,000 LKR)'
    );
    assert(
      basicPkg.inclusions.accommodationIncluded === false &&
        basicPkg.inclusions.mealsIncluded === false &&
        basicPkg.inclusions.guideIncluded === false,
      'Basic package excludes hotel, food, and guide services'
    );
    assert(
      standardPkg.inclusions.accommodationIncluded === true &&
        standardPkg.inclusions.mealsIncluded === false &&
        standardPkg.allowGuideAddon === true,
      'Standard package includes accommodation, excludes meals by default, and allows optional guide'
    );
    assert(
      premiumPkg.inclusions.accommodationIncluded === true &&
        premiumPkg.inclusions.mealsIncluded === true &&
        premiumPkg.inclusions.guideIncluded === true,
      'Premium package includes accommodation, meals, and tour guide'
    );

    const singlePkgRes = await api.get(`/packages/${standardPkg._id}?currency=USD`);
    assert(
      singlePkgRes.status === 200 &&
        singlePkgRes.data.data.packageName === 'Standard' &&
        singlePkgRes.data.data.baseChargeLKR === 54000 &&
        singlePkgRes.data.data.baseChargeConverted > 0,
      'GET /api/packages/:id returns both original LKR baseCharge and converted display currency'
    );

    // ---------------------------------------------------------
    // 2. PACKAGE SELECTION TESTS
    // ---------------------------------------------------------
    console.log(`\n--- 2. Package Selection (POST /api/packages/select) ---`);
    const selectRes = await api.post('/packages/select', {
      packageId: standardPkg._id,
      days: 4,
      travelers: 2,
      vehicleType: 'Car',
      addGuide: true,
      targetCurrency: 'LKR'
    });
    assert(
      selectRes.status === 200 && selectRes.data.success,
      'POST /api/packages/select succeeds and returns calculated pricing'
    );
    assert(
      selectRes.data.data.selectedPackage.packageName === 'Standard' &&
        selectRes.data.data.pricing.summary.totalEstimatedCostLKR > 0,
      'Package selection returns enriched selected package and authoritative LKR cost summary'
    );

    // ---------------------------------------------------------
    // 3. TRANSPORTATION COST CALCULATION TESTS
    // ---------------------------------------------------------
    console.log(`\n--- 3. Transportation Cost Calculation (Motorcycle, Car, Van) ---`);
    const motoRes = await api.post('/pricing/calculate', {
      packageName: 'Basic',
      days: 3,
      travelers: 2,
      vehicleType: 'Motorcycle',
      routeDistanceKm: 300
    });
    const carRes = await api.post('/pricing/calculate', {
      packageName: 'Basic',
      days: 3,
      travelers: 2,
      vehicleType: 'Car',
      routeDistanceKm: 300
    });
    const vanRes = await api.post('/pricing/calculate', {
      packageName: 'Basic',
      days: 3,
      travelers: 6,
      vehicleType: 'Van',
      routeDistanceKm: 600 // 3 days * 180km = 540km included -> 60km excess
    });

    assert(
      motoRes.data.data.breakdown.transportation.totalLKR === 6500 * 3 * 1,
      'Motorcycle transport for 2 pax / 3 days within distance allowance = 19,500 LKR'
    );
    assert(
      carRes.data.data.breakdown.transportation.totalLKR === 15000 * 3 * 1,
      'Car transport for 2 pax / 3 days within distance allowance = 45,000 LKR'
    );
    assert(
      vanRes.data.data.breakdown.transportation.excessKm === 60 &&
        vanRes.data.data.breakdown.transportation.excessDistanceChargeLKR === 60 * 115,
      'Van transport accurately computes excess route distance charges (60 excess km * 115 LKR)'
    );

    // Group size scaling test: 5 travelers in Car (capacity 3) requires 2 Cars
    const multiCarRes = await api.post('/pricing/calculate', {
      packageName: 'Basic',
      days: 2,
      travelers: 5,
      vehicleType: 'Car'
    });
    assert(
      multiCarRes.data.data.breakdown.transportation.vehiclesCount === 2 &&
        multiCarRes.data.data.breakdown.transportation.totalLKR === 15000 * 2 * 2,
      'Transportation engine scales number of vehicles when group size exceeds single vehicle capacity'
    );

    // ---------------------------------------------------------
    // 4. ACCOMMODATION COST CALCULATION TESTS
    // ---------------------------------------------------------
    console.log(`\n--- 4. Accommodation Cost Calculation (Basic vs Standard/Premium & Partner Hotel) ---`);
    assert(
      carRes.data.data.breakdown.accommodation.included === false &&
        carRes.data.data.breakdown.accommodation.totalLKR === 0,
      'Basic package charges 0 LKR for accommodation'
    );

    const hotels = await Hotel.find().lean();
    assert(hotels.length > 0, 'Database contains partner hotels for accommodation calculation');
    const kandyHotel = hotels[0];

    const stdHotelRes = await api.post('/pricing/calculate', {
      packageName: 'Standard',
      days: 3,
      travelers: 2,
      vehicleType: 'Car',
      hotelId: String(kandyHotel._id),
      numberOfRooms: 1
    });
    assert(
      stdHotelRes.data.data.breakdown.accommodation.pricingType === 'confirmed' &&
        stdHotelRes.data.data.breakdown.accommodation.hotelName === kandyHotel.name &&
        stdHotelRes.data.data.breakdown.accommodation.totalLKR === kandyHotel.pricePerNight * 3,
      `Standard package with Partner Hotel (${kandyHotel.name}) calculates exact DB rate (${
        kandyHotel.pricePerNight * 3
      } LKR)`
    );

    // ---------------------------------------------------------
    // 5. FOOD & MEAL COST CALCULATION TESTS
    // ---------------------------------------------------------
    console.log(`\n--- 5. Meal Cost Calculation (Vegetarian, Vegan, Seafood, All meat types) ---`);
    assert(
      carRes.data.data.breakdown.meals.totalLKR === 0 &&
        stdHotelRes.data.data.breakdown.meals.totalLKR === 0,
      'Basic and Standard packages do NOT charge for unincluded meals (0 LKR)'
    );

    const mealTypes = [
      { type: 'Vegetarian', expectedRate: 4500 },
      { type: 'Vegan', expectedRate: 4800 },
      { type: 'Seafood', expectedRate: 7500 },
      { type: 'All meat types', expectedRate: 6500 }
    ];

    for (const m of mealTypes) {
      const mRes = await api.post('/pricing/calculate', {
        packageName: 'Premium',
        days: 3,
        travelers: 2,
        mealType: m.type
      });
      const expectedTotal = m.expectedRate * 3 * 2;
      assert(
        mRes.data.data.breakdown.meals.included === true &&
          mRes.data.data.breakdown.meals.totalLKR === expectedTotal,
        `Premium package calculates ${m.type} meal plan accurately (${expectedTotal} LKR for 2 pax / 3 days)`
      );
    }

    // ---------------------------------------------------------
    // 6. GUIDE COST CALCULATION TESTS
    // ---------------------------------------------------------
    console.log(`\n--- 6. Guide Cost Calculation (Basic, Standard Add-On, Premium & Partner Guide) ---`);
    const guides = await Guide.find().lean();
    assert(guides.length > 0, 'Database contains registered tour guides');
    const sampleGuide = guides[0];

    const stdNoGuide = await api.post('/pricing/calculate', {
      packageName: 'Standard',
      days: 3,
      travelers: 2,
      addGuide: false
    });
    assert(
      stdNoGuide.data.data.breakdown.guide.included === false &&
        stdNoGuide.data.data.breakdown.guide.totalLKR === 0,
      'Standard package without guide add-on charges 0 LKR for guide'
    );

    const stdWithDbGuide = await api.post('/pricing/calculate', {
      packageName: 'Standard',
      days: 3,
      travelers: 2,
      addGuide: true,
      guideId: String(sampleGuide._id)
    });
    assert(
      stdWithDbGuide.data.data.breakdown.guide.included === true &&
        stdWithDbGuide.data.data.breakdown.guide.pricingType === 'confirmed' &&
        stdWithDbGuide.data.data.breakdown.guide.totalLKR === sampleGuide.dailyRate * 3,
      `Standard package with selected DB Guide (${sampleGuide.name}) calculates exact guide fee (${
        sampleGuide.dailyRate * 3
      } LKR)`
    );

    // ---------------------------------------------------------
    // 7. TOTAL, PER-PERSON & SAVED TOUR PLAN PRICING TESTS
    // ---------------------------------------------------------
    console.log(`\n--- 7. Total, Per-Person & Saved TourPlan Pricing (GET /api/pricing/:tourPlanId) ---`);
    const fullCalc = stdWithDbGuide.data.data;
    const expectedSum =
      fullCalc.breakdown.packageCoordination.totalLKR +
      fullCalc.breakdown.transportation.totalLKR +
      fullCalc.breakdown.accommodation.totalLKR +
      fullCalc.breakdown.meals.totalLKR +
      fullCalc.breakdown.guide.totalLKR;

    assert(
      fullCalc.summary.totalEstimatedCostLKR === expectedSum &&
        fullCalc.summary.costPerPersonLKR === Number((expectedSum / 2).toFixed(2)),
      `Total estimated cost (${expectedSum} LKR) and per-person cost (${
        expectedSum / 2
      } LKR) match exact sum of components`
    );

    const touristUser = await User.findOne({ role: 'tourist' });
    const tempPlan = await TourPlan.create({
      touristId: touristUser._id,
      days: 3,
      travelers: 2,
      transportType: 'Car',
      packageName: 'Premium',
      selectedHotelId: kandyHotel._id,
      selectedGuideId: sampleGuide._id,
      mealType: 'Seafood',
      currency: 'LKR'
    });

    const planPriceRes = await api.get(`/pricing/${tempPlan._id}?currency=EUR`);
    assert(
      planPriceRes.status === 200 &&
        planPriceRes.data.success &&
        planPriceRes.data.data.pricing.summary.totalEstimatedCostLKR > 0 &&
        planPriceRes.data.data.pricing.currency.code === 'EUR',
      'GET /api/pricing/:tourPlanId calculates complete pricing for saved TourPlan in LKR and target currency'
    );
    await TourPlan.findByIdAndDelete(tempPlan._id);

    // ---------------------------------------------------------
    // 8. EXCHANGE RATE RETRIEVAL & CACHING TESTS (MODULE 8)
    // ---------------------------------------------------------
    console.log(`\n--- 8. Exchange Rate Retrieval & Frankfurter Integration (GET /api/currency/rates) ---`);
    const supRes = await api.get('/currency/supported');
    const requiredCodes = ['LKR', 'USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'QAR'];
    const returnedCodes = supRes.data.data.map((c) => c.code);
    assert(
      supRes.status === 200 &&
        supRes.data.defaultCurrency === 'LKR' &&
        requiredCodes.every((code) => returnedCodes.includes(code)),
      'GET /api/currency/supported returns all 8 required currencies with LKR as default'
    );

    const ratesRes = await api.get('/currency/rates');
    assert(
      ratesRes.status === 200 &&
        ratesRes.data.baseCurrency === 'LKR' &&
        ratesRes.data.rates.LKR === 1 &&
        requiredCodes.every((code) => typeof ratesRes.data.rates[code] === 'number' && ratesRes.data.rates[code] > 0),
      'GET /api/currency/rates returns positive numeric rates for all 8 currencies relative to LKR base'
    );
    assert(
      Boolean(ratesRes.data.rateDate) && Boolean(ratesRes.data.limitationNote),
      `Exchange rate response includes rateDate (${ratesRes.data.rateDate}) and transparent ECB limitation note`
    );

    const cachedDbCount = await CurrencyRate.countDocuments({ baseCurrency: 'LKR' });
    assert(cachedDbCount >= 8, 'Exchange rates are cached in MongoDB CurrencyRate collection');

    // ---------------------------------------------------------
    // 9. CURRENCY CONVERSION & ERROR HANDLING TESTS
    // ---------------------------------------------------------
    console.log(`\n--- 9. Currency Conversion & Validation (GET & POST /api/currency/convert) ---`);
    const convUsdRes = await api.get('/currency/convert?amount=54000&to=USD');
    const expectedUsd = Number((54000 * ratesRes.data.rates.USD).toFixed(2));
    assert(
      convUsdRes.status === 200 &&
        convUsdRes.data.data.originalAmountLKR === 54000 &&
        convUsdRes.data.data.convertedAmount === expectedUsd,
      `GET /api/currency/convert converts 54,000 LKR -> ${expectedUsd} USD without overwriting originalAmountLKR`
    );

    const batchConvRes = await api.post('/currency/convert', {
      amounts: {
        basic: 25500,
        standard: 54000,
        premium: 105000
      },
      targetCurrency: 'QAR'
    });
    assert(
      batchConvRes.status === 200 &&
        batchConvRes.data.data.basic.targetCurrency === 'QAR' &&
        batchConvRes.data.data.premium.convertedAmount > batchConvRes.data.data.standard.convertedAmount,
      'POST /api/currency/convert supports batch object conversion to QAR'
    );

    const invalidCurrRes = await api.get('/currency/convert?amount=10000&to=XYZ');
    assert(
      invalidCurrRes.status === 400 && !invalidCurrRes.data.success,
      'Currency converter cleanly rejects unsupported currency codes (HTTP 400)'
    );

    const negativeAmtRes = await api.get('/currency/convert?amount=-500&to=USD');
    assert(
      negativeAmtRes.status === 400 && !negativeAmtRes.data.success,
      'Currency converter cleanly rejects negative financial amounts (HTTP 400)'
    );
  } catch (err) {
    failed++;
    console.error('Unexpected Test Suite Error:', err);
  } finally {
    server.close();
    await mongoose.connection.close();
    console.log(`\n=============================================================`);
    console.log(`📊 TEST SUMMARY: ${passed} Passed | ${failed} Failed`);
    console.log(`=============================================================\n`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();

