const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

const Destination = require('./models/Destination');
const destinationController = require('./controllers/destinationController');

/**
 * Dream Ceylon – Destination System Verification Suite
 * Automated test suite verifying the 48 Sri Lankan tourist destinations
 */

const mockRes = () => {
  const res = { statusCode: 200, data: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (d) => { res.data = d; return res; };
  return res;
};

const runVerification = async () => {
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

  console.log('================================================================');
  console.log('DREAM CEYLON: DESTINATIONS DATABASE & API VERIFICATION SUITE');
  console.log('================================================================\n');

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/dream-ceylon';
    await mongoose.connect(mongoUri);
    assert(true, 'MongoDB Connection', mongoUri);

    // 1. Total Count Verification
    const count = await Destination.countDocuments();
    assert(count >= 40, 'Total Destination Count in MongoDB', `Found ${count} destinations (Target: >= 40)`);

    // 2. Category Coverage Verification
    const categories = await Destination.distinct('category');
    assert(categories.includes('Beach'), 'Category: Beach present');
    assert(categories.includes('Mountain'), 'Category: Mountain present');
    assert(categories.includes('Historical'), 'Category: Historical present');
    assert(categories.includes('Waterfall'), 'Category: Waterfall present');
    assert(categories.includes('Wildlife'), 'Category: Wildlife present');
    assert(categories.includes('Nature'), 'Category: Nature present');
    assert(categories.includes('Lake'), 'Category: Lake present');

    // 3. Required Popular Destination Presences
    const requiredSpots = [
      'Mirissa Beach', 'Unawatuna Beach', 'Arugam Bay', 'Hikkaduwa Beach', 'Bentota Beach',
      'Nilaveli Beach', 'Pasikudah Beach', 'Weligama Beach', 'Tangalle Beach', 'Hiriketiya Beach',
      'Ella', "Little Adam's Peak", "Adam's Peak (Sri Pada)", 'Nuwara Eliya', 'Horton Plains',
      "World's End", 'Knuckles Mountain Range', 'Haputale', 'Pidurangala Rock', 'Ella Rock',
      'Sigiriya Rock Fortress', 'Dambulla Cave Temple', 'Temple of the Tooth (Kandy)',
      'Polonnaruwa Ancient City', 'Anuradhapura Ancient City', 'Galle Fort', 'Yapahuwa Rock Fortress',
      'Diyaluma Falls', 'Ravana Falls', 'Bambarakanda Falls', 'Dunhinda Falls', "St. Clair's Falls", 'Aberdeen Falls',
      'Yala National Park', 'Udawalawe National Park', 'Wilpattu National Park', 'Minneriya National Park',
      'Sinharaja Forest Reserve', 'Bundala National Park',
      'Gregory Lake', 'Kandy Lake', 'Beira Lake', 'Ambuluwawa Tower', 'Nine Arch Bridge', 'Royal Botanical Gardens Peradeniya'
    ];

    let missing = [];
    for (const spot of requiredSpots) {
      const found = await Destination.findOne({ name: spot });
      if (!found) missing.push(spot);
    }
    assert(missing.length === 0, 'Required Popular Destinations Check', missing.length === 0 ? 'All 45+ spots found' : `Missing: ${missing.join(', ')}`);

    // 4. Schema Integrity Check on Sample Destination
    const sample = await Destination.findOne({ name: 'Sigiriya Rock Fortress' });
    assert(sample && sample.province === 'Central', 'Province field populated', sample?.province);
    assert(sample && sample.district === 'Matale', 'District field populated', sample?.district);
    assert(sample && sample.latitude === 7.957 && sample.longitude === 80.7603, 'GPS coordinates exact', `${sample?.latitude}, ${sample?.longitude}`);
    assert(sample && sample.image && sample.image.startsWith('http'), 'Valid image URL present');
    assert(sample && sample.estimatedVisitDuration && sample.estimatedVisitDuration.length > 0, 'Estimated visit duration present', sample?.estimatedVisitDuration);
    assert(sample && sample.entryFee && sample.entryFee.length > 0, 'Entry fee present', sample?.entryFee);
    assert(sample && Array.isArray(sample.tags) && sample.tags.length > 0, 'Tags array populated', sample?.tags?.join(', '));

    // 5. Controller Search & Filter API Tests
    console.log('\n--- Controller & REST API Tests ---');

    // A. Search by Name
    const resSearchName = mockRes();
    await destinationController.getDestinations({ query: { search: 'Diyaluma' } }, resSearchName);
    assert(resSearchName.data?.count === 1 && resSearchName.data?.data[0].name === 'Diyaluma Falls', 'Search by Name', 'Diyaluma Falls');

    // B. Search by District
    const resSearchDist = mockRes();
    await destinationController.getDestinations({ query: { search: 'Galle' } }, resSearchDist);
    assert(resSearchDist.data?.count >= 3, 'Search by District', `${resSearchDist.data?.count} spots in Galle area`);

    // C. Filter by Category Beach
    const resCatBeach = mockRes();
    await destinationController.getDestinations({ query: { category: 'Beach' } }, resCatBeach);
    assert(resCatBeach.data?.count >= 10, 'Category Filter: Beach', `${resCatBeach.data?.count} beaches found`);

    // D. Filter by Category Waterfall
    const resCatWater = mockRes();
    await destinationController.getDestinations({ query: { category: 'Waterfall' } }, resCatWater);
    assert(resCatWater.data?.count === 6, 'Category Filter: Waterfall', `6 waterfalls found`);

    // E. Filter by Province Southern
    const resProvSouth = mockRes();
    await destinationController.getDestinations({ query: { province: 'Southern' } }, resProvSouth);
    assert(resProvSouth.data?.count >= 10, 'Province Filter: Southern', `${resProvSouth.data?.count} southern spots`);

    // F. Filter Metadata Endpoint
    const resMeta = mockRes();
    await destinationController.getFilterMetadata({}, resMeta);
    assert(resMeta.data?.data?.categories.length >= 6, 'Filter Metadata Categories', `${resMeta.data?.data?.categories.length} categories`);
    assert(resMeta.data?.data?.districts.length >= 10, 'Filter Metadata Districts', `${resMeta.data?.data?.districts.length} districts`);
    assert(resMeta.data?.data?.provinces.length >= 7, 'Filter Metadata Provinces', `${resMeta.data?.data?.provinces.length} provinces`);

    // G. Destination Details & View Count Increment
    const initialViews = sample.viewCount || 0;
    const resDetail = mockRes();
    await destinationController.getDestinationById({ params: { id: sample._id } }, resDetail);
    assert(resDetail.data?.data?.viewCount === initialViews + 1, 'View Count Tracking', `Incremented from ${initialViews} to ${resDetail.data?.data?.viewCount}`);

    console.log('\n================================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    await mongoose.connection.close();
    if (failed > 0) process.exit(1);
    process.exit(0);

  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
};

runVerification();

