const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const express = require('express');
const cors = require('cors');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const connectDB = require('./config/db');
const User = require('./models/User');
const Guide = require('./models/Guide');
const Hotel = require('./models/Hotel');

const guideRoutes = require('./routes/guideRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const destinationRoutes = require('./routes/destinationRoutes');
const packageRoutes = require('./routes/packageRoutes');

const ensureTestUser = async ({ name, email, password, role }) => {
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name,
      email,
      passwordHash: password,
      role
    });
  }
  return user;
};

async function runModule4Tests() {
  console.log('====================================================');
  console.log('MODULE 4 TESTING SUITE: GUIDE & HOTEL MANAGEMENT');
  console.log('Student Reg: SEU/IS/22/ICT/050');
  console.log('Course: SWT22022 – Practical for Internet App Dev');
  console.log('====================================================\n');

  // 1. Database Connection
  console.log('Test 1: Connecting to MongoDB...');
  await connectDB();
  console.log('  PASS: MongoDB connected successfully!\n');

  // 2. Setup Test Users
  console.log('Test 2: Setting up test users for role verification...');
  const guide1 = await ensureTestUser({
    name: 'Nimal Bandara (Guide 1)',
    email: 'guide1.test@dreamceylon.lk',
    password: 'Password123!',
    role: 'guide'
  });
  const guideToken1 = guide1.getSignedJwtToken();

  const guide2 = await ensureTestUser({
    name: 'Chaminda Silva (Guide 2)',
    email: 'guide2.test@dreamceylon.lk',
    password: 'Password123!',
    role: 'guide'
  });
  const guideToken2 = guide2.getSignedJwtToken();

  const owner1 = await ensureTestUser({
    name: 'Heritage Stays Owner 1',
    email: 'owner1.test@dreamceylon.lk',
    password: 'Password123!',
    role: 'hotel_owner'
  });
  const ownerToken1 = owner1.getSignedJwtToken();

  const owner2 = await ensureTestUser({
    name: 'Boutique Villas Owner 2',
    email: 'owner2.test@dreamceylon.lk',
    password: 'Password123!',
    role: 'hotel_owner'
  });
  const ownerToken2 = owner2.getSignedJwtToken();

  const tourist = await ensureTestUser({
    name: 'Kasun Tourist',
    email: 'tourist.test@dreamceylon.lk',
    password: 'Password123!',
    role: 'tourist'
  });
  const touristToken = tourist.getSignedJwtToken();

  console.log('  PASS: Guide 1, Guide 2, Owner 1, Owner 2, Tourist accounts verified.\n');

  // 3. Mount Test Server
  const app = express();
  app.use(express.json());
  app.use(cors());

  app.use('/api/guides', guideRoutes);
  app.use('/api/hotels', hotelRoutes);
  app.use('/api/destinations', destinationRoutes);
  app.use('/api/packages', packageRoutes);

  const testPort = 5097;
  const server = app.listen(testPort, async () => {
    console.log(`Test server running on port ${testPort}`);

    const apiRequest = (method, endpoint, body = null, token = null) => {
      return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : '';
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (body) headers['Content-Length'] = Buffer.byteLength(payload);

        const req = http.request({
          hostname: 'localhost',
          port: testPort,
          path: endpoint,
          method,
          headers
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, raw: data });
            }
          });
        });

        req.on('error', reject);
        if (body) req.write(payload);
        req.end();
      });
    };

    try {
      // Clean up previous test entries for these specific test accounts
      await Guide.deleteMany({ userId: { $in: [guide1._id, guide2._id] } });
      await Hotel.deleteMany({ ownerId: { $in: [owner1._id, owner2._id] } });

      // 4. Test Guide Listing (Public)
      console.log('\nTest 4: Testing Public Guide Listing (GET /api/guides)...');
      const listRes = await apiRequest('GET', '/api/guides');
      if (listRes.status !== 200 || !listRes.body.success) {
        throw new Error(`GET /api/guides returned status ${listRes.status}`);
      }
      console.log(`  PASS: GET /api/guides returned 200 (Total count: ${listRes.body.count})`);

      // 5. Test Hotel Listing (Public)
      console.log('\nTest 5: Testing Public Hotel Listing (GET /api/hotels)...');
      const hotelListRes = await apiRequest('GET', '/api/hotels');
      if (hotelListRes.status !== 200 || !hotelListRes.body.success) {
        throw new Error(`GET /api/hotels returned status ${hotelListRes.status}`);
      }
      console.log(`  PASS: GET /api/hotels returned 200 (Total count: ${hotelListRes.body.count})`);

      // 6. Test Guide Registration (POST /api/guides) by Guide 1
      console.log('\nTest 6: Testing Guide Profile Registration (POST /api/guides)...');
      const createGuideRes = await apiRequest('POST', '/api/guides', {
        name: 'Nimal Bandara',
        phone: '+94 77 123 4567',
        bio: 'UNESCO Cultural Heritage Expert with 10 years experience.',
        serviceAreas: ['Kandy', 'Sigiriya', 'Ella'],
        languages: ['English', 'German', 'Sinhala'],
        dailyRate: 55,
        availability: true
      }, guideToken1);

      if (createGuideRes.status !== 201 || !createGuideRes.body.success) {
        throw new Error(`POST /api/guides failed with status ${createGuideRes.status}: ${JSON.stringify(createGuideRes.body)}`);
      }
      const createdGuideId = createGuideRes.body.data._id;
      console.log(`  PASS: Guide profile registered successfully with ID: ${createdGuideId}`);

      // 7. Test Duplicate Guide Registration Prevented
      console.log('\nTest 7: Testing Duplicate Guide Profile Prevention...');
      const dupGuideRes = await apiRequest('POST', '/api/guides', {
        name: 'Nimal Bandara Duplicate',
        dailyRate: 50
      }, guideToken1);
      if (dupGuideRes.status !== 400) {
        throw new Error(`Expected 400 for duplicate profile, got ${dupGuideRes.status}`);
      }
      console.log('  PASS: Duplicate guide profile properly rejected (HTTP 400).');

      // 8. Test Hotel Registration (POST /api/hotels) by Owner 1
      console.log('\nTest 8: Testing Hotel Property Registration (POST /api/hotels)...');
      const createHotelRes = await apiRequest('POST', '/api/hotels', {
        name: 'Hilltop Heritage Villa Kandy',
        location: 'Kandy',
        description: 'Boutique colonial villa overlooking the knuckles mountain range.',
        phone: '+94 81 223 9999',
        pricePerNight: 135,
        facilities: ['Free Wi-Fi', 'Swimming Pool', 'Mountain View', 'Breakfast Included'],
        rooms: [
          { type: 'Superior Suite', capacity: 2, count: 6, price: 135 },
          { type: 'Family Chalet', capacity: 4, count: 2, price: 210 }
        ],
        availability: true
      }, ownerToken1);

      if (createHotelRes.status !== 201 || !createHotelRes.body.success) {
        throw new Error(`POST /api/hotels failed: ${JSON.stringify(createHotelRes.body)}`);
      }
      const createdHotelId = createHotelRes.body.data._id;
      console.log(`  PASS: Hotel property registered successfully with ID: ${createdHotelId}`);

      // 9. Test Fetch Own Profiles (GET /api/guides/my-profile & GET /api/hotels/my-hotels)
      console.log('\nTest 9: Testing Own Profile & Property Retrieval...');
      const myGuideRes = await apiRequest('GET', '/api/guides/my-profile', null, guideToken1);
      if (myGuideRes.status !== 200 || myGuideRes.body.data._id !== createdGuideId) {
        throw new Error(`GET /api/guides/my-profile failed: ${myGuideRes.status}`);
      }
      console.log(`  PASS: GET /api/guides/my-profile returned correct profile: ${myGuideRes.body.data.name}`);

      const myHotelsRes = await apiRequest('GET', '/api/hotels/my-hotels', null, ownerToken1);
      if (myHotelsRes.status !== 200 || myHotelsRes.body.data.length === 0) {
        throw new Error(`GET /api/hotels/my-hotels failed: ${myHotelsRes.status}`);
      }
      console.log(`  PASS: GET /api/hotels/my-hotels returned ${myHotelsRes.body.count} property(s).`);

      // 10. Test Profile & Property Update (PUT /api/guides/:id & PUT /api/hotels/:id)
      console.log('\nTest 10: Testing Authorized Updates by Owners...');
      const updateGuideRes = await apiRequest('PUT', `/api/guides/${createdGuideId}`, {
        dailyRate: 65,
        serviceAreas: ['Kandy', 'Sigiriya', 'Ella', 'Nuwara Eliya'],
        availability: false
      }, guideToken1);

      if (updateGuideRes.status !== 200 || updateGuideRes.body.data.dailyRate !== 65 || updateGuideRes.body.data.availability !== false) {
        throw new Error(`PUT /api/guides/:id failed: ${JSON.stringify(updateGuideRes.body)}`);
      }
      console.log('  PASS: Guide rate and availability successfully updated ($65, unavailable).');

      const updateHotelRes = await apiRequest('PUT', `/api/hotels/${createdHotelId}`, {
        pricePerNight: 145,
        availability: false
      }, ownerToken1);

      if (updateHotelRes.status !== 200 || updateHotelRes.body.data.pricePerNight !== 145) {
        throw new Error(`PUT /api/hotels/:id failed: ${JSON.stringify(updateHotelRes.body)}`);
      }
      console.log('  PASS: Hotel price per night and availability successfully updated ($145, unavailable).');

      // 11. Test Security / Ownership Enforcement (Preventing Cross-User Tampering)
      console.log('\nTest 11: Testing Security & Cross-User Tampering Prevention...');
      // Guide 2 attempts to edit Guide 1's profile -> Expect 403 Forbidden!
      const tamperGuideRes = await apiRequest('PUT', `/api/guides/${createdGuideId}`, {
        dailyRate: 10
      }, guideToken2);

      if (tamperGuideRes.status !== 403) {
        throw new Error(`Security breach! Expected 403 Forbidden when Guide 2 edits Guide 1, got ${tamperGuideRes.status}`);
      }
      console.log('  PASS: Cross-user guide profile tampering rejected with 403 Forbidden.');

      // Owner 2 attempts to edit Owner 1's hotel -> Expect 403 Forbidden!
      const tamperHotelRes = await apiRequest('PUT', `/api/hotels/${createdHotelId}`, {
        pricePerNight: 5
      }, ownerToken2);

      if (tamperHotelRes.status !== 403) {
        throw new Error(`Security breach! Expected 403 Forbidden when Owner 2 edits Owner 1, got ${tamperHotelRes.status}`);
      }
      console.log('  PASS: Cross-user hotel property tampering rejected with 403 Forbidden.');

      // 12. Test Role Authorization Protection
      console.log('\nTest 12: Testing Role-Based Route Authorization...');
      // Tourist attempts to create a guide profile -> Expect 403
      const touristGuideRes = await apiRequest('POST', '/api/guides', { dailyRate: 50 }, touristToken);
      if (touristGuideRes.status !== 403) {
        throw new Error(`Expected 403 when Tourist tries to create Guide profile, got ${touristGuideRes.status}`);
      }
      console.log('  PASS: Tourist role blocked from guide registration (HTTP 403).');

      // Anonymous attempts to register hotel -> Expect 401 Unauthorized
      const anonHotelRes = await apiRequest('POST', '/api/hotels', { name: 'Hacker Hotel', pricePerNight: 50 });
      if (anonHotelRes.status !== 401) {
        throw new Error(`Expected 401 for unauthenticated request, got ${anonHotelRes.status}`);
      }
      console.log('  PASS: Unauthenticated access blocked (HTTP 401).');

      // 13. Test Input Validation
      console.log('\nTest 13: Testing Input Validation...');
      const badRateRes = await apiRequest('PUT', `/api/guides/${createdGuideId}`, { dailyRate: -20 }, guideToken1);
      if (badRateRes.status !== 400) {
        throw new Error(`Expected 400 for negative daily rate, got ${badRateRes.status}`);
      }
      console.log('  PASS: Negative daily rate properly rejected (HTTP 400).');

      const badHotelRes = await apiRequest('POST', '/api/hotels', { name: '', pricePerNight: 100 }, ownerToken1);
      if (badHotelRes.status !== 400) {
        throw new Error(`Expected 400 for empty hotel name, got ${badHotelRes.status}`);
      }
      console.log('  PASS: Missing hotel name properly rejected (HTTP 400).');

      // 14. Test Single Item Fetch by ID (GET /api/guides/:id & GET /api/hotels/:id)
      console.log('\nTest 14: Testing Single Item Retrieval by ID...');
      const singleGuideRes = await apiRequest('GET', `/api/guides/${createdGuideId}`);
      if (singleGuideRes.status !== 200 || singleGuideRes.body.data._id !== createdGuideId) {
        throw new Error(`GET /api/guides/:id failed: ${singleGuideRes.status}`);
      }
      console.log(`  PASS: GET /api/guides/:id returned correct guide: ${singleGuideRes.body.data.name}`);

      const singleHotelRes = await apiRequest('GET', `/api/hotels/${createdHotelId}`);
      if (singleHotelRes.status !== 200 || singleHotelRes.body.data._id !== createdHotelId) {
        throw new Error(`GET /api/hotels/:id failed: ${singleHotelRes.status}`);
      }
      console.log(`  PASS: GET /api/hotels/:id returned correct hotel: ${singleHotelRes.body.data.name}`);

      // 15. Test Authorized Deletion
      console.log('\nTest 15: Testing Property Deletion by Owner...');
      const deleteHotelRes = await apiRequest('DELETE', `/api/hotels/${createdHotelId}`, null, ownerToken1);
      if (deleteHotelRes.status !== 200) {
        throw new Error(`DELETE /api/hotels/:id failed: ${deleteHotelRes.status}`);
      }
      console.log('  PASS: Hotel property deleted successfully by authorized owner (HTTP 200).');

      // Clean up test guide
      await Guide.findByIdAndDelete(createdGuideId);

      // 16. Regression Check: Existing Application Routes Still Function Cleanly
      console.log('\nTest 16: Verifying Existing Application Routes Functioning...');
      const destCheck = await apiRequest('GET', '/api/destinations');
      if (destCheck.status !== 200 || !destCheck.body.success) {
        throw new Error('Regression: /api/destinations failed');
      }
      console.log(`  PASS: /api/destinations works (${destCheck.body.count} destinations).`);

      const pkgCheck = await apiRequest('GET', '/api/packages');
      if (pkgCheck.status !== 200 || !pkgCheck.body.success) {
        throw new Error('Regression: /api/packages failed');
      }
      console.log(`  PASS: /api/packages works (${pkgCheck.body.count} packages).`);

      console.log('\n====================================================');
      console.log('ALL MODULE 4 TESTS PASSED WITH 100% SUCCESS!');
      console.log('====================================================');

      server.close();
      await mongoose.disconnect();
      process.exit(0);

    } catch (err) {
      console.error('\nTEST FAILURE:', err);
      server.close();
      await mongoose.disconnect();
      process.exit(1);
    }
  });
}

runModule4Tests();

